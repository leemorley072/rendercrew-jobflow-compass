import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useOps } from "@/lib/ops/store";
import { buildJob } from "@/lib/ops/intake";
import type { Region } from "@/lib/ops/types";

export const fieldCls = "w-full h-12 px-4 rounded-[10px] bg-white border border-line text-[15px] font-semibold outline-none focus:ring-2 focus:ring-safety";
export const labelCls = "block text-[12px] font-extrabold uppercase tracking-widest mb-1.5";

export function NewJobDialog({ children }: { children: ReactNode }) {
  const { data, mutateData } = useOps();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ address: "", postcode: "", customer: "", region: "Leeds" as Region, system: "silicone" as "silicone" | "monocouche", product: "Weber Silicone", quoted: "", front: "50", rear: "45", gable: "25", noScaffold: false });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const quoted = Number(f.quoted);
    const els = [["Front", f.front], ["Rear", f.rear], ["Gable", f.gable]]
      .map(([name, a]) => ({ name: name!, area: Number(a) }))
      .filter((x) => x.area > 0);
    if (!f.address.trim() || !quoted || els.length === 0) {
      toast.error("Add an address, the quoted price and at least one elevation size.");
      return;
    }
    const job = buildJob(data, { address: f.address.trim(), postcode: f.postcode.trim(), customer: f.customer.trim() || "Homeowner", region: f.region, system: f.system, product: f.product, quoted, elevations: els, scaffold: !f.noScaffold }, "manual");
    mutateData((d) => { d.jobs.push(job); });
    toast.success(`${job.ref} added — schedule a crew next.`);
    setOpen(false);
    navigate({ to: "/dispatch", search: { job: job.id } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border border-line rounded-[18px] hard max-w-lg bg-white">
        <DialogHeader><DialogTitle className="font-display text-[22px]">New Job</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-2"><span className={labelCls}>Address</span><input className={fieldCls} value={f.address} onChange={set("address")} placeholder="12 Orchard Way" /></label>
            <label><span className={labelCls}>Postcode</span><input className={fieldCls} value={f.postcode} onChange={set("postcode")} /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label><span className={labelCls}>Customer</span><input className={fieldCls} value={f.customer} onChange={set("customer")} /></label>
            <label><span className={labelCls}>Quoted £</span><input className={fieldCls} inputMode="numeric" value={f.quoted} onChange={set("quoted")} placeholder="12600" /></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label><span className={labelCls}>Region</span>
              <select className={fieldCls} value={f.region} onChange={set("region")}><option>Leeds</option><option>Harrogate</option><option>York</option></select></label>
            <label><span className={labelCls}>System</span>
              <select className={fieldCls} value={f.system} onChange={(e) => setF({ ...f, system: e.target.value as "silicone", product: e.target.value === "silicone" ? "Weber Silicone" : "K-Rend Monocouche" })}>
                <option value="silicone">Silicone</option><option value="monocouche">Monocouche</option></select></label>
            <label><span className={labelCls}>Product</span><input className={fieldCls} value={f.product} onChange={set("product")} /></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["front", "rear", "gable"] as const).map((k) => (
              <label key={k}><span className={labelCls}>{k} m²</span><input className={fieldCls} inputMode="numeric" value={f[k]} onChange={set(k)} /></label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[14px] font-extrabold"><input type="checkbox" className="w-5 h-5" checked={f.noScaffold} onChange={(e) => setF({ ...f, noScaffold: e.target.checked })} /> No scaffold needed (ground floor, tower or internal)</label>
          <button className="w-full h-14 rounded-full bg-safety border border-line text-[16px] font-extrabold hard">Create & Schedule</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
