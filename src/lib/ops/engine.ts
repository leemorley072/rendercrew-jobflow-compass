import { stageDef, elevationDone, currentStage } from "./stages";
import { crewOfWorker, planPivot, safeTargets, REMINDER_TIME } from "./team";
import type { Booking, Crew, DayWeather, Job, Region, TenantData } from "./types";

export const RAIN_LIMIT = 30;
export const COLD_LIMIT = 5;
export const PIVOT_RADIUS_MIN = 35;
export const TODAY = 3; // Thu 12 in the seeded week (day 0 = Mon 9)
export const DAY_LABELS = Array.from({ length: 14 }, (_, i) => {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return `${names[i % 7]} ${9 + i}`;
});

export function coatingSafe(w: DayWeather | undefined) {
  if (!w) return true;
  return w.rain <= RAIN_LIMIT && w.temp >= COLD_LIMIT;
}

export function weatherFor(d: TenantData, region: Region, day: number): DayWeather {
  const base = d.forecast[region]?.[day] ?? { rain: 10, temp: 14 };
  if (d.rainOverrides.includes(day)) return { rain: 75, temp: 9, note: "Simulated rain event" };
  return base;
}

export function travelMinutes(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 1.3 + 4);
}

export { labourRunway } from "./costing";

export function scaffoldLeft(job: Job) {
  return job.scaffold.hireDays - job.scaffold.daysUsed;
}

export function scaffoldTone(job: Job): "none" | "struck" | "red" | "amber" | "green" {
  if (job.scaffold.required === false) return "none";
  if (job.scaffold.struck || job.status === "complete") return "struck";
  const left = scaffoldLeft(job);
  if (left <= 2) return "red";
  if (left <= 7) return "amber";
  return "green";
}

export function jobComplete(job: Job) {
  return job.elevations.length > 0 && job.elevations.every(elevationDone);
}

export function jobArea(job: Job) {
  return job.elevations.reduce((s, e) => s + e.area, 0);
}

export function jobCurrentStageCode(job: Job) {
  for (const el of job.elevations) {
    const c = currentStage(el);
    if (c) return c.code;
  }
  return undefined;
}

export interface PivotDecision {
  crewId: string;
  day: number;
  fromJobId?: string;
  fromLabel: string;
  toJobId?: string;
  toLabel?: string;
  minutes?: number;
  reason: string;
  /** Split pivots: which workers go where. */
  assignments?: { workerIds: string[]; jobId: string; label: string; minutes: number }[];
}

export interface Cell {
  key: string;
  crewId: string;
  start: number;
  len: number;
  kind: Booking["kind"] | "pivot" | "open";
  label: string;
  jobId?: string | undefined;
}

/** Nearest rain-safe task (outdoor prep or indoor work) within the pivot radius. */
export function findPivotTarget(from: { x: number; y: number }, jobs: Job[], excludeJobId?: string) {
  return safeTargets(from, jobs, excludeJobId)[0];
}

/**
 * The 06:00 rain-pivot scan: any finishing-coat day at risk (rain > 30% or below 5°C)
 * from today on is paused and the crew is routed to the nearest safe prep task.
 */
