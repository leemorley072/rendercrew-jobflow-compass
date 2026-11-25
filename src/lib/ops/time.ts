import type { Job, TimeEntry, Worker } from "./types";

/** A full site day; anything short of this counts as lost hours. */
export const SHIFT_HOURS = 8;
/** Check-ins further than this from the site are flagged to the office (never shown to the team). */
export const OFF_SITE_METRES = 400;
export const WRAP_UP_TIME = "16:30";

const REGION_CENTRE: Record<string, { lat: number; lng: number }> = {
  Leeds: { lat: 53.8008, lng: -1.5491 },
  Harrogate: { lat: 53.9921, lng: -1.5418 },
  York: { lat: 53.96, lng: -1.0873 },
};

export const dayKey = (iso: string) => iso.slice(0, 10);

export function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Site pin: the job's own location, else the town centre with a wider allowance. */
export function siteDistance(job: Job, gps?: { lat: number; lng: number }) {
  if (!gps) return undefined;
  const pin = job.geo ?? REGION_CENTRE[job.region];
  if (!pin) return undefined;
  const d = metresBetween(gps, pin);
  return { metres: d, offSite: d > (job.geo ? OFF_SITE_METRES : 8000) };
}

export const openEntry = (entries: TimeEntry[], workerId: string, date: string) =>
  entries.find((e) => e.workerId === workerId && e.date === date && !e.clockOut);

export const entriesOn = (entries: TimeEntry[], jobId: string, date: string) =>
  entries.filter((e) => e.jobId === jobId && e.date === date);

/** Each worker checks themselves in — only on the job they're booked on today, once. */
export function clockIn(
  entries: TimeEntry[], worker: Worker, job: Job | undefined, bookedJobId: string | undefined, now: string, gps?: { lat: number; lng: number; acc?: number },
): TimeEntry {
  if (!job || job.id !== bookedJobId) throw new Error("You can only join the shift on the job you're booked on today.");
  const date = dayKey(now);
  if (openEntry(entries, worker.id, date)) throw new Error("You're already checked in.");
  if (entries.some((e) => e.workerId === worker.id && e.date === date && e.jobId === job.id)) throw new Error("You've already wrapped up today on this job.");
  const dist = siteDistance(job, gps);
  const entry: TimeEntry = {
    id: `te-${worker.id}-${now}`, workerId: worker.id, jobId: job.id, date, clockIn: now, dayRate: worker.dayRate,
    ...(gps ? { inGps: gps } : {}), ...(dist ? { inMetres: dist.metres, inOffSite: dist.offSite } : {}),
  };
  entries.push(entry);
  return entry;
}

/** Checking out needs the job wrapped up for the day first; only your own entry. */
export function clockOut(entries: TimeEntry[], workerId: string, job: Job, now: string, gps?: { lat: number; lng: number; acc?: number }) {
  const date = dayKey(now);
  const e = openEntry(entries, workerId, date);
  if (!e) throw new Error("You're not checked in today.");
  if (job.closedOutOn !== date) throw new Error("Wrap up today's job first — then everyone checks out.");
  const dist = siteDistance(job, gps);
  e.clockOut = now;
  if (gps) e.outGps = gps;
  if (dist) { e.outMetres = dist.metres; e.outOffSite = dist.offSite; }
  return e;
}

export function hoursOf(e: TimeEntry) {
  if (!e.clockOut) return 0;
  return Math.max(0, (Date.parse(e.clockOut) - Date.parse(e.clockIn)) / 3600000);
}

/** Labour charged to a job: each checked-in worker's own day rate per shift. */
export function labourFromEntries(entries: TimeEntry[], jobId: string) {
  const mine = entries.filter((e) => e.jobId === jobId);
  return { cost: mine.reduce((s, e) => s + e.dayRate, 0), shifts: mine.length };
}

export interface WorkerMonth {
  workerId: string; name: string; shifts: number; hours: number; target: number; lostHours: number;
  lostValue: number; offSite: number; manual: number; missedCheckOut: number; reliability: number;
}

/** Monthly audit per worker: lost hours vs a full day, off-site check-ins, office fixes, forgotten check-outs. */
export function monthlyAudit(entries: TimeEntry[], workers: Worker[], month: string, today: string): WorkerMonth[] {
  return workers.map((w) => {
    const mine = entries.filter((e) => e.workerId === w.id && e.date.startsWith(month));
    const closed = mine.filter((e) => e.clockOut);
    const missedCheckOut = mine.filter((e) => !e.clockOut && e.date < today).length;
    const hours = closed.reduce((s, e) => s + hoursOf(e), 0);
    const target = (closed.length + missedCheckOut) * SHIFT_HOURS;
    const lostHours = Math.max(0, target - hours);
    const offSite = mine.filter((e) => e.inOffSite || e.outOffSite).length;
    const manual = mine.filter((e) => e.manual).length;
    const counted = closed.length + missedCheckOut;
    const hourScore = target ? hours / target : 1;
    const penalty = counted ? (offSite * 10 + manual * 5 + missedCheckOut * 10) / counted : 0;
    const reliability = Math.max(0, Math.min(100, Math.round(hourScore * 100 - penalty)));
    return {
      workerId: w.id, name: w.name, shifts: mine.length, hours: Math.round(hours * 10) / 10, target,
      lostHours: Math.round(lostHours * 10) / 10, lostValue: Math.round((lostHours / SHIFT_HOURS) * w.dayRate),
      offSite, manual, missedCheckOut, reliability,
    };
  }).sort((a, b) => a.reliability - b.reliability);
}

/** 16:30 nudge for anyone still checked in. */
export function wrapUpReminders(entries: TimeEntry[], workers: Worker[], jobs: Job[], date: string, origin: string) {
  return entries.filter((e) => e.date === date && !e.clockOut).flatMap((e) => {
    const w = workers.find((x) => x.id === e.workerId);
    const j = jobs.find((x) => x.id === e.jobId);
    if (!w?.phone || !j) return [];
    return [{ workerId: w.id, name: w.name, phone: w.phone, jobId: j.id,
      message: `Renderfuel ${WRAP_UP_TIME}: heading home soon, ${w.name.split(" ")[0]}? Wrap up ${j.address} and check out so today's shift goes through for pay: ${origin}/site/${j.id}` }];
  });
}
