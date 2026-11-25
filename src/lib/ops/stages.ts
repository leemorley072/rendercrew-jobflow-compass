import type { Elevation, Stage, StageDef, SystemKind } from "./types";

export const STAGES: Record<SystemKind, StageDef[]> = {
  monocouche: [
    { code: "M1", name: "Substrate Prep & Masking", short: "Substrate", weatherSensitive: false, prep: true },
    { code: "M2", name: "Beading & Stress Patches", short: "Beading", weatherSensitive: false, prep: true },
    { code: "M3", name: "1st Pass & Bedding", short: "1st Pass", weatherSensitive: true, prep: false },
    { code: "M4", name: "2nd Pass Wet-on-Wet (18mm gauge)", short: "2nd Pass", weatherSensitive: true, prep: false },
    { code: "M5", name: "Scraping & Texture (critical cure window)", short: "Scratch", weatherSensitive: true, prep: false },
    { code: "M6", name: "Mastic & Demasking", short: "Mastic", weatherSensitive: false, prep: false },
  ],
  silicone: [
    { code: "S1", name: "Substrate/Carrier Board & Masking", short: "Substrate", weatherSensitive: false, prep: true },
    { code: "S2", name: "Beads & Opening Patches", short: "Beads", weatherSensitive: false, prep: true },
    { code: "S3", name: "Basecoat & 100% Mesh Embed (zero grin-through)", short: "Mesh Overlap", weatherSensitive: true, prep: false },
    { code: "S4", name: "Tinted Primer Coat (moisture check)", short: "Primer", weatherSensitive: true, prep: false },
    { code: "S5", name: "Silicone Topcoat (one-run float)", short: "Topcoat", weatherSensitive: true, prep: false },
    { code: "S6", name: "Perimeter Seals & Clean Down", short: "Seals", weatherSensitive: false, prep: false },
  ],
  ewi: [
    { code: "E1", name: "Insulation Board Fixing & Adhesive", short: "Boarding", weatherSensitive: false, prep: true },
    { code: "E2", name: "Mechanical Dowel Pinning (8 per m²)", short: "Dowels", weatherSensitive: false, prep: true },
    { code: "E3", name: "Basecoat & Mesh Embed", short: "Basecoat", weatherSensitive: true, prep: false },
    { code: "E4", name: "Primer & Finish Coat", short: "Finish", weatherSensitive: true, prep: false },
    { code: "E5", name: "Seals, Trims & Clean Down", short: "Seals", weatherSensitive: false, prep: false },
  ],
  cork: [
    { code: "C1", name: "Primer & Masking", short: "Primer", weatherSensitive: false, prep: true },
    { code: "C2", name: "1st Spray Cork Pass", short: "1st Spray", weatherSensitive: true, prep: false },
    { code: "C3", name: "2nd Spray & Texture Finish", short: "Finish", weatherSensitive: true, prep: false },
  ],
  plaster: [
    { code: "P1", name: "Before Photos", short: "Before", weatherSensitive: false, prep: true },
    { code: "P2", name: "Prep Work Done", short: "Prep", weatherSensitive: false, prep: true },
    { code: "P3", name: "Plastering Finished", short: "Finished", weatherSensitive: false, prep: false },
  ],
  roof: [
    { code: "R1", name: "Power Wash & Biocide", short: "Wash", weatherSensitive: false, prep: true },
    { code: "R2", name: "Tile, Ridge & Valley Repairs", short: "Repairs", weatherSensitive: false, prep: true },
    { code: "R3", name: "1st Roof Coating", short: "1st Coat", weatherSensitive: true, prep: false },
    { code: "R4", name: "2nd Topcoat & Seal", short: "Topcoat", weatherSensitive: true, prep: false },
  ],
  floor: [
    { code: "F1", name: "Diamond Grind / Shot Blast", short: "Grind", weatherSensitive: false, prep: true },
    { code: "F2", name: "Epoxy Primer & Crack Fill", short: "Primer", weatherSensitive: false, prep: true },
    { code: "F3", name: "Body Coat / Flake Broadcast", short: "Body Coat", weatherSensitive: false, prep: false },
    { code: "F4", name: "Polyurethane Topcoat", short: "Topcoat", weatherSensitive: false, prep: false },
  ],
  wallcoat: [
    { code: "W1", name: "Power Wash & Biocide", short: "Wash", weatherSensitive: false, prep: true },
    { code: "W2", name: "Crack Repair & Masking", short: "Repairs", weatherSensitive: false, prep: true },
    { code: "W3", name: "Stabilising Primer", short: "Primer", weatherSensitive: true, prep: false },
    { code: "W4", name: "Textured / Elastomeric Wall Coating", short: "Coating", weatherSensitive: true, prep: false },
  ],
};

