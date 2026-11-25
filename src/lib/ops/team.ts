import { currentStage, DEFAULT_MEN, INDOOR, stageDef } from "./stages";
import type { Crew, Job, TenantData, Worker } from "./types";

export const PIVOT_RADIUS = 35;
export const REMINDER_TIME = "12:30";

function travel(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 1.3 + 4);
}

export function menNeeded(job: Job) {
  return job.menNeeded ?? DEFAULT_MEN[job.system];
}

export function crewMembers(d: TenantData, crew: Crew): Worker[] {
  const ws = d.workers ?? [];
  return (crew.memberIds ?? []).map((id) => ws.find((w) => w.id === id)).filter((w): w is Worker => !!w);
}

export function crewOfWorker(d: TenantData, workerId: string) {
  return d.crews.find((c) => c.memberIds?.includes(workerId));
}

export interface SafeTarget { job: Job; minutes: number; task: string; men: number }

/** Rain-safe work within the radius: outdoor prep stages or any indoor job, nearest first. */
export function safeTargets(from: { x: number; y: number }, jobs: Job[], excludeJobId?: string, radius = PIVOT_RADIUS): SafeTarget[] {
  const out: SafeTarget[] = [];
  for (const j of jobs) {
    if (j.id === excludeJobId || j.status === "complete") continue;
    const el = j.elevations.find((e) => {
      const c = currentStage(e);
      return c && (INDOOR[j.system] || stageDef(c.code).prep);
    });
    if (!el) continue;
    const minutes = travel(from, j.coords);
    if (minutes > radius) continue;
    out.push({ job: j, minutes, task: stageDef(currentStage(el)!.code).short, men: menNeeded(j) });
  }
  return out.sort((a, b) => a.minutes - b.minutes);
}

export interface Assignment { workerIds: string[]; target: SafeTarget }
export type PivotPlan =
  | { mode: "team"; target: SafeTarget }
  | { mode: "split"; assignments: Assignment[] }
  | { mode: "hold" };

/**
 * Rained-off team: a job that takes the whole team always wins (they share the van).
 * Only when none exists are workers split — the van driver and anyone without own
 * transport stay together; workers with their own transport fill other small jobs.
 */
export function planPivot(d: TenantData, crew: Crew, from: { x: number; y: number }, excludeJobId?: string): PivotPlan {
  const targets = safeTargets(from, d.jobs, excludeJobId);
  if (targets.length === 0) return { mode: "hold" };
  const whole = targets.find((t) => t.men >= crew.men);
  if (whole) return { mode: "team", target: whole };
  const members = crewMembers(d, crew);
  const independents = members.filter((m) => m.id !== crew.driverId && m.ownTransport);
  if (members.length === 0 || independents.length === 0 || targets.length < 2) return { mode: "team", target: targets[0]! };
  const vanGroup = members.filter((m) => !independents.includes(m));
  const first = targets[0]!;
  const assignments: Assignment[] = [{ workerIds: vanGroup.map((m) => m.id), target: first }];
  const free = [...independents];
  for (const t of targets.slice(1)) {
    if (free.length === 0) break;
    const take = free.splice(0, t.men);
    assignments.push({ workerIds: take.map((m) => m.id), target: t });
  }
  // Anyone left over joins the van site rather than sitting at home.
  if (free.length) assignments[0]!.workerIds.push(...free.map((m) => m.id));
  return { mode: "split", assignments };
}
