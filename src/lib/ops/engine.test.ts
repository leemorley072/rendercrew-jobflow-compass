import { describe, expect, it } from "vitest";
import { coatingSafe, findPivotTarget, labourRunway, planSchedule, PIVOT_RADIUS_MIN } from "./engine";
import { seedTenantData } from "./seed";
import { approveStage, elevationDone, freshStages, rejectStage, verifyStage } from "./stages";
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
  it("uploading a photo waits for office approval before the next stage unlocks", () => {
    const el = { name: "Rear", area: 48, stages: freshStages("silicone", 0) };
    verifyStage(el, "S1", "data:x", "now");
    expect(el.stages[0]!.review).toBe("pending");
    expect(el.stages[1]!.status).toBe("locked");
    approveStage(el, "S1");
    expect(el.stages[1]!.status).toBe("upload");
    expect(el.stages[2]!.status).toBe("locked");
  });
  it("a final photo awaiting approval does not complete the elevation", () => {
    const el = { name: "Rear", area: 48, stages: freshStages("plaster", 2) };
    verifyStage(el, "P3", "data:x", "now");
    expect(elevationDone(el)).toBe(false);
    approveStage(el, "P3");
    expect(elevationDone(el)).toBe(true);
  });
  it("rejection keeps the office note for the team", () => {
    const el = { name: "Rear", area: 48, stages: freshStages("silicone", 3) };
    rejectStage(el, "S2", "Mesh overlap under 100mm at window");
    expect(el.stages[1]!.rejectNote).toBe("Mesh overlap under 100mm at window");
  });
  it("rejecting relocks later stages", () => {
    const el = { name: "Rear", area: 48, stages: freshStages("silicone", 3) };
    rejectStage(el, "S2");
    expect(el.stages[1]!.status).toBe("upload");
    expect(el.stages[2]!.status).toBe("locked");
  });
});

import { closeOutShift, labourRunway as runway, materialSpend, resolveCatalog, DEFAULT_MATERIALS } from "./costing";

describe("job costing", () => {
  it("contractor price overrides the agency benchmark", () => {
    const cat = resolveCatalog(DEFAULT_MATERIALS, { basecoat: { supplier: "Minster Leeds", price: 10.5 } });
    expect(cat.find((m) => m.id === "basecoat")!.price).toBe(10.5);
    expect(cat.find((m) => m.id === "topcoat")!.price).toBe(68);
  });
  it("material spend = Σ quantity × unit price", () => {
    const j = job({ usage: { basecoat: 10, topcoat: 2, mesh: 1 } });
    expect(materialSpend(j, DEFAULT_MATERIALS)).toBeCloseTo(10 * 11.5 + 2 * 68 + 42);
  });
  it("one plasterer on site costs one man-day, not a full gang day", () => {
    const j = job({ daysWorked: 0, manDays: 0, menOnSite: 1 });
    closeOutShift(j, 3);
    const r = runway(j, [], 0.25, 570, { men: 3 });
    expect(r.labourSpent).toBe(190);
  });
  it("no-scaffold jobs skip scaffold cost and scaffold days", () => {
    const j = job({ scaffoldCost: 1200, scaffold: { hireDays: 0, daysUsed: 0, weeklyFee: 180, required: false }, menOnSite: 2 });
    closeOutShift(j, 3);
    expect(j.scaffold.daysUsed).toBe(0);
    expect(runway(j, [], 0.25, 570, { men: 3 }).scaffold).toBe(0);
  });
  it("logged materials over the allowance eat into the runway", () => {
    const j = job({ quoted: 10000, materialCost: 2000, scaffoldCost: 0, scaffold: { hireDays: 0, daysUsed: 0, weeklyFee: 0, required: false }, daysWorked: 0, manDays: 0 });
    expect(runway(j, [], 0.25, 500, { spend: 1500 }).direct).toBe(2000);
    expect(runway(j, [], 0.25, 500, { spend: 2600 }).direct).toBe(2600);
  });
});

import { planPivot, safeTargets } from "./team";
import { middayReminders, todaysJobFor } from "./engine";
import { STAGES } from "./stages";

