// --- Enterprise Delivery Lab: DOM-rendering ----------------------------------
// Lyssnar på EdLabEngine.subscribe och uppdaterar:
//   - delivery-steglistan (statusbadge per steg + learning note via <details>)
//   - eventloggen (append-only, autoscroll)
//   - statusraden (körstatus + förfluten simtid i dagar)
//   - operational impact-panelen (fylls när körningen är klar)
//
// Steglistan byggs EN gång från EdLabDomain.STAGES (statisk struktur) och
// uppdateras sedan bara med status-klasser — samma keyed-element-strategi som
// FlowLabs kanban-kort, fast enklare eftersom stegen aldrig ändras.

(function EdLabRenderModule() {
  "use strict";

  const STATE_LABELS = {
    pending: "Väntar",
    active: "Pågår",
    queued: "I kö",
    rework: "Omtag",
    done: "Klar"
  };

  let dom = null;
  let stageEls = new Map();     // stageId → {row, badge, days}
  let renderedEvents = 0;       // append-only-räknare för eventloggen
  let unsubscribe = null;

  function init() {
    if (!window.EdLabEngine || !window.EdLabDomain) {
      console.error("[EdLab] render init: EdLabEngine/EdLabDomain saknas.");
      return false;
    }
    dom = cacheDom();
    if (!dom) {
      console.error("[EdLab] render init: nödvändiga DOM-noder saknas.");
      return false;
    }
    buildStageList();
    if (typeof unsubscribe === "function") unsubscribe();
    unsubscribe = window.EdLabEngine.subscribe(refresh);
    refresh(window.EdLabEngine.getState());
    console.info("[EdLab] render bound to engine");
    return true;
  }

  function cacheDom() {
    const el = id => document.getElementById(id);
    const refs = {
      stageList: el("edl-stage-list"),
      log: el("edl-log"),
      statusPill: el("edl-status-pill"),
      statusDays: el("edl-status-days"),
      impactGrid: el("edl-impact-grid"),
      impactPlaceholder: el("edl-impact-placeholder")
    };
    return Object.values(refs).every(Boolean) ? refs : null;
  }

  // --- Steglista (byggs en gång) ---------------------------------------------

  function buildStageList() {
    dom.stageList.innerHTML = "";
    stageEls = new Map();

    for (const stage of window.EdLabDomain.STAGES) {
      const row = document.createElement("li");
      row.className = "edl-stage";
      row.dataset.stage = stage.id;
      row.innerHTML =
        `<div class="edl-stage-head">` +
          `<span class="edl-stage-name">${stage.name}` +
            `<span class="edl-stage-actor">${stage.actor}</span></span>` +
          `<span class="edl-stage-badge">Väntar</span>` +
        `</div>` +
        `<details class="edl-stage-note">` +
          `<summary>Om steget</summary>` +
          `<p><strong>Vad:</strong> ${stage.note.what}</p>` +
          `<p><strong>Varför det spelar roll:</strong> ${stage.note.why}</p>` +
        `</details>`;
      dom.stageList.appendChild(row);
      stageEls.set(stage.id, { row, badge: row.querySelector(".edl-stage-badge") });
    }
  }

  // --- Refresh-pipeline --------------------------------------------------------

  function refresh(state) {
    if (!dom) return;
    renderStages(state);
    renderEvents(state);
    renderStatus(state);
    renderImpact(state);
  }

  function renderStages(state) {
    for (const [stageId, els] of stageEls) {
      const stageState = state.stageStates[stageId] || "pending";
      els.row.className = `edl-stage edl-stage-${stageState}`;
      els.badge.textContent = STATE_LABELS[stageState] || stageState;
    }
  }

  function renderEvents(state) {
    // Reset (färre events än renderat) → töm och börja om.
    if (state.events.length < renderedEvents) {
      dom.log.innerHTML = "";
      renderedEvents = 0;
    }
    for (let i = renderedEvents; i < state.events.length; i++) {
      const ev = state.events[i];
      const el = document.createElement("div");
      el.className = `edl-event edl-event-${ev.tone}`;
      el.innerHTML =
        `<div class="edl-event-head">` +
          `<span class="edl-event-day">Dag ${Math.round(ev.tMs * window.EdLabDomain.DAYS_PER_MS)}</span>` +
          `<span class="edl-event-title">${ev.title}</span>` +
        `</div>` +
        `<div class="edl-event-detail">${ev.detail}</div>`;
      dom.log.appendChild(el);
    }
    if (state.events.length > renderedEvents) {
      dom.log.scrollTop = dom.log.scrollHeight;
    }
    renderedEvents = state.events.length;
  }

  function renderStatus(state) {
    const labels = { idle: "Redo", running: "Pågår", done: "Levererat" };
    dom.statusPill.textContent = labels[state.status] || state.status;
    dom.statusPill.className = `status-pill edl-status-${state.status}` +
      (state.status === "running" ? " running" : "") +
      (state.status === "done" ? " active" : "");
    dom.statusDays.textContent = state.status === "idle"
      ? "—"
      : `Dag ${Math.round(state.simDays)} · baseline ${Math.round(state.baselineDays)} dagar`;
  }

  function renderImpact(state) {
    if (!state.impact) {
      dom.impactGrid.innerHTML = "";
      dom.impactGrid.hidden = true;
      dom.impactPlaceholder.hidden = false;
      return;
    }
    dom.impactPlaceholder.hidden = true;
    dom.impactGrid.hidden = false;
    dom.impactGrid.innerHTML = "";
    for (const item of state.impact) {
      const card = document.createElement("div");
      card.className = `edl-impact-card edl-impact-${item.tone}`;
      card.innerHTML =
        `<div class="edl-impact-label">${item.label}</div>` +
        `<div class="edl-impact-value">${item.value}</div>` +
        `<div class="edl-impact-detail">${item.detail}</div>`;
      dom.impactGrid.appendChild(card);
    }
  }

  // --- Exponera ----------------------------------------------------------------

  window.EdLabRender = { init };
})();
