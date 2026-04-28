# Custom PWA build plan — Phase 4

This doc replaces [../glide/screens.md](../glide/screens.md) as the active build guide. Read [../STATUS.md](../STATUS.md) first for current state.

The Airtable schema, Make scenarios (`bulk-calc`, `config-load`), and webhook contracts in [api-integrations.md](api-integrations.md) are unchanged — the PWA consumes them as-is.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Fastest dev server + lean prod bundles. No SSR needed — app is fully client-side. |
| Framework | **React + TypeScript** | TS catches webhook payload drift at the boundary. React's component model maps cleanly to the screen list. |
| Styling | **Tailwind CSS** | Utility-first; iterating on iPad sizing is fast; no separate CSS files to coordinate. |
| PWA | **vite-plugin-pwa** | Generates manifest + service worker + icon set in one config. Well-maintained, works with Vite out of the box. |
| State | **React `useState` / `useContext` + `localStorage`** | Cart and selected rep are session-scoped; no need for Redux/Zustand. |
| HTTP | **Native `fetch` + thin typed wrapper** | Two webhook calls. Axios would be overkill. |
| Hosting | **Vercel free tier** | Zero-config deploys from GitHub. Free tier covers this scale (single-tenant, low traffic). |
| Tests | **None initially** | iPad smoke test is the load-bearing validation. Add Vitest later if maintenance value beats friction. |

**Rejected alternatives:** Next.js / Remix (no SSR benefit), vanilla JS (loses TS guardrails), Svelte (no codebase momentum, harder handover). The chosen stack is the boring-and-correct default for this size of app.

## Architectural decisions

These shape Phase 4 decisions throughout — flag any change here before deviating.

1. **Cart lives in the browser, not in any database.** Stored in `localStorage` so an accidental refresh doesn't lose lines. **Each iPad owns its own cart** — multiple iPads on the floor each carry independent state, no cross-device sync. Concurrent webhook calls from multiple iPads are fine (Make executes each webhook hit independently). *Open question on rep handoff per iPad — see "Decisions to confirm" below.*
2. **No auth in M1.** Rep dropdown identifies who's on the deal — not who's authenticated. We trust the deployment URL. M2 will add auth when we start writing deals to Airtable.
3. **Config fetched on launch, cached in React state.** No `localStorage` for config — re-fetch on every app open (cheap, ~1 second). A "Refresh Config" button forces re-fetch mid-session if the admin edits Airtable while staff are using the app.
4. **Calculate is explicit, not reactive.** Tapping "Calculate Total" triggers the webhook. Don't auto-calculate on cart changes — would create UI flicker and unnecessary load.
5. **Spot prices shown alongside the total.** The `bulk-calc` response includes spot; surface it so reps see the live context. Stays cached until next Calculate call.
6. **Error states are visible, not silent.** Network/webhook failures show a toast or banner with a retry affordance. We never want the rep to think a stale total is fresh.

## Repo layout addition

```
web/                           PWA source (created in 4A)
  index.html
  vite.config.ts
  tailwind.config.ts
  package.json
  .env.example                 documents required env vars; .env.local is gitignored
  src/
    main.tsx                   React entry
    App.tsx                    top-level layout + routing (none, but place for it)
    api/                       webhook clients (configLoad, bulkCalc) + types
    state/                     useCart, useConfig, useSession hooks
    components/                CalculatorScreen, AddCoinModal, CartList, etc.
    pwa/                       manifest config + icon assets
```

## Phase 4A — Project scaffold

**Goal:** boots a "hello world" PWA in `/web` with Tailwind and the PWA plugin wired. ~2–3 hr.

1. From repo root: `npm create vite@latest web -- --template react-ts`
2. `cd web && npm install`
3. Install Tailwind: `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`. Configure `tailwind.config.ts` content paths to include `./index.html` and `./src/**/*.{ts,tsx}`. Add `@tailwind base; @tailwind components; @tailwind utilities;` to `src/index.css`.
4. Install PWA plugin: `npm install -D vite-plugin-pwa`. Add to `vite.config.ts` with placeholder manifest (real icons + branding land in 4E).
5. Create `.env.example` with `VITE_CONFIG_LOAD_URL=` and `VITE_BULK_CALC_URL=`. Create `.env.local` with the real values (gitignored).
6. Add to `.gitignore` (in repo root): `web/node_modules`, `web/dist`, `web/.env.local`, `web/.env*.local`.
7. `npm run dev` → confirm "hello" page loads at `localhost:5173` with Tailwind classes applying.

