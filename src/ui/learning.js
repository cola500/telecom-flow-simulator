// --- Learning panel ---------------------------------------------------------
// Right-hand-side panel that explains a clicked system or pattern.
// Reads SYSTEMS and PATTERNS from scenarios.js.

const learningEl = document.getElementById("learning");

function patternList() {
  return `
    <div class="pattern-list">
      <h4>Process patterns</h4>
      <button class="pattern-link" data-pattern="handoffs">Varför handoffs skapar friktion</button>
      <button class="pattern-link" data-pattern="inventory">Varför inventory blir source-of-truth-problem</button>
      <button class="pattern-link" data-pattern="downstream">Varför provisioningfel skapar downstream incidents</button>
      <button class="pattern-link" data-pattern="queueing">Queueing theory på 60 sekunder</button>
      <button class="pattern-link" data-pattern="utilization">Varför hög utilization är farligt</button>
      <button class="pattern-link" data-pattern="flow_efficiency">Resource efficiency vs flow efficiency</button>
    </div>
    <div class="pattern-list">
      <h4>Order decomposition</h4>
      <button class="pattern-link" data-pattern="customer_order">What is a Customer Order?</button>
      <button class="pattern-link" data-pattern="service_order">What is a Service Order?</button>
      <button class="pattern-link" data-pattern="resource_order">What is a Resource Order?</button>
      <button class="pattern-link" data-pattern="activation">What is Activation?</button>
      <button class="pattern-link" data-pattern="decomposition_why">Why decomposition matters</button>
    </div>`;
}

function showLearningEmpty() {
  learningEl.innerHTML = `
    <p class="empty">Klicka på en domän till vänster eller på ett event i loggen för att läsa förklaringen här.</p>
    ${patternList()}`;
  wirePatterns();
}

function showLearningSystem(systemId) {
  const s = SYSTEMS[systemId];
  if (!s) return;
  learningEl.innerHTML = `
    <a class="back" id="back-link">← Tillbaka</a>
    <h3>${s.name}</h3>
    <span class="layer-tag ${s.layer}">${s.layer.toUpperCase()}</span>
    <section><h4>Vad gör systemet?</h4><p>${s.what}</p></section>
    <section><h4>Varför behövs det?</h4><p>${s.why}</p></section>
    <section><h4>Typiska problem & förbättringsfrågor</h4><p>${s.problems}</p></section>
    ${patternList()}`;
  wirePatterns();
  document.getElementById("back-link").addEventListener("click", showLearningEmpty);
}

function showLearningPattern(key) {
  const p = PATTERNS[key];
  if (!p) return;
  learningEl.innerHTML = `
    <a class="back" id="back-link">← Tillbaka</a>
    <h3>${p.title}</h3>
    <section><p>${p.body}</p></section>
    ${patternList()}`;
  wirePatterns();
  document.getElementById("back-link").addEventListener("click", showLearningEmpty);
}

function wirePatterns() {
  learningEl.querySelectorAll(".pattern-link").forEach(btn => {
    btn.addEventListener("click", () => showLearningPattern(btn.dataset.pattern));
  });
}
