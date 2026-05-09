// --- Event helpers -----------------------------------------------------------
// Shared between the single-order flow and the parallel engine.

function applyAutomation(events) {
  if (!automationEnabled) return events;
  return events.map(ev =>
    ev.tech === "ResourcesReserved" ? { ...ev, duration: 2500 } : ev
  );
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