**Done when:** dev server runs, Tailwind utilities work in the page, PWA plugin generates a manifest in build (verify with `npm run build`).

## Phase 4B — Types, API client, and cart state

**Goal:** all data plumbing exists and is testable from the dev console before building any UI. ~2–3 hr.

1. **`src/api/types.ts`** — TS interfaces matching the webhook responses in [api-integrations.md](api-integrations.md):
   - `CoinType`, `Rep`, `ConfigLoadResponse`
   - `BulkCalcRequestItem`, `BulkCalcResponse`, `BulkCalcLine`, `Spot`
2. **`src/api/client.ts`** — two functions, both using `fetch`:
   - `loadConfig(): Promise<ConfigLoadResponse>` — POST to `VITE_CONFIG_LOAD_URL`, empty body, parse JSON, throw on non-2xx.
   - `calculateBulk(items: BulkCalcRequestItem[]): Promise<BulkCalcResponse>` — POST to `VITE_BULK_CALC_URL` with `{items}` body.
3. **`src/state/useConfig.ts`** — hook that loads config on mount, exposes `{coinTypes, reps, loading, error, refresh}`.
4. **`src/state/useCart.ts`** — hook backed by `localStorage` (key: `car.cart.v1`). Exposes `{lines, addLine, removeLine, updateLine, clear}`. Each `CartLine` carries denormalized coin metadata (name, metal_type, priced_by, unit_label) plus the user input (`quantity` OR `weight_grams`) and the source `coin_type_id`.
5. **`src/state/useSession.ts`** — selected rep ID (persisted to localStorage so the iPad remembers across launches) and last calculate result (in-memory only; resets on new bag).
6. Smoke-test from the dev console: `await window.__test.loadConfig()` returns 24 coin types; `await window.__test.calculateBulk([{coin_type_id: 'rec...', quantity: 10}])` returns a total. (Expose these temporarily under `window.__test` for testing.)

**Done when:** both webhooks are callable from the dev console with correct typing; cart survives a page refresh; refresh-config function re-fetches and updates the hook's state.

## Phase 4C — Calculator screen

**Goal:** the main screen, fully wired to the hooks from 4B. ~3–5 hr.

Layout (top to bottom):
1. **Header** — app title (placeholder until branding lands), Refresh Config icon button (top-right corner).
2. **Rep dropdown** — Choice/Select bound to `useSession.selectedRepId`, options from `useConfig.reps`. Placeholder text: "Select rep". Disable Calculate Total until a rep is selected.
3. **Cart list** — one row per cart line: coin name, quantity/grams + unit label, small delete (X) affordance. Empty state: "Add a coin to get started." Tapping a row opens an inline edit (or just a number stepper for quantity — keep it simple).
4. **Spot prices banner** — small text row showing last-fetched gold/silver/platinum spot. Hidden until first Calculate.
5. **Total display** — large, prominent. Shows `$0.00` until first Calculate, then last calculated total.
6. **Sticky bottom bar** — primary "Calculate Total" button (full-width, large, with loading spinner during webhook call). Secondary "New Bag" button (smaller, outlined).

