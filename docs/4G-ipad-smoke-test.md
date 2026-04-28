# Phase 4G — iPad install + smoke test

Run through this once you have access to an iPad. The goal is to confirm the deployed PWA at https://coin-appraisal-register.vercel.app behaves correctly on real iOS hardware before client transfer (4F.2) and sign-off (4H).

## Prereqs

- An iPad (any model running iOS 14+)
- Wi-Fi (or cellular)
- Safari (Chrome can't install a PWA on iOS — Apple-imposed limit)

## Install

- [ ] On the iPad, open **Safari** (blue compass icon)
- [ ] Navigate to **https://coin-appraisal-register.vercel.app**
- [ ] Wait for the calculator screen to render
- [ ] Tap the **Share** button (square with up-arrow, in the address bar)
- [ ] Scroll the share sheet, tap **Add to Home Screen**
- [ ] Confirm the icon shows a gold "C" and the name reads **"Coin Register"**
- [ ] Tap **Add**
- [ ] Close Safari fully (swipe up from bottom, then swipe Safari off-screen)

## Visual checks (on first open from home-screen icon)

- [ ] Tap the new gold **C** icon
- [ ] App opens **full-screen** — no Safari address bar, tabs, or navigation chrome
- [ ] Brief splash with gold theme color before content renders
- [ ] Header shows "Coin Appraisal Register" + "Refresh Config" button
- [ ] Rep dropdown shows "Select rep…"
- [ ] Bag is empty: "Add a coin to get started."
- [ ] Bottom bar: "Total $0.00", green "Calculate Total" (disabled), "New Bag"

If any visual check fails (especially "full-screen"), the install didn't take cleanly — usually a service worker / cache issue. Remove the icon from the home screen, clear Safari cache, and re-install.

## Functional smoke tests

### Rep + single item

- [ ] Tap Rep dropdown → shows **Adam, Amy, John**
- [ ] Pick a rep
- [ ] Tap **Add Coin**
- [ ] Modal opens (slides up from bottom)
- [ ] Coins are grouped by metal: Silver / Gold / Platinum
- [ ] Tap **Roosevelt Dime** (under Silver) — row highlights, "Quantity" input appears below the list, gets focus
- [ ] iPad shows a **numeric keypad** (just digits, no full keyboard)
- [ ] Type **10** → tap **Add to Bag**
- [ ] Modal closes, "Roosevelt Dime — 10 coin" appears in the bag
- [ ] Tap **Calculate Total**
- [ ] Total updates to **~$15.87** (varies with live spot price)
- [ ] Spot prices banner appears showing gold/silver/platinum

### Multi-item + decimal input

- [ ] Tap **Add Coin** again
- [ ] Tap **14K Gold** (under Gold) — "Weight (grams)" input appears
- [ ] iPad shows a **decimal keypad** (digits + `.`)
- [ ] Type **23.4** → Add to Bag
- [ ] Tap **Calculate Total**
- [ ] Total now shows **~$620** (Roosevelt $16 + 14K Gold $604)

### Edit + remove

- [ ] Tap the quantity number next to Roosevelt Dime in the bag
- [ ] Change `10` to `20` → tap Calculate
- [ ] Total updates roughly proportionally
- [ ] Tap the **×** on the 14K Gold row
- [ ] Row removed; Calculate again — total is silver-only

### New Bag + rep auto-clear

- [ ] Tap **New Bag**
- [ ] Confirm dialog: "Start a new bag? This clears the cart."
- [ ] Tap OK
- [ ] Cart empties, total resets to $0.00
- [ ] Add a coin to the bag again
- [ ] Switch the Rep dropdown to a **different** rep
- [ ] Cart auto-clears (no confirm dialog) — this is the rep-handoff safety net

### Persistence across app close

- [ ] Pick a rep, add a coin, but **don't** tap Calculate
- [ ] Swipe up to close the app
- [ ] Re-open from home screen
- [ ] Selected rep is still chosen, cart still has the line
- [ ] (Total resets to $0.00 since lastCalc isn't persisted — by design)

### Refresh Config

- [ ] Tap **Refresh Config** in the header
- [ ] Button briefly shows "Refreshing…"
- [ ] No error banner

## Live margin propagation (optional — needs Airtable access)

This proves admin edits in Airtable surface immediately on the floor without re-deploying.

- [ ] On a laptop, open Airtable → `Config_Margins` table
- [ ] Change Silver `margin_pct` from `0.30` to `0.50` → save
- [ ] On the iPad, **without** tapping Refresh Config, tap **Calculate Total** with silver in the bag
- [ ] New total is ~67% higher than before (margin went from 30% to 50%)
- [ ] **Restore** the silver margin to `0.30` afterwards

Margins are read by `bulk-calc` on every webhook call, so no Refresh Config is needed for margin changes — only for coin/rep list changes (`Config_CoinTypes`, `Config_Reps`).

## Coin list refresh (optional — needs Airtable access)

- [ ] In Airtable → `Config_CoinTypes`, add a test row (any coin), `active = true`
- [ ] On iPad, tap **Refresh Config**
- [ ] New coin now appears in the Add Coin modal
- [ ] **Delete** the test row in Airtable when done

## iPad-specific gotchas to flag

If anything in this list happens, capture a note and surface it during sign-off:

- [ ] Any button feels too small to tap comfortably with a thumb
- [ ] Numeric keypads show the full keyboard instead (iOS sometimes ignores `inputmode`)
- [ ] Layout breaks at the bottom — content cut off by home indicator, or the calculate button overlaps content
- [ ] Service worker behaves oddly (e.g., shows a stale total after a config change — stop testing and tell the dev)
- [ ] Cold-load offline: airplane-mode the iPad, kill the app, re-open from home screen — should render the shell with an error banner on Calculate, *not* a blank page

## Done when

All boxes above checked, no unresolved gotchas. Move to Phase 4F.2 (transfer to client) and Phase 4H (sign-off).
