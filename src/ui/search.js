// --- Search (client-side, lightweight) --------------------------------------
// Söker över GLOSSARY-entries, PATTERNS (theory/process/automation/product),
// SYSTEMS, och README/REALISM_NOTES (sektion för sektion baserat på H1/H2/H3-
// headings). Inga externa beroenden, inget backend. Case-insensitive
// substring-match med title-prioritet.
//
// Indexstrategi: glossary/patterns/systems byggs synkront vid setupSearch()
// så första tangenttrycket har full täckning av in-memory-data. README och
// REALISM_NOTES fetchas och parsas asynkront i bakgrunden och pushas till
// SEARCH_INDEX när klart — om användaren redan har en aktiv query när det
// händer rerendrar vi resultaten automatiskt.

let SEARCH_INDEX = null;
let docsIndexed = false;
const SEARCH_RESULT_LIMIT = 20;
const SEARCH_MIN_QUERY = 2;

const DOCS_TO_INDEX = [
  { id: "readme",   title: "README",                    path: "README.md" },
  { id: "telecom",  title: "Telecom-domänen",           path: "docs/telecom-theory.md" },
  { id: "flow",     title: "Flow och systems thinking", path: "docs/flow-systems-thinking.md" },
  { id: "pedagogy", title: "Pedagogisk filosofi",       path: "docs/learning-philosophy.md" },
  { id: "realism",  title: "Realism Notes",             path: "REALISM_NOTES.md" }
];

function escapeSearchHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeSearchRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Same slugify-algoritm som docs.js använder för heading-anchors. Duplicerat
// här för att search.js inte ska behöva läsa intern state från docs.js — om
// docs.js någonsin ändrar slugify-regler måste den här uppdateras också.
function searchSlugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\wÀ-ſ\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Strippar lättviktig markdown (inline-formatering, länkar, taggar) från en
// rad innan den läggs i body-text-poolen. Behåller läsbar text för snippets
// och matchning utan att lägga markdown-syntax i query-resultaten.
function stripMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// Splittar markdown-content per heading (#/##/###). Varje sektion blir en
// search-item med title = heading-text, body = text till nästa heading.
// Pre-heading content samlas under doc.title som "intro".
function parseDocSections(doc, md) {
  // Strip YAML frontmatter (samma logik som docs.js renderMarkdown)
  md = md.replace(/^---\n[\s\S]*?\n---\n/, "");

  const sections = [];
  let currentTitle = doc.title;
  let currentBody = [];
  let inCodeFence = false;

  const flush = () => {
    const body = currentBody.join(" ").replace(/\s+/g, " ").trim();
    if (body.length === 0 && sections.length > 0) return; // skip empty sub-sections (except intro)
    sections.push({
      key: doc.id + "/" + searchSlugify(currentTitle),
      type: "doc",
      docId: doc.id,
      docTitle: doc.title,
      anchor: searchSlugify(currentTitle),
      title: currentTitle,
      body,
      typeLabel: doc.title
    });
  };

  for (const rawLine of md.split("\n")) {
    const line = rawLine;
    // Track fenced code blocks so '#' inside code isn't treated as heading
    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) {
      if (line.trim()) currentBody.push(line.trim());
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flush();
      currentTitle = stripMarkdown(h[2]);
      currentBody = [];
    } else if (line.trim()) {
      currentBody.push(stripMarkdown(line));
    }
  }
  flush();
  return sections;
}

async function indexDocs() {
  const buckets = await Promise.all(DOCS_TO_INDEX.map(async d => {
    try {
      const res = await fetch(d.path);
      if (!res.ok) return [];
      const md = await res.text();
      return parseDocSections(d, md);
    } catch (e) {
      return [];
    }
  }));
  return buckets.flat();
}

