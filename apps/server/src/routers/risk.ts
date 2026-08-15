import { z } from "zod";
import { sqlite } from "../db/index";
import { router, requirePerm } from "../trpc";
import { randomUUID } from "node:crypto";
import { riskCreateSchema, riskUpdateSchema, treatmentSchema } from "@shared/schemas";
import { recomputeRiskScore } from "../services/scoring";
import { logActivity } from "../services/activity";

const riskRow = (r: Record<string, unknown>) => ({
  id: r.id as string,
  title: r.title as string,
  description: (r.description as string) ?? null,
  category: r.category as string,
  ownerId: (r.owner_id as string) ?? null,
  likelihood: r.likelihood as number,
  impact: r.impact as number,
  treatment: (r.treatment as string) ?? null,
  targetResidual: (r.target_residual as number) ?? null,
  treatmentDue: (r.treatment_due as string) ?? null,
  budget: (r.budget as number) ?? null,
  inherent: { raw: r.inherent_raw as number, band: r.inherent_band as string },
  residual: { raw: r.residual_raw as number, band: r.residual_band as string },
  controlFactor: (r.control_factor as number) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

export const riskRouter = router({
  list: requirePerm("risk", "view").query(({ ctx }) => {
    const rows = sqlite
      .prepare("SELECT * FROM risks WHERE tenant_id = ? ORDER BY residual_raw DESC, updated_at DESC")
      .all(ctx.session!.tenantId) as unknown as Array<Record<string, unknown>>;
    return rows.map(riskRow);
  }),

  get: requirePerm("risk", "view")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const row = sqlite
        .prepare("SELECT * FROM risks WHERE id = ? AND tenant_id = ?")
        .get(input.id, ctx.session!.tenantId) as Record<string, unknown> | undefined;
      if (!row) throw new Error("Risk not found");
      return riskRow(row);
    }),

  heatmap: requirePerm("risk", "view").query(({ ctx }) => {
    const rows = sqlite
      .prepare("SELECT id, title, likelihood, impact, inherent_raw, inherent_band, residual_raw, residual_band FROM risks WHERE tenant_id = ?")
      .all(ctx.session!.tenantId) as unknown as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      riskId: r.id as string,
      title: r.title as string,
      likelihood: r.likelihood as number,
      impact: r.impact as number,
      inherent: { raw: r.inherent_raw as number, band: r.inherent_band as string },
      residual: { raw: r.residual_raw as number, band: r.residual_band as string },
    }));
  }),

  detail: requirePerm("risk", "view")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const risk = sqlite
        .prepare("SELECT * FROM risks WHERE id = ? AND tenant_id = ?")
        .get(input.id, ctx.session!.tenantId) as Record<string, unknown> | undefined;
      if (!risk) throw new Error("Risk not found");

      const controls = sqlite
        .prepare(
          `SELECT cr.weight AS weight, c.id AS id, c.name AS name, c.status AS status, c.health AS health
           FROM control_risks cr JOIN controls c ON c.id = cr.control_id
           WHERE cr.risk_id = ?`,
        )
        .all(input.id) as unknown as Array<Record<string, unknown>>;

      const scoreHistory = sqlite
        .prepare("SELECT * FROM score_versions WHERE risk_id = ? ORDER BY computed_at DESC LIMIT 20")
        .all(input.id) as unknown as Array<Record<string, unknown>>;

      const activities = sqlite
        .prepare("SELECT * FROM activities WHERE entity_type = 'risk' AND entity_id = ? ORDER BY created_at DESC LIMIT 20")
        .all(input.id) as unknown as Array<Record<string, unknown>>;

      const users = sqlite
        .prepare("SELECT id, email, name FROM users WHERE tenant_id = ?")
        .all(ctx.session!.tenantId) as unknown as Array<Record<string, unknown>>;

      return {
        risk: riskRow(risk),
        controls: controls.map((c) => ({
          id: c.id as string,
          name: c.name as string,
          status: c.status as string,
          health: c.health as string,
          weight: c.weight as number,
        })),
        scoreHistory: scoreHistory.map((s) => ({
          id: s.id as string,
          scoreType: s.score_type as string,
          raw: s.raw_score as number,
          band: s.band as string,
          cFactor: s.c_factor as number,
          computedAt: s.computed_at as string,
          computedBy: (s.computed_by as string) ?? null,
        })),
        activities,
        users: users.map((u) => ({ id: u.id as string, email: u.email as string, name: u.name as string })),
      };
    }),

  create: requirePerm("risk", "edit")
    .input(riskCreateSchema)
    .mutation(({ ctx, input }) => {
      const id = randomUUID();
      const ts = new Date().toISOString();
      sqlite
        .prepare(
          "INSERT INTO risks (id, tenant_id, title, description, category, owner_id, likelihood, impact, treatment, target_residual, treatment_due, budget, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          ctx.session!.tenantId,
          input.title,
          input.description ?? null,
          input.category,
          input.ownerId ?? null,
          input.likelihood,
          input.impact,
          input.treatment ?? null,
          input.targetResidual ?? null,
          input.treatmentDue ?? null,
          input.budget ?? null,
          ts,
          ts,
        );
      recomputeRiskScore(id, ctx.session!.sub);
      logActivity(ctx, {
        action: "risk.created",
        summary: `Created risk "${input.title}"`,
        entityType: "risk",
        entityId: id,
        metadata: { category: input.category, likelihood: input.likelihood, impact: input.impact },
      });
      return { id };
    }),

  update: requirePerm("risk", "edit")
    .input(z.object({ id: z.string(), data: riskUpdateSchema }))
    .mutation(({ ctx, input }) => {
      const existing = sqlite
        .prepare("SELECT * FROM risks WHERE id = ? AND tenant_id = ?")
        .get(input.id, ctx.session!.tenantId) as Record<string, unknown> | undefined;
      if (!existing) throw new Error("Risk not found");
      const d = input.data;
      const fields: Array<[string, unknown]> = [];
      if (d.title !== undefined) fields.push(["title", d.title]);
      if (d.description !== undefined) fields.push(["description", d.description]);
      if (d.category !== undefined) fields.push(["category", d.category]);
      if (d.ownerId !== undefined) fields.push(["owner_id", d.ownerId]);
      if (d.likelihood !== undefined) fields.push(["likelihood", d.likelihood]);
      if (d.impact !== undefined) fields.push(["impact", d.impact]);
      if (d.treatment !== undefined) fields.push(["treatment", d.treatment]);
      if (d.targetResidual !== undefined) fields.push(["target_residual", d.targetResidual]);
      if (d.treatmentDue !== undefined) fields.push(["treatment_due", d.treatmentDue]);
      if (d.budget !== undefined) fields.push(["budget", d.budget]);
      fields.push(["updated_at", new Date().toISOString()]);
      const set = fields.map(([k]) => `${k}=?`).join(", ");
      sqlite
        .prepare(`UPDATE risks SET ${set} WHERE id = ?`)
        .run(...fields.map(([, v]) => v), input.id);
      recomputeRiskScore(input.id, ctx.session!.sub);
      logActivity(ctx, {
        action: "risk.updated",
        summary: `Updated risk "${existing.title as string}"`,
        entityType: "risk",
        entityId: input.id,
      });
      return { id: input.id };
    }),

  setTreatment: requirePerm("risk", "edit")
    .input(
      z.object({
        id: z.string(),
        treatment: treatmentSchema,
        targetResidual: z.number().int().min(1).max(25).optional(),
        treatmentDue: z.string().datetime().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      sqlite
        .prepare("UPDATE risks SET treatment=?, target_residual=?, treatment_due=?, updated_at=? WHERE id=? AND tenant_id=?")
        .run(
          input.treatment,
          input.targetResidual ?? null,
          input.treatmentDue ?? null,
          new Date().toISOString(),
          input.id,
          ctx.session!.tenantId,
        );
      logActivity(ctx, {
        action: "risk.treatment",
        summary: `Set treatment "${input.treatment}" on risk ${input.id}`,
        entityType: "risk",
        entityId: input.id,
        metadata: { treatment: input.treatment },
      });
      return { ok: true };
    }),

  recalc: requirePerm("risk", "edit")
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      const score = recomputeRiskScore(input.id, ctx.session!.sub);
      logActivity(ctx, {
        action: "risk.recalculated",
        summary: `Recalculated score for risk ${input.id}`,
        entityType: "risk",
        entityId: input.id,
        metadata: { residual: score.residual },
      });
      return score;
    }),
});
