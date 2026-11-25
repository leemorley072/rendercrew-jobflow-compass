import { currentStage, stageDef } from "./stages";
import type { Job, Region } from "./types";

export const SECTOR: Record<Region, string> = { Harrogate: "North Sector", Leeds: "Leeds Sector", York: "East Sector" };

export function stageLabel(job: Job) {
  if (job.status === "complete") return "All: Complete";
  const cur = job.elevations.map((e) => ({ e, c: currentStage(e) })).filter((x) => x.c);
  if (cur.length === 0) return "All: Complete";
  const codes = new Set(cur.map((x) => x.c!.code));
  if (codes.size === 1 && cur.length === job.elevations.length) return `All: ${stageDef(cur[0]!.c!.code).short}`;
  return `${cur[0]!.e.name}: ${stageDef(cur[0]!.c!.code).short}`;
}
