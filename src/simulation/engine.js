// --- Simulation engine -------------------------------------------------------
// Owns runtime state for both the single-order flow and the parallel batch sim.
// Render/chart helpers live in src/ui/ and read these globals at runtime —
// plain <script> tags share a single global namespace.

// --- Shared state ------------------------------------------------------------
let timer = null;
let orderCounter = 0;
let automationEnabled = false;
const runHistory = { happy: {}, resource: {}, prov: {} };

const workersPerSystem = { ri: 1, prov: 1 };

const BP_QUEUE_THRESHOLD = 3;
let backpressureEnabled = false;

let variabilityPct = 0;

let provAutomationEnabled = false;
const PROV_FAIL_MULTIPLIER = 0.5; // automation halverar fail-prob — eliminerar inte, för automation tar inte bort inventory mismatch eller nätfel.

// --- Parallel simulation constants ------------------------------------------
const TICK_REAL_MS = 50;
const SIM_PER_TICK = 100;          // 2x speed
const SPAWN_INTERVAL_SIM = 1500;   // sim ms between order arrivals
const SINGLE_PROC = new Set(["ri", "prov"]);
const FAIL_BASE = 0.05;
const FAIL_QUEUE_1 = 0.15;
const FAIL_QUEUE_3 = 0.30;
const RETRY_PROB = 0.5;
const SAMPLE_INTERVAL_SIM = 200;

let parallelSim = null;
let lastParallelRun = null;       // updated at finalize, used as next "previous"
let comparePreviousRun = null;    // frozen at startParallel for the active run

// --- Single-order flow -------------------------------------------------------

function runFlow(events, label, scenarioId) {
  if (timer) return;
  resetUI();
  orderCounter += 1;
  const orderId = `ORD-${String(orderCounter).padStart(4, "0")}`;
  orderIdEl.textContent = orderId;
  setStatus("Running: " + label + (automationEnabled ? " (automated)" : ""), "running");
  setButtonsRunning(true);

  const queue = buildQueue(applyVariability(applyAutomation(events), variabilityPct));
  const scaleMax = Math.max(...queue.map(q => q.duration));
  let cumulative = 0;
  let i = 0;

  // Replace empty timeline placeholder.
  timelineEl.innerHTML = "";

  const tick = () => {
    if (i >= queue.length) {
      timer = null;
      setButtonsRunning(false);
      const last = queue[queue.length - 1];
      if (last.kind === "event" && last.fail) {
        setStatus(`Failed: ${last.tech}`, "failed");
      } else {
        setStatus("Active", "active");
        clearActive();
      }
      finalize(queue, scenarioId, label);
      return;
    }
    const item = queue[i++];
    item._start = cumulative;
    item._end = cumulative + item.duration;
    cumulative = item._end;

    if (item.kind === "event") {
      highlightSystem(item.system, item.fail);
      logEvent(item);
    }
    addTimelineRow(item, scaleMax);

    timer = setTimeout(tick, item.duration);
  };
  tick();
}

function resetUI() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (parallelSim && parallelSim.intervalId) {
    clearInterval(parallelSim.intervalId);
    parallelSim.intervalId = null;
  }
  document.body.classList.remove("mode-parallel");
  logEl.innerHTML = "";
  clearActive();
  document.querySelectorAll(".system").forEach(el =>
    el.classList.remove("bottleneck", "load-idle", "load-low", "load-medium", "load-high"));
  setStatus("Idle");
  orderIdEl.textContent = "—";
  setButtonsRunning(false);
  clearTimeline();
  clearMetrics();
  hideImprovement();
}

function fullReset() {
  if (parallelSim && parallelSim.intervalId) {
    clearInterval(parallelSim.intervalId);
  }
  parallelSim = null;
  lastParallelRun = null;
  comparePreviousRun = null;
  document.body.classList.remove("mode-parallel");
  resetUI();
  Object.keys(runHistory).forEach(k => { runHistory[k] = {}; });
  resetParallelUI();
}

// --- Parallel simulation -----------------------------------------------------