function buildSearchIndex() {
  const items = [];

  // Glossary: title + body + why
  if (typeof GLOSSARY === "object" && GLOSSARY) {
    Object.entries(GLOSSARY).forEach(([key, def]) => {
      if (!def || !def.title) return;
      items.push({
        key,
        type: "glossary",
        title: def.title,
        body: [def.body, def.why].filter(Boolean).join(" — "),
        typeLabel: "Begrepp"
      });
    });
  }

  // Patterns: title + body, mode tied to group
  if (typeof PATTERNS === "object" && PATTERNS) {
    Object.entries(PATTERNS).forEach(([key, p]) => {
      if (!p || !p.title) return;
      const groupLabel = p.group === "process" || p.group === "automation"
        ? "Optimize" : "Learn";
      items.push({
        key,
        type: "pattern",
        title: p.title,
        body: p.body || "",
        group: p.group,
        groupLabel,
        typeLabel: "Mönster"
      });
    });
  }

  // Systems: name + what + why + problems
  if (typeof SYSTEMS === "object" && SYSTEMS) {
    Object.entries(SYSTEMS).forEach(([id, s]) => {
      if (!s || !s.name) return;
      items.push({
        key: id,
        type: "system",
        title: s.name,
        body: [s.what, s.why, s.problems].filter(Boolean).join(" — "),
        typeLabel: "System"
      });
    });
  }

  return items;
}

function searchFor(query) {
  if (!SEARCH_INDEX) SEARCH_INDEX = buildSearchIndex();
  const q = query.trim().toLowerCase();
  if (q.length < SEARCH_MIN_QUERY) return [];

  const matches = [];
  for (const item of SEARCH_INDEX) {
    const title = item.title.toLowerCase();
    const body = item.body.toLowerCase();
    const titleMatch = title.includes(q);
    const bodyMatch = body.includes(q);
    if (!titleMatch && !bodyMatch) continue;
    // Title hit scores higher than body hit; exact term match in title
    // (own word) scores higher still.
    let score = (titleMatch ? 10 : 0) + (bodyMatch ? 1 : 0);
    if (titleMatch) {
      const wordRe = new RegExp("\\b" + escapeSearchRegex(q) + "\\b", "i");
      if (wordRe.test(item.title)) score += 5;
    }
    matches.push({ ...item, score });
  }
  matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return matches;
}

function highlightMatch(text, query) {
  const safe = escapeSearchHtml(text);
  if (!query) return safe;
  const re = new RegExp("(" + escapeSearchRegex(query) + ")", "gi");
  return safe.replace(re, "<mark>$1</mark>");
}

function makeSnippet(body, query, ctxLen = 60) {
  if (!body) return "";
  const lower = body.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) {
    const head = body.slice(0, ctxLen * 2);
    return escapeSearchHtml(head) + (body.length > head.length ? "…" : "");
  }
  const start = Math.max(0, idx - ctxLen);
  const end = Math.min(body.length, idx + q.length + ctxLen);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < body.length ? "…" : "";
  return prefix + highlightMatch(body.slice(start, end), query) + suffix;
}

function renderSearchResults(results, query) {
  const wrap = document.getElementById("search-results");
  if (!wrap) return;
  if (!query || query.length < SEARCH_MIN_QUERY) {
    wrap.classList.add("hidden");
    wrap.innerHTML = "";
    return;
  }
  if (results.length === 0) {
    wrap.innerHTML = `<div class="search-empty">Ingen träff hittades.</div>`;
    wrap.classList.remove("hidden");
    return;
  }
  const limited = results.slice(0, SEARCH_RESULT_LIMIT);
  const overflow = results.length > SEARCH_RESULT_LIMIT
    ? `<div class="search-more">+${results.length - SEARCH_RESULT_LIMIT} fler träffar — förfina sökningen</div>` : "";
  wrap.innerHTML = `
    <div class="search-count">${results.length} träff${results.length === 1 ? "" : "ar"}</div>
    <div class="search-list" role="listbox">
      ${limited.map((r, i) => `
        <button type="button" class="search-result" data-idx="${i}" role="option">
          <div class="search-result-head">
            <span class="search-result-title">${highlightMatch(r.title, query)}</span>
            <span class="search-result-type">${r.typeLabel}${r.groupLabel ? " · " + r.groupLabel : ""}</span>
          </div>
          <div class="search-result-snippet">${makeSnippet(r.body, query)}</div>
        </button>
      `).join("")}
    </div>
    ${overflow}
  `;
  wrap.classList.remove("hidden");

  // Click → navigate to the right view and show the content
  wrap.querySelectorAll(".search-result").forEach((btn, i) => {
    btn.addEventListener("click", () => navigateToResult(limited[i], btn));
  });
}

