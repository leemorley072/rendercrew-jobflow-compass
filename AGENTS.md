<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- App data lives in a client store (`src/lib/ops/store.tsx`, persisted to localStorage, keyed per contractor tenant) — no backend yet; move to Lovable Cloud before going multi-device.
- Business rules (runway, rain pivot, crew ranking, stage gates, GHL payload checks) are pure functions in `src/lib/ops/*` with tests in `engine.test.ts`; pages only call them.
- Material prices: agency price book (`OpsState.agencyMaterials`) is the benchmark; each tenant's `materialOverrides` win via `resolveCatalog` — so new contractors cost jobs from day one yet keep their own trade discounts.
- Labour is costed per man-day (crew day rate ÷ crew size × men on site at close-out), and jobs with `scaffold.required === false` carry no scaffold cost or countdown — solo and ground-level work must not burn full-gang or scaffold budget.
- Workers live in `TenantData.workers`; a team (`Crew`) with `memberIds` gets men/day rate/skills from its workers via `syncCrew`, so costing and dispatch keep reading crew fields unchanged.
- Team re-routing and worker access are pure functions (`team.ts` planPivot, engine `todaysJobFor`/`middayReminders`); the site view and job card gate on `todaysJobFor` for the Site Lead role.
- Stage photos unlock the next stage only on office approval (`approveStage`); rejection stores a note (`rejectStage`) shown on the team card — crews must not coat over unchecked work.
- Labour cost comes from `TenantData.timeEntries` (each worker self-checks in/out, own day rate per shift) via `time.ts`; legacy `manDays` is frozen once a job uses check-ins, and check-out requires the job wrapped up for the day (`Job.closedOutOn`) — so cost is per real person on site and never double-counted.
- Check-in GPS distance/off-site flags are stored on entries but rendered only in Contractor Mode (`/timesheets`); Team Mode never shows prices, runway or location data.
