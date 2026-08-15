import { z } from "zod";
import { sqlite } from "../db/index";
import { router, requirePerm } from "../trpc";
import { randomUUID, createHash } from "node:crypto";
import { evidenceCreateSchema } from "@shared/schemas";
import { logActivity } from "../services/activity";
import fs from "node:fs";
import path from "node:path";

const uploadsDir = path.resolve(import.meta.dirname, "../../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const evidenceRow = (r: Record<string, unknown>) => ({
  id: r.id as string,
  controlId: r.control_id as string,
  type: r.type as string,
  status: r.status as string,
  periodStart: (r.period_start as string) ?? null,
  periodEnd: (r.period_end as string) ?? null,
  validUntil: (r.valid_until as string) ?? null,
  s3Ref: r.s3_ref as string,
  sha256: r.sha256 as string,
  mime: (r.mime as string) ?? null,
  collectorId: (r.collector_id as string) ?? null,
  createdAt: r.created_at as string,
});

export const evidenceRouter = router({
  list: requirePerm("evidence", "view").query(({ ctx }) => {
    const rows = sqlite
      .prepare("SELECT * FROM evidence WHERE tenant_id = ? ORDER BY created_at DESC")
      .all(ctx.session!.tenantId) as unknown as Array<Record<string, unknown>>;
    return rows.map(evidenceRow);
  }),

  get: requirePerm("evidence", "view")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const row = sqlite
        .prepare("SELECT * FROM evidence WHERE id = ? AND tenant_id = ?")
        .get(input.id, ctx.session!.tenantId) as Record<string, unknown> | undefined;
      if (!row) throw new Error("Evidence not found");
      return evidenceRow(row);
    }),

  upload: requirePerm("evidence", "edit")
    .input(
      evidenceCreateSchema.extend({
        fileName: z.string().min(1),
        content: z.string().min(1),
        mime: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const buf = Buffer.from(input.content, "base64");
      const sha = createHash("sha256").update(buf).digest("hex");
      const storedName = `${sha}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const fullPath = path.join(uploadsDir, storedName);
      fs.writeFileSync(fullPath, buf);

      const id = randomUUID();
      const ts = new Date().toISOString();
      sqlite
        .prepare(
          "INSERT INTO evidence (id, tenant_id, control_id, type, status, period_start, period_end, valid_until, s3_ref, sha256, mime, collector_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          ctx.session!.tenantId,
          input.controlId,
          input.type ?? "manual",
          "valid",
          input.periodStart ?? null,
          input.periodEnd ?? null,
          input.validUntil ?? new Date(Date.now() + 90 * 864e5).toISOString(),
          `evidence/${storedName}`,
          sha,
          input.mime ?? "application/octet-stream",
          ctx.session!.sub,
          ts,
        );
      logActivity(ctx, {
        action: "evidence.uploaded",
        summary: `Uploaded evidence ${input.fileName} for control ${input.controlId}`,
        entityType: "evidence",
        entityId: id,
        metadata: { sha256: sha },
      });
      return { id, sha256: sha };
    }),

  freshness: requirePerm("evidence", "view").query(({ ctx }) => {
    const nowIso = new Date().toISOString();
    const rows = sqlite
      .prepare(
        "SELECT * FROM evidence WHERE tenant_id = ? AND status = 'valid' ORDER BY valid_until ASC",
      )
      .all(ctx.session!.tenantId) as unknown as Array<Record<string, unknown>>;
    const expiringIn30 = rows.filter(
      (r) => (r.valid_until as string) <= new Date(Date.now() + 30 * 864e5).toISOString(),
    ).length;
    return {
      total: rows.length,
      expiring: expiringIn30,
      fresh: rows.filter((r) => (r.valid_until as string) > nowIso).length,
    };
  }),
});
