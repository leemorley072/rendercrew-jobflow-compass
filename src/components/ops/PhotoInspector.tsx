import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { stageDef } from "@/lib/ops/stages";
import type { Elevation, Job, Stage } from "@/lib/ops/types";
import { cn } from "@/lib/utils";

export const REJECT_PRESETS = [
  "Mesh overlap under 100mm",
  "Mesh showing / not fully embedded",
  "Beads out of plumb or exposed",
  "Uneven texture / finish",
  "Missing diagonal mesh at openings",
  "Poor masking / overspray",
  "Damp or unprimed substrate",
];

export interface InspectItem { j: Job; e: Elevation; s: Stage }

const MIN = 1, MAX = 5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function PhotoInspector({ item, onClose, onApprove, onReject }: {
  item: InspectItem | null;
  onClose: () => void;
  onApprove: (it: InspectItem) => void;
  onReject: (it: InspectItem, note: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const view = useRef({ zoom, off });
  view.current = { zoom, off };

  useEffect(() => { setZoom(1); setOff({ x: 0, y: 0 }); setRejecting(false); setNote(""); }, [item]);

  const zoomAt = (next: number, px: number, py: number) => {
    const { zoom: z, off: o } = view.current;
    const n = clamp(next, MIN, MAX);
    const k = n / z;
    setZoom(n);
    setOff(n === 1 ? { x: 0, y: 0 } : { x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  };
  const zoomCenter = (n: number) => { const r = box.current?.getBoundingClientRect(); zoomAt(n, (r?.width ?? 0) / 2, (r?.height ?? 0) / 2); };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const r = el.getBoundingClientRect();
      zoomAt(view.current.zoom * Math.exp(-dy * 0.002), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  if (!item) return null;
  const { j, e, s } = item;
  const d = stageDef(s.code);
  const pending = s.review === "pending";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[min(1100px,96vw)] w-full p-0 gap-0 bg-white border border-line rounded-[18px] overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex flex-wrap items-center gap-x-4 gap-y-1 pr-12">
          <DialogTitle className="font-display text-[20px]">{j.ref} · {e.name} · {s.code} {d.name}</DialogTitle>
          <span className="text-[13px] font-bold text-ink/60">{j.address}, {j.postcode} · uploaded {s.uploadedAt ? new Date(s.uploadedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span>
        </div>
        <div
          ref={box}
          className={cn("relative h-[62vh] bg-ink overflow-hidden touch-none select-none", zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")}
          onPointerDown={(ev) => { drag.current = { x: ev.clientX - off.x, y: ev.clientY - off.y }; (ev.target as HTMLElement).setPointerCapture(ev.pointerId); }}
          onPointerMove={(ev) => { if (drag.current && zoom > 1) setOff({ x: ev.clientX - drag.current.x, y: ev.clientY - drag.current.y }); }}
          onPointerUp={() => { drag.current = null; }}
          onDoubleClick={(ev) => { const r = box.current!.getBoundingClientRect(); zoomAt(zoom > 1 ? 1 : 2.5, ev.clientX - r.left, ev.clientY - r.top); }}
        >
          <img src={s.photo} alt={`${j.ref} ${e.name} ${d.name}`} draggable={false}
            className="absolute inset-0 w-full h-full object-contain origin-top-left"
            style={{ transform: `translate(${off.x}px, ${off.y}px) scale(${zoom})` }} />
          <div className="absolute left-3 bottom-3 flex items-center gap-1 bg-white border border-line rounded-full p-1">
            <button aria-label="Zoom out" onClick={() => zoomCenter(zoom / 1.5)} className="w-10 h-10 rounded-full grid place-items-center"><Minus className="w-4 h-4" strokeWidth={3} /></button>
            {[1, 2, 3].map((z) => (
              <button key={z} onClick={() => zoomCenter(z)} className={cn("h-10 px-3 rounded-full text-[13px] font-extrabold", Math.abs(zoom - z) < 0.05 && "bg-ink text-white")}>{z === 1 ? "Fit" : `${z}×`}</button>
            ))}
            <button aria-label="Zoom in" onClick={() => zoomCenter(zoom * 1.5)} className="w-10 h-10 rounded-full grid place-items-center"><Plus className="w-4 h-4" strokeWidth={3} /></button>
          </div>
          <p className="absolute right-3 bottom-3 text-[12px] font-bold text-white/80 bg-ink/60 rounded-full px-3 py-1">Scroll or double-click to zoom · drag to move</p>
        </div>
        <div className="p-4 border-t border-line">
          {!pending ? (
            <p className="text-[14px] font-extrabold">{s.review === "rejected" ? <>Sent back for recoat — <span className="font-semibold">{s.rejectNote}</span></> : "Approved."}</p>
          ) : rejecting ? (
            <div className="space-y-3">
              <p className="text-[12px] font-extrabold uppercase tracking-widest">Why is it being rejected?</p>
              <div className="flex flex-wrap gap-2">
                {REJECT_PRESETS.map((p) => (
                  <button key={p} onClick={() => setNote((n) => (n.includes(p) ? n : n ? `${n}. ${p}` : p))} className="h-9 px-3 rounded-full border border-line text-[13px] font-bold hover:bg-stone">{p}</button>
                ))}
              </div>
              <textarea aria-label="Rejection note" value={note} onChange={(ev) => setNote(ev.target.value)} rows={2} placeholder="Tell the team exactly what to fix, e.g. rear left window reveal" className="w-full p-3 rounded-[10px] border border-line text-[15px] font-semibold outline-none focus:ring-2 focus:ring-safety" />
              <div className="flex gap-2">
                <button onClick={() => setRejecting(false)} className="h-12 px-5 rounded-full border border-line font-extrabold">Cancel</button>
                <button disabled={!note.trim()} onClick={() => onReject(item, note)} className="flex-1 h-12 rounded-full bg-safety border border-line font-extrabold disabled:opacity-40">Send back for recoat</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setRejecting(true)} className="h-14 px-6 rounded-full bg-white border border-line font-extrabold flex items-center gap-2"><X className="w-5 h-5" strokeWidth={3} /> Reject with note</button>
              <button onClick={() => onApprove(item)} className="flex-1 h-14 rounded-full bg-go text-white border border-line font-extrabold flex items-center justify-center gap-2"><Check className="w-5 h-5" strokeWidth={3} /> Approve & unlock next stage</button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
