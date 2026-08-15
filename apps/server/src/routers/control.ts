import { z } from "zod";
import { sqlite } from "../db/index";
import { router, requirePerm } from "../trpc";
import { randomUUID } from "node:crypto";
import { controlCreateSchema, controlHealthSchema, controlStatusSchema } from "@shared/schemas";
import { recomputeRiskScore } from "../services/scoring";
import { logActivity } from "../services/activity";

const controlRow = (r: Record<string, unknown>) => ({
  id: r.id as string,
  name: r.name as string,
  description: (r.description as string) ?? null,
  frequency: r.frequency as string,
  status: r.status as string,
  health: r.health as string,
  automationType: r.automation_type as string,
  ownerId: (r.owner_id as string) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

export const controlRouter = router({
  list: requirePerm("control", "view").query(({ ctx }) => {
    const rows = sqlite
      .prepare("SELECT * FROM controls WHERE tenant_id = ? ORDER BY name")
      .all(ctx.session!.tenantId) as unknown as Array<Record<string, unknown>>;
    return rows.map(controlRow);
  }),

  get: requirePerm("control", "view")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const row = sqlite
        .prepare("SELECT * FROM controls WHERE id = ? AND tenant_id = ?")
        .get(input.id, ctx.session!.tenantId) as Record<string, unknown> | undefined;
      if (!row) throw new Error("Control not found");
      return controlRow(row);
    }),

  create: requirePerm("control", "edit")
    .input(controlCreateSchema)
    .mutation(({ ctx, input }) => {
      const id = randomUUID();
      const ts = new Date().toISOString();
      sqlite
        .prepare(
          "INSERT INTO controls (id, tenant_id, name, description, frequency, status, health, automation_type, owner_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          ctx.session!.tenantId,
          input.name,
          input.description ?? null,
          input.frequency,
          input.status,
          input.health,
          input.automationType,
          input.ownerId ?? null,
          ts,
          ts,
        );
      for (const reqId of input.requirementIds ?? []) {
        sqlite
          .prepare("INSERT INTO control_requirements (id, control_id, requirement_id) VALUES (?,?,?)")
          .run(randomUUID(), id, reqId);
      }
      for (const link of input.riskLinks ?? []) {
        sqlite
          .prepare("INSERT INTO control_risks (id, control_id, risk_id, weight) VALUES (?,?,?,?)")
          .run(randomUUID(), id, link.riskId, link.weight ?? 1);
        recomputeRiskScore(link.riskId, ctx.session!.sub);
      }
      logActivity(ctx, {
        action: "control.created",
        summary: `Created control "${input.name}"`,
        entityType: "control",
        entityId: id,
      });
      return { id };
    }),

  linkRequirement: requirePerm("control", "edit")
    .input(z.object({ controlId: z.string(), requirementId: z.string() }))
    .mutation(({ ctx, input }) => {
      sqlite
        .prepare("INSERT INTO control_requirements (id, control_id, requirement_id) VALUES (?,?,?)")
        .run(randomUUID(), input.controlId, input.requirementId);
      logActivity(ctx, {
        action: "control.linked_requirement",
        summary: `Linked control ${input.controlId} to requirement ${input.requirementId}`,
        entityType: "control",
        entityId: input.controlId,
      });
      return { ok: true };
    }),

  linkRisk: requirePerm("control", "edit")
    .input(z.object({ controlId: z.string(), riskId: z.string(), weight: z.number().nonnegative().optional() }))
    .mutation(({ ctx, input }) => {
      sqlite
        .prepare("INSERT INTO control_risks (id, control_id, risk_id, weight) VALUES (?,?,?,?)")
        .run(randomUUID(), input.controlId, input.riskId, input.weight ?? 1);
      recomputeRiskScore(input.riskId, ctx.session!.sub);
      logActivity(ctx, {
        action: "control.linked_risk",
        summary: `Linked control ${input.controlId} to risk ${input.riskId}`,
        entityType: "control",
        entityId: input.controlId,
      });
      return { ok: true };
    }),

  unlinkRisk: requirePerm("control", "edit")
    .input(z.object({ controlId: z.string(), riskId: z.string() }))
    .mutation(({ ctx, input }) => {
      sqlite
        .prepare("DELETE FROM control_risks WHERE control_id = ? AND risk_id = ?")
        .run(input.controlId, input.riskId);
      recomputeRiskScore(input.riskId, ctx.session!.sub);
      logActivity(ctx, {
        action: "control.unlinked_risk",
        summary: `Unlinked control ${input.controlId} from risk ${input.riskId}`,
        entityType: "control",
        entityId: input.controlId,
      });
      return { ok: true };
    }),

  updateHealth: requirePerm("control", "edit")
    .input(z.object({ id: z.string(), health: controlHealthSchema }))
    .mutation(({ ctx, input }) => {
      sqlite
        .prepare("UPDATE controls SET health = ?, updated_at = ? WHERE id = ? AND tenant_id = ?")
        .run(input.health, new Date().toISOString(), input.id, ctx.session!.tenantId);
      const linked = sqlite
        .prepare("SELECT risk_id FROM control_risks WHERE control_id = ?")
        .all(input.id) as unknown as Array<{ risk_id: string }>;
      for (const { risk_id } of linked) recomputeRiskScore(risk_id, ctx.session!.sub);
      logActivity(ctx, {
        action: "control.health_updated",
        summary: `Set control ${input.id} health to ${input.health} (recomputed ${linked.length} linked risk(s))`,
        entityType: "control",
        entityId: input.id,
        metadata: { health: input.health, affectedRisks: linked.length },
      });
      return { ok: true, affectedRisks: linked.length };
    }),

  updateStatus: requirePerm("control", "edit")
    .input(z.object({ id: z.string(), status: controlStatusSchema }))
    .mutation(({ ctx, input }) => {
      sqlite
        .prepare("UPDATE controls SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?")
        .run(input.status, new Date().toISOString(), input.id, ctx.session!.tenantId);
      const linked = sqlite
        .prepare("SELECT risk_id FROM control_risks WHERE control_id = ?")
        .all(input.id) as unknown as Array<{ risk_id: string }>;
      for (const { risk_id } of linked) recomputeRiskScore(risk_id, ctx.session!.sub);
      logActivity(ctx, {
        action: "control.status_updated",
        summary: `Set control ${input.id} status to ${input.status}`,
        entityType: "control",
        entityId: input.id,
      });
      return { ok: true, affectedRisks: linked.length };
    }),
});
