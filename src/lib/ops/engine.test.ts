import { describe, expect, it } from "vitest";
import { coatingSafe, findPivotTarget, labourRunway, planSchedule, PIVOT_RADIUS_MIN } from "./engine";
import { seedTenantData } from "./seed";
import { freshStages, rejectStage, verifyStage } from "./stages";
import type { Job } from "./types";

const job = (over: Partial<Job> = {}): Job => ({ ...seedTenantData().jobs[0]!, ...over });

describe("labour runway", () => {
  it("(quoted + signed − direct − 25% floor) / day cost", () => {
    const j = job({ quoted: 10000, materialCost: 2000, scaffoldCost: 1000, daysWorked: 4 });
    const r = labourRunway(j, [], 0.25, 500);
    expect(r.affordable).toBe(9); // (10000 − 3000 − 2500) / 500
    expect(r.remaining).toBe(5);
  });
  it("adds signed variations only", () => {
    const j = job({ id: "x", quoted: 10000, materialCost: 2000, scaffoldCost: 1000, daysWorked: 0 });
    const base = { jobId: "x", cost: 400 } as never;
    const r = labourRunway(j, [{ ...(base as object), status: "signed" } as never, { ...(base as object), status: "pending" } as never], 0.25, 500);
    expect(r.revenue).toBe(10400);
  });
});

describe("rain pivot", () => {
  it("rain over 30% or under 5°C blocks finishing coats", () => {
    expect(coatingSafe({ rain: 30, temp: 5 })).toBe(true);
    expect(coatingSafe({ rain: 31, temp: 14 })).toBe(false);
    expect(coatingSafe({ rain: 10, temp: 4 })).toBe(false);
  });
  it("only routes to prep sites within 35 minutes", () => {
    const d = seedTenantData();
    const far = findPivotTarget({ x: 200, y: 200 }, d.jobs);
    expect(far).toBeUndefined();
    const near = findPivotTarget({ x: 4, y: 26 }, d.jobs, "j1042");
    expect(near!.minutes).toBeLessThanOrEqual(PIVOT_RADIUS_MIN);
  });
  it("a simulated rain day pivots the Friday primer crew to prep", () => {
    const d = seedTenantData();
    d.rainOverrides = [4];
    const { decisions } = planSchedule(d);
    const g1 = decisions.find((x) => x.crewId === "g1" && x.day === 4);
    expect(g1?.toJobId).toBeDefined();
  });
});

describe("stage gates", () => {
  it("uploading a photo verifies the stage and unlocks the next", () => {
    const el = { name: "Rear", area: 48, stages: freshStages("silicone", 0) };
    verifyStage(el, "S1", "data:x", "now");
    expect(el.stages[0]!.status).toBe("verified");
    expect(el.stages[1]!.status).toBe("upload");
    expect(el.stages[2]!.status).toBe("locked");
  });
  it("rejecting relocks later stages", () => {
    const el = { name: "Rear", area: 48, stages: freshStages("silicone", 3) };
    rejectStage(el, "S2");
    expect(el.stages[1]!.status).toBe("upload");
    expect(el.stages[2]!.status).toBe("locked");
  });
});
