// --- DOM rendering -----------------------------------------------------------
// Owns all DOM references used by the simulator and every helper that mutates
// the page (status pill, system map, event log, timeline, dashboard, queue
// panel, order list). Engine.js calls these by their global names.

// --- DOM references ---------------------------------------------------------
const rowBss = document.getElementById("row-bss");
const rowOss = document.getElementById("row-oss");

const logEl = document.getElementById("log");
const pillEl = document.getElementById("status-pill");
const orderIdEl = document.getElementById("order-id");
const timelineEl = document.getElementById("timeline");
const insightEl = document.getElementById("insight");
const improvementEl = document.getElementById("improvement");
const automationToggle = document.getElementById("automation-toggle");
const backpressureToggle = document.getElementById("backpressure-toggle");

// --- System map -------------------------------------------------------------
function renderSystems() {
  rowBss.innerHTML = "";
  rowOss.innerHTML = "";
  for (const [id, s] of Object.entries(SYSTEMS)) {
    const el = document.createElement("div");
    el.className = `system ${s.layer}`;
    el.id = `sys-${id}`;
    el.innerHTML = `<div class="name">${s.name}</div><div class="role">${s.role}</div>`;
    el.addEventListener("click", () => showLearningSystem(id));
    (s.layer === "bss" ? rowBss : rowOss).appendChild(el);
  }
}

// --- Single-flow status, log, timeline --------------------------------------
function setStatus(text, kind) {
  pillEl.textContent = text;
  pillEl.className = "status-pill" + (kind ? " " + kind : "");
}

function clearActive() {
  document.querySelectorAll(".system").forEach(el => {
    el.classList.remove("active", "failed");
  });
}

function highlightSystem(id, fail) {
  clearActive();
  const el = document.getElementById(`sys-${id}`);
  if (el) el.classList.add(fail ? "failed" : "active");
}

