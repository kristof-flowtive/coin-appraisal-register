# Frontend (Next.js)

Next.js app will be scaffolded here in M1. Deployed to Vercel.

## Planned structure (App Router)

```
app/
  layout.tsx
  page.tsx                  home / auth landing
  calc/page.tsx             Engine 1 — bulk calculator
  graded/page.tsx           Engine 2 — graded coin lookup
  collectibles/page.tsx     Engine 3 — eBay comps
  deal/[id]/page.tsx        review + save a deal
lib/
  make.ts                   typed webhook client
  airtable-types.ts         shared types matching Config tables
components/
  Scanner.tsx               camera-based barcode scanner
  NumberPad.tsx             large tap-target quantity input
```

## Env vars

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_MAKE_WEBHOOK_BASE` | Root URL for Make webhooks (public — Make auth is scenario-level) |

## Device targets

- iPad Chrome (primary)
- Laptop Chrome / Safari
- Large tap targets throughout — designed for standing retail/floor use
