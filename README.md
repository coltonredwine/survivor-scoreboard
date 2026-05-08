# Survivor Scoreboard

Browser-based Survivor watch-party scoreboard that reads from Google Sheets and auto-refreshes for all viewers.

## Features

- Mobile + desktop responsive layout
- Vertical thermometer score display, side-by-side
- Optional 3 or 4 teams from `A2:A5`
- Automatic refresh every 3 seconds (no user reload needed)
- Parchment-styled background
- Optional custom OTF font and logo from `/assets`

## Sheet Layout

- `A2:A5`: active team names in display order
- `B1:Z1`: team headers (must match active names)
- `B2:Z`: numeric score values

The server sums all numeric values in each matched team column.

## Required Google Setup

1. Create/select a Google Cloud project.
2. Enable the **Google Sheets API**.
3. Create an API key.
4. Share your sheet so it is readable (e.g. anyone with link can view).
5. Copy your spreadsheet ID from the sheet URL.

## Install

```bash
npm install
```

## Configure

Copy `.env.example` to `.env`, then set:

- `GOOGLE_SHEETS_API_KEY`
- `SHEET_ID`
- `SHEET_TAB` (default `Sheet1`)
- `POLL_CACHE_MS` (default `2000`)
- `FLOOR` (minimum denominator for thermometer scaling, default `10`)
- `PORT` (default `3000`)

## Run

```bash
npm start
```

Open:

- `http://localhost:3000`

## Assets

Put files in `assets/`:

- `logo.png`
- `font.otf`

Missing assets are handled gracefully (logo hides, font falls back).
