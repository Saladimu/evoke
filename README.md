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

## Dark / Light Theme

A sun/moon toggle button on the right side of the top menu bar switches between light and dark themes on every page:

- The choice is stored in `localStorage` (key `evoke-theme`) and applied before the page renders (no flash).
- In dark mode, a wallpaper background appears behind the content after the **Pemenang** table:
  - `desktop-wall.png` on screens wider than 600px, `mobile-wall.png` on phones.
  - The image is dimmed with a dark overlay (~28% effective opacity) to keep all info readable, and section headings/counts get a soft backdrop.
  - The three lower tables (**Total Lomba (Selesai)**, **Lomba terjadwal (Pending)**, **Special Note**) are semi-transparent so the wallpaper shows through them.

## Hidden Menu Toggle

The **Kalender Lomba** (`events.html`) and **Feedback** (`feedback.html`) menu items are **hidden by default** on every page. Only the **Hasil Lomba** link is shown in the menu bar.

To enable (or disable) them:

1. Click **5 times** (within a 3-second window) anywhere in the top menu bar area — empty space, links, or padding all count.
2. Each successful 5-click burst **toggles** the two hidden menu items ON or OFF.
3. The choice is stored in `localStorage` (key `evoke-extra-menu`) and persists across pages and visits on the same device/browser.

No hint or instruction about this gesture is shown anywhere in the UI.

## Live Score Report (`index.html`)

The report page renders a summary dashboard plus two match tables, all computed client-side from the published Google Sheet CSV (fetched with `cache: "no-store"` so it always pulls the latest data; note that Google's published CSV endpoint can lag by a couple minutes after an edit).

### Statistics Cards

1. **Total Lomba Terjadwal** — rows with `Tanggal` filled and `Kelas` in SD/SMP/SMA/Gabungan.
2. **Lomba terjadwal (Pending)** — rows where `Tanggal` is filled, `Pemenang` is empty, and both `Tim-1` and `Tim-2` are filled.
3. **Total Lomba (Selesai)** — rows where `Tanggal` is filled, `Pemenang` is filled, and `Internal = TRUE`.
4. **Special Note** — rows where `Tanggal` is filled and the `Note` column contains `Info:` (white card with a red border and red number).

### Pemenang

The **Pemenang** table ranks winners by number of internal matches won, with each count rendered as a **colorful horizontal bar** (width proportional to the top winner, count value shown inside the bar with a gold trophy icon) under a **Lomba** column:

- Ranked number, winner name, and the proportional bar.
- Hovering a row highlights it and reveals a **Lihat →** hint.
- Clicking any row opens the winner's match list in a modal.

### Summary Lomba

Per-kelas breakdown (SD, SMP, SMA, Gabungan) of internal-only matches (`Internal = TRUE`):

- **Total Lomba** — internal rows with `Tanggal` filled. Clickable to list the matches.
- **Pemenang** — internal rows with a declared winner. Clickable to list the winners.

### Tables

- **Total Lomba (Selesai)** — completed internal matches, sorted by **date + time descending**. Filters: Kelas, Tanggal, and text search.
- **Lomba terjadwal (Pending)** — scheduled matches without a winner. Same filters as the table above, plus a PIC column.
- **Special Note** — matches where `Note` contains `Info:` (the `Info:` marker is stripped from the displayed note). Columns: ID-No, Lomba, Tanggal, Jam, PIC, Note. Same filters as the other tables; text search also covers PIC and Note.

Dates are displayed in **`DD-Mmm`** format (e.g. `05-Oct`) in all three tables and in the Tanggal filter dropdowns. All tables are horizontally scrollable on narrow screens.

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
├── mobile-wall.png       # Dark-mode wallpaper used on phones
├── desktop-wall.png      # Dark-mode wallpaper used on wider screens
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
