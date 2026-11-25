import { useEffect, useRef } from "react";

export function SignaturePad({ onChange, signer, disabled }: { onChange: (data: string | null) => void; signer: string; disabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const has = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0d0d0d";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent) => {
    if (disabled) return;
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    has.current = true;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (has.current) onChange(ref.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    has.current = false;
    onChange(null);
  };

  return (
    <div className="relative mt-4 rounded-[12px] border-2 border-dashed border-ink bg-[#f0eeea] h-[200px]">
      <canvas
        ref={ref}
        className="absolute inset-0 w-full h-full touch-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label="Signature pad"
      />
      <div className="absolute left-4 right-24 bottom-4 border-t-2 border-ink pt-1 text-[12px] font-extrabold uppercase tracking-[0.18em] pointer-events-none">
        Homeowner · {signer}
      </div>
      {!disabled && (
        <button type="button" onClick={clear} className="absolute right-3 bottom-3 h-11 px-5 rounded-full bg-white border-2 border-ink text-[15px] font-extrabold">
          Clear
        </button>
      )}
    </div>
  );
}