Rep-change behavior (per architectural decision #6 / confirmed decision #6): when `useSession.selectedRepId` changes from one non-null value to a different non-null value, `useCart.clear()` fires automatically. Initial selection (null → first rep) does not trigger a clear. No confirmation dialog — the dropdown change is the explicit signal.

Calculate button action:
- Read cart lines, build `BulkCalcRequestItem[]` (each line carries either `quantity` OR `weight_grams` based on `priced_by`).
- Call `calculateBulk()`. On success: write `total` and `spot` to session. On failure: show error toast, leave previous total visible.
- Don't clear the cart after Calculate — staff often want to recalculate after editing a line.

New Bag button:
- Confirm prompt ("Start a new bag? This clears the cart.") to prevent accidental wipes mid-deal.
- Clears cart, resets session total + spot.

**Done when:** a rep can be selected, lines added (using the test data flow from 4B for now — the form lands in 4D), Calculate returns a total, New Bag clears.

## Phase 4D — Add Coin form

**Goal:** the modal that lets a rep pick a coin and enter quantity or grams. ~2–4 hr.

Triggered by an "Add Coin" button on the Calculator screen (place it near the cart list).

Modal contents:
1. **Title:** "Add a coin"
2. **Coin picker** — list grouped by `metal_type` (Silver, Gold, Platinum sections). Each item shows the coin name and (if non-empty) face value. Tappable rows; selected row highlights.
3. **Quantity OR weight input** — appears once a coin is selected:
   - If `priced_by === "each_metal"` → "Quantity" number input, `inputmode="numeric"`, autofocus.
   - If `priced_by === "weight_grams"` → "Weight (grams)" number input, `inputmode="decimal"`, autofocus.
4. **Add to Bag** button (primary) — disabled until coin selected and value entered. On tap: appends a `CartLine` to the cart, closes modal.
5. **Cancel** button (secondary) — closes modal without changes.

iPad UX notes:
- Modal should be a bottom sheet or full-screen overlay, not a small centered dialog (better for thumb reach).
- Search bar at the top of the coin picker if list scrolling becomes friction (24 items today, not yet).

**Done when:** a rep can add a Roosevelt Dime with quantity 10, see it appear in the cart, tap Calculate, and see ~$16.

## Phase 4E — PWA polish

**Goal:** the app feels native on the iPad home screen. ~3–5 hr.

1. **Icons & manifest:** generate a square icon set (192, 512, 1024). If branding hasn't landed, use a solid placeholder (e.g., gold square with "C" initial). Manifest fields: `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color`, `background_color`, `icons`. Add iOS-specific meta tags in `index.html`: `apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`.
2. **Service worker:** minimal config — cache the app shell so the UI loads offline. Do **not** cache webhook responses (always fetch fresh). vite-plugin-pwa's `generateSW` with `runtimeCaching` set to network-only for the webhook URLs.
3. **Tap targets:** every button ≥ 44pt (Apple HIG). Audit buttons after layout settles.
4. **Numeric keyboards:** confirmed via `inputmode="numeric"` (quantity) and `inputmode="decimal"` (grams). Test on actual iPad — Safari sometimes ignores hints.
5. **Loading states:** Calculate button shows spinner during webhook call; Refresh Config shows a subtle indicator.
6. **Error states:** toast/banner system for webhook failures. Distinguish "no network" from "webhook returned error" with different copy.
7. **Empty states:** cart empty message; no-rep-selected disables Calculate with a hint.

**Done when:** icon installs cleanly on iPad home screen with custom name; opening the icon shows splash + full-screen app (no Safari chrome); cold load works offline (renders shell, shows error on Calculate attempt).

## Phase 4F — Deploy to Vercel

**Goal:** a hosted URL the iPad can install from. The repo lives in the dev's GitHub during the build and transfers to the client once they grant access. ~1–2 hr for staging, ~30 min for the transfer step.

### 4F.1 — Staging deploy (under dev's GitHub + Vercel)

Used during the build for client preview and iPad smoke-testing. Throwaway after transfer.

1. **Push the repo to a private GitHub repo under the dev's account.** Do this early in the build (after 4A) as a backup, not just at deploy time.
2. **Vercel:** New Project → import the GitHub repo (under dev's Vercel account).
3. **Project config:**
   - Root Directory: `web`
   - Framework Preset: Vite (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment variables** (Vercel project settings):
   - `VITE_CONFIG_LOAD_URL` = the config-load webhook URL
   - `VITE_BULK_CALC_URL` = the bulk-calc webhook URL
5. **First deploy** → preview URL on `<repo-name>.vercel.app`. Smoke-test in desktop browser before iPad.

**Done when:** staging URL loads with same behavior as localhost; both webhook calls succeed; iPad can install from this URL for 4G smoke testing.

### 4F.2 — Transfer to client (once client access lands)

Triggered when the client provides GitHub + Vercel access. ~30 min.

1. **Transfer the GitHub repo:** GitHub → repo Settings → **Transfer ownership** → enter the client's GitHub org/username. Client accepts the transfer notification. Commit history, issues, and PRs all carry over. (Commit author email stays as the dev's — this is normal and not changeable.)
2. **Delete the dev's Vercel project** (or leave it disconnected — it'll just stop deploying since the GitHub repo it watched is gone).
3. **Create a fresh Vercel project under the client's Vercel account**, importing the now-transferred GitHub repo. Same project config and env vars as 4F.1.
4. **New production URL** under the client's Vercel — likely a different `.vercel.app` subdomain than the staging URL. Note it down for the iPad re-install step.
5. **Re-install on each iPad:** remove the old home-screen icon, navigate to the new URL in Safari, Add to Home Screen again. Quick — but every iPad needs it.

**Done when:** all production iPads point at the client-owned Vercel deploy; the dev no longer needs to be in the loop for redeploys (auto-deploys on push to `main` of the client's repo).

## Phase 4G — iPad install + smoke test

**Goal:** confirm the app works on the actual hardware reps will use. ~1–2 hr.

1. On the iPad, open **Safari** (not Chrome — PWA install only works in Safari on iOS).
2. Navigate to the Vercel production URL.
3. Tap **Share** → **Add to Home Screen**. Confirm the icon name and tap Add.
4. Tap the new home-screen icon. Should open full-screen, no Safari chrome, splash visible briefly.
5. **Smoke tests:**
   - **Rep selection** — dropdown shows all active reps from Airtable.
   - **Single item** — Add Coin → Roosevelt Dime → Quantity 10 → Calculate. Expect ~$16 (varies with current spot).
   - **Multi item** — Add 14K Gold → Weight 23.4g → Calculate. Expect ~$636 added.
   - **Margin edit propagation** — change a margin in Airtable's `Config_Margins`, recalculate (no Refresh Config needed since margins are read by `bulk-calc` on every call), confirm the new margin reflects.
   - **Coin list refresh** — add a new active row to `Config_CoinTypes` in Airtable, tap Refresh Config, confirm the row appears in the picker.
   - **New Bag** — confirm prompt appears, accepts, cart clears, total resets.
   - **Refresh persistence** — close the app, re-open from home screen; selected rep persists, cart was already cleared by New Bag.

**Done when:** all smoke tests pass on the actual iPad.

## Phase 4H — Sign-off

| Check | Confirmed |
|---|---|
| App installs on iPad as a PWA, full-screen, no Safari chrome | ☐ |
| Rep dropdown shows all active reps from Airtable | ☐ |
| Coin picker shows all 24 active coin types, grouped by metal | ☐ |
| Roosevelt Dime × 10 → ~$16 | ☐ |
| 14K Gold @ 23.4g → ~$636 added | ☐ |
| Editing a margin in Airtable's `Config_Margins` reflects on next Calculate | ☐ |
| Adding a row to `Config_CoinTypes` in Airtable + tapping Refresh Config makes it appear | ☐ |
| New Bag clears the cart cleanly with a confirm prompt | ☐ |
| Cart survives an accidental refresh (localStorage works) | ☐ |
| Selected rep persists across app re-launch | ☐ |
| Webhook errors show a visible message (not silent failure) | ☐ |
| Loom walkthrough recorded showing the admin path (edit margin → see change) | ☐ |
| Branding assets in place (logo, accent color, app name) | ☐ |

## Decisions confirmed (2026-04-28)

1. ✅ **GitHub remote** — final ownership: client. Build under dev's GitHub, transfer when client access lands. See Phase 4F.
2. ✅ **Vercel account** — final ownership: client. Staging deploy under dev's Vercel, fresh production project under client's Vercel post-transfer. See Phase 4F.
3. ✅ **Domain** — `.vercel.app` default for both staging and production. No custom domain, no DNS work.
4. ✅ **Branding** — ship 4E with a placeholder icon (single-color square with project initial). Real assets land via a follow-up PR when client provides logo + accent color.
5. ✅ **Multi-iPad deployment** — multiple devices on the floor, each with independent localStorage cart. Concurrent webhook calls handled natively by Make.
6. ✅ **Cart auto-clears when the rep dropdown changes** — safety net against one rep's in-progress cart leaking into the next rep's deal. Applies whether iPads are rep-assigned or shared, so we don't need to distinguish those cases in the build. Implementation: `useSession`/`useCart` watches the selected rep ID; when it changes to a different non-null value, the cart clears. First rep selection on an empty cart does *not* trigger a clear (nothing to lose).

## Things to flag during the build (gotchas to watch for)

- **iOS Safari quirks** — `inputmode` hints sometimes ignored; `100vh` doesn't account for the URL bar (use `100dvh` or fixed positioning); rubber-band scroll on the Calculator can feel wrong (consider `overscroll-behavior: contain`).
- **PWA service worker stickiness** — once installed, iOS aggressively caches the service worker. During development, test on Vercel preview deploys, not production, so cache invalidation is less of a foot-gun.
- **CORS on Make webhooks** — both Make scenarios should accept POST from any origin (no preflight headaches expected for `Content-Type: application/json` from a browser). If we hit CORS issues, Make has webhook response settings to add `Access-Control-Allow-Origin`.
- **localStorage limits** — not an issue at this data volume (cart is tens of items max), but worth knowing the cap is ~5MB.
- **Time zones / date formatting** — not relevant for M1 (no timestamps surfaced to user). Becomes relevant in M2 when deal log shows.
