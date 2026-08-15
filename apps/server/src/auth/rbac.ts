import type { Action, Resource } from "@shared/permissions";
import { requireRole } from "@shared/permissions";
import { TRPCError } from "@trpc/server";

export function assertPerm(roles: string[], resource: Resource, action: Action): void {
  if (!requireRole(roles as never, resource, action)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Missing permission: ${resource}.${action}`,
    });
  }
}
