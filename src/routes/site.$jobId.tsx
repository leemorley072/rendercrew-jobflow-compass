import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AlertTriangle, Camera, Check, Hand, Lock, Minus, Plus, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { MobileFrame, MobileHeader, MobileTabs, type MobileTab } from "@/components/ops/chrome";
import { RunwayGauge } from "@/components/ops/RunwayGauge";
import { nowLabel, readPhoto, useOps } from "@/lib/ops/store";
import { coatingSafe, gbp, jobComplete, labourRunway, scaffoldLeft, TODAY, weatherFor } from "@/lib/ops/engine";
import { currentStage, elevationDone, stageDef, verifyStage } from "@/lib/ops/stages";
import { cn } from "@/lib/utils";

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
  const { data, tenant, mutateData } = useOps();
  const job = data.jobs.find((j) => j.id === jobId);
  const [elName, setElName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<{ el: string; code: string } | null>(null);

  if (!job)
    return (
      <MobileFrame>
        <MobileHeader title="Job not found" region={tenant.homeRegion} />
        <div className="px-4"><Link to="/site" className="h-14 rounded-full bg-white border-2 border-ink font-extrabold grid place-items-center">Back to my sites</Link></div>
      </MobileFrame>
    );

  const el = job.elevations.find((e) => e.name === elName) ?? job.elevations.find((e) => e.defect) ?? job.elevations[0]!;
  const cur = currentStage(el);
  const pendingVar = data.variations.find((v) => v.jobId === job.id && v.elevation === el.name && v.status === "pending");
  const left = scaffoldLeft(job);
  const pct = Math.min(100, (job.scaffold.daysUsed / job.scaffold.hireDays) * 100);
  const crew = data.crews.find((c) => c.id === job.crewId);
  const runway = labourRunway(job, data.variations, tenant.gpFloor, crew?.dayRate ?? tenant.defaultDayRate);
  const wet = !coatingSafe(weatherFor(data, job.region, TODAY));

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
      let doneJob = false;
      mutateData((d) => {
        const j = d.jobs.find((x) => x.id === job.id)!;
        const e2 = j.elevations.find((x) => x.name === t.el)!;
        verifyStage(e2, t.code, photo, new Date().toISOString());
        if (jobComplete(j)) {
          j.status = "complete";
          j.completedAt = new Date().toISOString().slice(0, 10);
          j.menOnSite = 0;
          doneJob = true;
        }
      });
      const def = stageDef(t.code);
      const nextIdx = el.stages.findIndex((s) => s.code === t.code) + 1;
      const next = el.stages[nextIdx];
      if (doneJob) toast.success("Job complete — warranty certificate ready.");
      else toast.success(`${def.short} verified${next ? ` — ${stageDef(next.code).short} unlocked` : ` — ${t.el} elevation done`}`);
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
        {tab === "job" && (
          <>
            <section className="bg-white border-2 border-ink rounded-[18px] p-4 hard">
              <div className="flex justify-between items-baseline">
                <span className="text-[14px] font-extrabold uppercase">Scaffold hire</span>
                <span className="font-display text-[20px]">{job.scaffold.daysUsed}/{job.scaffold.hireDays} days</span>
              </div>
              <div className="mt-3 h-5 rounded-full border-2 border-ink bg-white overflow-hidden">
                <div className={cn("h-full", left <= 0 ? "bg-safety" : "bg-ink")} style={{ width: `${pct}%` }} />
              </div>
              <p className={cn("mt-2 text-[15px] font-semibold", left <= 0 && "text-safety font-extrabold")}>
                {left > 0 ? <>{left} days until <b className="font-extrabold">{gbp(job.scaffold.weeklyFee)}/wk</b> fee</> : <>Overrun · {gbp(job.scaffold.weeklyFee)}/wk now charging</>}
              </p>
            </section>

            <div className="bg-white border-2 border-ink rounded-full p-1.5 grid h-14" style={{ gridTemplateColumns: `repeat(${job.elevations.length}, 1fr)` }}>
              {job.elevations.map((e) => (
                <button key={e.name} onClick={() => setElName(e.name)} className={cn("rounded-full text-[15px] font-extrabold", e.name === el.name && "bg-ink text-white")}>
                  {e.name}
                </button>
              ))}
            </div>

            <section className="bg-white border-2 border-ink rounded-[18px] p-4 hard">
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
              <section className="bg-safety border-2 border-ink rounded-[18px] p-4 hard">
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
                    <div key={s.code} className="bg-white border-2 border-ink rounded-[18px] p-4 hard min-h-[124px] relative overflow-hidden">
                      {s.photo && <img src={s.photo} alt="" className="absolute right-2 top-2 w-12 h-12 rounded-[6px] border-2 border-ink object-cover" />}
                      <Check className="w-6 h-6 text-go" strokeWidth={3.5} />
                      <p className="mt-3 font-display text-[16px] leading-5">{d.short}</p>
                      <p className="text-[13px] font-extrabold text-go">Verified</p>
                    </div>
                  );
                if (s.status === "upload")
                  return (
                    <button key={s.code} onClick={() => pick(s.code)} disabled={busy} className="text-left bg-white border-2 border-dashed border-ink rounded-[18px] p-4 min-h-[124px]">
                      <Camera className="w-6 h-6" strokeWidth={2.5} />
                      <p className="mt-3 font-display text-[16px] leading-5">{d.short}</p>
                      <p className={cn("text-[13px] font-extrabold", s.review === "rejected" ? "text-safety" : "")}>{busy ? "Uploading…" : s.review === "rejected" ? "Recoat · re-upload" : "Tap to Upload"}</p>
                    </button>
                  );
                return (
                  <div key={s.code} className="border-2 border-ink/40 rounded-[18px] p-4 min-h-[124px] text-ink/55">
                    <Lock className="w-6 h-6" strokeWidth={2.5} />
                    <p className="mt-3 font-display text-[16px] leading-5">{d.short}</p>
                    <p className="text-[13px] font-extrabold">Locked</p>
                  </div>
                );
              })}
            </div>

            <section className="bg-white border-2 border-ink rounded-[18px] grid grid-cols-2">
              <div className="p-4 border-r-2 border-ink"><p className="font-display text-[30px] leading-none">{job.menOnSite}</p><p className="mt-1 text-[14px] font-extrabold uppercase">Men on site</p></div>
              <div className="p-4"><p className="font-display text-[30px] leading-none">{job.bags}</p><p className="mt-1 text-[14px] font-extrabold uppercase">Bags applied</p></div>
            </section>

            <Link to="/variations/new/$jobId" params={{ jobId: job.id }} search={{ elevation: el.name }} className="w-full h-14 rounded-full bg-white border-2 border-ink text-[16px] font-extrabold flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" strokeWidth={2.5} /> Raise Variation
            </Link>
          </>
        )}

        {tab === "photos" && (
          <>
            {job.status === "complete" && (
              <Link to="/certificate/$jobId" params={{ jobId: job.id }} className="w-full h-16 rounded-full bg-go text-white border-2 border-ink text-[16px] font-extrabold flex items-center justify-center gap-2 hard">
                <FileCheck2 className="w-5 h-5" /> Warranty Certificate
              </Link>
            )}
            {job.elevations.map((e) => (
              <section key={e.name} className="bg-white border-2 border-ink rounded-[18px] p-4 hard">
                <div className="flex justify-between items-baseline"><h2 className="font-display text-[18px]">{e.name}</h2><span className="text-[13px] font-extrabold">{e.stages.filter((s) => s.status === "verified").length}/6 verified</span></div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {e.stages.map((s) => (
                    <div key={s.code} className="aspect-square rounded-[8px] border-2 border-ink overflow-hidden relative bg-stone">
                      {s.photo ? <img src={s.photo} alt={stageDef(s.code).name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-ink/40">{s.status === "locked" ? <Lock className="w-5 h-5" /> : <Camera className="w-5 h-5" />}</div>}
                      <span className="absolute left-1 bottom-1 bg-ink text-white rounded-full px-1.5 text-[10px] font-extrabold">{s.code}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {tab === "crew" && (
          <>
            <section className="bg-white border-2 border-ink rounded-[18px] p-4 hard">
              <p className="text-[13px] font-extrabold uppercase tracking-widest">Gang</p>
              <h2 className="font-display text-[20px]">{crew?.name ?? "Not assigned"}</h2>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[15px] font-extrabold">Men on site</span>
                <Stepper value={job.menOnSite} onChange={(v) => update((j) => { j.menOnSite = Math.max(0, v); })} />
              </div>
            </section>
            <section className="bg-white border-2 border-ink rounded-[18px] p-4 hard">
              <RunwayGauge r={runway} compact />
            </section>
            <button
              onClick={() => { update((j) => { j.daysWorked += 1; j.scaffold.daysUsed += 1; }); toast.success(`Day logged — ${(runway.remaining - 1).toFixed(1)} crew-days left on budget`); }}
              className="w-full h-16 rounded-full bg-safety border-2 border-ink text-[17px] font-extrabold hard">
              Close Out Today's Shift
            </button>
            <p className="text-[13px] font-bold text-ink/70 text-center">Logs one crew-day and one scaffold day for {job.address}.</p>
          </>
        )}

        {tab === "stock" && (
          <>
            <section className="bg-white border-2 border-ink rounded-[18px] p-4 hard">
              <div className="flex items-center justify-between">
                <div><p className="font-display text-[30px] leading-none">{job.bags}</p><p className="text-[14px] font-extrabold uppercase">Bags applied</p></div>
                <Stepper value={job.bags} onChange={(v) => update((j) => { j.bags = Math.max(0, v); })} />
              </div>
            </section>
            <section className="bg-white border-2 border-ink rounded-[18px] p-4 hard">
              <p className="text-[13px] font-extrabold uppercase tracking-widest">Topcoat batch log</p>
              <p className="text-[13px] font-bold text-ink/70">One-run finish: log every batch so the colour can be matched later.</p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const b = batch.trim(); if (!b) return; update((j) => { j.batches.push(b); }); setBatch(""); toast.success(`Batch ${b} logged`); }}>
                <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. SIL-2291-C" className="flex-1 min-w-0 h-12 px-4 rounded-full border-2 border-ink font-semibold outline-none" />
                <button className="h-12 px-5 rounded-full bg-safety border-2 border-ink font-extrabold">Log</button>
              </form>
              <ul className="mt-3 space-y-2">
                {job.batches.length === 0 && <li className="text-[14px] font-bold text-ink/60">No batches logged yet.</li>}
                {job.batches.map((b, i) => <li key={i} className="h-12 px-4 rounded-[10px] border-2 border-ink flex items-center font-extrabold">{b}</li>)}
              </ul>
            </section>
          </>
        )}
      </div>

      {tab === "job" && (
        <div className="fixed bottom-[88px] inset-x-0 z-20 pointer-events-none">
          <div className="mx-auto max-w-[430px] px-4 pointer-events-auto">
            {cur ? (
              <button onClick={() => pick(cur.code)} disabled={busy} className="w-full h-16 rounded-full bg-ink text-white border-2 border-ink text-[17px] font-extrabold flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" strokeWidth={3} /> {busy ? "Uploading…" : "Add Elevation Photo"}
              </button>
            ) : job.status === "complete" ? (
              <Link to="/certificate/$jobId" params={{ jobId: job.id }} className="w-full h-16 rounded-full bg-go text-white border-2 border-ink text-[17px] font-extrabold flex items-center justify-center gap-2">
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
      <button aria-label="Decrease" onClick={() => onChange(value - 1)} className="w-12 h-12 rounded-full border-2 border-ink grid place-items-center"><Minus className="w-5 h-5" strokeWidth={3} /></button>
      <span className="font-display text-[20px] w-10 text-center">{value}</span>
      <button aria-label="Increase" onClick={() => onChange(value + 1)} className="w-12 h-12 rounded-full bg-ink text-white border-2 border-ink grid place-items-center"><Plus className="w-5 h-5" strokeWidth={3} /></button>
    </div>
  );
}
