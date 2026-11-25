import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { seedState, seedTenantData } from "./seed";
import { DEFAULT_MATERIALS, resolveCatalog } from "./costing";
import type { MaterialItem, OpsState, Tenant, TenantData } from "./types";

const KEY = "renderfuel-ops-v1";

interface Ctx {
  state: OpsState;
  tenant: Tenant;
  data: TenantData;
  /** Active contractor's price book: agency benchmark with their own prices on top. */
  catalog: MaterialItem[];
  mutate: (fn: (s: OpsState) => void) => void;
  mutateData: (fn: (d: TenantData, t: Tenant) => void) => void;
  reset: () => void;
}

const OpsContext = createContext<Ctx | null>(null);

export function OpsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpsState>(seedState);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as OpsState;
        if (!s.agencyMaterials) s.agencyMaterials = structuredClone(DEFAULT_MATERIALS);
        // Bring in new price-book items (EWI, cork, plastering) added since this browser last saved.
        for (const m of DEFAULT_MATERIALS) if (!s.agencyMaterials.some((x) => x.id === m.id)) s.agencyMaterials.push(structuredClone(m));
        const fresh = seedTenantData();
        for (const [id, d] of Object.entries(s.data)) {
          d.timeEntries ??= id === "t1" ? (fresh.timeEntries ?? []) : [];
          if (d.workers) continue;
          if (id === "t1") {
            d.workers = fresh.workers ?? [];
            for (const c of fresh.crews) {
              const old = d.crews.find((x) => x.id === c.id);
              if (old) Object.assign(old, { memberIds: c.memberIds, driverId: c.driverId });
              else d.crews.push(c);
            }
            for (const j of fresh.jobs) if (!d.jobs.some((x) => x.id === j.id)) d.jobs.push(j);
            for (const b of fresh.bookings) if (!d.bookings.some((x) => x.id === b.id)) d.bookings.push(b);
            s.activeWorkerId ??= "w4";
          } else d.workers = [];
        }
        setState(s);
      }
    } catch {
      /* corrupt store: keep seed */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      toast.error("Phone storage is full — older photos may not be kept.");
    }
  }, [state]);

  const mutate = useCallback((fn: (s: OpsState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const mutateData = useCallback(
    (fn: (d: TenantData, t: Tenant) => void) =>
      mutate((s) => {
        const t = s.tenants.find((x) => x.id === s.activeTenantId)!;
        fn(s.data[s.activeTenantId]!, t);
      }),
    [mutate],
  );

  const reset = useCallback(() => setState(seedState()), []);

  const tenant = state.tenants.find((t) => t.id === state.activeTenantId) ?? state.tenants[0]!;
  const data = state.data[tenant.id]!;
  const catalog = resolveCatalog(state.agencyMaterials, data.materialOverrides);
  return <OpsContext.Provider value={{ state, tenant, data, catalog, mutate, mutateData, reset }}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const c = useContext(OpsContext);
  if (!c) throw new Error("useOps outside OpsProvider");
  return c;
}

export function nowLabel() {
  const d = new Date();
  const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${t} · ${day}`;
}

/** Downscales a photo so many fit in phone storage. */
export function readPhoto(file: File, max = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => reject(new Error("That file isn't a photo we can read."));
    img.src = url;
  });
}
