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
  let graphNodes = new Map();   // stageId → nod-element i delivery-grafen
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
    buildLearningJourney();
    buildGraph();
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

  // --- Learning journey (byggs en gång, statiskt Learn-lager) -----------------
  // Guidad genomgång av de tio stegen. Återanvänder STAGES note.what/why och
  // lägger på svensk rubrik + risk/blocker-koppling från LEARNING_JOURNEY.
  // Icke-kritisk: saknas containern hoppar vi tyst över den.

  function buildLearningJourney() {
    const host = document.getElementById("edl-journey-cards");
    if (!host) return;
    const journey = window.EdLabDomain.LEARNING_JOURNEY || {};

    const cards = window.EdLabDomain.STAGES.map((stage, i) => {
      const j = journey[stage.id] || {};
      const title = j.sv || stage.name;
      const risk = j.risk
        ? `<p class="edl-journey-risk"><strong>Risk / blocker:</strong> ${j.risk}</p>`
        : "";
      return (
        `<li class="edl-journey-card">` +
          `<span class="edl-journey-num" aria-hidden="true">${i + 1}</span>` +
          `<div class="edl-journey-text">` +
            `<div class="edl-journey-title">${title}` +
              `<span class="edl-journey-actor">${stage.actor}</span></div>` +
            `<p class="edl-journey-what">${stage.note.what}</p>` +
            `<p class="edl-journey-why"><strong>Varför spelar det roll?</strong> ${stage.note.why}</p>` +
            risk +
          `</div>` +
        `</li>`
      );
    }).join("");

    host.innerHTML = `<ol class="edl-journey-list">${cards}</ol>`;
  }

  // --- Delivery-graf (visuell flödesvy, uppdateras under körning) --------------
  // En horisontell rad av de tio stegen. Nodfärgen speglar live stageStates;
  // badges (alignment/delay/omtag) härleds ur blockerId/alignmentOn så de är
  // persistenta genom och efter körningen. Byggs en gång; renderGraph togglar
  // bara klasser/badges — samma effektiva mönster som renderStages.

  function buildGraph() {
    const host = document.getElementById("edl-flowgraph");
    if (!host) return;
    const journey = window.EdLabDomain.LEARNING_JOURNEY || {};
    graphNodes = new Map();

    const parts = [];
    window.EdLabDomain.STAGES.forEach((stage, i) => {
      const j = journey[stage.id] || {};
      const label = j.short || stage.name;
      if (i > 0) parts.push(`<span class="edl-fg-conn" aria-hidden="true">›</span>`);
      parts.push(
        `<div class="edl-fg-node edl-fg-pending" data-stage="${stage.id}">` +
          `<span class="edl-fg-num">${i + 1}</span>` +
          `<span class="edl-fg-label">${label}</span>` +
          `<span class="edl-fg-badges">` +
            `<span class="edl-fg-badge edl-fg-badge-align" hidden title="Tidig alignment">⚑</span>` +
            `<span class="edl-fg-badge edl-fg-badge-delay" hidden title="Fördröjd granskning">⏳</span>` +
            `<span class="edl-fg-badge edl-fg-badge-rework" hidden title="Omtag">↩</span>` +
          `</span>` +
        `</div>`
      );
    });
    host.innerHTML = parts.join("");
    for (const stage of window.EdLabDomain.STAGES) {
      graphNodes.set(stage.id, host.querySelector(`[data-stage="${stage.id}"]`));
    }
  }

  // stageState → grafklass. queued (kö/väntan) visas som "blocked".
  const GRAPH_STATUS = {
    pending: "pending", active: "active", queued: "blocked",
    rework: "rework", done: "done"
  };

  function renderGraph(state) {
    if (graphNodes.size === 0) return;
    const D = window.EdLabDomain;
    const align = !!state.alignmentOn;
    const secDelay = state.blockerId === "sec_delay";
    const archRework = state.blockerId === "arch_rework";
    // Omtagets omfattning krymper när alignment är på — det är hela poängen.
    const reworkStages = archRework
      ? ((align && D.EARLY_ALIGNMENT.reworkOverride.arch_rework) ||
         D.BLOCKERS.arch_rework.reworkStages)
      : [];

    for (const [stageId, node] of graphNodes) {
      if (!node) continue;
      const st = state.stageStates[stageId] || "pending";
      node.className = `edl-fg-node edl-fg-${GRAPH_STATUS[st] || "pending"}`;
      toggleBadge(node, ".edl-fg-badge-align", align && (stageId === "arch" || stageId === "seccomp"));
      toggleBadge(node, ".edl-fg-badge-delay", secDelay && stageId === "seccomp");
      toggleBadge(node, ".edl-fg-badge-rework", reworkStages.indexOf(stageId) !== -1);
    }

    renderGraphCaption(state, { align, secDelay, archRework, reworkCount: reworkStages.length });
  }

  function toggleBadge(node, selector, on) {
    const el = node.querySelector(selector);
    if (el) el.hidden = !on;
  }

  function renderGraphCaption(state, m) {
    const el = document.getElementById("edl-flowgraph-caption");
    if (!el) return;
    let text = "";
    if (m.archRework) {
      text = `Architecture rework: ${m.reworkCount} steg görs om` +
        (m.align ? " — tidig alignment krympte omtaget." : ".");
    } else if (m.secDelay) {
      text = "Security & Compliance Review står i granskningskö" +
        (m.align ? " — tidig alignment kortar väntan." : ".");
    } else if (m.align) {
      text = "Tidig alignment aktiv på Arkitektur och Säkerhet.";
    }
    el.textContent = text;
    el.hidden = !text;
  }

  // --- Refresh-pipeline --------------------------------------------------------

  function refresh(state) {
    if (!dom) return;
    renderStages(state);
    renderGraph(state);
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
        `<div class="edl-impact-detail">${item.detail}</div>` +
        (item.delta
          ? `<div class="edl-impact-delta edl-delta-${item.delta.dir}">${item.delta.text}</div>`
          : "");
      dom.impactGrid.appendChild(card);
    }
  }

  // --- Exponera ----------------------------------------------------------------

  window.EdLabRender = { init };
})();
