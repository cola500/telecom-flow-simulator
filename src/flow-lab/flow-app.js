// --- FlowLab bootstrap ------------------------------------------------------
// Standalone page (flow-lab.html) — inga shared globals med OSS/BSS-simulatorn.
// Laddas sist så FlowLabEngine + FlowLabRender redan finns på window.
//
// Ansvar:
//   - initiera render (subscribar på engine)
//   - wira preset-knapparna och verbose-toggle
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

  // 1) Bind render till engine via subscribe.
  window.FlowLabRender.init();
  console.info("[FlowLab] API ready —",
    "engine:", Object.keys(window.FlowLabEngine).join(", "));

  // 2) Preset-knappar. Värden hardcodade här tills commit 4 introducerar sliders.

  const calmBtn = document.getElementById("fl-btn-run-calm");
  if (calmBtn) {
    calmBtn.addEventListener("click", () => {
      window.FlowLabEngine.reset();
      window.FlowLabEngine.updateSettings({
        arrivalRatePerMin: 2,
        capacity: 1,
        wipLimit: 5,
        variationPct: 0,
        bottleneck: null
      });
      window.FlowLabEngine.start(30);
    });
  }

  const loadBtn = document.getElementById("fl-btn-run-load");
  if (loadBtn) {
    loadBtn.addEventListener("click", () => {
      window.FlowLabEngine.reset();
      window.FlowLabEngine.updateSettings({
        arrivalRatePerMin: 10,
        capacity: 1,
        wipLimit: 5,
        variationPct: 25,
        bottleneck: "build"
      });
      window.FlowLabEngine.start(60);
    });
  }

  const stopBtn = document.getElementById("fl-btn-stop");
  if (stopBtn) {
    stopBtn.addEventListener("click", () => window.FlowLabEngine.stop("user"));
  }

  const resetBtn = document.getElementById("fl-btn-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => window.FlowLabEngine.reset());
  }

  // 3) Verbose-toggle. Default off (matchar engine-default). När på får man
  //    samma rika instrumentering som commit 2 hade default.

  const verboseToggle = document.getElementById("fl-verbose-toggle");
  if (verboseToggle) {
    verboseToggle.checked = false;
    verboseToggle.addEventListener("change", () => {
      window.FlowLabEngine.setVerbose(verboseToggle.checked);
    });
  }
})();
