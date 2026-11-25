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
    { code: "S5", name: "Silicone Topcoat (one-run float, batch logging)", short: "Topcoat", weatherSensitive: true, prep: false },
    { code: "S6", name: "Perimeter Seals & Clean Down", short: "Seals", weatherSensitive: false, prep: false },
  ],
};

export function stageDef(code: string): StageDef {
  const all = [...STAGES.monocouche, ...STAGES.silicone];
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

export function elevationDone(el: Elevation) {
  return el.stages.every((s) => s.status === "verified");
}

/** Marks a stage verified with its photo and unlocks the next one. */
export function verifyStage(el: Elevation, code: string, photo: string, at: string) {
  const i = el.stages.findIndex((s) => s.code === code);
  const st = el.stages[i];
  if (!st || st.status === "locked") return false;
  st.status = "verified";
  st.photo = photo;
  st.uploadedAt = at;
  st.review = "pending";
  const next = el.stages[i + 1];
  if (next && next.status === "locked") next.status = "upload";
  return true;
}

/** A rejected photo sends the stage back for a recoat and relocks everything after it. */
export function rejectStage(el: Elevation, code: string) {
  const i = el.stages.findIndex((s) => s.code === code);
  const st = el.stages[i];
  if (!st) return;
  st.status = "upload";
  st.review = "rejected";
  el.stages.forEach((s, j) => {
    if (j > i) {
      s.status = "locked";
      delete s.photo;
      delete s.review;
      delete s.uploadedAt;
    }
  });
}
