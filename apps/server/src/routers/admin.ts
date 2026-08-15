import { z } from "zod";
import { sqlite } from "../db/index";
import { router, requirePerm } from "../trpc";
import { logActivity } from "../services/activity";
import { randomUUID } from "node:crypto";

export const adminRouter = router({
  users: requirePerm("admin", "view").query(({ ctx }) => {
    const rows = sqlite
      .prepare(
        `SELECT u.id AS id, u.email AS email, u.name AS name, u.status AS status,
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
      status: r.status as string,
      roles: (r.roles as string)?.split(",") ?? [],
    }));
  }),

  assignRole: requirePerm("admin", "edit")
    .input(z.object({ userId: z.string(), roleCode: z.string() }))
    .mutation(({ ctx, input }) => {
      const role = sqlite
        .prepare("SELECT id FROM roles WHERE code = ? AND tenant_id = ?")
        .get(input.roleCode, ctx.session!.tenantId) as { id: string } | undefined;
      if (!role) throw new Error("Role not found");
      sqlite
        .prepare("INSERT INTO user_roles (id, user_id, role_id) VALUES (?,?,?)")
        .run(randomUUID(), input.userId, role.id);
      logActivity(ctx, {
        action: "admin.role_assigned",
        summary: `Assigned role ${input.roleCode} to user ${input.userId}`,
        entityType: "user",
        entityId: input.userId,
      });
      return { ok: true };
    }),
});
