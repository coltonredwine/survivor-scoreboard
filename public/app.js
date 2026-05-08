const thermometerGrid = document.getElementById("thermometerGrid");
const logo = document.getElementById("logo");
const helpButton = document.getElementById("helpButton");
const helpModal = document.getElementById("helpModal");
const helpClose = document.getElementById("helpClose");

const POLL_INTERVAL_MS = 3000;

logo.addEventListener("error", () => {
  logo.style.display = "none";
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshScores();
  }
});

helpButton.addEventListener("click", () => {
  helpModal.hidden = false;
});

helpClose.addEventListener("click", () => {
  helpModal.hidden = true;
});

helpModal.addEventListener("click", (event) => {
  if (event.target === helpModal) {
    helpModal.hidden = true;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    helpModal.hidden = true;
  }
});

async function refreshScores() {
  try {
    const response = await fetch("/api/scores", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    render(payload);
  } catch (_error) {
    // Keep last successful render; silently retry on next poll.
  }
}

function render(payload) {
  const teams = Array.isArray(payload.teams) ? payload.teams : [];
  const floor = Number(payload.floor || 0);
  const highest = teams.reduce((max, team) => Math.max(max, Number(team.score) || 0), 0);
  const denom = Math.max(highest, floor, 1);

  thermometerGrid.innerHTML = "";

  for (const team of teams) {
    const score = Number(team.score) || 0;
    const fillPct = Math.max(0, Math.min(100, (score / denom) * 100));

    const card = document.createElement("article");
    card.className = "team-card";

    const name = document.createElement("h2");
    name.className = "team-name";
    name.textContent = team.name;

    const wrap = document.createElement("div");
    wrap.className = "thermo-wrap";
    wrap.style.setProperty("--team-color", team.color || "#888");

    const tube = document.createElement("div");
    tube.className = "thermo-tube";

    const fill = document.createElement("div");
    fill.className = "thermo-fill";
    fill.style.height = `${fillPct}%`;

    const bulb = document.createElement("div");
    bulb.className = "thermo-bulb";

    tube.appendChild(fill);
    wrap.appendChild(tube);
    wrap.appendChild(bulb);

    const scoreEl = document.createElement("div");
    scoreEl.className = "team-score";
    scoreEl.textContent = String(score);

    card.appendChild(name);
    card.appendChild(wrap);
    card.appendChild(scoreEl);
    thermometerGrid.appendChild(card);
  }
}

refreshScores();
setInterval(refreshScores, POLL_INTERVAL_MS);
