import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame, MobileHeader } from "@/components/ops/chrome";
import { useOps } from "@/lib/ops/store";
import { jobArea, scaffoldLeft, todaysJobFor, DAY_LABELS, TODAY } from "@/lib/ops/engine";
import { crewOfWorker, REMINDER_TIME } from "@/lib/ops/team";
import type { Job } from "@/lib/ops/types";
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
  const { data, tenant, state, mutate } = useOps();
  const workers = data.workers ?? [];
  const isWorker = state.role === "lead";
  const me = workers.find((w) => w.id === state.activeWorkerId) ?? workers[0];
  const mine = me ? todaysJobFor(data, me.id) : undefined;
  const team = me ? crewOfWorker(data, me.id) : undefined;
  const jobs: Job[] = isWorker ? (mine ? [mine] : []) : data.jobs.filter((j) => j.status === "active");
  return (
    <MobileFrame>
      <MobileHeader title={isWorker ? "Today's Site" : "My Sites"} region={tenant.homeRegion} />
      <div className="px-4 pb-8 space-y-3">
        {isWorker && workers.length > 0 && (
          <div className="bg-white border border-line rounded-[18px] p-4">
            <label className="block text-[12px] font-extrabold uppercase tracking-widest mb-1.5" htmlFor="me">Signed in as</label>
            <select id="me" className="w-full h-12 px-4 rounded-[10px] bg-white border border-line text-[15px] font-semibold" value={me?.id} onChange={(e) => mutate((s) => { s.activeWorkerId = e.target.value; })}>
              {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <p className="mt-2 text-[13px] font-bold text-ink/60">{DAY_LABELS[TODAY]} · {team ? `${team.name}${team.driverId === me?.id ? " · you drive the van" : ""}` : "not in a team yet"} · reminder at {REMINDER_TIME}</p>
          </div>
        )}
        {jobs.length === 0 && (
          <div className="bg-white border border-line rounded-[18px] p-5 hard">
            <p className="font-display text-[20px]">No site booked today</p>
            <p className="mt-1 text-[14px] font-bold text-ink/70">{isWorker ? "You're not booked on a job today (or it's a rain hold). When the office books you on, the job card shows up here." : "When the office dispatches your gang, the job card shows up here."}</p>
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