function logEvent(ev) {
  const div = document.createElement("div");
  div.className = "event" + (ev.fail ? " fail" : "");
  div.innerHTML = `
    <div class="head">
      <span class="tech">${ev.tech}</span>
      <span class="timing">${fmtMs(ev._start)} → ${fmtMs(ev._end)} (${fmtMs(ev.duration)})</span>
    </div>
    <div class="domain">${ev.domain}</div>
    <div class="teach">${ev.teach}</div>
  `;
  div.addEventListener("click", () => showLearningSystem(ev.system));
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function addTimelineRow(item, scaleMax) {
  const row = document.createElement("div");
  row.className = "tl-row" + (item.kind === "handoff" ? " handoff" : "");
  const widthPct = (item.duration / scaleMax) * 100;

  let label, barClass;
  if (item.kind === "event") {
    const sys = SYSTEMS[item.system];
    label = `<div class="tl-label">${item.tech}<span class="sub">${sys.name}</span></div>`;
    barClass = "tl-bar " + sys.layer + (item.fail ? " fail" : "");
  } else {
    const fromName = SYSTEMS[item.from].name;
    const toName = SYSTEMS[item.to].name;
    label = `<div class="tl-label">Handoff<span class="sub">${fromName} → ${toName}${item.crossLayer ? " · cross-layer" : ""}</span></div>`;
    barClass = "tl-bar handoff";
  }

  row.innerHTML = `
    ${label}
    <div class="tl-duration">${fmtMs(item.duration)}</div>
    <div class="tl-track">
      <div class="${barClass}" style="--bar-width:${widthPct}%; transition-duration:${item.duration}ms;">
        <span class="pct">${widthPct.toFixed(0)}%</span>
      </div>
    </div>`;
  timelineEl.appendChild(row);

  // Trigger fill animation in next frame.
  const bar = row.querySelector(".tl-bar");
  requestAnimationFrame(() => {
    bar.classList.add("filling");
    bar.style.width = widthPct + "%";
  });
  return row;
}

function setButtonsRunning(running) {
  ["btn-happy", "btn-batch-5", "btn-batch-20", "btn-fail-resource", "btn-fail-prov"].forEach(id => {
    document.getElementById(id).disabled = running;
  });
}

function clearTimeline() {
  timelineEl.innerHTML = `<div class="timeline-empty">Kör en simulering för att se var tid spenderas. Streckmönstrade staplar = handoffs mellan domäner.</div>`;
}

function clearMetrics() {
  document.getElementById("m-total").textContent = "—";
  document.getElementById("m-handoff").textContent = "—";
  document.getElementById("m-handoff-sub").textContent = "väntetid mellan system";
  document.getElementById("m-bottleneck").textContent = "—";
  document.getElementById("m-bottleneck-sub").textContent = "längsta steg";
  document.getElementById("m-handoff-count").textContent = "—";
  document.getElementById("m-fail").textContent = "—";
  document.querySelectorAll(".metric").forEach(m => m.classList.remove("warn"));
  insightEl.classList.add("hidden");
}

// --- Parallel-mode rendering ------------------------------------------------
function logParallelEvent(order, ev) {
  const sim = parallelSim;
  const div = document.createElement("div");
  div.className = "event" + (ev.fail ? " fail" : "");
  div.innerHTML = `
    <div class="head">
      <span class="tech">${ev.tech}</span>
      <span class="timing">${order.id}${order.isRetry ? " (retry)" : ""} · ${fmtMs(sim.simTime)}</span>
    </div>
    <div class="domain">${SYSTEMS[ev.system].name}</div>
  `;
  div.addEventListener("click", () => showLearningSystem(ev.system));
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
  while (logEl.children.length > 60) logEl.removeChild(logEl.firstChild);
}

function updateParallelUI() {
  const sim = parallelSim;
  if (!sim) return;
  const active = sim.orders.filter(o => o.status === "in_progress" || o.status === "in_transit").length;
  const queued = sim.orders.filter(o => o.status === "queued").length;
  const completed = sim.completedOrders.length;
  const failed = sim.orders.filter(o => o.status === "failed").length;

  document.getElementById("d-active").textContent = active;
  document.getElementById("d-queued").textContent = queued;
  document.getElementById("d-completed").textContent = completed;
  document.getElementById("d-incidents").textContent = sim.incidents;

  const incCard = document.getElementById("d-incidents-card");
  incCard.classList.toggle("hot", sim.incidents >= 3);
  incCard.classList.toggle("warm", sim.incidents > 0 && sim.incidents < 3);

  const leads = sim.completedOrders.map(o => o.completedAt - o.createdAt);
  const avgLead = leads.length > 0 ? leads.reduce((a,b)=>a+b, 0) / leads.length : null;
  document.getElementById("d-lead").textContent = avgLead != null ? fmtMs(avgLead) : "—";

  const tput = sim.simTime > 0 ? (completed / (sim.simTime / 1000)) : 0;
  document.getElementById("d-throughput").textContent = tput > 0 ? `${tput.toFixed(2)}/s` : "—";

  // Heatmap + busiest
  let busy = null;
  for (const sysId of Object.keys(SYSTEMS)) {
    let count, capacity;
    if (SINGLE_PROC.has(sysId)) {
      const q = sim.queues[sysId];
      count = q.queue.length + q.activeList.length;
      capacity = workersPerSystem[sysId] || 1;
    } else {
      count = sim.orders.filter(o => o.status === "in_progress" && o.steps[o.currentIdx].system === sysId).length;
      capacity = 1; // multi-proc: skala mot 1 för pedagogisk enkelhet
    }
    const el = document.getElementById(`sys-${sysId}`);
    if (el) {
      el.classList.remove("load-idle", "load-low", "load-medium", "load-high");
      el.classList.add(loadClass(count, capacity));
    }
    if (!busy || count > busy.count) busy = { sysId, count };
  }
  document.getElementById("d-busiest").textContent =
    busy && busy.count > 0 ? `${SYSTEMS[busy.sysId].name} (${busy.count})` : "—";

  const bpEl = document.getElementById("d-bp-status");
  let bpText;
  if (backpressureEnabled) {
    bpText = ` · Backpressure ${sim.queues.ri.queue.length >= BP_QUEUE_THRESHOLD ? "ACTIVE" : "armed"} (${sim.deferredEvents} pausad${sim.deferredEvents === 1 ? "" : "e"} spawns)`;
  } else {
    bpText = sim.deferredEvents > 0 ? ` · Backpressure pausade ${sim.deferredEvents} spawn${sim.deferredEvents === 1 ? "" : "s"}` : "";
  }
  if (sim.variabilityUsed) bpText += ` · Variation ±${sim.variabilityUsed}%`;
  bpEl.textContent = bpText;

  updateQueuePanel();
  updateChart();
  updateRunCompare();
  updateOrderList();
}

function updateQueuePanel() {
  const sim = parallelSim;
  const panel = document.getElementById("queue-panel");
  panel.innerHTML = "";
  for (const sysId of SINGLE_PROC) {
    const q = sim.queues[sysId];
    const sys = SYSTEMS[sysId];
    const workers = workersPerSystem[sysId] || 1;
    const row = document.createElement("div");
    row.className = "queue-row";
    let activeChips = q.activeList.map(o => {
      const step = o.steps[o.currentIdx];
      const prog = Math.min(100, ((sim.simTime - o.activeStart) / step.duration) * 100);
      return `<span class="qchip active">${o.id} · ${prog.toFixed(0)}%</span>`;
    }).join(" ");
    const free = workers - q.activeList.length;
    if (free > 0) {
      const idleChips = Array(free).fill('<span class="qchip idle">·idle·</span>').join(" ");
      activeChips = activeChips ? activeChips + " " + idleChips : idleChips;
    }
    let chips = "";
    let avgWait = 0, longestWait = 0;
    if (q.queue.length > 0) {
      const waits = q.queue.map(o => sim.simTime - o.waitStart);
      avgWait = waits.reduce((a,b)=>a+b, 0) / waits.length;
      longestWait = Math.max(...waits);
      chips = q.queue.map(o => `<span class="qchip queued">${o.id}</span>`).join(" ");
    }
    const workerLabel = workers > 1 ? ` (${workers} workers)` : "";
    row.innerHTML = `
      <div class="qsystem">${sys.name}${workerLabel}</div>
      <div class="qline"><span style="color:#5b6478;">Aktiv (${q.activeList.length}/${workers}):</span> ${activeChips}</div>
      <div class="qline"><span style="color:#5b6478;">Kö (${q.queue.length}):</span> ${chips || '<span class="qchip idle">tom</span>'}</div>
      ${q.queue.length > 0 ? `<div class="qstats">Avg wait: ${fmtMs(avgWait)} · Longest: ${fmtMs(longestWait)}</div>` : ""}
    `;
    panel.appendChild(row);
  }
}

function updateOrderList() {
  const sim = parallelSim;
  const listEl = document.getElementById("order-list");
  listEl.innerHTML = "";
  const orders = [...sim.orders].sort((a, b) => a.createdAt - b.createdAt);
  for (const o of orders) {
    const row = document.createElement("div");
    row.className = "order-row";
    let stage = "—", pct = 0, time = "";
    if (o.status === "completed") {
      stage = "✓ Klar";
      pct = 100;
      time = fmtMs(o.completedAt - o.createdAt);
      row.classList.add("completed");
    } else if (o.status === "failed") {
      stage = `✗ ${o.failedStep}`;
      pct = 100;
      time = fmtMs(sim.simTime - o.createdAt);
      row.classList.add("failed");
    } else if (o.status === "in_transit") {
      const next = o.steps[o.currentIdx];
      stage = `→ ${SYSTEMS[next.system].name} (transit)`;
      pct = 20;
      time = fmtMs(sim.simTime - o.createdAt);
      row.classList.add("in-transit");
    } else if (o.status === "queued") {
      const sysId = o.steps[o.currentIdx].system;
      const wait = sim.simTime - o.waitStart;
      stage = `Kö: ${SYSTEMS[sysId].name} · väntat ${fmtMs(wait)}`;
      pct = 5;
      time = fmtMs(sim.simTime - o.createdAt);
      row.classList.add("in-queue");
    } else if (o.status === "in_progress") {
      const step = o.steps[o.currentIdx];
      const elapsed = sim.simTime - o.activeStart;
      pct = Math.min(100, (elapsed / step.duration) * 100);
      stage = `${step.tech} @ ${SYSTEMS[step.system].name}`;
      time = fmtMs(sim.simTime - o.createdAt);
    }
    row.innerHTML = `
      <div class="oid">${o.id}${o.isRetry ? '<span class="retry-badge">·R</span>' : ""}</div>
      <div class="ostage">${stage}</div>
      <div class="obar"><div style="width:${pct}%"></div></div>
      <div class="otime">${time}</div>
    `;
    listEl.appendChild(row);
  }
}
