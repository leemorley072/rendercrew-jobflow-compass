import type { Crew, Job, MaterialItem, MaterialOverrides, Tenant, TenantData, Variation } from "./types";

/** Agency benchmark price book every new contractor account inherits. */
export const DEFAULT_MATERIALS: MaterialItem[] = [
  { id: "basecoat", name: "Basecoat / adhesive 25kg", unit: "bag", supplier: "Minster", price: 11.5, system: "silicone" },
  { id: "mesh", name: "Reinforcing mesh 50m", unit: "roll", supplier: "Minster", price: 42, system: "silicone" },
  { id: "primer", name: "Tinted primer 15L", unit: "tub", supplier: "Encon", price: 45, system: "silicone" },
  { id: "topcoat", name: "Silicone topcoat 25kg", unit: "tub", supplier: "Encon", price: 68, system: "silicone" },
  { id: "mono", name: "Monocouche scratch 25kg", unit: "bag", supplier: "SIG", price: 12.8, system: "monocouche" },
  { id: "bead-corner", name: "Corner bead 2.5m", unit: "length", supplier: "Minster", price: 3.4, system: "all" },
  { id: "bead-stop", name: "Stop bead 2.5m", unit: "length", supplier: "Minster", price: 3.2, system: "all" },
  { id: "bead-bell", name: "Bellcast bead 2.5m", unit: "length", supplier: "Minster", price: 3.6, system: "all" },
  { id: "mastic", name: "Mastic sealant", unit: "tube", supplier: "Encon", price: 6.5, system: "all" },
];

/** Contractor price wins over the agency benchmark when set. */
export function resolveCatalog(agency: MaterialItem[], overrides: MaterialOverrides = {}): MaterialItem[] {
  return agency.map((m) => {
    const o = overrides[m.id];
    return o ? { ...m, supplier: o.supplier || m.supplier, price: o.price, overridden: true } : m;
  });
}

export function itemsForJob(catalog: MaterialItem[], job: Job) {
  return catalog.filter((m) => m.system === "all" || m.system === job.system);
}

/** Σ quantity × unit price for what the site lead has logged. */
export function materialSpend(job: Job, catalog: MaterialItem[]) {
  const usage = job.usage ?? {};
  return catalog.reduce((s, m) => s + (usage[m.id] ?? 0) * m.price, 0);
}

export function bagsUsed(job: Job, catalog: MaterialItem[]) {
  const usage = job.usage ?? {};
  return catalog.filter((m) => m.unit === "bag").reduce((s, m) => s + (usage[m.id] ?? 0), 0);
}

export function scaffoldNeeded(job: Job) {
  return job.scaffold.required !== false;
}

/** Man-days logged; older jobs without a log count full crews. */
export function manDaysLogged(job: Job, crewMen = 1) {
  return job.manDays ?? job.daysWorked * crewMen;
}

/** Closing a shift: one site day, men-on-site man-days, scaffold day only if there is scaffold. */
export function closeOutShift(job: Job, crewMen: number) {
  job.manDays = manDaysLogged(job, crewMen) + job.menOnSite;
  job.daysWorked += 1;
  if (scaffoldNeeded(job)) job.scaffold.daysUsed += 1;
}

/**
 * (Quoted + signed variations − materials − scaffold − GP floor) − labour spent,
 * expressed in full-crew days. Labour is charged per man actually on site.
 * Materials use the quoted allowance until logged usage goes over it.
 */
export function labourRunway(
  job: Job,
  variations: Variation[],
  gpFloor: number,
  dayRate: number,
  opts: { men?: number; spend?: number } = {},
) {
  const men = Math.max(1, opts.men ?? 1);
  const perMan = dayRate / men;
  const signed = variations.filter((v) => v.jobId === job.id && v.status === "signed").reduce((s, v) => s + v.cost, 0);
  const revenue = job.quoted + signed;
  const spend = opts.spend ?? 0;
  const material = Math.max(job.materialCost, spend);
  const scaffold = scaffoldNeeded(job) ? job.scaffoldCost : 0;
  const direct = material + scaffold;
  const floor = revenue * gpFloor;
  const manDays = manDaysLogged(job, men);
  const labourSpent = manDays * perMan;
  const affordable = dayRate > 0 ? (revenue - direct - floor) / dayRate : 0;
  const used = dayRate > 0 ? labourSpent / dayRate : 0;
  const remaining = affordable - used;
  const margin = revenue > 0 ? (revenue - direct - labourSpent) / revenue : 0;
  return {
    revenue, signed, direct, floor, affordable, used, remaining, margin, over: remaining < 0,
    perMan, manDays, labourSpent, materialAllowance: job.materialCost, materialSpend: spend, scaffold,
  };
}

export function runwayFor(job: Job, d: TenantData, tenant: Tenant, catalog: MaterialItem[]) {
  const crew: Crew | undefined = d.crews.find((c) => c.id === job.crewId);
  return labourRunway(job, d.variations, tenant.gpFloor, crew?.dayRate ?? tenant.defaultDayRate, {
    men: crew?.men ?? 3,
    spend: materialSpend(job, catalog),
  });
}
