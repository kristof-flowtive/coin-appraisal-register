# Architecture

## High-level flow

```
iPad / laptop (Next.js on Vercel)
        │
        │  HTTPS webhooks (JSON in, JSON out)
        ▼
   Make.com scenarios
        │
        ├── GoldAPI.io          (spot prices)
        ├── PCGS CoinFacts      (graded coin lookup, incl. NGC via gradingService)
        ├── CDN Greysheet       (wholesale reference)
        ├── Apify eBay actor    (collectible comps)
        │
        ▼
     Airtable (single source of truth for config + deal log)
```

## Scenario inventory (to be exported into `/make` during build)

| Scenario | Trigger | Purpose |
|---|---|---|
| `bulk-calc` | Webhook | Return live offer for Engine 1 |
| `graded-lookup` | Webhook | Cert → grade + price (Engine 2) |
| `ebay-comps` | Webhook | Item name → sold-price range (Engine 3) |
| `deal-save` | Webhook | Write completed deal + line items to Airtable |
| `raw-coin-lookup` | Webhook | Fallback for ungraded coins via Airtable override table |

## Key principles

1. **Config in Airtable, logic in Make, UI in Next.js.** These three layers never leak into each other.
2. **Every scenario re-reads config on each run.** No caching of margins or coin lists inside Make modules.
3. **API keys live only in Make connections.** The frontend calls Make webhooks, not external APIs directly — keys stay out of the browser.
4. **Webhook contracts are versioned.** Frontend and Make agree on request/response shapes documented here.
5. **Hard blocks enforced in UI.** Customer DL capture is required before the "Save Deal" webhook can fire.

## Deployment

- Frontend: Vercel, connected to this GitHub repo. Environment vars: `NEXT_PUBLIC_MAKE_WEBHOOK_BASE` (the Make webhook root URL).
- Make: client's workspace. Scenarios run on their plan's ops budget.
- Airtable: client's workspace. Base ID + API key live in Make connections only.
