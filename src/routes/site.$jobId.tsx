import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AlertTriangle, Camera, Check, Clock, Hand, Lock, Minus, Plus, FileCheck2, LogIn, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { MobileFrame, MobileHeader, MobileTabs, type MobileTab } from "@/components/ops/chrome";
import { RunwayGauge } from "@/components/ops/RunwayGauge";
import { nowLabel, readPhoto, useOps } from "@/lib/ops/store";
import { todaysJobFor, coatingSafe, gbp, scaffoldLeft, TODAY, weatherFor } from "@/lib/ops/engine";
import { bagsUsed, closeOutShift, itemsForJob, runwayFor, scaffoldNeeded } from "@/lib/ops/costing";
import { currentStage, elevationDone, stageDef, verifyStage } from "@/lib/ops/stages";
import { cn } from "@/lib/utils";
import { clockIn, clockOut, dayKey, entriesOn, openEntry } from "@/lib/ops/time";

/** Best-effort location; never blocks the team if the phone says no. */
function getGps(): Promise<{ lat: number; lng: number; acc: number } | undefined> {
  return new Promise((res) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return res(undefined);
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }), () => res(undefined), { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
  });
}


const TABS: MobileTab[] = ["job", "photos", "crew", "stock"];

export const Route = createFileRoute("/site/$jobId")({
  validateSearch: (s: Record<string, unknown>): { tab?: MobileTab } =>
    TABS.includes(s["tab"] as MobileTab) ? { tab: s["tab"] as MobileTab } : {},
  head: () => ({
    meta: [
      { title: "Job Card · Renderfuel Ops" },
      { name: "description", content: "Mobile site lead job card: weather, scaffold countdown, stage-gate photos, crew and stock." },
      { property: "og:title", content: "Job Card · Renderfuel Ops" },
      { property: "og:description", content: "Everything the site lead needs on one card." },
    ],
  }),
  component: JobCard,
});

