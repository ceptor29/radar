import { z } from "zod";
import { STATUS_WEIGHTS, TEST_HEALTH_WEIGHTS } from "./scoring";

export const riskCategorySchema = z.enum([
  "operational",
  "cyber",
  "financial",
  "regulatory",
  "strategic",
  "third_party",
]);

export const treatmentSchema = z.enum(["accept", "mitigate", "transfer", "avoid"]);

export const controlStatusSchema = z.enum(
  Object.keys(STATUS_WEIGHTS) as [string, ...string[]],
);
export const testHealthSchema = z.enum(
  Object.keys(TEST_HEALTH_WEIGHTS) as [string, ...string[]],
);
export const controlFrequencySchema = z.enum([
  "continuous",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annual",
]);
export const controlHealthSchema = z.enum(["healthy", "failing", "untested", "overdue"]);
export const evidenceTypeSchema = z.enum(["auto", "manual"]);
export const evidenceStatusSchema = z.enum(["valid", "expiring", "expired", "superseded"]);
export const scoreTypeSchema = z.enum(["inherent", "residual"]);
export const roleSchema = z.enum([
  "admin",
  "compliance_lead",
  "control_owner",
  "risk_owner",
  "auditor",
  "viewer",
]);

export const riskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: riskCategorySchema,
  ownerId: z.string().uuid().optional(),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  treatment: treatmentSchema.optional(),
  targetResidual: z.number().int().min(1).max(25).optional(),
  treatmentDue: z.string().datetime().optional(),
  budget: z.number().nonnegative().optional(),
});

export const riskUpdateSchema = riskCreateSchema.partial();

export const controlCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  frequency: controlFrequencySchema,
  status: controlStatusSchema,
  health: controlHealthSchema,
  automationType: z.enum(["automated", "manual", "none"]),
  ownerId: z.string().uuid().optional(),
  requirementIds: z.array(z.string().uuid()).optional(),
  riskLinks: z
    .array(z.object({ riskId: z.string().uuid(), weight: z.number().nonnegative().optional() }))
    .optional(),
});

export const evidenceCreateSchema = z.object({
  controlId: z.string().uuid(),
  type: evidenceTypeSchema.optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
});

export const heatmapPoint = z.object({
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  scoreType: scoreTypeSchema,
  riskId: z.string(),
  title: z.string(),
  band: z.string(),
});

export type RiskCreate = z.infer<typeof riskCreateSchema>;
export type RiskUpdate = z.infer<typeof riskUpdateSchema>;
export type ControlCreate = z.infer<typeof controlCreateSchema>;
export type EvidenceCreate = z.infer<typeof evidenceCreateSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type HeatmapPoint = z.infer<typeof heatmapPoint>;
