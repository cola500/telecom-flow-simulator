// --- FlowLab bootstrap ------------------------------------------------------
// Standalone page (flow-lab.html) — inga shared globals med OSS/BSS-simulatorn.
// Laddas sist så FlowLabEngine + FlowLabRender redan finns på window.
//
// Ansvar:
//   - initiera render (subscribar på engine)
//   - synca slidervärden med engine-defaults vid sidladdning
//   - wira reglage-knappar (cap-btn-rader), kör/stop/reset, presets
//   - signalera bootstrap-status till consolen

(function FlowLabApp() {
  "use strict";

  const engineReady = typeof window.FlowLabEngine === "object" && window.FlowLabEngine !== null;
  const renderReady = typeof window.FlowLabRender === "object" && window.FlowLabRender !== null;

  console.info("[FlowLab] bootstrap ok — isolated scope, no shared globals with telecom");

  if (!engineReady) {
    console.error("[FlowLab] FATAL: window.FlowLabEngine saknas. flow-engine.js laddades inte.");
    return;
  }
  if (!renderReady) {
    console.error("[FlowLab] FATAL: window.FlowLabRender saknas. flow-render.js laddades inte.");
    return;
  }

  // 1) Bind render till engine.
  window.FlowLabRender.init();
  console.info("[FlowLab] API ready — engine:",
    Object.keys(window.FlowLabEngine).join(", "));

  // --- Reglage --------------------------------------------------------------
  // Mönstret är samma som telecom: cap-btn-grupp där klick togglar .active och
  // skickar värdet till engine via updateSettings. Mid-run-ändringar är OK —
  // engine läser settings färskt i varje tick.

  function wireGroup(groupId, dataKey, parseValue, settingKey) {
    const buttons = document.querySelectorAll(`#${groupId} .cap-btn`);
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const value = parseValue(btn.dataset[dataKey]);
        window.FlowLabEngine.updateSettings({ [settingKey]: value });
      });
    });
  }

  const asInt = v => parseInt(v, 10);
  const wipParser = v => v === "inf" ? Infinity : parseInt(v, 10);
  const bottleneckParser = v => v === "none" ? null : v;

  wireGroup("fl-arrival-buttons",    "rate",       asInt,           "arrivalRatePerMin");
  wireGroup("fl-capacity-buttons",   "cap",        asInt,           "capacity");
  wireGroup("fl-wip-buttons",        "wip",        wipParser,       "wipLimit");
  wireGroup("fl-variation-buttons",  "variation",  asInt,           "variationPct");
  wireGroup("fl-bottleneck-buttons", "bottleneck", bottleneckParser,"bottleneck");

  // --- Sync hjälpare för presets -------------------------------------------
  // Flippar slider-active-klasserna utan att trigga klick-event, så engine-
  // settings inte uppdateras dubbelt. Vi anropar updateSettings explicit
  // i applyPreset.

  function setActiveButton(groupId, predicate) {
    document.querySelectorAll(`#${groupId} .cap-btn`).forEach(btn => {
      btn.classList.toggle("active", predicate(btn));
    });
  }

  function syncSliders(s) {
    setActiveButton("fl-arrival-buttons",
      b => parseInt(b.dataset.rate, 10) === s.arrivalRatePerMin);
    setActiveButton("fl-capacity-buttons",
      b => parseInt(b.dataset.cap, 10) === s.capacity);
    setActiveButton("fl-wip-buttons", b => {
      if (s.wipLimit === Infinity || s.wipLimit == null) return b.dataset.wip === "inf";
      return parseInt(b.dataset.wip, 10) === s.wipLimit;
    });
    setActiveButton("fl-variation-buttons",
      b => parseInt(b.dataset.variation, 10) === s.variationPct);
    setActiveButton("fl-bottleneck-buttons", b => {
      const v = b.dataset.bottleneck;
      if (v === "none") return s.bottleneck == null;
      return v === s.bottleneck;
    });
  }

  // --- Presets --------------------------------------------------------------

  const PRESET_CALM = {
    arrivalRatePerMin: 2, capacity: 1, wipLimit: 5, variationPct: 0, bottleneck: null
  };
  const PRESET_LOAD = {
    arrivalRatePerMin: 8, capacity: 1, wipLimit: 5, variationPct: 25, bottleneck: "build"
  };

  function applyPreset(settings, durationSec) {
    window.FlowLabEngine.reset();
    window.FlowLabEngine.updateSettings(settings);
    syncSliders(settings);
    window.FlowLabEngine.start(durationSec);
  }

  document.getElementById("fl-btn-preset-calm")
    ?.addEventListener("click", () => applyPreset(PRESET_CALM, 30));
  document.getElementById("fl-btn-preset-load")
    ?.addEventListener("click", () => applyPreset(PRESET_LOAD, 60));

  // --- Huvudkontroller ------------------------------------------------------

  document.getElementById("fl-btn-run")?.addEventListener("click", () => {
    window.FlowLabEngine.reset();
    window.FlowLabEngine.start(60);
  });
  document.getElementById("fl-btn-stop")?.addEventListener("click", () => {
    window.FlowLabEngine.stop("user");
  });
  document.getElementById("fl-btn-reset")?.addEventListener("click", () => {
    window.FlowLabEngine.reset();
  });

  // Devs som vill ha detaljerade loggar slår på via devtools-consolen:
  //   FlowLabEngine.setVerbose(true)
  // Inget UI för det — togglen tog plats utan användarvärde.

  // --- Initial sync ---------------------------------------------------------
  // Säkerställer single-source-of-truth: sliders speglar engine.getDefaults().
  // Om HTML-default och engine-default någonsin glider isär märks det vid
  // sidladdning istället för i en mystisk körning.

  syncSliders(window.FlowLabEngine.getState().settings);
})();
