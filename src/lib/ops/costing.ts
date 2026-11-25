import { labourFromEntries } from "./time";
import type { Worker, Crew, Job, MaterialItem, MaterialOverrides, Tenant, TenantData, Variation } from "./types";

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
  { id: "ewi-board", name: "EPS insulation board 100mm", unit: "board", supplier: "Minster", price: 9.8, system: "ewi" },
  { id: "ewi-dowel", name: "Mechanical fixing dowels (box 100)", unit: "box", supplier: "Minster", price: 38, system: "ewi" },
  { id: "ewi-adhesive", name: "EWI adhesive / basecoat 25kg", unit: "bag", supplier: "Minster", price: 12.5, system: "ewi" },
  { id: "ewi-mesh", name: "EWI reinforcing mesh 50m", unit: "roll", supplier: "Minster", price: 44, system: "ewi" },
  { id: "ewi-topcoat", name: "Silicone finish coat 25kg", unit: "tub", supplier: "Encon", price: 68, system: "ewi" },
  { id: "cork-corksol", name: "CorkSol spray cork 25kg", unit: "tub", supplier: "CorkSol", price: 115, system: "cork" },
  { id: "cork-spraycork", name: "SprayCork UK 15kg", unit: "tub", supplier: "SprayCork UK", price: 89, system: "cork" },
  { id: "cork-primer", name: "Cork substrate primer 5L", unit: "tub", supplier: "CorkSol", price: 32, system: "cork" },
  { id: "plaster-finish", name: "Multi-finish plaster 25kg", unit: "bag", supplier: "Travis Perkins", price: 9.6, system: "plaster" },
  { id: "plaster-bonding", name: "Bonding coat 25kg", unit: "bag", supplier: "Travis Perkins", price: 11.2, system: "plaster" },
  { id: "plaster-pva", name: "PVA / Blue Grit 5L", unit: "tub", supplier: "Travis Perkins", price: 18, system: "plaster" },
  { id: "plaster-scrim", name: "Scrim tape 90m", unit: "roll", supplier: "Travis Perkins", price: 3.5, system: "plaster" },
  { id: "pb-95", name: "Plasterboard 9.5mm 2.4×1.2m", unit: "sheet", supplier: "CCF", price: 8.4, system: "plaster" },
  { id: "pb-125", name: "Plasterboard 12.5mm 2.4×1.2m", unit: "sheet", supplier: "CCF", price: 9.2, system: "plaster" },
  { id: "pb-mr", name: "Moisture resistant board 12.5mm", unit: "sheet", supplier: "CCF", price: 13.5, system: "plaster" },
  { id: "pb-sound", name: "Acoustic / sound board 12.5mm", unit: "sheet", supplier: "CCF", price: 15.8, system: "plaster" },
  { id: "pb-fire", name: "Fire board 12.5mm", unit: "sheet", supplier: "CCF", price: 12.9, system: "plaster" },
  { id: "pb-adhesive", name: "Plasterboard adhesive (dot & dab) 25kg", unit: "bag", supplier: "Travis Perkins", price: 10.4, system: "plaster" },
  { id: "pb-screws", name: "Drywall screws 38mm (box 1000)", unit: "box", supplier: "Travis Perkins", price: 14, system: "plaster" },
  { id: "skim-angle", name: "Skim coat angle bead 2.4m", unit: "length", supplier: "SIG", price: 1.9, system: "plaster" },
  { id: "skim-stop", name: "Skim coat stop bead 2.4m", unit: "length", supplier: "SIG", price: 2.1, system: "plaster" },
  { id: "plaster-hardwall", name: "Hardwall backing plaster 25kg", unit: "bag", supplier: "Travis Perkins", price: 10.8, system: "plaster" },
  { id: "roof-biocide", name: "Roof biocide 25L", unit: "drum", supplier: "Roof Coatings Direct", price: 58, system: "roof" },
  { id: "roof-primer", name: "Roof tile primer 20L", unit: "tub", supplier: "Roof Coatings Direct", price: 92, system: "roof" },
  { id: "roof-coating", name: "Acrylic roof coating 20L", unit: "tub", supplier: "Roof Coatings Direct", price: 135, system: "roof" },
  { id: "roof-ridge", name: "Ridge bedding mortar 25kg", unit: "bag", supplier: "Travis Perkins", price: 9.5, system: "roof" },
  { id: "floor-primer", name: "Epoxy primer 5kg kit", unit: "kit", supplier: "Resin Supplies UK", price: 78, system: "floor" },
  { id: "floor-body", name: "Epoxy body coat 10kg kit", unit: "kit", supplier: "Resin Supplies UK", price: 145, system: "floor" },
  { id: "floor-flake", name: "Decorative flake 1kg", unit: "bag", supplier: "Resin Supplies UK", price: 16, system: "floor" },
  { id: "floor-pu", name: "Polyurethane topcoat 5kg kit", unit: "kit", supplier: "Resin Supplies UK", price: 118, system: "floor" },
  { id: "floor-filler", name: "Epoxy crack filler 1kg", unit: "tub", supplier: "Resin Supplies UK", price: 24, system: "floor" },
  { id: "wc-biocide", name: "Masonry biocide 5L", unit: "tub", supplier: "Sandtex Trade", price: 22, system: "wallcoat" },
  { id: "wc-stabiliser", name: "Stabilising primer 10L", unit: "tub", supplier: "Sandtex Trade", price: 48, system: "wallcoat" },
  { id: "wc-filler", name: "Masonry crack filler 10kg", unit: "tub", supplier: "Sandtex Trade", price: 19, system: "wallcoat" },
  { id: "wc-coating", name: "Textured wall coating 15L", unit: "tub", supplier: "Sandtex Trade", price: 62, system: "wallcoat" },
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
export function closeOutShift(job: Job, crewMen: number, opts: { date?: string; timed?: boolean } = {}) {
  // With check-ins, labour comes from each worker's own shift, so the legacy man-day log is frozen.
  job.manDays = manDaysLogged(job, crewMen) + (opts.timed ? 0 : job.menOnSite);
  if (opts.date) job.closedOutOn = opts.date;
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
  opts: { men?: number; spend?: number; timed?: { cost: number; shifts: number } } = {},
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
  const legacy = manDaysLogged(job, men);
  const manDays = legacy + (opts.timed?.shifts ?? 0);
  const labourSpent = legacy * perMan + (opts.timed?.cost ?? 0);
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
    timed: labourFromEntries(d.timeEntries ?? [], job.id),
  });
}

/** Team men, day rate and skills follow its individual workers. */
export function syncCrew(crew: Crew, workers: Worker[]) {
  const members = (crew.memberIds ?? []).map((id) => workers.find((w) => w.id === id)).filter((w): w is Worker => !!w);
  if (members.length === 0) return crew;
  crew.memberIds = members.map((m) => m.id);
  if (!crew.driverId || !crew.memberIds.includes(crew.driverId)) crew.driverId = members[0]!.id;
  const driver = members.find((m) => m.id === crew.driverId)!;
  crew.men = members.length;
  crew.dayRate = members.reduce((s, m) => s + m.dayRate, 0);
  crew.skills = [...new Set(members.flatMap((m) => m.skills))];
  crew.lead = driver.name.split(" ")[0]!;
  crew.phone = driver.phone;
  crew.base = driver.base;
  return crew;
}
