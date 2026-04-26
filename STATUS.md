# M1 Build Status

Last updated: **2026-04-26**.

This is the orientation doc for the Coin Appraisal Register M1 build. If you're picking up this project on a new machine, **read this first**, then go to [glide/screens.md](glide/screens.md) for the next-step build guide.

## What M1 is

A floor-staff iPad app for live coin/bullion pricing:
- Rep picks themselves from a dropdown
- Adds line items: silver coins by count, bullion by gram weight
- Sees a live total computed from current spot prices and per-category margins from Airtable

Stack: **Airtable** (config + future deal log), **Make.com** (workflow + external API access), **Glide** (no-code PWA frontend, installs to iPad home screen). External data: **metals-api.com** for spot prices.

Full architecture in [docs/architecture.md](docs/architecture.md). Pricing math in [docs/data-model.md](docs/data-model.md).

## Where we are

| Phase | Status | What it produced |
|---|---|---|
| **1 — Airtable base** | ✅ done | `Config_Margins` (4 rows), `Config_CoinTypes` (24 rows), `Config_Reps` (empty pending client). Import order: [airtable/schema.md](airtable/schema.md). |
| **2 — Make `bulk-calc` scenario** | ✅ done | Tested, active. Working blueprint committed: [make/bulk-calc.v1.blueprint.json](make/bulk-calc.v1.blueprint.json). |
| **2.5 — Make `config-load` scenario** | ⏳ next | Pre-built blueprint at [make/config-load.v1.blueprint.json](make/config-load.v1.blueprint.json) — needs import + connection mapping + test. |
| **3 — Glide app** | ⏳ pending | Build guide at [glide/screens.md](glide/screens.md). Phase 2.5 must complete first. |
| **iPad smoke test** | ⏳ pending | End-to-end against real spot prices and a real customer-style coin bag. |

## Architecture pivot (2026-04-26)

The client's Glide plan ("Explorer") doesn't include Airtable as a native data source — Airtable requires Glide Business tier (~$99/mo). The client doesn't want to upgrade.

**Path 2 (chosen):** keep config in Airtable, but bridge to Glide via a new `config-load` Make scenario. Glide reads coin types and reps from a webhook response that Make builds out of Airtable. The `bulk-calc` scenario stays unchanged.

The design contract is preserved — admin still edits Airtable, app still reflects changes — Glide just doesn't read Airtable directly. Trade-off: one extra Make scenario.

## Files in this repo

```
README.md                              project overview
STATUS.md                              this file
CLAUDE.md                              (parent dir) project-level instructions for Claude
docs/
  architecture.md                      system flow + key principles
  data-model.md                        Airtable schema + Engine 1 pricing math
  api-integrations.md                  metals-api spec + webhook contracts (bulk-calc, config-load)
airtable/
  schema.md                            table import order + seed notes
  seeds/
    margins.csv                        Config_Margins seed (4 rows)
    coin_types.csv                     Config_CoinTypes seed (24 rows)
make/
  README.md                            Make scenario index + naming convention
  bulk-calc.v1.blueprint.json          working bulk-calc scenario (Phase 2)
  config-load.v1.blueprint.json        config-load scenario (Phase 2.5, untested)
glide/
  README.md                            Glide layer overview
  screens.md                           build guide for Phases 2.5 and 3
```

## Things you need available that aren't in this repo

The repo holds specs and blueprints. These live in your accounts and need to be on hand:

| Thing | Where it lives | When you need it |
|---|---|---|
| `bulk-calc` webhook URL | Make → bulk-calc scenario → click webhook module | Phase 3D, when wiring Glide's "Calculate" action |
| `config-load` webhook URL | Will be created during Phase 2.5 (you'll save it then) | Phase 3B, when wiring Glide's "Load config" action |
| Airtable PAT | The one you created during the 403 fix; already in Make's `client-airtable` connection | Already in use; only needed again if re-creating the Make connection |
| metals-api.com access_key | Already pasted into Make's HTTP module URL in `bulk-calc` | Already in use; the committed blueprint has it as `REPLACE_WITH_METALS_API_KEY` placeholder for safety |

## Things blocking the work

| Blocker | Owner | Notes |
|---|---|---|
| **Rep names** | Client | `Config_Reps` is empty. Glide dropdown will be empty until names land. Fine to add a placeholder row for testing. |
| **Margin confirmation** | Client | Seeded at 0.30 across silver/gold/platinum. Legacy effective rate was ~0.263. Worth confirming before staff use it on the floor. |
| **Branding** | Client | App name, square logo (PNG ≥ 512×512), accent color. Not blocking the build, blocking sign-off. |

## Next action

Open [glide/screens.md](glide/screens.md) and start at "Phase 2.5 — `config-load` Make scenario."
