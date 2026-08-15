import { z } from "zod";
import { sqlite } from "../db/index";
import { router, requirePerm } from "../trpc";

export const frameworkRouter = router({
  list: requirePerm("framework", "view").query(({ ctx }) => {
    const rows = sqlite
      .prepare("SELECT * FROM frameworks WHERE tenant_id = ? ORDER BY code")
      .all(ctx.session!.tenantId) as unknown as Array<Record<string, unknown>>;
    return rows.map((f) => ({
      id: f.id as string,
      code: f.code as string,
      name: f.name as string,
      version: f.version as string,
    }));
  }),

  get: requirePerm("framework", "view")
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const fw = sqlite
        .prepare("SELECT * FROM frameworks WHERE id = ? AND tenant_id = ?")
        .get(input.id, ctx.session!.tenantId) as Record<string, unknown> | undefined;
      if (!fw) throw new Error("Framework not found");
      const reqs = sqlite
        .prepare("SELECT * FROM requirements WHERE framework_id = ? ORDER BY code")
        .all(input.id) as unknown as Array<Record<string, unknown>>;
      const mapped = sqlite
        .prepare(
          `SELECT cr.requirement_id AS requirement_id, c.id AS control_id, c.name AS control_name
           FROM control_requirements cr
           JOIN controls c ON c.id = cr.control_id
           JOIN requirements r ON r.id = cr.requirement_id
           WHERE r.framework_id = ?`,
        )
        .all(input.id) as unknown as Array<Record<string, unknown>>;
    return {
      id: fw.id as string,
      code: fw.code as string,
      name: fw.name as string,
      version: fw.version as string,
      requirements: reqs.map((r) => ({
        id: r.id as string,
        code: r.code as string,
        text: r.text as string,
        controls: mapped
          .filter((m) => m.requirement_id === r.id)
          .map((m) => ({ id: m.control_id as string, name: m.control_name as string })),
      })),
    };
    }),

  coverage: requirePerm("framework", "view").query(({ ctx }) => {
    const rows = sqlite
      .prepare(
        `SELECT f.id AS id, f.code AS code, f.name AS name,
                COUNT(DISTINCT r.id) AS total,
                COUNT(DISTINCT CASE WHEN cr.control_id IS NOT NULL THEN r.id END) AS satisfied
         FROM frameworks f
         LEFT JOIN requirements r ON r.framework_id = f.id
         LEFT JOIN control_requirements cr ON cr.requirement_id = r.id
         WHERE f.tenant_id = ?
         GROUP BY f.id`,
      )
      .all(ctx.session!.tenantId) as unknown as Array<Record<string, unknown>>;
    return rows.map((r) => {
      const total = Number(r.total ?? 0);
      const satisfied = Number(r.satisfied ?? 0);
      return {
        id: r.id as string,
        code: r.code as string,
        name: r.name as string,
        total,
        satisfied,
        pct: total ? Math.round((satisfied / total) * 100) : 0,
      };
    });
  }),
});
