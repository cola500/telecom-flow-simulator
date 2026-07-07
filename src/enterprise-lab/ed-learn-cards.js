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

  let defaultHost = null;
  const shown = new Set(); // undvik dubblettkort per container (nyckel: hostId:type:id)

  function init() {
    defaultHost = document.getElementById("edl-cards");
    if (defaultHost) console.info("[EdLabCards] ready");
  }

  // Låter flera sektioner (systemexperiment, transformation, …) dela modulen
  // men rendera i var sin container. host kan vara ett element, ett id, eller
  // utelämnas för default (#edl-cards).
  function resolveHost(host) {
    if (host && host.nodeType) return host;
    if (typeof host === "string") return document.getElementById(host);
    return defaultHost;
  }

  function lookup(type, id) {
    const L = window.EdLabDomain && window.EdLabDomain.LEARNING;
    const bucket = L && L[BUCKET[type]];
    return (bucket && bucket[id]) || null;
  }

  function add(type, id, hostArg) {
    const host = resolveHost(hostArg);
    if (!host) return;
    const key = `${host.id}:${type}:${id}`;
    if (shown.has(key)) return;
    const card = lookup(type, id);
    if (!card) {
      console.warn(`[EdLabCards] okänt lärkort "${type}:${id}" — inget att visa.`);
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

  function clear(hostArg) {
    const host = resolveHost(hostArg);
    if (!host) return;
    host.innerHTML = "";
    host.hidden = true;
    for (const key of Array.from(shown)) {
      if (key.indexOf(host.id + ":") === 0) shown.delete(key);
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  init();

  window.EdLabCards = {
    showConcept: (id, host) => add("concept", id, host),
    showPattern: (id, host) => add("pattern", id, host),
    showInsight: (id, host) => add("insight", id, host),
    clear
  };
})();
