# Glide app build guide — Phase 2.5 + Phase 3

This is the canonical step-by-step for finishing M1 from where Phase 2 (the `bulk-calc` Make scenario) left off. Read [STATUS.md](../STATUS.md) first if you haven't.

## Glide UI orientation (read once if you've never used Glide)

Glide's editor is a three-pane layout:

- **Left rail** — global navigation. Major sections: **Layout** (screens), **Data** (tables), **Settings**, **Branding**, **Users**, **Publish**.
- **Center** — depends on which section you're in. In **Layout**, this is a live phone-shaped preview of the app. Click components in the preview to select them. In **Data**, this is a spreadsheet-style table editor.
- **Right rail** — properties panel. When you click a component or column, this is where you configure it.

Add things by hovering over the **+** icons that appear in the left rail or in the preview. To delete, select and press **Delete** or use the trash icon.

Two concepts to remember:

1. **Tables vs Big Tables vs External** — Glide stores data in three places. Glide Tables (free, lightweight, capped row count). Big Tables (also Glide-hosted, higher row caps, available on most paid plans including yours). External sources (Airtable, Sheets, etc.) — locked behind Business tier on your plan, which is why we're routing through Make instead.
2. **User-specific rows** — a Big Table can be configured so that each signed-in user sees only their own rows. We'll use this for the cart so two reps using the same iPad don't see each other's in-progress totals.

If something in Glide looks different from what's described here, the underlying concept is what matters — feature names drift between Glide releases.

---

# Phase 2.5 — `config-load` Make scenario

A second Make scenario whose only job is to return the active coin types and reps as JSON. Glide calls it on app load (and via a "Refresh" button) to populate its local Big Tables.

## Why this exists

