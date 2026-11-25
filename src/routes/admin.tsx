import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, DesktopHeader, SectionTitle } from "@/components/ops/chrome";
import { fieldCls, labelCls } from "@/components/ops/NewJobDialog";
import { useOps } from "@/lib/ops/store";
import { emptyTenantData } from "@/lib/ops/seed";
import { gbp } from "@/lib/ops/engine";
import type { Region } from "@/lib/ops/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Agency Admin · Renderfuel Ops" },
      { name: "description", content: "Provision contractor accounts, set crews and day rates, and link each GoHighLevel location." },
      { property: "og:title", content: "Agency Admin · Renderfuel Ops" },
      { property: "og:description", content: "Run every contractor account from one place." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { state, mutate, reset } = useOps();
  const navigate = useNavigate();
  const [sel, setSel] = useState(state.activeTenantId);
  const t = state.tenants.find((x) => x.id === sel) ?? state.tenants[0]!;
  const d = state.data[t.id]!;
  const [nf, setNf] = useState({ name: "", loc: "", region: "Leeds" as Region });
  const [cf, setCf] = useState({ lead: "", men: "3", rate: "570", specialty: "Silicone", skills: "silicone" });

  const provision = (e: React.FormEvent) => {
    e.preventDefault();
    if (nf.name.trim().length < 2 || nf.loc.trim().length < 6) { toast.error("Add the contractor's name and their GHL Location ID."); return; }
    if (state.tenants.some((x) => x.ghlLocationId === nf.loc.trim())) { toast.error("That GHL location is already linked to another account."); return; }
    const id = `t${Date.now().toString(36)}`;
    mutate((s) => {
      s.tenants.push({ id, name: nf.name.trim(), ghlLocationId: nf.loc.trim(), homeRegion: nf.region, gpFloor: 0.25, defaultDayRate: 570, createdAt: new Date().toISOString().slice(0, 10) });
      s.data[id] = emptyTenantData();
    });
    setSel(id);
    setNf({ name: "", loc: "", region: "Leeds" });
    toast.success(`${nf.name.trim()} provisioned`);
  };

  const editTenant = (fn: (x: typeof t) => void) => mutate((s) => fn(s.tenants.find((x) => x.id === t.id)!));

  const addCrew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cf.lead.trim()) { toast.error("Add the gang lead's name."); return; }
    mutate((s) => {
      const dd = s.data[t.id]!;
      const n = dd.crews.length + 1;
      dd.crews.push({
        id: `g${Date.now().toString(36)}`, name: `Gang ${n} · ${cf.lead.trim()}`, lead: cf.lead.trim(), men: Number(cf.men) || 2,
        skills: cf.skills.split(",").map((x) => x.trim()).filter(Boolean), specialty: cf.specialty, certs: cf.specialty, dayRate: Number(cf.rate) || 500,
        base: { x: 0, y: 0 }, phone: "",
      });
    });
    setCf({ ...cf, lead: "" });
  };

  return (
    <div className="min-h-screen bg-stone">
      <DesktopHeader title="Renderfuel Agency Admin" subtitle={`${state.tenants.length} contractor accounts • GoHighLevel locations linked`} />
      <main className="p-6 grid lg:grid-cols-[360px_1fr] gap-6 items-start">
        <div className="space-y-4">
          <SectionTitle meta={state.tenants.length}>Contractor accounts</SectionTitle>
          {state.tenants.map((x) => {
            const dd = state.data[x.id]!;
            return (
              <button key={x.id} onClick={() => setSel(x.id)} className={cn("w-full text-left bg-white border-2 border-ink rounded-[18px] p-4", sel === x.id && "hard outline outline-2 outline-ink")}>
                <div className="flex justify-between"><span className="font-display text-[17px]">{x.name}</span>{state.activeTenantId === x.id && <span className="text-[11px] font-extrabold bg-go text-white rounded-full px-2 py-0.5 h-fit">LIVE</span>}</div>
                <p className="text-[13px] font-bold text-ink/60">{dd.crews.length} gangs • {dd.jobs.filter((j) => j.status === "active").length} active sites • {x.ghlLocationId}</p>
              </button>
            );
          })}
          <Card className="p-4">
            <form onSubmit={provision} className="space-y-3">
              <p className="font-display text-[17px]">Provision contractor</p>
              <label className="block"><span className={labelCls}>Business name</span><input className={fieldCls} value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} /></label>
              <label className="block"><span className={labelCls}>GHL Location ID</span><input className={fieldCls} value={nf.loc} onChange={(e) => setNf({ ...nf, loc: e.target.value })} placeholder="ve9EPM428h8vShlRW1KT" /></label>
              <label className="block"><span className={labelCls}>Home region</span>
                <select className={fieldCls} value={nf.region} onChange={(e) => setNf({ ...nf, region: e.target.value as Region })}><option>Leeds</option><option>Harrogate</option><option>York</option></select></label>
              <button className="w-full h-14 rounded-full bg-safety border-2 border-ink font-extrabold hard">Create Sub-Account</button>
            </form>
          </Card>
          <button onClick={() => { reset(); toast.success("Demo data restored"); }} className="w-full h-12 rounded-full bg-white border-2 border-ink font-extrabold">Reset demo data</button>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex justify-between items-start gap-4">
              <div><h2 className="font-display text-[24px]">{t.name}</h2><p className="text-[13px] font-bold text-ink/60">Since {t.createdAt}</p></div>
              <button onClick={() => { mutate((s) => { s.activeTenantId = t.id; s.role = "boss"; }); navigate({ to: "/" }); }} className="h-12 px-5 rounded-full bg-ink text-white font-extrabold">Open as Contractor →</button>
            </div>
            <div className="mt-5 grid md:grid-cols-3 gap-4">
              <label><span className={labelCls}>GHL Location ID</span><input className={fieldCls} value={t.ghlLocationId} onChange={(e) => editTenant((x) => { x.ghlLocationId = e.target.value.trim(); })} /></label>
              <label><span className={labelCls}>Gross profit floor %</span><input className={fieldCls} inputMode="numeric" value={Math.round(t.gpFloor * 100)} onChange={(e) => editTenant((x) => { x.gpFloor = Math.min(90, Math.max(0, Number(e.target.value) || 0)) / 100; })} /></label>
              <label><span className={labelCls}>Default gang day rate £</span><input className={fieldCls} inputMode="numeric" value={t.defaultDayRate} onChange={(e) => editTenant((x) => { x.defaultDayRate = Number(e.target.value) || 0; })} /></label>
            </div>
          </Card>

          <SectionTitle meta={`${d.crews.length} gangs`}>Crews &amp; rates</SectionTitle>
          <Card className="overflow-hidden">
            {d.crews.length === 0 && <p className="p-5 font-bold">No gangs yet — add the first one below so jobs can be scheduled.</p>}
            {d.crews.map((c) => (
              <div key={c.id} className="grid grid-cols-[1fr_90px_130px_1fr_44px] gap-3 items-center px-4 py-3 border-b-2 border-ink">
                <div><p className="font-display text-[15px]">{c.name}</p><p className="text-[12px] font-bold text-ink/60">{c.specialty}</p></div>
                <label className="text-[11px] font-extrabold uppercase">Men<input className={fieldCls + " h-10"} inputMode="numeric" value={c.men} onChange={(e) => mutate((s) => { s.data[t.id]!.crews.find((x) => x.id === c.id)!.men = Number(e.target.value) || 1; })} /></label>
                <label className="text-[11px] font-extrabold uppercase">Day rate £<input className={fieldCls + " h-10"} inputMode="numeric" value={c.dayRate} onChange={(e) => mutate((s) => { s.data[t.id]!.crews.find((x) => x.id === c.id)!.dayRate = Number(e.target.value) || 0; })} /></label>
                <p className="text-[12px] font-bold">{c.skills.join(" · ")} · {gbp(c.dayRate / Math.max(1, c.men))}/man</p>
                <button aria-label={`Remove ${c.name}`} onClick={() => mutate((s) => { const dd = s.data[t.id]!; dd.crews = dd.crews.filter((x) => x.id !== c.id); dd.bookings = dd.bookings.filter((b) => b.crewId !== c.id); })} className="w-10 h-10 rounded-full border-2 border-ink grid place-items-center"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <form onSubmit={addCrew} className="grid grid-cols-[1fr_80px_110px_1fr_1fr_auto] gap-3 items-end p-4 bg-stone/40">
              <label><span className={labelCls}>Gang lead</span><input className={fieldCls} value={cf.lead} onChange={(e) => setCf({ ...cf, lead: e.target.value })} /></label>
              <label><span className={labelCls}>Men</span><input className={fieldCls} value={cf.men} onChange={(e) => setCf({ ...cf, men: e.target.value })} /></label>
              <label><span className={labelCls}>Rate £</span><input className={fieldCls} value={cf.rate} onChange={(e) => setCf({ ...cf, rate: e.target.value })} /></label>
              <label><span className={labelCls}>Specialty</span><input className={fieldCls} value={cf.specialty} onChange={(e) => setCf({ ...cf, specialty: e.target.value })} /></label>
              <label><span className={labelCls}>Systems</span>
                <select className={fieldCls} value={cf.skills} onChange={(e) => setCf({ ...cf, skills: e.target.value })}>
                  <option value="silicone">Silicone</option><option value="monocouche">Monocouche</option><option value="silicone,monocouche">Both</option><option value="prep,silicone">Prep & patch</option>
                </select></label>
              <button className="h-12 px-5 rounded-full bg-safety border-2 border-ink font-extrabold">Add Gang</button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
