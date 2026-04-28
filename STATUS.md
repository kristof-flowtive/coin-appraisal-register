# M1 Build Status

Last updated: **2026-04-28** (platform decision resolved — Option C, custom PWA).

This is the orientation doc for the Coin Appraisal Register M1 build. If you're picking up this project on a new machine, **read this first**, then [docs/pwa-build-plan.md](docs/pwa-build-plan.md) for the build steps.

## What M1 is

A floor-staff iPad app for live coin/bullion pricing:
- Rep picks themselves from a dropdown
- Adds line items: silver coins by count, bullion by gram weight
- Sees a live total computed from current spot prices and per-category margins from Airtable

Stack: **Airtable** (config + future deal log), **Make.com** (workflow + external API access), **Custom PWA** (React + Vite + Tailwind, deployed on Vercel, installs to iPad home screen). External data: **metals-api.com** for spot prices.

Full architecture in [docs/architecture.md](docs/architecture.md). Pricing math in [docs/data-model.md](docs/data-model.md). PWA build plan in [docs/pwa-build-plan.md](docs/pwa-build-plan.md).

## Platform decision (2026-04-28) — Option C confirmed

The client reviewed [decisions/platform-decision.pdf](decisions/platform-decision.pdf) and chose **Option C — Custom-built PWA**. Frontend is now React + Vite + Tailwind, deployed on Vercel free tier.

Rationale: zero recurring cost, full UX control, no platform metering, durable through M2+. Trade-off accepted: client cannot self-edit screens; changes route through dev. The Make scenarios and Airtable schema are unaffected — they were designed platform-agnostic and remain valid.

The ~1 hour of Glide work from Phase 3A/3B is discarded. The Glide app itself can be deleted from the client's workspace once we confirm the PWA covers the same ground.

## Where we are

| Phase | Status | What it produced |
|---|---|---|
| **1 — Airtable base** | ✅ done | `Config_Margins` (4 rows), `Config_CoinTypes` (24 rows), `Config_Reps` (empty pending client). Import order: [airtable/schema.md](airtable/schema.md). |
| **2 — Make `bulk-calc` scenario** | ✅ done | Tested, active. Working blueprint committed: [make/bulk-calc.v1.blueprint.json](make/bulk-calc.v1.blueprint.json). |
| **2.5 — Make `config-load` scenario** | ✅ done | Imported, tested, active. Webhook URL saved externally by builder (not in repo). |
| **3 — Glide app** | 🗑️ abandoned | Path 2 architecture broke on Glide Explorer constraints. Glide app (skeleton only) can be deleted from client workspace. |
| **4A — PWA scaffold** | ⏳ next | Vite + React + TS + Tailwind project in `/web`, PWA plugin wired, env vars for both webhooks. |
| **4B — API client + cart state** | ⏳ pending | Typed wrappers around `config-load` and `bulk-calc`; cart in React state with localStorage persistence. |
| **4C — Calculator screen** | ⏳ pending | Rep dropdown, cart list, total, Calculate / New Bag / Refresh Config buttons. |
| **4D — Add Coin form** | ⏳ pending | Modal: coin picker grouped by metal, conditional quantity-vs-grams input. |
| **4E — PWA polish** | ⏳ pending | Manifest + icons + splash, tap targets, numeric keyboards, loading + error states. |
| **4F.1 — Staging deploy** | ⏳ pending | Push to dev's GitHub, deploy to dev's Vercel for client preview + iPad smoke testing. |
| **4F.2 — Transfer to client** | ⏳ pending | Awaiting client GitHub + Vercel access. Transfer repo, set up fresh Vercel project under client account, re-install on iPads. |
| **4G — iPad install + smoke test** | ⏳ pending | Add to Home Screen on iPad, full-screen confirmed, end-to-end test against live spot. |
| **4H — Sign-off** | ⏳ pending | Checklist in [docs/pwa-build-plan.md](docs/pwa-build-plan.md). |

Estimated build effort: **16–32 hours** total for Phases 4A–4H (per the platform decision PDF).

## Files in this repo

