import { SYSTEM_LABEL } from "@/lib/ops/stages";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useOps } from "@/lib/ops/store";
import { jobArea } from "@/lib/ops/engine";
import { stageDef } from "@/lib/ops/stages";

export const Route = createFileRoute("/certificate/$jobId")({
  head: () => ({
    meta: [
      { title: "Warranty Certificate · Renderfuel Ops" },
      { name: "description", content: "Render system warranty certificate compiled from verified elevation QA photos." },
      { property: "og:title", content: "Warranty Certificate · Renderfuel Ops" },
      { property: "og:description", content: "Warranty certificate with stage-by-stage QA photos." },
    ],
  }),
  component: Certificate,
});

function Certificate() {
  const { jobId } = Route.useParams();
  const { data, tenant, mutateData } = useOps();
  const job = data.jobs.find((j) => j.id === jobId);
  if (!job) return <div className="p-10 font-extrabold">Job not found. <Link to="/" className="underline">Dashboard</Link></div>;
  const total = job.elevations.reduce((n, e) => n + e.stages.length, 0);
  const done = job.elevations.reduce((s, e) => s + e.stages.filter((x) => x.status === "verified").length, 0);
  const ready = job.status === "complete";
  const years = job.system === "silicone" ? 10 : 12;

  const print = () => {
    mutateData((d) => { d.jobs.find((x) => x.id === job.id)!.warrantyExported = true; });
    window.print();
  };

  return (
    <div className="min-h-screen bg-stone py-8 px-4">
      <div className="no-print max-w-[820px] mx-auto mb-4 flex justify-between items-center">
        <Link to="/jobs/$jobId" params={{ jobId: job.id }} className="h-11 px-4 rounded-full bg-white border border-line font-extrabold grid place-items-center">← Back</Link>
        {ready && <button onClick={print} className="h-12 px-5 rounded-full bg-safety border border-line font-extrabold inline-flex items-center gap-2 hard"><Printer className="w-4 h-4" /> Print / Save as PDF</button>}
      </div>
      {!ready ? (
        <div className="max-w-[820px] mx-auto bg-white border border-line rounded-[18px] p-8 hard">
          <h1 className="font-display text-[26px]">Certificate not ready yet</h1>
          <p className="mt-2 font-bold">{done} of {total} stage photos verified on {job.address}. It compiles itself once the last stage is signed off.</p>
          <div className="mt-4 h-5 rounded-full border border-line overflow-hidden"><div className="h-full bg-go" style={{ width: `${(done / total) * 100}%` }} /></div>
        </div>
      ) : (
        <article className="max-w-[820px] mx-auto bg-white border border-line p-10">
          <div className="flex justify-between items-start border-b-2 border-line pb-5">
            <div>
              <p className="text-[12px] font-extrabold tracking-[0.18em] uppercase">RenderFuel · {tenant.name}</p>
              <h1 className="font-display text-[34px] leading-tight mt-1">Render System Warranty Certificate</h1>
            </div>
            <div className="text-right"><p className="font-display text-[44px] leading-none">{years}</p><p className="text-[12px] font-extrabold uppercase">Year warranty</p></div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-[14px]">
            <dt className="font-extrabold">Property</dt><dd>{job.address}, {job.postcode}</dd>
            <dt className="font-extrabold">Homeowner</dt><dd>{job.customer}</dd>
            <dt className="font-extrabold">System</dt><dd>{job.product} ({SYSTEM_LABEL[job.system]})</dd>
            <dt className="font-extrabold">Area</dt><dd>{jobArea(job)}m² across {job.elevations.length} elevations</dd>
            <dt className="font-extrabold">Completed</dt><dd>{job.completedAt}</dd>
            <dt className="font-extrabold">Reference</dt><dd>{job.ref}</dd>
            {job.batches.length > 0 && (<><dt className="font-extrabold">Topcoat batches</dt><dd>{job.batches.join(", ")}</dd></>)}
          </dl>
          {job.elevations.map((e) => (
            <section key={e.name} className="mt-6 break-inside-avoid">
              <h2 className="font-display text-[18px] border-b-2 border-line pb-1">{e.name} Elevation · {e.area}m²</h2>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {e.stages.map((s) => (
                  <figure key={s.code}>
                    {s.photo ? <img src={s.photo} alt={stageDef(s.code).name} className="w-full aspect-[4/3] object-cover border border-line" /> : <div className="w-full aspect-[4/3] border border-line bg-stone" />}
                    <figcaption className="mt-1 text-[11px] font-extrabold">{s.code} · {stageDef(s.code).name}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ))}
          <p className="mt-8 text-[12px] leading-relaxed">Every stage above was photographed on site and verified before the next coat was allowed. This warranty covers the render system against cracking, delamination and water ingress from the completion date, subject to the manufacturer's terms.</p>
          <div className="mt-10 grid grid-cols-2 gap-10 text-[12px] font-extrabold uppercase tracking-widest">
            <div className="border-t-2 border-line pt-1">For {tenant.name}</div><div className="border-t-2 border-line pt-1">Homeowner · {job.customer}</div>
          </div>
        </article>
      )}
    </div>
  );
}
