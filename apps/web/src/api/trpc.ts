import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../server/src/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

const TOKEN_KEY = "radar_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function makeTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/trpc",
        headers() {
          const token = getToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
