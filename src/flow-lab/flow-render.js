// --- FlowLab DOM-rendering ---------------------------------------------------
// Lyssnar på FlowLabEngine.subscribe och uppdaterar:
//   - kanban-kolumnerna (To Do / Analysis / Build / Done) med per-item-kort
//   - KPI-cards (Completed, Avg lead time, Throughput, WIP, Max kö)
//   - en debug/status-rad (engine, simT, ticks, items, completed, WIP-gate)
//
// Render-strategi: per-item DOM-element keyed via Map<id, element>. Kort flyttas
// mellan kolumner via appendChild när engine säger att de bytt steg. Det
// undviker att en re-render varje sample triggar en blink-animation på alla
// kort, och ger en pedagogiskt tydlig "glid mellan kolumner"-känsla.

(function FlowLabRenderModule() {
  "use strict";

  const COLUMN_STEPS = ["todo", "analysis", "build", "done"];

  let dom = null;             // cache av DOM-noder, fylls i init()
  let cardEls = new Map();    // itemId → HTMLElement
  let unsubscribe = null;     // engine.subscribe-returvärde, för cleanup vid reinit
  let lastSimTime = 0;

  function init() {
    if (!window.FlowLabEngine) {
      console.warn("[FlowLab] render init: FlowLabEngine saknas, kan inte subscriba.");
      return false;
    }
    dom = cacheDom();
    if (!dom) {
      console.warn("[FlowLab] render init: kunde inte hitta nödvändiga DOM-noder.");
      return false;
    }
    if (typeof unsubscribe === "function") unsubscribe();
    unsubscribe = window.FlowLabEngine.subscribe(refresh);
    // Initial idle-rendering så användaren ser tom kanban + KPI-placeholders.
    refresh(window.FlowLabEngine.getState(), window.FlowLabEngine.getMetrics());
    console.info("[FlowLab] render bound to engine");
    return true;
  }

  function cacheDom() {
    const cards = {};
    const counts = {};
    for (const step of COLUMN_STEPS) {
      cards[step] = document.getElementById(`fl-cards-${step}`);
      counts[step] = document.getElementById(`fl-count-${step}`);
      if (!cards[step] || !counts[step]) return null;
    }
    return {
      cards, counts,
      kpiCompleted: document.getElementById("fl-kpi-completed"),
      kpiLeadtime:  document.getElementById("fl-kpi-leadtime"),
      kpiThroughput:document.getElementById("fl-kpi-throughput"),
      kpiWip:       document.getElementById("fl-kpi-wip"),
      kpiMaxqTodo:  document.getElementById("fl-kpi-maxq-todo"),
      kpiMaxqAna:   document.getElementById("fl-kpi-maxq-analysis"),
      statusRow:    document.getElementById("fl-status-row"),
      statusEngine: document.getElementById("fl-status-engine"),
      statusSimtime:document.getElementById("fl-status-simtime"),
      statusTicks:  document.getElementById("fl-status-ticks"),
      statusItems:  document.getElementById("fl-status-items"),
      statusDone:   document.getElementById("fl-status-completed"),
      statusWipGate:document.getElementById("fl-status-wipgate")
    };
  }

  // --- Refresh-pipeline -----------------------------------------------------

  function refresh(state, metrics) {
    if (!dom) return;
    renderKanban(state);
    renderKpis(state, metrics);
    renderStatus(state);
    lastSimTime = state.simTime;
  }

  function renderKanban(state) {
    const itemsById = new Map(state.items.map(i => [i.id, i]));

    // 1) Ta bort kort vars items inte finns längre (efter reset).
    for (const [id, el] of cardEls) {
      if (!itemsById.has(id)) {
        el.remove();
        cardEls.delete(id);
      }
    }

    // 2) Skapa eller flytta kort. Items sorteras i kolumnen efter spawnedAt
    //    så ordning är stabil och pedagogisk (äldst överst).
    for (const item of state.items) {
      let el = cardEls.get(item.id);
      const targetColumn = dom.cards[item.currentStep];
      if (!targetColumn) continue;

      if (!el) {
        el = document.createElement("div");
        el.className = "fl-card";
        el.dataset.id = item.id;
        el.innerHTML =
          `<span class="fl-card-id">${item.id}</span>` +
          `<span class="fl-card-status"></span>`;
        cardEls.set(item.id, el);
        targetColumn.appendChild(el);
        el.classList.add("fl-card-enter");
        requestAnimationFrame(() => el.classList.remove("fl-card-enter"));
      } else if (el.parentElement !== targetColumn) {
        targetColumn.appendChild(el);
        el.classList.add("fl-card-glide");
        requestAnimationFrame(() => el.classList.remove("fl-card-glide"));
      }

      // Update status-text + processing-klass.
      const statusEl = el.querySelector(".fl-card-status");
      if (statusEl) {
        statusEl.textContent = item.currentStep === "done"
          ? "done"
          : item.status === "processing" ? "proc" : "wait";
      }
      el.classList.toggle("fl-card-processing", item.status === "processing");
      el.classList.toggle("fl-card-done", item.currentStep === "done");
    }

    // 3) Uppdatera kolumnräknare. counts.processing.analysis/build är intern
    //    info — visa "(P/cap)" för processing-kolumnerna.
    const counts = state.counts;
    const cap = state.settings.capacity;
    dom.counts.todo.textContent = counts.todo;
    dom.counts.analysis.textContent =
      `${counts.analysis} (${counts.processing.analysis}/${cap} proc)`;
    dom.counts.build.textContent =
      `${counts.build} (${counts.processing.build}/${cap} proc)`;
    dom.counts.done.textContent = counts.done;
  }

  function renderKpis(state, metrics) {
    if (dom.kpiCompleted)  dom.kpiCompleted.textContent = metrics.completed;
    if (dom.kpiLeadtime)   dom.kpiLeadtime.textContent =
      metrics.completed > 0 ? (metrics.avgLeadTimeMs / 1000).toFixed(1) : "—";
    if (dom.kpiThroughput) dom.kpiThroughput.textContent =
      state.simTime > 0 ? metrics.throughputPerMin.toFixed(1) : "—";
    if (dom.kpiWip)        dom.kpiWip.textContent = metrics.wipNow;
    if (dom.kpiMaxqTodo)   dom.kpiMaxqTodo.textContent = metrics.maxQueueByStep.todo;
    if (dom.kpiMaxqAna)    dom.kpiMaxqAna.textContent = metrics.maxQueueByStep.analysis;
  }

  function renderStatus(state) {
    if (!dom.statusRow) return;
    dom.statusRow.classList.toggle("fl-status-running", state.running);
    if (dom.statusEngine)  dom.statusEngine.textContent = state.running ? "running" : "idle";
    if (dom.statusSimtime) {
      const cur = (state.simTime / 1000).toFixed(1);
      const tot = state.durationMs ? (state.durationMs / 1000).toFixed(0) : "—";
      dom.statusSimtime.textContent = `${cur}s / ${tot}s`;
    }
    if (dom.statusTicks)   dom.statusTicks.textContent = state.ticks;
    if (dom.statusItems)   dom.statusItems.textContent = state.items.length;
    if (dom.statusDone)    dom.statusDone.textContent = state.completed;
    if (dom.statusWipGate) {
      dom.statusWipGate.textContent = state.arrivalsPaused ? "CLOSED" : "open";
      dom.statusWipGate.classList.toggle("fl-wipgate-closed", state.arrivalsPaused);
    }
  }

  // --- Exponera --------------------------------------------------------------

  window.FlowLabRender = { init, refresh };
})();