export const SYSTEM_LABEL: Record<SystemKind, string> = {
  silicone: "Silicone Render",
  monocouche: "Monocouche Render",
  ewi: "External Wall Insulation",
  cork: "Sprayed Cork",
  plaster: "Internal Plastering",
  roof: "Roof Coating",
  floor: "Resin Floor Coating",
  wallcoat: "Exterior Wall Coating",
};
export const SYSTEMS = Object.keys(SYSTEM_LABEL) as SystemKind[];
export const DEFAULT_PRODUCT: Record<SystemKind, string> = {
  silicone: "Weber Silicone",
  monocouche: "K-Rend Monocouche",
  ewi: "Parex EWI",
  cork: "CorkSol",
  plaster: "Multi-Finish Skim",
  roof: "Acrylic Roof Coating",
  floor: "Epoxy Resin System",
  wallcoat: "Textured Masonry Coating",
};
/** Indoor work a rained-off team can safely be sent to. */
export const INDOOR: Record<SystemKind, boolean> = { silicone: false, monocouche: false, ewi: false, cork: false, plaster: true, roof: false, floor: true, wallcoat: false };
/** Typical headcount when the office doesn't set one. */
export const DEFAULT_MEN: Record<SystemKind, number> = { silicone: 3, monocouche: 3, ewi: 3, cork: 2, plaster: 1, roof: 2, floor: 2, wallcoat: 2 };

export function stageDef(code: string): StageDef {
  const all = Object.values(STAGES).flat();
  return all.find((s) => s.code === code) ?? all[0]!;
}

export function freshStages(system: SystemKind, verifiedCount = 0): Stage[] {
  return STAGES[system].map((d, i) => ({
    code: d.code,
    status: i < verifiedCount ? "verified" : i === verifiedCount ? "upload" : "locked",
    ...(i < verifiedCount ? { review: "approved" as const } : {}),
  }));
}

export function currentStage(el: Elevation): Stage | undefined {
  return el.stages.find((s) => s.status === "upload");
}

/** Done only when every stage photo is in and the office has approved it. */
export function elevationDone(el: Elevation) {
  return el.stages.every((s) => s.status === "verified" && s.review !== "pending");
}

/** Records the stage photo; the next stage stays locked until the office approves it. */
export function verifyStage(el: Elevation, code: string, photo: string, at: string) {
  const i = el.stages.findIndex((s) => s.code === code);
  const st = el.stages[i];
  if (!st || st.status === "locked") return false;
  st.status = "verified";
  st.photo = photo;
  st.uploadedAt = at;
  st.review = "pending";
  delete st.rejectNote;
  delete st.rejectedAt;
  return true;
}

/** Office approval: marks the photo approved and unlocks the next stage. */
export function approveStage(el: Elevation, code: string) {
  const i = el.stages.findIndex((s) => s.code === code);
  const st = el.stages[i];
  if (!st || st.status !== "verified") return false;
  st.review = "approved";
  const next = el.stages[i + 1];
  if (next && next.status === "locked") next.status = "upload";
  return true;
}

/** A rejected photo sends the stage back for a recoat and relocks everything after it. */
export function rejectStage(el: Elevation, code: string, note = "", at = new Date().toISOString()) {
  const i = el.stages.findIndex((s) => s.code === code);
  const st = el.stages[i];
  if (!st) return;
  st.status = "upload";
  st.review = "rejected";
  st.rejectNote = note.trim() || "Not up to standard — redo and re-photograph.";
  st.rejectedAt = at;
  el.stages.forEach((s, j) => {
    if (j > i) {
      s.status = "locked";
      delete s.photo;
      delete s.review;
      delete s.uploadedAt;
    }
  });
}