Without this scenario, Glide has no way to know what coin types exist (since it can't read Airtable directly on the Explorer plan). The `bulk-calc` scenario takes specific `coin_type_id`s as input — Glide needs to know what IDs are valid before it can build a payload.

## Webhook contract

```json
// request — empty body, or any body (ignored)
GET or POST <webhook URL>

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
    },
    ...24 rows
  ],
  "reps": [
    { "id": "rec...", "name": "Alice" },
    ...
  ]
}
```

## Build steps

1. **In Make:** create a new scenario, call it `config-load`.
2. **Import the pre-built blueprint:** `...` menu → **Import Blueprint** → choose [../make/config-load.v1.blueprint.json](../make/config-load.v1.blueprint.json) from the repo.
3. **Three things to fix post-import** (same pattern as bulk-calc):
   - **Webhook (module 1):** click the webhook module → **Add** a new hook → name `config-load` → save. **Copy the webhook URL** — Glide will need it.
   - **Airtable connections (modules 2, 4):** click each Airtable Search Records module → set **Connection** to `client-airtable` (or whichever Airtable connection name you used).
   - **Bases + tables:** should auto-resolve since the IDs are baked into the blueprint, but verify they show "Coin Appraisal Register" → "Config_CoinTypes" and "Config_Reps" respectively.
4. **Save.**

## Test

1. Click **Run once** in Make.
2. From Postman, send a POST (empty body fine) to the new `config-load` webhook URL.
3. The response should contain `coin_types` (24 entries) and `reps` (0 entries until the client adds names — see "Things blocking the work" in STATUS).
4. Verify each coin_types item has all six fields: `id`, `name`, `metal_type`, `priced_by`, `unit_label`, `face_value`.
5. **Activate the scenario** (toggle bottom-left to ON), same as bulk-calc.

## If the response shape isn't right

Same debugging muscle memory from bulk-calc:
- `[{object}]` literal text in the response → Webhook Response is using `toString()` on the array. Fix: use the JSON > Create JSON module (the blueprint should already have this — verify it didn't get dropped during import).
- `null` values for fields you expect to have data → Aggregator field references are wrong. Check that `name`, `metal_type`, etc. reference the Search Records module's flat output (`{{2.name}}`, NOT `{{2.fields.name}}`).
- Empty `coin_types` array → the `active = TRUE` filter formula isn't matching. Check the formula in module 2.

When the test response looks right, save the webhook URL somewhere reachable. We need it in Phase 3B.

---

# Phase 3 — Glide app

You should be invited to the client's Glide workspace already. If not, stop and resolve that first.

## 3A · Create the app

1. **In Glide:** click **+ New app** at the top of the apps list.
2. Choose data source: **Linked Glide Table** (we'll add Big Tables next).
3. Glide creates a default app with a sample table. **Don't customize it yet** — we'll wipe and rebuild.
4. Rename the app: top-left → click the app name → rename to `Coin Appraisal Register` (or whatever the client wants for branding).

## 3B · Set up Big Tables for config + cart

We need three Big Tables:
- `CoinTypes` — populated by the `config-load` webhook
- `Reps` — populated by the `config-load` webhook
- `Cart` — user-specific, ephemeral (lines the rep adds during one customer interaction)

### Create the `CoinTypes` Big Table

1. Left rail → **Data** → click **+** next to "Tables" → **Glide Big Tables**.
2. Name it `CoinTypes`.
3. Add columns (click **+ Add column** for each):

| Column name | Type |
|---|---|
| `id` | Text (this is the Airtable record ID) |
| `name` | Text |
| `metal_type` | Text |
| `priced_by` | Text |
| `unit_label` | Text |
| `face_value` | Number |

### Create the `Reps` Big Table

Same way:

| Column name | Type |
|---|---|
| `id` | Text |
| `name` | Text |

### Create the `Cart` Big Table

1. **+** → Glide Big Tables → name `Cart`.
2. Settings (after creating): toggle **Row owner** or **User-specific rows** ON. (Different Glide versions name this differently — look for "rows are private to each user" or similar.)
3. Columns:

| Column name | Type |
|---|---|
| `coin_type_id` | Text |
| `coin_name` | Text |
| `metal_type` | Text |
| `priced_by` | Text |
| `unit_label` | Text |
| `quantity` | Number |
| `weight_grams` | Number |
| `created_at` | Date Time |

The `Cart` rows will be created as the rep adds coins, and cleared at the end of each customer interaction via a "New Bag" button.

## 3C · Wire the `config-load` action

This is the action that calls our Phase 2.5 webhook and populates `CoinTypes` and `Reps`.

> **Note up front:** Glide's exact UI for "iterate through a webhook response and add rows" varies between versions. The pattern below is the most common shape; if your Glide UI presents things differently, the underlying capability you're looking for is "Call API → for each item in response array → Add Row." If you can't find that, drop a note and we'll figure out a workaround (see "Fallbacks" at the end of this section).

### Add a "Refresh Config" button

1. Left rail → **Layout**. The default screen is showing. Click the **+** to add a component.
2. Choose **Button**. Place it on the screen for now (we'll move/hide it later).
3. Label: `Refresh Config`.
4. Right rail → **Action** → **Compound Action** (or "Custom Action" / "Sequence" depending on Glide version).
5. Build the sequence:
   - **Step 1: Call API**
     - Method: POST (or GET — webhook accepts either)
     - URL: paste the `config-load` webhook URL from Phase 2.5
     - Headers: `Content-Type: application/json`
     - Body: `{}` (empty JSON)
     - Response: capture the response body
   - **Step 2: Clear `CoinTypes` table** (action: Delete All Rows, or via a "Set columns to" pattern)
   - **Step 3: For each item in `response.coin_types` → Add Row to `CoinTypes`**, mapping each JSON field to the corresponding column.
   - **Step 4: Clear `Reps`** and **Step 5: For each item in `response.reps` → Add Row to `Reps`**.

### If "for each in array" isn't available in your Glide

**Fallback 1: JSON-column approach.** Store the entire `coin_types` array as a JSON value in a single user-specific column. Use Glide's "Choice" component bound to JSON keys. More awkward to bind UI to but avoids iteration.

**Fallback 2: One-item-at-a-time.** Have the Make `config-load` scenario be called per-row by Glide (e.g., paginated or "fetch one record at a time"). More complex on the Make side; only worth it if Fallback 1 doesn't work either.

**Fallback 3: Manual sync.** Run config-load via Postman, copy the JSON response, paste into the Big Tables manually one time. Update manually whenever Airtable changes. Defeats the design contract but gets us shipped if Glide's iteration is the blocker. **Only use as a last resort.**

When you can demonstrate the Refresh Config button populates `CoinTypes` with 24 rows and `Reps` with whatever rows the client has added, this phase is done.

## 3D · Build the Calculator screen

Now the real UI. We'll add components to the default screen (renamed to "Calculator").

### Screen-level setup

1. Left rail → **Layout** → click the existing screen → rename to **Calculator**.
2. Delete any default components Glide added (sample list, etc.).
3. (Recommended) at the top, set background and tweak title styling. We'll come back to branding later.

### Components, top to bottom

#### 1. Header

- **Component:** Title or Rich Text
- **Content:** "Coin Appraisal Register" (or whatever the client wants for branding)

#### 2. Rep dropdown

- **Component:** Choice
- **Source:** `Reps` Big Table
- **Display:** `name`
- **Value:** `id` (we want the Airtable rec ID for downstream)
- **Bind to:** a user-specific column on a "session" table — OR use Glide's user-profile pattern:
  - Easier path: create a 1-row Big Table called `Session` with a user-specific `selected_rep_id` column, and bind the Choice to that.
  - The selected rep ID will be passed to `bulk-calc` later in M2; for M1 it's just for display.
- **Placeholder:** "Select rep"

#### 3. "Add Coin" button

- **Component:** Button
- **Label:** "Add Coin"
- **Action:** Open form / show form screen (next section).

This opens a separate form screen where the rep picks a coin type and enters quantity or grams.

#### 4. Cart list (Inline List)

- **Component:** Inline List or Collection
- **Source:** `Cart` Big Table (only the current user's rows, since the table is user-specific)
- **Title field:** `coin_name`
- **Subtitle field:** computed text, e.g., `quantity` + " " + `unit_label` (Glide template column or formula)
- **Action on tap:** Show row detail (so the rep can edit quantity or delete the line)

#### 5. Total display

- **Component:** Big Number or Title with computed value
- **Source:** for M1, this displays the result of the most recent `bulk-calc` call. Approach options:
  - Store the response total in a Session column (`last_total`) and bind the number to that.
  - Simpler: just display `last_total` formatted as currency.

#### 6. "Calculate" button

- **Component:** Button (visually prominent — full-width, large)
- **Label:** "Calculate Total"
- **Action:** call the `bulk-calc` webhook with the cart contents.

The action sequence:
1. **Build the request body** — Glide needs to map the current `Cart` rows into the `bulk-calc` request shape:
   ```json
   {
     "items": [
       { "coin_type_id": "...", "quantity": 10 },
       { "coin_type_id": "...", "weight_grams": 23.4 },
       ...
     ]
   }
   ```
   For each row in `Cart`, include `coin_type_id` and either `quantity` or `weight_grams` based on `priced_by`.
2. **Call API** — POST to the `bulk-calc` webhook URL with this body.
3. **Capture response** — the JSON has `total`, `lines`, and `spot`.
4. **Set Session columns** — write `response.total` to `Session.last_total`, optionally write spot prices to display somewhere.

#### 7. "New Bag" / "Clear Cart" button

- **Component:** Button (smaller, less prominent — maybe outlined style)
- **Label:** "New Bag"
- **Action:** Delete All Rows from `Cart` (filtered to current user) + reset `Session.last_total` to 0.

### Add Coin form screen

This is the screen the "Add Coin" button opens.

1. **Title:** "Add a coin"
2. **Field 1:** Choice component — pick from `CoinTypes`. Display: `name`. Filter: `priced_by != "flat"` (our schema doesn't have flat in M1, but defensive). Group/sort by `metal_type` so silver coins cluster together.
3. **Field 2:** depends on the selected coin's `priced_by`. Show conditionally:
   - If `priced_by == "each_metal"` → number input labeled "Quantity"
   - If `priced_by == "weight_grams"` → number input labeled "Weight (grams)"

   In Glide, this is conditional component visibility — set the visibility filter on each field.
4. **Submit button:**
   - Label: "Add to Bag"
   - Action: Add row to `Cart` with the selected coin's metadata + the quantity/grams entered, then close the form.

### Optional: spot prices display

Add a small banner showing `spot_silver`, `spot_gold`, `spot_platinum` from the most recent calculate response. Useful for reps to see context.

## 3E · End-to-end smoke test

Once 3D is functional, run the same scenarios we tested in Make:

### Single item

1. Open the app (in Glide preview — phone-shaped center pane).
2. Pick a rep (or any active rep — add one to `Config_Reps` if empty).
3. Add Coin → Roosevelt Dime → Quantity 10.
4. Calculate Total.
5. **Expect:** ~$16.43 (varies slightly with current spot).

### Multi-item

1. (Cart should still have the dime if you didn't clear.)
2. Add Coin → 14K Gold → Weight 23.4g.
3. Calculate Total.
4. **Expect:** ~$636 (current silver $76 / gold $4700 ish).

### Clear cart

1. Click "New Bag."
2. Cart list should be empty. Total resets to 0.

### Refresh config

1. Click "Refresh Config" button.
2. `CoinTypes` should re-populate from Airtable. Add a new row in Airtable's `Config_CoinTypes`, run Refresh, and verify the new row appears in Glide's `CoinTypes`.

## 3F · iPad install

Once the app works in the Glide preview:

1. **Publish** the app (top-right of Glide editor).
2. Glide gives you a **public URL** like `coin-register.glideapp.io` or similar.
3. On the iPad, open **Safari** (not Chrome — PWA install only works in Safari on iOS).
4. Navigate to the URL.
5. Tap the **Share** icon → **Add to Home Screen**.
6. The icon appears on the iPad home screen. Tap it. The app opens **full-screen, no Safari chrome** — that's the PWA install.

If reps need to log in, set up Glide's user table with their email addresses. (Glide's user list is separate from `Config_Reps`; one is for app authentication, the other is for the rep dropdown.)

## 3G · Polish

Things to do once the core works:

- **Branding:** left rail → **Branding** → upload client's logo (square PNG, ≥ 512×512), set primary accent color, set splash screen.
- **Tap-target sizing:** verify buttons are at least 44pt high (Apple HIG). Glide's defaults are usually fine for iPad.
- **Empty states:** when Cart is empty, show a "Add a coin to get started" message instead of a blank list.
- **Loading states:** Glide handles most of this automatically, but the Calculate button should show a spinner during the webhook call.
- **Error handling:** if the webhook returns an error or the network is down, show a friendly message instead of silently failing.

## 3H · Sign-off checklist

Before declaring M1 done:

- [ ] App installs on iPad as a PWA, full-screen, no Safari chrome
- [ ] Rep dropdown shows all active reps from Airtable
- [ ] Coin picker shows all 24 active coin types, grouped/sorted readably
- [ ] Adding a Roosevelt Dime + 10 quantity, calculating, and seeing ~$16 works
- [ ] Adding 14K Gold + 23g, calculating, and seeing ~$300+ added to total works
- [ ] Editing a margin in Airtable's `Config_Margins` and re-calculating reflects the new margin
- [ ] Adding a new active row to `Config_CoinTypes` in Airtable and clicking Refresh Config makes the row appear in the coin picker
- [ ] "New Bag" clears the cart cleanly
- [ ] Two different reps signed into the same Glide app see separate carts (user-specific row ownership working)
- [ ] Loom walkthrough recorded showing the admin path (edit margin in Airtable → see change reflected) — required by the M2 milestone but worth doing now while the build is fresh

---

## Things to ask me about when you hit them

- Glide's exact "for each in response array" UI — I'm working from memory of Glide's older versions, the current UI may have moved
- The `Session` Big Table pattern (1-row table for global state) — Glide may have a cleaner pattern in a recent release
- Conditional component visibility for the quantity-vs-grams input — usually a simple "show if" filter but the field name varies
- Webhook body templating in Glide actions — building the `items` array from `Cart` rows is the trickiest piece

Don't push through if Glide's UI doesn't match this doc — drop a screenshot and we'll adapt.
