import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { MobileFrame, MobileHeader } from "@/components/ops/chrome";
import { nowLabel, readPhoto, useOps } from "@/lib/ops/store";

export const Route = createFileRoute("/variations/new/$jobId")({
  validateSearch: (s: Record<string, unknown>): { elevation?: string } => (typeof s["elevation"] === "string" ? { elevation: s["elevation"] } : {}),
  head: () => ({
    meta: [
      { title: "Raise Variation · Renderfuel Ops" },
      { name: "description", content: "Photograph a defect, price the extra work and send it for the homeowner's signature." },
      { property: "og:title", content: "Raise Variation · Renderfuel Ops" },
      { property: "og:description", content: "Price extra works on site in under a minute." },
    ],
  }),
  component: NewVariation,
});

const field = "w-full h-12 px-4 rounded-[10px] bg-white border border-line text-[16px] font-semibold outline-none focus:ring-2 focus:ring-safety";
const lab = "block text-[12px] font-extrabold uppercase tracking-widest mb-1.5";

function NewVariation() {
  const { jobId } = Route.useParams();
  const search = Route.useSearch();
  const { data, tenant, mutateData } = useOps();
  const navigate = useNavigate();
  const job = data.jobs.find((j) => j.id === jobId);
  const [f, setF] = useState({ elevation: search.elevation ?? job?.elevations[0]?.name ?? "", headline: "", title: "", description: "", cost: "", siteDays: "0.5", scaffoldDays: "0", homeowner: job?.customer ?? "" });
  const [items, setItems] = useState([{ name: "", qty: "" }]);
  const [photos, setPhotos] = useState<{ src: string; at: string }[]>([]);
  const [busy, setBusy] = useState(false);

  if (!job)
    return <MobileFrame><MobileHeader title="Job not found" region={tenant.homeRegion} /><div className="px-4"><Link to="/site" className="h-14 rounded-full bg-white border border-line font-extrabold grid place-items-center">Back</Link></div></MobileFrame>;

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const addPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setBusy(true);
    try {
      const out = await Promise.all(files.slice(0, 4 - photos.length).map(readPhoto));
      setPhotos([...photos, ...out.map((src) => ({ src, at: nowLabel() }))]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that photo.");
    } finally {
      setBusy(false);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Number(f.cost);
    const scope = items.filter((i) => i.name.trim());
    if (!f.headline.trim() || !cost || cost <= 0) { toast.error("Give the variation a name and a price."); return; }
    if (scope.length === 0) { toast.error("Add at least one line to the scope."); return; }
    if (photos.length === 0) { toast.error("Add a photo of the defect — it protects you if the price is questioned."); return; }
    const count = data.variations.filter((v) => v.jobId === job.id).length + 1;
    const id = `v${Date.now().toString(36)}`;
    mutateData((d) => {
      d.variations.push({
        id, number: `VAR-${String(count).padStart(2, "0")}`, jobId: job.id, elevation: f.elevation, headline: f.headline.trim(),
        title: f.title.trim() || f.headline.trim(), description: f.description.trim(), photos, items: scope, cost,
        siteDays: Number(f.siteDays) || 0, scaffoldDays: Number(f.scaffoldDays) || 0, homeowner: f.homeowner.trim() || "Homeowner", status: "pending",
      });
      const el = d.jobs.find((j) => j.id === job.id)!.elevations.find((x) => x.name === f.elevation);
      if (el && !el.defect) el.defect = "Substrate Damage Detected";
    });
    navigate({ to: "/variations/$variationId", params: { variationId: id } });
  };

  return (
    <MobileFrame>
      <MobileHeader title="Raise Variation" region={job.region} />
      <form onSubmit={save} className="px-4 pb-32 space-y-4">
        <section className="bg-white border border-line rounded-[18px] p-4 hard space-y-3">
          <label className="block"><span className={lab}>Elevation</span>
            <select className={field} value={f.elevation} onChange={set("elevation")}>{job.elevations.map((e) => <option key={e.name}>{e.name}</option>)}</select></label>
          <label className="block"><span className={lab}>Short name</span><input className={field} value={f.headline} onChange={set("headline")} placeholder="Blown Brickwork" maxLength={40} /></label>
          <label className="block"><span className={lab}>What you found</span><input className={field} value={f.title} onChange={set("title")} placeholder="Blown brickwork and crumbling mortar" maxLength={80} /></label>
          <label className="block"><span className={lab}>Where</span><textarea className={field + " h-24 py-3"} value={f.description} onChange={set("description")} placeholder="Lower left bay, beside the kitchen window." maxLength={300} /></label>
        </section>

        <section className="bg-white border border-line rounded-[18px] p-4 hard">
          <p className={lab}>Defect photos</p>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-[4/5] rounded-[12px] border border-line overflow-hidden">
                <img src={p.src} alt="" className="w-full h-full object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-2 top-2 w-9 h-9 rounded-full bg-white border border-line grid place-items-center"><X className="w-4 h-4" strokeWidth={3} /></button>
                <span className="absolute left-2 bottom-2 bg-ink text-white rounded-full px-2.5 py-1 text-[12px] font-extrabold">{p.at}</span>
              </div>
            ))}
            {photos.length < 4 && (
              <label className="aspect-[4/5] rounded-[12px] border border-dashed border-line grid place-items-center cursor-pointer text-center">
                <span><Camera className="w-7 h-7 mx-auto" strokeWidth={2.5} /><span className="block mt-2 text-[13px] font-extrabold">{busy ? "Adding…" : "Add photo"}</span></span>
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={addPhotos} />
              </label>
            )}
          </div>
        </section>

        <section className="bg-white border border-line rounded-[18px] p-4 hard">
          <p className={lab}>Scope &amp; materials</p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2">
                <input className={field + " flex-1 min-w-0"} value={it.name} placeholder="Brickwork repair" onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input className={field + " w-24"} value={it.qty} placeholder="3.5m²" onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setItems([...items, { name: "", qty: "" }])} className="mt-3 h-11 px-4 rounded-full border border-line text-[14px] font-extrabold inline-flex items-center gap-1"><Plus className="w-4 h-4" strokeWidth={3} /> Add line</button>
        </section>

        <section className="bg-white border border-line rounded-[18px] p-4 hard grid grid-cols-3 gap-3">
          <label className="col-span-3"><span className={lab}>Price £ (ex VAT)</span><input className={field} inputMode="decimal" value={f.cost} onChange={set("cost")} placeholder="240" /></label>
          <label><span className={lab}>Site days</span><input className={field} inputMode="decimal" value={f.siteDays} onChange={set("siteDays")} /></label>
          <label><span className={lab}>Scaffold +d</span><input className={field} inputMode="numeric" value={f.scaffoldDays} onChange={set("scaffoldDays")} /></label>
          <label><span className={lab}>Homeowner</span><input className={field} value={f.homeowner} onChange={set("homeowner")} /></label>
        </section>

        <div className="fixed bottom-0 inset-x-0 z-20">
          <div className="mx-auto max-w-[430px] px-4 pb-4 pt-2 bg-gradient-to-t from-stone via-stone to-transparent">
            <button className="w-full h-16 rounded-full bg-safety border border-line text-[17px] font-extrabold hard">Continue to Signature</button>
          </div>
        </div>
      </form>
    </MobileFrame>
  );
}
