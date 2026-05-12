// --- FlowLab discrete-event engine ------------------------------------------
// Tick-baserad simulator för flöde i ett 3-stegs Kanban-system:
//   todo → analysis → build → done
//
// Konceptuellt en port av telecom-simulatorns parallelTick — men inte importerad
// från den. FlowLab håller sig isolerad i eget scope så vi kan observera vilka
// engine-mönster som faktiskt vill abstraheras (VISION.md fas 3, inte nu).
//
// Trådmodell:
//   tick var TICK_REAL_MS millisekund → samma antal SIM_MS_PER_TICK simulerad tid.
//   varje tick: spawn? → step transitions → sample? → callback subscribers.
//
// Tidsenheter: allt simT i millisekunder. Default-durations är i "sekunder
// simulerad arbete" × 1000 ms.
//
// API exponeras på window.FlowLabEngine. UI laddas inte i commit 2 — kör
// FlowLabEngine.start(30) från devtools-consolen för att verifiera flödet.

(function FlowLabEngineModule() {
  "use strict";

  // --- Konstanter -----------------------------------------------------------

  const TICK_REAL_MS = 100;          // realtid mellan ticks
  const SIM_MS_PER_TICK = 200;       // 2× speed (matchar telecom-engine-konventionen)
  const SAMPLE_EVERY_MS = 500;       // sample-snapshots för senare grafer
  const STEPS = ["todo", "analysis", "build", "done"];
  const PROCESSING_STEPS = ["analysis", "build"]; // steg med capacity-limit

  // Baseline-durations per steg (ms simtid). todo är instant — den fungerar som
  // en backlog-kö, inget arbete sker där. done är slutdestination.
  const BASE_DURATION_MS = {
    analysis: 3000,
    build: 5000
  };

  // --- State ----------------------------------------------------------------

  const defaultSettings = {
    arrivalRatePerMin: 2,       // 1–5 i UI senare
    capacity: 1,                // workers per processing-steg
    wipLimit: 5,                // 3/5/8/Infinity i UI senare
    variationPct: 0,            // 0/25/50 i UI senare
    bottleneck: null            // null / "analysis" / "build"
  };

  let settings = { ...defaultSettings };
  let state = createEmptyState();
  let intervalId = null;
  let subscribers = [];
  let verbose = false;            // sätt true via FlowLabEngine.setVerbose(true) eller UI-toggle
  let itemCounter = 0;
  let lastSampleAt = 0;
  let lastSpawnDecisionAt = -Infinity;

  function createEmptyState() {
    return {
      simTime: 0,
      durationMs: 0,             // total körningslängd, sätts vid start
      ticks: 0,                  // räknare för att verifiera att loopen kör
      running: false,
      items: [],                 // alla items oavsett steg
      samples: [],               // [{simTime, queues:{step:n}, processing:{step:n}, completed:n}]
      completed: 0,
      maxQueueByStep: { todo: 0, analysis: 0, build: 0 },
      arrivalsPaused: false
    };
  }

  // --- Public API -----------------------------------------------------------

  function start(durationSec = 60) {
    if (state.running) {
      console.warn("[FlowLab] start ignored — already running");
      return;
    }
    state = createEmptyState();
    state.running = true;
    state.durationMs = durationSec * 1000;
    itemCounter = 0;
    lastSampleAt = 0;
    lastSpawnDecisionAt = -Infinity;

    console.info("[FlowLab] start", {
      durationSec,
      ...settings
    });

    intervalId = setInterval(tick, TICK_REAL_MS);
  }

  function stop(reason = "manual") {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (state.running) {
      state.running = false;
      const metrics = getMetrics();
      console.info("[FlowLab] stop", { reason, simTime: state.simTime, ...metrics });
      // Notify så UI byter från "running" → "idle" och visar slutläget.
      notify();
    }
  }

  function reset() {
    stop("reset");
    state = createEmptyState();
    itemCounter = 0;
    console.info("[FlowLab] reset");
    // Notify så render rensar kanban/KPI/status — annars står gamla värden kvar.
    notify();
  }

  function updateSettings(partial) {
    settings = { ...settings, ...partial };
    if (verbose) console.info("[FlowLab] settings", settings);
  }

  function getState() {
    return {
      simTime: state.simTime,
      durationMs: state.durationMs,
      ticks: state.ticks,
      running: state.running,
      settings: { ...settings },
      counts: countByStep(),
      completed: state.completed,
      arrivalsPaused: state.arrivalsPaused,
      // Lätt projektion av items för render — inga interna fält som history.
      items: state.items.map(i => ({
        id: i.id,
        currentStep: i.currentStep,
        status: i.status,
        spawnedAt: i.spawnedAt
      }))
    };
  }

  function getMetrics() {
    const completedItems = state.items.filter(i => i.completedAt != null);
    const avgLeadTime = completedItems.length
      ? completedItems.reduce((s, i) => s + (i.completedAt - i.spawnedAt), 0) / completedItems.length
      : 0;
    const elapsedMin = state.simTime / 60000;
    const throughputPerMin = elapsedMin > 0 ? state.completed / elapsedMin : 0;
    const wipNow = state.items.filter(i =>
      i.currentStep !== "done" && i.currentStep !== "todo"
    ).length;
    return {
      avgLeadTimeMs: Math.round(avgLeadTime),
      completed: state.completed,
      throughputPerMin: Math.round(throughputPerMin * 10) / 10,
      wipNow,
      maxQueueByStep: { ...state.maxQueueByStep }
    };
  }

  function subscribe(fn) {
    subscribers.push(fn);
    return () => { subscribers = subscribers.filter(f => f !== fn); };
  }

  function setVerbose(v) { verbose = !!v; }

  // --- Tick loop ------------------------------------------------------------

  function tick() {
    state.simTime += SIM_MS_PER_TICK;
    state.ticks += 1;

    maybeSpawn();
    progressItems();
    promoteWaitingItems();
    maybeSample();

    if (state.simTime >= state.durationMs) {
      stop("duration-reached");
    }
  }

  // --- Spawn ----------------------------------------------------------------
  // Deterministisk arrival: en arrival var (60000 / rate) ms simtid. Inget
  // poisson-brus ännu — variation kommer in i processing-tiden, inte arrivals.
  // Det räcker pedagogiskt för MVP; verklig poisson kan komma i v2.

  function maybeSpawn() {
    const rate = settings.arrivalRatePerMin;
    if (rate <= 0) return;
    const intervalMs = 60000 / rate;
    const nextSpawnDue = lastSpawnDecisionAt === -Infinity ? 0 : lastSpawnDecisionAt + intervalMs;
    if (state.simTime >= nextSpawnDue) {
      spawnItem();
      lastSpawnDecisionAt = nextSpawnDue;
    }
  }

  function spawnItem() {
    itemCounter += 1;
    const id = "ITEM-" + String(itemCounter).padStart(4, "0");
    const item = {
      id,
      spawnedAt: state.simTime,
      currentStep: "todo",
      status: "waiting",      // "waiting" i kö | "processing" tilldelad slot
      stepEnteredAt: state.simTime,
      stepEndAt: null,
      completedAt: null,
      history: [{ step: "todo", enteredAt: state.simTime }]
    };
    state.items.push(item);
    updateMaxQueue();
    if (verbose) console.info(`[FlowLab] spawn ${id} simT=${state.simTime}ms (todo backlog)`);
  }

  // --- Progress: släpp items vars processing-tid är ute --------------------

  function progressItems() {
    for (const item of state.items) {
      if (item.status === "processing" && state.simTime >= item.stepEndAt) {
        completeStepFor(item);
      }
    }
  }

  function completeStepFor(item) {
    const fromStep = item.currentStep;
    const nextStep = STEPS[STEPS.indexOf(fromStep) + 1];

    // Stäng av historik-fönstret för current step.
    const hist = item.history[item.history.length - 1];
    hist.exitedAt = state.simTime;

    item.currentStep = nextStep;
    item.stepEnteredAt = state.simTime;
    item.stepEndAt = null;
    item.status = "waiting";
    item.history.push({ step: nextStep, enteredAt: state.simTime });

    if (verbose) {
      console.info(`[FlowLab] ${item.id} ${fromStep} → ${nextStep} simT=${state.simTime}ms`);
    }

    if (nextStep === "done") {
      item.completedAt = state.simTime;
      state.completed += 1;
      if (verbose) {
        const leadTime = item.completedAt - item.spawnedAt;
        console.info(`[FlowLab] ${item.id} DONE simT=${state.simTime}ms leadTime=${leadTime}ms`);
      }
    }
    updateMaxQueue();
  }

  // --- Promote: ta items från kön till processing-slots --------------------
  // Reglerna:
  //   - todo → analysis: tillåtet bara om current WIP < wipLimit
  //   - analysis → build → done: alltid tillåtet (capacity styrs av cap-räknaren)
  // "WIP" definieras här som items i analysis + build (icke-todo, icke-done).

  function promoteWaitingItems() {
    // Steg 1: promote items inom processing-steg som har lediga slots.
    for (const step of PROCESSING_STEPS) {
      const cap = settings.capacity;
      const processing = state.items.filter(i => i.currentStep === step && i.status === "processing");
      const waiting = state.items.filter(i => i.currentStep === step && i.status === "waiting");
      let freeSlots = cap - processing.length;
      for (const item of waiting) {
        if (freeSlots <= 0) break;
        beginProcessing(item);
        freeSlots -= 1;
      }
    }

    // Steg 2: pull från todo till analysis om WIP-budget tillåter.
    const wipNow = state.items.filter(i =>
      i.currentStep !== "done" && i.currentStep !== "todo"
    ).length;
    const wipBudget = settings.wipLimit === Infinity || settings.wipLimit == null
      ? Infinity
      : Math.max(0, settings.wipLimit - wipNow);

    const wasPaused = state.arrivalsPaused;
    state.arrivalsPaused = wipBudget === 0;
    if (verbose && wasPaused !== state.arrivalsPaused) {
      console.info(`[FlowLab] WIP gate ${state.arrivalsPaused ? "CLOSED" : "OPEN"} simT=${state.simTime}ms (wip=${wipNow}/${settings.wipLimit})`);
    }

    if (wipBudget > 0) {
      const todoQueue = state.items.filter(i => i.currentStep === "todo" && i.status === "waiting");
      let pullsLeft = wipBudget;
      for (const item of todoQueue) {
        if (pullsLeft <= 0) break;
        completeStepFor(item); // promote todo → analysis (instant, ingen processing-tid i todo)
        pullsLeft -= 1;
      }
    }
  }

  function beginProcessing(item) {
    item.status = "processing";
    item.stepEndAt = state.simTime + durationFor(item.currentStep);
    if (verbose) {
      console.info(`[FlowLab] ${item.id} start processing in ${item.currentStep} simT=${state.simTime}ms (endsAt=${item.stepEndAt}ms)`);
    }
  }

  function durationFor(step) {
    let base = BASE_DURATION_MS[step] || 0;
    if (settings.bottleneck === step) base *= 2;
    const variation = settings.variationPct / 100;
    if (variation > 0) {
      const jitter = (Math.random() * 2 - 1) * variation;
      base = Math.max(50, base * (1 + jitter));
    }
    return Math.round(base);
  }

  // --- Sampling -------------------------------------------------------------

  function maybeSample() {
    if (state.simTime - lastSampleAt < SAMPLE_EVERY_MS) return;
    lastSampleAt = state.simTime;
    const counts = countByStep();
    state.samples.push({
      simTime: state.simTime,
      counts,
      completed: state.completed
    });
    notify();
  }

  function notify() {
    for (const fn of subscribers) {
      try { fn(getState(), getMetrics()); }
      catch (e) { console.error("[FlowLab] subscriber error", e); }
    }
  }

  function countByStep() {
    const out = { todo: 0, analysis: 0, build: 0, done: 0, processing: { analysis: 0, build: 0 } };
    for (const i of state.items) {
      out[i.currentStep] += 1;
      if (i.status === "processing" && (i.currentStep === "analysis" || i.currentStep === "build")) {
        out.processing[i.currentStep] += 1;
      }
    }
    return out;
  }

  function updateMaxQueue() {
    const counts = countByStep();
    for (const step of ["todo", "analysis", "build"]) {
      if (counts[step] > state.maxQueueByStep[step]) {
        state.maxQueueByStep[step] = counts[step];
      }
    }
  }

  // --- Exponera API ---------------------------------------------------------

  window.FlowLabEngine = {
    start, stop, reset, updateSettings,
    getState, getMetrics, subscribe, setVerbose
  };
})();
