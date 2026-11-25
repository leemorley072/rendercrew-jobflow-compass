import { z } from "zod";
import { freshStages } from "./stages";
import type { Job, Region, SystemKind, TenantData } from "./types";

const REGION_COORDS: Record<Region, { x: number; y: number }> = {
  Leeds: { x: 0, y: 0 },
  Harrogate: { x: 5, y: 25 },
  York: { x: 30, y: 14 },
};

export const ghlWonPayload = z.object({
  type: z.literal("OpportunityStatusUpdate"),
  locationId: z.string().min(4),
  status: z.string(),
  id: z.string().min(3),
  name: z.string().min(2).max(120),
  monetaryValue: z.number().positive().max(1_000_000),
  contact: z.object({ name: z.string().min(2).max(80), address1: z.string().min(3).max(120), postalCode: z.string().min(2).max(10) }),
  customFields: z.object({
    region: z.enum(["Leeds", "Harrogate", "York"]),
    system: z.enum(["monocouche", "silicone", "ewi", "cork", "plaster"]),
    product: z.string().min(2).max(60),
    elevations: z.array(z.object({ name: z.string().min(1).max(30), area: z.number().positive().max(2000) })).min(1).max(8),
  }),
});
export type GhlWonPayload = z.infer<typeof ghlWonPayload>;

export function samplePayload(locationId: string) {
  const n = Math.floor(Math.random() * 90) + 10;
  return {
    type: "OpportunityStatusUpdate",
    locationId,
    status: "won",
    id: `opp_${Math.random().toString(36).slice(2, 10)}`,
    name: `${n} Station Road render`,
    monetaryValue: 11850,
    contact: { name: "Claire Ellison", address1: `${n} Station Road`, postalCode: "YO26 4QR" },
    customFields: {
      region: "York",
      system: "monocouche",
      product: "K-Rend Monocouche",
      elevations: [
        { name: "Front", area: 58 },
        { name: "Rear", area: 52 },
        { name: "Gable", area: 34 },
      ],
    },
  };
}

export function nextRef(d: TenantData) {
  const max = d.jobs.reduce((m, j) => Math.max(m, Number(j.ref.replace(/\D/g, "")) || 1000), 1050);
  return `RF-${max + 1}`;
}

export interface NewJobInput {
  address: string;
  postcode: string;
  customer: string;
  region: Region;
  system: SystemKind;
  menNeeded?: number;
  product: string;
  quoted: number;
  elevations: { name: string; area: number }[];
  /** False for ground-floor, tower or internal work with no scaffold hire. */
  scaffold?: boolean;
}

export function buildJob(d: TenantData, input: NewJobInput, source: "ghl" | "manual", oppId?: string): Job {
  const area = input.elevations.reduce((s, e) => s + e.area, 0);
  const c = REGION_COORDS[input.region];
  return {
    id: `j${Date.now().toString(36)}`,
    ref: nextRef(d),
    address: input.address,
    postcode: input.postcode,
    region: input.region,
    customer: input.customer,
    system: input.system,
    product: input.product,
    coords: { x: c.x + (Math.random() * 6 - 3), y: c.y + (Math.random() * 6 - 3) },
    elevations: input.elevations.map((e) => ({ name: e.name, area: e.area, stages: freshStages(input.system, 0) })),
    quoted: input.quoted,
    materialCost: Math.round(area * 19),
    scaffoldCost: input.scaffold === false ? 0 : Math.round(area * 8),
    scaffold: { hireDays: input.scaffold === false ? 0 : 21, daysUsed: 0, weeklyFee: 180, ...(input.scaffold === false ? { required: false } : {}) },
    menOnSite: 0,
    bags: 0,
    batches: [],
    daysWorked: 0,
    manDays: 0,
    usage: {},
    status: "intake",
    source,
    ...(oppId ? { ghlOpportunityId: oppId } : {}),
    ...(input.menNeeded ? { menNeeded: input.menNeeded } : {}),
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

export type IntakeResult = { status: number; message: string; job?: Job };

/** Same checks the live GoHighLevel webhook will run before a job is created. */
export function processWebhook(d: TenantData, locationId: string, raw: unknown): IntakeResult {
  const parsed = ghlWonPayload.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { status: 400, message: `Rejected: ${first?.path.join(".") || "payload"} — ${first?.message}` };
  }
  const p = parsed.data;
  if (p.locationId !== locationId) return { status: 403, message: `Rejected: location ${p.locationId} isn't linked to this account` };
  if (p.status.toLowerCase() !== "won") return { status: 202, message: `Ignored: opportunity status is "${p.status}", only won jobs are pulled` };
  if (d.jobs.some((j) => j.ghlOpportunityId === p.id)) return { status: 409, message: `Already pulled: opportunity ${p.id}` };
  const job = buildJob(
    d,
    {
      address: p.contact.address1,
      postcode: p.contact.postalCode,
      customer: p.contact.name,
      region: p.customFields.region,
      system: p.customFields.system,
      product: p.customFields.product,
      quoted: p.monetaryValue,
      elevations: p.customFields.elevations,
    },
    "ghl",
    p.id,
  );
  return { status: 200, message: `Won job created: ${job.ref} · ${job.address}`, job };
}
