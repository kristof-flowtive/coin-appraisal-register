# Architecture

## High-level flow

```
   iPad / laptop (Custom PWA — React + Vite + Tailwind, hosted on Vercel)
        │  Cart in browser localStorage; config cached in React state for the session
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

**Why this shape:** All Airtable I/O is fronted by Make scenarios — `config-load` for read-side config, `bulk-calc` / `deal-save` etc. for everything else. The design contract (config in Airtable, business logic in Make, UI in the PWA) is preserved end-to-end. The PWA holds no Airtable credential, no metals-api key, no API secrets — it only knows the two webhook URLs.

This shape was originally chosen to work around Glide Explorer's lack of native Airtable support. After pivoting to a custom PWA (see [decisions/platform-decision.pdf](../decisions/platform-decision.pdf)), the same shape was retained because the boundary is well-designed: business logic stays in one place (Make), the frontend stays thin and replaceable, and adding M2 engines is additive (one webhook per engine).

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

1. **Config in Airtable, logic in Make, UI in the PWA.** These three layers never leak into each other.
2. **Every Make scenario re-reads config on each run.** No caching of margins or coin lists inside Make modules. The PWA caches config in React state per session, refreshable via a "Refresh Config" button — admin edits flow through within one app re-launch (or one button tap).
3. **All API access is fronted by Make.** The PWA holds no external connections. Make holds the Airtable PAT, the metals-api.com access_key, and (in M2) the PCGS / CDN / Apify keys. Browser never sees any credential — only the two Make webhook URLs (which are themselves not secret, just unguessable).
4. **Webhook contracts are versioned.** PWA API client and Make scenarios agree on request/response shapes documented in [api-integrations.md](api-integrations.md). TypeScript types in `web/src/api/types.ts` mirror the response shapes so contract drift surfaces at compile time.
5. **Hard blocks enforced in UI.** Customer DL capture is required before the "Save Deal" webhook can fire (M2).

## Deployment

- **Frontend:** Custom PWA (React + Vite + Tailwind), source in `/web`, hosted on Vercel free tier with auto-deploy on push to `main`. Cart state lives in browser `localStorage`; config is fetched on launch and held in React state for the session. Staff installs the app to the iPad home screen via Safari → Add to Home Screen.
- **Make:** client's workspace. Scenarios run on their plan's ops budget. Airtable connection (`client-airtable`) and external API connections (metals-api.com; M2: PCGS, CDN, Apify) configured here.
- **Airtable:** client's workspace. Base accessed only by Make scenarios — the PWA does not connect directly. Admin edits config tables in Airtable; changes propagate to the PWA on the next `config-load` invocation.
