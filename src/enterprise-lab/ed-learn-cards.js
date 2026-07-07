// --- Enterprise Delivery Lab: pedagogiska lärkort ---------------------------
// Ett litet, datadrivet pedagogiskt lager ovanpå experimenten. Simulatorn
// signalerar bara VAD som ska visas — showConcept("architecture_queue"),
// showPattern("bottleneck"), showInsight("bottleneck_relieved") — och den här
// modulen slår upp innehållet i EdLabDomain.LEARNING och renderar ett litet
// kort. Inga texter är hårdkodade här; allt innehåll bor i domänen.
//
// Idén (begrepp/mönster förklarade i korthet, kopplat till det man just gjorde)
// är lånad från OSS/BSS-simulatorns pedagogik — ingen UI- eller kodkopiering.
//
// Isolerat scope, self-init. Icke-kritiskt: saknas container gör modulen inget.

(function EdLabCardsModule() {
  "use strict";

  const TYPE_LABEL = { concept: "Begrepp", pattern: "Mönster", insight: "Varför?" };
  const BUCKET = { concept: "concepts", pattern: "patterns", insight: "insights" };

  let host = null;
  const shown = new Set(); // undvik dubblettkort i samma omgång

  function init() {
    host = document.getElementById("edl-cards");
    if (!host) return;
    console.info("[EdLabCards] ready");
  }

  function lookup(type, id) {
    const L = window.EdLabDomain && window.EdLabDomain.LEARNING;
    const bucket = L && L[BUCKET[type]];
    return (bucket && bucket[id]) || null;
  }

  function add(type, id) {
    if (!host) return;
    const key = `${type}:${id}`;
    if (shown.has(key)) return;
    const card = lookup(type, id);
    if (!card) {
      console.warn(`[EdLabCards] okänt lärkort "${key}" — inget att visa.`);
      return;
    }
    shown.add(key);

    const el = document.createElement("div");
    el.className = `edl-card edl-card-${type}`;
    el.innerHTML =
      `<div class="edl-card-tag">${TYPE_LABEL[type]}</div>` +
      `<div class="edl-card-title">${escapeHtml(card.title)}</div>` +
      `<p class="edl-card-body">${escapeHtml(card.body)}</p>`;
    host.appendChild(el);
    host.hidden = false;
  }

  function clear() {
    shown.clear();
    if (host) { host.innerHTML = ""; host.hidden = true; }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  init();

  window.EdLabCards = {
    showConcept: (id) => add("concept", id),
    showPattern: (id) => add("pattern", id),
    showInsight: (id) => add("insight", id),
    clear
  };
})();
