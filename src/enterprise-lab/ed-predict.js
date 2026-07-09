// --- Enterprise Delivery Lab: Predict before explanation --------------------
// Liten "förutsäg utfallet"-mekanik. Pedagogiken (Product Vision, avsnitt 6):
// den som gissar innan hen kör lär sig av skillnaden mot sin gissning.
//
// Flöde:
//   1. Före körning: användaren skriver "vad tror du händer?" + "varför?".
//   2. En scenario-knapp trycks → ed-app.js anropar onRunStart() som låser
//      gissningen och växlar panelen till "kör…".
//   3. Panelen prenumererar på engine och fångar när körningen är done.
//   4. Efter körning: gissningen + faktiskt utfall visas sida vid sida, och
//      "vad lärde du dig?" frågas.
//   5. Senaste 3 gissning/lärdom-paren sparas i localStorage (frivillig bonus,
//      helt lokalt, try/catch:at — degraderar tyst om storage saknas).
//
// Isolerat scope, inga delade globals. Icke-kritiskt: om modulen fallerar ska
// simulatorn fungera ändå (ed-app anropar den defensivt).

(function EdLabPredictModule() {
  "use strict";

  const D = window.EdLabDomain;
  const LS_KEY = "edl.predictions.v1";
  const MAX_HISTORY = 3;

  // Reflektionsfrågor efter körning — domänorienterade (knyter an till Learn-
  // lagret: observation, väntan/omtag, tidig åtgärd, nästa experiment). Datadrivet
  // så antal och formulering kan ändras på ett ställe.
  const REFLECT_QUESTIONS = [
    { key: "observed",    label: "Vad observerade du?" },
    { key: "waitRework",  label: "Var uppstod väntan eller omtag?" },
    { key: "earlyAction", label: "Vilken tidig åtgärd hade kunnat minska risken?" },
    { key: "next",        label: "Vad skulle du testa nästa gång?" }
  ];

  function emptyReflection() {
    const r = {};
    for (const q of REFLECT_QUESTIONS) r[q.key] = "";
    return r;
  }

  let dom = null;
  let mode = "predict";     // predict | running | review
  let locked = null;        // { blockerId, alignmentOn, what, why } för pågående körning
  let currentEntry = null;  // referens till historik-posten som redigeras i review
  let history = [];         // senaste posterna, nyast först
  let unsubscribe = null;

  // --- Init -------------------------------------------------------------------

  function init() {
    if (!window.EdLabEngine || !D) {
      console.error("[EdLab] predict init: EdLabEngine/EdLabDomain saknas.");
      return false;
    }
    dom = cacheDom();
    if (!dom) {
      console.error("[EdLab] predict init: nödvändiga DOM-noder saknas.");
      return false;
    }
    history = loadHistory();
    if (typeof unsubscribe === "function") unsubscribe();
    unsubscribe = window.EdLabEngine.subscribe(onEngine);
    render();
    console.info("[EdLab] predict bound to engine");
    return true;
  }

  function cacheDom() {
    const el = (id) => document.getElementById(id);
    const refs = {
      fields: el("edl-predict-fields"),
      what: el("edl-predict-what"),
      why: el("edl-predict-why"),
      hint: el("edl-predict-hint"),
      review: el("edl-predict-review"),
      history: el("edl-predict-history")
    };
    return Object.values(refs).every(Boolean) ? refs : null;
  }

  // --- Livscykel-hooks (anropas från ed-app.js) ------------------------------

  // Fångar gissningen i det ögonblick en körning startas. Att läsa fälten här
  // (istället för att gissa på engine-status) undviker reset/running-tvetydighet.
  function onRunStart(meta) {
    locked = {
      blockerId: meta && meta.blockerId ? meta.blockerId : null,
      alignmentOn: !!(meta && meta.alignmentOn),
      what: dom ? dom.what.value.trim() : "",
      why: dom ? dom.why.value.trim() : ""
    };
    mode = "running";
    render();
  }

  // Manuella Återställ nollar panelen tillbaka till gissningsläge (historiken
  // rör vi inte — den är lärloggen).
  function onFullReset() {
    mode = "predict";
    locked = null;
    currentEntry = null;
    if (dom) { dom.what.value = ""; dom.why.value = ""; }
    render();
  }

  // --- Engine-lyssnare --------------------------------------------------------

  function onEngine(state) {
    if (!dom) return;
    if (state.status === "done" && mode === "running") {
      enterReview(state);
    }
  }

  function enterReview(state) {
    const outcome = buildOutcome(state);
    currentEntry = {
      scenario: outcome.scenarioLabel,
      what: locked ? locked.what : "",
      why: locked ? locked.why : "",
      outcomeLine: outcome.line,
      reflection: emptyReflection()
    };
    history.unshift(currentEntry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveHistory();

    mode = "review";
    render(state);
  }

  // --- Utfallsdata (läses direkt ur engine-state = samma sanning som impact) --

  function buildOutcome(state) {
    const days = Math.round(state.simDays);
    const baseline = Math.round(state.baselineDays);
    const blockerLabel = state.blockerId && D.BLOCKERS[state.blockerId]
      ? D.BLOCKERS[state.blockerId].label
      : "Happy path (ingen blocker)";
    const alignLabel = locked && locked.alignmentOn ? " + tidig alignment" : "";
    const scenarioLabel = blockerLabel + alignLabel;

    const byId = {};
    for (const c of (state.impact || [])) byId[c.id] = c;

    const line =
      `${days} dagar · ${scenarioLabel} · ` +
      `rework ${byId.rework ? byId.rework.value : "—"} · ` +
      `${byId.confidence ? byId.confidence.value : "—"}`;

    return { days, baseline, scenarioLabel, byId, line };
  }

  // --- Rendering --------------------------------------------------------------

  function render(state) {
    if (!dom) return;

    const showFields = mode === "predict" || mode === "running";
    dom.fields.hidden = !showFields;
    dom.review.hidden = mode !== "review";

    if (mode === "running") {
      dom.what.disabled = true;
      dom.why.disabled = true;
      dom.hint.textContent = "Kör simuleringen… inväntar utfall.";
    } else if (mode === "predict") {
      dom.what.disabled = false;
      dom.why.disabled = false;
      dom.hint.textContent = "Fyll i om du vill — kör sedan ett scenario ovan. (Frivilligt.)";
    }

    if (mode === "review" && state) renderReview(state);
    renderHistory();
  }

  function renderReview(state) {
    const outcome = buildOutcome(state);
    const g = outcome.byId;

    const impactRow = (label, card) => {
      if (!card) return "";
      const delta = card.delta
        ? ` <span class="edl-delta-${card.delta.dir}">${card.delta.text}</span>`
        : "";
      return `<li><span class="edl-predict-k">${label}:</span> ${card.value}${delta}</li>`;
    };

    // En gissning finns om användaren skrev något i "vad" eller "varför".
    const hasPrediction = !!(locked &&
      ((locked.what && locked.what.trim()) || (locked.why && locked.why.trim())));

    const reflectField = (key, label) =>
      `<label class="edl-predict-label" for="edl-reflect-${key}">${label}</label>` +
      `<textarea id="edl-reflect-${key}" class="edl-predict-input" rows="2" data-refl="${key}"></textarea>`;

    // Reflektion efter varje körning: de fyra domänfrågorna. Rubriken ramar in
    // det som en jämförelse när en gissning finns, annars som ren reflektion.
    // En spegel för lärande — ingen bedömning.
    const heading = hasPrediction
      ? "Jämför din förutsägelse med utfallet"
      : "Reflektera över körningen";
    const reflectHtml =
      `<div class="edl-predict-compare">` +
        `<div class="edl-predict-heading">${heading}</div>` +
        `<p class="edl-predict-hint">Ingen rätt eller fel — det här är en spegel för lärande, inte ett prov.</p>` +
        REFLECT_QUESTIONS.map((q) => reflectField(q.key, q.label)).join("") +
      `</div>`;

    dom.review.innerHTML =
      `<div class="edl-predict-block">` +
        `<div class="edl-predict-heading">Din förutsägelse</div>` +
        `<p><span class="edl-predict-k">Vad:</span> ${valOrDash(locked && locked.what)}</p>` +
        `<p><span class="edl-predict-k">Varför:</span> ${valOrDash(locked && locked.why)}</p>` +
      `</div>` +
      `<div class="edl-predict-block">` +
        `<div class="edl-predict-heading">Vad som faktiskt hände</div>` +
        `<ul class="edl-predict-outcome">` +
          `<li><span class="edl-predict-k">Total ledtid:</span> ${outcome.days} dagar ` +
            `(baseline ${outcome.baseline})</li>` +
          `<li><span class="edl-predict-k">Scenario:</span> ${escapeHtml(outcome.scenarioLabel)}</li>` +
          impactRow("Delay", g.delay) +
          impactRow("Rework", g.rework) +
          impactRow("Confidence risk", g.confidence) +
        `</ul>` +
      `</div>` +
      reflectHtml +
      `<button type="button" class="edl-predict-newbtn" id="edl-predict-new">Gör en ny förutsägelse</button>`;

    // Ett enhetligt sätt att binda alla reflektionsfält, oavsett antal.
    dom.review.querySelectorAll("textarea[data-refl]").forEach((ta) => {
      const key = ta.getAttribute("data-refl");
      ta.value = currentEntry && currentEntry.reflection ? (currentEntry.reflection[key] || "") : "";
      ta.addEventListener("input", () => {
        if (currentEntry && currentEntry.reflection) {
          currentEntry.reflection[key] = ta.value;
          saveHistory();
        }
        renderHistory();
      });
    });

    const newBtn = document.getElementById("edl-predict-new");
    if (newBtn) newBtn.addEventListener("click", onFullReset);
  }

  function renderHistory() {
    // Visa inte historiken mitt i en körning, och inte den post som redan visas
    // i review-blocket.
    const items = history.filter((e) => e !== currentEntry);
    if (mode === "running" || items.length === 0) {
      dom.history.hidden = true;
      dom.history.innerHTML = "";
      return;
    }
    dom.history.hidden = false;
    dom.history.innerHTML =
      `<div class="edl-predict-heading">Tidigare förutsägelser</div>` +
      `<ol class="edl-predict-histlist">` +
        items.map((e) =>
          `<li>` +
            `<div class="edl-predict-hist-scenario">${escapeHtml(e.scenario)}</div>` +
            `<div><span class="edl-predict-k">Gissning:</span> ${valOrDash(e.what)}</div>` +
            `<div><span class="edl-predict-k">Utfall:</span> ${escapeHtml(e.outcomeLine)}</div>` +
            `<div><span class="edl-predict-k">Reflektion:</span> ${valOrDash(reflectionSummary(e.reflection))}</div>` +
          `</li>`
        ).join("") +
      `</ol>`;
  }

  // --- Hjälpare ---------------------------------------------------------------

  function valOrDash(s) {
    const t = (s == null ? "" : String(s)).trim();
    return t ? escapeHtml(t) : `<span class="edl-predict-empty">(ingen angiven)</span>`;
  }

  // Väver ihop de ifyllda reflektionsfälten till en kort rad för historiken.
  // Returnerar oescapad text — valOrDash escapar.
  function reflectionSummary(refl) {
    if (!refl) return "";
    const parts = [];
    for (const q of REFLECT_QUESTIONS) if (refl[q.key]) parts.push(refl[q.key]);
    if (refl.learned) parts.push(refl.learned); // bevara ev. äldre schema
    return parts.join(" · ");
  }

  // Säkerställer att en (ev. äldre) sparad post har ett komplett reflection-objekt.
  // Migrerar gamla poster som hade learned som topp-fält.
  function normalizeEntry(e) {
    const src = e && typeof e === "object" ? e : {};
    const r = src.reflection && typeof src.reflection === "object" ? src.reflection : {};
    const reflection = emptyReflection();
    for (const q of REFLECT_QUESTIONS) reflection[q.key] = r[q.key] || "";
    // Bevara ev. äldre 'learned'-fält (topp-nivå eller i reflection) så gamla
    // sparade poster inte tappar sin reflektion.
    const legacy = r.learned || (typeof src.learned === "string" ? src.learned : "");
    if (legacy) reflection.learned = legacy;
    return {
      scenario: src.scenario || "",
      what: src.what || "",
      why: src.why || "",
      outcomeLine: src.outcomeLine || "",
      reflection
    };
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadHistory() {
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY).map(normalizeEntry) : [];
    } catch (e) {
      console.warn("[EdLab] predict: kunde inte läsa historik ur localStorage", e);
      return [];
    }
  }

  function saveHistory() {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch (e) {
      console.warn("[EdLab] predict: kunde inte spara historik i localStorage", e);
    }
  }

  // --- Exponera API -----------------------------------------------------------

  window.EdLabPredict = { init, onRunStart, onFullReset };
})();
