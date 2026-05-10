// --- Learning panel ---------------------------------------------------------
// Right-hand-side panel that explains a clicked system or pattern.
// Reads SYSTEMS and PATTERNS from scenarios.js.

const learningEl = document.getElementById("learning");

// Mini-formatter för PATTERNS-bodies. Texterna är hårdkodade i scenarios.js
// (ingen user-input → ingen XSS-risk) och använder en liten markdown-dialekt:
//   - dubbla newlines = nya stycken
//   - rader som börjar med "- " = bullet list
//   - **text** = bold, *text* = emphasis
function formatPatternBody(body) {
  return body
    .split(/\n{2,}/)
    .map(block => {
      const lines = block.split("\n");
      if (lines.length > 1 && lines.every(l => l.startsWith("- "))) {
        const items = lines.map(l => `<li>${formatInline(l.slice(2))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${formatInline(block.replace(/\n/g, " "))}</p>`;
    })
    .join("");
}

function formatInline(s) {
  // Order matters: ** before * to avoid greedy match.
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

// Mappar pattern-grupp → vilket mode den hör till + display-rubrik. Vid
// mode-byte filtreras patternList så bara grupper för aktivt mode visas.
const GROUP_LABEL = {
  concepts: "OSS/BSS-begrepp",
  product: "Produktspecifika begrepp",
  process: "Processmönster",
  automation: "Provisionering och aktivering"
};
const GROUP_MODE = {
  concepts: "learn",
  product: "learn",
  process: "optimize",
  automation: "optimize"
};
// Visningsordning per mode — så Concepts kommer före Product, Process före Automation.
const GROUPS_BY_MODE = {
  learn: ["concepts", "product"],
  optimize: ["process", "automation"]
};

function currentMode() {
  return document.body.classList.contains("mode-optimize") ? "optimize" : "learn";
}

function patternList() {
  const mode = currentMode();
  return GROUPS_BY_MODE[mode].map(g => {
    const items = Object.entries(PATTERNS).filter(([, p]) => p.group === g);
    if (items.length === 0) return "";
    const buttons = items.map(([k, p]) =>
      `<button class="pattern-link" data-pattern="${k}">${p.title}</button>`
    ).join("");
    return `<div class="pattern-list"><h4>${GROUP_LABEL[g]}</h4>${buttons}</div>`;
  }).join("");
}

// Spara aktuell vy så att refreshLearningForMode() kan re-rendera
// patternList vid mode-byte utan att förlora user state (eller falla tillbaka
// graciöst om aktuell pattern inte finns i nya mode).
let currentView = { type: "empty" };

function showLearningEmpty() {
  currentView = { type: "empty" };
  learningEl.innerHTML = `
    <p class="empty">Klicka på en domän till vänster eller på ett event i loggen för att läsa förklaringen här.</p>
    ${patternList()}`;
  wirePatterns();
}

function showLearningSystem(systemId) {
  const s = SYSTEMS[systemId];
  if (!s) return;
  currentView = { type: "system", key: systemId };
  learningEl.innerHTML = `
    <a class="back" id="back-link">← Tillbaka</a>
    <h3>${s.name}</h3>
    <span class="layer-tag ${s.layer}">${s.layer.toUpperCase()}</span>
    <section><h4>Vad gör systemet?</h4><p>${s.what}</p></section>
    <section><h4>Varför behövs det?</h4><p>${s.why}</p></section>
    <section><h4>Typiska problem & förbättringsfrågor</h4><p>${s.problems}</p></section>
    ${patternList()}`;
  wirePatterns();
  document.getElementById("back-link").addEventListener("click", showLearningEmpty);
}

function showLearningPattern(key) {
  const p = PATTERNS[key];
  if (!p) return;
  currentView = { type: "pattern", key };
  learningEl.innerHTML = `
    <a class="back" id="back-link">← Tillbaka</a>
    <h3>${p.title}</h3>
    <section>${formatPatternBody(p.body)}</section>
    ${patternList()}`;
  wirePatterns();
  document.getElementById("back-link").addEventListener("click", showLearningEmpty);
}

// Re-render learning panel efter mode-byte. Om aktuellt visad pattern hör
// till annat mode, fall tillbaka till första pattern i nya mode (eller empty
// om inga patterns finns där). System-vyn är samma i båda mode — vi
// re-rendererar bara för att uppdatera patternList nedanför.
function refreshLearningForMode() {
  const mode = currentMode();
  if (currentView.type === "pattern") {
    const p = PATTERNS[currentView.key];
    if (!p || GROUP_MODE[p.group] !== mode) {
      const firstKey = Object.keys(PATTERNS).find(k => GROUP_MODE[PATTERNS[k].group] === mode);
      if (firstKey) showLearningPattern(firstKey);
      else showLearningEmpty();
      return;
    }
    showLearningPattern(currentView.key);
  } else if (currentView.type === "system") {
    showLearningSystem(currentView.key);
  } else {
    showLearningEmpty();
  }
}

function wirePatterns() {
  learningEl.querySelectorAll(".pattern-link").forEach(btn => {
    btn.addEventListener("click", () => showLearningPattern(btn.dataset.pattern));
  });
}
