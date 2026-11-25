import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame, MobileHeader } from "@/components/ops/chrome";
import { useOps } from "@/lib/ops/store";
import { jobArea, scaffoldLeft } from "@/lib/ops/engine";
import { stageLabel } from "@/lib/ops/labels";

export const Route = createFileRoute("/site/")({
  head: () => ({
    meta: [
      { title: "My Sites · Renderfuel Ops" },
      { name: "description", content: "Site lead view: pick today's rendering job to open its job card." },
      { property: "og:title", content: "My Sites · Renderfuel Ops" },
      { property: "og:description", content: "Today's rendering jobs for the site lead." },
    ],
  }),
  component: SiteList,
});

function SiteList() {
  const { data, tenant } = useOps();
  const jobs = data.jobs.filter((j) => j.status === "active");
  return (
    <MobileFrame>
      <MobileHeader title="My Sites" region={tenant.homeRegion} />
      <div className="px-4 pb-8 space-y-3">
        {jobs.length === 0 && (
          <div className="bg-white border border-line rounded-[18px] p-5 hard">
            <p className="font-display text-[20px]">No sites assigned</p>
            <p className="mt-1 text-[14px] font-bold text-ink/70">When the office dispatches your gang, the job card shows up here.</p>
          </div>
        )}
        {jobs.map((j) => (
          <Link key={j.id} to="/site/$jobId" params={{ jobId: j.id }} search={{}} className="block bg-white border border-line rounded-[18px] p-4 hard">
            <div className="flex justify-between items-baseline gap-3">
              <h2 className="font-display text-[20px] leading-6">{j.address}</h2>
              <span className="font-display text-[17px] shrink-0">{jobArea(j)}m²</span>
            </div>
            <p className="mt-1 text-[14px] font-extrabold">{j.ref} · {j.product}</p>
            <p className="text-[13px] font-bold text-ink/70">{stageLabel(j)} · {j.scaffold.required === false ? "no scaffold" : `scaffold ${scaffoldLeft(j)}d left`}</p>
          </Link>
        ))}
      </div>
    </MobileFrame>
  );
}
