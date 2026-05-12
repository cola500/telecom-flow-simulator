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
  if (statusEl) {
    statusEl.textContent =
      "FlowLab-skelett laddat. UI, engine och pedagogisk loop kommer i nästa commits.";
    statusEl.classList.add("fl-boot-ok");
  }

  // Signal till devtools/console att vi inte krockar med telecom.
  // Behåller medvetet ingen exponering på window — vi vill upptäcka om någon
  // senare commit av misstag försöker referera FlowLab globalt.
  console.info("[FlowLab] bootstrap ok — isolated scope, no shared globals with telecom");
})();
