import feedMesh from "@/assets/feed-mesh.jpg";
import feedDowel from "@/assets/feed-dowel.jpg";
import feedScratch from "@/assets/feed-scratch.jpg";
import brick1 from "@/assets/defect-brick-1.jpg";
import brick2 from "@/assets/defect-brick-2.jpg";
import { freshStages } from "./stages";
import { DEFAULT_MATERIALS } from "./costing";
import type { DayWeather, Job, OpsState, Region, SystemKind, TenantData, Worker } from "./types";

const dry = (temp = 14): DayWeather => ({ rain: 10, temp });

function forecast(): Record<Region, DayWeather[]> {
  const mk = (t: number) => Array.from({ length: 14 }, (_, i) => dry(t + ((i * 3) % 3) - 1));
  const f = { Leeds: mk(14), Harrogate: mk(13), York: mk(14) };
  f.Leeds[3] = dry(14);
  f.York[3] = dry(14);
  f.Harrogate[3] = { rain: 65, temp: 12, note: "Heavy showers expected 14:00-16:30" };
  return f;
}

function withPhotos(job: Job, elevation: string, upto: number, photo: string) {
  const el = job.elevations.find((e) => e.name === elevation)!;
  el.stages.forEach((s, i) => {
    if (i < upto) {
      s.photo = photo;
      s.uploadedAt = "2026-11-20T09:00:00Z";
    }
  });
}

export function SEED_WORKERS(): Worker[] {
  const w = (id: string, name: string, phone: string, postcode: string, dayRate: number, skills: SystemKind[], ownTransport: boolean, base: { x: number; y: number }): Worker =>
    ({ id, name, phone, email: `${name.split(" ")[0]!.toLowerCase()}@yorkshirerender.co.uk`, postcode, dayRate, skills, ownTransport, base });
  return [
    w("w1", "Marcus Reid", "07700 900101", "HG2 8AB", 210, ["ewi", "silicone", "plaster"], true, { x: 3, y: 18 }),
    w("w2", "Callum Shaw", "07700 900102", "HG1 3DE", 180, ["ewi", "plaster"], true, { x: 4, y: 22 }),
    w("w3", "Josh Pickard", "07700 900103", "LS22 6FG", 180, ["ewi"], false, { x: 2, y: 16 }),
    w("w4", "Dan Fletcher", "07700 900104", "HG5 0HJ", 220, ["silicone", "monocouche"], true, { x: 3, y: 20 }),
    w("w5", "Ryan Cole", "07700 900105", "HG5 9KL", 190, ["silicone", "monocouche", "plaster"], false, { x: 4, y: 21 }),
    w("w6", "Tom Ashby", "07700 900106", "LS17 5MN", 190, ["monocouche"], false, { x: 1, y: 12 }),
    w("w7", "Kev Holt", "07700 900107", "HG3 2PQ", 190, ["silicone", "plaster"], true, { x: 8, y: 21 }),
    w("w8", "Liam Dunn", "07700 900108", "HG3 4RS", 170, ["plaster"], true, { x: 9, y: 23 }),
    w("w9", "Lewis Grant", "07700 900109", "HG1 5TU", 200, ["plaster", "cork"], true, { x: 6, y: 20 }),
  ];
}

