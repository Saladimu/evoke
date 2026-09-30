# AGENTS.md

Rules for coding agents working on **EVOKE 2 - Live Scores**. Read this before changing code. Product details live in `README.md`; this file is for how to edit the repo safely.

## Project shape

Static HTML site on Cloudflare Pages. No build step, no `package.json`, no bundler.

| Path | Role |
|------|------|
| `index.html` | Live Score Report (Google Sheet) |
| `events.html` | Calendar (AppSheet iframe) |
| `feedback.html` | Feedback (Tally iframe) |
| `game.html` | EVOKE Champion + shared leaderboard |
| `functions/API/data.js` | Pages Function: sheet proxy `GET /API/data` |
| `functions/API/scores.js` | Pages Function: leaderboard `GET/POST /API/scores` |
| `game_.html` | Legacy game page. Do not treat as the live game. Do not "sync" it unless asked. |

Do not add a frontend framework, npm toolchain, or CSS preprocessor unless the user explicitly asks.

## Stack and style

- Plain HTML + inline `<style>` + inline `<script>`. Keep that pattern.
- Indonesian UI copy. English is fine for code identifiers and comments.
- No new comments unless asked.
- Escape all sheet/user text before inserting into HTML (`esc()` / equivalent). Never concatenate untrusted strings into `innerHTML`.
- Wrap `localStorage` reads/writes in `try/catch`.
- Keep dark/light CSS in sync with existing class names (`.dark` on `<html>`).

## Shared chrome (every public page)

Copy these from an existing page; do not invent a new nav.

1. Favicon `favicon.png`.
2. Theme boot script in `<head>` that adds `.dark` from `localStorage` key `evoke-theme` before first paint.
3. Nav bar `#navBar`: Hasil Lomba, Kalender Lomba, Feedback, Game, then `#themeToggle` and `#refreshBtn`.
4. Mark Kalender Lomba and Feedback with `data-secret`. They stay hidden unless `evoke-extra-menu` is `"1"`.
5. Secret toggle: 5 clicks on the nav bar within 3 seconds. Do not add UI hints for this gesture.
6. Active tab: `.active` or inline `color: #007bff`.
7. Header: `reventraicon.png` + page title.
8. Theme toggle and refresh button scripts at the bottom of the page.

localStorage keys (do not rename):

- `evoke-theme` — `"dark"` or `"light"`
- `evoke-extra-menu` — `"1"` or `"0"`
- `evokePlayerName` — game player name only
- `evoke-sheet-cache` — last known good `/API/data` payload (records, ETag, `sheetDate`) for instant paint. Do not rename.
- `evoke-refresh-cooldown` — epoch ms until which the refresh button stays disabled. Do not rename.

## Live scores (`index.html`)

Data must keep appearing on the web when the sheet changes.

- Fetch `/API/data` (`cache: "no-store"`) and the published Google Sheet CSV in parallel, racing them with `Promise.any` under a single ~10s abort budget. The sheet fetch starts after a short hedge delay (~2.5s) so the API normally wins. A forced refresh (`force`) skips the race and only calls `/API/data`, so it can never trigger a second Google Sheet fetch. Send the stored ETag via `If-None-Match`; a 304 means nothing changed, so skip re-render.
- Do not hardcode a new sheet URL unless the user provides it. The current URL is in `index.html` and `functions/API/data.js`; keep them the same.
- Poll about every 20 seconds while the tab is visible. Skip polls when `document.hidden`. Fetch again on `visibilitychange` when the tab becomes visible.
- On first paint, render the last good payload from `evoke-sheet-cache` immediately, then refresh in the background. Only show the error box when there is no cached payload to fall back on.
- Persist each successful payload (records, ETag, `sheetDate`) to `evoke-sheet-cache` so a cold load shows data instantly.
- On silent refresh: preserve filter values, skip re-render if the fingerprint is unchanged, flash changed rows, show the toast.
- Refresh button on this page must call `loadReport({ silent: true, force: true })`, never `location.reload()`. A force refresh sends `?refresh=1` (and skips the client `If-None-Match`) so it bypasses the function's short-lived edge cache and re-fetches from the source, re-renders even when unchanged, and toasts "Data diperbarui (n)" or "Data sudah terbaru".
- Guard the refresh button against spam: after an accepted force refresh, `loadReport` writes `evoke-refresh-cooldown` for `REFRESH_COOLDOWN_MS` (3 minutes) and returns `{ status: "cooldown", remaining }` for any force call inside that window. The button shows a disabled countdown and does not fetch. The cooldown persists across reloads via `localStorage`. Background 20s polling is unaffected and keeps data fresh.
- Guard concurrent loads with a shared `loadPromise`. Non-forced callers reuse the in-flight promise; a forced call waits for it, then fetches again.
- Treat `Internal` as true only when `String(value).toUpperCase() === "TRUE"`.
- Stats card rules:
  - Total Lomba Terjadwal: `Tanggal` filled and `Kelas` in SD / SMP / SMA / Gabungan
  - Pending: `Tanggal` filled, `Pemenang` empty, both `Tim-1` and `Tim-2` filled
  - Selesai: `Tanggal` filled, `Pemenang` filled, Internal TRUE
  - Special Note: `Tanggal` filled and `Note` contains `Info:`
