export type Band = "low" | "moderate" | "high" | "critical";

export interface BandThreshold {
  max: number;
  band: Band;
}

export const DEFAULT_BANDS: BandThreshold[] = [
  { max: 4, band: "low" },
  { max: 9, band: "moderate" },
  { max: 15, band: "high" },
  { max: 25, band: "critical" },
];

export function bandForRawScore(raw: number, thresholds: BandThreshold[] = DEFAULT_BANDS): Band {
  for (const t of thresholds) {
    if (raw <= t.max) return t.band;
  }
  return thresholds[thresholds.length - 1].band;
}

export const STATUS_WEIGHTS = {
  implemented: 1.0,
  partial: 0.6,
  planned: 0.2,
  not_implemented: 0.0,
} as const;

export const TEST_HEALTH_WEIGHTS = {
  healthy: 1.0,
  failing: 0.4,
  overdue: 0.4,
  untested: 0.6,
  na: 1.0,
} as const;

export type ControlStatus = keyof typeof STATUS_WEIGHTS;
export type TestHealth = keyof typeof TEST_HEALTH_WEIGHTS;

export function controlEffectiveness(status: ControlStatus, testHealth: TestHealth): number {
  return STATUS_WEIGHTS[status] * TEST_HEALTH_WEIGHTS[testHealth];
}

export interface ControlEffectInput {
  status: ControlStatus;
  testHealth: TestHealth;
  weight: number;
}

export function controlFactor(controls: ControlEffectInput[]): number {
  const totalWeight = controls.reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0) return 0;
  const weighted = controls.reduce(
    (s, c) => s + controlEffectiveness(c.status, c.testHealth) * c.weight,
    0,
  );
  return Math.min(weighted / totalWeight, 0.85);
}

export interface ScoreResult {
  inherent: { raw: number; band: Band };
  residual: { raw: number; band: Band };
  controlFactor: number;
}

const BAND_FLOOR_GUARD: Record<Band, number> = {
  low: 0.0,
  moderate: 0.15,
  high: 0.25,
  critical: 0.35,
};

export function computeScore(
  l: number,
  i: number,
  controls: ControlEffectInput[],
  thresholds: BandThreshold[] = DEFAULT_BANDS,
): ScoreResult {
  const raw = l * i;
  const inherentBand = bandForRawScore(raw, thresholds);
  const c = controlFactor(controls);
  const guard = BAND_FLOOR_GUARD[inherentBand];
  const effectiveC = c >= guard ? c : 0;
  const residualRaw = Math.max(1, Math.round(raw * (1 - effectiveC)));
  const residualBand = bandForRawScore(residualRaw, thresholds);
  return {
    inherent: { raw, band: inherentBand },
    residual: { raw: residualRaw, band: residualBand },
    controlFactor: c,
  };
}
