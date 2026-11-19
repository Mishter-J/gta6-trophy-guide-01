const STORAGE_KEY = "gta6-trophy-guide-v1";
const GRADE_LABEL = { platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" };
const KIND_LABEL = { story: "Story", collectibles: "Collectibles", activities: "Activities" };
const STAGES = [
  { n: 1, title: "Stage 1 — Story", text: "Play the main story: the opening mission, Chapters 1–4, the final mission, the named story missions, and the final missions for Andy, Kenton, Billy, Randy and Tyrone." },
  { n: 2, title: "Stage 2 — Collectibles", text: "Sweep Leonida: meditation spots, collectible card sets, WAiNK It locations, discovered vehicles, all 52 areas, garage properties and Scooter Bros registrations." },
  { n: 3, title: "Stage 3 — Activities", text: "Master the side content: stunts, Shooting Range gold medals, drone and road races, stranger strands, challenges, robberies, gang operations and the money goals." },
  { n: 4, title: "Stage 4 — Clean-up & platinum", text: "Mop up the four missable trophies, the 100% completion gold, the quiet moment trophies — then the platinum unlocks itself." }
];
const MISSABLE_REASONS = {
  33: "Needs your partner beside you to lose a 4-star wanted level — partner availability is limited by the story, so do it while a partner is available.",
  34: "Needs your partner beside you for three back-to-back shop robberies — partner availability is limited by the story, so do it while a partner is available.",
  48: "Tied to story choices that can go one way only — PSN tracks 500 choices, so choose whenever the game offers a choice and do not rush past dialogue options.",
  49: "Tied to a second-try moment — a flawless playthrough with no failed attempt never triggers it, so an early failure is not a setback."
};

let trophies = [];
let earned = new Set();
let filter = "all";
let spoiler = false;
let query = "";
let selectedId = null;

const listEl = document.getElementById("trophyList");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const gradeCounts = document.getElementById("gradeCounts");
const listCount = document.getElementById("listCount");
const filterNote = document.getElementById("filterNote");
const onlineEmpty = document.getElementById("onlineEmpty");
const noMatch = document.getElementById("noMatch");
const searchBox = document.getElementById("searchBox");
const spoilerToggle = document.getElementById("spoilerToggle");
const detailEl = document.getElementById("detail");

function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.earned)) earned = new Set(data.earned.filter((n) => Number.isInteger(n)));
  } catch (e) { earned = new Set(); }
}

function saveEarned() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned: [...earned].sort((a, b) => a - b) })); } catch (e) { /* storage unavailable */ }
}

function formatCount(t) {
  if (t.count === undefined || t.count === null) return "";
  if (t.id === 52 || t.id === 53) return "Target: $" + t.count.toLocaleString("en-US");
  return "Target: " + t.count;
}

function isHidden(t) {
  return spoiler && t.kind === "story" && !earned.has(t.id);
}

