import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CloudRain, Umbrella } from "lucide-react";
import { toast } from "sonner";
import { Card, DesktopShell } from "@/components/ops/chrome";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOps } from "@/lib/ops/store";
import {
  coatingSafe, DAY_LABELS, jobArea, planSchedule, rankCrews, TODAY, weatherFor, type Cell,
} from "@/lib/ops/engine";
import type { Region } from "@/lib/ops/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dispatch")({
  validateSearch: (s: Record<string, unknown>): { job?: string } => (typeof s["job"] === "string" ? { job: s["job"] } : {}),
  head: () => ({
    meta: [
      { title: "Crew Dispatch & Fleet Timeline · Renderfuel Ops" },
      { name: "description", content: "Gantt schedule across rendering gangs with proximity matching and the automatic rain-pivot engine." },
      { property: "og:title", content: "Crew Dispatch · Renderfuel Ops" },
      { property: "og:description", content: "Schedule gangs, match won jobs and re-route crews when rain hits." },
    ],
  }),
  component: Dispatch,
});

type SysFilter = "All" | "Silicone" | "EWI" | "Monocouche";

function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn("h-11 px-4 rounded-full border border-line text-[14px] font-extrabold", active ? "bg-ink text-white" : "bg-white")}>
      {children}
    </button>
  );
}

