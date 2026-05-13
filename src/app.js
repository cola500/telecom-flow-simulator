// --- App bootstrap + UI wiring ----------------------------------------------
// Loads last so every other module's globals are already in scope. Renders the
// initial system map + learning panel, then wires up controls (toggles,
// capacity buttons, simulation buttons).

renderSystems();
showLearningEmpty();
renderDecomposition("fiber"); // initial product — wirar noder + syncar badge
wireDocsTabs(); // wirar docs-flik-knapparna (lazy-load doc vid mode-byte)
wireInfoIcons(); // event-delegerar klick på alla .info-icon-knappar
setupSearch();   // header-search över GLOSSARY + PATTERNS + SYSTEMS
renderReflection(); // initial empty-state-frågor i Reflection-panelen
if (window.Experiment) window.Experiment.init(); // Toyota Kata-loopen i Optimize Process

// --- Mode tabs (Learn OSS/BSS / Optimize Process / Documentation) -----------
// Mode-byte är fryst under run så användaren inte tappar UI mitt i en batch.
document.querySelectorAll(".mode-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    if (parallelSim && parallelSim.intervalId) return; // freeze during run
    document.querySelectorAll(".mode-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.body.classList.remove("mode-learn", "mode-optimize", "mode-docs");
    document.body.classList.add("mode-" + btn.dataset.mode);
    // Filtrera learning-panelen till patterns för aktivt mode
    refreshLearningForMode();
    // Vid byte till docs: ladda aktuellt dokument (cachad efter första gången)
    if (btn.dataset.mode === "docs") showDoc(currentDocId);
  });
});

// Liten helper: notifiera experiment-modulen om att settings/state ändrats,
// så "Ändringar sedan förra körningen" och prediction-textens uppdateras live.
function notifyExperimentOfChange() {
  if (window.Experiment) window.Experiment.refresh();
}

// --- Automation toggle -------------------------------------------------------
automationToggle.addEventListener("change", () => {
  automationEnabled = automationToggle.checked;
  notifyExperimentOfChange();
});

// --- Provisioning automation toggle -----------------------------------------
provAutomationToggle.addEventListener("change", () => {
  provAutomationEnabled = provAutomationToggle.checked;
  syncProvModeBadge();
  notifyExperimentOfChange();
});

// --- Resource Inventory capacity --------------------------------------------
document.querySelectorAll("#capacity-buttons .cap-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (parallelSim && parallelSim.intervalId) return; // freeze during run
    document.querySelectorAll("#capacity-buttons .cap-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    workersPerSystem.ri = parseInt(btn.dataset.workers, 10);
    notifyExperimentOfChange();
  });
});

// --- Provisioning / Activation capacity -------------------------------------
document.querySelectorAll("#prov-capacity-buttons .cap-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (parallelSim && parallelSim.intervalId) return; // freeze during run
    document.querySelectorAll("#prov-capacity-buttons .cap-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    workersPerSystem.prov = parseInt(btn.dataset.workers, 10);
    notifyExperimentOfChange();
  });
});

// --- Variability slider -----------------------------------------------------
document.querySelectorAll("#variability-buttons .cap-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (parallelSim && parallelSim.intervalId) return; // freeze during run
    document.querySelectorAll("#variability-buttons .cap-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    variabilityPct = parseInt(btn.dataset.variability, 10);
    notifyExperimentOfChange();
  });
});

// --- Backpressure toggle ----------------------------------------------------
backpressureToggle.addEventListener("change", () => {
  backpressureEnabled = backpressureToggle.checked;
  notifyExperimentOfChange();
});

// --- Order decomposition: product selector ----------------------------------
// Klick på en produktknapp re-renderar trädet/exemplet/failure-modes.
// Frysning under run är inte nödvändig (decomp påverkar inte engine), men
// vi följer mönstret från capacity-buttons för konsekvens.
document.querySelectorAll("#product-buttons .cap-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#product-buttons .cap-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderDecomposition(btn.dataset.product);
    notifyExperimentOfChange();
  });
});

// --- Simulation controls -----------------------------------------------------
// Batch-knapparna anropar Experiment.beginRun(N) FÖRE startParallel så att
// modulen hinner snapshotta settings + frysa "Förväntat"-texten innan engine
// rensar UI-state.
document.getElementById("btn-happy").addEventListener("click",
  () => runFlow(happyPathFor(currentProductId), "happy path", "happy"));
document.getElementById("btn-batch-5").addEventListener("click", () => {
  if (window.Experiment) window.Experiment.beginRun(5);
  startParallel(5);
});
document.getElementById("btn-batch-20").addEventListener("click", () => {
  if (window.Experiment) window.Experiment.beginRun(20);
  startParallel(20);
});
document.getElementById("btn-fail-resource").addEventListener("click",
  () => runFlow(failResourceFor(currentProductId), "ResourceUnavailable", "resource"));
document.getElementById("btn-fail-prov").addEventListener("click",
  () => runFlow(failProvFor(currentProductId), "ActivationRejected", "prov"));
document.getElementById("btn-reset").addEventListener("click", () => {
  fullReset();
  if (window.Experiment) window.Experiment.onReset();
});

// --- Collapsible Learn-mode panels ------------------------------------------
// Persist open/closed state per panel id i localStorage. Om localStorage är
// otillgängligt (private mode etc.) faller vi tillbaka på HTML-defaulten.
document.querySelectorAll("details.collapsible[id]").forEach(d => {
  const key = `collapsed:${d.id}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored === "open") d.setAttribute("open", "");
    else if (stored === "closed") d.removeAttribute("open");
  } catch (e) { /* localStorage unavailable — keep HTML default */ }
  d.addEventListener("toggle", () => {
    try { localStorage.setItem(key, d.open ? "open" : "closed"); }
    catch (e) { /* ignore */ }
  });
});

// --- Page navigation helpers ------------------------------------------------
// Back-to-top: floating button som dyker upp efter att användaren scrollat
// förbi ~400 px. Expand/Collapse all: togglar alla details.collapsible[id]
// samtidigt (bra när långa sektioner gör sidan oöverblickbar).
const backToTopBtn = document.getElementById("back-to-top");
if (backToTopBtn) {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      backToTopBtn.classList.toggle("visible", window.scrollY > 400);
      ticking = false;
    });
  }, { passive: true });
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

document.getElementById("btn-expand-all")?.addEventListener("click", () => {
  document.querySelectorAll("details.collapsible[id]").forEach(d => d.setAttribute("open", ""));
});
document.getElementById("btn-collapse-all")?.addEventListener("click", () => {
  document.querySelectorAll("details.collapsible[id]").forEach(d => d.removeAttribute("open"));
});
