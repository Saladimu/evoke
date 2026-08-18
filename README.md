# EVOKE 2 - Live Scores

A lightweight live scores and event management site for **EVOKE 2 / Reventra (01-10 Oct 2026)**, built with plain HTML and deployed on [Cloudflare Pages](https://pages.dev). It provides real-time competition results, an event calendar, and a feedback form without needing a custom backend.

## Live URL

<https://evoke2.pages.dev>

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Live Score Report - Real-time competition report (statistics, filters, winner lists) fetched directly from a Google Sheet |
| `events.html` | Kalender Lomba - Event match calendar, embedded from an AppSheet app |
| `feedback.html` | Feedback - Feedback form, embedded via Tally |

A shared top navigation bar links all three pages, with the active tab highlighted.

## Live Score Report (`index.html`)

The report page renders a summary dashboard plus two match tables, all computed client-side from the published Google Sheet CSV (fetched with `cache: "no-store"` so it always pulls the latest data; note that Google's published CSV endpoint can lag by a couple minutes after an edit).

### Statistics Cards

1. **Total Lomba Terjadwal** — rows with `Tanggal` filled and `Kelas` in SD/SMP/SMA/Gabungan.
2. **Lomba terjadwal (Pending)** — rows where `Tanggal` is filled, `Pemenang` is empty, and both `Tim-1` and `Tim-2` are filled.
3. **Total Lomba (Selesai)** — rows where `Tanggal` is filled, `Pemenang` is filled, and `Internal = TRUE`.

### Summary Lomba

Per-kelas breakdown (SD, SMP, SMA, Gabungan) of internal-only matches (`Internal = TRUE`):

- **Total Lomba** — internal rows with `Tanggal` filled. Clickable to list the matches.
- **Pemenang** — internal rows with a declared winner. Clickable to list the winners.

### Tables

- **Total Lomba (Selesai)** — completed internal matches, sorted by date descending. Filters: Kelas, Tanggal, and text search.
- **Lomba terjadwal (Pending)** — scheduled matches without a winner. Same filters as the table above, plus a PIC column.

Both tables are horizontally scrollable on narrow screens.

## How It Works

- **Static hosting on the edge**: The site is served entirely from Cloudflare's global edge network. Visitors never see the underlying GitHub repository.
- **Live data via embedded apps**:
  - The report in `index.html` fetches and parses the published Google Sheet CSV directly in the browser (the published CSV endpoint sends `Access-Control-Allow-Origin: *`, so no proxy is required).
  - The calendar is powered by an AppSheet app.
  - Feedback is collected through a Tally form.
- **Automatic deploys**: Every push to the `main` branch on GitHub triggers a Cloudflare Pages deployment, so the live site updates automatically (typically within 30 seconds).

## Project Structure

```
.
├── index.html            # Live Score Report (fetches Google Sheet CSV directly)
├── events.html           # Calendar page (AppSheet embed)
├── feedback.html         # Feedback page (Tally form embed)
├── favicon.png           # Site favicon
├── reventraicon.png      # Reventra logo shown in the report header
└── functions/
    └── API/
        └── data.js       # Optional Cloudflare Pages Function (currently unused by the report)
```

## Local Development

No build step or package manager is required. Just serve the folder locally:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deployment

The project is configured for continuous deployment with Cloudflare Pages:

1. Connect your GitHub repository (`Saladimu/evoke`) to Cloudflare Pages.
2. Set the build command and output directory to **none** and `/` (or `.`) respectively, since this is a static site.
3. Commit and push to `main`; Cloudflare will build and deploy automatically.

## License

All rights reserved. This project is internal to the EVOKE 2 event and is not licensed for redistribution.
