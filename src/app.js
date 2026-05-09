// --- App bootstrap + UI wiring ----------------------------------------------
// Loads last so every other module's globals are already in scope. Renders the
// initial system map + learning panel, then wires up controls (toggles,
// capacity buttons, simulation buttons).

renderSystems();
showLearningEmpty();

// --- Automation toggle -------------------------------------------------------
automationToggle.addEventListener("change", () => {
  automationEnabled = automationToggle.checked;
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

// --- Simulation controls -----------------------------------------------------
document.getElementById("btn-happy").addEventListener("click",
  () => runFlow(HAPPY_PATH, "happy path", "happy"));
document.getElementById("btn-batch-5").addEventListener("click", () => startParallel(5));
document.getElementById("btn-batch-20").addEventListener("click", () => startParallel(20));
document.getElementById("btn-fail-resource").addEventListener("click",
  () => runFlow(FAIL_RESOURCE, "ResourceUnavailable", "resource"));
document.getElementById("btn-fail-prov").addEventListener("click",
  () => runFlow(FAIL_PROV, "ActivationRejected", "prov"));
document.getElementById("btn-reset").addEventListener("click", fullReset);
