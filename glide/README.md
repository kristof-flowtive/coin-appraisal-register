# Glide app — Coin Appraisal Register

The iPad-and-laptop frontend is a Glide app. Glide doesn't expose project files for source control, so this folder documents the build so it can be reproduced or rebuilt from scratch.

## What lives in here

| File | Purpose |
|---|---|
| `README.md` (this file) | High-level overview + reproduction instructions |
| `screens.md` | Screen-by-screen spec (added during M1 build): layout, components, computed columns, actions per screen |
| `template-link.md` | Glide template-copy link + duplication instructions for handover (added once the M1 app is built) |
| `screenshots/` | Reference screenshots of each screen (added during M1 build) |

## Connections

| Source | Used for |
|---|---|
| Glide Big Tables | `CoinTypes` (cached config, populated by `config-load`), `Reps` (cached config, populated by `config-load`), `Cart` (user-specific, ephemeral line items), `Session` (per-user state — selected rep, last total). |
| Make webhooks | `config-load` (M1, populates `CoinTypes` + `Reps` from Airtable), `bulk-calc` (M1), `graded-lookup`, `ebay-comps`, `deal-save`, `raw-coin-lookup` (all M2). See [../docs/api-integrations.md](../docs/api-integrations.md) for request/response shapes. |

The client's Glide plan (Explorer tier) does NOT include Airtable as a native data source — that requires Business tier. Rather than upgrade, we route all Airtable I/O through Make scenarios. See [../docs/architecture.md](../docs/architecture.md) for the architecture.

External API keys (metals-api.com, PCGS, CDN Greysheet, Apify) live only in Make connections — never in Glide. Glide holds no API credentials.

## Device targets

- **iPad Chrome** (primary) — installed to home screen as a PWA, full-screen, no Safari chrome
- **Laptop Chrome / Safari** (secondary) — same app, browser tab

## M1 scope (Bulk Calculator only)

One screen with:
- Rep dropdown (sourced from `Reps` Big Table, populated by `config-load`)
- Coin picker — list of `CoinTypes` Big Table (populated by `config-load`), grouped by `metal_type`
- Per-line input: `quantity` for `priced_by = each_metal`, `weight_grams` for `priced_by = weight_grams`. Lines accumulate in the user-specific `Cart` Big Table.
- "Calculate" button — POSTs the cart to `bulk-calc`, displays returned total
- Spot-prices display (gold / silver / platinum at time of calc) from the `bulk-calc` response
- "Refresh Config" button — re-calls `config-load` to pick up Airtable edits
- "New Bag" button — clears the user's `Cart`

No deal save in M1 — calculator-only. Deal save lands in M2.

Full step-by-step build guide: [screens.md](screens.md).