describe("team routing", () => {
  it("a job that takes the whole team always wins over splitting", () => {
    const d = seedTenantData();
    const g1 = d.crews.find((c) => c.id === "g1")!;
    const plan = planPivot(d, g1, { x: 4, y: 26 }, "j1042");
    expect(plan.mode).toBe("team");
    if (plan.mode === "team") expect(plan.target.men).toBeGreaterThanOrEqual(3);
  });
  it("with only small jobs, the van crew stays together and own-transport workers split off", () => {
    const d = seedTenantData();
    d.jobs = d.jobs.filter((j) => j.id === "j1052" || j.id === "j1053" || j.id === "j1042");
    const g1 = d.crews.find((c) => c.id === "g1")!; // Marcus drives, Callum own transport, Josh needs a lift
    const plan = planPivot(d, g1, { x: 4, y: 26 }, "j1042");
    expect(plan.mode).toBe("split");
    if (plan.mode !== "split") return;
    const van = plan.assignments[0]!.workerIds;
    expect(van).toContain("w1");
    expect(van).toContain("w3");
    expect(plan.assignments[1]!.workerIds).toEqual(["w2"]);
  });
  it("indoor plastering counts as rain-safe work", () => {
    const d = seedTenantData();
    expect(safeTargets({ x: 5, y: 22 }, d.jobs).some((t) => t.job.system === "plaster")).toBe(true);
  });
});

describe("worker access & reminders", () => {
  it("a worker only gets the one job they're booked on today", () => {
    const d = seedTenantData();
    expect(todaysJobFor(d, "w4")?.id).toBe("j1039");
    expect(todaysJobFor(d, "w9")?.id).toBe("j1052");
    expect(todaysJobFor(d, "w7")).toBeUndefined(); // Gang 3 on rain delay
  });
  it("midday reminder goes at 12:30 to everyone booked on site", () => {
    const r = middayReminders(seedTenantData(), "https://x");
    expect(r.map((x) => x.workerId).sort()).toEqual(["w4", "w5", "w6", "w9"]);
    expect(r[0]!.message).toContain("12:30");
  });
  it("plastering has just before, prep done and finished stages", () => {
    expect(STAGES.plaster.map((s) => s.name)).toEqual(["Before Photos", "Prep Work Done", "Plastering Finished"]);
  });
});

import { clockIn, clockOut, labourFromEntries, monthlyAudit } from "./time";
import type { TimeEntry, Worker } from "./types";

describe("check-in / check-out", () => {
  const w = { id: "wA", name: "Amy", dayRate: 190 } as Worker;
  const j = (over: Partial<Job> = {}) => job({ id: "jA", ...over });
  it("only lets a worker join the job they're booked on today", () => {
    expect(() => clockIn([], w, j(), "other", "2026-11-25T07:30:00Z")).toThrow();
    const es: TimeEntry[] = [];
    clockIn(es, w, j(), "jA", "2026-11-25T07:30:00Z");
    expect(es).toHaveLength(1);
    expect(() => clockIn(es, w, j(), "jA", "2026-11-25T07:40:00Z")).toThrow();
  });
  it("blocks check-out until the job is wrapped up for the day", () => {
    const es: TimeEntry[] = [];
    clockIn(es, w, j(), "jA", "2026-11-25T07:30:00Z");
    expect(() => clockOut(es, "wA", j(), "2026-11-25T16:00:00Z")).toThrow();
    clockOut(es, "wA", j({ closedOutOn: "2026-11-25" }), "2026-11-25T16:00:00Z");
    expect(es[0]!.clockOut).toBe("2026-11-25T16:00:00Z");
  });
  it("charges each worker's own day rate to the job", () => {
    const es = [{ jobId: "jA", dayRate: 190 }, { jobId: "jA", dayRate: 220 }, { jobId: "jB", dayRate: 999 }] as TimeEntry[];
    expect(labourFromEntries(es, "jA")).toEqual({ cost: 410, shifts: 2 });
  });
  it("flags off-site check-ins when the phone is far from the site pin", () => {
    const es: TimeEntry[] = [];
    clockIn(es, w, j({ geo: { lat: 53.99, lng: -1.54 } }), "jA", "2026-11-25T07:30:00Z", { lat: 53.80, lng: -1.55 });
    expect(es[0]!.inOffSite).toBe(true);
  });
  it("counts lost hours against an 8-hour day", () => {
    const es = [{ workerId: "wA", jobId: "jA", date: "2026-11-02", dayRate: 160, clockIn: "2026-11-02T08:00:00Z", clockOut: "2026-11-02T14:00:00Z" }] as TimeEntry[];
    const [a] = monthlyAudit(es, [{ ...w, dayRate: 160 }], "2026-11", "2026-11-25");
    expect(a!.lostHours).toBe(2);
    expect(a!.lostValue).toBe(40);
  });
});
