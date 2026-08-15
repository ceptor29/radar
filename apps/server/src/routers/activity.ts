import { z } from "zod";
import { sqlite } from "../db/index";
import { router, requirePerm } from "../trpc";
import { listActivities } from "../services/activity";

export const activityRouter = router({
  list: requirePerm("activity", "view")
    .input(z.object({ limit: z.number().int().min(1).max(200).optional() }).optional())
    .query(({ ctx, input }) => {
      return listActivities(ctx.session!.tenantId, input?.limit ?? 50);
    }),

  byEntity: requirePerm("activity", "view")
    .input(z.object({ entityType: z.string(), entityId: z.string() }))
    .query(({ ctx, input }) => {
      return sqlite
        .prepare(
          "SELECT * FROM activities WHERE tenant_id = ? AND entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 100",
        )
        .all(ctx.session!.tenantId, input.entityType, input.entityId) as unknown as import("../services/activity").ActivityDTO[];
    }),
});
