// --- Metrics & insights -----------------------------------------------------
// Single-order finalize, manual-vs-automated improvement panel, and a
// shared load-class helper used by parallel mode's heatmap/queue panel.

function finalize(queue, scenarioId, label) {
  const events = queue.filter(q => q.kind === "event");
  const handoffs = queue.filter(q => q.kind === "handoff");
  const total = queue.reduce((s, q) => s + q.duration, 0);
  const handoffTime = handoffs.reduce((s, q) => s + q.duration, 0);
  const failed = events.filter(e => e.fail);

  // Bottleneck = slowest non-failed event (a fail event isn't "work that took long",
  // it is the failure itself; we still surface it but separately).
  const successEvents = events.filter(e => !e.fail);
  const bottleneck = successEvents.length
    ? successEvents.reduce((a, b) => (a.duration > b.duration ? a : b))
    : null;

  document.getElementById("m-total").textContent = fmtMs(total);
  document.getElementById("m-handoff").textContent = fmtMs(handoffTime);
  document.getElementById("m-handoff-sub").textContent =
    total > 0 ? `${Math.round((handoffTime / total) * 100)}% av total lead time` : "—";
  document.getElementById("m-handoff-count").textContent = handoffs.length;
  document.getElementById("m-fail").textContent = failed.length;
  if (failed.length > 0) {
    document.querySelector("#m-fail").parentElement.classList.add("warn");
  }

  if (bottleneck) {
    const sysName = SYSTEMS[bottleneck.system].name;
    const detail = BOTTLENECK_DETAIL[bottleneck.system] || sysName;
    const pct = Math.round((bottleneck.duration / total) * 100);
    // UI-värdet är kort (sys-name) så det får plats i metric-cellen; insight
    // använder den längre, mer beskrivande aktivitetsetiketten.
    document.getElementById("m-bottleneck").textContent = sysName;
    document.getElementById("m-bottleneck-sub").textContent =
      `${fmtMs(bottleneck.duration)} · ${pct}% av total lead time`;

    // Mark the bottleneck system box.
    const sysEl = document.getElementById(`sys-${bottleneck.system}`);
    if (sysEl) sysEl.classList.add("bottleneck");

    // Mark the bottleneck timeline bar.
    const bars = timelineEl.querySelectorAll(".tl-row:not(.handoff) .tl-bar");
    const idxAmongEvents = events.indexOf(bottleneck);
    if (bars[idxAmongEvents]) bars[idxAmongEvents].classList.add("bottleneck");

    insightEl.classList.remove("hidden");
    insightEl.innerHTML =
      `<strong>${detail}</strong> är denna körnings långsammaste steg — ${pct}% av total lead time spenderades här (${fmtMs(bottleneck.duration)} av ${fmtMs(total)}). ` +
      `Handoffs stod för ytterligare ${Math.round((handoffTime/total)*100)}%. Bra fråga att fundera på: är den långsamma tiden här ` +
      `processrelaterad (manuella godkännanden, batchjobb), datarelaterad (inventory accuracy), eller integrationsrelaterad (synkrona API-kedjor)?`;
  }

  if (failed.length > 0) {
    const f = failed[0];
    const sysName = SYSTEMS[f.system].name;
    insightEl.classList.remove("hidden");
    insightEl.innerHTML +=
      `<br><br><strong>Fel:</strong> <code>${f.tech}</code> i ${sysName}. Flödet stoppades innan tjänsten aktiverades. ` +
      `Den tid som ändå spenderades (${fmtMs(total)}) är 'lost work' om ärendet sedan måste startas om manuellt — ` +
      `vilket är just därför fall-out-rates är ett centralt KPI för operatörer.`;
  }

  // Operational impact for this single order. Threshold for SLA risk: total
  // > 1.5x baseline (sum of step durations + handoffs as a rough yardstick).
  // ResourceUnavailable → inventory reconciliation; ActivationRejected → failed
  // activation. A failed order has no verified activation so billing cannot
  // trigger, and customer support typically gets at least one call per fail.
  const baselineSingle = events.reduce((s, e) => s + e.duration, 0);
  const resourceFails = failed.filter(f => /Resource/i.test(f.tech)).length;
  const activationFails = failed.filter(f => /Activ|Reject/i.test(f.tech)).length;
  const slaAtRiskSingle = (failed.length > 0 || (baselineSingle > 0 && total > baselineSingle * 1.5)) ? 1 : 0;
  renderImpact({
    investigations: failed.length,
    recon: resourceFails,
    failedActivations: activationFails,
    slaAtRisk: slaAtRiskSingle,
    delayedBilling: failed.length > 0 ? 1 : 0,
    supportLoad: failed.length > 0 ? 1 : 0
  });

  if (scenarioId) {
    const variant = automationEnabled ? "automated" : "manual";
    runHistory[scenarioId][variant] = {
      total,
      bottleneck,
      handoffTime,
      failed: failed.length,
      automation: automationEnabled,
      label
    };
    const slots = runHistory[scenarioId];
    if (slots.manual && slots.automated) {
      showImprovement(slots, label);
    }
  }
}