export function planSchedule(d: TenantData, today = TODAY, days = 14) {
  const cells: Cell[] = [];
  const decisions: PivotDecision[] = [];
  const jobsById = new Map(d.jobs.map((j) => [j.id, j]));
  for (const b of d.bookings) {
    const job = b.jobId ? jobsById.get(b.jobId) : undefined;
    const sensitive = b.stageCode ? stageDef(b.stageCode).weatherSensitive : false;
    if (!job || !sensitive || (b.kind !== "work" && b.kind !== "new")) {
      cells.push({ key: b.id, crewId: b.crewId, start: b.start, len: b.len, kind: b.kind, label: b.label, jobId: b.jobId });
      continue;
    }
    let runStart = b.start;
    const flush = (end: number) => {
      if (end > runStart)
        cells.push({ key: `${b.id}-${runStart}`, crewId: b.crewId, start: runStart, len: end - runStart, kind: b.kind, label: b.label, jobId: b.jobId });
    };
    for (let day = b.start; day < b.start + b.len; day++) {
      const w = weatherFor(d, job.region, day);
      if (day >= today && !coatingSafe(w)) {
        flush(day);
        runStart = day + 1;
        const crew = d.crews.find((c) => c.id === b.crewId);
        const plan = crew ? planPivot(d, crew, job.coords, job.id) : { mode: "hold" as const };
        const reason = w.rain > RAIN_LIMIT ? `${w.rain}% rain` : `${w.temp}°C`;
        if (plan.mode === "team") {
          const t = plan.target;
          const label = `↻ ${t.job.ref.replace("RF-", "#")} · ${t.task}`;
          cells.push({ key: `${b.id}-p${day}`, crewId: b.crewId, start: day, len: 1, kind: "pivot", label, jobId: t.job.id });
          decisions.push({ crewId: b.crewId, day, fromJobId: job.id, fromLabel: b.label, toJobId: t.job.id, toLabel: `${t.job.address} · ${t.task} (whole team)`, minutes: t.minutes, reason });
        } else if (plan.mode === "split") {
          const names = (ids: string[]) => ids.map((id) => d.workers?.find((x) => x.id === id)?.name.split(" ")[0] ?? "?").join(" + ");
          const first = plan.assignments[0]!.target;
          cells.push({ key: `${b.id}-p${day}`, crewId: b.crewId, start: day, len: 1, kind: "pivot", label: `↻ Split · ${plan.assignments.length} sites`, jobId: first.job.id });
          decisions.push({
            crewId: b.crewId, day, fromJobId: job.id, fromLabel: b.label, toJobId: first.job.id, minutes: first.minutes, reason,
            toLabel: plan.assignments.map((x) => `${names(x.workerIds)} → ${x.target.job.address} · ${x.target.task}`).join("; "),
            assignments: plan.assignments.map((x) => ({ workerIds: x.workerIds, jobId: x.target.job.id, label: `${x.target.job.address} · ${x.target.task}`, minutes: x.target.minutes })),
          });
        } else {
          cells.push({ key: `${b.id}-h${day}`, crewId: b.crewId, start: day, len: 1, kind: "hold", label: "Rain Hold" });
          decisions.push({ crewId: b.crewId, day, fromJobId: job.id, fromLabel: b.label, reason: `${reason} · no safe task within ${PIVOT_RADIUS_MIN} min` });
        }
      }
    }
    flush(b.start + b.len);
  }
  // Open slots: free runs of 3+ days
  for (const c of d.crews) {
    const busy = new Array(days).fill(false);
    cells.filter((x) => x.crewId === c.id).forEach((x) => {
      for (let i = x.start; i < x.start + x.len; i++) if (i < days) busy[i] = true;
    });
    let i = 0;
    while (i < days) {
      if (busy[i] || i < today - 1) { i++; continue; }
      let j = i;
      while (j < days && !busy[j]) j++;
      if (j - i >= 3) cells.push({ key: `open-${c.id}-${i}`, crewId: c.id, start: i, len: j - i, kind: "open", label: `Open Slot · ${j - i} days` });
      i = j;
    }
  }
  return { cells, decisions };
}

export function crewFreeFrom(d: TenantData, crewId: string, from: number, len: number, horizon = 14) {
  const busy = new Array(horizon + len).fill(false);
  d.bookings.filter((b) => b.crewId === crewId).forEach((b) => {
    for (let i = b.start; i < b.start + b.len; i++) busy[i] = true;
  });
  for (let s = from; s <= horizon - 1; s++) {
    let ok = true;
    for (let k = 0; k < len; k++) if (busy[s + k]) ok = false;
    if (ok) return s;
  }
  return undefined;
}

export function daysNeeded(job: Job, crew: Crew) {
  return Math.max(1, Math.round(jobArea(job) / (crew.men * 20)));
}

/** Ranks crews for an incoming job: system skill, drive time, and availability. */
export function rankCrews(d: TenantData, job: Job, today = TODAY) {
  return d.crews
    .map((c) => {
      const minutes = travelMinutes(c.base, job.coords);
      const skill = c.skills.includes(job.system) ? 50 : 10;
      const prox = 30 * Math.max(0, 1 - Math.max(0, minutes - 12) / 60);
      const len = daysNeeded(job, c);
      const start = crewFreeFrom(d, c.id, today, len);
      const avail = start === undefined ? 0 : start <= today + 2 ? 20 : 10;
      return { crew: c, minutes, score: Math.round(skill + prox + avail), start, len };
    })
    .sort((a, b) => b.score - a.score);
}

export const gbp = (n: number, dp = 0) =>
  "£" + n.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });

/** The one job a worker may see and update today — follows the schedule, rain pivots and splits. */
export function todaysJobFor(d: TenantData, workerId: string, today = TODAY): Job | undefined {
  const crew = crewOfWorker(d, workerId);
  if (!crew) return undefined;
  const { cells, decisions } = planSchedule(d, today);
  const dec = decisions.find((x) => x.crewId === crew.id && x.day === today);
  let jobId: string | undefined;
  if (dec?.assignments) jobId = dec.assignments.find((a) => a.workerIds.includes(workerId))?.jobId;
  else if (dec) jobId = dec.toJobId;
  else jobId = cells.find((c) => c.crewId === crew.id && c.jobId && c.kind !== "open" && today >= c.start && today < c.start + c.len)?.jobId;
  return d.jobs.find((j) => j.id === jobId && j.status !== "complete");
}

export interface Reminder { workerId: string; name: string; phone: string; jobId: string; message: string }

/** Midday nudge to everyone on site today: snap stage photos and log materials. */
export function middayReminders(d: TenantData, origin: string, today = TODAY): Reminder[] {
  return (d.workers ?? []).flatMap((w) => {
    const job = todaysJobFor(d, w.id, today);
    if (!job || !w.phone) return [];
    const message = `Renderfuel ${REMINDER_TIME}: ${w.name.split(" ")[0]}, quick update for ${job.address} — snap stage photos and log materials used: ${origin}/site/${job.id}`;
    return [{ workerId: w.id, name: w.name, phone: w.phone, jobId: job.id, message }];
  });
}