function JobCard() {
  const { jobId } = Route.useParams();
  const { tab = "job" } = Route.useSearch();
  const { data, tenant, catalog, mutateData, state } = useOps();
  const found = data.jobs.find((j) => j.id === jobId);
  // Workers can only open the one job they're on today — no updating the wrong site.
  const locked = state.role === "lead" && found && todaysJobFor(data, state.activeWorkerId ?? "")?.id !== found.id;
  const job = locked ? undefined : found;
  const [elName, setElName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<{ el: string; code: string } | null>(null);

  if (!job)
    return (
      <MobileFrame>
        <MobileHeader title={locked ? "Not your site today" : "Job not found"} region={tenant.homeRegion} />
        {locked && <p className="px-4 pb-4 text-[14px] font-bold text-ink/70">You can only update the job you're booked on today. Ask the office if you've been moved.</p>}
        <div className="px-4"><Link to="/site" className="h-14 rounded-full bg-white border border-line font-extrabold grid place-items-center">Back to my sites</Link></div>
      </MobileFrame>
    );

  const el = job.elevations.find((e) => e.name === elName) ?? job.elevations.find((e) => e.defect) ?? job.elevations[0]!;
  const cur = currentStage(el);
  const pendingVar = data.variations.find((v) => v.jobId === job.id && v.elevation === el.name && v.status === "pending");
  const left = scaffoldLeft(job);
  const pct = job.scaffold.hireDays ? Math.min(100, (job.scaffold.daysUsed / job.scaffold.hireDays) * 100) : 0;
  const crew = data.crews.find((c) => c.id === job.crewId);
  const runway = runwayFor(job, data, tenant, catalog);
  const hasScaffold = scaffoldNeeded(job);
  const stock = itemsForJob(catalog, job);
  const bags = job.usage ? bagsUsed(job, catalog) : job.bags;
  const wet = !coatingSafe(weatherFor(data, job.region, TODAY));
  const team = state.role === "lead";
  const me = (data.workers ?? []).find((w) => w.id === state.activeWorkerId);
  const entries = data.timeEntries ?? [];
  const today = dayKey(new Date().toISOString());
  const onToday = entriesOn(entries, job.id, today);
  const mine = me ? onToday.find((e) => e.workerId === me.id) : undefined;
  const checkedIn = !!mine && !mine.clockOut;
  const wrapped = job.closedOutOn === today;
  const gated = team && !mine;
  const name = (id: string) => (data.workers ?? []).find((w) => w.id === id)?.name ?? "Team member";
  const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const checkIn = async () => {
    if (!me) return;
    setBusy(true);
    const gps = await getGps();
    try {
      mutateData((d) => {
        d.timeEntries ??= [];
        const j = d.jobs.find((x) => x.id === job.id);
        clockIn(d.timeEntries, me, j, todaysJobFor(d, me.id)?.id, new Date().toISOString(), gps);
      });
      toast.success(`Morning ${me.name.split(" ")[0]} — you're on today's shift. Good to have you.`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't join the shift."); }
    finally { setBusy(false); }
  };

  const checkOut = async () => {
    if (!me) return;
    if (!wrapped) { toast.error("Wrap up today's job first — then everyone checks out."); return; }
    setBusy(true);
    const gps = await getGps();
    try {
      mutateData((d) => { const j = d.jobs.find((x) => x.id === job.id)!; clockOut(d.timeEntries ?? [], me.id, j, new Date().toISOString(), gps); });
      toast.success("Checked out — today's shift is in for pay. Cheers for today.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't check out."); }
    finally { setBusy(false); }
  };

  const wrapUp = () => {
    if (team && !checkedIn) { toast.error("Join today's shift first."); return; }
    const timed = onToday.length > 0;
    const men = timed ? onToday.length : job.menOnSite;
    if (men < 1) { toast.error("Set how many were on site today first."); return; }
    update((j) => { if (timed) j.menOnSite = men; closeOutShift(j, crew?.men ?? 3, { date: today, timed }); });
    toast.success(team ? "Job wrapped up for today — everyone can now check out." : `Shift logged — ${men} on site today.`);
  };

  const pick = (code: string) => {
    if (code.startsWith("S5") && job.batches.length === 0) {
      toast.error("Log the topcoat batch number in Stock before photographing the topcoat.");
      return;
    }
    target.current = { el: el.name, code };
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !target.current) return;
    setBusy(true);
    try {
      const photo = await readPhoto(f);
      const t = target.current;
      mutateData((d) => {
        const j = d.jobs.find((x) => x.id === job.id)!;
        const e2 = j.elevations.find((x) => x.name === t.el)!;
        verifyStage(e2, t.code, photo, new Date().toISOString());
      });
      const def = stageDef(t.code);
      toast.success(`${def.short} photo sent — the office will approve it before the next stage unlocks.`);
      if (wet && def.weatherSensitive) toast.warning("Coating hold is on today — check the coat isn't rain-damaged.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that photo.");
    } finally {
      setBusy(false);
    }
  };

  const update = (fn: (j: NonNullable<typeof job>) => void) => mutateData((d) => fn(d.jobs.find((x) => x.id === job.id)!));

  return (
    <MobileFrame>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      <MobileHeader title={job.address} region={job.region} />
      <div className="px-4 pb-48 space-y-4">
        {gated && (
          <>
            <section className="bg-white border border-line rounded-[18px] p-5 hard">
              <p className="text-[13px] font-extrabold uppercase tracking-widest">Good morning{me ? `, ${me.name.split(" ")[0]}` : ""}</p>
              <h2 className="mt-1 font-display text-[22px] leading-7">Join today's shift to open the job</h2>
              <p className="mt-2 text-[14px] font-semibold text-ink/75">Your check-in and check-out make up your shift sign-off for weekly pay — no check-in, no shift on the pay run.</p>
              <button onClick={checkIn} disabled={busy || !me} className="mt-4 w-full h-16 rounded-full bg-safety border border-line text-[17px] font-extrabold flex items-center justify-center gap-2 hard">
                <LogIn className="w-5 h-5" strokeWidth={2.5} /> {busy ? "Joining…" : "Join Today's Shift"}
              </button>
              {!me && <p className="mt-2 text-[13px] font-bold text-ink/70">Pick who you are on My Sites first.</p>}
            </section>
            {job.accessNotes?.trim() && (
              <section className="bg-ink text-white border border-line rounded-[18px] p-4 hard">
                <p className="text-[12px] font-extrabold uppercase tracking-widest text-safety flex items-center gap-2"><AlertTriangle className="w-4 h-4" strokeWidth={2.5} /> Site access & hazards</p>
                <p className="mt-2 text-[15px] font-semibold whitespace-pre-line leading-6">{job.accessNotes}</p>
              </section>
            )}
          </>
        )}
        {!gated && tab === "job" && (
          <>
            {job.accessNotes?.trim() && (
              <section className="bg-ink text-white border border-line rounded-[18px] p-4 hard">
                <p className="text-[12px] font-extrabold uppercase tracking-widest text-safety flex items-center gap-2"><AlertTriangle className="w-4 h-4" strokeWidth={2.5} /> Site access & hazards</p>
                <p className="mt-2 text-[15px] font-semibold whitespace-pre-line leading-6">{job.accessNotes}</p>
              </section>
            )}
            {hasScaffold && <section className="bg-white border border-line rounded-[18px] p-4 hard">
              <div className="flex justify-between items-baseline">
                <span className="text-[14px] font-extrabold uppercase">Scaffold hire</span>
                <span className="font-display text-[20px]">{job.scaffold.daysUsed}/{job.scaffold.hireDays} days</span>
              </div>
              <div className="mt-3 h-5 rounded-full border border-line bg-white overflow-hidden">
                <div className={cn("h-full", left <= 0 ? "bg-safety" : "bg-ink")} style={{ width: `${pct}%` }} />
              </div>
              <p className={cn("mt-2 text-[15px] font-semibold", left <= 0 && "text-safety font-extrabold")}>
                {team ? (left > 0 ? `${left} hire days left` : "Hire overrun — tell the office") : left > 0 ? <>{left} days until <b className="font-extrabold">{gbp(job.scaffold.weeklyFee)}/wk</b> fee</> : <>Overrun · {gbp(job.scaffold.weeklyFee)}/wk now charging</>}
              </p>
            </section>}

            <div className="bg-white border border-line rounded-full p-1.5 grid h-14" style={{ gridTemplateColumns: `repeat(${job.elevations.length}, 1fr)` }}>
              {job.elevations.map((e) => (
                <button key={e.name} onClick={() => setElName(e.name)} className={cn("rounded-full text-[15px] font-extrabold", e.name === el.name && "bg-ink text-white")}>
                  {e.name}
                </button>
              ))}
            </div>

            <section className="bg-white border border-line rounded-[18px] p-4 hard">
              <div className="flex justify-between items-baseline">
                <h2 className="font-display text-[20px]">{el.name} Elevation</h2>
                <span className="font-display text-[20px]">{el.area}m²</span>
              </div>
              {el.defect && (
                <div className="mt-3 bg-ink text-white rounded-[10px] px-4 h-14 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-safety shrink-0" strokeWidth={2.5} />
                  <span className="text-[15px] font-extrabold">{el.defect}</span>
                </div>
              )}
              {elevationDone(el) && <p className="mt-2 text-[14px] font-extrabold text-go">All six stages verified</p>}
            </section>

            {pendingVar && (
              <section className="bg-safety border border-line rounded-[18px] p-4 hard">
                <p className="text-[13px] font-extrabold uppercase tracking-widest">Sign variation</p>
                <h3 className="mt-1 font-display text-[22px] leading-7">{gbp(pendingVar.cost)} {pendingVar.headline}</h3>
                <Link to="/variations/$variationId" params={{ variationId: pendingVar.id }} className="mt-3 h-14 rounded-full bg-ink text-white text-[16px] font-extrabold flex items-center justify-center gap-2">
                  <Hand className="w-5 h-5" strokeWidth={2.5} /> Thumb to sign
                </Link>
              </section>
            )}

            <div className="grid grid-cols-2 gap-3">
              {el.stages.map((s) => {
                const d = stageDef(s.code);
                if (s.status === "verified")
                  return (
                    <div key={s.code} className="bg-white border border-line rounded-[18px] p-4 hard min-h-[124px] relative overflow-hidden">
                      {s.photo && <img src={s.photo} alt="" className="absolute right-2 top-2 w-12 h-12 rounded-[6px] border border-line object-cover" />}
                      {s.review === "pending" ? <Clock className="w-6 h-6" strokeWidth={3} /> : <Check className="w-6 h-6 text-go" strokeWidth={3.5} />}
                      <p className="mt-3 font-display text-[16px] leading-5">{d.short}</p>
                      {s.review === "pending" ? <p className="text-[13px] font-extrabold text-ink/70">Awaiting office approval</p> : <p className="text-[13px] font-extrabold text-go">Approved</p>}
                    </div>
                  );
                if (s.status === "upload")
                  return (
                    <button key={s.code} onClick={() => pick(s.code)} disabled={busy} className={cn("text-left border rounded-[18px] p-4 min-h-[124px]", s.review === "rejected" ? "bg-safety border-line col-span-2 hard" : "bg-white border-dashed border-line")}>
                      <Camera className="w-6 h-6" strokeWidth={2.5} />
                      <p className="mt-3 font-display text-[16px] leading-5">{d.short}</p>
                      <p className={cn("text-[13px] font-extrabold", s.review === "rejected" ? "text-ink uppercase" : "")}>{busy ? "Uploading…" : s.review === "rejected" ? "Recoat required" : "Tap to Upload"}</p>
                      {s.review === "rejected" && <p className="mt-1 text-[14px] font-semibold leading-5">Office note: {s.rejectNote ?? "Redo and re-photograph."}</p>}
                      {s.review === "rejected" && <p className="mt-2 text-[13px] font-extrabold underline">Snap a new photo once fixed</p>}
                    </button>
                  );
                return (
                  <div key={s.code} className="border border-ink/40 rounded-[18px] p-4 min-h-[124px] text-ink/55">
                    <Lock className="w-6 h-6" strokeWidth={2.5} />
                    <p className="mt-3 font-display text-[16px] leading-5">{d.short}</p>
                    <p className="text-[13px] font-extrabold">Locked</p>
                  </div>
                );
              })}
            </div>

            <section className="bg-white border border-line rounded-[18px] grid grid-cols-2">
              <div className="p-4 border-r-2 border-line"><p className="font-display text-[30px] leading-none">{job.menOnSite}</p><p className="mt-1 text-[14px] font-extrabold uppercase">Men on site</p></div>
              <div className="p-4"><p className="font-display text-[30px] leading-none">{bags}</p><p className="mt-1 text-[14px] font-extrabold uppercase">Bags applied</p></div>
            </section>

            <Link to="/variations/new/$jobId" params={{ jobId: job.id }} search={{ elevation: el.name }} className="w-full h-14 rounded-full bg-white border border-line text-[16px] font-extrabold flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" strokeWidth={2.5} /> Raise Variation
            </Link>
          </>
        )}

        {!gated && tab === "photos" && (
          <>
            {job.status === "complete" && (
              <Link to="/certificate/$jobId" params={{ jobId: job.id }} className="w-full h-16 rounded-full bg-go text-white border border-line text-[16px] font-extrabold flex items-center justify-center gap-2 hard">
                <FileCheck2 className="w-5 h-5" /> Warranty Certificate
              </Link>
            )}
            {job.elevations.map((e) => (
              <section key={e.name} className="bg-white border border-line rounded-[18px] p-4 hard">
                <div className="flex justify-between items-baseline"><h2 className="font-display text-[18px]">{e.name}</h2><span className="text-[13px] font-extrabold">{e.stages.filter((s) => s.status === "verified").length}/6 verified</span></div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {e.stages.map((s) => (
                    <div key={s.code} className="aspect-square rounded-[8px] border border-line overflow-hidden relative bg-stone">
                      {s.photo ? <img src={s.photo} alt={stageDef(s.code).name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-ink/40">{s.status === "locked" ? <Lock className="w-5 h-5" /> : <Camera className="w-5 h-5" />}</div>}
                      <span className="absolute left-1 bottom-1 bg-ink text-white rounded-full px-1.5 text-[10px] font-extrabold">{s.code}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {!gated && tab === "crew" && (
          <>
            <section className="bg-white border border-line rounded-[18px] p-4 hard">
              <p className="text-[13px] font-extrabold uppercase tracking-widest">Team</p>
              <h2 className="font-display text-[20px]">{crew?.name ?? "Not assigned"}</h2>
              <p className="mt-3 text-[13px] font-extrabold uppercase tracking-widest flex items-center gap-2"><Users className="w-4 h-4" /> On site today · {onToday.length}</p>
              <ul className="mt-2 divide-y divide-line">
                {onToday.length === 0 && <li className="py-3 text-[14px] font-bold text-ink/60">Nobody has joined today's shift yet.</li>}
                {onToday.map((e) => (
                  <li key={e.id} className="py-3 flex justify-between text-[15px] font-extrabold">
                    <span>{name(e.workerId)}{me?.id === e.workerId ? " (you)" : ""}</span>
                    <span className="text-ink/70">{hhmm(e.clockIn)}{e.clockOut ? ` – ${hhmm(e.clockOut)}` : " · on site"}</span>
                  </li>
                ))}
              </ul>
              {!team && onToday.length === 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[15px] font-extrabold">Men on site</span>
                  <Stepper value={job.menOnSite} onChange={(v) => update((j) => { j.menOnSite = Math.max(0, v); })} />
                </div>
              )}
            </section>
            {!team && (
              <section className="bg-white border border-line rounded-[18px] p-4 hard">
                <RunwayGauge r={runway} compact />
              </section>
            )}
            {wrapped ? (
              <p className="text-center text-[15px] font-extrabold text-go">Job wrapped up for today ✓</p>
            ) : (
              <button onClick={wrapUp} className="w-full h-16 rounded-full bg-safety border border-line text-[17px] font-extrabold hard">
                Wrap Up Today's Job
              </button>
            )}
            {team && checkedIn && (
              <button onClick={checkOut} disabled={busy} className={cn("w-full h-16 rounded-full border border-line text-[17px] font-extrabold flex items-center justify-center gap-2", wrapped ? "bg-ink text-white" : "bg-white text-ink/50")}>
                <LogOut className="w-5 h-5" strokeWidth={2.5} /> {busy ? "Checking out…" : "Check Out of My Shift"}
              </button>
            )}
            {team && mine?.clockOut && <p className="text-center text-[14px] font-extrabold">You checked out at {hhmm(mine.clockOut)} — shift sent for pay.</p>}
            <p className="text-[13px] font-bold text-ink/70 text-center">
              {team ? "Anyone on today's team can wrap up the job once the day's done. Then each of us checks out on our own phone — that's what puts the shift through for pay." : `Logs today's shift${hasScaffold ? " and one scaffold day" : ""} for ${job.address}.`}
            </p>
          </>
        )}

        {!gated && tab === "stock" && (
          <>
            <section className="bg-white border border-line rounded-[18px] p-4 hard">
              {team ? <p className="text-[13px] font-extrabold uppercase tracking-widest">Materials used today</p> : <><div className="flex justify-between items-baseline">
                <p className="text-[13px] font-extrabold uppercase tracking-widest">Materials used</p>
                <span className={cn("font-display text-[20px]", runway.materialSpend > runway.materialAllowance && "text-safety")}>{gbp(runway.materialSpend)}</span>
              </div>
              <p className="text-[13px] font-bold text-ink/70">
                {runway.materialSpend > runway.materialAllowance ? `${gbp(runway.materialSpend - runway.materialAllowance)} over the ${gbp(runway.materialAllowance)} allowance` : `${gbp(runway.materialAllowance - runway.materialSpend)} left of ${gbp(runway.materialAllowance)} allowance`}
              </p></>}
              <ul className="mt-2 divide-y divide-line">
                {stock.map((m) => {
                  const q = job.usage?.[m.id] ?? 0;
                  return (
                    <li key={m.id} className="py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0"><p className="text-[15px] font-extrabold leading-5">{m.name}</p><p className="text-[12px] font-bold text-ink/60">{team ? `per ${m.unit}` : `${gbp(m.price, 2)}/${m.unit} · ${m.supplier}${q > 0 ? ` · ${gbp(q * m.price, 2)}` : ""}`}</p></div>
                      <Stepper value={q} onChange={(v) => update((j) => { j.usage = { ...(j.usage ?? {}), [m.id]: Math.max(0, v) }; j.bags = bagsUsed(j, catalog); })} />
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="bg-white border border-line rounded-[18px] p-4 hard">
              <p className="text-[13px] font-extrabold uppercase tracking-widest">Topcoat batch log</p>
              <p className="text-[13px] font-bold text-ink/70">One-run finish: log every batch so the colour can be matched later.</p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const b = batch.trim(); if (!b) return; update((j) => { j.batches.push(b); }); setBatch(""); toast.success(`Batch ${b} logged`); }}>
                <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. SIL-2291-C" className="flex-1 min-w-0 h-12 px-4 rounded-full border border-line font-semibold outline-none" />
                <button className="h-12 px-5 rounded-full bg-safety border border-line font-extrabold">Log</button>
              </form>
              <ul className="mt-3 space-y-2">
                {job.batches.length === 0 && <li className="text-[14px] font-bold text-ink/60">No batches logged yet.</li>}
                {job.batches.map((b, i) => <li key={i} className="h-12 px-4 rounded-[10px] border border-line flex items-center font-extrabold">{b}</li>)}
              </ul>
            </section>
          </>
        )}
      </div>

      {!gated && tab === "job" && (
        <div className="fixed bottom-[88px] inset-x-0 z-20 pointer-events-none">
          <div className="mx-auto max-w-[430px] px-4 pointer-events-auto">
            {cur ? (
              <button onClick={() => pick(cur.code)} disabled={busy} className="w-full h-16 rounded-full bg-ink text-white border border-line text-[17px] font-extrabold flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" strokeWidth={3} /> {busy ? "Uploading…" : "Add Elevation Photo"}
              </button>
            ) : job.status === "complete" ? (
              <Link to="/certificate/$jobId" params={{ jobId: job.id }} className="w-full h-16 rounded-full bg-go text-white border border-line text-[17px] font-extrabold flex items-center justify-center gap-2">
                <FileCheck2 className="w-5 h-5" /> View Warranty Certificate
              </Link>
            ) : null}
          </div>
        </div>
      )}
      <MobileTabs jobId={job.id} tab={tab} />
    </MobileFrame>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button aria-label="Decrease" onClick={() => onChange(value - 1)} className="w-12 h-12 rounded-full border border-line grid place-items-center"><Minus className="w-5 h-5" strokeWidth={3} /></button>
      <span className="font-display text-[20px] w-10 text-center">{value}</span>
      <button aria-label="Increase" onClick={() => onChange(value + 1)} className="w-12 h-12 rounded-full bg-ink text-white border border-line grid place-items-center"><Plus className="w-5 h-5" strokeWidth={3} /></button>
    </div>
  );
}
