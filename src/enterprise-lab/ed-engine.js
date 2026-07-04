// --- Enterprise Delivery Lab: single-initiative flow-motor -------------------
// Kör ETT initiative genom domänens delivery-steg som en setTimeout-driven
// sekvens — samma exekveringsmodell som telecom-simulatorns runFlow, inte
// FlowLabs tick-loop. Slice 1 är single-initiative; en tick-motor vore
// överbyggnad här. (Se docs/enterprise-delivery-lab-design.md, "Roadmap".)
//
// Mekaniken känner bara till tre stegtyper:
//   work   — normalt arbete i ett steg
//   wait   — initiativet står i kö (blocker: delay)
//   rework — ett redan klart steg spelas om (blocker: omtag)
// Vad stegen heter och varför blockers uppstår bor i ed-domain.js.
//
// Körplanen byggs som en steplista i förväg (buildPlan), så blocker-injektion
// är ren datatransformation — motorn exekverar bara listan.
//
// API exponeras på window.EdLabEngine. Isolerat scope — inga delade globals
// med telecom-simulatorn eller FlowLab.

(function EdLabEngineModule() {
  "use strict";

  const D = window.EdLabDomain;

  let state = createEmptyState();
  let subscribers = [];
  let timeoutId = null;
  // Förra klara körningens summary — lever i modulscope, INTE i state, så en
  // auto-reset före nästa körning inte tappar jämförelsen. Rensas bara av en
  // full reset (manuella Återställ-knappen). Samma fälla som telecom-simulatorns
  // comparePreviousRun, medvetet undviken här.
  let previousSummary = null;

  function createEmptyState() {
    const stageStates = {};
    if (D) for (const s of D.STAGES) stageStates[s.id] = "pending";
    return {
      status: "idle",          // idle | running | done
      blockerId: null,
      alignmentOn: false,      // förbättringskontrollen aktiv för denna körning?
      simMs: 0,                // ackumulerad simtid (1 ms ≈ 0,01 dag)
      baselineMs: 0,
      waitMs: 0,               // total kö-tid
      reworkMs: 0,             // total omtags-tid
      reworkStageCount: 0,
      stageStates,             // stageId → pending|active|queued|rework|done
      events: [],              // {tMs, tone, title, detail}
      impact: null,            // fylls vid completion via D.deriveImpact
      plan: []
    };
  }

  // --- Public API -------------------------------------------------------------

  function start(blockerId = null, alignmentOn = false) {
    if (!D) {
      console.error("[EdLab] FATAL: EdLabDomain saknas — ed-domain.js laddades inte.");
      return;
    }
    if (state.status === "running") {
      console.warn("[EdLab] start ignored — already running");
      return;
    }
    if (blockerId && !D.BLOCKERS[blockerId]) {
      console.error(`[EdLab] okänd blocker "${blockerId}" — kör utan blocker istället.`);
      blockerId = null;
    }

    state = createEmptyState();
    state.status = "running";
    state.blockerId = blockerId;
    state.alignmentOn = !!alignmentOn;
    state.plan = buildPlan(blockerId, state.alignmentOn);
    state.baselineMs = D.STAGES.reduce((sum, s) => sum + s.durationMs, 0);

    pushEvent("info", `InitiativeCreated — ${D.INITIATIVE.name}`,
      blockerId
        ? `Körning med blocker-scenario: ${D.BLOCKERS[blockerId].label}.`
        : "Körning utan blockers (happy path).");
    if (state.alignmentOn) {
      pushEvent("info", D.EARLY_ALIGNMENT.eventOn.title, D.EARLY_ALIGNMENT.eventOn.detail);
    }
    console.info("[EdLab] start", { blockerId, alignmentOn: state.alignmentOn, steps: state.plan.length });

    runStep(0);
  }

  // reset() rensar bara körläget och BEHÅLLER previousSummary — det är den
  // interna reset som körs före varje ny körning, och jämförelsen ska överleva.
  // reset({ full: true }) rensar även jämförelsen (manuella Återställ-knappen).
  function reset(opts = {}) {
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    state = createEmptyState();
    if (opts.full) previousSummary = null;
    console.info("[EdLab] reset", opts.full ? "(full — jämförelse rensad)" : "");
    notify();
  }

  function getState() {
    return {
      status: state.status,
      blockerId: state.blockerId,
      simDays: state.simMs * D.DAYS_PER_MS,
      baselineDays: state.baselineMs * D.DAYS_PER_MS,
      stageStates: { ...state.stageStates },
      events: state.events.slice(),
      impact: state.impact
    };
  }

  function subscribe(fn) {
    subscribers.push(fn);
    return () => { subscribers = subscribers.filter(f => f !== fn); };
  }

  // --- Planbygge ---------------------------------------------------------------
  // Happy path: ett work-steg per domänsteg. En blocker transformerar planen:
  //   wait-blocker  → wait-steg skjuts in före triggerStage
  //   rework-blocker → efter triggerStage skjuts rework-kopior av reworkStages in
  // En förbättringskontroll (alignment) transformerar planen ytterligare:
  //   premium        → work-steg får extra simtid uppfront (gäller alltid)
  //   reworkOverride → en blockers omtag krymps till angivna steg (gäller vid blocker)

  function buildPlan(blockerId, alignmentOn) {
    const blocker = blockerId ? D.BLOCKERS[blockerId] : null;
    const control = alignmentOn ? D.EARLY_ALIGNMENT : null;
    const plan = [];

    for (const stage of D.STAGES) {
      if (blocker && blocker.waitMs && blocker.triggerStage === stage.id) {
        plan.push({ kind: "wait", stageId: stage.id, durationMs: blocker.waitMs, blocker });
      }
      const premiumMs = (control && control.premium[stage.id]) || 0;
      plan.push({
        kind: "work", stageId: stage.id,
        durationMs: stage.durationMs + premiumMs, premiumMs
      });

      if (blocker && blocker.reworkStages && blocker.triggerStage === stage.id) {
        const reworkStages =
          (control && control.reworkOverride[blockerId]) || blocker.reworkStages;
        for (const reworkId of reworkStages) {
          const reworkStage = D.STAGES.find(s => s.id === reworkId);
          if (!reworkStage) {
            console.error(`[EdLab] blocker "${blocker.id}" pekar på okänt steg "${reworkId}" — hoppar över.`);
            continue;
          }
          plan.push({
            kind: "rework", stageId: reworkId, durationMs: reworkStage.durationMs,
            blocker, first: reworkId === reworkStages[0]
          });
        }
      }
    }
    return plan;
  }

  // --- Exekvering ---------------------------------------------------------------

  function runStep(index) {
    if (index >= state.plan.length) { finish(); return; }

    const step = state.plan[index];
    const stage = D.STAGES.find(s => s.id === step.stageId);

    if (step.kind === "wait") {
      state.stageStates[step.stageId] = "queued";
      pushEvent("block", step.blocker.eventTitle, step.blocker.eventDetail);
    } else if (step.kind === "rework") {
      state.stageStates[step.stageId] = "rework";
      if (step.first) {
        pushEvent("block", step.blocker.eventTitle, step.blocker.eventDetail);
      }
      pushEvent("rework", `Rework: ${stage.name}`, `${stage.actor} gör om steget.`);
    } else {
      state.stageStates[step.stageId] = "active";
      pushEvent("info", `${stage.name} startar`, `${stage.actor} arbetar med initiativet.`);
    }
    notify();

    timeoutId = setTimeout(() => {
      state.simMs += step.durationMs;
      const days = Math.round(step.durationMs * D.DAYS_PER_MS);

      if (step.kind === "wait") {
        state.waitMs += step.durationMs;
        pushEvent("info", `Kön hos ${stage.actor} släpper`,
          `${days} dagars väntan — utan att något arbete utförts.`);
        // Steget själv körs som nästa plansteg; låt work-steget sätta "active".
      } else {
        if (step.kind === "rework") {
          state.reworkMs += step.durationMs;
          state.reworkStageCount += 1;
        }
        state.stageStates[step.stageId] = "done";
        const premiumDays = Math.round((step.premiumMs || 0) * D.DAYS_PER_MS);
        const premiumNote = premiumDays > 0
          ? ` (varav ${premiumDays} dagar alignment-premie).`
          : "";
        pushEvent(step.kind === "rework" ? "rework" : "ok",
          `${stage.name} klart${step.kind === "rework" ? " (omtag)" : ""}`,
          `${days} dagar${premiumNote || "."}`);
      }
      runStep(index + 1);
    }, step.durationMs);
  }

  function finish() {
    timeoutId = null;
    state.status = "done";

    const summary = {
      baselineDays: state.baselineMs * D.DAYS_PER_MS,
      actualDays: state.simMs * D.DAYS_PER_MS,
      reworkStageCount: state.reworkStageCount,
      reworkDays: state.reworkMs * D.DAYS_PER_MS,
      waitDays: state.waitMs * D.DAYS_PER_MS
    };
    state.impact = D.deriveImpact(summary, previousSummary);

    pushEvent("ok", "CapabilityRealized — initiativet är levererat",
      `Lead time: ${Math.round(summary.actualDays)} dagar ` +
      `(baseline ${Math.round(summary.baselineDays)} dagar).` +
      (state.blockerId ? ` Lärdom: ${D.BLOCKERS[state.blockerId].teach}` : "") +
      (state.alignmentOn ? ` Alignment: ${D.EARLY_ALIGNMENT.teach}` : ""));
    console.info("[EdLab] done", summary);

    // Snapshot först EFTER att impact räknats mot förra körningen — annars
    // jämför nästa körning mot sig själv.
    previousSummary = summary;
    notify();
  }

  // --- Hjälpare -------------------------------------------------------------

  function pushEvent(tone, title, detail) {
    state.events.push({ tMs: state.simMs, tone, title, detail });
  }

  function notify() {
    for (const fn of subscribers) {
      try { fn(getState()); }
      catch (e) { console.error("[EdLab] subscriber error", e); }
    }
  }

  // --- Exponera API -----------------------------------------------------------

  window.EdLabEngine = { start, reset, getState, subscribe };
})();
