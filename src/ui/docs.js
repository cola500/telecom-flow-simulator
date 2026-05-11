// --- Docs viewer ------------------------------------------------------------
// Minimal markdown-renderare för in-app läsning av README och REALISM_NOTES.
// Inga externa beroenden. Stödjer det vi faktiskt använder i våra docs:
//   headings (#…######), paragraphs, bullet/numbered lists, **bold**,
//   *italic*, ~~strikethrough~~, `inline code`, ```fenced code blocks```,
//   > blockquotes (multi-rad), | tables |, [links](url).
// Frontmatter (--- ... ---) strippas. Direct HTML-tags i markdown lämnas
// orörda (våra docs är trusted källor).

const DOCS = [
  { id: "readme",     title: "README",                    path: "README.md" },
  { id: "telecom",    title: "Telecom-domänen",           path: "docs/telecom-theory.md" },
  { id: "flow",       title: "Flow och systems thinking", path: "docs/flow-systems-thinking.md" },
  { id: "pedagogy",   title: "Pedagogisk filosofi",       path: "docs/learning-philosophy.md" },
  { id: "realism",    title: "Realism och förenklingar",  path: "REALISM_NOTES.md" }
];

const docsCache = {};
let currentDocId = "readme";

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Plocka ut code-spans först (med placeholder) så att inline-formatering
// inte påverkar deras innehåll. Resten formateras i ordning: bold, italic,
// strikethrough, links. Sen återställs code-spans.
function formatInline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\x00CODE${codes.length - 1}\x00`;
  });
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+?)\*/g, "<em>$1</em>");
  s = s.replace(/~~(.+?)~~/g, "<del>$1</del>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\x00CODE(\d+)\x00/g, (_, i) => codes[+i]);
  return s;
}

function parseTableRow(line) {
  // Ta cells mellan första och sista pipe, trim varje. Tom-strängar tillåts.
  return line.split("|").slice(1, -1).map(c => c.trim());
}

function renderMarkdown(md) {
  // Strippa YAML frontmatter
  md = md.replace(/^---\n[\s\S]*?\n---\n/, "");

  const lines = md.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      out.push(`<pre><code${lang ? ` class="lang-${lang}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      out.push(`<h${h[1].length}>${formatInline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }

    // Blockquote (sammanslagna rader)
    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${formatInline(quote.join(" "))}</blockquote>`);
      continue;
    }

    // Tabell (rad börjar med | + nästa rad är separator |---|---|)
    if (line.startsWith("|") && lines[i + 1] && /^\|[\s|:\-]+\|$/.test(lines[i + 1])) {
      const headerCells = parseTableRow(line);
      i += 2; // hoppa header + separator
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      const head = `<thead><tr>${headerCells.map(c => `<th>${formatInline(c)}</th>`).join("")}</tr></thead>`;
      const body = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${formatInline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
      out.push(`<table>${head}${body}</table>`);
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      out.push(`<ul>${items.map(x => `<li>${formatInline(x)}</li>`).join("")}</ul>`);
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      out.push(`<ol>${items.map(x => `<li>${formatInline(x)}</li>`).join("")}</ol>`);
      continue;
    }

    // Tom rad — flusha och fortsätt
    if (line.trim() === "") { i++; continue; }

    // Paragraf — samla consecutive non-block-rader
    const para = [];
    while (i < lines.length && lines[i].trim() !== "" &&
           !lines[i].startsWith("#") && !lines[i].startsWith(">") &&
           !lines[i].startsWith("|") && !/^[-*]\s+/.test(lines[i]) &&
           !/^\d+\.\s+/.test(lines[i]) && !lines[i].startsWith("```")) {
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) out.push(`<p>${formatInline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}

// Slug från heading-text för anchor-IDs. Lowercase, behåll svenska
// bokstäver (åäö), ersätt whitespace med "-", strippa övrig punctuation.
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\wÀ-ſ\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Sätt unika id:n på alla h1/h2/h3 i content. Duplicate texter får suffix
// "-2", "-3" osv så TOC-länkar pekar rätt.
function applyHeadingIds(contentEl) {
  const seen = {};
  contentEl.querySelectorAll("h1, h2, h3").forEach(h => {
    const base = slugify(h.textContent) || "section";
    let id = base;
    if (seen[base]) id = `${base}-${++seen[base]}`;
    else seen[base] = 1;
    h.id = id;
  });
}

// Bygg TOC-HTML grupperat: H1/H2 = parents (alltid synliga), H3 = children
// under närmaste föregående parent. Parents med H3-children får en collapse-
// toggle. Default expanderat — collapsa är opt-in via toggle-klick.
function buildToc(contentEl) {
  const headings = contentEl.querySelectorAll("h1, h2, h3");
  if (headings.length === 0) return "";

  const groups = [];
  let current = null;
  headings.forEach(h => {
    const level = parseInt(h.tagName.slice(1), 10);
    if (level <= 2) {
      current = { heading: h, level, children: [] };
      groups.push(current);
    } else if (current) {
      current.children.push(h);
    } else {
      // H3 utan föregående parent — egen liten grupp utan children
      groups.push({ heading: h, level, children: [] });
    }
  });

  const items = groups.map(g => {
    const href = `#${g.heading.id}`;
    const text = escapeHtml(g.heading.textContent);
    const link = `<a href="${href}" data-toc-id="${g.heading.id}">${text}</a>`;
    if (g.children.length === 0) {
      return `<li class="toc-group toc-l${g.level} toc-leaf">${link}</li>`;
    }
    const childItems = g.children.map(c =>
      `<li class="toc-l3"><a href="#${c.id}" data-toc-id="${c.id}">${escapeHtml(c.textContent)}</a></li>`
    ).join("");
    return `<li class="toc-group toc-l${g.level} expanded">
      <span class="toc-row">
        <button type="button" class="toc-toggle" aria-label="Fäll in/ut underrubriker" aria-expanded="true"></button>
        ${link}
      </span>
      <ul class="toc-children">${childItems}</ul>
    </li>`;
  }).join("");

  return `<h4>On this page</h4><ul class="toc-tree">${items}</ul>`;
}

