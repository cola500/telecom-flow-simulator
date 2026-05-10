// --- Event helpers -----------------------------------------------------------
// Shared between the single-order flow and the parallel engine.

// Automation skalas på *role* istället för tech-namn, så samma logik fungerar
// över olika produkter (fiber/mobile har olika tech-namn för samma roller).
//
// Reservation-automation halverar reservation-steg (× 0.5).
// Provisioning-automation snabbar upp provisioning (× 0.6), activation och
// verification (× 0.7) — verifieringen är kvar, bara snabbare.
// När båda toggles är off är detta en referenslik no-op.
function applyAutomation(events) {
  if (!automationEnabled && !provAutomationEnabled) return events;
  return events.map(ev => {
    if (automationEnabled && ev.role === "reservation") {
      return { ...ev, duration: Math.round(ev.duration * 0.5) };
    }
    if (provAutomationEnabled && ev.role === "provisioning") {
      return { ...ev, duration: Math.round(ev.duration * 0.6) };
    }
    if (provAutomationEnabled && (ev.role === "activation" || ev.role === "verification")) {
      return { ...ev, duration: Math.round(ev.duration * 0.7) };
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
