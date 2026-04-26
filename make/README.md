# Make.com Scenarios

Exported scenario blueprints (`.json`) live in this folder. Each is versioned with its filename.

## Naming convention

```
<scenario-slug>.v<N>.blueprint.json
```

e.g. `bulk-calc.v1.blueprint.json`

## Planned scenarios

| Slug | Purpose | Milestone |
|---|---|---|
| `bulk-calc` | Engine 1 — live offer from metals-api.com + Airtable margins | M1 |
| `graded-lookup` | Engine 2 — PCGS/NGC via PCGS API + CDN Greysheet | M2 |
| `raw-coin-lookup` | Engine 2 fallback — Airtable override table | M2 |
| `ebay-comps` | Engine 3 — Apify eBay Sold Listings actor | M2 |
| `deal-save` | Write completed deal to Airtable | M1 (bulk only) → M2 (full) |

See [`../docs/api-integrations.md`](../docs/api-integrations.md) for webhook contracts.

## Export process

In Make, open a scenario → ... menu → **Export Blueprint** → save the JSON here. Commit. When a scenario changes meaningfully, bump the version suffix.
