import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { DesktopShell } from "@/components/ops/chrome";
import { fieldCls, labelCls } from "@/components/ops/NewJobDialog";
import { nowLabel, useOps } from "@/lib/ops/store";
import { gbp } from "@/lib/ops/engine";
import { dayKey, hoursOf, monthlyAudit, siteDistance, WRAP_UP_TIME, wrapUpReminders } from "@/lib/ops/time";
import type { TimeEntry } from "@/lib/ops/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/timesheets")({
  head: () => ({
    meta: [
      { title: "Timesheets & Audit · Renderfuel Ops" },
      { name: "description", content: "Every worker's timestamped check-in and check-out with location checks, plus a monthly lost-hours and reliability audit." },
      { property: "og:title", content: "Timesheets & Audit · Renderfuel Ops" },
      { property: "og:description", content: "See who's on site, where hours are lost and who is consistently short." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Timesheets,
});

const hhmm = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) : "—");
const dist = (m?: number) => (m == null ? "No location" : m < 1000 ? `${m}m` : `${(m / 1609).toFixed(1)} mi`);

function Gps({ m, off, g }: { m?: number | undefined; off?: boolean | undefined; g?: { lat: number; lng: number } | undefined }) {
  const txt = <span className={cn("inline-flex items-center gap-1 font-extrabold", off ? "text-safety" : m == null ? "text-ink/50" : "text-go")}><MapPin className="w-3.5 h-3.5" />{off ? `${dist(m)} away` : m == null ? "No location" : `On site (${dist(m)})`}</span>;
  return g ? <a href={`https://maps.google.com/?q=${g.lat},${g.lng}`} target="_blank" rel="noreferrer">{txt}</a> : txt;
}

function Timesheets() {
  const { data, tenant, mutateData } = useOps();
  const workers = data.workers ?? [];
  const entries = data.timeEntries ?? [];
  const [today, setToday] = useState("2026-11-25");
  const [origin, setOrigin] = useState("");
  useEffect(() => { setToday(dayKey(new Date().toISOString())); setOrigin(window.location.origin); }, []);
  const [month, setMonth] = useState(today.slice(0, 7));
  useEffect(() => setMonth(today.slice(0, 7)), [today]);
  const [day, setDay] = useState(today);
  useEffect(() => setDay(today), [today]);
  const [form, setForm] = useState({ workerId: "", jobId: "", date: "", in: "07:30", out: "16:00" });

  const job = (id: string) => data.jobs.find((j) => j.id === id);
  const name = (id: string) => workers.find((w) => w.id === id)?.name ?? "Former worker";
  const dayRows = entries.filter((e) => e.date === day).sort((a, b) => a.clockIn.localeCompare(b.clockIn));
  const audit = monthlyAudit(entries, workers, month, today);
  const lostTotal = audit.reduce((s, a) => s + a.lostValue, 0);
  const lostHours = audit.reduce((s, a) => s + a.lostHours, 0);
  const months = [...new Set([today.slice(0, 7), ...entries.map((e) => e.date.slice(0, 7))])].sort().reverse();
  const wrap = wrapUpReminders(entries, workers, data.jobs, today, origin);

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    const w = workers.find((x) => x.id === form.workerId);
    const j = job(form.jobId);
    const date = form.date || today;
    if (!w || !j) { toast.error("Pick a worker and a job."); return; }
    if (form.out <= form.in) { toast.error("Check-out must be after check-in."); return; }
    mutateData((d) => {
      d.timeEntries ??= [];
      const existing = d.timeEntries.find((x) => x.workerId === w.id && x.date === date && x.jobId === j.id);
      const fields: Partial<TimeEntry> = { clockIn: `${date}T${form.in}:00Z`, clockOut: `${date}T${form.out}:00Z`, manual: true };
      if (existing) Object.assign(existing, fields);
      else d.timeEntries.push({ id: `te-m-${w.id}-${Date.now()}`, workerId: w.id, jobId: j.id, date, dayRate: w.dayRate, clockIn: fields.clockIn!, clockOut: fields.clockOut!, manual: true });
    });
    toast.success(`Shift saved for ${w.name} — marked "Added by office".`);
  };

  const sendWrap = () => {
    if (!wrap.length) { toast("Everyone has checked out."); return; }
    mutateData((d) => { d.reminderLog = [...wrap.map((r) => ({ id: `r${Date.now().toString(36)}${r.workerId}`, at: nowLabel(), workerId: r.workerId, phone: r.phone, message: r.message, status: "queued" as const })), ...(d.reminderLog ?? [])].slice(0, 50); });
    toast.success(`${wrap.length} wrap-up reminder${wrap.length > 1 ? "s" : ""} queued`);
  };

  return (
    <DesktopShell title="Timesheets & Audit" subtitle={`${tenant.name} · location checks are office-only and never shown to the team`}>
      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <section className="bg-white border border-line rounded-[18px] p-5 hard">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-display text-[20px]">Daily check-ins</h2>
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={cn(fieldCls, "w-auto")} aria-label="Day" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead><tr className="text-left text-[12px] uppercase tracking-widest text-ink/60"><th className="py-2">Worker</th><th>Job</th><th>In</th><th>In location</th><th>Out</th><th>Out location</th><th className="text-right">Hours</th><th className="text-right">Cost</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {dayRows.length === 0 && <tr><td colSpan={8} className="py-4 font-bold text-ink/60">No check-ins on this day.</td></tr>}
                  {dayRows.map((e) => {
                    const j = job(e.jobId);
                    const outLoc = e.outGps && j ? siteDistance(j, e.outGps) : undefined;
                    return (
                      <tr key={e.id} className="font-bold">
                        <td className="py-3 font-extrabold">{name(e.workerId)}{e.manual && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full border border-line">Added by office</span>}</td>
                        <td>{j?.address ?? "—"}</td>
                        <td>{hhmm(e.clockIn)}</td>
                        <td><Gps m={e.inMetres} off={e.inOffSite} g={e.inGps} /></td>
                        <td>{e.clockOut ? hhmm(e.clockOut) : <span className="text-safety font-extrabold">Still on</span>}</td>
                        <td>{e.clockOut ? <Gps m={e.outMetres ?? outLoc?.metres} off={e.outOffSite} g={e.outGps} /> : "—"}</td>
                        <td className="text-right">{e.clockOut ? hoursOf(e).toFixed(1) : "—"}</td>
                        <td className="text-right">{gbp(e.dayRate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white border border-line rounded-[18px] p-5 hard">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-display text-[20px]">Monthly audit</h2>
                <p className="text-[13px] font-bold text-ink/60">{lostHours.toFixed(1)} hours lost · {gbp(lostTotal)} paid for time not on site</p>
              </div>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className={cn(fieldCls, "w-auto")} aria-label="Month">
                {months.map((m) => <option key={m} value={m}>{new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</option>)}
              </select>
            </div>
            <table className="w-full text-[14px]">
              <thead><tr className="text-left text-[12px] uppercase tracking-widest text-ink/60"><th className="py-2">Worker</th><th className="text-right">Shifts</th><th className="text-right">Hours / target</th><th className="text-right">Lost hrs</th><th className="text-right">Lost £</th><th className="text-right">Off-site</th><th className="text-right">No check-out</th><th className="text-right">Office fixes</th><th className="text-right">Reliability</th></tr></thead>
              <tbody className="divide-y divide-line">
                {audit.map((a) => (
                  <tr key={a.workerId} className="font-bold">
                    <td className="py-3 font-extrabold">{a.name}</td>
                    <td className="text-right">{a.shifts}</td>
                    <td className="text-right">{a.hours} / {a.target}</td>
                    <td className="text-right">{a.lostHours}</td>
                    <td className={cn("text-right", a.lostValue > 300 && "text-safety font-extrabold")}>{gbp(a.lostValue)}</td>
                    <td className={cn("text-right", a.offSite > 0 && "text-safety font-extrabold")}>{a.offSite}</td>
                    <td className={cn("text-right", a.missedCheckOut > 0 && "text-safety font-extrabold")}>{a.missedCheckOut}</td>
                    <td className="text-right">{a.manual}</td>
                    <td className="text-right">
                      <span className={cn("inline-block min-w-14 text-center px-2 py-0.5 rounded-full border border-line font-extrabold", a.shifts === 0 ? "text-ink/40" : a.reliability >= 95 ? "bg-go text-white" : a.reliability >= 85 ? "bg-white" : "bg-safety")}>
                        {a.shifts === 0 ? "—" : `${a.reliability}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[12px] font-bold text-ink/60">Target is 8 hours per shift. Reliability drops for short days, off-site check-ins, forgotten check-outs and shifts the office had to add.</p>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white border border-line rounded-[18px] p-5 hard">
            <h2 className="font-display text-[20px]">{WRAP_UP_TIME} wrap-up reminder</h2>
            <p className="mt-1 text-[13px] font-bold text-ink/60">Texts anyone still checked in today.</p>
            <ul className="mt-3 space-y-2 text-[13px] font-bold">
              {wrap.length === 0 && <li className="text-ink/60">Nobody still checked in.</li>}
              {wrap.map((r) => <li key={r.workerId} className="p-3 rounded-[10px] border border-line">{r.name}: {r.message}</li>)}
            </ul>
            <button onClick={sendWrap} className="mt-3 w-full h-12 rounded-full bg-safety border border-line font-extrabold flex items-center justify-center gap-2"><MessageSquare className="w-4 h-4" /> Send now</button>
          </section>

          <form onSubmit={addManual} className="bg-white border border-line rounded-[18px] p-5 hard space-y-3">
            <h2 className="font-display text-[20px]">Add or fix a shift</h2>
            <p className="text-[13px] font-bold text-ink/60">For a flat battery or broken phone. Every office fix is marked and counts in the monthly audit.</p>
            <label className={labelCls}>Worker<select className={fieldCls} value={form.workerId} onChange={(e) => setForm({ ...form, workerId: e.target.value })}><option value="">Choose…</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            <label className={labelCls}>Job<select className={fieldCls} value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })}><option value="">Choose…</option>{data.jobs.map((j) => <option key={j.id} value={j.id}>{j.address}</option>)}</select></label>
            <label className={labelCls}>Date<input type="date" className={fieldCls} value={form.date || today} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelCls}>In<input type="time" className={fieldCls} value={form.in} onChange={(e) => setForm({ ...form, in: e.target.value })} /></label>
              <label className={labelCls}>Out<input type="time" className={fieldCls} value={form.out} onChange={(e) => setForm({ ...form, out: e.target.value })} /></label>
            </div>
            <button className="w-full h-12 rounded-full bg-ink text-white border border-line font-extrabold">Save shift</button>
          </form>
        </div>
      </div>
    </DesktopShell>
  );
}
