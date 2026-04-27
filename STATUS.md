# M1 Build Status

Last updated: **2026-04-27** (evening session — platform pivot).

This is the orientation doc for the Coin Appraisal Register M1 build. If you're picking up this project on a new machine, **read this first**. Frontend platform is currently undecided — see "Platform decision pending" below before reading [glide/screens.md](glide/screens.md), as that doc may no longer reflect the chosen platform.

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
| **2.5 — Make `config-load` scenario** | ✅ done | Imported, tested, active. Webhook URL saved externally by builder (not in repo). |
| **3A — Glide app created** | ✅ done | "Coin Appraisal Register" on Explorer plan. Workspace shows "My Team" — confirm with client this is theirs before publish. |
| **3B — Big Tables set up** | ✅ done | `CoinTypes` (6 cols), `Reps` (2 cols), `Cart` (8 cols + `owner_email` configured as Row Owner). Default starter table deleted. |
| **3C — Refresh Config workflow** | 🛑 blocked | Path 2 architecture broke during this phase. See "Platform decision pending" below. |
| **3D — Calculator screen + Add Coin form** | 🛑 blocked | Pending platform decision. |
| **3E–H — Smoke test, iPad install, polish, sign-off** | 🛑 blocked | Pending platform decision. |

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

## Build notes from prior sessions (gotchas not in screens.md)

- **Make Module 6 (`json:CreateJSON`) imports with `type: null`.** Data structures don't carry across accounts. Fix on import: open Module 6 → Data structure → **Add** → **Generator** tab → paste a sample of the response JSON → Save. Once the structure exists, the `coin_types` and `reps` mappings re-appear.
- **Empty Airtable rows leak into the `reps` array** as `[{"id": null, "name": null}]` even with `{active} = TRUE()` filter. Fix: delete all default placeholder rows from `Config_Reps` in Airtable; the filter alone isn't enough.
- **Glide Row Owners ≠ "Column is user-specific."** They're different features. For the user-specific Cart, the working path is: add a Text or Email column called `owner_email` → right-click the column header → **Make Row Owner**. Visual confirmation: column header turns teal with an `@` icon. The "Column is user-specific" checkbox is a different feature (per-user values on shared rows) and won't isolate carts between reps.
- **Glide's `Users` table** appeared on app creation but vanished after the first table operations. Not blocking — Glide recreates it when sign-in is enabled. Worth noting for Phase 3F (iPad install with auth).

## Platform decision pending (2026-04-27 evening pivot)

Path 2 — the architecture we chose on 2026-04-26 — broke during Phase 3C. Two stacked Glide-Explorer constraints surfaced:

1. **`Call API` workflow action is Business-tier only** ($249/mo) — not available on Explorer or Maker.
2. **`Trigger Webhook` is fire-and-forget** — no response capture. So Glide can't read the JSON Make returns.

There IS a "Make" integration on Glide that gives Make an API key into Glide's Big Tables (push-from-Make works), but Glide meters every data change as an "update" — Explorer 250/mo, Maker 500/mo, Business 5,000/mo, $0.02/update overage on all paid tiers. At realistic floor-staff volume (50–100 customer interactions/day × ~9 updates/interaction), Glide costs land in the **$240–570/mo** range. Wrong economic shape for a daily-use floor tool.

A client decision document was generated outlining three options with cost analysis and recommendation:
- 📄 [decisions/platform-decision.pdf](decisions/platform-decision.pdf) — client-facing PDF
- 🌐 [decisions/platform-decision.html](decisions/platform-decision.html) — editable HTML source

The three options:
- **A. Glide Business** ($249/mo + overage) — fastest path, best polish, most expensive
- **B. Softr** ($59–167/mo) — not recommended; reactivity gap on Calculate Total is the load-bearing concern
- **C. Custom-built PWA** (~$0/mo recurring + 16–32 hr build) — best long-term economics, loses no-code self-edit

**Status:** Decision pending client review. Make scenarios + Airtable schema are platform-agnostic and remain valid under all three options.

## Today's gotchas (2026-04-27 evening) — additional to those above

- **Glide Explorer plan is double-gated for Make integration.** "Call API" is Business-only. "Trigger Webhook" exists on Explorer but is fire-and-forget. The only way to do bidirectional Make↔Glide on Explorer is push-from-Make via the Glide Make integration (which provisions an API key into Big Tables) — but that hits the update meter.
- **Glide's "updates" meter counts every data change**, including in-app row writes (cart adds, calculate-total writes, etc.) — confirmed via the tooltip on the pricing page. Quota math: ~9 updates per customer interaction.
- **Today's Glide work to throw away if we pivot:** ~1 hour. Big Tables setup (CoinTypes, Reps, Cart with Row Owner) and a half-built Refresh Config workflow. Make scenarios and Airtable are untouched and remain valid.

## Next action

**For the human:** review [decisions/platform-decision.pdf](decisions/platform-decision.pdf), tweak if needed, send to client. Once they decide, resume the build on the chosen platform.

**For a future Claude session:** if the decision is in, read the relevant build guide for the chosen platform (Glide → [glide/screens.md](glide/screens.md); Softr or Custom PWA → docs not yet written, would need to be created). If the decision is still pending, don't restart the Glide build — the platform-decision.pdf is the active deliverable.
