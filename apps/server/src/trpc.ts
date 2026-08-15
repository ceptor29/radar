import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { getUserRoles } from "./context";
import { assertPerm } from "./auth/rbac";
import type { Action, Resource } from "@shared/permissions";

const t = initTRPC.context<Context>().create();

const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx });
});

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);

export function requirePerm(resource: Resource, action: Action) {
  return protectedProcedure.use(({ ctx, next }) => {
    assertPerm(getUserRoles(ctx), resource, action);
    return next({ ctx });
  });
}

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const middleware = t.middleware;
