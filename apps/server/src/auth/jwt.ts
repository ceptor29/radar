import jwt from "jsonwebtoken";

const SECRET = process.env.AEGIS_JWT_SECRET ?? "dev-secret-change-me";

export interface SessionPayload {
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "12h" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET);
    if (typeof decoded === "string") return null;
    return decoded as unknown as SessionPayload;
  } catch {
    return null;
  }
}
