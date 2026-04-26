# Architecture

## High-level flow

```
   iPad / laptop (Glide PWA, Big Tables for cart + cached config)
        │
        │  HTTPS webhooks (JSON in, JSON out) — config sync, live spot, deal save
        ▼
   Make.com scenarios
        │  ├── config-load     (returns active coin types + reps as JSON)
        │  ├── bulk-calc       (Engine 1 — live offer)
        │  ├── graded-lookup   (Engine 2, M2)
        │  ├── ebay-comps      (Engine 3, M2)
        │  ├── deal-save       (write deal log, M2)
        │  └── raw-coin-lookup (M2 fallback)
        │
        ├── metals-api.com     (spot prices)
        ├── PCGS CoinFacts     (graded lookup, NGC via gradingService)
        ├── CDN Greysheet      (wholesale reference)
        ├── Apify eBay actor   (collectible comps)
        │
        ▼
     Airtable (single source of truth for config + deal log)
```

**Why this shape:** The client's Glide plan tier doesn't include native Airtable as a data source (Business tier only). Rather than upgrade, all Airtable I/O is fronted by Make scenarios — `config-load` for read-side config, `bulk-calc` / `deal-save` etc. for everything else. The design contract (config in Airtable, no Glide-side data editing) is preserved; Glide just doesn't read Airtable directly. Trade-off: one extra Make scenario (`config-load`) and Glide caches config in Big Tables, refreshed by a "Refresh" action that re-calls `config-load`.

## Scenario inventory (exported into `/make` during build)

| Scenario | Trigger | Purpose | Milestone |
|---|---|---|---|
| `config-load` | Webhook | Return active `Config_CoinTypes` + `Config_Reps` as JSON for Glide to cache | M1 |
| `bulk-calc` | Webhook | Return live offer for Engine 1 | M1 |
| `graded-lookup` | Webhook | Cert → grade + price (Engine 2) | M2 |
| `ebay-comps` | Webhook | Item name → sold-price range (Engine 3) | M2 |
| `deal-save` | Webhook | Write completed deal + line items to Airtable | M2 |
| `raw-coin-lookup` | Webhook | Fallback for ungraded coins via Airtable override table | M2 |

## Key principles

1. **Config in Airtable, logic in Make, UI in Glide.** These three layers never leak into each other.
2. **Every Make scenario re-reads config on each run.** No caching of margins or coin lists inside Make modules. Glide caches config in Big Tables but those are refreshed via the `config-load` webhook on app load (and on a manual "Refresh" button), so admin edits flow through within one launch cycle.
3. **All API access is fronted by Make.** Glide holds no external connections. Make holds the Airtable PAT, the metals-api.com access_key, and (in M2) the PCGS / CDN / Apify keys. Browser never sees any credential.
4. **Webhook contracts are versioned.** Glide actions and Make scenarios agree on request/response shapes documented in [api-integrations.md](api-integrations.md).
5. **Hard blocks enforced in UI.** Customer DL capture is required before the "Save Deal" webhook can fire (M2).

## Deployment

- **Frontend:** Glide app in the client's Glide workspace. Big Tables for cart (user-specific, ephemeral) and cached config (`CoinTypes`, `Reps`). All data sync goes through Make webhooks. Staff installs the app to the iPad home screen as a PWA.
- **Make:** client's workspace. Scenarios run on their plan's ops budget. Airtable connection (`client-airtable`) and external API connections (metals-api.com; M2: PCGS, CDN, Apify) configured here.
- **Airtable:** client's workspace. Base accessed only by Make scenarios — Glide does not connect directly. Admin edits config tables in Airtable; changes propagate to Glide on the next `config-load` invocation.
