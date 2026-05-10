// --- App bootstrap + UI wiring ----------------------------------------------
// Loads last so every other module's globals are already in scope. Renders the
// initial system map + learning panel, then wires up controls (toggles,
// capacity buttons, simulation buttons).

renderSystems();
showLearningEmpty();
renderDecomposition("fiber"); // initial product — wirar noder + syncar badge
wireDocsTabs(); // wirar docs-flik-knapparna (lazy-load doc vid mode-byte)
wireInfoIcons(); // event-delegerar klick på alla .info-icon-knappar

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

// --- Automation toggle -------------------------------------------------------
automationToggle.addEventListener("change", () => {
  automationEnabled = automationToggle.checked;
});

// --- Provisioning automation toggle -----------------------------------------
provAutomationToggle.addEventListener("change", () => {
  provAutomationEnabled = provAutomationToggle.checked;
  syncProvModeBadge();
});

// --- Resource Inventory capacity --------------------------------------------
document.querySelectorAll("#capacity-buttons .cap-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (parallelSim && parallelSim.intervalId) return; // freeze during run
    document.querySelectorAll("#capacity-buttons .cap-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    workersPerSystem.ri = parseInt(btn.dataset.workers, 10);
  });
});

// --- Provisioning / Activation capacity -------------------------------------
document.querySelectorAll("#prov-capacity-buttons .cap-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (parallelSim && parallelSim.intervalId) return; // freeze during run
    document.querySelectorAll("#prov-capacity-buttons .cap-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    workersPerSystem.prov = parseInt(btn.dataset.workers, 10);
  });
});

// --- Variability slider -----------------------------------------------------
document.querySelectorAll("#variability-buttons .cap-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (parallelSim && parallelSim.intervalId) return; // freeze during run
    document.querySelectorAll("#variability-buttons .cap-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    variabilityPct = parseInt(btn.dataset.variability, 10);
  });
});

// --- Backpressure toggle ----------------------------------------------------
backpressureToggle.addEventListener("change", () => {
  backpressureEnabled = backpressureToggle.checked;
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
  });
});

// --- Simulation controls -----------------------------------------------------
document.getElementById("btn-happy").addEventListener("click",
  () => runFlow(happyPathFor(currentProductId), "happy path", "happy"));
document.getElementById("btn-batch-5").addEventListener("click", () => startParallel(5));
document.getElementById("btn-batch-20").addEventListener("click", () => startParallel(20));
document.getElementById("btn-fail-resource").addEventListener("click",
  () => runFlow(failResourceFor(currentProductId), "ResourceUnavailable", "resource"));
document.getElementById("btn-fail-prov").addEventListener("click",
  () => runFlow(failProvFor(currentProductId), "ActivationRejected", "prov"));
document.getElementById("btn-reset").addEventListener("click", fullReset);

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