function resetParallelUI() {
  document.getElementById("d-active").textContent = "0";
  document.getElementById("d-queued").textContent = "0";
  document.getElementById("d-completed").textContent = "0";
  document.getElementById("d-lead").textContent = "—";
  document.getElementById("d-throughput").textContent = "—";
  document.getElementById("d-incidents").textContent = "0";
  document.getElementById("d-incidents-card").classList.remove("warm", "hot");
  document.getElementById("d-busiest").textContent = "—";
  document.getElementById("queue-panel").innerHTML = "";
  document.getElementById("order-list").innerHTML = "";
  document.querySelectorAll(".system").forEach(el => {
    el.classList.remove("load-idle", "load-low", "load-medium", "load-high");
  });
  const svg = document.getElementById("chart");
  if (svg) { svg.innerHTML = ""; svg.style.display = "none"; }
  const chartEmpty = document.getElementById("chart-empty");
  if (chartEmpty) chartEmpty.style.display = "block";
  ["leg-active-val", "leg-queued-val", "leg-completed-val", "leg-incidents-val"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "0";
  });
  const runsLabel = document.getElementById("chart-runs");
  if (runsLabel) runsLabel.classList.add("hidden");
  const cmpBlock = document.getElementById("run-compare");
  if (cmpBlock) cmpBlock.classList.add("hidden");
}

function startParallel(batchSize) {
  if (timer || (parallelSim && parallelSim.intervalId)) return;
  // Snapshot för ghost-jämförelse INNAN vi rensar något — fullReset() skulle annars
  // nolla lastParallelRun och vi tappar previous run.
  comparePreviousRun = lastParallelRun;
  // Rensa UI/state men behåll lastParallelRun + comparePreviousRun.
  if (parallelSim && parallelSim.intervalId) clearInterval(parallelSim.intervalId);
  parallelSim = null;
  document.body.classList.remove("mode-parallel");
  resetUI();
  resetParallelUI();
  document.body.classList.add("mode-parallel");

  parallelSim = {
    batchSize,
    simTime: 0,
    spawnedCount: 0,
    lastSpawnAt: -SPAWN_INTERVAL_SIM,
    spawnedAll: false,
    orders: [],
    completedOrders: [],
    incidents: 0,
    queues: {},
    queueWaitBySys: {},
    queueCountBySys: {},
    series: [],
    lastSampleAt: -1,
    maxQueue: 0,
    deferredEvents: 0,
    backpressureUsed: backpressureEnabled,
    variabilityUsed: variabilityPct,
    provAutomationUsed: provAutomationEnabled,
    intervalId: null
  };
  for (const sysId of Object.keys(SYSTEMS)) {
    parallelSim.queues[sysId] = { activeList: [], queue: [] };
    parallelSim.queueWaitBySys[sysId] = 0;
    parallelSim.queueCountBySys[sysId] = 0;
  }
  setStatus(`Running batch: ${batchSize} orders` + (automationEnabled ? " (automated)" : ""), "running");
  setButtonsRunning(true);

  parallelSim.intervalId = setInterval(parallelTick, TICK_REAL_MS);
}

function parallelTick() {
  const sim = parallelSim;
  if (!sim) return;
  sim.simTime += SIM_PER_TICK;

  if (!sim.spawnedAll && sim.simTime - sim.lastSpawnAt >= SPAWN_INTERVAL_SIM) {
    const riQueueLen = sim.queues.ri.queue.length;
    if (backpressureEnabled && riQueueLen >= BP_QUEUE_THRESHOLD) {
      // Backpressure active — defer this spawn slot, try again next interval.
      sim.deferredEvents += 1;
      sim.lastSpawnAt = sim.simTime;
    } else {
      spawnOrder();
      sim.lastSpawnAt = sim.simTime;
      if (sim.spawnedCount >= sim.batchSize) sim.spawnedAll = true;
    }
  }

  for (const order of sim.orders) advanceOrder(order);
  for (const sysId of SINGLE_PROC) processSystemQueue(sysId);

  sampleSeries();
  updateParallelUI();

  if (sim.spawnedAll && sim.orders.every(o => o.status === "completed" || o.status === "failed")) {
    finalizeParallel();
  }
}

