// --- Transformation Lab — slice 1 -------------------------------------------
// "Tre siter, ett standardiseringsreglage, en avvägning." Första körbara biten
// av Transformation Lab (se docs/transformation-lab.md): tre enheter med olika
// lokala arbetssätt, och ett reglage för grad av standardisering som visar en
// äkta avvägning — lägre variation och högre förutsägbarhet, till priset av en
// transitionskostnad i ledtid.
//
// Detta är INTE en organisationsspecifik simulator — siterna är generiska
// arketyper. Ingen ny motor, ingen batch, inget delat med telecom/FlowLab.
// Återanvänder det datadrivna lärkort-lagret (EdLabCards) i en egen container.
// Isolerat scope, self-init.

(function EdLabTransformModule() {
  "use strict";

  // Tre siter med olika utgångsläge (arketyper, inte verkliga enheter).
  const SITES = [
    { id: "gbg", name: "Göteborg",      style: "snabb men spretig", baseLeadTime: 40 },
    { id: "vxo", name: "Växjö",         style: "jämn men långsam",  baseLeadTime: 65 },
    { id: "nl",  name: "Nederländerna", style: "mittemellan",       baseLeadTime: 52 }
  ];
  const COMMON_TARGET = 55; // gemensam standard-ledtid siterna dras mot
  const CONVERGE = 0.8;     // hur hårt hög standardisering drar mot standarden
  const TRANSITION = 6;     // dagar omställningskostnad per site vid hög std
  const LOCAL_AVG = Math.round(
    SITES.reduce((s, x) => s + x.baseLeadTime, 0) / SITES.length
  );

  let stdHigh = false;   // reglaget: false = låg, true = hög
  let prev = null;       // föregående körnings resultat för delta-jämförelse
  let dom = null;

  function init() {
    dom = {
      sites: document.getElementById("edl-tr-sites"),
      metrics: document.getElementById("edl-tr-metrics"),
      runBtn: document.getElementById("edl-tr-run"),
      stdBtn: document.getElementById("edl-tr-std"),
      resetBtn: document.getElementById("edl-tr-reset"),
      cards: document.getElementById("edl-tr-cards")
    };
    if (!dom.sites) return; // sektionen finns inte → gör inget
    if (dom.runBtn) dom.runBtn.addEventListener("click", run);
    if (dom.stdBtn) dom.stdBtn.addEventListener("click", toggleStd);
    if (dom.resetBtn) dom.resetBtn.addEventListener("click", reset);
    updateStdLabel();
    renderSites(SITES.map((s) => s.baseLeadTime)); // visa baseline direkt
    console.info("[EdLabTransform] ready");
  }

  // --- Modell -----------------------------------------------------------------

  function effLead(site) {
    if (!stdHigh) return site.baseLeadTime;
    // Dra mot gemensam standard + lägg på transitionskostnad.
    return Math.round(
      site.baseLeadTime * (1 - CONVERGE) + COMMON_TARGET * CONVERGE + TRANSITION
    );
  }

  function compute() {
    const leads = SITES.map(effLead);
    const avg = Math.round(leads.reduce((a, b) => a + b, 0) / leads.length);
    const variation = Math.max(...leads) - Math.min(...leads); // spread i dagar
    const predictability = Math.max(0, Math.min(100, 100 - variation * 2));
    const transitionCost = Math.max(0, avg - LOCAL_AVG);
    return { leads, avg, variation, predictability, transitionCost };
  }

  // --- Kontroller -------------------------------------------------------------

  function toggleStd() {
    stdHigh = !stdHigh;
    updateStdLabel();
  }

  function updateStdLabel() {
    if (dom.stdBtn) {
      dom.stdBtn.textContent = `Grad av standardisering: ${stdHigh ? "hög" : "låg"}`;
    }
  }

  function reset() {
    prev = null;
    renderSites(SITES.map((s) => s.baseLeadTime));
    if (dom.metrics) { dom.metrics.hidden = true; dom.metrics.innerHTML = ""; }
    if (window.EdLabCards) window.EdLabCards.clear(dom.cards);
  }

  function run() {
    const r = compute();
    renderSites(r.leads);
    renderMetrics(r);
    showCards();
    prev = { avg: r.avg, variation: r.variation, predictability: r.predictability };
  }

  // --- Rendering --------------------------------------------------------------

  function renderSites(leads) {
    if (!dom.sites) return;
    dom.sites.innerHTML = SITES.map((s, i) =>
      `<div class="edl-tr-site">` +
        `<div class="edl-tr-site-name">${s.name}</div>` +
        `<div class="edl-tr-site-style">${s.style}</div>` +
        `<div class="edl-tr-site-lead">Lead time: <strong>${leads[i]}</strong> dagar</div>` +
      `</div>`
    ).join("");
  }

  // Riktning: lägre ledtid, lägre variation och högre predictability = "bättre".
  function delta(cur, prevVal, lowerIsBetter) {
    if (prevVal == null) return "";
    const d = cur - prevVal;
    if (d === 0) return `<span class="edl-tr-delta">oförändrat</span>`;
    const better = lowerIsBetter ? d < 0 : d > 0;
    const arrow = d > 0 ? "▲" : "▼";
    const cls = better ? "edl-delta-better" : "edl-delta-worse";
    return `<span class="${cls}"> ${arrow} ${Math.abs(d)}</span>`;
  }

  function renderMetrics(r) {
    if (!dom.metrics) return;
    const p = prev;
    dom.metrics.innerHTML =
      metric("Genomsnittlig lead time", `${r.avg} dagar`,
        delta(r.avg, p && p.avg, true)) +
      metric("Variation mellan siter", `${r.variation} dagar`,
        delta(r.variation, p && p.variation, true)) +
      metric("Predictability", `${r.predictability}%`,
        delta(r.predictability, p && p.predictability, false)) +
      metric("Transition cost", r.transitionCost > 0 ? `+${r.transitionCost} dagar` : "0 dagar", "");
    dom.metrics.hidden = false;
  }

  function metric(label, value, deltaHtml) {
    return `<div class="edl-tr-metric">` +
      `<span class="edl-tr-mk">${label}:</span> ${value}${deltaHtml}</div>`;
  }

  function showCards() {
    const C = window.EdLabCards;
    if (!C || !dom.cards) return;
    C.clear(dom.cards);
    C.showConcept("standardization", dom.cards);
    if (stdHigh) C.showInsight("standardization_tradeoff", dom.cards);
  }

  init();
  window.EdLabTransform = { run, reset };
})();
