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

## Live scores (`index.html`)

Data must keep appearing on the web when the sheet changes.

- Prefer `GET /API/data?t=<timestamp>` with `cache: "no-store"`. Fall back to the published Google Sheet CSV URL with a cache-bust query param.
- Do not hardcode a new sheet URL unless the user provides it. The current URL is in `index.html` and `functions/API/data.js`; keep them the same.
- Poll about every 20 seconds while the tab is visible. Skip polls when `document.hidden`. Fetch again on `visibilitychange` when the tab becomes visible.
- On silent refresh: preserve filter values, skip re-render if the fingerprint is unchanged, flash changed rows, show the toast.
- Refresh button on this page must call `loadReport({ silent: true })`, not `location.reload()`.
- Guard concurrent loads with `loadInFlight`.
- Treat `Internal` as true only when `String(value).toUpperCase() === "TRUE"`.
- Stats card rules:
  - Total Lomba Terjadwal: `Tanggal` filled and `Kelas` in SD / SMP / SMA / Gabungan
  - Pending: `Tanggal` filled, `Pemenang` empty, both `Tim-1` and `Tim-2` filled
  - Selesai: `Tanggal` filled, `Pemenang` filled, Internal TRUE
  - Special Note: `Tanggal` filled and `Note` contains `Info:`
- Display dates as `DD-Mmm` in tables and date filters.
- Sort completed/pending/special tables by date + start time descending. Modal match lists sort ascending.
- Mark names matching `/kemurnian/i` with the home icon via `markHome()`.

Google's published CSV can lag a few minutes after an edit. Do not "fix" that with aggressive client caching.

## Pages Functions

- Cloudflare Pages maps `functions/API/data.js` to `/API/data` (capital `API`). Do not rename the folder.
- Always send `Cache-Control: no-store` (and CORS `*`) on API responses.
- `data.js` must re-fetch the sheet with cache disabled and return `{ generatedAt, pendingCount, totalLomba, totalCount, winners, records }`.
- `scores.js`: names max 24 chars, strip `<>`, integer scores 0..50000, one best score per name, top 20 on GET. Prefer KV binding `SCORES`; fall back to in-memory store.
- Do not log or commit secrets. KV is bound in the Cloudflare dashboard, not in this repo.

## Game (`game.html`)

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