function spawnOrder(asRetryOf) {
  const sim = parallelSim;
  let id;
  if (asRetryOf) {
    id = asRetryOf.id + "-R";
  } else {
    orderCounter += 1;
    id = `ORD-${String(orderCounter).padStart(4, "0")}`;
    sim.spawnedCount += 1;
  }
  const automated = applyVariability(applyAutomation(happyPathFor(currentProductId)), variabilityPct);
  const order = {
    id,
    createdAt: sim.simTime,
    completedAt: null,
    steps: automated.map(s => ({ ...s, _started: null, _end: null })),
    currentIdx: 0,
    status: "in_transit",
    activeStart: null,
    waitStart: null,
    transitEnd: sim.simTime,
    failedStep: null,
    isRetry: !!asRetryOf
  };
  sim.orders.push(order);
  enterStep(order, 0);
}

function enterStep(order, idx) {
  const sim = parallelSim;
  order.currentIdx = idx;
  if (idx >= order.steps.length) {
    order.status = "completed";
    order.completedAt = sim.simTime;
    sim.completedOrders.push(order);
    return;
  }
  const step = order.steps[idx];
  if (idx > 0) {
    const prev = order.steps[idx - 1];
    if (prev.system !== step.system) {
      const transit = SYSTEMS[prev.system].layer === SYSTEMS[step.system].layer ? 600 : 1200;
      order.status = "in_transit";
      order.transitEnd = sim.simTime + transit;
      return;
    }
  }
  enqueue(order, step.system);
}

function enqueue(order, sysId) {
  const sim = parallelSim;
  const q = sim.queues[sysId];
  const single = SINGLE_PROC.has(sysId);
  const workers = workersPerSystem[sysId] || 1;
  if (single && q.activeList.length >= workers) {
    order.status = "queued";
    order.waitStart = sim.simTime;
    q.queue.push(order);
  } else {
    activate(order, sysId);
  }
}

function activate(order, sysId) {
  const sim = parallelSim;
  const single = SINGLE_PROC.has(sysId);
  const step = order.steps[order.currentIdx];
  // If the order was waiting in a queue, record the wait time.
  if (order.waitStart != null) {
    const waited = sim.simTime - order.waitStart;
    sim.queueWaitBySys[sysId] += waited;
    sim.queueCountBySys[sysId] += 1;
    order.waitStart = null;
  }
  if (single) sim.queues[sysId].activeList.push(order);
  order.status = "in_progress";
  order.activeStart = sim.simTime;
  step._started = sim.simTime;
  step._end = sim.simTime + step.duration;
}

function processSystemQueue(sysId) {
  const sim = parallelSim;
  const q = sim.queues[sysId];
  const workers = workersPerSystem[sysId] || 1;
  while (q.activeList.length < workers && q.queue.length > 0) {
    const next = q.queue.shift();
    activate(next, sysId);
  }
}

function failProb(sysId, queueLen) {
  if (sysId !== "prov") return 0;
  let base;
  if (queueLen >= 3) base = FAIL_QUEUE_3;
  else if (queueLen >= 1) base = FAIL_QUEUE_1;
  else base = FAIL_BASE;
  // Provisioning-automation minskar variation, men inventory mismatch och
  // nätfel finns kvar — vi multiplicerar bara, eliminerar inte.
  if (provAutomationEnabled) base *= PROV_FAIL_MULTIPLIER;
  return base;
}

function advanceOrder(order) {
  const sim = parallelSim;
  if (order.status === "completed" || order.status === "failed" || order.status === "queued") return;
  if (order.status === "in_transit") {
    if (sim.simTime >= order.transitEnd) {
      enqueue(order, order.steps[order.currentIdx].system);
    }
    return;
  }
  if (order.status === "in_progress") {
    const step = order.steps[order.currentIdx];
    if (sim.simTime < step._end) return;
    const sysId = step.system;
    const q = sim.queues[sysId];
    const queueLen = q.queue.length;
    const fp = failProb(sysId, queueLen);
    if (Math.random() < fp) {
      order.status = "failed";
      order.failedStep = "ActivationRejected";
      if (SINGLE_PROC.has(sysId)) q.activeList = q.activeList.filter(o => o !== order);
      sim.incidents += 1;
      logParallelEvent(order, { tech: "ActivationRejected", system: sysId, fail: true });
      if (!order.isRetry && Math.random() < RETRY_PROB) {
        spawnOrder(order);
      }
      return;
    }
    logParallelEvent(order, { tech: step.tech, system: sysId, fail: false });
    if (SINGLE_PROC.has(sysId)) q.activeList = q.activeList.filter(o => o !== order);
    enterStep(order, order.currentIdx + 1);
  }
}

