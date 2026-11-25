# Rendercrew Jobflow Compass

Build an operations software for trades businesses (specifically rendering contractors, called Renderfuel Ops) that connects to GoHighLevel to pull won jobs, manages field delivery after the sale, handles scheduling, mobile job cards, variation signoffs, live labor profitability runway, and automated team routing based on stage and weather.

## Locked

- Visual Direction & Design Tokens: "Daylight Concrete" (rugged-daylight). Stone-grey background (`#d9d6d0`), crisp white cards with 2px solid black borders (`#0d0d0d`), hard offset box-shadows (`4px 4px 0 #0d0d0d`), safety orange (`#ff5a00`) strictly reserved for variations/alerts, go green (`#0a8a3a`) for weather/stage passes, and bold Archivo Black display font paired with high-contrast Inter.
- Designed Screens & Layouts:
  1. Mobile Site Lead Job Card (job-card-daylight, 393×764): Weather header (14°C Dry Coating Safe), scaffold hire countdown progress bar with overrun cost warnings (e.g. "6 days until £180/wk fee"), elevation tab selector (Front, Rear, Gable) with m² readout, defect warning banner, safety orange variation signoff pill ("Thumb to sign"), 2x2 stage-gate photo tiles with status badges (Verified, Tap to Upload, Locked), crew/material counters ("3 Men on site", "14 Bags applied"), primary action button ("Add Elevation Photo"), and floating capsule navigation tab bar (Job, Photos, Crew, Stock).
  2. On-Site Variation Sign-Off (variation-signoff): Defect photo attachment, description and scope of extra work, financial impact (+£240), customer digital signature pad with instant authorization, and instant recalculation of total contract sum.
  3. Contractor Desktop Command Dashboard (contractor-fleet-dashboard, 1280×832): Active sites map/list, crew status, weather & coating alerts, scaffold countdown warnings, pending variations awaiting approval, GHL won job intake feed, and real-time stage photo verification stream.
  4. Dispatch & Crew Scheduling (dispatch-crew-schedule): Gantt-style schedule across crews, travel radius / proximity matching, weather conflict highlights, and automated rain-pivot re-routing engine.
- System-Specific Stage Gates:
  - Monocouche (Scratch Render): M1 Substrate Prep & Masking, M2 Beading & Stress Patches, M3 1st Pass & Bedding, M4 2nd Pass Wet-on-Wet (18mm gauge), M5 Scraping & Texture (critical cure window), M6 Mastic & Demasking.
  - Silicone Thin-Coat System: S1 Substrate/Carrier Board & Masking, S2 Beads & Opening Patches, S3 Basecoat & 100% Mesh Embed (zero grin-through), S4 Tinted Primer Coat (moisture check), S5 Silicone Topcoat (continuous one-run float finish, batch logging), S6 Perimeter Seals & Clean Down.
- Automated Rain-Pivot Engine: Automated 06:00 AM weather scan; if rain > 30% or temp < 5°C threatens finishing coats, automatically pause finish stages and suggest/route crew to safe prep tasks (boarding, beading, mechanical hack-off) on active or upcoming sites within 35-min radius.
- Labor Capacity Runway: Real-time dynamic calculation: (Quoted Revenue + Signed Variations - Material/Scaffold Direct Costs - Target Gross Profit Floor e.g. 25%) / Crew Daily Labor Cost = Remaining Affordable Crew-Days. Visual gauge and alerts when actual days exceed runway.
- Multi-Tenant Agency Architecture: Renderfuel Agency Admin view to provision contractor sub-accounts, configure their crews/rates, and link their GHL Location ID.

## Open

- Full responsive navigation between desktop contractor dashboard and mobile site lead view (with role switcher for testing: Agency Admin, Contractor Boss, Site Lead).
- Interactive mock data pre-seeded with realistic UK rendering jobs (e.g. 12 Orchard Way, 44 Victoria Road, 9 Bramble Lane) featuring both Monocouche and Silicone jobs.
- Interactive photo upload simulator for stage gates (uploading a test photo marks stage Verified, unlocks next stage).
- Interactive variation creator with canvas signature capture.
- Interactive rain-pivot toggle (simulate rain event to watch crew schedule automatically shift to prep jobs).
- Interactive GHL webhook intake test harness (simulate incoming won job payload from GHL to watch new job card and elevation checklists spawn).
- Automatic PDF Warranty Certificate generator preview compiling the elevation QA photos upon job completion.

build a real working app, not a clickable prototype; the screen and kit files show layout, content and look (a wireframe's, structure only) and are never code to copy. The screens are the moments the user designed, not the whole product. Before building, walk through each flow as its user would and design what the pictures leave out, as a product designer would for this product: the steps a flow needs to finish and how the app responds to what the user does, including the moments its users will actually run into, like waiting on something or finding nothing yet. Add nothing a user of this product would never meet, and keep an app the user wants simple, simple. Never leave a step the product's core flows need as "coming soon", unless the brief says the user chose to. Where such a step needs an outside service, build every part up to it and say in your reply what's left to connect. Fill product gaps only, never a look the design set: an added step reuses the UI kit's tokens, chrome and parts and the nearest designed screen's layout, with no new visual direction. Look at every screen's picture before writing code; design.md says which picture or sheet holds each screen. Open the UI kit's shells and parts HTML for the header, tab bar, composer and components, not only its tokens. Use each finished screen's copy exactly as design.md lists it; never invent copy for one. A wireframe under design.md's Wireframes gives structure only: build it in the design's look, as design.md says. The screens' photos are placeholders for the mockups only: replace every photo design.md lists with the user's own upload for it, else as design.md says (a photo without people re-composed with imagegen--edit_image from it as a reference, a photo of people generated from its brief and never from the photo), and ship no set photo or its URL. For a design that came with no design.md, every photo on assets.lovable.dev or images.unsplash.com is a set photo: replace it with the user's own upload for it, else a new image generated for its slot, any person in it one who doesn't exist, never from the photo or a picture showing it. Build and check each screen at the canvas it was drawn at: phone 393×764, tablet landscape 1133×744, tablet portrait 744×1133, desktop 1280×832. After building, screenshot the app at those sizes and states, compare each finished screen with its picture, and fix every visual difference you didn't choose; check a wireframe's screen against its structure, never its grey look. End your reply with "Changed from the mockups": each deliberate change and why, and "Added beyond the mockups": each step, state or interaction you built that no screen shows.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2c0aca23-a5ae-4d3b-92f1-c76226acb4d7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
