// --- Transformation Lab — slice 1 + tidslinje -------------------------------
// "Tre siter, ett standardiseringsreglage, en avvägning" — nu som en process
// över tid (månad 1–6) i stället för ett ögonblick. Att köra transformationen
// visar hur metrics UTVECKLAS: lead time får en initial försämring
// (transitionskostnad) innan den delvis återhämtar sig, variationen mellan
// siterna sjunker gradvis, och förutsägbarheten stiger gradvis. Se
// docs/transformation-lab.md ("förändring blir ofta sämre innan den blir bättre").
//
// Enkel stegvis simulering — ingen animation, ingen ny motor. Grafen återanvänder
// SVG-mönstret från systemexperimentet (ed-render/ed-system) konceptuellt, ingen
// delad kod. Generiska siter, inte en verklig organisation. Isolerat scope,
// self-init. Inget delat med telecom/FlowLab eller övriga EDL-lägen.

(function EdLabTransformModule() {
  "use strict";

  // Tre siter med olika utgångsläge (arketyper, inte verkliga enheter).
  const SITES = [
    { id: "gbg", name: "Göteborg",      style: "snabb men spretig", baseLeadTime: 40 },
    { id: "vxo", name: "Växjö",         style: "jämn men långsam",  baseLeadTime: 65 },
    { id: "nl",  name: "Nederländerna", style: "mittemellan",       baseLeadTime: 52 }
  ];
  const COMMON_TARGET = 55; // gemensam standard-ledtid siterna dras mot
  const CONVERGE = 0.8;     // hur hårt full standardisering drar mot standarden
  const TRANSITION = 6;     // bestående extra ledtid vid full standardisering
  const DISRUPT_PEAK = 6;   // tillfällig störning som toppar mitt i omställningen
  const MONTHS = 6;
  const LOCAL_AVG = Math.round(
    SITES.reduce((s, x) => s + x.baseLeadTime, 0) / SITES.length
  );

  // Milstolpar under omställningen (visas bara vid hög standardisering).
  const MILESTONES = [
    { month: 2, label: "Mallar införs" },
    { month: 4, label: "Gemensam rapportering" },
    { month: 5, label: "Organisationen börjar anpassa sig" }
  ];

  let stdHigh = false;   // reglaget: false = låg, true = hög
  let prev = null;       // föregående körnings slutresultat för delta-jämförelse
  let dom = null;

  function init() {
    dom = {
      sites: document.getElementById("edl-tr-sites"),
      metrics: document.getElementById("edl-tr-metrics"),
      runBtn: document.getElementById("edl-tr-run"),
      stdBtn: document.getElementById("edl-tr-std"),
      resetBtn: document.getElementById("edl-tr-reset"),
      cards: document.getElementById("edl-tr-cards"),
      graph: document.getElementById("edl-tr-graph"),
      graphEmpty: document.getElementById("edl-tr-graph-empty"),
      milestones: document.getElementById("edl-tr-milestones")
    };
    if (!dom.sites) return; // sektionen finns inte → gör inget
    if (dom.runBtn) dom.runBtn.addEventListener("click", run);
    if (dom.stdBtn) dom.stdBtn.addEventListener("click", toggleStd);
    if (dom.resetBtn) dom.resetBtn.addEventListener("click", reset);
    updateStdLabel();
    renderSites(SITES.map((s) => s.baseLeadTime)); // visa baseline direkt
    console.info("[EdLabTransform] ready");
  }

  // --- Modell: en punkt per månad ---------------------------------------------
  // Standardiseringen rullas ut linjärt över sex månader mot målet (hög = full,
  // låg = ingen förändring). Varje månad ger tre mätetal.

  function computeSeries() {
    const target = stdHigh ? 1 : 0;
    const out = [];
    for (let m = 0; m <= MONTHS; m++) {
      const s = (m / MONTHS) * target; // hur långt utrullningen kommit
      const leads = SITES.map((site) => {
        const converged = site.baseLeadTime * (1 - CONVERGE * s) + COMMON_TARGET * (CONVERGE * s);
        const permanent = TRANSITION * s;                 // bestående kostnad
        const disruption = DISRUPT_PEAK * (s * (1 - s) * 4); // tillfällig svacka
        return converged + permanent + disruption;
      });
      const avg = Math.round(leads.reduce((a, b) => a + b, 0) / leads.length);
      const variation = Math.round(Math.max.apply(null, leads) - Math.min.apply(null, leads));
      const predictability = Math.max(0, Math.min(100, Math.round(100 - variation * 2)));
      out.push({ month: m, leadTime: avg, variation, predictability, leads });
    }
    return out;
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
    renderGraph(null);
    if (window.EdLabCards) window.EdLabCards.clear(dom.cards);
  }

  function run() {
    const series = computeSeries();
    const final = series[series.length - 1];
    renderSites(final.leads.map((v) => Math.round(v)));
    renderGraph(series);
    renderMetrics(final);
    showCards();
    prev = { avg: final.leadTime, variation: final.variation, predictability: final.predictability };
  }

  // --- Rendering: siter -------------------------------------------------------

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

  // --- Rendering: metrics (slutläge månad 6 + delta mot förra körningen) ------

  function delta(cur, prevVal, lowerIsBetter) {
    if (prevVal == null) return "";
    const d = cur - prevVal;
    if (d === 0) return `<span class="edl-tr-delta">oförändrat</span>`;
    const better = lowerIsBetter ? d < 0 : d > 0;
    const arrow = d > 0 ? "▲" : "▼";
    const cls = better ? "edl-delta-better" : "edl-delta-worse";
    return `<span class="${cls}"> ${arrow} ${Math.abs(d)}</span>`;
  }

  function renderMetrics(final) {
    if (!dom.metrics) return;
    const p = prev;
    const transitionCost = Math.max(0, final.leadTime - LOCAL_AVG);
    dom.metrics.innerHTML =
      metric("Genomsnittlig lead time", `${final.leadTime} dagar`,
        delta(final.leadTime, p && p.avg, true)) +
      metric("Variation mellan siter", `${final.variation} dagar`,
        delta(final.variation, p && p.variation, true)) +
      metric("Predictability", `${final.predictability}%`,
        delta(final.predictability, p && p.predictability, false)) +
      metric("Transition cost", transitionCost > 0 ? `+${transitionCost} dagar` : "0 dagar", "");
    dom.metrics.hidden = false;
  }

  function metric(label, value, deltaHtml) {
    return `<div class="edl-tr-metric">` +
      `<span class="edl-tr-mk">${label}:</span> ${value}${deltaHtml}</div>`;
  }

  // --- Rendering: tidslinje-graf (SVG, mönster lånat från systemexperimentet) --
  const G = { W: 560, H: 150, padTop: 12, padBottom: 22, padX: 8 };
  const GSERIES = [
    { key: "variation",      stroke: "#b94a00", width: 1.8 },
    { key: "predictability", stroke: "#2da66a", width: 1.8 },
    { key: "leadTime",       stroke: "#4a6cf7", width: 2.0 } // ritas sist = överst
  ];

  function renderGraph(series) {
    const svg = dom && dom.graph;
    if (!svg) return;
    if (!series || series.length < 2) {
      svg.hidden = true;
      svg.innerHTML = "";
      if (dom.graphEmpty) dom.graphEmpty.hidden = false;
      if (dom.milestones) dom.milestones.hidden = true;
      return;
    }
    if (dom.graphEmpty) dom.graphEmpty.hidden = true;
    svg.hidden = false;

    const { W, H, padTop, padBottom, padX } = G;
    const yMax = 100; // dagar (< 100) och % delar 0–100-skala; formen är poängen
    const xOf = (m) => padX + (m / MONTHS) * (W - 2 * padX);
    const yOf = (v) => H - padBottom - (v / yMax) * (H - padTop - padBottom);
    const path = (key) => series
      .map((d, i) => `${i ? "L" : "M"}${xOf(d.month).toFixed(1)},${yOf(d[key]).toFixed(1)}`)
      .join(" ");

    const grid = [0.25, 0.5, 0.75].map((p) => {
      const y = (padTop + (1 - p) * (H - padTop - padBottom)).toFixed(1);
      return `<line x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}" stroke="#eaeef5" stroke-width="0.5"/>`;
    }).join("");

    // Milstolpar som streckade lodlinjer (bara vid faktisk transformation).
    let milestoneLines = "";
    if (stdHigh) {
      milestoneLines = MILESTONES.map((ms) => {
        const x = xOf(ms.month).toFixed(1);
        return `<line x1="${x}" y1="${padTop}" x2="${x}" y2="${H - padBottom}" ` +
          `stroke="#c9b8a8" stroke-width="0.8" stroke-dasharray="2,3"/>`;
      }).join("");
    }

    const paths = GSERIES.map((s) =>
      `<path d="${path(s.key)}" stroke="${s.stroke}" stroke-width="${s.width}" fill="none"/>`
    ).join("");

    const label = (x, y, anchor, text) =>
      `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="9" fill="#8a93a6" ` +
      `font-family="ui-monospace,Menlo,monospace">${text}</text>`;

    svg.innerHTML =
      grid +
      milestoneLines +
      `<line x1="${padX}" y1="${H - padBottom}" x2="${W - padX}" y2="${H - padBottom}" stroke="#cdd3df" stroke-width="0.6"/>` +
      paths +
      label(W - padX, padTop + 2, "end", "0–100 (dagar / %)") +
      label(padX, H - 6, "start", "månad 0") +
      label(W - padX, H - 6, "end", `månad ${MONTHS}`);

    renderMilestoneCaption();
  }

  function renderMilestoneCaption() {
    if (!dom.milestones) return;
    if (!stdHigh) { dom.milestones.hidden = true; return; }
    dom.milestones.textContent = "Milstolpar: " +
      MILESTONES.map((ms) => `månad ${ms.month} — ${ms.label}`).join(" · ");
    dom.milestones.hidden = false;
  }

  // --- Lärkort ----------------------------------------------------------------

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
