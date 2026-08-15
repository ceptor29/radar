import { sqlite } from "../db/index";
import { router, requirePerm } from "../trpc";

export const directoryRouter = router({
  users: requirePerm("risk", "view").query(({ ctx }) => {
    const rows = sqlite
      .prepare(
        `SELECT u.id AS id, u.email AS email, u.name AS name,
                GROUP_CONCAT(r.code) AS roles
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE u.tenant_id = ?
         GROUP BY u.id`,
      )
      .all(ctx.session!.tenantId) as unknown as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: r.id as string,
      email: r.email as string,
      name: r.name as string,
      roles: (r.roles as string)?.split(",") ?? [],
    }));
  }),
});