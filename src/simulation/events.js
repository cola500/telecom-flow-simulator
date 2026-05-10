// --- Event helpers -----------------------------------------------------------
// Shared between the single-order flow and the parallel engine.

// Reservation-automation halverar ResourcesReserved (5.0s → 2.5s).
// Provisioning-automation snabbar upp ProvisioningStarted (3.0s → 1.8s) och
// ServiceActivated (1.0s → 0.7s) — verifieringen är kvar, bara snabbare.
// När båda toggles är off är detta en referenslik no-op.
function applyAutomation(events) {
  if (!automationEnabled && !provAutomationEnabled) return events;
  return events.map(ev => {
    if (automationEnabled && ev.tech === "ResourcesReserved") {
      return { ...ev, duration: 2500 };
    }
    if (provAutomationEnabled && ev.tech === "ProvisioningStarted") {
      return { ...ev, duration: 1800 };
    }
    if (provAutomationEnabled && ev.tech === "ServiceActivated") {
      return { ...ev, duration: 700 };
    }
    return ev;
  });
}

// Multiplies each event's duration by a uniform random factor in
// [1 - pct/100, 1 + pct/100]. At pct=0 returns the input array unchanged so
// behavior is identical to before this slice. Mean stays the same; only the
// spread changes — that's the whole point ("variation is the enemy of flow").
function applyVariability(events, pct) {
  if (!pct) return events;
  const span = pct / 100;
  return events.map(ev => {
    const factor = 1 + (Math.random() * 2 - 1) * span;
    const newDuration = Math.max(100, Math.round(ev.duration * factor));
    return { ...ev, duration: newDuration };
  });
}

function fmtMs(ms) { return (ms / 1000).toFixed(1) + "s"; }

function calcHandoff(fromSys, toSys) {
  if (fromSys === toSys) return 0;
  return SYSTEMS[fromSys].layer === SYSTEMS[toSys].layer ? 600 : 1200;
}

function buildQueue(events) {
  const q = [];
  events.forEach((ev, i) => {
    q.push({ kind: "event", ...ev });
    const next = events[i + 1];
    if (next && !ev.fail) {
      const d = calcHandoff(ev.system, next.system);
      if (d > 0) {
        q.push({
          kind: "handoff",
          from: ev.system,
          to: next.system,
          duration: d,
          crossLayer: SYSTEMS[ev.system].layer !== SYSTEMS[next.system].layer
        });
      }
    }
  });
  return q;
}
