// --- Throughput chart + run comparison --------------------------------------
// SVG sparkline that overlays the current parallel run on top of the previous
// run as a "ghost" trace, plus the run-comparison block beneath.

function updateChart() {
  const sim = parallelSim;
  const svg = document.getElementById("chart");
  const empty = document.getElementById("chart-empty");
  const runsLabel = document.getElementById("chart-runs");
  const data = sim ? sim.series : [];
  const ghost = comparePreviousRun ? comparePreviousRun.series : null;

  const haveCurrent = data.length >= 2;
  const haveGhost = ghost && ghost.length >= 2;
  if (!haveCurrent && !haveGhost) {
    svg.style.display = "none";
    empty.style.display = "block";
    runsLabel.classList.add("hidden");
    return;
  }
  empty.style.display = "none";
  svg.style.display = "block";
  if (haveGhost) runsLabel.classList.remove("hidden");
  else runsLabel.classList.add("hidden");

  const W = 600, H = 160, PAD_TOP = 8, PAD_BOTTOM = 4;
  let tMax = 1, yMax = 1;
  for (const arr of [data, ghost]) {
    if (!arr || arr.length === 0) continue;
    const last = arr[arr.length - 1];
    if (last.t > tMax) tMax = last.t;
    for (const d of arr) {
      if (d.active > yMax) yMax = d.active;
      if (d.queued > yMax) yMax = d.queued;
      if (d.completed > yMax) yMax = d.completed;
      if (d.incidents > yMax) yMax = d.incidents;
    }
  }

  const xOf = t => (t / tMax) * W;
  const yOf = v => H - PAD_BOTTOM - ((v / yMax) * (H - PAD_TOP - PAD_BOTTOM));
  const pathFrom = (arr, key) => arr.map((d, i) =>
    `${i === 0 ? "M" : "L"}${xOf(d.t).toFixed(1)},${yOf(d[key]).toFixed(1)}`
  ).join(" ");

  const gridY = [0.25, 0.5, 0.75].map(p => {
    const y = (PAD_TOP + (1 - p) * (H - PAD_TOP - PAD_BOTTOM)).toFixed(1);
    return `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#eaeef5" stroke-width="0.5"/>`;
  }).join("");

  const bpUsed = (sim && sim.backpressureUsed) || backpressureEnabled ||
                 (comparePreviousRun && comparePreviousRun.backpressure);
  let thresholdLine = "";
  if (bpUsed && BP_QUEUE_THRESHOLD <= yMax) {
    const ty = yOf(BP_QUEUE_THRESHOLD).toFixed(1);
    thresholdLine = `
      <line x1="0" y1="${ty}" x2="${W}" y2="${ty}" stroke="#f5b400" stroke-width="0.8" stroke-dasharray="4,3"/>
      <text x="6" y="${(parseFloat(ty) - 4).toFixed(1)}" font-size="10" fill="#8a6500" font-family="ui-monospace,Menlo,monospace">backpressure threshold (${BP_QUEUE_THRESHOLD})</text>
    `;
  }

  let ghostPaths = "";
  if (haveGhost) {
    ghostPaths = `
      <g opacity="0.35" stroke-dasharray="3,2">
        <path d="${pathFrom(ghost, "completed")}" stroke="#2da66a" stroke-width="1.4" fill="none"/>
        <path d="${pathFrom(ghost, "active")}" stroke="#4a6cf7" stroke-width="1.4" fill="none"/>
        <path d="${pathFrom(ghost, "queued")}" stroke="#f5b400" stroke-width="1.6" fill="none"/>
        <path d="${pathFrom(ghost, "incidents")}" stroke="#c33" stroke-width="1.4" fill="none"/>
      </g>
    `;
  }

  let currentPaths = "";
  if (haveCurrent) {
    currentPaths = `
      <path d="${pathFrom(data, "completed")}" stroke="#2da66a" stroke-width="1.8" fill="none"/>
      <path d="${pathFrom(data, "active")}" stroke="#4a6cf7" stroke-width="1.8" fill="none"/>
      <path d="${pathFrom(data, "queued")}" stroke="#f5b400" stroke-width="2" fill="none"/>
      <path d="${pathFrom(data, "incidents")}" stroke="#c33" stroke-width="1.8" fill="none"/>
    `;
  }

  svg.innerHTML = `
    ${gridY}
    ${thresholdLine}
    <line x1="0" y1="${H - PAD_BOTTOM}" x2="${W}" y2="${H - PAD_BOTTOM}" stroke="#cdd3df" stroke-width="0.5"/>
    ${ghostPaths}
    ${currentPaths}
    <text x="${W - 6}" y="${PAD_TOP + 10}" text-anchor="end" font-size="10" fill="#8a93a6" font-family="ui-monospace,Menlo,monospace">y-max ${yMax}</text>
    <text x="${W - 6}" y="${H - 8}" text-anchor="end" font-size="10" fill="#8a93a6" font-family="ui-monospace,Menlo,monospace">${fmtMs(tMax)}</text>
  `;

  if (haveCurrent) {
    const last = data[data.length - 1];
    document.getElementById("leg-active-val").textContent = last.active;
    document.getElementById("leg-queued-val").textContent = last.queued;
    document.getElementById("leg-completed-val").textContent = last.completed;
    document.getElementById("leg-incidents-val").textContent = last.incidents;
  }
}