```
README.md                              project overview
STATUS.md                              this file
CLAUDE.md                              (parent dir) project-level instructions for Claude
docs/
  architecture.md                      system flow + key principles
  data-model.md                        Airtable schema + Engine 1 pricing math
  api-integrations.md                  metals-api spec + webhook contracts (bulk-calc, config-load)
  pwa-build-plan.md                    Phase 4 build steps + stack rationale (THIS IS THE BUILD GUIDE)
airtable/
  schema.md                            table import order + seed notes
  seeds/
    margins.csv                        Config_Margins seed (4 rows)
    coin_types.csv                     Config_CoinTypes seed (24 rows)
make/
  README.md                            Make scenario index + naming convention
  bulk-calc.v1.blueprint.json          working bulk-calc scenario (Phase 2)
  config-load.v1.blueprint.json        config-load scenario (Phase 2.5)
decisions/
  platform-decision.html               client-facing platform options doc (HTML source)
  platform-decision.pdf                client-facing platform options doc (PDF, sent to client)
glide/
  screens.md                           ⚠️ ARCHIVED — kept for historical reference; do not follow
web/                                   (created in Phase 4A) custom PWA source
```

## Things you need available that aren't in this repo

The repo holds specs, blueprints, and (once 4A starts) PWA source. These live elsewhere:

| Thing | Where it lives | When you need it |
|---|---|---|
| `bulk-calc` webhook URL | Make → bulk-calc scenario → click webhook module | Phase 4A, set as env var `VITE_BULK_CALC_URL` |
| `config-load` webhook URL | Make → config-load scenario → click webhook module | Phase 4A, set as env var `VITE_CONFIG_LOAD_URL` |
| Airtable PAT | The one you created during the 403 fix; already in Make's `client-airtable` connection | Already in use; only needed if re-creating the Make connection |
| metals-api.com access_key | Already in Make's HTTP module URL in `bulk-calc` | Already in use; the committed blueprint has it as `REPLACE_WITH_METALS_API_KEY` placeholder |
| Dev's GitHub account | Free, used during build for backup + WIP | Phase 4A onward (push early as backup) |
| Dev's Vercel account | Free tier, GitHub-linked | Phase 4F.1 (staging deploy for client preview + iPad smoke testing) |
| Client's GitHub access | Client to grant when ready | Phase 4F.2 (transfer of repo) |
| Client's Vercel access | Client to grant when ready | Phase 4F.2 (production deploy under their account) |

## Things blocking the work

| Blocker | Owner | Notes |
|---|---|---|
| **Margin confirmation** | Client | Seeded at 0.30 across silver/gold/platinum. Legacy effective rate was ~0.263. Worth confirming before staff use it on the floor. |
| **Branding** | Client | App name, square logo (PNG ≥ 512×512), accent color. Not blocking — 4E ships with placeholder icon, real assets land via follow-up PR. Blocking 4H sign-off only. |
| **Client GitHub + Vercel access** | Client | Not blocking 4A–4E (build proceeds under dev's accounts). Blocks 4F.2 (production transfer) only. |

Resolved on 2026-04-28: iPad usage model — works for both rep-assigned and shared iPads via auto-clear-on-rep-change. Cart wipes whenever the rep dropdown changes from one non-null value to a different non-null value. No confirmation dialog. See architectural decision #6 in [docs/pwa-build-plan.md](docs/pwa-build-plan.md).

Resolved on 2026-04-28: rep names landed in `Config_Reps` — Adam, Amy, John. Dropdown will populate from `config-load` on app launch.

## Build notes from prior sessions (still relevant)

- **Make Module 6 (`json:CreateJSON`) imports with `type: null`.** Data structures don't carry across accounts. Fix on import: open Module 6 → Data structure → **Add** → **Generator** tab → paste a sample of the response JSON → Save. Once the structure exists, the `coin_types` and `reps` mappings re-appear. (Only matters if rebuilding Make scenarios from blueprint.)
- **Empty Airtable rows leak into the `reps` array** as `[{"id": null, "name": null}]` even with `{active} = TRUE()` filter. Fix: delete all default placeholder rows from `Config_Reps` in Airtable; the filter alone isn't enough.

## Glide-specific notes (no longer applicable, kept for context)

The earlier Glide build surfaced lessons that no longer affect this build (Row Owners, Big Tables, Call API tier-gating, updates metering). Those are documented in the prior STATUS history (`git log STATUS.md`) and in the platform decision PDF — no need to read them for the PWA work.

## Next action

**For the human:** confirm the open items in "Things blocking the work" — particularly the GitHub remote question — then kick off Phase 4A.

**For a future Claude session:** read [docs/pwa-build-plan.md](docs/pwa-build-plan.md). That's the active build guide. Start at whichever phase is marked ⏳ next in the table above.
