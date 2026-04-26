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

- **Source of `oz_metal_per_unit`:**
  - 90% US silver coinage (Roosevelt/Mercury/Seated/Barber dimes, Washington/Standing Liberty/Barber quarters, Walking Liberty/Franklin/Barber/Seated halves, Kennedy 1964): standard "junk silver" content per coin — dime `0.07234`, quarter `0.18084`, half `0.36169`, Morgan/Peace dollar `0.77344` troy oz.
  - Kennedy Half 1965-70 (40% silver-clad): `0.14790` oz silver per coin.
  - Eisenhower 40% silver-clad dollar (1971-78): `0.31624` oz silver per coin.
  - Jefferson War Nickel (35% silver, 1942-45): `0.05626` oz silver per coin.
  - Bulk metals (`weight_grams`): `content_pct / 31.1035` (grams-per-troy-oz) — e.g., 14K = `0.583 / 31.1035 = 0.01874`.
- **22K gold uses `0.9167`** (true 22/24 purity). The legacy sheet displayed `0.9` in its `Face Value` column but its underlying multiplier formula used `0.9167` — we're using the formula's value, which is correct.
- **Platinum scrap content** is extremely variable; the seed uses `0.80` per the legacy default. Admin can add per-item rows if a particular alloy needs different handling.
- **Wholesale-discount factor folded into `margin_pct`:** legacy applied a separate ~0.87-0.93 wholesale factor on top of its 30% margin. The new system has one knob — `margin_pct` in `Config_Margins`. To exactly replicate legacy economics, set `margin_pct ≈ 0.263`. Seed uses `0.30` (slightly more generous than legacy effective rate).
- **Collectibles excluded from this seed:** flat-price antique coins (Indian Head Penny, Flying Eagle, Large Cent, Half Cent, 2¢, 3¢, Buffalo Nickel, Shield Nickel, Victory Nickel, Wheat/Steel Penny) belong in `Config_RawCoinOverrides` — handled by the M2 raw-coin lookup engine, not Engine 1.
- **Legacy spreadsheet bug we fixed:** legacy stored hardcoded "times face" multipliers (e.g., `48.2482` for any 90% silver) that staff had to manually re-edit when spot moved. The new seed stores only invariants (`oz_metal_per_unit`); Make multiplies by live spot on every run.