- Display dates as `DD-Mmm` in tables and date filters.
- Sort completed/special tables by date + start time descending; the pending table sorts ascending. Modal match lists sort ascending.
- Display PIC as name only via `formatPIC()` (drop everything from the first `/`) in every table.
- Mark names matching `/kemurnian/i` with the home icon via `markHome()`.

Google's published CSV can lag a few minutes after an edit. Do not "fix" that with aggressive client caching.

## Pages Functions

- Cloudflare Pages maps `functions/API/data.js` to `/API/data` (capital `API`). Do not rename the folder.
- Send CORS `*` on API responses. Error responses use `Cache-Control: no-store`; success responses are edge-cacheable (see below).
- `data.js` re-fetches the sheet with cache disabled and returns `{ ts, etag, generatedAt, sheetDate, pendingCount, totalLomba, totalCount, winners, records }`. `sheetDate` is the upstream Google `Date` header (the time the sheet snapshot was served) so the UI shows a consistent "Diperbarui" time.
- `data.js` keeps a SHA-1 ETag and a `caches.default` edge entry (`CACHE_URL="https://evoke2.internal/API/data"`): `FRESH_MS=10000` returns cached, `STALE_MS=40000` serves stale then revalidates via `waitUntil`, and `If-None-Match` matching the ETag returns 304. A request with `?refresh=1` rebuilds from the sheet, but reuses the cached payload (and returns `X-Cache: FORCE-COOLDOWN`) when that entry is younger than `FORCE_MIN_MS=5000`, so refresh spam cannot hammer the sheet. Success responses use `CACHE_CONTROL="public, max-age=0, s-maxage=10, stale-while-revalidate=30"` and an `X-Cache` header (`HIT` / `STALE` / `MISS` / `REVALIDATED` / `FORCE-COOLDOWN` / `ERROR-STALE`).
- Never combine `fetch(url, { cache: "no-store" })` with `cf: { cacheTtl: 0 }` — Cloudflare throws `CacheTtl: 0, is not compatible with cache: no-store header` and the function returns 500. Use `cache: "no-store"` alone.
- `scores.js`: names max 24 chars, strip `<>`, integer scores 0..50000, one best score per name, top 20 on GET. Scores persist in the Workers KV namespace **`Evoke2_scores`**, bound to the Pages project as `SCORES`; fall back to the in-memory store only when the binding is absent.
- Do not log or commit secrets. KV is bound in the Cloudflare dashboard, not in this repo.

## Game (`game.html`)

- Live leaderboard page: https://evoke2.pages.dev/game
- Leaderboard scores must persist in Workers KV namespace `Evoke2_scores` (binding `SCORES`), so they survive deploys and are shared across all visitors of https://evoke2.pages.dev/game.
- POST finished scores to `/API/scores`. GET leaderboard with `cache: "no-store"` and a cache-bust query.
- Poll the leaderboard about every 15 seconds only while that view is visible.
- Require a name before start. Persist it in `evokePlayerName`.

## Theme / wallpaper

- Dark wallpaper after the Pemenang block on `index.html` (`.wall-area`): `desktop-wall.png` above 600px, `mobile-wall.png` on phones, dimmed overlay so text stays readable.
- Do not replace wallpaper files unless asked. `desktop-wallold.png` and `desktop2-wall.png` are unused archives.

## Local run

Static files:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Leaderboard / `/API/data` need Wrangler:

```bash
npx wrangler pages dev .
```

Preview default port is 8000. Production: Cloudflare Pages from `main`, output directory `.`, no build command. Live site: https://evoke2.pages.dev

## Do not

- Introduce Node build tooling or move CSS/JS into separate bundles without being asked.
- Show Kalender Lomba / Feedback in the nav by default.
- Document the 5-click secret menu in the UI.
- Use `git rm`, `rm -rf`, or other delete commands unless the user confirms.
- Commit unless the user explicitly asks.
- Copy LLM API keys from the environment into this project.
- Change sheet column names without updating every filter in `index.html` and `functions/API/data.js`.
