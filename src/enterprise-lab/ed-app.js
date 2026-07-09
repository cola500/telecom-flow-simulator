// --- Enterprise Delivery Lab bootstrap ---------------------------------------
// Standalone page (enterprise-lab.html) — inga delade globals med telecom-
// simulatorn eller FlowLab. Laddas sist så EdLabDomain + EdLabEngine +
// EdLabRender redan finns på window.
//
// Ansvar:
//   - fylla initiative-panelen från domändata
//   - initiera render (subscribar på engine)
//   - wira Start initiative + blocker-scenarion + Återställ
//   - signalera bootstrap-status till consolen

(function EdLabApp() {
  "use strict";

  const missing = ["EdLabDomain", "EdLabEngine", "EdLabRender"]
    .filter(name => typeof window[name] !== "object" || window[name] === null);
  if (missing.length) {
    console.error(`[EdLab] FATAL: ${missing.join(", ")} saknas — kontrollera script-laddordningen i enterprise-lab.html.`);
    return;
  }

  console.info("[EdLab] bootstrap ok — isolated scope, no shared globals with telecom/FlowLab");

  // 1) Initiative-panelen: content från domändata, inte hårdkodat i HTML.
  const nameEl = document.getElementById("edl-initiative-name");
  const descEl = document.getElementById("edl-initiative-desc");
  if (nameEl) nameEl.textContent = window.EdLabDomain.INITIATIVE.name;
  if (descEl) descEl.textContent = window.EdLabDomain.INITIATIVE.desc;

  // 2) Bind render till engine. Predict-panelen är icke-kritisk — anropas
  //    defensivt så en eventuell laddningsmiss inte stjälper simulatorn.
  window.EdLabRender.init();
  if (window.EdLabPredict) window.EdLabPredict.init();

  // 3) Kontroller. Start-varianterna resetar först så en ny körning alltid
  //    börjar från rent läge — samma mönster som FlowLabs run-knapp. Den interna
  //    reset() behåller jämförelsen mot förra körningen; bara Återställ rensar den.
  const alignmentToggle = document.getElementById("edl-align-toggle");

  function startWith(blockerId) {
    const alignmentOn = !!(alignmentToggle && alignmentToggle.checked);
    // Lås gissningen INNAN körningen startar (predict-before-explanation).
    if (window.EdLabPredict) window.EdLabPredict.onRunStart({ blockerId, alignmentOn });
    window.EdLabEngine.reset();
    window.EdLabEngine.start(blockerId, alignmentOn);
  }

  document.getElementById("edl-btn-start")
    ?.addEventListener("click", () => startWith(null));
  document.getElementById("edl-btn-blocker-sec")
    ?.addEventListener("click", () => startWith("sec_delay"));
  document.getElementById("edl-btn-blocker-arch")
    ?.addEventListener("click", () => startWith("arch_rework"));
  document.getElementById("edl-btn-reset")
    ?.addEventListener("click", () => {
      window.EdLabEngine.reset({ full: true });
      if (window.EdLabPredict) window.EdLabPredict.onFullReset();
    });

  // Expandera/fäll ihop alla collapsible-sektioner (learning journey + "Om steget").
  function toggleAllDetails(open) {
    document.querySelectorAll("#edl-main details").forEach((d) => { d.open = open; });
  }
  document.getElementById("edl-expand-all")
    ?.addEventListener("click", () => toggleAllDetails(true));
  document.getElementById("edl-collapse-all")
    ?.addEventListener("click", () => toggleAllDetails(false));

  console.info("[EdLab] API ready — engine:",
    Object.keys(window.EdLabEngine).join(", "));
})();
