import { migrate } from "./migrate";
import { sqlite } from "./index";
import { randomUUID } from "node:crypto";
import { computeScore, type ControlStatus, type TestHealth } from "@shared/scoring";

function now(): string {
  return new Date().toISOString();
}

export function seed(): void {
  migrate();
  const hasTenant = sqlite.prepare("SELECT COUNT(*) AS c FROM tenants").get() as { c: number };
  if (hasTenant.c > 0) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  const ts = now();
  const t = randomUUID();
  const admin = randomUUID();
  const lead = randomUUID();
  const owner = randomUUID();
  const auditor = randomUUID();

  sqlite.exec("BEGIN");
  try {
    const insert = (sql: string, ...args: unknown[]) => sqlite.prepare(sql).run(...args);

    insert("INSERT INTO tenants (id, name, plan, status, settings, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
      t, "Acme Corp", "pro", "active", "{}", ts, ts);

    const roleIds: Record<string, string> = {};
    const roles = [
      ["admin", "Admin"], ["compliance_lead", "Compliance Lead"], ["control_owner", "Control Owner"],
      ["risk_owner", "Risk Owner"], ["auditor", "Auditor"], ["viewer", "Viewer"],
    ] as const;
    for (const [code, name] of roles) {
      const id = randomUUID();
      roleIds[code] = id;
      insert("INSERT INTO roles (id, tenant_id, code, name) VALUES (?,?,?,?)", id, t, code, name);
    }

    const users = [
      [admin, "admin@acme.io", "Ada Admin", "admin"],
      [lead, "lead@acme.io", "Lena Lead", "compliance_lead"],
      [owner, "owner@acme.io", "Owen Owner", "control_owner"],
      [auditor, "auditor@acme.io", "Ava Auditor", "auditor"],
    ] as const;
    for (const [id, email, name, role] of users) {
      insert("INSERT INTO users (id, tenant_id, email, name, created_at) VALUES (?,?,?,?,?)",
        id, t, email, name, ts);
      insert("INSERT INTO user_roles (id, user_id, role_id) VALUES (?,?,?)",
        randomUUID(), id, roleIds[role]);
    }

    const iso27001 = randomUUID();
    const soc2 = randomUUID();
    insert("INSERT INTO frameworks (id, tenant_id, code, name, version) VALUES (?,?,?,?,?)",
      iso27001, t, "ISO27001", "ISO 27001", "2022");
    insert("INSERT INTO frameworks (id, tenant_id, code, name, version) VALUES (?,?,?,?,?)",
      soc2, t, "SOC2", "SOC 2", "Type II");

    const req = (frameworkId: string, code: string, text: string) => {
      const id = randomUUID();
      insert("INSERT INTO requirements (id, framework_id, code, text) VALUES (?,?,?,?)", id, frameworkId, code, text);
      return id;
    };
    const iso_req = {
      a9: req(iso27001, "A.9", "Access control policy and management of user access"),
      a8: req(iso27001, "A.8", "Asset management and ownership"),
      a12: req(iso27001, "A.12", "Operations security, malware protection, backup"),
      a18: req(iso27001, "A.18", "Compliance with legal and contractual requirements"),
    };
    const soc_req = {
      cc6: req(soc2, "CC6", "Logical and physical access controls"),
      cc7: req(soc2, "CC7", "System operations and monitoring"),
      cc9: req(soc2, "CC9", "Risk mitigation and vendor management"),
    };

    const cMfa = randomUUID();
    const cEnc = randomUUID();
    const cReview = randomUUID();
    const cLog = randomUUID();
    const controls = [
      [cMfa, "Multi-Factor Authentication", "MFA enforced for all user accounts", "monthly", "implemented", "healthy", "automated", owner],
      [cEnc, "Encryption at Rest", "All data stores encrypted with AES-256", "monthly", "implemented", "healthy", "automated", owner],
      [cReview, "Quarterly Access Review", "Review and certify user access quarterly", "quarterly", "partial", "overdue", "manual", owner],
      [cLog, "Security Logging & Monitoring", "Centralized logs with SIEM alerting", "continuous", "implemented", "healthy", "automated", owner],
    ] as const;
    for (const [id, name, desc, freq, status, health, auto, ownerId] of controls) {
      insert("INSERT INTO controls (id, tenant_id, name, description, frequency, status, health, automation_type, owner_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        id, t, name, desc, freq, status, health, auto, ownerId, ts, ts);
    }
    const linkReq = (controlId: string, reqId: string) =>
      insert("INSERT INTO control_requirements (id, control_id, requirement_id) VALUES (?,?,?)", randomUUID(), controlId, reqId);
    linkReq(cMfa, iso_req.a9);
    linkReq(cMfa, soc_req.cc6);
    linkReq(cEnc, iso_req.a8);
    linkReq(cEnc, soc_req.cc6);
    linkReq(cReview, iso_req.a9);
    linkReq(cReview, soc_req.cc6);
    linkReq(cLog, iso_req.a12);
    linkReq(cLog, soc_req.cc7);

    const risks = [
      ["Ransomware attack on production", "External attacker encrypts production systems", "cyber", 4, 5, owner],
      ["Cloud data breach via misconfigured S3", "Publicly exposed storage bucket leaks PII", "cyber", 3, 4, owner],
      ["Third-party vendor outage", "Critical SaaS vendor suffers extended downtime", "third_party", 3, 3, owner],
    ] as const;

    const riskControlMap: Array<[number, string, number]> = [
      [0, cMfa, 1], [0, cEnc, 1], [0, cLog, 1], [0, cReview, 0.5],
      [1, cEnc, 1], [1, cReview, 0.5],
      [2, cReview, 0.5],
    ];

    const riskIds: string[] = [];
    risks.forEach((r, idx) => {
      const id = randomUUID();
      riskIds.push(id);
      insert("INSERT INTO risks (id, tenant_id, title, description, category, owner_id, likelihood, impact, treatment, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        id, t, r[0], r[1], r[2], r[5], r[3], r[4], "mitigate", ts, ts);
    });

    const statusOf: Record<string, ControlStatus> = {};
    const healthOf: Record<string, TestHealth> = {};
    for (const [id, , , , status, health] of controls) {
      statusOf[id] = status as ControlStatus;
      healthOf[id] = health as TestHealth;
    }

    for (const [riskIdx, controlId, weight] of riskControlMap) {
      insert("INSERT INTO control_risks (id, control_id, risk_id, weight) VALUES (?,?,?,?)",
        randomUUID(), controlId, riskIds[riskIdx], weight);
    }

    risks.forEach((r, idx) => {
      const [title] = r;
      const linked = riskControlMap
        .filter(([ri]) => ri === idx)
        .map(([, cid, w]) => ({
          status: statusOf[cid],
          testHealth: healthOf[cid],
          weight: w,
        }));
      const score = computeScore(r[3], r[4], linked);
      insert("UPDATE risks SET inherent_raw=?, inherent_band=?, residual_raw=?, residual_band=?, control_factor=? WHERE id=?",
        score.inherent.raw, score.inherent.band, score.residual.raw, score.residual.band, score.controlFactor, riskIds[idx]);
      for (const st of ["inherent", "residual"] as const) {
        const s = st === "inherent" ? score.inherent : score.residual;
        insert("INSERT INTO score_versions (id, tenant_id, risk_id, score_type, l, i, c_factor, raw_score, band, computed_by, computed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
          randomUUID(), t, riskIds[idx], st, r[3], r[4], score.controlFactor, s.raw, s.band, admin, ts);
      }
    });

    const e1 = randomUUID();
    insert("INSERT INTO evidence (id, tenant_id, control_id, type, status, period_end, valid_until, s3_ref, sha256, mime, collector_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      e1, t, cMfa, "manual", "valid", new Date(Date.now() + 30 * 864e5).toISOString(), new Date(Date.now() + 30 * 864e5).toISOString(),
      "evidence/mfa-config-snapshot.json", "abc123def456", "application/json", admin, ts);

    const activityId = randomUUID();
    insert("INSERT INTO activities (id, tenant_id, actor_id, action, summary, entity_type, entity_id, created_at) VALUES (?,?,?,?,?,?,?,?)",
      activityId, t, admin, "system.seeded", "Seeded demo workspace", "tenant", t, ts);

    insert("INSERT INTO api_keys (id, tenant_id, name, hashed_key, scopes, created_at) VALUES (?,?,?,?,?,?)",
      randomUUID(), t, "demo-key", "aegis-demo-key", '["risk"]', ts);

    sqlite.exec("COMMIT");
    console.log("Seeded demo workspace: tenants=1, users=4, frameworks=2, controls=4, risks=3");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    throw err;
  }
}

if (import.meta.main) {
  seed();
}
