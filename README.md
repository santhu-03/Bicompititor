# AI Business Intelligence Agent

Enter a company name or website. The agent researches the company, discovers direct and indirect competitors, scrapes their websites, compares services and pricing, runs a SWOT analysis, identifies market gaps, and generates a professional PDF report — automatically, in minutes.

## Quick start

```bash
bash setup.sh        # macOS / Linux  (Windows: setup.bat)
npm run dev          # client → http://localhost:5173, server → http://localhost:5000
```

The setup script installs all dependencies, creates `server/.env`, and prompts for your Gemini API key (free at https://aistudio.google.com/apikey).

## How it works

```
User input → Company research → Competitor discovery → Website data collection
→ Feature & pricing extraction → SWOT analysis → Market gaps → PDF report
```

1. **Company research** — scrapes the target website (if given) and profiles the company with Gemini.
2. **Competitor discovery** — Gemini identifies 5 direct + 3 indirect competitors with websites.
3. **Website data collection** — each competitor site (and its `/pricing` page) is scraped: plain `fetch` + Cheerio first, Puppeteer fallback for JavaScript-rendered sites when installed.
4. **Feature & pricing extraction** — AI extracts services, differentiators, pricing plans, strengths, and weaknesses per competitor, with a confidence rating.
5. **SWOT analysis** — evidence-based SWOT for the target company in its competitive context.
6. **Insights** — market gaps with evidence and opportunity size, prioritized recommendations with timeframes, and a 200-word executive summary.
7. **PDF report** — a formatted A4 report streamed by PDFKit, downloadable from the UI.

The frontend polls the report document every 2.5 s and renders live stage progress, then the full interactive report.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js 18+, Express |
| Database | MongoDB Atlas via Mongoose — **optional**; falls back to an in-memory store |
| AI | Google Gemini API (`gemini-2.0-flash` by default) |
| Scraping | fetch + Cheerio, optional Puppeteer for JS-rendered sites |
| Reports | PDFKit |

## Configuration (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google AI Studio key |
| `MONGODB_URI` | – | Atlas connection string; empty = in-memory store |
| `GEMINI_MODEL` | – | Default `gemini-2.0-flash` |
| `PORT` | – | Default `5000` |

### Enabling Puppeteer (optional)

Setup skips the ~170 MB Chromium download by default; scraping still works via fetch + Cheerio. For JavaScript-heavy competitor sites:

```bash
cd server && npm install puppeteer
```

## API

| Endpoint | Description |
|---|---|
| `POST /api/reports` | Start a run. Body: `{ company?, website?, industry?, region? }` |
| `GET /api/reports/:id` | Report document with live stage progress |
| `GET /api/reports/:id/pdf` | Download the PDF (completed reports only) |
| `GET /api/reports` | Recent runs |
| `GET /api/health` | Config status |

## Production

```bash
npm run build   # builds client → client/dist
npm start       # Express serves the API and the built client on PORT
```

## Notes & limitations

- Competitor pricing is AI-extracted from scraped pages and model knowledge — verify before financial decisions (the report includes this disclaimer).
- Respect target sites' terms of service and robots policies when scraping; concurrency is limited to 3 requests.
- A full run makes ~10–14 Gemini calls; the free tier handles this comfortably.
