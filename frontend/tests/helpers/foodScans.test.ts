import { describe, expect, it } from "vitest";
import { getFoodScanAnalysis } from "@/helpers/foodScans";

describe("food scan helpers", () => {
  it("returns null for unknown scan", () => {
    expect(getFoodScanAnalysis("unknown-scan")).toBeNull();
  });

  it("builds scan analysis with interactions for a known scan", () => {
    const analysis = getFoodScanAnalysis("SCAN-001");

    expect(analysis?.scan.id).toBe("SCAN-001");
    expect(analysis?.schedules.every((schedule) => schedule.patientId === analysis.scan.patientId)).toBe(true);
    expect(analysis?.interactions).toHaveLength(analysis?.schedules.length ?? 0);
    expect(analysis?.overallRisk).toMatch(/Risk$/);
  });
});
