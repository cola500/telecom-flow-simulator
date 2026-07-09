// --- Transformation Lab — slice 1 + tidsmotor -------------------------------
// Samma modell och data som förut, men transformationen SPELAS UPP månad för
// månad i stället för att hoppa till slutresultatet — förändringen ska kännas
// som en resa, inte en rapport. Grafen byggs upp successivt, metrics uppdateras
// successivt, milstolpar dyker upp som event och lärkort visas när de blir
// relevanta. Se docs/transformation-lab.md.
//
// INGEN ny simuleringsmotor: beräkningen (computeSeries) är oförändrad, tidsmotorn
// spelar bara upp den. Enkel tick var ~800 ms — hellre tydligt än snabbt. Generiska
// siter, inte en verklig organisation. Isolerat scope, self-init. Inget delat med
// telecom/FlowLab eller övriga EDL-lägen.

(function EdLabTransformModule() {
  "use strict";

  // Tre siter med olika utgångsläge (arketyper, inte verkliga enheter).
  const SITES = [
    { id: "gbg", name: "Göteborg",      style: "snabb men spretig", baseLeadTime: 40 },
    { id: "vxo", name: "Växjö",         style: "jämn men långsam",  baseLeadTime: 65 },
    { id: "nl",  name: "Nederländerna", style: "mittemellan",       baseLeadTime: 52 }
  ];
  const COMMON_TARGET = 55;
  const CONVERGE = 0.8;
  const TRANSITION = 6;
  const DISRUPT_PEAK = 6;
  const MONTHS = 6;
  const TICK_MS = 800;      // uppspelningstakt
  const LOCAL_AVG = Math.round(
    SITES.reduce((s, x) => s + x.baseLeadTime, 0) / SITES.length
  );

  // Milstolpar under omställningen (visas som en tidslinje med status per månad).
  const MILESTONES = [
    { month: 2, emoji: "📋", label: "Gemensamma mallar införs." },
    { month: 4, emoji: "📊", label: "Gemensam rapportering införs." },
    { month: 5, emoji: "🤝", label: "Organisationen börjar anpassa sig." }
  ];

  // Kort beskrivning per månad — så statusraden berättar vad som händer, inte
  // bara vilken månad det är. Ren content, ingen logik. Gäller hög standardisering.
  const MONTH_DESC = [
    "Utgångsläge — arbetssätten skiljer sig åt",
    "Standardiseringen börjar rullas ut",
    "Gemensamma mallar införs",
    "Omställningen är som mest kännbar",
    "Gemensam rapportering etableras",
    "Organisationen börjar anpassa sig",
    "Nytt, mer förutsägbart normalläge"
  ];

  let stdHigh = false;   // reglaget: false = låg, true = hög
  let prev = null;       // föregående KLARA körnings slutresultat för delta
  let fullSeries = [];   // hela den beräknade serien (månad 0..6)
  let currentMonth = 0;  // vilken månad som visas just nu
  let playId = null;     // setInterval-id för uppspelningen
  let peakMonth = 0;     // månad med högst lead time (för insight-trigger)
  let shownConcept = false, shownInsight = false;
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
      graphScale: document.getElementById("edl-tr-graph-scale"),
      status: document.getElementById("edl-tr-status"),
      events: document.getElementById("edl-tr-events")
    };
    if (!dom.sites) return; // sektionen finns inte → gör inget
    if (dom.runBtn) dom.runBtn.addEventListener("click", start);
    if (dom.stdBtn) dom.stdBtn.addEventListener("click", toggleStd);
    if (dom.resetBtn) dom.resetBtn.addEventListener("click", reset);
    updateStdLabel();
    renderSites(SITES.map((s) => s.baseLeadTime)); // visa baseline direkt
    console.info("[EdLabTransform] ready");
  }

  // --- Modell (oförändrad): en punkt per månad --------------------------------

  function computeSeries() {
    const target = stdHigh ? 1 : 0;
    const out = [];
    for (let m = 0; m <= MONTHS; m++) {
      const s = (m / MONTHS) * target;
      const leads = SITES.map((site) => {
        const converged = site.baseLeadTime * (1 - CONVERGE * s) + COMMON_TARGET * (CONVERGE * s);
        const permanent = TRANSITION * s;
        const disruption = DISRUPT_PEAK * (s * (1 - s) * 4);
        return converged + permanent + disruption;
      });
      const avg = Math.round(leads.reduce((a, b) => a + b, 0) / leads.length);
      const variation = Math.round(Math.max.apply(null, leads) - Math.min.apply(null, leads));
      const predictability = Math.max(0, Math.min(100, Math.round(100 - variation * 2)));
      out.push({ month: m, leadTime: avg, variation, predictability, leads });
    }
    return out;
  }

  function peakLeadMonth(series) {
    let best = 0;
    for (let i = 1; i < series.length; i++) {
      if (series[i].leadTime > series[best].leadTime) best = i;
    }
    return best;
  }

  // --- Kontroller -------------------------------------------------------------

  function toggleStd() {
    stopPlay();
    stdHigh = !stdHigh;
    updateStdLabel();
  }

  function updateStdLabel() {
    if (dom.stdBtn) {
      dom.stdBtn.textContent = `Grad av standardisering: ${stdHigh ? "hög" : "låg"}`;
    }
  }

  function stopPlay() {
    if (playId) { clearInterval(playId); playId = null; }
  }

  function reset() {
    stopPlay();
    prev = null;
    fullSeries = [];
    currentMonth = 0;
    if (dom.runBtn) dom.runBtn.textContent = "Starta transformation";
    renderSites(SITES.map((s) => s.baseLeadTime));
    if (dom.metrics) { dom.metrics.hidden = true; dom.metrics.innerHTML = ""; }
    if (dom.status) { dom.status.hidden = true; dom.status.innerHTML = ""; }
    renderGraph(null);
    clearEvents();
    if (window.EdLabCards) window.EdLabCards.clear(dom.cards);
  }

  // Startar uppspelningen: beräkna serien en gång, spela upp månad för månad.
  function start() {
    stopPlay();
    fullSeries = computeSeries();
    peakMonth = peakLeadMonth(fullSeries);
    currentMonth = 0;
    shownConcept = false;
    shownInsight = false;
    clearEvents();
    if (window.EdLabCards) window.EdLabCards.clear(dom.cards);
    renderMonth(0, false);
    playId = setInterval(tick, TICK_MS);
  }

  function tick() {
    currentMonth += 1;
    const isFinal = currentMonth >= MONTHS;
    renderMonth(currentMonth, isFinal);
    maybeShowCards(currentMonth);
    if (isFinal) {
      stopPlay();
      if (dom.runBtn) dom.runBtn.textContent = "Kör igen";
      const f = fullSeries[MONTHS];
      prev = { avg: f.leadTime, variation: f.variation, predictability: f.predictability };
    }
  }

  // --- Rendering per månad ----------------------------------------------------

  function renderMonth(m, isFinal) {
    const point = fullSeries[m];
    if (!point) return;
    renderSites(point.leads.map((v) => Math.round(v)));
    renderMetrics(point, isFinal);
    renderGraph(fullSeries.slice(0, m + 1));
    renderMilestoneTimeline(m);
    setStatus(m);
  }

  function setStatus(m) {
    if (!dom.status) return;
    const title = m === 0 ? "Utgångsläge — månad 0 av 6" : `Månad ${m} av ${MONTHS}`;
    const desc = stdHigh
      ? (MONTH_DESC[m] || "")
      : "Låg standardisering — inget förändras över tid";
    dom.status.innerHTML =
      `<span class="edl-tr-status-title">${title}</span>` +
      (desc ? `<span class="edl-tr-status-desc">${desc}</span>` : "");
    dom.status.hidden = false;
  }

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

  // --- Metrics (delta bara vid slutmånaden, mot förra klara körningen) --------

  function delta(cur, prevVal, lowerIsBetter) {
    if (prevVal == null) return "";
    const d = cur - prevVal;
    if (d === 0) return `<span class="edl-tr-delta">oförändrat</span>`;
    const better = lowerIsBetter ? d < 0 : d > 0;
    const arrow = d > 0 ? "▲" : "▼";
    const cls = better ? "edl-delta-better" : "edl-delta-worse";
    return `<span class="${cls}"> ${arrow} ${Math.abs(d)}</span>`;
  }

  function renderMetrics(point, isFinal) {
    if (!dom.metrics) return;
    const p = isFinal ? prev : null;
    const transitionCost = Math.max(0, point.leadTime - LOCAL_AVG);
    dom.metrics.innerHTML =
      metric("Genomsnittlig lead time", `${point.leadTime} dagar`,
        delta(point.leadTime, p && p.avg, true)) +
      metric("Variation mellan siter", `${point.variation} dagar`,
        delta(point.variation, p && p.variation, true)) +
      metric("Predictability", `${point.predictability}%`,
        delta(point.predictability, p && p.predictability, false)) +
      metric("Transition cost", transitionCost > 0 ? `+${transitionCost} dagar` : "0 dagar", "");
    dom.metrics.hidden = false;
  }

  function metric(label, value, deltaHtml) {
    return `<div class="edl-tr-metric">` +
      `<span class="edl-tr-mk">${label}:</span> ${value}${deltaHtml}</div>`;
  }

  // --- Milstolpe-event (dyker upp vid rätt månad, ligger kvar i historiken) ---

  // Milstolparna som en tidslinje: alla syns från start (○ väntar), markeras
  // aktiva (●) vid sin månad och klara (✓) när de passerats. Så ser man resan.
  function renderMilestoneTimeline(m) {
    if (!dom.events) return;
    if (!stdHigh) { dom.events.hidden = true; dom.events.innerHTML = ""; return; }
    dom.events.innerHTML = MILESTONES.map((ms) => {
      let state, marker, tag;
      if (m > ms.month) { state = "done"; marker = "✓"; tag = "klart"; }
      else if (m === ms.month) { state = "active"; marker = "●"; tag = "pågår"; }
      else { state = "pending"; marker = "○"; tag = ""; }
      return `<div class="edl-tr-event edl-tr-event-${state}">` +
        `<span class="edl-tr-event-marker" aria-hidden="true">${marker}</span>` +
        `<span class="edl-tr-event-body">` +
          `<strong>Månad ${ms.month}</strong> · ${ms.emoji} ${ms.label}` +
        `</span>` +
        (tag ? `<span class="edl-tr-event-tag">${tag}</span>` : "") +
      `</div>`;
    }).join("");
    dom.events.hidden = false;
  }

  function clearEvents() {
    if (dom.events) { dom.events.innerHTML = ""; dom.events.hidden = true; }
  }

  // --- Lärkort (visas när de blir relevanta under uppspelningen) --------------

  function maybeShowCards(m) {
    const C = window.EdLabCards;
    if (!C || !dom.cards) return;
    const s = fullSeries;
    // Variationen har börjat minska → förklara begreppet.
    if (!shownConcept && s[m].variation < s[0].variation) {
      C.showConcept("standardization", dom.cards);
      shownConcept = true;
    }
    // Lead time är fortfarande hög (vid sin topp) → förklara transitionskostnaden.
    if (!shownInsight && m === peakMonth && s[m].leadTime > s[0].leadTime) {
      C.showInsight("standardization_tradeoff", dom.cards);
      shownInsight = true;
    }
  }

  // --- Tidslinje-graf (byggs upp successivt) ----------------------------------
  const G = { W: 560, H: 150, padTop: 12, padBottom: 22, padX: 8 };
  const GSERIES = [
    { key: "variation",      stroke: "#b94a00", width: 1.8 },
    { key: "predictability", stroke: "#2da66a", width: 1.8 },
    { key: "leadTime",       stroke: "#4a6cf7", width: 2.0 }
  ];

  function renderGraph(series) {
    const svg = dom && dom.graph;
    if (!svg) return;
    if (!series || series.length < 2) {
      svg.hidden = true;
      svg.innerHTML = "";
      if (dom.graphScale) dom.graphScale.hidden = true;
      if (dom.graphEmpty) {
        dom.graphEmpty.hidden = false;
        dom.graphEmpty.textContent = series && series.length === 1
          ? "Transformationen startar…"
          : "Starta transformationen för att se förändringen månad för månad.";
      }
      return;
    }
    if (dom.graphEmpty) dom.graphEmpty.hidden = true;
    if (dom.graphScale) dom.graphScale.hidden = false;
    svg.hidden = false;

    const { W, H, padTop, padBottom, padX } = G;
    const yMax = 100; // dagar (< 100) och % delar 0–100-skala; formen är poängen
    const maxMonthShown = series[series.length - 1].month;
    const xOf = (m) => padX + (m / MONTHS) * (W - 2 * padX); // fast axel 0..6
    const yOf = (v) => H - padBottom - (v / yMax) * (H - padTop - padBottom);
    const path = (key) => series
      .map((d, i) => `${i ? "L" : "M"}${xOf(d.month).toFixed(1)},${yOf(d[key]).toFixed(1)}`)
      .join(" ");

    const grid = [0.25, 0.5, 0.75].map((p) => {
      const y = (padTop + (1 - p) * (H - padTop - padBottom)).toFixed(1);
      return `<line x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}" stroke="#eaeef5" stroke-width="0.5"/>`;
    }).join("");

    // Milstolpe-linjer, bara för de månader som redan passerats.
    let milestoneLines = "";
    if (stdHigh) {
      milestoneLines = MILESTONES.filter((ms) => ms.month <= maxMonthShown).map((ms) => {
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

    // Diskreta tidsaxel-markörer 0–6 så grafen går att koppla till månaderna.
    let axisTicks = "";
    for (let mo = 0; mo <= MONTHS; mo++) {
      const x = xOf(mo);
      axisTicks +=
        `<line x1="${x.toFixed(1)}" y1="${H - padBottom}" x2="${x.toFixed(1)}" ` +
        `y2="${(H - padBottom + 3).toFixed(1)}" stroke="#cdd3df" stroke-width="0.6"/>` +
        label(x, H - 5, "middle", String(mo));
    }

    svg.innerHTML =
      grid +
      milestoneLines +
      `<line x1="${padX}" y1="${H - padBottom}" x2="${W - padX}" y2="${H - padBottom}" stroke="#cdd3df" stroke-width="0.6"/>` +
      axisTicks +
      paths +
      label(W - padX, padTop + 2, "end", "jämförelseskala");
  }

  init();
  window.EdLabTransform = { start, reset };
})();