function hideImprovement() {
  improvementEl.classList.add("hidden");
}

function showImprovement(slots, label) {
  const m = slots.manual;
  const a = slots.automated;
  const delta = m.total - a.total;
  const pct = m.total > 0 ? (delta / m.total) * 100 : 0;

  document.getElementById("imp-scenario").textContent = label;
  document.getElementById("imp-manual").textContent = fmtMs(m.total);
  document.getElementById("imp-auto").textContent = fmtMs(a.total);

  const sign = delta >= 0 ? "−" : "+";
  const deltaEl = document.getElementById("imp-delta");
  deltaEl.textContent = `${sign}${fmtMs(Math.abs(delta))} (${sign}${Math.abs(pct).toFixed(1)}%)`;
  deltaEl.classList.toggle("regression", delta < 0);

  const moved = m.bottleneck && a.bottleneck && m.bottleneck.system !== a.bottleneck.system;
  const mDetail = m.bottleneck ? (BOTTLENECK_DETAIL[m.bottleneck.system] || SYSTEMS[m.bottleneck.system].name) : null;
  const aDetail = a.bottleneck ? (BOTTLENECK_DETAIL[a.bottleneck.system] || SYSTEMS[a.bottleneck.system].name) : null;
  let bottleneckText = "";
  if (moved) {
    bottleneckText = `Bottleneck flyttade: ${mDetail} → ${aDetail}`;
  } else if (m.bottleneck && a.bottleneck) {
    bottleneckText = `Bottleneck oförändrad: ${mDetail}`;
  }
  document.getElementById("imp-bottleneck").textContent = bottleneckText;

  let insight;
  if (delta > 0) {
    insight = `Automation kortade total lead time med ${pct.toFixed(1)} %.`;
    if (moved) {
      insight += ` Långsammaste steget flyttade från ${mDetail} till ${aDetail} — det är nästa förbättringsmål.`;
    } else if (m.bottleneck) {
      insight += ` Långsammaste steget är fortfarande ${mDetail} — automation räckte inte för att flytta begränsningen.`;
    }
  } else if (delta === 0) {
    insight = `Ingen mätbar effekt — automation påverkade inte lead time i detta scenario (möjligen för att flödet inte når reservation-steget).`;
  } else {
    insight = `Lead time ökade med ${Math.abs(pct).toFixed(1)} % — något i automation gjorde flödet långsammare i denna körning.`;
  }
  document.getElementById("imp-insight").textContent = insight;

  improvementEl.classList.remove("hidden");
}

function loadClass(count, capacity) {
  if (count === 0) return "load-idle";
  if (count <= capacity) return "load-low";
  if (count <= capacity + 2) return "load-medium";
  return "load-high";
}

// --- Operational impact -----------------------------------------------------
// Translates raw metrics into operational consequences typical for a telecom
// fulfillment org. Pedagogical model: every category gets a count + a severity
// colour (ok / warn / critical) based on simple thresholds. Not real numbers.
const IMPACT_CARDS = ["imp-investigations", "imp-recon", "imp-failed-act", "imp-sla", "imp-billing", "imp-support"];

function impactLevel(value, warnAt, critAt) {
  if (value <= 0) return "lvl-ok";
  if (value < critAt) return "lvl-warn";
  return "lvl-critical";
}

function setImpactCard(id, value, level) {
  const card = document.getElementById(id);
  if (!card) return;
  card.querySelector(".impact-value").textContent = value;
  card.classList.remove("lvl-ok", "lvl-warn", "lvl-critical");
  card.classList.add(level);
}

function renderImpact(d) {
  const empty = document.getElementById("impact-empty");
  const grid = document.getElementById("impact-grid");
  if (!empty || !grid) return;
  empty.classList.add("hidden");
  grid.classList.remove("hidden");

  setImpactCard("imp-investigations", d.investigations, impactLevel(d.investigations, 1, 3));
  setImpactCard("imp-recon", d.recon, impactLevel(d.recon, 1, 2));
  setImpactCard("imp-failed-act", d.failedActivations, impactLevel(d.failedActivations, 1, 3));
  setImpactCard("imp-sla", d.slaAtRisk, impactLevel(d.slaAtRisk, 1, 3));
  setImpactCard("imp-billing", d.delayedBilling, impactLevel(d.delayedBilling, 1, 3));
  setImpactCard("imp-support", d.supportLoad, impactLevel(d.supportLoad, 2, 5));
}

function clearImpact() {
  const empty = document.getElementById("impact-empty");
  const grid = document.getElementById("impact-grid");
  if (!empty || !grid) return;
  empty.classList.remove("hidden");
  grid.classList.add("hidden");
  IMPACT_CARDS.forEach(id => {
    const card = document.getElementById(id);
    if (!card) return;
    card.querySelector(".impact-value").textContent = "—";
    card.classList.remove("lvl-ok", "lvl-warn", "lvl-critical");
  });
}
