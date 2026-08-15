import { sqlite } from "../db/index";
import { randomUUID } from "node:crypto";
import { computeScore, type ControlStatus, type TestHealth, type ScoreResult } from "@shared/scoring";

interface LinkedControl {
  status: string;
  health: string;
  weight: number;
}

function linkedControlsForRisk(riskId: string): LinkedControl[] {
  return sqlite
    .prepare(
      `SELECT c.status AS status, c.health AS health, cr.weight AS weight
       FROM control_risks cr JOIN controls c ON c.id = cr.control_id
       WHERE cr.risk_id = ?`,
    )
    .all(riskId) as unknown as LinkedControl[];
}

export function recomputeRiskScore(riskId: string, actorId?: string): ScoreResult {
  const risk = sqlite
    .prepare("SELECT id, tenant_id, likelihood, impact FROM risks WHERE id = ?")
    .get(riskId) as { id: string; tenant_id: string; likelihood: number; impact: number } | undefined;
  if (!risk) throw new Error(`Risk not found: ${riskId}`);

  const controls = linkedControlsForRisk(riskId).map((c) => ({
    status: c.status as ControlStatus,
    testHealth: c.health as TestHealth,
    weight: c.weight,
  }));

  const score = computeScore(risk.likelihood, risk.impact, controls);
  const ts = new Date().toISOString();

  sqlite
    .prepare(
      "UPDATE risks SET inherent_raw=?, inherent_band=?, residual_raw=?, residual_band=?, control_factor=?, updated_at=? WHERE id=?",
    )
    .run(
      score.inherent.raw,
      score.inherent.band,
      score.residual.raw,
      score.residual.band,
      score.controlFactor,
      ts,
      riskId,
    );

  for (const st of ["inherent", "residual"] as const) {
    const s = st === "inherent" ? score.inherent : score.residual;
    sqlite
      .prepare(
        "INSERT INTO score_versions (id, tenant_id, risk_id, score_type, l, i, c_factor, raw_score, band, computed_by, computed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        randomUUID(),
        risk.tenant_id,
        riskId,
        st,
        risk.likelihood,
        risk.impact,
        score.controlFactor,
        s.raw,
        s.band,
        actorId ?? null,
        ts,
      );
  }

  return score;
}

export function recomputeAllScores(actorId?: string): number {
  const rows = sqlite.prepare("SELECT id FROM risks").all() as Array<{ id: string }>;
  for (const r of rows) recomputeRiskScore(r.id, actorId);
  return rows.length;
}
