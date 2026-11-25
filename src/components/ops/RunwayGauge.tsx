import { gbp } from "@/lib/ops/engine";
import type { labourRunway } from "@/lib/ops/engine";
import { cn } from "@/lib/utils";

export function RunwayGauge({ r, compact }: { r: ReturnType<typeof labourRunway>; compact?: boolean }) {
  const pct = r.affordable > 0 ? Math.min(100, (r.used / r.affordable) * 100) : 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-extrabold uppercase tracking-widest">Labour runway</span>
        <span className={cn("font-display text-[20px]", r.over && "text-safety")}>
          {r.over ? `${Math.abs(r.remaining).toFixed(1)} days over` : `${r.remaining.toFixed(1)} crew-days left`}
        </span>
      </div>
      <div className="mt-3 h-6 rounded-full border-2 border-ink bg-white overflow-hidden">
        <div className={cn("h-full", r.over ? "bg-safety" : pct > 80 ? "bg-ink" : "bg-go")} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[13px] font-bold">
        {r.used} of {r.affordable.toFixed(1)} affordable days used · margin {Math.round(r.margin * 100)}%
      </p>
      {!compact && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] font-bold">
          <dt className="text-ink/60">Quoted + signed variations</dt><dd className="text-right">{gbp(r.revenue)}</dd>
          <dt className="text-ink/60">Material & scaffold</dt><dd className="text-right">−{gbp(r.direct)}</dd>
          <dt className="text-ink/60">Gross profit floor</dt><dd className="text-right">−{gbp(r.floor)}</dd>
          <dt className="text-ink/60">Left for labour</dt><dd className="text-right">{gbp(r.revenue - r.direct - r.floor)}</dd>
        </dl>
      )}
    </div>
  );
}