function visibleTrophies() {
  const q = query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (filter === "story" && t.kind !== "story") return false;
    if (filter === "collectibles" && t.kind !== "collectibles") return false;
    if (filter === "activities" && t.kind !== "activities") return false;
    if (filter === "missable" && !t.missable) return false;
    if (filter === "online") return false;
    if (q && (t.name + " " + t.description).toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
}

function renderProgress() {
  const total = trophies.length || 55;
  const done = trophies.filter((t) => earned.has(t.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  progressFill.style.width = pct + "%";
  progressText.textContent = done + " / " + total + " earned · " + pct + "%";
  const parts = ["platinum", "gold", "silver", "bronze"].map((g) => {
    const all = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return GRADE_LABEL[g] + " " + got + "/" + all;
  });
  gradeCounts.textContent = parts.join(" · ");
}

function renderList() {
  const shown = visibleTrophies();
  listCount.textContent = "(" + shown.length + " of " + trophies.length + " shown)";
  onlineEmpty.hidden = filter !== "online";
  noMatch.hidden = !(filter !== "online" && shown.length === 0);
  filterNote.textContent = filter === "missable"
    ? "Showing the 4 missable trophies — earn them before their story window closes."
    : filter === "online"
      ? "The official list has no online trophies."
      : spoiler
        ? "Spoiler-free mode is on: unearned story trophies are hidden."
        : "";
  listEl.innerHTML = "";
  shown.forEach((t) => {
    const li = document.createElement("li");
    li.className = "trophy" + (earned.has(t.id) ? " earned" : "");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = earned.has(t.id);
    box.setAttribute("aria-label", "Mark trophy earned");
    box.addEventListener("change", () => {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveEarned();
      renderProgress();
      renderList();
      if (selectedId === t.id) openDetail(t.id);
    });
    const body = document.createElement("div");
    const name = document.createElement("div");
    name.className = "trophy-name" + (isHidden(t) ? " hidden-name" : "");
    name.textContent = isHidden(t) ? "Hidden story trophy" : t.name;
    const desc = document.createElement("p");
    desc.className = "trophy-desc";
    desc.textContent = isHidden(t) ? "Complete the story to reveal this trophy." : t.description;
    const tags = document.createElement("div");
    tags.className = "trophy-tags";
    const grade = document.createElement("span");
    grade.className = "badge " + t.grade;
    grade.textContent = GRADE_LABEL[t.grade] || t.grade;
    tags.appendChild(grade);
    const kind = document.createElement("span");
    kind.className = "badge kind";
    kind.textContent = KIND_LABEL[t.kind] || t.kind;
    tags.appendChild(kind);
    if (t.missable) {
      const m = document.createElement("span");
      m.className = "badge missable";
      m.textContent = "Missable";
      tags.appendChild(m);
    }
    const count = formatCount(t);
    if (count) {
      const c = document.createElement("span");
      c.className = "badge count";
      c.textContent = count;
      tags.appendChild(c);
    }
    body.appendChild(name);
    body.appendChild(desc);
    body.appendChild(tags);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "guide-btn";
    btn.textContent = "Guide";
    btn.addEventListener("click", () => openDetail(t.id));
    li.appendChild(box);
    li.appendChild(body);
    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

function openDetail(id, scroll) {
  const t = trophies.find((x) => x.id === id);
  if (!t) return;
  selectedId = id;
  document.getElementById("detailName").textContent = isHidden(t) ? "Hidden story trophy" : t.name;
  const meta = [GRADE_LABEL[t.grade], KIND_LABEL[t.kind] || t.kind];
  const count = formatCount(t);
  if (count) meta.push(count);
  if (t.missable) meta.push("Missable");
  if (earned.has(t.id)) meta.push("Earned");
  document.getElementById("detailMeta").textContent = meta.join(" · ");
  document.getElementById("detailDesc").textContent = isHidden(t)
    ? "Complete the story to reveal this trophy."
    : t.description;
  const missEl = document.getElementById("detailMissable");
  if (t.missable) {
    missEl.hidden = false;
    missEl.textContent = "Missable — " + (MISSABLE_REASONS[t.id] || "");
  } else {
    missEl.hidden = true;
    missEl.textContent = "";
  }
  document.getElementById("detailGuide").textContent = isHidden(t)
    ? "This guide is hidden until the trophy is earned, to keep the story unspoiled."
    : t.guide;
  const srcList = document.getElementById("detailSources");
  srcList.innerHTML = "";
  (t.sources || []).forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s;
    srcList.appendChild(li);
  });
  detailEl.hidden = false;
  if (scroll !== false) detailEl.scrollIntoView({ behavior: "auto", block: "start" });
}

function renderRoadmap() {
  const stageList = document.getElementById("stageList");
  STAGES.forEach((s) => {
    const li = document.createElement("li");
    li.className = "stage";
    const h = document.createElement("h3");
    h.textContent = s.title;
    const p = document.createElement("p");
    p.textContent = s.text;
    const ul = document.createElement("ul");
    trophies.filter((t) => t.stage === s.n).forEach((t) => {
      const item = document.createElement("li");
      item.textContent = (isHidden(t) ? "Hidden story trophy" : t.name) + " (" + GRADE_LABEL[t.grade] + ")";
      ul.appendChild(item);
    });
    li.appendChild(h);
    li.appendChild(p);
    li.appendChild(ul);
    stageList.appendChild(li);
  });
}

function renderMissable() {
  const ul = document.getElementById("missableList");
  trophies.filter((t) => t.missable).forEach((t) => {
    const li = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = t.name + " (" + GRADE_LABEL[t.grade] + ")";
    const p1 = document.createElement("p");
    p1.textContent = t.description;
    const p2 = document.createElement("p");
    p2.textContent = MISSABLE_REASONS[t.id] || "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "guide-btn";
    btn.textContent = "Read guide";
    btn.addEventListener("click", () => openDetail(t.id));
    li.appendChild(strong);
    li.appendChild(p1);
    li.appendChild(p2);
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function setFilter(f) {
  filter = f;
  document.querySelectorAll("#filters button").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === f);
  });
  renderList();
}

function applyQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const f = params.get("filter");
  if (f && ["story", "missable", "collectibles", "activities", "online"].includes(f)) filter = f;
  if (params.get("spoiler") === "on") {
    spoiler = true;
    spoilerToggle.checked = true;
  }
  if (params.get("demo") === "progress") {
    [2, 3, 4].forEach((id) => earned.add(id));
    saveEarned();
  }
  document.querySelectorAll("#filters button").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === filter);
  });
}

function applyView() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  if (view === "roadmap") {
    document.body.classList.add("view-roadmap");
  } else if (view === "trophy") {
    document.body.classList.add("view-trophy");
    const id = parseInt(params.get("id") || "", 10);
    if (id) openDetail(id, false);
  }
}

document.querySelectorAll("#filters button").forEach((b) => {
  b.addEventListener("click", () => setFilter(b.dataset.filter));
});
searchBox.addEventListener("input", () => { query = searchBox.value; renderList(); });
spoilerToggle.addEventListener("change", () => { spoiler = spoilerToggle.checked; renderList(); });
document.getElementById("detailClose").addEventListener("click", () => {
  detailEl.hidden = true;
  selectedId = null;
});
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ game: "Grand Theft Auto VI", earned: [...earned].sort((a, b) => a - b) }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "gta6-trophy-progress.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});
document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error("bad file");
      earned = new Set(ids.filter((n) => Number.isInteger(n) && n >= 1 && n <= 55));
      saveEarned();
      renderProgress();
      renderList();
      filterNote.textContent = "Progress imported: " + earned.size + " trophies earned.";
    } catch (err) {
      filterNote.textContent = "That file could not be imported — it must be a JSON export from this guide.";
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});
document.getElementById("resetBtn").addEventListener("click", () => {
  earned = new Set();
  saveEarned();
  renderProgress();
  renderList();
  filterNote.textContent = "Progress reset.";
});

fetch("data/trophies.json")
  .then((r) => r.json())
  .then((data) => {
    trophies = Array.isArray(data) ? data : data.trophies;
    trophies.sort((a, b) => a.id - b.id);
    loadEarned();
    applyQueryParams();
    renderProgress();
    renderList();
    renderRoadmap();
    renderMissable();
    applyView();
  })
  .catch(() => {
    listEl.innerHTML = "";
    noMatch.hidden = false;
    noMatch.textContent = "The trophy data could not be loaded. Reload the page.";
  });