function Dispatch() {
  const { data, tenant, mutateData } = useOps();
  const search = Route.useSearch();
  const intake = data.jobs.filter((j) => j.status === "intake");
  const pending = intake.find((j) => j.id === search.job) ?? intake[0];
  const [sys, setSys] = useState<SysFilter>("All");
  const [region, setRegion] = useState<Region | null>(null);
  const [span, setSpan] = useState<7 | 14>(7);
  const [crewPick, setCrewPick] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const { cells, decisions } = useMemo(() => planSchedule(data, TODAY, span), [data, span]);
  const ranks = useMemo(() => (pending ? rankCrews(data, pending) : []), [data, pending]);
  const choice = ranks.find((r) => r.crew.id === crewPick) ?? ranks[0];
  const liveCrew = data.crews.find((c) => c.id === (selected ?? choice?.crew.id ?? data.crews[0]?.id));
  const days = Array.from({ length: span }, (_, i) => i);
  const rainOn = data.rainOverrides.includes(4) && data.rainOverrides.includes(5);

  const matches = (jobId?: string) => {
    if (!jobId) return true;
    const j = data.jobs.find((x) => x.id === jobId);
    if (!j) return true;
    if (region && j.region !== region) return false;
    if (sys === "Silicone") return j.system === "silicone" && !j.product.includes("EWI");
    if (sys === "EWI") return j.product.includes("EWI");
    if (sys === "Monocouche") return j.system === "monocouche";
    return true;
  };

  const confirm = () => {
    if (!pending || !choice) return;
    if (choice.start === undefined) {
      toast.error(`${choice.crew.name} has no free run of ${choice.len} days in the next fortnight.`);
      return;
    }
    const start = choice.start;
    mutateData((d) => {
      const j = d.jobs.find((x) => x.id === pending.id)!;
      j.status = "active";
      j.crewId = choice.crew.id;
      j.menOnSite = choice.crew.men;
      d.bookings.push({
        id: `b${Date.now()}`, crewId: choice.crew.id, start, len: choice.len, kind: "new",
        label: `NEW · ${pending.address.replace(/^The /, "")} Start`, jobId: pending.id, stageCode: pending.system === "silicone" ? "S1" : "M1",
      });
    });
    setCrewPick(null);
    setSelected(choice.crew.id);
    toast.success(`${choice.crew.name} dispatched to ${pending.address} from ${DAY_LABELS[start]}`);
  };

  const toggleRainDay = (day: number) =>
    mutateData((d) => {
      d.rainOverrides = d.rainOverrides.includes(day) ? d.rainOverrides.filter((x) => x !== day) : [...d.rainOverrides, day];
    });
  const toggleRainEvent = () =>
    mutateData((d) => {
      d.rainOverrides = rainOn ? d.rainOverrides.filter((x) => x !== 4 && x !== 5) : Array.from(new Set([...d.rainOverrides, 4, 5]));
    });

  const liveToday = liveCrew ? cells.find((c) => c.crewId === liveCrew.id && TODAY >= c.start && TODAY < c.start + c.len) : undefined;
  const liveJob = liveToday?.jobId ? data.jobs.find((j) => j.id === liveToday.jobId) : undefined;
  const liveWeather = weatherFor(data, liveJob?.region ?? tenant.homeRegion, TODAY);
  const onSite = liveToday && (liveToday.kind === "work" || liveToday.kind === "new" || liveToday.kind === "pivot");
  const pack = liveCrew
    ? `Renderfuel dispatch — ${liveCrew.name}\nTomorrow (${DAY_LABELS[TODAY + 1]}):\n` +
      cells.filter((c) => c.crewId === liveCrew.id && TODAY + 1 >= c.start && TODAY + 1 < c.start + c.len).map((c) => {
        const j = c.jobId ? data.jobs.find((x) => x.id === c.jobId) : undefined;
        return `• ${c.label}${j ? ` — ${j.address}, ${j.postcode}` : ""}`;
      }).join("\n") + `\nWeather: ${weatherFor(data, liveJob?.region ?? tenant.homeRegion, TODAY + 1).rain}% rain. On site 07:30.`
    : "";

  return (
    <DesktopShell
      title="Renderfuel Ops • Crew Dispatch & Fleet Timeline"
      subtitle={`${data.crews.length} Active Gangs • ${data.jobs.filter((j) => j.status === "active").length} Live Sites • Auto-Match Engine Active`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-widest mr-2">System</span>
        {(["All", "Silicone", "EWI", "Monocouche"] as SysFilter[]).map((s) => <Chip key={s} active={sys === s} onClick={() => setSys(s)}>{s}</Chip>)}
        <span className="w-0.5 h-8 bg-ink/30 mx-3" />
        <span className="text-[11px] font-extrabold uppercase tracking-widest mr-2">Region</span>
        {(["Leeds", "Harrogate", "York"] as Region[]).map((r) => <Chip key={r} active={region === r} onClick={() => setRegion(region === r ? null : r)}>{r}</Chip>)}
        <div className="ml-auto flex gap-2">
          <button onClick={toggleRainEvent} className={cn("h-11 px-4 rounded-full border border-line text-[14px] font-extrabold inline-flex items-center gap-2", rainOn ? "bg-safety" : "bg-white")}>
            <Umbrella className="w-4 h-4" strokeWidth={2.5} /> {rainOn ? "Rain event on · Fri–Sat" : "Simulate Rain Event"}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-11 px-4 rounded-full bg-white border border-line text-[14px] font-extrabold">{span}-Day Gantt ▾</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border border-line rounded-[12px]">
              <DropdownMenuItem className="font-extrabold" onSelect={() => setSpan(7)}>7-Day Gantt</DropdownMenuItem>
              <DropdownMenuItem className="font-extrabold" onSelect={() => setSpan(14)}>14-Day Gantt</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {pending && choice ? (
        <Card className="mt-4 flex flex-wrap items-center gap-6 pr-5 overflow-hidden">
          <div className="w-3 self-stretch bg-safety border-r-2 border-line" />
          <div className="py-5 min-w-[300px] flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/60">Pending job · {pending.source === "ghl" ? "GHL" : "Manual"}{intake.length > 1 && ` · 1 of ${intake.length}`}</p>
            <h2 className="mt-1 font-display text-[20px]">{pending.address}</h2>
            <p className="text-[14px] font-extrabold">{jobArea(pending)}m² {pending.system === "silicone" ? "Silicone" : "Monocouche"} • {pending.region} ({pending.postcode.split(" ")[0]})</p>
          </div>
          <span className="w-0.5 h-16 bg-ink" />
          <div className="font-display text-[40px]">{choice.score}%</div>
          <div className="min-w-[280px] flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/60">{choice === ranks[0] ? "Top ranked match" : "Your pick"}</p>
            <DropdownMenu>
              <DropdownMenuTrigger className="font-extrabold text-[16px] text-left">{choice.crew.name.replace(" · ", " — ")}'s Team ▾</DropdownMenuTrigger>
              <DropdownMenuContent className="border border-line rounded-[12px] w-80">
                {ranks.map((r) => (
                  <DropdownMenuItem key={r.crew.id} onSelect={() => setCrewPick(r.crew.id)} className="font-bold flex justify-between">
                    <span>{r.crew.name}</span><span>{r.score}% · {r.minutes} min{r.start === undefined ? " · full" : ""}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="text-[13px] font-bold text-ink/60">{choice.crew.men} Plasterers • {choice.crew.certs} • {choice.minutes}-min drive{choice.start !== undefined ? ` • from ${DAY_LABELS[choice.start]}` : " • no free slot"}</p>
          </div>
          <button onClick={confirm} className="h-16 px-6 rounded-full bg-safety border border-line text-[17px] font-extrabold hard">
            Confirm & Dispatch {choice.crew.name.split(" · ")[0]} →
          </button>
        </Card>
      ) : (
        <Card className="mt-4 p-5 flex items-center justify-between">
          <p className="text-[15px] font-extrabold">{data.crews.length === 0 ? "Add crews in the agency admin before scheduling jobs." : "No jobs waiting to schedule. New won jobs from GoHighLevel appear here."}</p>
          <Link to="/ghl" className="h-11 px-4 rounded-full bg-white border border-line text-[14px] font-extrabold grid place-items-center">Test GHL intake</Link>
        </Card>
      )}

      <Card className="mt-4 overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="grid border-b-2 border-line" style={{ gridTemplateColumns: `230px repeat(${span}, 1fr)` }}>
            <div className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-widest">Fleet · Week 23</div>
            {days.map((d) => {
              const w = weatherFor(data, region ?? tenant.homeRegion, d);
              const wet = !coatingSafe(w);
              return (
                <button key={d} disabled={d < TODAY} onClick={() => toggleRainDay(d)} title={d < TODAY ? "Past day" : "Tap to simulate rain on this day"}
                  className={cn("px-2 py-2 border-l-2 border-ink/15 text-left", d === TODAY && "bg-stone/60", d < TODAY && "cursor-default")}>
                  <div className="text-[13px] font-extrabold uppercase tracking-wide">{DAY_LABELS[d]}</div>
                  <div className={cn("text-[11px] font-extrabold inline-flex items-center gap-1", wet ? "text-safety" : "text-ink/50")}>
                    {wet && <CloudRain className="w-3 h-3" strokeWidth={3} />}{w.rain}% · {w.temp}°
                  </div>
                </button>
              );
            })}
          </div>
          {data.crews.map((c) => {
            const row = cells.filter((x) => x.crewId === c.id && x.start < span);
            const highlight = pending && choice?.crew.id === c.id;
            return (
              <div key={c.id} onClick={() => setSelected(c.id)}
                className={cn("grid border-b-2 border-ink/15 last:border-b-0 min-h-[70px] items-center cursor-pointer", highlight && "bg-safety/10", selected === c.id && "outline outline-2 -outline-offset-2 outline-ink")}
                style={{ gridTemplateColumns: `230px repeat(${span}, 1fr)` }}>
                <div className="px-4 py-2" style={{ gridColumn: 1, gridRow: 1 }}>
                  <div className="font-display text-[15px]">{c.name}</div>
                  <div className="text-[12px] font-bold text-ink/60">{c.men} Men • {c.specialty}</div>
                </div>
                {row.map((cell) => <GanttCell key={cell.key} cell={cell} span={span} dim={!matches(cell.jobId)} />)}
              </div>
            );
          })}
          {data.crews.length === 0 && <p className="p-6 font-bold">No crews yet.</p>}
        </div>
      </Card>

      {decisions.length > 0 && (
        <Card className="mt-4 p-4 shadow-none">
          <p className="text-[13px] font-extrabold uppercase tracking-widest">06:00 Rain-Pivot Scan · {decisions.length} change{decisions.length > 1 ? "s" : ""}</p>
          <ul className="mt-2 space-y-1.5">
            {decisions.map((x, i) => {
              const crew = data.crews.find((c) => c.id === x.crewId);
              return (
                <li key={i} className="text-[14px] font-bold">
                  <span className="font-extrabold">{DAY_LABELS[x.day]} · {crew?.name}:</span> paused “{x.fromLabel}” ({x.reason})
                  {x.toLabel ? <> → routed to <span className="text-go font-extrabold">{x.toLabel}</span>, {x.minutes}-min drive</> : <> → held</>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {liveCrew && (
        <div className="mt-4 bg-ink text-white rounded-[18px] px-6 py-4 flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-safety text-ink grid place-items-center font-display text-[15px]">{liveCrew.lead.slice(0, 2).toUpperCase()}</div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/60">{liveCrew.lead}'s Gang · Live</p>
              <p className="text-[15px] font-extrabold flex items-center gap-2"><span className={cn("w-2.5 h-2.5 rounded-full", onSite ? "bg-go" : "bg-safety")} />{onSite ? "On Site · 07:42" : liveToday?.kind === "hold" ? "Rain Hold" : "Off Site"}</p>
            </div>
          </div>
          <div><p className="text-[11px] font-extrabold uppercase tracking-widest text-white/60">Target Today</p><p className="font-display text-[20px]">{onSite ? liveCrew.men * 14 : 0}m²</p></div>
          <div><p className="text-[11px] font-extrabold uppercase tracking-widest text-white/60">Weather</p><p className="text-[15px] font-extrabold">{coatingSafe(liveWeather) ? "Safe" : "Hold"} · {liveWeather.temp}°C {liveWeather.rain > 30 ? "Showers" : "Overcast"}</p></div>
          <a href={`https://wa.me/?text=${encodeURIComponent(pack)}`} target="_blank" rel="noreferrer"
            className="ml-auto h-12 px-6 rounded-full bg-white text-ink text-[15px] font-extrabold grid place-items-center">
            Send 4:30 PM WhatsApp Dispatch Pack
          </a>
        </div>
      )}
    </DesktopShell>
  );
}

function GanttCell({ cell, span, dim }: { cell: Cell; span: number; dim: boolean }) {
  const end = Math.min(cell.start + cell.len, span);
  const style = { gridColumn: `${cell.start + 2} / ${end + 2}`, gridRow: 1 };
  const base = "mx-1 h-11 rounded-[8px] border px-3 flex items-center text-[13px] font-extrabold truncate";
  const kinds: Record<Cell["kind"], string> = {
    work: "bg-ink text-white border-line",
    new: "bg-safety text-ink border-line hard",
    hold: "bg-white hatch border-line text-ink",
    gap: "bg-white/40 border-dashed border-line text-ink/70",
    depot: "bg-stone border-line text-ink",
    open: "border-dashed border-go text-go",
    pivot: "bg-go text-white border-line",
  };
  const inner = <div className={cn(base, kinds[cell.kind], dim && "opacity-30")} title={cell.label}>{cell.label}</div>;
  if (cell.jobId && cell.kind !== "open")
    return <Link to="/jobs/$jobId" params={{ jobId: cell.jobId }} style={style} onClick={(e) => e.stopPropagation()}>{inner}</Link>;
  return <div style={style}>{inner}</div>;
}
