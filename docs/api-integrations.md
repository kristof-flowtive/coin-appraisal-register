# External API Integrations

Every external API is called from Make scenarios only. Keys live in Make connections under client credentials — never in the frontend, never committed to this repo.

## metals-api.com — spot prices (Engine 1)

- **Used by:** `bulk-calc` scenario
- **Endpoint:** `GET https://metals-api.com/api/latest?access_key={KEY}&base=USD&symbols=XAU,XAG,XPT`
- **Auth:** `access_key` query parameter (no header)
- **Response shape:** `{ "success": true, "timestamp": ..., "date": "...", "base": "USD", "rates": { "XAU": ..., "XAG": ..., "XPT": ..., "USDXAU": 4712.89, "USDXAG": 75.70, "USDXPT": 2012.00 } }`
- The response includes both inverse rates (`XAU`/`XAG`/`XPT`) and pre-computed USD-per-troy-ounce values (`USDXAU`/`USDXAG`/`USDXPT`). **Use the `USD*` fields directly** — no inversion needed.
- **Frequency:** called on every webhook hit — no caching inside Make
- **Response cached into deal record:** yes (`spot_gold`, `spot_silver`, `spot_platinum` on `Deal_Log` — stored as USD-per-oz, post-inversion)

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

## Webhook contracts (Glide ↔ Make)

Called from Glide actions ("Call API" / "Trigger Webhook") on user interactions in the iPad app. Versioned as `v1` — if a contract changes, bump to `v2` and keep v1 live until the Glide app migrates.

Glide holds no Airtable credential — all Airtable I/O routes through Make. Glide caches config in Big Tables, populated by `config-load`.

### `POST /config-load`
Returns the current state of `Config_CoinTypes` (active rows) and `Config_Reps` (active rows). Glide calls this on app launch and via a manual "Refresh Config" button. The Make scenario reads Airtable on every call — there's no caching inside Make.

```json
// request: empty body, or any body (ignored)
// response
{
  "coin_types": [
    {
      "id": "recJk7d1DV2rXVjr7",
      "name": "Roosevelt Dime",
      "metal_type": "silver",
      "priced_by": "each_metal",
      "unit_label": "coin",
      "face_value": 0.10
    }
  ],
  "reps": [
    { "id": "rec...", "name": "Alice" }
  ]
}
```

### `POST /bulk-calc`
Each item carries either `quantity` (for `each_metal` coin types — number of coins) or `weight_grams` (for `weight_grams` bulk metals — grams entered on the scale). Make reads `priced_by` from `Config_CoinTypes` and routes accordingly.

```json
// request
{ "items": [
    { "coin_type_id": "rec...", "quantity": 10 },
    { "coin_type_id": "rec...", "weight_grams": 250 }
  ] }
// response
{ "spot": { "gold": 4750.00, "silver": 76.08, "platinum": 2055.30 },
  "lines": [
    { "coin_type_id": "rec...", "name": "Roosevelt Dime", "units": 10, "unit_value": 1.65, "line_total": 16.52 },
    { "coin_type_id": "rec...", "name": "14K Gold", "units": 23.4, "unit_value": 0.74, "line_total": 184.30 }
  ],
  "total": 200.82 }
```

`unit_value` is the per-unit offer (per coin or per gram, matching the request's input unit) at the live spot and current `margin_pct`. `name` mirrors `Config_CoinTypes.name` and `units` echoes the request's `quantity` or `weight_grams` — both are convenience fields for log/admin views; the PWA itself sources display names from its cached config (cart denormalizes coin metadata at add-time).

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
