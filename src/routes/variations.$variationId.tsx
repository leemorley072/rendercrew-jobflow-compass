import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { MobileFrame, MobileHeader } from "@/components/ops/chrome";
import { SignaturePad } from "@/components/ops/SignaturePad";
import { useOps } from "@/lib/ops/store";
import { gbp, labourRunway } from "@/lib/ops/engine";

export const Route = createFileRoute("/variations/$variationId")({
  head: () => ({
    meta: [
      { title: "Variation Sign-Off · Renderfuel Ops" },
      { name: "description", content: "On-site variation sign-off: defect photos, scope, price and the homeowner's signature." },
      { property: "og:title", content: "Variation Sign-Off · Renderfuel Ops" },
      { property: "og:description", content: "Get extra works signed on site before the basecoat goes on." },
    ],
  }),
  component: VariationSign,
});

function VariationSign() {
  const { variationId } = Route.useParams();
  const { data, tenant, mutateData } = useOps();
  const v = data.variations.find((x) => x.id === variationId);
  const job = data.jobs.find((j) => j.id === v?.jobId);
  const [sig, setSig] = useState<string | null>(null);

  if (!v || !job)
    return (
      <MobileFrame>
        <MobileHeader title="Variation not found" region={tenant.homeRegion} />
        <div className="px-4"><Link to="/site" className="h-14 rounded-full bg-white border-2 border-ink font-extrabold grid place-items-center">Back to my sites</Link></div>
      </MobileFrame>
    );

  const el = job.elevations.find((e) => e.name === v.elevation);
  const crew = data.crews.find((c) => c.id === job.crewId);
  const dayRate = crew?.dayRate ?? tenant.defaultDayRate;
  const signedBefore = data.variations.filter((x) => x.jobId === job.id && x.status === "signed" && x.id !== v.id).reduce((s, x) => s + x.cost, 0);
  const before = job.quoted + signedBefore;
  const runway = labourRunway(job, data.variations, tenant.gpFloor, dayRate);
  const signed = v.status === "signed";

  const sign = () => {
    if (!sig) {
      toast.error(`${v.homeowner} needs to sign in the box first.`);
      return;
    }
    mutateData((d) => {
      const x = d.variations.find((y) => y.id === v.id)!;
      x.status = "signed";
      x.signature = sig;
      x.signedAt = new Date().toISOString();
      const j = d.jobs.find((y) => y.id === job.id)!;
      j.scaffold.hireDays += x.scaffoldDays;
      const e = j.elevations.find((y) => y.name === x.elevation);
      if (e && e.defect && !d.variations.some((y) => y.jobId === j.id && y.elevation === x.elevation && y.status === "pending")) delete e.defect;
    });
    toast.success(`${gbp(v.cost, 2)} variation authorized by ${v.homeowner}`);
  };

  return (
    <MobileFrame>
      <MobileHeader title={<>Variation #{v.number} • {v.elevation} Elevation</>} region={job.region} />
      <div className="px-4 pb-32 space-y-4">
        <div className="flex flex-col items-start gap-3">
          <span className="h-11 px-4 rounded-full bg-white border-2 border-ink text-[14px] font-extrabold inline-flex items-center">{v.elevation} Elevation · {el?.area ?? 0}m²</span>
          <span className="h-11 px-4 rounded-full bg-ink text-white text-[14px] font-extrabold inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-safety" />Substrate Defect Identified</span>
        </div>

        <section className="bg-white border-2 border-ink rounded-[18px] p-4 hard">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-safety">Defect found after hack-off</p>
          <h2 className="mt-2 font-display text-[22px] leading-7">{v.title}</h2>
          <p className="mt-2 text-[16px] font-medium leading-snug">{v.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(v.photos.length ? v.photos : [null, null]).slice(0, 4).map((p, i) => (
              <div key={i} className="relative aspect-[4/5] rounded-[12px] border-2 border-ink bg-stone overflow-hidden">
                {p ? <img src={p.src} alt={`Defect photo ${i + 1}`} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[12px] font-extrabold tracking-widest text-ink/50">NO PHOTO</div>}
                {p && <span className="absolute left-2 bottom-2 bg-ink text-white rounded-full px-2.5 py-1 text-[12px] font-extrabold">{p.at}</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border-2 border-ink rounded-[18px] hard overflow-hidden">
          <p className="px-4 py-3 text-[13px] font-extrabold uppercase tracking-[0.18em] border-b-2 border-ink">Scope &amp; materials</p>
          {v.items.map((it, i) => (
            <div key={i} className="px-4 h-14 flex items-center justify-between border-b-2 border-ink last:border-b-0">
              <span className="text-[16px] font-semibold">{it.name}</span><span className="font-display text-[17px]">{it.qty}</span>
            </div>
          ))}
        </section>

        <section className="bg-safety border-2 border-ink rounded-[18px] p-4 hard">
          <p className="text-[13px] font-extrabold uppercase tracking-[0.18em]">Variation cost</p>
          <div className="flex items-baseline justify-between"><span className="font-display text-[44px] leading-tight">+{gbp(v.cost, 2)}</span><span className="text-[15px] font-extrabold">+VAT</span></div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border-2 border-ink rounded-[18px] p-4"><p className="font-display text-[26px] leading-none">+{v.siteDays}</p><p className="mt-1 text-[15px] font-semibold">site day</p></div>
          <div className="bg-white border-2 border-ink rounded-[18px] p-4"><p className="font-display text-[26px] leading-none flex items-center gap-2">{v.scaffoldDays}{v.scaffoldDays === 0 && <span className="w-3 h-3 rounded-full bg-go" />}</p><p className="mt-1 text-[15px] font-semibold">scaffold extension days</p></div>
        </div>

        <section className="bg-white border-2 border-ink rounded-[18px] p-4 hard">
          <p className="text-[16px] font-semibold leading-snug">“I authorize the additional repair works at the agreed price above before basecoat application.”</p>
          {signed ? (
            <div className="mt-4 rounded-[12px] border-2 border-ink bg-[#f0eeea] p-3">
              {v.signature && <img src={v.signature} alt={`Signature of ${v.homeowner}`} className="h-28 w-full object-contain" />}
              <p className="border-t-2 border-ink pt-1 text-[12px] font-extrabold uppercase tracking-[0.18em]">Homeowner · {v.homeowner}</p>
            </div>
          ) : (
            <SignaturePad signer={v.homeowner} onChange={setSig} />
          )}
        </section>

        {signed && (
          <section className="bg-white border-2 border-ink rounded-[18px] p-4 hard">
            <p className="flex items-center gap-2 text-[15px] font-extrabold text-go"><CheckCircle2 className="w-5 h-5" /> Authorized {v.signedAt ? new Date(v.signedAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : ""}</p>
            <p className="mt-3 text-[13px] font-extrabold uppercase tracking-widest">New contract sum</p>
            <p className="font-display text-[30px]">{gbp(before + v.cost)}</p>
            <p className="text-[14px] font-bold text-ink/70">was {gbp(before)} · runway now {runway.remaining.toFixed(1)} crew-days</p>
          </section>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20">
        <div className="mx-auto max-w-[430px] px-4 pb-4 pt-2 bg-gradient-to-t from-stone via-stone to-transparent">
          {signed ? (
            <Link to="/site/$jobId" params={{ jobId: job.id }} search={{}} className="w-full h-16 rounded-full bg-ink text-white border-2 border-ink text-[17px] font-extrabold flex items-center justify-center">Back to Job Card</Link>
          ) : (
            <button onClick={sign} className="w-full h-16 rounded-full bg-safety border-2 border-ink text-[16px] font-display flex items-center justify-center gap-2 hard">
              Sign &amp; Authorize {gbp(v.cost, 2)} Variation <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
