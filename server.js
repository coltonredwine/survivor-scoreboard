require("dotenv").config();

const path = require("path");
const express = require("express");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const SHEET_ID = process.env.SHEET_ID || "";
const SHEET_TAB = process.env.SHEET_TAB || "Sheet1";
const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY || "";
const POLL_CACHE_MS = Number(process.env.POLL_CACHE_MS || 2000);
const FLOOR = Number(process.env.FLOOR || 10);

const TEAM_COLORS = {
  cila: "#E67E22",
  vatu: "#C2185B",
  kalo: "#0E8A8A",
  villains: "#6A1B9A"
};
const DEFAULT_COLOR = "#4F463A";

let cachedPayload = null;
let cachedAt = 0;

app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/scores", async (_req, res) => {
  try {
    const data = await getScoresWithCache();
    res.json(data);
  } catch (error) {
    if (cachedPayload) {
      res.json({ ...cachedPayload, stale: true, warning: String(error.message || error) });
      return;
    }
    res.status(500).json({
      error: "Unable to fetch scores",
      details: String(error.message || error)
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Survivor scoreboard running at http://localhost:${PORT}`);
});

async function getScoresWithCache() {
  const now = Date.now();
  if (cachedPayload && now - cachedAt < POLL_CACHE_MS) {
    return { ...cachedPayload, stale: false };
  }

  const payload = await fetchScoresFromSheet();
  cachedPayload = payload;
  cachedAt = now;
  return { ...payload, stale: false };
}

async function fetchScoresFromSheet() {
  if (!SHEET_ID || !GOOGLE_SHEETS_API_KEY) {
    throw new Error("Missing SHEET_ID or GOOGLE_SHEETS_API_KEY in environment");
  }

  const ranges = [
    `${SHEET_TAB}!A2:A5`,
    `${SHEET_TAB}!B1:Z`
  ];

  const params = new URLSearchParams({ key: GOOGLE_SHEETS_API_KEY });
  ranges.forEach((range) => params.append("ranges", range));
  params.append("majorDimension", "ROWS");
  params.append("valueRenderOption", "UNFORMATTED_VALUE");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values:batchGet?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sheets API error ${response.status}: ${text}`);
  }

  const json = await response.json();
  const valueRanges = json.valueRanges || [];
  const activeTeams = extractActiveTeams(valueRanges[0]?.values || []);
  const matrix = valueRanges[1]?.values || [];

  if (activeTeams.length === 0) {
    return {
      teams: [],
      floor: FLOOR
    };
  }

  const headers = matrix[0] || [];
  const dataRows = matrix.slice(1);
  const teams = activeTeams.map((teamName) => {
    const headerIndex = headers.findIndex((cell) => normalize(cell) === normalize(teamName));
    const score = headerIndex >= 0 ? sumColumn(dataRows, headerIndex) : 0;
    return {
      name: teamName,
      score,
      color: colorForTeam(teamName)
    };
  });

  return {
    teams,
    floor: FLOOR
  };
}

function extractActiveTeams(values) {
  const list = values
    .map((row) => (row && row[0] ? String(row[0]).trim() : ""))
    .filter(Boolean);
  return list.slice(0, 4);
}

function sumColumn(rows, index) {
  let total = 0;
  for (const row of rows) {
    const value = row?.[index];
    const num = Number(value);
    if (Number.isFinite(num)) {
      total += num;
    }
  }
  return total;
}

function colorForTeam(name) {
  return TEAM_COLORS[normalize(name)] || DEFAULT_COLOR;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}
