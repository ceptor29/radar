import { describe, it, expect } from "vitest";
import {
  computeScore,
  controlFactor,
  controlEffectiveness,
  bandForRawScore,
  DEFAULT_BANDS,
} from "@shared/scoring";

describe("bandForRawScore", () => {
  it("maps raw scores to default bands", () => {
    expect(bandForRawScore(4)).toBe("low");
    expect(bandForRawScore(5)).toBe("moderate");
    expect(bandForRawScore(9)).toBe("moderate");
    expect(bandForRawScore(10)).toBe("high");
    expect(bandForRawScore(15)).toBe("high");
    expect(bandForRawScore(16)).toBe("critical");
    expect(bandForRawScore(25)).toBe("critical");
  });

  it("honors custom thresholds", () => {
    const custom = [{ max: 2, band: "low" as const }, { max: 8, band: "high" as const }, { max: 25, band: "critical" as const }];
    expect(bandForRawScore(1, custom)).toBe("low");
    expect(bandForRawScore(5, custom)).toBe("high");
    expect(bandForRawScore(20, custom)).toBe("critical");
  });
});

describe("controlEffectiveness", () => {
  it("computes status * test health", () => {
    expect(controlEffectiveness("implemented", "healthy")).toBeCloseTo(1.0);
    expect(controlEffectiveness("implemented", "failing")).toBeCloseTo(0.4);
    expect(controlEffectiveness("partial", "healthy")).toBeCloseTo(0.6);
    expect(controlEffectiveness("not_implemented", "healthy")).toBeCloseTo(0.0);
  });
});

describe("controlFactor", () => {
  it("returns weighted mean", () => {
    const c = controlFactor([
      { status: "implemented", testHealth: "healthy", weight: 1 },
      { status: "implemented", testHealth: "failing", weight: 1 },
    ]);
    expect(c).toBeCloseTo(0.7);
  });

  it("caps at 0.85", () => {
    const c = controlFactor([
      { status: "implemented", testHealth: "healthy", weight: 1 },
      { status: "implemented", testHealth: "healthy", weight: 1 },
    ]);
    expect(c).toBeCloseTo(0.85);
  });

  it("returns 0 with no controls", () => {
    expect(controlFactor([])).toBe(0);
  });
});

describe("computeScore", () => {
  it("no controls -> residual equals inherent", () => {
    const s = computeScore(4, 5, []);
    expect(s.inherent.raw).toBe(20);
    expect(s.inherent.band).toBe("critical");
    expect(s.residual.raw).toBe(20);
    expect(s.residual.band).toBe("critical");
  });

  it("fully healthy controls reduce residual but respect the band-floor guard", () => {
    const s = computeScore(4, 5, [{ status: "implemented", testHealth: "healthy", weight: 1 }]);
    expect(s.inherent.raw).toBe(20);
    expect(s.controlFactor).toBeCloseTo(0.85);
    expect(s.residual.raw).toBe(Math.round(20 * (1 - 0.85)));
    expect(s.residual.band).not.toBe("critical");
  });

  it("weak controls below the floor do not change the score", () => {
    const weak = computeScore(4, 5, [{ status: "planned", testHealth: "untested", weight: 1 }]);
    expect(weak.controlFactor).toBeCloseTo(0.12);
    expect(weak.residual.raw).toBe(20); // 0.12 < 0.35 floor for critical -> no reduction
  });

  it("moderate band floor is 0.15", () => {
    const s = computeScore(3, 3, [{ status: "planned", testHealth: "untested", weight: 1 }]);
    expect(s.inherent.raw).toBe(9);
    expect(s.inherent.band).toBe("moderate");
    expect(s.controlFactor).toBeCloseTo(0.12);
    expect(s.residual.raw).toBe(9); // floor 0.15, c=0.12 below floor
  });

  it("never drops below raw score of 1", () => {
    const s = computeScore(1, 1, [{ status: "implemented", testHealth: "healthy", weight: 1 }]);
    expect(s.residual.raw).toBe(1);
  });

  it("matches the seed fixture expectations", () => {
    const s = computeScore(3, 4, [
      { status: "implemented", testHealth: "healthy", weight: 1 },
      { status: "partial", testHealth: "overdue", weight: 0.5 },
    ]);
    expect(s.inherent.raw).toBe(12);
    expect(s.inherent.band).toBe("high");
    const expectedC = (1.0 + 0.24 * 0.5) / 1.5;
    expect(s.controlFactor).toBeCloseTo(expectedC);
  });

  it("DEFAULT_BANDS is the reference table", () => {
    expect(DEFAULT_BANDS).toHaveLength(4);
    expect(DEFAULT_BANDS.map((b) => b.band)).toEqual(["low", "moderate", "high", "critical"]);
  });
});
