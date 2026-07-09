// --- Enterprise Delivery System 2.0 — slice 1 -------------------------------
// "Tre initiativ, en flaskhals, en kö." Första riktiga systemdynamiken i EDL:
// flera initiativ samtidigt genom ett flöde där EN resurs (Architecture) är
// begränsad, så en kö bildas och köns väntan driver ledtiden.
//
// Kompakt tick-baserad flermängds-motor — konceptuell kopia av telecom-
// simulatorns parallell-läge i litet format (se docs/enterprise-delivery-
// system-2.md, "Återanvändning"). INGEN generell engine, ingen batchmotor,
// inget delat med telecom/FlowLab. Isolerat scope, self-init.

(function EdLabSystemModule() {
  "use strict";

  // Sju systemsteg. Architecture (index 0) är den begränsade resursen i denna
  // slice; övriga är snabba/obegränsade. durationDays = arbetstid i steget.
  const STAGES = [
    { id: "arch",     short: "Architecture",   durationDays: 12 },
    { id: "security", short: "Security",       durationDays: 8 },
    { id: "planning", short: "Planning",       durationDays: 6 },
    { id: "impl",     short: "Implementation", durationDays: 14 },
    { id: "testing",  short: "Testing",        durationDays: 8 },
    { id: "deploy",   short: "Deployment",     durationDays: 5 },
    { id: "ops",      short: "Operations",     durationDays: 4 }
  ];
  const ARCH = 0;        // index på flaskhalsen
  const TICK_MS = 40;    // realtid per tick; 1 tick = 1 simdag

  let archCapacity = 1;  // reglaget: 1 eller 2
  let inits = [];        // arbetsobjekten
  let simTime = 0;       // simdagar
  let maxArchQueue = 0;
  let tickId = null;
  let prevRun = null;    // { capacity, avgLeadTime } för jämförelse
  let series = [];       // tidsserie: [{ t, queue, completed, wip }] per tick
  let prevSeries = null; // föregående körnings serie (ghost-kurva)
  let dom = null;

  function init() {
    dom = {
      board: document.getElementById("edl-sys-board"),
      metrics: document.getElementById("edl-sys-metrics"),
      runBtn: document.getElementById("edl-sys-run"),
      capBtn: document.getElementById("edl-sys-cap"),
      resetBtn: document.getElementById("edl-sys-reset"),
      graph: document.getElementById("edl-sys-graph"),
      graphEmpty: document.getElementById("edl-sys-graph-empty"),
      graphNote: document.getElementById("edl-sys-graph-note")
    };
    if (!dom.board) return; // sektionen finns inte → gör inget
    if (dom.runBtn) dom.runBtn.addEventListener("click", run);
    if (dom.capBtn) dom.capBtn.addEventListener("click", toggleCapacity);
    if (dom.resetBtn) dom.resetBtn.addEventListener("click", reset);
    updateCapLabel();
    renderBoard();
    console.info("[EdLabSystem] ready");
  }

  // --- Kontroller -------------------------------------------------------------

  function toggleCapacity() {
    if (tickId) return; // ändra inte kapacitet mitt i en körning
    archCapacity = archCapacity === 1 ? 2 : 1;
    updateCapLabel();
  }

  function updateCapLabel() {
    if (dom.capBtn) dom.capBtn.textContent = `Architecture capacity: ${archCapacity}`;
  }

  function reset() {
    stopTick();
    inits = [];
    simTime = 0;
    maxArchQueue = 0;
    series = [];
    prevSeries = null;
    renderBoard();
    renderGraph();
    if (window.EdLabCards) window.EdLabCards.clear();
    if (dom.metrics) { dom.metrics.hidden = true; dom.metrics.innerHTML = ""; }
  }

  function run() {
    stopTick();
    simTime = 0;
    maxArchQueue = 0;
    inits = ["A", "B", "C"].map((n, i) => ({
      id: i, chip: n, name: `Initiative ${n}`,
      stageIndex: 0, phase: "queue", remaining: 0, leadTime: null
    }));
    admitAll();          // släpp in de första enligt kapacitet
    trackArchQueue();
    series = [sampleState()];
    if (dom.metrics) { dom.metrics.hidden = true; dom.metrics.innerHTML = ""; }
    if (window.EdLabCards) window.EdLabCards.clear();
    renderBoard();
    tickId = setInterval(tick, TICK_MS);
  }

  function stopTick() {
    if (tickId) { clearInterval(tickId); tickId = null; }
  }

  // --- Simulering -------------------------------------------------------------

  function capacityOf(stageIndex) {
    return stageIndex === ARCH ? archCapacity : Infinity;
  }

  function tick() {
    simTime += 1;

    // 1. Aktiva initiativ arbetar; de som blir klara avancerar ett steg.
    for (const it of inits) {
      if (it.phase !== "active") continue;
      it.remaining -= 1;
      if (it.remaining <= 0) {
        it.stageIndex += 1;
        if (it.stageIndex >= STAGES.length) {
          it.phase = "done";
          it.leadTime = simTime;
        } else {
          it.phase = "queue";
        }
      }
    }

    admitAll();
    trackArchQueue();
    series.push(sampleState());
    renderBoard();

    if (inits.length && inits.every((it) => it.phase === "done")) {
      stopTick();
      finalize();
    }
  }

  // Ögonblicksbild av systemet för tidsserien. Liten datamodell (fyra tal).
  function sampleState() {
    let queue = 0, completed = 0, wip = 0;
    for (const it of inits) {
      if (it.phase === "done") completed += 1;
      else wip += 1; // WIP = initiativ i systemet (ej klara)
      if (it.stageIndex === ARCH && it.phase === "queue") queue += 1;
    }
    return { t: simTime, queue, completed, wip };
  }

  // Släpp in köande initiativ i steg med ledig kapacitet, FIFO (spawn-ordning).
  function admitAll() {
    for (let s = 0; s < STAGES.length; s++) {
      let active = inits.filter((it) => it.phase === "active" && it.stageIndex === s).length;
      const cap = capacityOf(s);
      const queued = inits.filter((it) => it.phase === "queue" && it.stageIndex === s);
      for (const it of queued) {
        if (active >= cap) break;
        it.phase = "active";
        it.remaining = STAGES[s].durationDays;
        active += 1;
      }
    }
  }

  function trackArchQueue() {
    const q = inits.filter((it) => it.stageIndex === ARCH && it.phase === "queue").length;
    if (q > maxArchQueue) maxArchQueue = q;
  }

  function finalize() {
    const done = inits.filter((it) => it.leadTime != null);
    const avg = done.length
      ? Math.round(done.reduce((sum, it) => sum + it.leadTime, 0) / done.length)
      : 0;
    renderMetrics(done.length, avg);
    renderGraph();
    showLearningCards(avg);       // läser prevRun (föregående körning) → visa insikt
    prevRun = { capacity: archCapacity, avgLeadTime: avg };
    prevSeries = series.slice();  // spara för ghost-jämförelse nästa körning
  }

  // Signalera vilka lärkort som är relevanta för det som just hände. Modulen
  // ed-learn-cards.js hämtar innehållet — vi känner bara till id:n här.
  function showLearningCards(avg) {
    const C = window.EdLabCards;
    if (!C) return;
    C.clear();
    if (maxArchQueue > 0) {
      C.showPattern("bottleneck");
      C.showConcept("architecture_queue");
    }
    C.showConcept("wip");
    // Jämförelse mot förra körningen: förklara resultatet ("varför?").
    if (prevRun && prevRun.capacity !== archCapacity &&
        archCapacity > prevRun.capacity && avg < prevRun.avgLeadTime) {
      C.showInsight("bottleneck_relieved");
    }
  }

  // --- Rendering --------------------------------------------------------------

  function chips(list) {
    if (!list.length) return `<span class="edl-sys-empty">—</span>`;
    return list.map((it) =>
      `<span class="edl-sys-chip edl-sys-chip-${it.phase}" title="${it.name}">${it.chip}</span>`
    ).join("");
  }

  function renderBoard() {
    if (!dom.board) return;
    const queuedArch = inits.filter((it) => it.stageIndex === ARCH && it.phase === "queue");
    const doneInits = inits.filter((it) => it.phase === "done");

    const stations = STAGES.map((st, i) => {
      const here = inits.filter((it) => it.stageIndex === i && it.phase === "active");
      const isArch = i === ARCH;
      return (
        `<div class="edl-sys-station${isArch ? " edl-sys-bottleneck" : ""}">` +
          `<div class="edl-sys-st-label">${st.short}` +
            (isArch ? ` <span class="edl-sys-cap">cap ${archCapacity}</span>` : "") +
          `</div>` +
          `<div class="edl-sys-chiprow">${chips(here)}</div>` +
        `</div>`
      );
    }).join(`<span class="edl-sys-arrow" aria-hidden="true">›</span>`);

    dom.board.innerHTML =
      `<div class="edl-sys-queue">` +
        `<div class="edl-sys-st-label">Kö → Architecture</div>` +
        `<div class="edl-sys-chiprow">${chips(queuedArch)}</div>` +
      `</div>` +
      `<span class="edl-sys-arrow" aria-hidden="true">»</span>` +
      stations +
      `<span class="edl-sys-arrow" aria-hidden="true">»</span>` +
      `<div class="edl-sys-done-box">` +
        `<div class="edl-sys-st-label">Klara</div>` +
        `<div class="edl-sys-chiprow">${chips(doneInits)}</div>` +
      `</div>`;
  }

  function renderMetrics(completed, avg) {
    if (!dom.metrics) return;
    const prev = prevRun && prevRun.capacity !== archCapacity
      ? `<div class="edl-sys-metric edl-sys-metric-prev">` +
          `<span class="edl-sys-mk">Föregående körning (cap ${prevRun.capacity}):</span> ` +
          `snitt lead time ${prevRun.avgLeadTime} dagar</div>`
      : "";
    dom.metrics.innerHTML =
      `<div class="edl-sys-metric"><span class="edl-sys-mk">Completed initiatives:</span> ${completed}</div>` +
      `<div class="edl-sys-metric"><span class="edl-sys-mk">Average lead time:</span> ${avg} dagar</div>` +
      `<div class="edl-sys-metric"><span class="edl-sys-mk">Max Architecture queue length:</span> ${maxArchQueue}</div>` +
      `<div class="edl-sys-metric"><span class="edl-sys-mk">Bottleneck:</span> Architecture</div>` +
      prev;
    dom.metrics.hidden = false;
  }

  // Tidsserie-graf: systemtryck över tid. Mönstret (viewBox-skalning, path-bygge,
  // ghost-kurva mot förra körningen) är lånat konceptuellt från OSS/BSS-grafen
  // (src/ui/charts.js) — ingen delad kod, ingen chart-lib.
  const GRAPH = { W: 560, H: 150, padTop: 12, padBottom: 20, padX: 6 };
  const SERIES = [
    { key: "wip",       stroke: "#4a6cf7", width: 1.6 },
    { key: "completed", stroke: "#2da66a", width: 1.8 },
    { key: "queue",     stroke: "#b94a00", width: 2.0 }  // ritas sist = överst
  ];

  function renderGraph() {
    const svg = dom && dom.graph;
    if (!svg) return;
    const cur = series;
    const ghost = prevSeries;
    const haveCur = cur.length >= 2;

    if (!haveCur) {
      svg.hidden = true;
      svg.innerHTML = "";
      if (dom.graphEmpty) dom.graphEmpty.hidden = false;
      if (dom.graphNote) dom.graphNote.hidden = true;
      return;
    }
    if (dom.graphEmpty) dom.graphEmpty.hidden = true;
    svg.hidden = false;

    const { W, H, padTop, padBottom, padX } = GRAPH;
    let tMax = 1, yMax = 1;
    for (const arr of [cur, ghost]) {
      if (!arr || !arr.length) continue;
      if (arr[arr.length - 1].t > tMax) tMax = arr[arr.length - 1].t;
      for (const d of arr) {
        yMax = Math.max(yMax, d.queue, d.completed, d.wip);
      }
    }
    const xOf = (t) => padX + (t / tMax) * (W - 2 * padX);
    const yOf = (v) => H - padBottom - (v / yMax) * (H - padTop - padBottom);
    const path = (arr, key) => arr
      .map((d, i) => `${i ? "L" : "M"}${xOf(d.t).toFixed(1)},${yOf(d[key]).toFixed(1)}`)
      .join(" ");

    const grid = [0.25, 0.5, 0.75].map((p) => {
      const y = (padTop + (1 - p) * (H - padTop - padBottom)).toFixed(1);
      return `<line x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}" stroke="#eaeef5" stroke-width="0.5"/>`;
    }).join("");

    let ghostPaths = "";
    const haveGhost = ghost && ghost.length >= 2;
    if (haveGhost) {
      ghostPaths = `<g opacity="0.3" stroke-dasharray="3,2">` +
        `<path d="${path(ghost, "queue")}" stroke="#b94a00" stroke-width="1.4" fill="none"/>` +
        `<path d="${path(ghost, "completed")}" stroke="#2da66a" stroke-width="1.4" fill="none"/>` +
      `</g>`;
    }
    const curPaths = SERIES.map((s) =>
      `<path d="${path(cur, s.key)}" stroke="${s.stroke}" stroke-width="${s.width}" fill="none"/>`
    ).join("");

    const label = (x, y, anchor, text) =>
      `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="9" fill="#8a93a6" ` +
      `font-family="ui-monospace,Menlo,monospace">${text}</text>`;

    svg.innerHTML =
      grid +
      `<line x1="${padX}" y1="${H - padBottom}" x2="${W - padX}" y2="${H - padBottom}" stroke="#cdd3df" stroke-width="0.6"/>` +
      ghostPaths + curPaths +
      label(W - padX, padTop + 2, "end", `max ${yMax}`) +
      label(padX, H - 6, "start", "0 dagar") +
      label(W - padX, H - 6, "end", `${tMax} dagar`);

    if (dom.graphNote) dom.graphNote.hidden = !haveGhost;
  }

  // Scripts ligger sist i body → DOM finns redan.
  init();
  window.EdLabSystem = { run, reset };
})();
