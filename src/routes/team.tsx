import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Car, MessageSquare, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { DesktopShell } from "@/components/ops/chrome";
import { fieldCls, labelCls } from "@/components/ops/NewJobDialog";
import { useOps, nowLabel } from "@/lib/ops/store";
import { gbp, middayReminders } from "@/lib/ops/engine";
import { syncCrew } from "@/lib/ops/costing";
import { SYSTEMS, SYSTEM_LABEL } from "@/lib/ops/stages";
import { crewOfWorker, REMINDER_TIME } from "@/lib/ops/team";
import type { SystemKind, Worker } from "@/lib/ops/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team & Workers · Renderfuel Ops" },
      { name: "description", content: "Add workers with day rates, contact details and trades, then pair them into teams with a van driver." },
      { property: "og:title", content: "Team & Workers · Renderfuel Ops" },
      { property: "og:description", content: "Worker roster, team builder and midday site reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

const Card = ({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) => (
  <section className="bg-white border border-line rounded-[18px] p-5 hard">
    <div className="flex items-baseline justify-between mb-4"><h2 className="font-display text-[20px]">{title}</h2>{meta && <span className="text-[13px] font-extrabold text-ink/60">{meta}</span>}</div>
    {children}
  </section>
);

const SHORT: Record<SystemKind, string> = { silicone: "Silicone", monocouche: "Mono", ewi: "EWI", cork: "Cork", plaster: "Plaster", roof: "Roof", floor: "Floor", wallcoat: "Wall Coat" };
const blank = { name: "", phone: "", email: "", postcode: "", rate: "180", skills: [] as SystemKind[], ownTransport: false };

function TeamPage() {
  const { data, tenant, mutateData } = useOps();
  const workers = data.workers ?? [];
  const [f, setF] = useState(blank);
  const [pick, setPick] = useState<string[]>([]);
  const [teamName, setTeamName] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const reminders = middayReminders(data, origin);

  const addWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.phone.trim() || f.skills.length === 0) {
      toast.error("Add a name, mobile number and at least one trade.");
      return;
    }
    const w: Worker = {
      id: `w${Date.now().toString(36)}`, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), postcode: f.postcode.trim().toUpperCase(),
      dayRate: Number(f.rate) || 0, skills: f.skills, ownTransport: f.ownTransport, base: { x: Math.random() * 10, y: 15 + Math.random() * 10 },
    };
    mutateData((d) => { (d.workers ??= []).push(w); });
    setF(blank);
    toast.success(`${w.name} added — pair them into a team or send them solo.`);
  };

  const editWorker = (id: string, fn: (w: Worker) => void) =>
    mutateData((d) => {
      const w = d.workers?.find((x) => x.id === id);
      if (!w) return;
      fn(w);
      d.crews.forEach((c) => c.memberIds?.includes(id) && syncCrew(c, d.workers!));
    });

  const removeWorker = (w: Worker) => {
    if (!confirm(`Remove ${w.name}? They'll come off any team.`)) return;
    mutateData((d) => {
      d.workers = (d.workers ?? []).filter((x) => x.id !== w.id);
      d.crews.forEach((c) => {
        if (!c.memberIds?.includes(w.id)) return;
        c.memberIds = c.memberIds.filter((x) => x !== w.id);
        if (c.memberIds.length) syncCrew(c, d.workers ?? []);
      });
      const empty = d.crews.filter((c) => c.memberIds && c.memberIds.length === 0).map((c) => c.id);
      d.crews = d.crews.filter((c) => !empty.includes(c.id));
      d.bookings = d.bookings.filter((b) => !empty.includes(b.crewId));
    });
  };

  const createTeam = () => {
    if (pick.length === 0) { toast.error("Tick at least one worker."); return; }
    const taken = pick.map((id) => crewOfWorker(data, id)).filter(Boolean);
    if (taken.length) { toast.error("Some of those workers are already in a team — take them off it first."); return; }
    mutateData((d) => {
      const first = d.workers!.find((w) => w.id === pick[0])!;
      const n = d.crews.length + 1;
      const crew = {
        id: `g${Date.now().toString(36)}`, name: teamName.trim() || (pick.length === 1 ? `Solo · ${first.name.split(" ")[0]}` : `Gang ${n} · ${first.name.split(" ")[0]}`),
        lead: "", men: 1, skills: [], specialty: "", certs: "", dayRate: 0, base: first.base, phone: "", memberIds: pick, driverId: pick[0]!,
      };
      syncCrew(crew, d.workers!);
      crew.specialty = crew.skills.map((s) => SYSTEM_LABEL[s as SystemKind] ?? s).join(", ");
      d.crews.push(crew);
    });
    setPick([]);
    setTeamName("");
    toast.success("Team created — it now shows on the dispatch schedule.");
  };

  const sendNow = () => {
    if (reminders.length === 0) { toast("Nobody is booked on a site today, so no reminders to send."); return; }
    mutateData((d) => {
      d.reminderLog = [...reminders.map((r) => ({ id: `r${Date.now().toString(36)}${r.workerId}`, at: nowLabel(), workerId: r.workerId, phone: r.phone, message: r.message, status: "queued" as const })), ...(d.reminderLog ?? [])].slice(0, 50);
    });
    toast.success(`${reminders.length} reminder${reminders.length > 1 ? "s" : ""} queued. Texts go out once SMS sending is connected.`);
  };

  return (
    <DesktopShell title="Team & Workers" subtitle={`${tenant.name} · ${workers.length} workers · ${data.crews.length} teams`}>
      <div className="grid lg:grid-cols-[1fr_380px] [&>*]:min-w-0 gap-6 items-start">
        <div className="space-y-6">
          <Card title="Workers" meta="Tick workers to pair them into a team">
            {workers.length === 0 && <p className="text-[14px] font-bold text-ink/60">No workers yet. Add your first below — name, mobile, day rate and the trades they can do.</p>}
            <div className="divide-y divide-line/30 overflow-x-auto">
              {workers.map((w) => {
                const team = crewOfWorker(data, w.id);
                return (
                  <div key={w.id} className="py-3 min-w-[560px] grid grid-cols-[28px_1.4fr_1fr_90px_auto_40px] gap-3 items-center">
                    <input type="checkbox" aria-label={`Select ${w.name}`} className="w-5 h-5" checked={pick.includes(w.id)} disabled={!!team} onChange={(e) => setPick(e.target.checked ? [...pick, w.id] : pick.filter((x) => x !== w.id))} />
                    <div className="min-w-0">
                      <p className="text-[15px] font-extrabold truncate">{w.name}</p>
                      <p className="text-[12px] font-bold text-ink/60 truncate">{w.phone} · {w.email || "no email"} · {w.postcode}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {SYSTEMS.map((k) => (
                        <button key={k} onClick={() => editWorker(w.id, (x) => { x.skills = x.skills.includes(k) ? x.skills.filter((s) => s !== k) : [...x.skills, k]; })}
                          className={cn("text-[11px] font-extrabold rounded-full px-2 py-0.5 border border-line", w.skills.includes(k) ? "bg-ink text-white" : "text-ink/40")}>
                          {SHORT[k]}
                        </button>
                      ))}
                    </div>
                    <label className="text-[11px] font-extrabold uppercase">£/day<input aria-label={`Day rate for ${w.name}`} className={fieldCls + " h-10"} inputMode="numeric" value={w.dayRate} onChange={(e) => editWorker(w.id, (x) => { x.dayRate = Number(e.target.value) || 0; })} /></label>
                    <div className="text-right">
                      <button onClick={() => editWorker(w.id, (x) => { x.ownTransport = !x.ownTransport; })} className={cn("h-8 px-3 rounded-full border border-line text-[12px] font-extrabold inline-flex items-center gap-1", w.ownTransport ? "bg-go text-white" : "bg-white")}>
                        <Car className="w-3.5 h-3.5" /> {w.ownTransport ? "Own transport" : "Needs a lift"}
                      </button>
                      <p className="text-[11px] font-bold text-ink/60 mt-1">{team ? team.name : "Solo / unassigned"}</p>
                    </div>
                    <button aria-label={`Remove ${w.name}`} onClick={() => removeWorker(w)} className="w-10 h-10 rounded-full border border-line grid place-items-center"><Trash2 className="w-4 h-4" /></button>
                  </div>
                );
              })}
            </div>
            {pick.length > 0 && (
              <div className="mt-4 flex gap-3 items-end bg-stone rounded-[12px] p-3">
                <label className="flex-1"><span className={labelCls}>Team name (optional)</span><input className={fieldCls} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={pick.length === 1 ? "Solo · …" : "Gang 5 · …"} /></label>
                <button onClick={createTeam} className="h-12 px-5 rounded-full bg-safety border border-line font-extrabold">{pick.length === 1 ? "Send as solo worker" : `Pair ${pick.length} into a team`}</button>
              </div>
            )}
          </Card>

          <Card title="Add worker">
            <form onSubmit={addWorker} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <label><span className={labelCls}>Name</span><input className={fieldCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Sam Taylor" /></label>
                <label><span className={labelCls}>Mobile</span><input className={fieldCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="07700 900000" /></label>
                <label><span className={labelCls}>Email</span><input className={fieldCls} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label><span className={labelCls}>Home postcode</span><input className={fieldCls} value={f.postcode} onChange={(e) => setF({ ...f, postcode: e.target.value })} placeholder="LS6 2BN" /></label>
                <label><span className={labelCls}>Day rate £</span><input className={fieldCls} inputMode="numeric" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></label>
                <label className="flex items-center gap-2 text-[14px] font-extrabold pt-6"><input type="checkbox" className="w-5 h-5" checked={f.ownTransport} onChange={(e) => setF({ ...f, ownTransport: e.target.checked })} /> Has own transport</label>
              </div>
              <div>
                <span className={labelCls}>Trades they can do</span>
                <div className="flex flex-wrap gap-2">
                  {SYSTEMS.map((k) => (
                    <button type="button" key={k} onClick={() => setF({ ...f, skills: f.skills.includes(k) ? f.skills.filter((s) => s !== k) : [...f.skills, k] })}
                      className={cn("h-10 px-4 rounded-full border border-line text-[13px] font-extrabold", f.skills.includes(k) ? "bg-ink text-white" : "bg-white")}>{SYSTEM_LABEL[k]}</button>
                  ))}
                </div>
              </div>
              <button className="h-12 px-6 rounded-full bg-safety border border-line font-extrabold">Add Worker</button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Teams" meta="Van driver = team lead">
            <div className="space-y-3">
              {data.crews.map((c) => {
                const members = (c.memberIds ?? []).map((id) => workers.find((w) => w.id === id)).filter((w): w is Worker => !!w);
                return (
                  <div key={c.id} className="border border-line rounded-[12px] p-3">
                    <div className="flex justify-between items-baseline"><p className="font-extrabold">{c.name}</p><p className="text-[13px] font-extrabold">{gbp(c.dayRate)}/day</p></div>
                    {members.length === 0 ? <p className="text-[12px] font-bold text-ink/60">{c.men} men · set up before individual workers</p> : (
                      <ul className="mt-2 space-y-1">
                        {members.map((m) => (
                          <li key={m.id} className="flex items-center justify-between text-[13px] font-bold">
                            <span>{m.name} · {gbp(m.dayRate)}</span>
                            {c.driverId === m.id ? <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-ink text-white rounded-full px-2 py-0.5"><Truck className="w-3 h-3" /> Lead · Van</span> : (
                              <span className="flex gap-1">
                                <button onClick={() => mutateData((d) => { const x = d.crews.find((y) => y.id === c.id)!; x.driverId = m.id; syncCrew(x, d.workers!); })} className="text-[11px] font-extrabold underline">Make lead</button>
                                <button onClick={() => mutateData((d) => { const x = d.crews.find((y) => y.id === c.id)!; x.memberIds = x.memberIds!.filter((id) => id !== m.id); if (x.memberIds.length) syncCrew(x, d.workers!); else { d.crews = d.crews.filter((y) => y.id !== c.id); d.bookings = d.bookings.filter((b) => b.crewId !== c.id); } })} className="text-[11px] font-extrabold underline text-ink/60">Remove</button>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title={`Midday reminder · ${REMINDER_TIME}`} meta={`${reminders.length} today`}>
            <p className="text-[13px] font-bold text-ink/70 mb-3">Everyone booked on a site gets a text with a link to their job card only — photos and materials while it's fresh.</p>
            <ul className="space-y-2 mb-4">
              {reminders.map((r) => (
                <li key={r.workerId} className="bg-stone rounded-[10px] p-2.5 text-[12px] font-bold"><span className="font-extrabold">{r.name} · {r.phone}</span><br />{r.message}</li>
              ))}
              {reminders.length === 0 && <li className="text-[13px] font-bold text-ink/60">Nobody is booked on a site today.</li>}
            </ul>
            <button onClick={sendNow} className="w-full h-12 rounded-full bg-ink text-white font-extrabold inline-flex items-center justify-center gap-2"><MessageSquare className="w-4 h-4" /> Send today's reminders now</button>
            {(data.reminderLog?.length ?? 0) > 0 && <p className="mt-2 text-[12px] font-bold text-ink/60">{data.reminderLog!.length} queued · waiting for SMS sending to be connected</p>}
          </Card>
        </div>
      </div>
    </DesktopShell>
  );
}
