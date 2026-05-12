// --- FlowLab bootstrap ------------------------------------------------------
// Standalone page (flow-lab.html) — inga shared globals med OSS/BSS-simulatorn.
// All state inkapslas i en IIFE som extra säkerhetsbälte även om vi körs från
// en egen HTML utan telecom-scripten. När engine/render/content tillkommer i
// senare commits kommer de att exponera APIer via window.FlowLab*.
//
// Designprincip: ingen import, ingen build, plain script tag — samma ergonomi
// som telecom-simulatorn (öppna HTML från disk och allt fungerar).

(function FlowLabApp() {
  "use strict";

  const statusEl = document.getElementById("fl-boot-status");
  const engineReady = typeof window.FlowLabEngine === "object" && window.FlowLabEngine !== null;

  if (statusEl) {
    if (engineReady) {
      statusEl.innerHTML =
        "Engine laddad. UI kommer i nästa commits — kör " +
        "<code>FlowLabEngine.start(30)</code> i devtools-consolen för att se " +
        "items vandra genom todo → analysis → build → done.";
      statusEl.classList.add("fl-boot-ok");
    } else {
      statusEl.textContent =
        "FlowLab-skelett laddat, men ingen engine hittades. Kontrollera att flow-engine.js laddas.";
    }
  }

  console.info("[FlowLab] bootstrap ok — isolated scope, no shared globals with telecom");
  if (engineReady) {
    console.info("[FlowLab] API ready on window.FlowLabEngine —",
      Object.keys(window.FlowLabEngine).join(", "));
  } else {
    console.warn("[FlowLab] window.FlowLabEngine not found");
  }
})();