// Tillfällig visuell wayfinder efter klick på sökresultat. Pulsar bakgrund +
// vänsterborder via CSS-animation. Vid upprepade klick på samma element:
// ta bort klassen → force reflow → lägg på igen så animationen retriggas.
function highlightSearchTarget(el) {
  if (!el) return;
  // Rensa eventuella tidigare highlights på andra element så bara den senaste
  // träffen pulsar — undviker att två highlights överlappar om användaren
  // klickar flera resultat i snabb följd.
  document.querySelectorAll(".search-target-highlight").forEach(other => {
    if (other === el) return;
    other.classList.remove("search-target-highlight");
    if (other._searchHlTimer) {
      clearTimeout(other._searchHlTimer);
      other._searchHlTimer = null;
    }
  });
  el.classList.remove("search-target-highlight");
  void el.offsetWidth; // force reflow så CSS-animation startar om
  el.classList.add("search-target-highlight");
  if (el._searchHlTimer) clearTimeout(el._searchHlTimer);
  el._searchHlTimer = setTimeout(() => {
    el.classList.remove("search-target-highlight");
    el._searchHlTimer = null;
  }, 2500);
}

function expandGlossaryInline(result, btn) {
  // Replace the clipped snippet with the full body so the user can read the
  // whole definition without leaving the search dropdown. Idempotent: clicking
  // an already-expanded result is harmless.
  const snippet = btn?.querySelector(".search-result-snippet");
  if (!snippet) return;
  snippet.innerHTML = escapeSearchHtml(result.body);
  btn.classList.add("search-result-expanded");
}

function navigateToResult(result, btn) {
  // Glossary: try to upgrade to a richer view if there's a matching pattern
  // or system with the same key (true for ~80 % of glossary entries). Only
  // when no richer source exists do we expand the snippet inline so the user
  // sees the full body in the dropdown.
  if (result.type === "glossary") {
    if (typeof PATTERNS === "object" && PATTERNS[result.key]) {
      const p = PATTERNS[result.key];
      const targetMode = (p.group === "process" || p.group === "automation") ? "optimize" : "learn";
      if (!document.body.classList.contains("mode-" + targetMode)) {
        const tab = document.querySelector(`.mode-tab[data-mode="${targetMode}"]`);
        if (tab) tab.click();
      }
      if (typeof showLearningPattern === "function") showLearningPattern(result.key);
      const aside = document.querySelector(".layout > aside");
      if (aside) aside.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => highlightSearchTarget(document.getElementById("learning")), 80);
      hideSearchResults();
      return;
    }
    if (typeof SYSTEMS === "object" && SYSTEMS[result.key]) {
      if (!document.body.classList.contains("mode-learn")) {
        const tab = document.querySelector('.mode-tab[data-mode="learn"]');
        if (tab) tab.click();
      }
      if (typeof showLearningSystem === "function") showLearningSystem(result.key);
      const aside = document.querySelector(".layout > aside");
      if (aside) aside.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        const card = document.getElementById("sys-" + result.key);
        highlightSearchTarget(card || document.getElementById("learning"));
      }, 80);
      hideSearchResults();
      return;
    }
    // Pure glossary entry without a richer source — show full body inline.
    expandGlossaryInline(result, btn);
    return;
  }

  // Doc-results: byt till Documentation-mode, ladda rätt doc-tab, vänta tills
  // markdown är renderad och scrolla till section-anchor. Cachad doc renderar
  // synkront; kall fetch tar typiskt < 500 ms — 350 ms räcker normalt, om
  // anchor saknas vid första försöket retry vi en gång.
  if (result.type === "doc") {
    // Ordning är viktig: showDoc först så currentDocId i docs.js sätts till
    // rätt doc INNAN mode-tab-handlern (i app.js) kör sitt showDoc(currentDocId).
    // Annars race:ar två loadDoc-fetcher och fel doc kan vinna.
    if (typeof showDoc === "function") showDoc(result.docId);
    const tab = document.querySelector('.mode-tab[data-mode="docs"]');
    if (tab && !document.body.classList.contains("mode-docs")) tab.click();
    const scrollWhenReady = (retries = 8) => {
      const target = document.getElementById(result.anchor);
      if (target) {
        // Säkerställ att TOC-gruppen som innehåller denna anchor är expanderad
        // så användaren ser var i innehållet target ligger.
        if (typeof expandTocGroupFor === "function") {
          expandTocGroupFor(document.getElementById("docs-toc"), result.anchor);
        }
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        highlightSearchTarget(target);
      } else if (retries > 0) {
        setTimeout(() => scrollWhenReady(retries - 1), 120);
      } else {
        // Anchor saknas — highlighta docs-panelen som container-fallback
        highlightSearchTarget(document.getElementById("docs-panel"));
      }
    };
    setTimeout(() => scrollWhenReady(), 200);
    hideSearchResults();
    return;
  }

  const targetMode = result.type === "pattern"
    ? (result.group === "process" || result.group === "automation" ? "optimize" : "learn")
    : "learn";

  // Mode-switch via clicking the real tab so its existing freeze/UI logic
  // runs (refreshLearningForMode etc.).
  const currentlyOptimize = document.body.classList.contains("mode-optimize");
  const currentlyLearn = document.body.classList.contains("mode-learn");
  const needsSwitch =
    (targetMode === "learn" && !currentlyLearn) ||
    (targetMode === "optimize" && !currentlyOptimize);
  if (needsSwitch) {
    const tab = document.querySelector(`.mode-tab[data-mode="${targetMode}"]`);
    if (tab) tab.click();
  }

  // Show in the learning panel using existing helpers from learning.js.
  if (result.type === "system" && typeof showLearningSystem === "function") {
    showLearningSystem(result.key);
  } else if (result.type === "pattern" && typeof showLearningPattern === "function") {
    showLearningPattern(result.key);
  }

  // Scroll the learning aside into view (helpful when user was deep in the
  // page when they searched).
  const aside = document.querySelector(".layout > aside");
  if (aside) aside.scrollIntoView({ behavior: "smooth", block: "start" });

  // Visual wayfinder: system → system-card in the map; pattern → learning panel.
  setTimeout(() => {
    if (result.type === "system") {
      const card = document.getElementById("sys-" + result.key);
      highlightSearchTarget(card || document.getElementById("learning"));
    } else {
      highlightSearchTarget(document.getElementById("learning"));
    }
  }, 80);

  hideSearchResults();
}