function summarizeRun(r) {
  if (!r) return "—";
  const tags = [];
  tags.push(`${r.batchSize} orders`);
  tags.push(`${r.workers}w`);
  if (r.automation) tags.push("automated");
  if (r.backpressure) tags.push("backpressure");
  if (r.variability) tags.push(`±${r.variability}% var`);
  return tags.join(" · ");
}

function setCmpCell(prefix, prev, cur, fmt, lowerIsBetter) {
  document.getElementById(prefix + "-prev").textContent = prev != null ? fmt(prev) : "—";
  document.getElementById(prefix + "-cur").textContent = cur != null ? fmt(cur) : "—";
  const deltaEl = document.getElementById(prefix + "-delta");
  if (prev == null || cur == null) {
    deltaEl.textContent = "";
    deltaEl.className = "cmp-delta";
    return;
  }
  const delta = cur - prev;
  if (Math.abs(delta) < 1e-9) {
    deltaEl.textContent = "= ingen ändring";
    deltaEl.className = "cmp-delta";
    return;
  }
  const better = lowerIsBetter ? delta < 0 : delta > 0;
  const arrow = delta > 0 ? "↑" : "↓";
  const pct = prev !== 0 ? Math.abs((delta / prev) * 100) : 0;
  deltaEl.textContent = `${arrow} ${fmt(Math.abs(delta))} (${pct.toFixed(0)}%)`;
  deltaEl.className = "cmp-delta " + (better ? "better" : "worse");
}

function updateRunCompare() {
  const blockEl = document.getElementById("run-compare");
  const prev = comparePreviousRun;
  const sim = parallelSim;

  if (!prev) {
    blockEl.classList.add("hidden");
    return;
  }
  blockEl.classList.remove("hidden");

  let curSummary, curLead = null, curIncidents = null, curMaxQueue = null, curTput = null;
  if (sim) {
    curSummary = `${sim.batchSize} orders · ${workersPerSystem.ri}w` +
      (automationEnabled ? " · automated" : "") +
      ((sim.backpressureUsed || backpressureEnabled) ? " · backpressure" : "") +
      (sim.variabilityUsed ? ` · ±${sim.variabilityUsed}% var` : "");
    const leads = sim.completedOrders.map(o => o.completedAt - o.createdAt);
    if (leads.length > 0) curLead = leads.reduce((a,b)=>a+b, 0) / leads.length;
    curIncidents = sim.incidents;
    curMaxQueue = sim.maxQueue;
    if (sim.simTime > 0) curTput = sim.completedOrders.length / (sim.simTime / 1000);
  } else {
    curSummary = "—";
  }

  document.getElementById("cmp-prev-summary").textContent = summarizeRun(prev);
  document.getElementById("cmp-cur-summary").textContent = curSummary;

  setCmpCell("cmp-lead", prev.avgLead, curLead, fmtMs, true);
  setCmpCell("cmp-incidents", prev.incidents, curIncidents, v => v.toFixed(0), true);
  setCmpCell("cmp-maxqueue", prev.maxQueue, curMaxQueue, v => v.toFixed(0), true);
  setCmpCell("cmp-tput", prev.throughput, curTput, v => v.toFixed(2) + "/s", false);
}