function sampleSeries() {
  const sim = parallelSim;
  if (sim.simTime - sim.lastSampleAt < SAMPLE_INTERVAL_SIM) return;
  sim.lastSampleAt = sim.simTime;
  const active = sim.orders.filter(o => o.status === "in_progress" || o.status === "in_transit").length;
  const queued = sim.orders.filter(o => o.status === "queued").length;
  if (queued > sim.maxQueue) sim.maxQueue = queued;
  sim.series.push({
    t: sim.simTime,
    active,
    queued,
    completed: sim.completedOrders.length,
    incidents: sim.incidents
  });
}

function finalizeParallel() {
  const sim = parallelSim;
  clearInterval(sim.intervalId);
  sim.intervalId = null;
  setButtonsRunning(false);

  const completed = sim.completedOrders.length;
  const failed = sim.orders.filter(o => o.status === "failed").length;
  const leads = sim.completedOrders.map(o => o.completedAt - o.createdAt);
  const avgLead = leads.length > 0 ? leads.reduce((a,b)=>a+b, 0) / leads.length : 0;
  const maxLead = leads.length > 0 ? Math.max(...leads) : 0;
  const throughput = sim.simTime > 0 ? completed / (sim.simTime / 1000) : 0;
  // 1-order happy-path baseline beräknad från aktiv produkts steg + handoffs.
  // Används för att visa "order spent X% längre tid än baseline" i insight.
  const path = happyPathFor(currentProductId);
  let baseline = path.reduce((s, e) => s + e.duration, 0);
  for (let i = 0; i < path.length - 1; i++) {
    baseline += calcHandoff(path[i].system, path[i+1].system);
  }
  const stretchPct = avgLead > 0 ? ((avgLead - baseline) / baseline) * 100 : 0;

  // Save run for ghost-comparison on the next batch.
  lastParallelRun = {
    batchSize: sim.batchSize,
    workers: workersPerSystem.ri,
    workersProv: workersPerSystem.prov,
    automation: automationEnabled,
    backpressure: sim.backpressureUsed,
    variability: sim.variabilityUsed,
    provAutomation: sim.provAutomationUsed,
    avgLead,
    incidents: sim.incidents,
    maxQueue: sim.maxQueue,
    throughput,
    series: sim.series.slice(),
    totalSimTime: sim.simTime
  };

  setStatus(`Batch klar: ${completed} ok · ${failed} failed · ${sim.incidents} incidents`, failed > 0 ? "failed" : "active");

  // Find which single-proc system absorbed most cumulative wait time.
  let topQueueSys = null;
  for (const sysId of SINGLE_PROC) {
    const w = sim.queueWaitBySys[sysId] || 0;
    if (!topQueueSys || w > topQueueSys.wait) topQueueSys = { sysId, wait: w, count: sim.queueCountBySys[sysId] };
  }

  insightEl.classList.remove("hidden");
  let parts = [];
  const bpLabel = sim.backpressureUsed ? `, backpressure <strong>på</strong> (${sim.deferredEvents} pausade spawns)` : "";
  const varLabel = sim.variabilityUsed ? `, variation <strong>±${sim.variabilityUsed}%</strong>` : "";
  const provLabel = `, provisioning <strong>${sim.provAutomationUsed ? "automated" : "manual/semi-auto"}</strong>`;
  parts.push(`<strong>Batch klar.</strong> ${completed} klara, ${failed} failed, ${sim.incidents} incidents. Capacity: RI <strong>${workersPerSystem.ri}w</strong> · Prov <strong>${workersPerSystem.prov}w</strong>${bpLabel}${varLabel}${provLabel}.`);
  if (sim.provAutomationUsed) {
    parts.push(`<strong>Provisioning automation:</strong> activation-steget gick snabbare och misslyckades mer sällan (fail-prob × ${PROV_FAIL_MULTIPLIER}). Men automatiseringen tar inte bort inventory mismatch eller nätfel — fel kan fortfarande uppstå, och billing triggas fortfarande först efter <code>ServiceActivated</code>.`);
  }
  parts.push(`Avg lead time: ${fmtMs(avgLead)} · Längsta: ${fmtMs(maxLead)} · 1-order baseline: ${fmtMs(baseline)}.`);
  if (sim.backpressureUsed) {
    parts.push(`<strong>Backpressure-effekt:</strong> Order Management pausades ${sim.deferredEvents} gånger när RI:s kö nådde tröskeln. Lead time för enskilda ordrar minskar (de väntar mindre i RI), men totala batch-tiden kan öka eftersom inflödet saktas ner. Trade-offen är medveten — <em>orderns kötid</em> byts mot <em>real-tid till alla klara</em>. Strategin gör mest nytta när nedströms-fel (incidents) är dyrare än uppströms-fördröjning.`);
  }

  if (topQueueSys && topQueueSys.wait > 0) {
    const sysName = SYSTEMS[topQueueSys.sysId].name;
    const detail = BOTTLENECK_DETAIL[topQueueSys.sysId] || sysName;
    const riW = workersPerSystem.ri, provW = workersPerSystem.prov;
    parts.push(`Mest kötid totalt: <strong>${detail}</strong> (${fmtMs(topQueueSys.wait)} ackumulerat över ${topQueueSys.count} kötillfällen). Capacity i denna körning: RI=${riW}, Prov=${provW}.`);
    if (topQueueSys.sysId === "ri" && riW === 1) {
      parts.push(`${detail} är bottlenecken med 1 worker. Prova att höja Resource Inventory capacity till 2 eller 3 och kör om — du ser hur bottlenecken flyttar nedströms.`);
    } else if (topQueueSys.sysId === "prov" && provW === 1) {
      parts.push(`${detail} är bottlenecken med 1 activation worker. Prova att höja Provisioning capacity till 2 eller 3 — eller slå på Automated provisioning. <em>Capacity</em> påverkar parallellism, <em>automation</em> påverkar duration och felrisk.`);
    } else if (topQueueSys.sysId !== "ri" && riW > 1) {
      parts.push(`<strong>Bottlenecken har flyttat.</strong> Med ${riW} workers i Resource Inventory är ${detail} nu det steg där mest tid spenderas i kö. Det är Theory of Constraints i praktiken: när du förbättrar bottlenecken försvinner den inte — den hittar en ny plats i flödet.`);
    }
  }
  if (stretchPct > 50) {
    parts.push(`<strong>Lead time har skenat (+${stretchPct.toFixed(0)}%).</strong> Det är vad som händer när ett single-proc system närmar sig 100% utilization — kötiden börjar dominera totaltiden.`);
  }
  if (sim.incidents > 0) {
    parts.push(`Incidents är inte slumpmässiga — sannolikheten för Provisioning-fel ökade när dess kö växte. Överbelastning skapar mer arbete (varje fail kan generera en retry-order som ökar load ytterligare).`);
  }
  parts.push(`Klicka på "Queueing theory på 60 sekunder" eller "Resource efficiency vs flow efficiency" i learning-panelen till höger för att läsa mer.`);
  insightEl.innerHTML = parts.join("<br><br>");

  // Operational impact. In batch mode all fails are activation rejects (the
  // model doesn't synthesise ResourceUnavailable here, so recon stays 0).
  // SLA risk: completed orders whose lead time exceeded 1.5x baseline.
  // Support load: one call per failed order plus a small share of SLA-late
  // ones (rough — pedagogical, not a real model).
  const slaThreshold = baseline * 1.5;
  const slaAtRiskBatch = sim.completedOrders.filter(o => (o.completedAt - o.createdAt) > slaThreshold).length;
  renderImpact({
    investigations: failed,
    recon: 0,
    failedActivations: failed,
    slaAtRisk: slaAtRiskBatch,
    delayedBilling: failed,
    supportLoad: failed + Math.floor(slaAtRiskBatch / 4)
  });
}
