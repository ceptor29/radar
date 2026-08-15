import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("starter"),
  status: text("status").notNull().default("active"),
  settings: text("settings").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  authProviderId: text("auth_provider_id"),
  createdAt: text("created_at").notNull(),
});

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
});

export const userRoles = sqliteTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  roleId: text("role_id").notNull().references(() => roles.id),
});

export const risks = sqliteTable("risks", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  ownerId: text("owner_id").references(() => users.id),
  likelihood: integer("likelihood").notNull(),
  impact: integer("impact").notNull(),
  treatment: text("treatment"),
  targetResidual: integer("target_residual"),
  treatmentDue: text("treatment_due"),
  budget: real("budget"),
  inherentRaw: integer("inherent_raw"),
  inherentBand: text("inherent_band"),
  residualRaw: integer("residual_raw"),
  residualBand: text("residual_band"),
  controlFactor: real("control_factor"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const scoreVersions = sqliteTable("score_versions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  riskId: text("risk_id").notNull().references(() => risks.id),
  scoreType: text("score_type").notNull(),
  l: integer("l").notNull(),
  i: integer("i").notNull(),
  cFactor: real("c_factor").notNull(),
  rawScore: integer("raw_score").notNull(),
  band: text("band").notNull(),
  factorsSnapshot: text("factors_snapshot").notNull().default("[]"),
  computedBy: text("computed_by"),
  computedAt: text("computed_at").notNull(),
});

export const factorDefs = sqliteTable("factor_defs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  weight: real("weight").notNull().default(1),
  affects: text("affects").notNull().default("both"),
});

export const riskFactors = sqliteTable("risk_factors", {
  id: text("id").primaryKey(),
  riskId: text("risk_id").notNull().references(() => risks.id),
  factorDefId: text("factor_def_id").notNull().references(() => factorDefs.id),
  value: real("value").notNull(),
});

export const frameworks = sqliteTable("frameworks", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  version: text("version").notNull(),
});

export const requirements = sqliteTable("requirements", {
  id: text("id").primaryKey(),
  frameworkId: text("framework_id").notNull().references(() => frameworks.id),
  code: text("code").notNull(),
  text: text("text").notNull(),
});

export const controls = sqliteTable("controls", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("monthly"),
  status: text("status").notNull().default("not_implemented"),
  health: text("health").notNull().default("untested"),
  automationType: text("automation_type").notNull().default("manual"),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const controlRequirements = sqliteTable("control_requirements", {
  id: text("id").primaryKey(),
  controlId: text("control_id").notNull().references(() => controls.id),
  requirementId: text("requirement_id").notNull().references(() => requirements.id),
});

export const controlRisks = sqliteTable("control_risks", {
  id: text("id").primaryKey(),
  controlId: text("control_id").notNull().references(() => controls.id),
  riskId: text("risk_id").notNull().references(() => risks.id),
  weight: real("weight").notNull().default(1),
});

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  controlId: text("control_id").notNull().references(() => controls.id),
  type: text("type").notNull().default("manual"),
  status: text("status").notNull().default("valid"),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  validUntil: text("valid_until"),
  s3Ref: text("s3_ref").notNull(),
  sha256: text("sha256").notNull(),
  mime: text("mime"),
  collectorId: text("collector_id").references(() => users.id),
  createdAt: text("created_at").notNull(),
});

export const evidenceVersions = sqliteTable("evidence_versions", {
  id: text("id").primaryKey(),
  evidenceId: text("evidence_id").notNull().references(() => evidence.id),
  previousHash: text("previous_hash"),
  reason: text("reason").notNull(),
  supersededAt: text("superseded_at").notNull(),
});

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  summary: text("summary").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});

export const aiSuggestions = sqliteTable("ai_suggestions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  feature: text("feature").notNull(),
  promptVersion: text("prompt_version").notNull(),
  model: text("model").notNull(),
  inputHash: text("input_hash").notNull(),
  output: text("output").notNull(),
  status: text("status").notNull().default("pending"),
  actedBy: text("acted_by"),
  actedAt: text("acted_at"),
  createdAt: text("created_at").notNull(),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  hashedKey: text("hashed_key").notNull(),
  scopes: text("scopes").notNull().default("[]"),
  status: text("status").notNull().default("active"),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull(),
});
