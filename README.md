# EVOKE 2 - Live Scores

A lightweight live scores and event management site for **EVOKE 2**, built with plain HTML and deployed on [Cloudflare Pages](https://pages.dev). It provides real-time competition results, an event calendar, and a feedback form without needing a custom backend.

## Live URL

<https://evoke2.pages.dev>

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Hasil Lomba - Live competition results, rendered as cards from a Google Sheet |
| `events.html` | Kalender Lomba - Event match calendar, embedded from an AppSheet app |
| `feedback.html` | Feedback - Feedback form, embedded via Tally |

The results page is a custom UI (stats, sport filters, search, sorting) that reads data from a Cloudflare Pages Function which proxies the published Google Sheet CSV.

A shared top navigation bar links all three pages, with the active tab highlighted.

## How It Works

- **Static hosting on the edge**: The site is served entirely from Cloudflare's global edge network. Visitors never see the underlying GitHub repository.
- **Live data via embedded apps**:
  - Results are fetched by a Cloudflare Pages Function (`functions/API/data.js`) that proxies the published Google Sheet CSV, parses it, and serves clean JSON to the frontend — avoiding browser CORS issues.
  - The calendar is powered by an AppSheet app.
  - Feedback is collected through a Tally form.
- **Automatic deploys**: Every push to the `main` branch on GitHub triggers a Cloudflare Pages deployment, so the live site updates automatically (typically within 30 seconds).

## Project Structure

```
.
├── index.html            # Results page (custom card UI)
├── events.html           # Calendar page (AppSheet embed)
├── feedback.html         # Feedback page (Tally form embed)
├── favicon.png           # Site favicon
└── functions/
    └── API/
        └── data.js       # Cloudflare Pages Function: proxies Google Sheet CSV to JSON
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
