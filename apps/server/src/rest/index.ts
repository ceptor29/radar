import { Router } from "express";
import { sqlite } from "../db/index";
import { randomUUID } from "node:crypto";
import { recomputeRiskScore } from "../services/scoring";
import { logActivity } from "../services/activity";

export const restApi = Router();

function tenantFromApiKey(apiKey: string): string | null {
  const row = sqlite
    .prepare("SELECT tenant_id, scopes, status FROM api_keys WHERE hashed_key = ?")
    .get(apiKey) as { tenant_id: string; scopes: string; status: string } | undefined;
  if (!row || row.status !== "active") return null;
  sqlite
    .prepare("UPDATE api_keys SET last_used_at = ? WHERE hashed_key = ?")
    .run(new Date().toISOString(), apiKey);
  return row.tenant_id;
}

function requireKey(apiKey: string | undefined): { tenantId: string } {
  if (!apiKey) throw Object.assign(new Error("Missing X-API-Key"), { status: 401 });
  const tenantId = tenantFromApiKey(apiKey);
  if (!tenantId) throw Object.assign(new Error("Invalid API key"), { status: 401 });
  return { tenantId };
}

restApi.get("/health", (_req, res) => {
  res.json({ ok: true, service: "aegis-grc-server" });
});

restApi.get("/v1/risks", (req, res) => {
  try {
    const { tenantId } = requireKey(req.headers["x-api-key"] as string | undefined);
    const rows = sqlite
      .prepare("SELECT * FROM risks WHERE tenant_id = ? ORDER BY residual_raw DESC")
      .all(tenantId);
    res.json({ data: rows });
  } catch (err) {
    res.status((err as { status?: number }).status ?? 500).json({ error: (err as Error).message });
  }
});

restApi.post("/v1/risks", (req, res) => {
  try {
    const { tenantId } = requireKey(req.headers["x-api-key"] as string | undefined);
    const b = req.body ?? {};
    if (!b.title || !b.likelihood || !b.impact) {
      return res.status(400).json({ error: "title, likelihood and impact are required" });
    }
    const id = randomUUID();
    const ts = new Date().toISOString();
    sqlite
      .prepare(
        "INSERT INTO risks (id, tenant_id, title, description, category, owner_id, likelihood, impact, treatment, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        tenantId,
        b.title,
        b.description ?? null,
        b.category ?? "operational",
        b.ownerId ?? null,
        b.likelihood,
        b.impact,
        b.treatment ?? null,
        ts,
        ts,
      );
    recomputeRiskScore(id);
    logActivity(
      { session: { sub: "api", tenantId } },
      { action: "risk.created.api", summary: `API created risk "${b.title}"`, entityType: "risk", entityId: id },
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status((err as { status?: number }).status ?? 500).json({ error: (err as Error).message });
  }
});
