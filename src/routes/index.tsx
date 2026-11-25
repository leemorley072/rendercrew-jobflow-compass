import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CloudRain, X } from "lucide-react";
import { toast } from "sonner";
import { Card, DesktopShell, SectionTitle } from "@/components/ops/chrome";
import { useOps } from "@/lib/ops/store";
import {
  coatingSafe, gbp, jobArea, labourRunway, scaffoldLeft, scaffoldTone, TODAY, weatherFor, DAY_LABELS,
} from "@/lib/ops/engine";
import { rejectStage, stageDef } from "@/lib/ops/stages";
import { SECTOR, stageLabel } from "@/lib/ops/labels";
import type { Job, Region } from "@/lib/ops/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Dashboard · Renderfuel Ops" },
      { name: "description", content: "Live view of every rendering site: scaffold countdowns, weather alerts, variations and won jobs from GoHighLevel." },
      { property: "og:title", content: "Command Dashboard · Renderfuel Ops" },
      { property: "og:description", content: "Live view of every rendering site, crew and alert." },
    ],
  }),
  component: Dashboard,
});

function ScaffoldBadge({ job }: { job: Job }) {
  const tone = scaffoldTone(job);
  if (tone === "struck")
    return <div className="w-[92px] h-14 rounded-[8px] border-2 border-ink/30 grid place-items-center font-display text-[15px] text-ink/70">Struck</div>;
  const left = scaffoldLeft(job);
  const strikeDay = DAY_LABELS[(TODAY + Math.max(0, left)) % 7]?.split(" ")[0];
  return (
    <div className={cn("w-[92px] h-14 rounded-[8px] border-2 border-ink grid place-items-center leading-none py-1", tone === "red" && "bg-safety hard-sm", tone === "green" && "bg-go text-white", tone === "amber" && "bg-white")}>
      <span className="font-display text-[20px]">{Math.max(0, left)}d</span>
      <span className="text-[10px] font-extrabold uppercase">{tone === "red" ? `Strike ${strikeDay}` : tone}</span>
    </div>
  );
}

