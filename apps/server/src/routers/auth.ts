import { z } from "zod";
import { sqlite } from "../db/index";
import { publicProcedure, protectedProcedure, router } from "../trpc";
import { signSession } from "../auth/jwt";
import { loginSchema } from "@shared/schemas";

function roleCodesForUser(userId: string): string[] {
  const rows = sqlite
    .prepare(
      `SELECT r.code AS code FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
    )
    .all(userId) as Array<{ code: string }>;
  return rows.map((r) => r.code);
}

export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(({ input }) => {
    const user = sqlite
      .prepare("SELECT id, tenant_id, email, name FROM users WHERE email = ? AND status = 'active'")
      .get(input.email) as { id: string; tenant_id: string; email: string; name: string } | undefined;
    if (!user) {
      throw new Error("Unknown user. Try admin@acme.io / lead@acme.io / owner@acme.io / auditor@acme.io");
    }
    const roles = roleCodesForUser(user.id);
    const token = signSession({
      sub: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      roles,
    });
    return { token, user: { id: user.id, email: user.email, name: user.name, roles } };
  }),

  me: protectedProcedure.query(({ ctx }) => {
    const user = sqlite
      .prepare("SELECT id, tenant_id, email, name FROM users WHERE id = ?")
      .get(ctx.session!.sub) as { id: string; tenant_id: string; email: string; name: string } | undefined;
    return {
      user: user ?? null,
      roles: ctx.session!.roles,
      tenantId: ctx.session!.tenantId,
    };
  }),

  logout: protectedProcedure.mutation(() => {
    return { ok: true };
  }),
});
