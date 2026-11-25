import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOps } from "@/lib/ops/store";
import { coatingSafe, TODAY, weatherFor } from "@/lib/ops/engine";
import type { Region, Role } from "@/lib/ops/types";
import { NewJobDialog } from "./NewJobDialog";
import { cn } from "@/lib/utils";

const ROLES: { role: Role; label: string; to: "/admin" | "/" | "/site" }[] = [
  { role: "agency", label: "Agency Mode", to: "/admin" },
  { role: "boss", label: "Contractor Mode", to: "/" },
  { role: "lead", label: "Team Mode", to: "/site" },
];

export function useRoleSwitch() {
  const { mutate } = useOps();
  const navigate = useNavigate();
  return (role: Role) => {
    mutate((s) => { s.role = role; });
    navigate({ to: ROLES.find((r) => r.role === role)!.to });
  };
}

function RoleItems() {
  const { state } = useOps();
  const go = useRoleSwitch();
  return (
    <>
      <DropdownMenuLabel className="text-[11px] font-extrabold uppercase tracking-widest">View as</DropdownMenuLabel>
      {ROLES.map((r) => (
        <DropdownMenuItem key={r.role} onSelect={() => go(r.role)} className="font-extrabold">
          {r.label} {state.role === r.role && <span className="ml-auto text-go">●</span>}
        </DropdownMenuItem>
      ))}
    </>
  );
}

export function WeatherPill({ region, mobile }: { region: Region; mobile?: boolean }) {
  const { data } = useOps();
  const w = weatherFor(data, region, TODAY);
  const safe = coatingSafe(w);
  const cond = w.rain > 30 ? "Rain" : "Dry";
  if (mobile)
    return (
      <div className="flex items-center gap-2 bg-white border border-line rounded-full pl-3 pr-1 h-11 shrink-0">
        <span className={cn("w-3 h-3 rounded-full", safe ? "bg-go" : "bg-safety")} />
        <span className="text-[13px] font-extrabold leading-tight w-9">{w.temp}°C {cond}</span>
        <span className={cn("text-[11px] font-extrabold rounded-full px-2.5 py-1 leading-tight w-[76px]", safe ? "bg-go text-white" : "bg-safety text-ink")}>
          {safe ? "COATING SAFE" : "COATING HOLD"}
        </span>
      </div>
    );
  return (
    <div className="flex items-center gap-2 bg-stone border border-line rounded-full px-3 h-11">
      <span className={cn("w-3 h-3 rounded-full", safe ? "bg-go" : "bg-safety")} />
      <span className="text-[13px] font-extrabold">{w.temp}°C {cond}</span>
      <span className={cn("text-[11px] font-extrabold rounded-full px-2 py-0.5", safe ? "bg-go text-white" : "bg-safety text-ink")}>
        {safe ? "COATING SAFE" : "COATING HOLD"}
      </span>
    </div>
  );
}

export function DesktopHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { tenant, state } = useOps();
  const initials = tenant.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <header className="h-16 px-6 flex items-center justify-between gap-6 bg-white border-b-2 border-line">
      <div className="flex items-center gap-5 min-w-0">
        <Link to="/" className="text-[16px] font-extrabold italic tracking-tight uppercase shrink-0">Render<span className="text-safety">Fuel</span></Link>
        <span className="w-0.5 h-8 bg-ink shrink-0" />
        <div className="min-w-0">
          <h1 className="font-display text-[22px] leading-6 truncate">{title}</h1>
          <p className="text-[12px] font-bold text-ink/60 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <WeatherPill region={tenant.homeRegion} />
        {state.role !== "agency" && (
          <NewJobDialog>
            <button className="h-11 px-4 rounded-full bg-safety border border-line text-[14px] font-extrabold hard">+ New Job</button>
          </NewJobDialog>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="Switch role" className="w-11 h-11 rounded-full bg-white border border-line grid place-items-center font-display text-[14px]">
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border border-line rounded-[12px] w-56">
            <DropdownMenuLabel className="text-[13px]">{tenant.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <RoleItems />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

const TABS = [
  { to: "/", label: "Sites" },
  { to: "/dispatch", label: "Dispatch" },
  { to: "/team", label: "Team" },
  { to: "/timesheets", label: "Timesheets" },
  { to: "/ghl", label: "Renderfuel Sales" },
  { to: "/site", label: "Site View" },
] as const;

export function DesktopTabs() {
  const { data } = useOps();
  const qa = data.jobs.reduce((n, j) => n + j.elevations.reduce((m, e) => m + e.stages.filter((s) => s.photo && s.review === "pending").length, 0), 0);
  return (
    <nav className="h-14 px-6 flex items-center gap-2 bg-stone border-b-2 border-line">
      {TABS.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          activeOptions={{ exact: t.to === "/" }}
          className="h-11 px-5 rounded-full flex items-center text-[14px] font-extrabold border border-transparent hover:border-line data-[status=active]:bg-ink data-[status=active]:text-white data-[status=active]:border-line"
        >
          {t.label}
          {t.to === "/" && qa > 0 && <span aria-label={`${qa} photos to approve`} className="ml-2 min-w-6 h-6 px-1.5 rounded-full bg-safety text-ink border border-line text-[12px] font-extrabold grid place-items-center">{qa}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function DesktopShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone">
      <DesktopHeader title={title} subtitle={subtitle} />
      <DesktopTabs />
      <main className="p-6">{children}</main>
    </div>
  );
}

export function MobileBrand() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-[14px] font-extrabold italic tracking-tight uppercase flex items-center gap-1" aria-label="Switch role">
        RenderFuel <ChevronDown className="w-3 h-3" strokeWidth={3} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="border border-line rounded-[12px] w-52">
        <RoleItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobileHeader({ title, region }: { title: ReactNode; region: Region }) {
  return (
    <header className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <MobileBrand />
        <h1 className="font-display text-[24px] leading-7 mt-1">{title}</h1>
      </div>
      <WeatherPill region={region} mobile />
    </header>
  );
}

export function MobileFrame({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-stone"><div className="mx-auto max-w-[430px] min-h-screen relative">{children}</div></div>;
}

export type MobileTab = "job" | "photos" | "crew" | "stock";
export function MobileTabs({ jobId, tab }: { jobId: string; tab: MobileTab }) {
  const items: { t: MobileTab; label: string }[] = [
    { t: "job", label: "Job" }, { t: "photos", label: "Photos" }, { t: "crew", label: "Crew" }, { t: "stock", label: "Stock" },
  ];
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
      <div className="mx-auto max-w-[430px] px-4 pb-4 pointer-events-auto">
        <nav className="bg-white border border-line rounded-full p-1.5 grid grid-cols-4 h-16 hard">
          {items.map((i) => (
            <Link
              key={i.t}
              to="/site/$jobId"
              params={{ jobId }}
              search={{ tab: i.t }}
              className={cn("rounded-full grid place-items-center text-[13px] font-extrabold", tab === i.t && "bg-ink text-white")}
            >
              {i.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function SectionTitle({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between pt-2 mb-3">
      <h3 className="text-[13px] font-extrabold uppercase tracking-widest">{children}</h3>
      {meta != null && <span className="text-[13px] font-extrabold text-ink/60">{meta}</span>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("bg-white border border-line rounded-[18px] hard", className)}>{children}</section>;
}