export function seedTenantData(): TenantData {
  const jobs: Job[] = [
    {
      id: "j1042", ref: "RF-1042", address: "24 Elm Grove", postcode: "HG2 7JQ", region: "Harrogate", customer: "P. Whitaker",
      system: "silicone", product: "Weber Silicone", coords: { x: 4, y: 26 },
      elevations: [
        { name: "Front", area: 52, stages: freshStages("silicone", 3) },
        { name: "Rear", area: 58, stages: freshStages("silicone", 2) },
        { name: "Gable", area: 30, stages: freshStages("silicone", 2) },
      ],
      quoted: 13800, materialCost: 2900, scaffoldCost: 1260, scaffold: { hireDays: 21, daysUsed: 15, weeklyFee: 180 },
      menOnSite: 3, bags: 22, batches: [], daysWorked: 6, crewId: "g1", status: "active", source: "ghl", createdAt: "2026-10-28",
    },
    {
      id: "j1039", ref: "RF-1039", address: "12 Highfield Road", postcode: "LS6 2BN", region: "Leeds", customer: "S. Dawson",
      system: "monocouche", product: "K-Rend Monocouche", coords: { x: 2, y: 3 },
      elevations: [
        { name: "Front", area: 90, stages: freshStages("monocouche", 4) },
        { name: "Rear", area: 80, stages: freshStages("monocouche", 5) },
        { name: "Gable", area: 40, stages: freshStages("monocouche", 5) },
      ],
      quoted: 16800, materialCost: 3200, scaffoldCost: 1400, scaffold: { hireDays: 21, daysUsed: 20, weeklyFee: 180 },
      menOnSite: 4, bags: 61, batches: [], daysWorked: 7.5, crewId: "g2", status: "active", source: "ghl", createdAt: "2026-10-14",
    },
    {
      id: "j1045", ref: "RF-1045", address: "Oakwood Villas", postcode: "HG1 4AF", region: "Harrogate", customer: "Oakwood Mgmt Ltd",
      system: "silicone", product: "Parex EWI", coords: { x: 7, y: 23 },
      elevations: [
        { name: "Front", area: 40, stages: freshStages("silicone", 1) },
        { name: "Rear", area: 35, stages: freshStages("silicone", 0) },
        { name: "Gable", area: 20, stages: freshStages("silicone", 0) },
      ],
      quoted: 11200, materialCost: 3800, scaffoldCost: 1100, scaffold: { hireDays: 28, daysUsed: 17, weeklyFee: 160 },
      menOnSite: 2, bags: 0, batches: [], daysWorked: 3, crewId: "g3", status: "active", source: "ghl", createdAt: "2026-11-02",
    },
    {
      id: "j1035", ref: "RF-1035", address: "Wharfedale House", postcode: "LS21 1AB", region: "Leeds", customer: "R. & K. Nolan",
      system: "silicone", product: "Silicone", coords: { x: -8, y: 12 },
      elevations: [
        { name: "Front", area: 70, stages: freshStages("silicone", 6) },
        { name: "Rear", area: 70, stages: freshStages("silicone", 6) },
        { name: "Gable", area: 40, stages: freshStages("silicone", 6) },
      ],
      quoted: 15400, materialCost: 3500, scaffoldCost: 1300, scaffold: { hireDays: 28, daysUsed: 26, weeklyFee: 180, struck: true },
      menOnSite: 0, bags: 74, batches: ["SIL-2291-A", "SIL-2291-B"], daysWorked: 15, crewId: "g4", status: "complete", source: "ghl",
      createdAt: "2026-09-30", completedAt: "2026-11-06", warrantyExported: true, reviewRequested: true,
    },
    {
      id: "j1047", ref: "RF-1047", address: "12 Orchard Way", postcode: "YO24 3DL", region: "York", customer: "J. Hartley",
      system: "silicone", product: "Weber Silicone", coords: { x: 29, y: 15 },
      elevations: [
        { name: "Front", area: 62, stages: freshStages("silicone", 3) },
        { name: "Rear", area: 48, stages: freshStages("silicone", 2), defect: "Substrate Damage Detected" },
        { name: "Gable", area: 30, stages: freshStages("silicone", 1) },
      ],
      quoted: 12600, materialCost: 2600, scaffoldCost: 1200, scaffold: { hireDays: 14, daysUsed: 8, weeklyFee: 180 },
      menOnSite: 3, bags: 14, batches: [], daysWorked: 5, crewId: "g2", status: "active", source: "ghl", createdAt: "2026-11-05",
    },
    {
      id: "j1048", ref: "RF-1048", address: "44 Victoria Road", postcode: "LS11 6EF", region: "Leeds", customer: "A. Begum",
      system: "monocouche", product: "K-Rend Monocouche", coords: { x: -1, y: -2 },
      elevations: [
        { name: "Front", area: 45, stages: freshStages("monocouche", 1) },
        { name: "Rear", area: 50, stages: freshStages("monocouche", 1) },
      ],
      quoted: 9400, materialCost: 1900, scaffoldCost: 950, scaffold: { hireDays: 21, daysUsed: 4, weeklyFee: 150 },
      menOnSite: 2, bags: 0, batches: [], daysWorked: 2, crewId: "g4", status: "active", source: "ghl", createdAt: "2026-11-10",
    },
    {
      id: "j1049", ref: "RF-1049", address: "9 Bramble Lane", postcode: "HG3 2PL", region: "Harrogate", customer: "M. Fenwick",
      system: "monocouche", product: "Weber Monocouche", coords: { x: 6, y: 27 },
      elevations: [
        { name: "Front", area: 38, stages: freshStages("monocouche", 0) },
        { name: "Gable", area: 26, stages: freshStages("monocouche", 0) },
      ],
      quoted: 7600, materialCost: 1500, scaffoldCost: 800, scaffold: { hireDays: 21, daysUsed: 1, weeklyFee: 150 },
      menOnSite: 0, bags: 0, batches: [], daysWorked: 0, status: "active", source: "manual", createdAt: "2026-11-18",
    },
    {
      id: "j1050", ref: "RF-1050", address: "The Old Rectory", postcode: "HG1 5QT", region: "Harrogate", customer: "Rev. & Mrs Ashworth",
      system: "silicone", product: "Weber Silicone", coords: { x: 5, y: 29 },
      elevations: [
        { name: "Front", area: 70, stages: freshStages("silicone", 0) },
        { name: "Rear", area: 65, stages: freshStages("silicone", 0) },
        { name: "Gable", area: 40, stages: freshStages("silicone", 0) },
      ],
      quoted: 14200, materialCost: 3300, scaffoldCost: 1400, scaffold: { hireDays: 21, daysUsed: 0, weeklyFee: 180 },
      menOnSite: 0, bags: 0, batches: [], daysWorked: 0, status: "intake", source: "ghl", ghlOpportunityId: "opp_7Hq2Rectory", createdAt: "2026-11-25",
    },
    {
      id: "j1052", ref: "RF-1052", address: "3 Kirkgate (internal skim)", postcode: "HG1 2PT", region: "Harrogate", customer: "L. Harper",
      system: "plaster", product: "Multi-Finish Skim", coords: { x: 5, y: 22 }, menNeeded: 1,
      elevations: [
        { name: "Lounge", area: 28, stages: freshStages("plaster", 1) },
        { name: "Bedroom 1", area: 18, stages: freshStages("plaster", 0) },
      ],
      quoted: 1450, materialCost: 120, scaffoldCost: 0, scaffold: { hireDays: 0, daysUsed: 0, weeklyFee: 0, required: false },
      menOnSite: 1, bags: 0, batches: [], daysWorked: 1, manDays: 1, usage: {}, crewId: "g5", status: "active", source: "manual", createdAt: "2026-11-20",
    },
    {
      id: "j1053", ref: "RF-1053", address: "Mill Cottage", postcode: "HG3 1RW", region: "Harrogate", customer: "T. Brennan",
      system: "cork", product: "CorkSol", coords: { x: 9, y: 27 }, menNeeded: 2,
      elevations: [
        { name: "Front", area: 45, stages: freshStages("cork", 0) },
        { name: "Rear", area: 40, stages: freshStages("cork", 0) },
      ],
      quoted: 6200, materialCost: 1300, scaffoldCost: 0, scaffold: { hireDays: 0, daysUsed: 0, weeklyFee: 0, required: false },
      menOnSite: 0, bags: 0, batches: [], daysWorked: 0, manDays: 0, usage: {}, status: "active", source: "ghl", createdAt: "2026-11-22",
    },
  ];
  withPhotos(jobs[0]!, "Front", 3, feedMesh);
  withPhotos(jobs[4]!, "Rear", 2, feedMesh);
  withPhotos(jobs[4]!, "Front", 3, feedMesh);
  // Live feed items awaiting review
  const elm = jobs[0]!.elevations[1]!.stages[1]!;
  Object.assign(elm, { photo: feedMesh, review: "pending", uploadedAt: "2026-11-25T08:12:00Z" });
  jobs[0]!.elevations[1]!.stages[1]!.status = "verified";
  const oak = jobs[2]!.elevations[0]!.stages[0]!;
  Object.assign(oak, { photo: feedDowel, review: "pending", uploadedAt: "2026-11-25T07:58:00Z" });
  const hf = jobs[1]!.elevations[0]!.stages[4]!;
  Object.assign(hf, { photo: feedScratch, review: "rejected", uploadedAt: "2026-11-25T07:40:00Z" });

  return {
    jobs,
    variations: [
      {
        id: "v1", number: "VAR-01", jobId: "j1047", elevation: "Rear", headline: "Blown Brickwork",
        title: "Blown brickwork and crumbling mortar",
        description: "Uncovered beneath the old render on the lower left bay, beside the kitchen window.",
        photos: [{ src: brick1, at: "09:42 · 12 Jun" }, { src: brick2, at: "09:44 · 12 Jun" }],
        items: [{ name: "Brickwork repair", qty: "3.5m²" }, { name: "Bonding basecoat", qty: "2 bags" }, { name: "Anti-crack mesh patch", qty: "4m²" }],
        cost: 240, siteDays: 0.5, scaffoldDays: 0, homeowner: "J. Hartley", status: "pending",
      },
      {
        id: "v2", number: "VAR-01", jobId: "j1042", elevation: "Rear", headline: "Window Reveal Rebuild",
        title: "Rotten timber reveal behind render",
        description: "Rear bedroom window reveal needs rebuilding before beads go on.",
        photos: [], items: [{ name: "Reveal rebuild", qty: "1 no." }, { name: "Carrier board", qty: "1.2m²" }],
        cost: 240, siteDays: 0.5, scaffoldDays: 0, homeowner: "P. Whitaker", status: "pending",
      },
      {
        id: "v3", number: "VAR-02", jobId: "j1048", elevation: "Front", headline: "Bay Lintel Patch",
        title: "Cracked bay lintel", description: "Stress crack across the bay lintel needs a stitch and patch.",
        photos: [], items: [{ name: "Helical stitch", qty: "2.4m" }, { name: "Stress patch mesh", qty: "3m²" }],
        cost: 400, siteDays: 1, scaffoldDays: 0, homeowner: "A. Begum", status: "pending",
      },
    ],
    crews: [
      { id: "g1", name: "Gang 1 · Marcus", lead: "Marcus", men: 3, skills: ["ewi", "prep"], specialty: "EWI/Boarding", certs: "Parex EWI Approved", dayRate: 570, base: { x: 3, y: 18 }, phone: "", memberIds: ["w1", "w2", "w3"], driverId: "w1" },
      { id: "g2", name: "Gang 2 · Dan", lead: "Dan", men: 3, skills: ["silicone", "monocouche"], specialty: "Spray Silicone", certs: "Weber Spray Certified", dayRate: 600, base: { x: 3, y: 20 }, phone: "", memberIds: ["w4", "w5", "w6"], driverId: "w4" },
      { id: "g3", name: "Gang 3 · Kev", lead: "Kev", men: 2, skills: ["prep"], specialty: "Prep & Patch", certs: "Prep & Patch", dayRate: 360, base: { x: 8, y: 21 }, phone: "", memberIds: ["w7", "w8"], driverId: "w7" },
      { id: "g4", name: "Gang 4 · Dave", lead: "Dave", men: 4, skills: ["monocouche", "commercial"], specialty: "Commercial", certs: "K-Rend Approved", dayRate: 760, base: { x: -4, y: 4 }, phone: "" },
      { id: "g5", name: "Solo · Lewis", lead: "Lewis", men: 1, skills: ["plaster", "cork"], specialty: "Plastering & Cork", certs: "CorkSol Applicator", dayRate: 200, base: { x: 6, y: 20 }, phone: "", memberIds: ["w9"], driverId: "w9" },
    ],
    workers: SEED_WORKERS(),
    bookings: [
      { id: "b1", crewId: "g1", start: 0, len: 3, kind: "work", label: "#1042 · Elm Grove Basecoat", jobId: "j1042", stageCode: "S3" },
      { id: "b2", crewId: "g1", start: 3, len: 1, kind: "hold", label: "Rain Hold" },
      { id: "b3", crewId: "g1", start: 4, len: 1, kind: "work", label: "Primer Coat", jobId: "j1042", stageCode: "S4" },
      { id: "b4", crewId: "g2", start: 0, len: 2, kind: "work", label: "#1039 · Highfield Scratch", jobId: "j1039", stageCode: "M5" },
      { id: "b5", crewId: "g2", start: 2, len: 1, kind: "gap", label: "Curing Gap" },
      { id: "b6", crewId: "g3", start: 0, len: 3, kind: "work", label: "#1045 · Oakwood Prep", jobId: "j1045", stageCode: "S1" },
      { id: "b7", crewId: "g3", start: 3, len: 2, kind: "hold", label: "Rain Delay" },
      { id: "b8", crewId: "g4", start: 0, len: 1, kind: "work", label: "#1035 Wharfedale", jobId: "j1035", stageCode: "S6" },
      { id: "b9", crewId: "g4", start: 1, len: 1, kind: "depot", label: "Depot Service" },
      { id: "b10", crewId: "g2", start: 3, len: 2, kind: "work", label: "#1039 · Highfield Mastic", jobId: "j1039", stageCode: "M6" },
      { id: "b11", crewId: "g5", start: 2, len: 3, kind: "work", label: "#1052 · Kirkgate Skim", jobId: "j1052", stageCode: "P2" },
    ],
    forecast: forecast(),
    rainOverrides: [],
    webhookLog: [],
    materialOverrides: { basecoat: { supplier: "Minster Leeds", price: 10.5 }, topcoat: { supplier: "Encon Leeds", price: 62 } },
  };
}

export function emptyTenantData(): TenantData {
  return { jobs: [], variations: [], crews: [], bookings: [], forecast: forecast(), rainOverrides: [], webhookLog: [], workers: [] };
}

export function seedState(): OpsState {
  return {
    role: "boss",
    activeWorkerId: "w4",
    activeTenantId: "t1",
    tenants: [
      { id: "t1", name: "Yorkshire Render Co", ghlLocationId: "ve9EPM428h8vShlRW1KT", homeRegion: "Leeds", gpFloor: 0.25, defaultDayRate: 570, createdAt: "2026-06-01" },
      { id: "t2", name: "Pennine Facades", ghlLocationId: "Kd82LmQx0PzR4tYw1Nc7", homeRegion: "Harrogate", gpFloor: 0.28, defaultDayRate: 600, createdAt: "2026-09-12" },
    ],
    data: { t1: seedTenantData(), t2: emptyTenantData() },
    agencyMaterials: structuredClone(DEFAULT_MATERIALS),
  };
}
