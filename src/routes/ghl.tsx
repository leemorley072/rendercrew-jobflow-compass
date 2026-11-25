import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, DesktopShell, SectionTitle } from "@/components/ops/chrome";
import { useOps } from "@/lib/ops/store";
import { processWebhook, samplePayload } from "@/lib/ops/intake";
import { gbp, jobArea } from "@/lib/ops/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ghl")({
  head: () => ({
    meta: [
      { title: "GHL Won-Job Intake · Renderfuel Ops" },
      { name: "description", content: "Test harness for GoHighLevel won-opportunity webhooks: send a payload and watch the job card spawn." },
      { property: "og:title", content: "GHL Intake · Renderfuel Ops" },
      { property: "og:description", content: "Won deals in GoHighLevel become job cards automatically." },
    ],
  }),
  component: GhlHarness,
});

function GhlHarness() {
  const { data, tenant, mutateData } = useOps();
  const [text, setText] = useState(() => JSON.stringify(samplePayload(tenant.ghlLocationId), null, 2));
  const [sending, setSending] = useState(false);
  const recent = data.jobs.filter((j) => j.source === "ghl").slice(-6).reverse();

  const send = async () => {
    setSending(true);
    await new Promise((r) => setTimeout(r, 450));
    let raw: unknown;
    let result;
    try {
      raw = JSON.parse(text);
      result = processWebhook(data, tenant.ghlLocationId, raw);
    } catch {
      result = { status: 400, message: "Rejected: body isn't valid JSON" };
    }
    mutateData((d) => {
      if ("job" in result && result.job) d.jobs.push(result.job);
      d.webhookLog.unshift({ id: `w${Date.now()}`, at: new Date().toLocaleTimeString("en-GB"), status: result.status, message: result.message, ...("job" in result && result.job ? { jobId: result.job.id } : {}) });
      d.webhookLog = d.webhookLog.slice(0, 20);
    });
    setSending(false);
  };

  return (
    <DesktopShell title="Renderfuel Ops • GHL Won-Job Intake" subtitle={`Linked location ${tenant.ghlLocationId} • ${tenant.name}`}>
      <div className="grid lg:grid-cols-[1fr_420px] gap-6 items-start">
        <div>
          <SectionTitle meta={<button className="underline" onClick={() => setText(JSON.stringify(samplePayload(tenant.ghlLocationId), null, 2))}>New sample</button>}>Webhook payload</SectionTitle>
          <Card className="p-4">
            <p className="text-[13px] font-bold text-ink/70">This is what GoHighLevel sends when an opportunity moves to <b>Won</b>. Edit it to test bad data, another location, or a deal that isn't won.</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
              className="mt-3 w-full h-[420px] font-mono text-[13px] p-4 rounded-[10px] border border-line bg-stone/30 outline-none" />
            <button onClick={send} disabled={sending} className="mt-4 w-full h-16 rounded-full bg-safety border border-line text-[17px] font-extrabold hard disabled:opacity-60">
              {sending ? "Delivering…" : "Send Test Webhook"}
            </button>
          </Card>
        </div>
        <aside className="space-y-6">
          <div>
            <SectionTitle meta={data.webhookLog.length || undefined}>Delivery log</SectionTitle>
            <Card className="p-3 shadow-none space-y-2">
              {data.webhookLog.length === 0 && <p className="p-2 text-[14px] font-bold text-ink/60">Nothing received yet. Send a test payload.</p>}
              {data.webhookLog.map((l) => (
                <div key={l.id} className="flex gap-3 items-start p-2 rounded-[10px] border border-line">
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[12px] font-extrabold border border-line", l.status === 200 ? "bg-go text-white" : l.status === 202 ? "bg-white" : "bg-safety")}>{l.status}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold">{l.message}</p>
                    <p className="text-[11px] font-bold text-ink/60">{l.at}{l.jobId && <> · <Link to="/site/$jobId" params={{ jobId: l.jobId }} search={{}} className="underline">open job card</Link></>}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
          <div>
            <SectionTitle>Won jobs pulled</SectionTitle>
            <div className="space-y-3">
              {recent.map((j) => (
                <Card key={j.id} className="p-4 shadow-none">
                  <div className="flex justify-between"><span className="font-display text-[16px]">{j.address}</span><span className="font-display text-[16px]">{gbp(j.quoted)}</span></div>
                  <p className="text-[13px] font-bold text-ink/60">{j.ref} • {jobArea(j)}m² • {j.elevations.length} elevations × 6 stage gates • {j.status === "intake" ? "awaiting crew" : j.status}</p>
                  {j.status === "intake" && <Link to="/dispatch" search={{ job: j.id }} className="mt-3 h-11 rounded-full bg-safety border border-line font-extrabold grid place-items-center">Schedule & Assign Crew</Link>}
                </Card>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </DesktopShell>
  );
}
