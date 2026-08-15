import { sqlite } from "../db/index";
import { router, requirePerm } from "../trpc";

export const dashboardRouter = router({
  summary: requirePerm("dashboard", "view").query(({ ctx }) => {
    const t = ctx.session!.tenantId;
    const risks = sqlite
      .prepare("SELECT * FROM risks WHERE tenant_id = ?")
      .all(t) as unknown as Array<Record<string, unknown>>;
    const controls = sqlite
      .prepare("SELECT * FROM controls WHERE tenant_id = ?")
      .all(t) as unknown as Array<Record<string, unknown>>;
    const evidence = sqlite
      .prepare("SELECT * FROM evidence WHERE tenant_id = ?")
      .all(t) as unknown as Array<Record<string, unknown>>;
    const approvals = sqlite.prepare("SELECT COUNT(*) AS c FROM risks WHERE tenant_id = ?").get(t) as { c: number };

    const bandCount = (band: string) => risks.filter((r) => r.residual_band === band).length;
    const healthCount = (h: string) => controls.filter((c) => c.health === h).length;
    const nowIso = new Date().toISOString();
    const evidenceFresh = evidence.filter((e) => (e.valid_until as string) > nowIso).length;

    const topRisks = risks
      .map((r) => ({
        id: r.id as string,
        title: r.title as string,
        residual: r.residual_raw as number,
        band: r.residual_band as string,
        treatment: (r.treatment as string) ?? null,
      }))
      .sort((a, b) => b.residual - a.residual)
      .slice(0, 10);

    return {
      risk: {
        total: risks.length,
        bands: {
          low: bandCount("low"),
          moderate: bandCount("moderate"),
          high: bandCount("high"),
          critical: bandCount("critical"),
        },
        topRisks,
      },
      control: {
        total: controls.length,
        health: {
          healthy: healthCount("healthy"),
          failing: healthCount("failing"),
          untested: healthCount("untested"),
          overdue: healthCount("overdue"),
        },
      },
      evidence: {
        total: evidence.length,
        fresh: evidenceFresh,
        expiring: evidence.length - evidenceFresh,
      },
      coverage: {},
      approvalsPending: approvals.c,
    };
  }),

  posture: requirePerm("dashboard", "view").query(({ ctx }) => {
    const rows = sqlite
      .prepare(
        `SELECT f.code AS code, f.name AS name,
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
        code: r.code as string,
        name: r.name as string,
        total,
        satisfied,
        pct: total ? Math.round((satisfied / total) * 100) : 0,
      };
    });
  }),
});