function Dashboard() {
  const { data, tenant, mutateData } = useOps();
  const navigate = useNavigate();
  const active = data.jobs.filter((j) => j.status === "active");
  const fleet = data.jobs.filter((j) => j.status !== "intake");
  const intake = data.jobs.filter((j) => j.status === "intake").reverse();
  const imminent = active.filter((j) => scaffoldLeft(j) <= 7);
  const pendingVars = data.variations.filter((v) => v.status === "pending");
  const regions: Region[] = ["Leeds", "Harrogate", "York"];
  const wet = regions.filter((r) => !coatingSafe(weatherFor(data, r, TODAY)));
  const wetJobs = active.filter((j) => wet.includes(j.region));
  const crewCount = data.crews.reduce((s, c) => s + c.men, 0);
  const stopped = wetJobs.length > 0 && wetJobs.every((j) => j.topcoatStopped);

  const feed = data.jobs
    .flatMap((j) => j.elevations.flatMap((e) => e.stages.filter((s) => s.photo && (s.review === "pending" || s.review === "rejected")).map((s) => ({ j, e, s }))))
    .sort((a, b) => (b.s.uploadedAt ?? "").localeCompare(a.s.uploadedAt ?? ""));

  const stopTopcoat = () => {
    mutateData((d) => d.jobs.forEach((j) => { if (wetJobs.some((w) => w.id === j.id)) j.topcoatStopped = true; }));
    toast.success(`Stop-topcoat sent to crews on ${wetJobs.map((j) => j.ref.replace("RF-", "#")).join(" & ")}`);
  };

  return (
    <DesktopShell
      title="Renderfuel Ops • Contractor Command Dashboard"
      subtitle={`${active.length} Active Sites • ${crewCount} Plasterers Deployed • ${imminent.length} Scaffolding Alerts`}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Active Sites" value={String(active.length)} sub={`${active.reduce((s, j) => s + jobArea(j), 0)}m² total`} />
        <Kpi label="Imminent Scaffold Overruns" value={String(imminent.length)} sub={`${gbp(imminent.reduce((s, j) => s + j.scaffold.weeklyFee, 0))}/wk at risk`} alert={imminent.length > 0} />
        <Kpi label="Rain Delay Window" value={String(wet.length)} sub={wet.length ? wet.map((r) => SECTOR[r]).join(", ") : "All sectors dry"} />
        <Kpi label="Pending Client Variations" value={gbp(pendingVars.reduce((s, v) => s + v.cost, 0))} sub={pendingVars.length ? "Awaiting signature" : "Nothing waiting"} />
      </div>

      {wet.map((r) => {
        const w = weatherFor(data, r, TODAY);
        const js = wetJobs.filter((j) => j.region === r);
        return (
          <div key={r} className="mt-4 bg-ink text-white rounded-[18px] px-6 py-4 flex items-center gap-4">
            <CloudRain className="w-5 h-5 text-safety shrink-0" strokeWidth={2.5} />
            <p className="text-[15px] font-extrabold flex-1">
              <span className="text-safety">{SECTOR[r]}:</span> {w.note ?? `${w.rain}% rain, ${w.temp}°C`}
              {js.length > 0 && <> — Stop topcoat application on Site {js.map((j) => j.ref.replace("RF-", "#")).join(" & ")}</>}
            </p>
            {js.length > 0 && (stopped ? (
              <span className="text-[12px] font-extrabold uppercase bg-go rounded-full px-3 py-1.5">Crews told · Topcoat stopped</span>
            ) : (
              <button onClick={stopTopcoat} className="h-9 px-3 rounded-full bg-white text-ink border-2 border-safety text-[12px] font-extrabold uppercase">Stop Topcoat</button>
            ))}
          </div>
        );
      })}

      <div className="mt-8 grid lg:grid-cols-[1fr_364px] gap-5 items-start">
        <div>
          <SectionTitle meta={`${fleet.length} shown`}>Active Sites Fleet</SectionTitle>
          <Card className="overflow-hidden">
            {fleet.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-display text-[20px]">No sites yet</p>
                <p className="mt-2 text-[14px] font-bold text-ink/70">Won jobs from GoHighLevel land here once you schedule a crew.</p>
                <Link to="/ghl" className="inline-flex mt-5 h-12 px-5 items-center rounded-full bg-white border-2 border-ink font-extrabold">Test the GHL intake</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b-2 border-ink text-left text-[11px] font-extrabold uppercase tracking-widest text-ink/70">
                      <th className="px-4 py-3">Job</th><th className="py-3">Spec / Stage</th><th className="py-3">Scaffold</th><th className="py-3">Status</th><th className="py-3 pr-4">Crew</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleet.map((j) => {
                      const crew = data.crews.find((c) => c.id === j.crewId);
                      const r = labourRunway(j, data.variations, tenant.gpFloor, crew?.dayRate ?? tenant.defaultDayRate);
                      const pv = pendingVars.filter((v) => v.jobId === j.id);
                      const red = j.status === "active" && (scaffoldTone(j) === "red" || r.over);
                      const rain = j.status === "active" && wet.includes(j.region);
                      return (
                        <tr key={j.id} onClick={() => navigate({ to: "/jobs/$jobId", params: { jobId: j.id } })}
                          className={cn("border-b-2 border-ink last:border-b-0 cursor-pointer hover:bg-stone/40", red && "bg-safety/10")}>
                          <td className="px-4 py-3"><div className="font-display text-[15px]">{j.ref}</div><div className="text-[13px] font-semibold text-ink/70">{j.address}</div></td>
                          <td className="py-3 pr-3"><div className="text-[14px] font-extrabold">{jobArea(j)}m² {j.product}</div><div className="text-[13px] font-semibold text-ink/70">{stageLabel(j)}</div></td>
                          <td className="py-3"><ScaffoldBadge job={j} /></td>
                          <td className="py-3 pr-3 text-[13px] font-extrabold">
                            {j.status === "complete" ? (
                              <>
                                {j.warrantyExported ? (
                                  <span className="inline-flex items-center gap-1.5 bg-go text-white border-2 border-ink rounded-full px-2.5 py-0.5 text-[11px] uppercase"><span className="w-1.5 h-1.5 bg-white rounded-full" />Warranty Exported</span>
                                ) : (
                                  <Link to="/certificate/$jobId" params={{ jobId: j.id }} onClick={(e) => e.stopPropagation()} className="underline">Export warranty</Link>
                                )}
                                <div className="mt-1 text-[12px] font-semibold text-ink/70">{j.reviewRequested ? "5-Star Review Request Sent" : "Review request not sent"}</div>
                              </>
                            ) : rain ? (
                              <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-ink" />Rain Halted</span>
                            ) : pv.length > 0 ? (
                              <span>{gbp(pv.reduce((s, v) => s + v.cost, 0))} Pending Signature</span>
                            ) : red ? (
                              <><div>Red Alert</div><div className="text-[13px] font-semibold text-ink/70">Margin {Math.round(r.margin * 100)}%</div></>
                            ) : (
                              <><div>On Track</div><div className="text-[13px] font-semibold text-ink/70">Margin {Math.round(r.margin * 100)}%</div></>
                            )}
                          </td>
                          <td className="py-3 pr-4 font-display text-[15px]">{j.status === "complete" ? "—" : crew?.men ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <aside>
          <SectionTitle meta={intake.length ? `${intake.length} new` : <Link to="/ghl" className="underline">Test webhook</Link>}>Inbound from GHL</SectionTitle>
          {intake.length === 0 ? (
            <Card className="p-5"><p className="text-[14px] font-bold">No new won jobs. They appear here the moment a deal is marked won in GoHighLevel.</p></Card>
          ) : (
            <div className="space-y-4">
              {intake.slice(0, 2).map((j) => (
                <Card key={j.id} className="p-4">
                  <span className="inline-flex items-center gap-1.5 bg-go text-white border-2 border-ink rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase"><span className="w-1.5 h-1.5 bg-white rounded-full" />Won</span>
                  <h3 className="mt-2 font-display text-[20px]">{j.address}</h3>
                  <div className="flex justify-between items-baseline"><span className="text-[14px] font-extrabold">{jobArea(j)}m²</span><span className="font-display text-[20px]">{gbp(j.quoted)}</span></div>
                  <Link to="/dispatch" search={{ job: j.id }} className="mt-4 w-full h-16 rounded-full bg-safety border-2 border-ink text-[17px] font-extrabold flex items-center justify-center hard">Schedule & Assign Crew</Link>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-6"><SectionTitle meta="Live">Stage-Gate Feed</SectionTitle></div>
          {feed.length === 0 ? (
            <Card className="p-5"><p className="text-[14px] font-bold">All stage photos reviewed. New uploads from site appear here.</p></Card>
          ) : (
            <div className="space-y-3">
              {feed.slice(0, 5).map(({ j, e, s }) => (
                <Card key={`${j.id}${e.name}${s.code}`} className="p-3 flex gap-3 items-center shadow-none">
                  <img src={s.photo} alt={`${j.ref} ${e.name} ${stageDef(s.code).short}`} className="w-20 h-20 object-cover rounded-[8px] border-2 border-ink" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold truncate">{j.ref} · {e.name} {stageDef(s.code).short}</p>
                    {s.review === "rejected" ? (
                      <span className="mt-2 inline-block bg-safety border-2 border-ink rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase">Rejected · Recoat</span>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => mutateData((d) => { const st = d.jobs.find((x) => x.id === j.id)!.elevations.find((x) => x.name === e.name)!.stages.find((x) => x.code === s.code)!; st.review = "approved"; })}
                          className="flex-1 h-11 rounded-full bg-go text-white border-2 border-ink text-[14px] font-extrabold">Approve</button>
                        <button aria-label="Reject photo" onClick={() => { mutateData((d) => rejectStage(d.jobs.find((x) => x.id === j.id)!.elevations.find((x) => x.name === e.name)!, s.code)); toast(`${j.ref} ${e.name} sent back for recoat`); }}
                          className="w-11 h-11 rounded-full bg-white border-2 border-ink grid place-items-center"><X className="w-4 h-4" strokeWidth={3} /></button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </aside>
      </div>
    </DesktopShell>
  );
}

function Kpi({ label, value, sub, alert }: { label: string; value: string; sub: string; alert?: boolean }) {
  return (
    <Card className={cn("p-4", alert && "bg-safety")}>
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/70">{label}</p>
      <p className="mt-2 font-display text-[30px] leading-none">{value}</p>
      <p className="mt-2 text-[13px] font-extrabold">{sub}</p>
    </Card>
  );
}
