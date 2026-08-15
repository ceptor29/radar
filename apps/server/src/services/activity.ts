import { sqlite } from "../db/index";
import { randomUUID } from "node:crypto";

export interface LogActivityInput {
  actorId?: string | null;
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export function logActivity(
  ctx: { session: { sub: string; tenantId: string } | null },
  input: LogActivityInput,
): void {
  const tenantId = ctx.session?.tenantId ?? "unknown";
  sqlite
    .prepare(
      "INSERT INTO activities (id, tenant_id, actor_id, action, summary, entity_type, entity_id, metadata, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    )
    .run(
      randomUUID(),
      tenantId,
      input.actorId ?? ctx.session?.sub ?? null,
      input.action,
      input.summary,
      input.entityType ?? null,
      input.entityId ?? null,
      JSON.stringify(input.metadata ?? {}),
      new Date().toISOString(),
    );
}

export interface ActivityDTO {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  action: string;
  summary: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: string;
  created_at: string;
}

export function listActivities(tenantId: string, limit = 50): ActivityDTO[] {
  return sqlite
    .prepare(
      "SELECT * FROM activities WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .all(tenantId, limit) as unknown as ActivityDTO[];
}
