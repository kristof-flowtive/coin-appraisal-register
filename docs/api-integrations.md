# External API Integrations

Every external API is called from Make scenarios only. Keys live in Make connections under client credentials — never in the frontend, never committed to this repo.

## GoldAPI.io — spot prices (Engine 1)

- **Used by:** `bulk-calc` scenario
- **Endpoints:** `XAU/USD`, `XAG/USD`, `XPT/USD` (gold, silver, platinum per troy ounce)
- **Frequency:** called on every webhook hit — no caching
- **Response cached into deal record:** yes (`spot_gold`, `spot_silver`, `spot_platinum` on `Deal_Log`)

## PCGS CoinFacts API — graded lookup (Engine 2)

- **Used by:** `graded-lookup` scenario
- **Both PCGS and NGC slabs:** NGC barcodes are routed to the same endpoint with `gradingService=NGC`
- **Returns:** cert authentication, grade, coin identity, PCGS Price Guide Value
- **Access note:** PCGS requires an API application/approval — client is responsible for obtaining the key

## CDN Greysheet API — wholesale reference (Engine 2)

- **Used by:** `graded-lookup` scenario, alongside PCGS
- **Returns:** wholesale bid/ask for the identified coin
- **Access note:** subscription required — client-owned

## Apify eBay Sold Listings actor (Engine 3)

- **Used by:** `ebay-comps` scenario
- **Input:** item name string
- **Returns:** list of recent sold prices; Make computes min/max or a trimmed range
- **Actor ID:** TBD — client to confirm which actor (several are published)

## Webhook contracts (frontend ↔ Make)

Versioned as `v1`. If a contract changes, bump to `v2` and keep v1 live until the frontend migrates.

### `POST /bulk-calc`
```json
// request
{ "items": [{ "coin_type_id": "rec...", "quantity": 10 }] }
// response
{ "spot": { "gold": 2055.3, "silver": 32.1, "platinum": 950.0 },
  "lines": [{ "coin_type_id": "rec...", "unit_value": 18.12, "line_total": 181.20 }],
  "total": 181.20 }
```

### `POST /graded-lookup`
```json
// request
{ "cert_number": "12345678", "grading_service": "PCGS" }  // or "NGC"
// response
{ "coin": "1881-S Morgan Dollar", "grade": "MS65",
  "pcgs_price_guide": 210.00, "greysheet_wholesale": 175.00 }
```

### `POST /ebay-comps`
```json
// request
{ "query": "1986 Topps Traded Barry Bonds" }
// response
{ "sold_prices": [45, 52, 48, 60, 55], "range": { "min": 45, "max": 60, "median": 52 } }
```

### `POST /deal-save`
```json
// request: full deal payload matching Deal_Log + Deal_LineItems schema
// response: { "deal_id": "CAR-0042" }
```
