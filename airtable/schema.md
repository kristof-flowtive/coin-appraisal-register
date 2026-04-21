# Airtable Schema

See [`../docs/data-model.md`](../docs/data-model.md) for the authoritative table and field definitions.

## Seed files

| File | Purpose |
|---|---|
| [`seeds/coin_types.csv`](seeds/coin_types.csv) | Initial rows for `Config_CoinTypes` — matches the legacy spreadsheet's predefined list |
| [`seeds/margins.csv`](seeds/margins.csv) | Initial rows for `Config_Margins` — four categories, all at 30% to match current behavior |

## Import order

1. Create tables per `data-model.md`
2. Import `margins.csv` into `Config_Margins`
3. Import `coin_types.csv` into `Config_CoinTypes`
4. Create `Config_Reps`, `Config_PaymentMethods`, `Config_RawCoinOverrides` as empty (populated by client)
5. Create `Deal_Log` and `Deal_LineItems` as empty (populated by Make)

## Notes on the seed data

- The legacy spreadsheet uses pre-computed "times face" multipliers that bake spot price × silver content into one number. The seed reverses that: we store `content_pct` (the invariant) and let Make compute `melt × spot` fresh on every run.
- The legacy spreadsheet has `Half cent` face value listed as `0.1` — this appears to be a typo; the true face value is `0.005`. The seed uses `0.005`.
- 22K gold is listed as `0.9` in the legacy sheet — the standard purity is `0.9167` (22/24). The seed uses the legacy value for parity; adjust if the client wants the standard.
- Platinum purity for scrap items is extremely variable — the legacy sheet uses `0.80` as a default. Admin can override per-item if needed.
