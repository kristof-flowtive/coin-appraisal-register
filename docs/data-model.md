# Data Model (Airtable)

All tables live in a single Airtable base. Config tables are admin-editable; transactional tables are written to by Make.

## Config tables (admin-editable)

### `Config_Margins`
One row per category. Engine 1 reads these on every run.

| Field | Type | Notes |
|---|---|---|
| `category` | Single select | `Silver`, `Gold`, `Platinum`, `Collectibles` |
| `margin_pct` | Number (decimal) | e.g. `0.30` for 30% |
| `notes` | Long text | Optional — why the margin is what it is |

Default seed (matches current spreadsheet behavior): all four rows at `0.30`.

### `Config_CoinTypes`
The predefined list staff sees in Engine 1. Seeded from `airtable/seeds/coin_types.csv`.

| Field | Type | Notes |
|---|---|---|
| `name` | Single line text | Display name, e.g. `Morgan Silver Dollar` |
| `denomination` | Single line text | `dime`, `quarter`, `half`, `dollar`, `penny`, `nickel`, `bulk` |
| `face_value` | Number | In dollars, e.g. `0.25` |
| `metal_type` | Single select | `silver`, `gold`, `platinum`, `copper`, `collectible` |
| `content_pct` | Number (decimal) | Metal purity, e.g. `0.90` for 90% silver, `0.583` for 14K |
| `priced_by` | Single select | `face_value` (most coins) or `weight` (bulk metals) |
| `active` | Checkbox | Lets admin temporarily hide without deleting |

### `Config_Reps`

| Field | Type | Notes |
|---|---|---|
| `name` | Single line text | Displayed in dropdown |
| `active` | Checkbox | |

*(Rep list content TBD — client to provide names.)*

### `Config_PaymentMethods`

| Field | Type | Notes |
|---|---|---|
| `name` | Single line text | e.g. `Cash`, `Check`, `Wire` |
| `active` | Checkbox | |

*(Exact options TBD with client.)*

### `Config_RawCoinOverrides`
Engine 2 fallback for ungraded / raw coins.

| Field | Type | Notes |
|---|---|---|
| `coin_name` | Single line text | |
| `override_price` | Currency | What the rep offers for this raw coin |
| `notes` | Long text | |

## Transactional tables (written by Make)

### `Deal_Log`
One row per completed deal.

| Field | Type | Notes |
|---|---|---|
| `deal_id` | Formula / autonumber | e.g. `CAR-0001` (format TBD) |
| `created_at` | Created time | |
| `rep` | Link → `Config_Reps` | |
| `customer_name` | Single line text | |
| `customer_dl` | Attachment | **Hard block: required** |
| `spot_gold` | Number | Spot at time of deal |
| `spot_silver` | Number | |
| `spot_platinum` | Number | |
| `total_offer` | Currency | |
| `offer_accepted` | Checkbox | |
| `payment_method` | Link → `Config_PaymentMethods` | |
| `cash_received` | Currency | |
| `line_items` | Link → `Deal_LineItems` | |

### `Deal_LineItems`
One row per item in a deal.

| Field | Type | Notes |
|---|---|---|
| `deal` | Link → `Deal_Log` | |
| `source_engine` | Single select | `bulk`, `graded`, `collectible`, `raw` |
| `coin_type` | Link → `Config_CoinTypes` | Nullable (graded/collectibles don't use it) |
| `description` | Single line text | For graded/collectible items (cert#, item name) |
| `quantity` | Number | |
| `unit_value` | Currency | Offer per unit |
| `line_total` | Formula | `quantity × unit_value` |

## Engine 1 pricing math

For each line (from `Config_CoinTypes`):

```
melt_per_unit   = spot_price(metal_type) × content_pct × weight_per_unit
offer_per_unit  = face_value × melt_per_unit × margin_pct(category)
line_total      = quantity × offer_per_unit
```

For `priced_by = weight` items (bulk metals), `face_value` is replaced by grams entered at time of deal.

> **Note:** The legacy spreadsheet uses pre-computed "times face" multipliers that already fold silver content × weight into a single number. In Airtable we keep `content_pct` and spot separate so admin changes are transparent.
