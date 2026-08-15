import { sqlite } from "./index";

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active', settings TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
    email TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
    auth_provider_id TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
    code TEXT NOT NULL, name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
    role_id TEXT NOT NULL REFERENCES roles(id)
  )`,
  `CREATE TABLE IF NOT EXISTS risks (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
    title TEXT NOT NULL, description TEXT, category TEXT NOT NULL,
    owner_id TEXT REFERENCES users(id), likelihood INTEGER NOT NULL, impact INTEGER NOT NULL,
    treatment TEXT, target_residual INTEGER, treatment_due TEXT, budget REAL,
    inherent_raw INTEGER, inherent_band TEXT, residual_raw INTEGER, residual_band TEXT,
    control_factor REAL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS score_versions (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, risk_id TEXT NOT NULL REFERENCES risks(id),
    score_type TEXT NOT NULL, l INTEGER NOT NULL, i INTEGER NOT NULL, c_factor REAL NOT NULL,
    raw_score INTEGER NOT NULL, band TEXT NOT NULL, factors_snapshot TEXT NOT NULL DEFAULT '[]',
    computed_by TEXT, computed_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS factor_defs (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, key TEXT NOT NULL, label TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1, affects TEXT NOT NULL DEFAULT 'both'
  )`,
  `CREATE TABLE IF NOT EXISTS risk_factors (
    id TEXT PRIMARY KEY, risk_id TEXT NOT NULL REFERENCES risks(id),
    factor_def_id TEXT NOT NULL REFERENCES factor_defs(id), value REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS frameworks (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, code TEXT NOT NULL,
    name TEXT NOT NULL, version TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS requirements (
    id TEXT PRIMARY KEY, framework_id TEXT NOT NULL REFERENCES frameworks(id),
    code TEXT NOT NULL, text TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS controls (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL, description TEXT, frequency TEXT NOT NULL DEFAULT 'monthly',
    status TEXT NOT NULL DEFAULT 'not_implemented', health TEXT NOT NULL DEFAULT 'untested',
    automation_type TEXT NOT NULL DEFAULT 'manual', owner_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS control_requirements (
    id TEXT PRIMARY KEY, control_id TEXT NOT NULL REFERENCES controls(id),
    requirement_id TEXT NOT NULL REFERENCES requirements(id)
  )`,
  `CREATE TABLE IF NOT EXISTS control_risks (
    id TEXT PRIMARY KEY, control_id TEXT NOT NULL REFERENCES controls(id),
    risk_id TEXT NOT NULL REFERENCES risks(id), weight REAL NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
    control_id TEXT NOT NULL REFERENCES controls(id), type TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'valid', period_start TEXT, period_end TEXT, valid_until TEXT,
    s3_ref TEXT NOT NULL, sha256 TEXT NOT NULL, mime TEXT, collector_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS evidence_versions (
    id TEXT PRIMARY KEY, evidence_id TEXT NOT NULL REFERENCES evidence(id),
    previous_hash TEXT, reason TEXT NOT NULL, superseded_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, actor_id TEXT,
    action TEXT NOT NULL, summary TEXT NOT NULL, entity_type TEXT, entity_id TEXT,
    metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ai_suggestions (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, feature TEXT NOT NULL,
    prompt_version TEXT NOT NULL, model TEXT NOT NULL, input_hash TEXT NOT NULL,
    output TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', acted_by TEXT,
    acted_at TEXT, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
    hashed_key TEXT NOT NULL, scopes TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'active',
    last_used_at TEXT, created_at TEXT NOT NULL
  )`,
];

export function migrate(): void {
  sqlite.exec("BEGIN");
  try {
    for (const ddl of DDL) sqlite.exec(ddl);
    sqlite.exec("COMMIT");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    throw err;
  }
}
