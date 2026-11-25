import { STAGES } from "./stages";
import type { Job, Milestone, OutboundEvent, SystemKind, Variation } from "./types";

/** Default stage-payment schedule: deposit on booking, mid-job stage, balance on completion. */
export function defaultMilestones(system: SystemKind): Milestone[] {
  const stages = STAGES[system];
  const mid = stages[Math.max(0, Math.floor((stages.length - 1) / 2))]!;
  return [
    { id: "m-deposit", name: "Deposit", pct: 20, trigger: "booking", status: "waiting" },
    { id: "m-stage", name: `Stage ${mid.code} ${mid.short} approved`, pct: 40, trigger: "stage", stageCode: mid.code, status: "waiting" },
    { id: "m-complete", name: "Completion", pct: 40, trigger: "complete", status: "waiting" },
  ];
}

export function contractSum(job: Job, variations: Variation[]) {
  return job.quoted + variations.filter((v) => v.jobId === job.id && v.status === "signed").reduce((s, v) => s + v.cost, 0);
}

/** A stage counts as hit once every elevation has that stage photo approved. */
export function stageReached(job: Job, code: string) {
  return job.elevations.length > 0 && job.elevations.every((e) => e.stages.some((s) => s.code === code && s.status === "verified" && s.review === "approved"));
}

function reached(job: Job, m: Milestone) {
  if (m.trigger === "booking") return job.status !== "intake";
  if (m.trigger === "complete") return job.status === "complete";
  return !!m.stageCode && stageReached(job, m.stageCode);
}

/**
 * Marks newly hit milestones ready and returns the invoice events for Renderfuel Sales.
 * Also queues the single `job_completed` event (review request) when the job finishes.
 */
export function collectEvents(job: Job, variations: Variation[], at: string): OutboundEvent[] {
  if (!job.milestones) job.milestones = defaultMilestones(job.system);
  const sum = contractSum(job, variations);
  const out: OutboundEvent[] = [];
  for (const m of job.milestones) {
    if (m.status !== "waiting" || !reached(job, m)) continue;
    m.status = "ready";
    m.readyAt = at;
    out.push({
      id: `ev-${job.id}-${m.id}-${at}`, at, type: "milestone_achieved", jobId: job.id, status: "queued",
      payload: { opportunityId: job.ghlOpportunityId ?? job.ref, milestone: m.name, pct: m.pct, amount: Math.round((sum * m.pct) / 100), contractSum: sum, status: "ready_to_invoice" },
    });
  }
  if (job.status === "complete" && !job.reviewRequested) {
    job.reviewRequested = true;
    out.push({ id: `ev-${job.id}-done-${at}`, at, type: "job_completed", jobId: job.id, status: "queued", payload: { opportunityId: job.ghlOpportunityId ?? job.ref, customer: job.customer, address: `${job.address}, ${job.postcode}`, completedAt: job.completedAt ?? at.slice(0, 10) } });
  }
  return out;
}