// Säkerställ att TOC-gruppen som innehåller given anchor är expanderad.
// Anropas vid TOC-klick på child och vid search-navigation.
function expandTocGroupFor(tocEl, anchorId) {
  if (!tocEl || !anchorId) return;
  const link = tocEl.querySelector(`a[data-toc-id="${anchorId}"]`);
  if (!link) return;
  const group = link.closest(".toc-group");
  if (!group || group.classList.contains("expanded") || group.classList.contains("toc-leaf")) return;
  group.classList.add("expanded");
  const toggle = group.querySelector(".toc-toggle");
  if (toggle) toggle.setAttribute("aria-expanded", "true");
}

let activeObserver = null;

// IntersectionObserver markerar aktiv TOC-länk baserat på vilken heading
// som är synlig nära toppen av viewport. rootMargin "-10% 0 -70% 0" =
// heading räknas aktiv när den är i översta ~20% av viewport.
function wireActiveSection(contentEl, tocEl) {
  if (activeObserver) activeObserver.disconnect();
  const links = tocEl.querySelectorAll("a[data-toc-id]");
  const linkById = {};
  links.forEach(a => { linkById[a.dataset.tocId] = a; });
  activeObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(a => a.classList.remove("active"));
        const a = linkById[e.target.id];
        if (a) a.classList.add("active");
      }
    });
  }, { rootMargin: "-10% 0px -70% 0px", threshold: 0 });
  contentEl.querySelectorAll("h1, h2, h3").forEach(h => activeObserver.observe(h));
}

// Smooth scroll vid TOC-klick + uppdatera URL-hash utan att lägga till
// history-entry. Wirar en gång på TOC-elementet (delegering). Hanterar
// både toggle-knappar (collapse/expand) och navigation-länkar.
function wireTocClicks(tocEl) {
  tocEl.addEventListener("click", e => {
    const toggle = e.target.closest(".toc-toggle");
    if (toggle) {
      const group = toggle.closest(".toc-group");
      if (!group) return;
      const nowExpanded = !group.classList.contains("expanded");
      group.classList.toggle("expanded", nowExpanded);
      toggle.setAttribute("aria-expanded", nowExpanded ? "true" : "false");
      return;
    }
    const link = e.target.closest("a[data-toc-id]");
    if (!link) return;
    e.preventDefault();
    const id = link.dataset.tocId;
    expandTocGroupFor(tocEl, id);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", "#" + id);
    }
  });
}

async function loadDoc(docId) {
  const doc = DOCS.find(d => d.id === docId);
  const target = document.getElementById("docs-content");
  const tocTarget = document.getElementById("docs-toc");
  if (!doc || !target) return;
  const renderInto = html => {
    target.innerHTML = html;
    applyHeadingIds(target);
    if (tocTarget) tocTarget.innerHTML = buildToc(target);
    if (tocTarget) wireActiveSection(target, tocTarget);
    target.scrollTop = 0;
    window.scrollTo({ top: 0 });
  };
  if (docsCache[docId]) { renderInto(docsCache[docId]); return; }
  target.innerHTML = `<p class="docs-loading">Laddar ${doc.path}…</p>`;
  if (tocTarget) tocTarget.innerHTML = "";
  try {
    const res = await fetch(doc.path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    const html = renderMarkdown(md);
    docsCache[docId] = html;
    renderInto(html);
  } catch (e) {
    target.innerHTML =
      `<p class="docs-error">Kunde inte ladda <code>${doc.path}</code>: ${escapeHtml(String(e.message || e))}.<br>Om du öppnar appen via <code>file://</code> behöver du köra en lokal HTTP-server (t.ex. <code>python3 -m http.server</code>).</p>`;
  }
}

function showDoc(docId) {
  currentDocId = docId;
  document.querySelectorAll(".docs-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.doc === docId));
  loadDoc(docId);
}

function wireDocsTabs() {
  document.querySelectorAll(".docs-tab").forEach(btn => {
    btn.addEventListener("click", () => showDoc(btn.dataset.doc));
  });
  const tocTarget = document.getElementById("docs-toc");
  if (tocTarget) wireTocClicks(tocTarget);
}
