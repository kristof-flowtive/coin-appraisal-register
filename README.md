# Coin Appraisal Register

A proprietary appraisal register app replacing a legacy Google Sheet workflow. Floor staff use an iPad (or laptop) to price coins, graded slabs, and collectibles in real time, then log completed deals to Airtable.

## Stack

| Layer | Technology |
|---|---|
| Front-end | Next.js (custom, deployed on Vercel) — iPad Chrome + laptop |
| Workflow engine | Make.com |
| Data + admin | Airtable |
| External APIs | GoldAPI.io, PCGS CoinFacts, CDN Greysheet, Apify (eBay Sold Listings) |

**Design contract:** All business values — margins, coin list, rep list, raw coin overrides, payment methods — live in Airtable. The admin never touches a Make scenario to change pricing or configuration. API keys live only in Make under client credentials.

## The three engines

1. **Bulk Silver & Metals Calculator** — staff inputs coin type + quantity; Make pulls live spot from GoldAPI.io, applies per-category margin from Airtable, returns total payout.
2. **Graded Coin Lookup** — staff scans barcode (Code 128 or QR) via the iPad camera, or enters a cert number manually. PCGS CoinFacts handles both PCGS and NGC slabs (NGC via `gradingService=NGC`). CDN Greysheet is the wholesale reference. Raw/ungraded coins fall back to an Airtable override table.
3. **Collectibles eBay Comps** — staff types an item name; Make queries the Apify eBay Sold Listings actor and returns a sold-price range. Rep picks an offer within that range.

Every completed deal writes to Airtable with rep, customer, DL capture (hard block if missing), spot price at time of deal, line items, total offer, acceptance, payment method, and cash received.

## Milestones

- **M1** — Bulk Calculator with live GoldAPI.io spot, per-category margin table in Airtable, rep dropdown, works on iPad + laptop.
- **M2** — Full build: graded coin lookup (PCGS + CDN Greysheet), eBay comps (Apify), full deal log to Airtable, Loom walkthrough of every admin-editable setting.

## Repo layout

```
/docs          architecture, data model, API integration notes
/airtable      schema doc + seed CSVs for admin tables
/make          exported scenario blueprints (added during build)
/frontend      Next.js app (added during build)
```

## Handover principle

Any future developer should be able to clone this repo, read `/docs`, import the Make blueprints, and run the Next.js app. No tribal knowledge, no hidden configuration.
