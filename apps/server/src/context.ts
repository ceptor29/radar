import { sqlite } from "./db/index";
import type { SessionPayload } from "./auth/jwt";
import { verifySession } from "./auth/jwt";
import type { inferAsyncReturnType } from "@trpc/server";
import type { IncomingHttpHeaders } from "node:http";

export interface Context {
  db: typeof sqlite;
  req: { headers: IncomingHttpHeaders };
  session: SessionPayload | null;
}

export function createContext(opts: { req: { headers: IncomingHttpHeaders } }): Context {
  const raw = opts.req.headers["authorization"];
  const authHeader = Array.isArray(raw) ? raw[0] : raw;
  let session: SessionPayload | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    session = verifySession(authHeader.slice(7));
  }
  return { db: sqlite, req: opts.req, session };
}

export type AppContext = inferAsyncReturnType<typeof createContext>;

export function getUserRoles(ctx: Context): string[] {
  return ctx.session?.roles ?? [];
}

export { sqlite };