function hideSearchResults() {
  const wrap = document.getElementById("search-results");
  if (wrap) {
    wrap.classList.add("hidden");
    wrap.innerHTML = "";
  }
}

function setupSearch() {
  const input = document.getElementById("search-input");
  const clear = document.getElementById("search-clear");
  if (!input) return;

  // Sync-bygg index direkt — glossary/patterns/systems är in-memory och
  // tillgängliga vid scriptladdning. Docs läggs till senare async.
  SEARCH_INDEX = buildSearchIndex();

  // Fire-and-forget: indexera README och REALISM_NOTES i bakgrunden.
  // Om användaren redan har en aktiv query när det är klart, rerendrar vi
  // resultaten så docs-träffar dyker upp automatiskt.
  indexDocs().then(docItems => {
    if (!SEARCH_INDEX) SEARCH_INDEX = [];
    SEARCH_INDEX.push(...docItems);
    docsIndexed = true;
    const currentQuery = input.value.trim();
    if (currentQuery.length >= SEARCH_MIN_QUERY) {
      renderSearchResults(searchFor(currentQuery), currentQuery);
    }
  }).catch(() => { /* docs unavailable (file://?) — sync index still works */ });

  let debounce;
  const runSearch = () => {
    const q = input.value.trim();
    if (clear) clear.classList.toggle("hidden", !q);
    if (q.length < SEARCH_MIN_QUERY) {
      hideSearchResults();
      return;
    }
    const results = searchFor(q);
    renderSearchResults(results, q);
  };

  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(runSearch, 80);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      input.value = "";
      if (clear) clear.classList.add("hidden");
      hideSearchResults();
      input.blur();
    }
  });

  // Re-open results when user refocuses on a populated input
  input.addEventListener("focus", () => {
    if (input.value.trim().length >= SEARCH_MIN_QUERY) runSearch();
  });

  if (clear) {
    clear.addEventListener("click", () => {
      input.value = "";
      clear.classList.add("hidden");
      hideSearchResults();
      input.focus();
    });
  }

  // Click outside search-bar closes results
  document.addEventListener("click", e => {
    if (!e.target.closest(".search-bar")) hideSearchResults();
  });
}
