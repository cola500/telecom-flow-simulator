// --- Toyota Kata-inspired experiment loop -----------------------------------
// Strukturerar Optimize Process som en hypotesdriven loop:
//   Mål → Hypotes → Förändring → Förväntat → Faktiskt → Reflektion
//
// Inga ändringar i engine.js förutom EN hook-rad (Experiment.onRunFinalized i
// finalizeParallel). Modulen läser engine-globals direkt — samma mönster som
// charts.js — och håller all UI-state lokalt.

(function ExperimentModule() {
  "use strict";

  // --- State ----------------------------------------------------------------
  // Lever bara i sessionen. Ingen persistens — körs sidan om börjar man om.
  // Pedagogiskt fokus, inte CRUD.

  const state = {
    // Användarens fält (kontrollerade via input-events).
    goal: "",
    hypothesis: "",
    expectedOverride: "",       // tom = använd auto-prediction

    // Senaste avslutade körningens snapshot. Används som "förra körningen"
    // i diff:en mot current settings.
    lastRunSettings: null,
    lastRunMetrics: null,

    // Snapshot fryst när användaren startar en körning. Används vid finalize
    // för att jämföra mot vad som var förra körningens settings/metrics.
    pendingRunSettings: null,
    pendingRunExpected: "",     // text som visades som "Förväntat" vid run start

    // Reflektion bundet till senast renderade resultat.
    reflectionAnswer: null,
    reflectionText: "",

    // Lättviktig historik — senaste 3 experiment.
    history: []
  };

  const HISTORY_LIMIT = 3;

  // --- Settings-snapshot ----------------------------------------------------
  // Läser engine-globals direkt. Plain-script-modulerna delar namnrymd, så
  // workersPerSystem / *Enabled / variabilityPct / currentProductId är redan
  // i scope när experiment.js laddas (efter engine + render).

  function captureSettings(batchSize) {
    return {
      batchSize: batchSize ?? null,
      riWorkers: workersPerSystem.ri,
      provWorkers: workersPerSystem.prov,
      automationReservation: !!automationEnabled,
      automationProvisioning: !!provAutomationEnabled,
      backpressure: !!backpressureEnabled,
      variability: variabilityPct,
      product: currentProductId
    };
  }

  // --- Diff -----------------------------------------------------------------
  // Returnerar list av { label, from, to, key } för UI-render. Endast fält
  // som faktiskt ändrats kommer med.

  const PRODUCT_LABEL = { fiber: "Fiber 500 Mbps", mobile: "Mobile subscription" };

  function settingsDiff(prev, cur) {
    if (!prev) return [];
    const changes = [];
    const onOff = b => b ? "on" : "off";
    if (prev.batchSize != null && cur.batchSize != null && prev.batchSize !== cur.batchSize) {
      changes.push({ key: "batchSize", label: "Batch size", from: prev.batchSize, to: cur.batchSize });
    }
    if (prev.riWorkers !== cur.riWorkers) {
      changes.push({ key: "riWorkers", label: "Resource Reservation capacity", from: prev.riWorkers, to: cur.riWorkers });
    }
    if (prev.provWorkers !== cur.provWorkers) {
      changes.push({ key: "provWorkers", label: "Provisioning / Activation capacity", from: prev.provWorkers, to: cur.provWorkers });
    }
    if (prev.automationReservation !== cur.automationReservation) {
      changes.push({ key: "automationReservation", label: "Automated reservation", from: onOff(prev.automationReservation), to: onOff(cur.automationReservation) });
    }
    if (prev.automationProvisioning !== cur.automationProvisioning) {
      changes.push({ key: "automationProvisioning", label: "Automated provisioning", from: onOff(prev.automationProvisioning), to: onOff(cur.automationProvisioning) });
    }
    if (prev.backpressure !== cur.backpressure) {
      changes.push({ key: "backpressure", label: "Backpressure", from: onOff(prev.backpressure), to: onOff(cur.backpressure) });
    }
    if (prev.variability !== cur.variability) {
      changes.push({ key: "variability", label: "Variability", from: prev.variability + "%", to: cur.variability + "%" });
    }
    if (prev.product !== cur.product) {
      changes.push({ key: "product", label: "Product", from: PRODUCT_LABEL[prev.product] || prev.product, to: PRODUCT_LABEL[cur.product] || cur.product });
    }
    return changes;
  }

  // --- Auto-prediction ------------------------------------------------------
  // Rule-based: en kort fras per ändring. Skriv "Förväntat:" inte "kommer att" —
  // poängen är att det är en hypotes, inte en sanning.

  function predictionFor(change) {
    const direction = (a, b) => {
      if (typeof a === "number" && typeof b === "number") return b > a ? "up" : (b < a ? "down" : "same");
      return null;
    };
    const dir = direction(change.from, change.to);
    switch (change.key) {
      case "riWorkers":
        return dir === "up"
          ? "Kortare kö i Resource Reservation, men bottleneck kan flytta nedströms (typiskt till Provisioning)."
          : "Kö i Resource Reservation kan växa — RI blir trolig bottleneck igen.";
      case "provWorkers":
        return dir === "up"
          ? "Kortare kö i Provisioning / Activation, men en annan constraint (Resource Reservation, inventory mismatch) kan dominera istället."
          : "Kö i Provisioning kan växa — och fail-prob ökar med kölängden, så incidents kan stiga.";
      case "automationReservation":
        return change.to === "on"
          ? "Reservation-steget halveras (× 0.5). Lead time minskar, bottleneck kan flytta nedströms."
          : "Reservation tar längre tid igen — lead time ökar.";
      case "automationProvisioning":
        return change.to === "on"
          ? "Provisioning går snabbare (× 0.6) och fail-prob halveras — färre incidents förväntas. Inventory mismatch försvinner dock inte."
          : "Provisioning saktas och fail-prob återgår — fler incidents möjliga vid hög load.";
      case "backpressure":
        return change.to === "on"
          ? "Lägre peak load i RI och färre incidents, men batchen kan ta längre realtid (Order Management pausar nya spawns)."
          : "Peak load kan öka — köer växer fritt och incidents kan kaskadera.";
      case "variability":
        return dir === "down"
          ? "Stabilare flöde och färre extrema väntetider — kötiden blir jämnare."
          : "Större spridning i väntetid. Variation is the enemy of flow — köer blir mer ojämna.";
      case "batchSize":
        return dir === "up"
          ? "Mer systemtryck, längre köer och tydligare bottlenecks."
          : "Lägre tryck — köer hinner dräneras mellan spawns.";
      case "product":
        return "Annan domän-decomp (BSS likadan, OSS olika) — bottleneck och fail-mönster kan se annorlunda ut.";
      default:
        return null;
    }
  }

  function buildPredictionText(changes) {
    if (changes.length === 0) return "";
    const lines = changes
      .map(c => predictionFor(c))
      .filter(Boolean)
      .map(t => "Förväntat: " + t);
    return lines.join(" ");
  }

  // --- Bottleneck-härledning ------------------------------------------------
  // Det "långsammaste steget" här definieras som det single-proc-system
  // (RI eller Prov) där flest kötillfällen ackumulerade tid. Samma logik som
  // engine.js använder för "Mest kötid totalt" i Insights.

  function busiestSystemLabel(metrics) {
    if (!metrics || !metrics.queueWaitBySys) return "—";
    let top = null;
    for (const sysId of Object.keys(metrics.queueWaitBySys)) {
      const w = metrics.queueWaitBySys[sysId] || 0;
      if (!top || w > top.wait) top = { sysId, wait: w };
    }
    if (!top || top.wait === 0) return "ingen tydlig bottleneck";
    const sys = (typeof SYSTEMS !== "undefined" && SYSTEMS[top.sysId]) ? SYSTEMS[top.sysId].name : top.sysId;
    return sys;
  }

  // --- Metrics-formatters ---------------------------------------------------

  function fmtMsValue(ms) {
    if (typeof fmtMs === "function") return fmtMs(ms);
    return Math.round(ms) + " ms";
  }

  function fmtNum(n) {
    if (n == null) return "—";
    return Math.round(n).toString();
  }

  function fmtTput(t) {
    if (t == null) return "—";
    return t.toFixed(2) + "/s";
  }

  function arrowFor(prev, cur, lowerIsBetter) {
    if (prev == null || cur == null) return "";
    const delta = cur - prev;
    if (Math.abs(delta) < 1e-9) return "= ingen ändring";
    const better = lowerIsBetter ? delta < 0 : delta > 0;
    const arrow = delta > 0 ? "↑" : "↓";
    return `<span class="exp-delta ${better ? "better" : "worse"}">${arrow}</span>`;
  }

  // --- DOM-helpers ----------------------------------------------------------

  function $(id) { return document.getElementById(id); }

  function getValue(id) {
    const el = $(id);
    return el ? el.value : "";
  }

  // --- Render: pre-run paneler ---------------------------------------------

  function renderChanges() {
    const el = $("exp-changes");
    if (!el) return;
    if (!state.lastRunSettings) {
      el.innerHTML = '<span class="exp-changes-empty">Ingen tidigare körning än — kör en batch så börjar jämförelsen.</span>';
      return;
    }
    const cur = captureSettings();
    const changes = settingsDiff(state.lastRunSettings, cur);
    if (changes.length === 0) {
      el.innerHTML = '<span class="exp-changes-empty">Du har inte ändrat några inställningar sedan förra körningen.</span>';
      return;
    }
    el.innerHTML = '<ul class="exp-changes-list">' + changes.map(c =>
      `<li><strong>${c.label}:</strong> <span class="exp-changes-from">${c.from}</span> → <span class="exp-changes-to">${c.to}</span></li>`
    ).join("") + "</ul>";
  }

  function renderPrediction() {
    const el = $("exp-prediction");
    if (!el) return;
    if (!state.lastRunSettings) {
      el.innerHTML = '<span class="exp-prediction-empty">Justera reglagen i Simulering så ser du en hypotesbaserad prediction här efter första körningen.</span>';
      return;
    }
    const changes = settingsDiff(state.lastRunSettings, captureSettings());
    if (changes.length === 0) {
      el.innerHTML = '<span class="exp-prediction-empty">Inga settings-ändringar — körningen bör likna förra körningen.</span>';
      return;
    }
    el.innerHTML = '<p class="exp-prediction-text">' + buildPredictionText(changes) + "</p>";
  }

  // --- Render: post-run resultat -------------------------------------------

  function renderResult() {
    const empty = $("exp-result-empty");
    const block = $("exp-result");
    if (!empty || !block) return;

    if (!state.lastRunMetrics) {
      empty.classList.remove("hidden");
      block.classList.add("hidden");
      return;
    }
    empty.classList.add("hidden");
    block.classList.remove("hidden");

    // Förväntat — text som var aktuell när körningen startade.
    const expectedEl = $("exp-result-expected");
    if (expectedEl) {
      expectedEl.textContent = state.pendingRunExpected || "(inget förväntat resultat angavs)";
    }

    // Faktiskt — list med metric-deltas. Om vi inte har en föregående metrics
    // visar vi bara aktuella värden utan jämförelse.
    const actualEl = $("exp-result-actual");
    if (actualEl) {
      const m = state.lastRunMetrics;
      const baseline = state.previousRunMetrics; // metrics från innan denna körning
      const lines = [];
      lines.push(`<li><strong>Avg lead time:</strong> ${baseline ? fmtMsValue(baseline.avgLead) + " → " : ""}${fmtMsValue(m.avgLead)} ${baseline ? arrowFor(baseline.avgLead, m.avgLead, true) : ""}</li>`);
      lines.push(`<li><strong>Incidents:</strong> ${baseline ? baseline.incidents + " → " : ""}${m.incidents} ${baseline ? arrowFor(baseline.incidents, m.incidents, true) : ""}</li>`);
      lines.push(`<li><strong>Throughput:</strong> ${baseline ? fmtTput(baseline.throughput) + " → " : ""}${fmtTput(m.throughput)} ${baseline ? arrowFor(baseline.throughput, m.throughput, false) : ""}</li>`);
      lines.push(`<li><strong>Max queue:</strong> ${baseline ? baseline.maxQueue + " → " : ""}${m.maxQueue} ${baseline ? arrowFor(baseline.maxQueue, m.maxQueue, true) : ""}</li>`);
      lines.push(`<li><strong>Bottleneck (mest kötid):</strong> ${baseline ? busiestSystemLabel(baseline) + " → " : ""}${busiestSystemLabel(m)}</li>`);
      if (m.failed > 0 || m.completed > 0) {
        lines.push(`<li><strong>Operativ påverkan:</strong> ${m.completed} klara · ${m.failed} failed · ${m.slaAtRisk} SLA-risk</li>`);
      }
      actualEl.innerHTML = lines.join("");
    }

    renderReflectionButtons();
    renderHistory();
  }

  function renderReflectionButtons() {
    const wrap = $("exp-reflection-buttons");
    if (!wrap) return;
    wrap.querySelectorAll("button").forEach(b => {
      b.classList.toggle("active", b.dataset.answer === state.reflectionAnswer);
    });
    const ta = $("exp-reflection-text");
    if (ta && ta.value !== state.reflectionText) ta.value = state.reflectionText;
  }

  function renderHistory() {
    const list = $("exp-history-list");
    if (!list) return;
    if (state.history.length === 0) {
      list.innerHTML = '<li class="exp-history-empty">Ingen historik ännu — körningar samlas här.</li>';
      return;
    }
    list.innerHTML = state.history.map(h => {
      const time = new Date(h.timestamp).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const changesText = h.changes.length === 0
        ? "<em>inga settings-ändringar</em>"
        : h.changes.map(c => `${c.label}: ${c.from}→${c.to}`).join(" · ");
      const reflLabel = REFLECTION_LABELS[h.reflectionAnswer] || "—";
      return `
        <li class="exp-history-item">
          <div class="exp-history-head"><span class="exp-history-time">${time}</span><span class="exp-history-status status-${h.reflectionAnswer || "none"}">${reflLabel}</span></div>
          <div class="exp-history-changes">${changesText}</div>
          <div class="exp-history-result">Lead ${fmtMsValue(h.metrics.avgLead)} · Incidents ${h.metrics.incidents} · Tput ${fmtTput(h.metrics.throughput)}</div>
        </li>
      `;
    }).join("");
  }

  const REFLECTION_LABELS = {
    ja: "✓ Stämde",
    delvis: "~ Delvis",
    nej: "✗ Stämde inte",
    osakert: "? Osäkert",
    null: "—",
    undefined: "—"
  };

  function refresh() {
    renderChanges();
    renderPrediction();
  }

  // --- Engine-hookar --------------------------------------------------------
  // Anropas från app.js (beginRun) och engine.js (onRunFinalized + onReset).

  function beginRun(batchSize) {
    state.pendingRunSettings = captureSettings(batchSize);
    // Frys vad som visas som "Förväntat" — användarens text om angiven, annars
    // auto-prediction baserat på diff:en mot förra körningen.
    const userExpected = getValue("exp-expected").trim();
    if (userExpected) {
      state.pendingRunExpected = userExpected;
    } else {
      const changes = settingsDiff(state.lastRunSettings, state.pendingRunSettings);
      state.pendingRunExpected = changes.length > 0
        ? buildPredictionText(changes)
        : (state.lastRunSettings ? "Inga settings-ändringar — körningen bör likna förra körningen." : "(första körningen — ingen baseline att jämföra mot)");
    }
  }

  function onRunFinalized() {
    // Läser engine-globals direkt. lastParallelRun har precis satts av
    // finalizeParallel(); parallelSim.queueWaitBySys finns kvar tills nästa run.
    if (typeof lastParallelRun === "undefined" || !lastParallelRun) return;
    const sim = (typeof parallelSim !== "undefined") ? parallelSim : null;

    // Spara baseline (förra körningens settings + metrics) innan vi skriver över.
    const previousSettings = state.lastRunSettings;
    state.previousRunMetrics = state.lastRunMetrics;

    state.lastRunSettings = state.pendingRunSettings || captureSettings(lastParallelRun.batchSize);
    state.lastRunMetrics = {
      avgLead: lastParallelRun.avgLead,
      incidents: lastParallelRun.incidents,
      maxQueue: lastParallelRun.maxQueue,
      throughput: lastParallelRun.throughput,
      completed: sim ? sim.completedOrders.length : null,
      failed: sim ? sim.orders.filter(o => o.status === "failed").length : 0,
      slaAtRisk: computeSlaAtRisk(sim),
      queueWaitBySys: sim ? { ...sim.queueWaitBySys } : {}
    };

    // Spara i historik. "changes" = vad som ändrades inför denna körning.
    state.history.unshift({
      timestamp: Date.now(),
      settings: state.lastRunSettings,
      metrics: state.lastRunMetrics,
      expected: state.pendingRunExpected,
      changes: settingsDiff(previousSettings, state.lastRunSettings),
      reflectionAnswer: null,
      reflectionText: ""
    });
    if (state.history.length > HISTORY_LIMIT) state.history.length = HISTORY_LIMIT;

    // Reset reflektion för nästa runda.
    state.reflectionAnswer = null;
    state.reflectionText = "";

    // Rensa pending — körningen är klar.
    state.pendingRunSettings = null;

    // Rendera om hela panelerna.
    refresh();
    renderResult();
  }

  function computeSlaAtRisk(sim) {
    if (!sim || !sim.completedOrders || sim.completedOrders.length === 0) return 0;
    if (typeof happyPathFor !== "function") return 0;
    const path = happyPathFor(currentProductId);
    let baseline = path.reduce((s, e) => s + e.duration, 0);
    if (typeof calcHandoff === "function") {
      for (let i = 0; i < path.length - 1; i++) {
        baseline += calcHandoff(path[i].system, path[i + 1].system);
      }
    }
    const threshold = baseline * 1.5;
    return sim.completedOrders.filter(o => (o.completedAt - o.createdAt) > threshold).length;
  }

  function onReset() {
    // Behåll mål/hypotes — de är användarens reflektion och ska överleva
    // engine-reset. Men nolla körnings-state så historiken inte blandas
    // med en tom motor.
    state.lastRunSettings = null;
    state.lastRunMetrics = null;
    state.previousRunMetrics = null;
    state.pendingRunSettings = null;
    state.pendingRunExpected = "";
    state.reflectionAnswer = null;
    state.reflectionText = "";
    state.history = [];

    const empty = $("exp-result-empty");
    const block = $("exp-result");
    if (empty) empty.classList.remove("hidden");
    if (block) block.classList.add("hidden");

    refresh();
  }

  // --- Wire textarea + reflection-buttons ----------------------------------

  function init() {
    const goalEl = $("exp-goal");
    const hypoEl = $("exp-hypothesis");
    const expEl = $("exp-expected");
    const reflTextEl = $("exp-reflection-text");
    if (goalEl) goalEl.addEventListener("input", () => { state.goal = goalEl.value; });
    if (hypoEl) hypoEl.addEventListener("input", () => { state.hypothesis = hypoEl.value; });
    if (expEl) expEl.addEventListener("input", () => { state.expectedOverride = expEl.value; });
    if (reflTextEl) reflTextEl.addEventListener("input", () => {
      state.reflectionText = reflTextEl.value;
      if (state.history[0]) state.history[0].reflectionText = reflTextEl.value;
    });

    const reflWrap = $("exp-reflection-buttons");
    if (reflWrap) {
      reflWrap.addEventListener("click", e => {
        const btn = e.target.closest("button[data-answer]");
        if (!btn) return;
        state.reflectionAnswer = btn.dataset.answer;
        if (state.history[0]) state.history[0].reflectionAnswer = btn.dataset.answer;
        renderReflectionButtons();
        renderHistory();
      });
    }

    refresh();
    renderResult();
  }

  // --- Exponera --------------------------------------------------------------

  window.Experiment = { init, refresh, beginRun, onRunFinalized, onReset };
})();
