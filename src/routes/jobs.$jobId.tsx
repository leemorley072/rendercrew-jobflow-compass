import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Lock, Camera } from "lucide-react";
import { toast } from "sonner";
import { Card, DesktopShell, SectionTitle } from "@/components/ops/chrome";
import { RunwayGauge } from "@/components/ops/RunwayGauge";
import { useOps } from "@/lib/ops/store";
import { gbp, jobArea, scaffoldLeft } from "@/lib/ops/engine";
import { itemsForJob, runwayFor, scaffoldNeeded } from "@/lib/ops/costing";
import { stageDef } from "@/lib/ops/stages";
import { stageLabel } from "@/lib/ops/labels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job Detail · Renderfuel Ops" },
      { name: "description", content: "Stage gates, labour profitability runway, scaffold and variations for one rendering job." },
      { property: "og:title", content: "Job Detail · Renderfuel Ops" },
      { property: "og:description", content: "Everything about one rendering job." },
    ],
  }),
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const { data, tenant, catalog, mutateData } = useOps();
  const job = data.jobs.find((j) => j.id === jobId);
  if (!job)
    return <DesktopShell title="Job not found" subtitle="It may belong to another account"><Link to="/" className="underline font-extrabold">Back to dashboard</Link></DesktopShell>;
  const crew = data.crews.find((c) => c.id === job.crewId);
  const r = runwayFor(job, data, tenant, catalog);
  const items = itemsForJob(catalog, job);
  const vars = data.variations.filter((v) => v.jobId === job.id);
  const left = scaffoldLeft(job);

  return (
    <DesktopShell title={`${job.ref} • ${job.address}`} subtitle={`${jobArea(job)}m² ${job.product} • ${job.region} ${job.postcode} • ${job.customer}`}>
      <div className="grid lg:grid-cols-[1fr_380px] gap-5 items-start">
        <div className="space-y-5">
          <SectionTitle meta={stageLabel(job)}>Stage gates</SectionTitle>
          {job.elevations.map((e) => (
            <Card key={e.name} className="p-4">
              <div className="flex justify-between items-baseline"><h2 className="font-display text-[20px]">{e.name} Elevation</h2><span className="font-display text-[20px]">{e.area}m²</span></div>
              {e.defect && <p className="mt-1 text-[13px] font-extrabold text-safety">{e.defect}</p>}
              <div className="mt-3 grid grid-cols-6 gap-2">
                {e.stages.map((s) => (
                  <div key={s.code} className={cn("rounded-[10px] border p-2 min-h-[110px] flex flex-col", s.status === "locked" ? "border-ink/30 text-ink/50" : s.status === "upload" ? "border-dashed border-line" : "border-line")}>
                    {s.photo ? <img src={s.photo} alt="" className="w-full h-12 object-cover rounded-[6px] border border-line" /> : <div className="h-12 grid place-items-center">{s.status === "locked" ? <Lock className="w-5 h-5" /> : <Camera className="w-5 h-5" />}</div>}
                    <p className="mt-1 text-[11px] font-extrabold">{s.code} · {stageDef(s.code).short}</p>
                    <p className={cn("text-[11px] font-extrabold mt-auto", s.status === "verified" && "text-go", s.review === "rejected" && "text-safety")}>
                      {s.status === "verified" ? (<span className="inline-flex items-center gap-1"><Check className="w-3 h-3" strokeWidth={4} />Verified</span>) : s.review === "rejected" ? "Recoat" : s.status === "upload" ? "Awaiting photo" : "Locked"}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <aside className="space-y-5">
          <Card className="p-4"><RunwayGauge r={r} /></Card>
          <Card className="p-4">
            <div className="flex justify-between items-baseline"><span className="text-[13px] font-extrabold uppercase tracking-widest">Materials</span><span className={cn("font-display text-[20px]", r.materialSpend > r.materialAllowance && "text-safety")}>{gbp(r.materialSpend)} / {gbp(r.materialAllowance)}</span></div>
            <p className="mt-1 text-[13px] font-bold text-ink/60">Logged on site vs quoted allowance · {r.materialSpend > r.materialAllowance ? `${gbp(r.materialSpend - r.materialAllowance)} over` : `${gbp(r.materialAllowance - r.materialSpend)} left`}</p>
            <ul className="mt-3 space-y-1">
              {items.filter((m) => (job.usage?.[m.id] ?? 0) > 0).map((m) => (
                <li key={m.id} className="flex justify-between text-[13px] font-bold"><span>{job.usage?.[m.id]} × {m.name} <span className="text-ink/50">@ {gbp(m.price, 2)} {m.supplier}</span></span><span>{gbp((job.usage?.[m.id] ?? 0) * m.price, 2)}</span></li>
              ))}
              {!items.some((m) => (job.usage?.[m.id] ?? 0) > 0) && <li className="text-[13px] font-bold text-ink/60">Nothing logged yet — the site lead logs bags, tubs, mesh and beads in Stock.</li>}
            </ul>
          </Card>
          <Card className="p-4">
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] font-extrabold uppercase tracking-widest">Scaffold hire</span>
              {scaffoldNeeded(job) && <span className="font-display text-[20px]">{job.scaffold.daysUsed}/{job.scaffold.hireDays} days</span>}
            </div>
            {scaffoldNeeded(job) ? (
              <p className={cn("mt-2 text-[14px] font-bold", left <= 2 && "text-safety font-extrabold")}>
                {job.status === "complete" ? "Struck" : left > 0 ? `${left} days until ${gbp(job.scaffold.weeklyFee)}/wk fee` : `Overrun — ${gbp(job.scaffold.weeklyFee)}/wk charging`}
              </p>
            ) : <p className="mt-2 text-[14px] font-bold text-ink/60">No scaffold on this job — no hire costs or countdown.</p>}
            <label className="mt-3 flex items-center gap-2 text-[14px] font-extrabold">
              <input type="checkbox" className="w-5 h-5 accent-[var(--color-ink)]" checked={!scaffoldNeeded(job)} onChange={(e) => mutateData((d) => { const j = d.jobs.find((x) => x.id === job.id)!; const none = e.target.checked; j.scaffold.required = !none; if (none) j.scaffoldCost = 0; else { if (!j.scaffold.hireDays) j.scaffold.hireDays = 21; if (!j.scaffoldCost) j.scaffoldCost = Math.round(jobArea(j) * 8); } })} />
              No scaffold needed
            </label>
          </Card>
          <Card className="p-4">
            <p className="text-[13px] font-extrabold uppercase tracking-widest">Variations</p>
            {vars.length === 0 && <p className="mt-2 text-[14px] font-bold text-ink/60">None raised.</p>}
            {vars.map((v) => (
              <Link key={v.id} to="/variations/$variationId" params={{ variationId: v.id }} className="mt-2 flex justify-between items-center h-12 px-3 rounded-[10px] border border-line">
                <span className="text-[14px] font-extrabold">{v.number} · {v.headline}</span>
                <span className={cn("text-[12px] font-extrabold rounded-full px-2 py-0.5 border border-line", v.status === "signed" ? "bg-go text-white" : "bg-safety")}>{v.status === "signed" ? "Signed" : "Pending"} {gbp(v.cost)}</span>
              </Link>
            ))}
          </Card>
          <Card className="p-4 space-y-3">
            <p className="text-[13px] font-extrabold uppercase tracking-widest">Crew</p>
            <select className="w-full h-12 px-3 rounded-[10px] border border-line font-extrabold bg-white" value={job.crewId ?? ""}
              onChange={(e) => mutateData((d) => { const j = d.jobs.find((x) => x.id === job.id)!; if (e.target.value) j.crewId = e.target.value; else delete j.crewId; })}>
              <option value="">Unassigned</option>
              {data.crews.map((c) => <option key={c.id} value={c.id}>{c.name} · {gbp(c.dayRate)}/day</option>)}
            </select>
            <Link to="/site/$jobId" params={{ jobId: job.id }} search={{}} className="w-full h-14 rounded-full bg-white border border-line font-extrabold grid place-items-center">Open Site Job Card</Link>
            {job.status === "complete" ? (
              <>
                <Link to="/certificate/$jobId" params={{ jobId: job.id }} className="w-full h-14 rounded-full bg-go text-white border border-line font-extrabold grid place-items-center">Warranty Certificate</Link>
                {!job.reviewRequested && (
                  <button onClick={() => { mutateData((d) => { d.jobs.find((x) => x.id === job.id)!.reviewRequested = true; }); toast.success(`Review request queued for ${job.customer}`); }}
                    className="w-full h-14 rounded-full bg-white border border-line font-extrabold">Send 5-Star Review Request</button>
                )}
              </>
            ) : (
              <p className="text-[13px] font-bold text-ink/60">The warranty certificate unlocks when every stage photo is verified.</p>
            )}
          </Card>
        </aside>
      </div>
    </DesktopShell>
  );
}
