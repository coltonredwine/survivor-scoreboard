const thermometerGrid = document.getElementById("thermometerGrid");
const logo = document.getElementById("logo");
const helpButton = document.getElementById("helpButton");
const helpModal = document.getElementById("helpModal");
const helpClose = document.getElementById("helpClose");

const POLL_INTERVAL_MS = 3000;
const ANIM_MS = 650;

const teamCards = new Map();

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

function computeFillPct(score, denom, eveningPercent) {
  const e = Math.max(0, Math.min(1, Number(eveningPercent) / 100));
  const ratio = Math.max(0, Math.min(1, score / Math.max(denom, 1)));
  const blended = ratio * e;
  return 10 + blended * 80;
}

function animateNumber(el, from, to, ms) {
  const id = (el._countAnimId = (el._countAnimId || 0) + 1);
  const start = performance.now();
  const a = Math.round(Number(from) || 0);
  const b = Math.round(Number(to) || 0);
  if (a === b) {
    el.textContent = String(b);
    return;
  }
  function step(now) {
    if (el._countAnimId !== id) return;
    const t = Math.min(1, (now - start) / ms);
    const eased = t * (2 - t);
    el.textContent = String(Math.round(a + (b - a) * eased));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function animateFillHeight(fillEl, fromPct, toPct, ms) {
  const id = (fillEl._fillAnimId = (fillEl._fillAnimId || 0) + 1);
  const start = performance.now();
  const a = Number(fromPct);
  const b = Number(toPct);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    fillEl.style.height = `${toPct}%`;
    return;
  }
  function step(now) {
    if (fillEl._fillAnimId !== id) return;
    const t = Math.min(1, (now - start) / ms);
    const eased = t * (2 - t);
    fillEl.style.height = `${a + (b - a) * eased}%`;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function buildCard(team) {
  const card = document.createElement("article");
  card.className = "team-card";
  card.dataset.team = team.name;

  const name = document.createElement("h2");
  name.className = "team-name";

  const wrap = document.createElement("div");
  wrap.className = "thermo-wrap";

  const tube = document.createElement("div");
  tube.className = "thermo-tube";

  const fill = document.createElement("div");
  fill.className = "thermo-fill";

  const bulb = document.createElement("div");
  bulb.className = "thermo-bulb";

  tube.appendChild(fill);
  wrap.appendChild(tube);
  wrap.appendChild(bulb);

  const scoreEl = document.createElement("div");
  scoreEl.className = "team-score";

  card.appendChild(name);
  card.appendChild(wrap);
  card.appendChild(scoreEl);

  name.textContent = team.name;
  wrap.style.setProperty("--team-color", team.color || "#888");
  fill.style.height = "10%";
  fill.dataset.pct = "10";
  scoreEl.textContent = "0";
  scoreEl.dataset.value = "0";

  return card;
}

function updateCard(card, team, denom, eveningPercent) {
  const name = card.querySelector(".team-name");
  const wrap = card.querySelector(".thermo-wrap");
  const fill = card.querySelector(".thermo-fill");
  const scoreEl = card.querySelector(".team-score");

  name.textContent = team.name;
  wrap.style.setProperty("--team-color", team.color || "#888");

  const score = Number(team.score) || 0;
  const newPct = computeFillPct(score, denom, eveningPercent);
  const oldPct = parseFloat(fill.dataset.pct || String(newPct));
  fill.dataset.pct = String(newPct);

  if (!Number.isFinite(oldPct) || Math.abs(oldPct - newPct) < 0.01) {
    fill.style.height = `${newPct}%`;
  } else {
    animateFillHeight(fill, oldPct, newPct, ANIM_MS);
  }

  const oldScore = parseInt(scoreEl.dataset.value || "0", 10);
  scoreEl.dataset.value = String(score);
  if (oldScore !== score) {
    animateNumber(scoreEl, oldScore, score, ANIM_MS);
  } else {
    scoreEl.textContent = String(score);
  }
}

function render(payload) {
  const teams = Array.isArray(payload.teams) ? payload.teams : [];
  const floor = Number(payload.floor || 0);
  const highest = teams.reduce((max, team) => Math.max(max, Number(team.score) || 0), 0);
  const denom = Math.max(highest, floor, 1);
  const eveningRaw = payload.eveningPercent;
  const eveningPercent = Number.isFinite(Number(eveningRaw)) ? Number(eveningRaw) : 100;

  const seen = new Set();

  for (const team of teams) {
    seen.add(team.name);
    if (!teamCards.has(team.name)) {
      teamCards.set(team.name, buildCard(team));
    }
    updateCard(teamCards.get(team.name), team, denom, eveningPercent);
  }

  for (const name of teamCards.keys()) {
    if (!seen.has(name)) {
      teamCards.get(name).remove();
      teamCards.delete(name);
    }
  }

  const fragment = document.createDocumentFragment();
  for (const team of teams) {
    fragment.appendChild(teamCards.get(team.name));
  }
  thermometerGrid.appendChild(fragment);
}

refreshScores();
setInterval(refreshScores, POLL_INTERVAL_MS);
