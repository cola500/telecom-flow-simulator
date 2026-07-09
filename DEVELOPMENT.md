---
title: Development notes
description: Hur du kör simulatorn lokalt, hur koden är organiserad, och hur du lägger till nya pedagogiska slices. Användarvänd dokumentation finns i README.md; modellantaganden i REALISM_NOTES.md.
category: developer-docs
status: in-progress
last_updated: 2026-07-04
sections: [Kör lokalt, Kodstruktur, Lägga till nya pedagogiska slices, Framtida slice-idéer]
---

# Development notes

Den här filen är teknisk dokumentation för någon som vill *bygga vidare* på simulatorn. Användarinstruktioner och pedagogiskt innehåll finns i [`README.md`](README.md). Modellantaganden och realismnivå finns i [`REALISM_NOTES.md`](REALISM_NOTES.md).

För *var vi är nu* och nästa steg i pågående arbete, se [`project-brain/current.md`](project-brain/current.md) — det delade arbetsminnet.

## Kör lokalt

```bash
open index.html
```

Eller dra filen till en webbläsare. Ingen build, inga deps. Allt sker i klienten.

För att Documentation-vyn (in-app läsning av README/REALISM_NOTES) ska kunna `fetch()`a markdown-filerna behöver appen serveras via en HTTP-server — inte `file://`:

```bash
python3 -m http.server 8765
# öppna sedan http://localhost:8765/index.html
```

Simulator-engine fungerar fullt ut även via `file://` — det är bara Documentation-vyn som kräver server.

## Kodstruktur

Projektet är ren vanilla JS — inga build-tools, inga dependencies, ingen bundler. Filerna laddas i ordning som plain `<script>`-taggar och delar en gemensam global namnrymd (samma sak som om allt låg i ett enda script-block, bara delat i läsbara filer).

```
oss-bss-simulator/
├── index.html              ← HTML body + script-taggar i rätt ordning
├── README.md               ← användardokumentation (lär-innehåll)
├── REALISM_NOTES.md        ← modellantaganden + realism-rating
├── DEVELOPMENT.md          ← denna fil
├── HYPOTHESIS.md           ← experimenthypotes + verifieringskriterier
└── src/
    ├── app.js              ← bootstrap + alla event listeners (mode-tabs, sim-knappar, togglar)
    ├── simulation/
    │   ├── scenarios.js    ← SYSTEMS, PATTERNS (lär-texter), HAPPY_PATH_FIBER/MOBILE, PRODUCTS, BOTTLENECK_DETAIL, fail-helpers
    │   ├── events.js       ← applyAutomation (role-baserad), applyVariability, calcHandoff, fmtMs, buildQueue
    │   ├── metrics.js      ← finalize (single-order), hideImprovement, showImprovement, loadClass
    │   └── engine.js       ← state + runFlow (single) + parallel-engine + finalizeParallel
    ├── ui/
    │   ├── render.js       ← DOM-refs + renderSystems, renderDecomposition, log, timeline, dashboard, queue, order-list
    │   ├── charts.js       ← updateChart (SVG sparkline), summarizeRun, setCmpCell, updateRunCompare
    │   ├── learning.js     ← right-hand learning panel + mini-markdown formatter, mode-aware patternList, currentView, refreshLearningForMode
    │   └── docs.js         ← in-app Documentation-viewer (markdown-parser + fetch-loader)
    └── styles/
        └── main.css        ← all CSS
```

**Laddordning (definierad i `index.html`):**

```
scenarios → events → metrics → engine → render → charts → learning → docs → app
```

`app.js` laddas sist eftersom den anropar funktioner från alla andra filer. State (som `parallelSim`, `automationEnabled`, `provAutomationEnabled`, `runHistory`, `currentProductId`, `currentView`) ägs av respektive modul men läses/skrivs över modulgränserna — möjligt eftersom plain scripts delar en global namnrymd.

**Mode-systemet:** body-klassen (`mode-learn` / `mode-optimize` / `mode-docs`) styr vilka paneler som syns via CSS (`.learn-only`, `.optimize-only`, `.docs-only`). Befintlig `mode-parallel` (set/unset av engine vid parallel-batch) är ortogonal mot dessa user-modes.

## Lägga till nya pedagogiska slices

När du vill bygga ett nytt scenario eller en ny visualisering, börja med att fråga vilken modul ändringen primärt hör hemma i:

| Vad du vill göra | Var lägger du det |
|---|---|
| Lägga till ett nytt felscenario eller domänsystem | `src/simulation/scenarios.js` (utöka `SYSTEMS`, lägg till ny fail-helper-funktion) |
| Lägga till en ny produkt | `src/simulation/scenarios.js` (`PRODUCTS` + ny `HAPPY_PATH_*`-array + uppdatera `happyPathFor`/`failResourceFor`/`failProvFor`) |
| Ändra hur lead time / handoffs / bottleneck räknas | `src/simulation/metrics.js` (single) eller `engine.js → finalizeParallel` (batch) |
| Ny event-transformer (t.ex. en annan automationsregel) | `src/simulation/events.js` |
| Ändra spawnlogik, kö-policy, fail-sannolikhet | `src/simulation/engine.js` (parallel-engine) |
| Lägga till en ny dashboard-card eller order-list-kolumn | `src/ui/render.js` + uppdatera HTML i `index.html` |
| Förändra grafen (ny linje, axlar, annotationer) | `src/ui/charts.js` |
| Skriva en ny "Process pattern"-text | `src/simulation/scenarios.js → PATTERNS` (med `group: ...`-fält) — knappen genereras automatiskt av `learning.js → patternList()` filtrerad per mode |
| Lägga till en ny knapp som triggar ett scenario | `index.html` (knappen) + `src/app.js` (event listener) |
| Stödja ny markdown-syntax i Documentation-vyn | `src/ui/docs.js` (utöka `renderMarkdown` eller `formatInline`) |

**Tips för att hålla det enkelt:**

- En slice = en idé. Försök inte bygga två förbättringar samtidigt.
- Behåll plain-script-strukturen. Inga ramverk, inga build-tools — det är hela poängen.
- Ändrar du en enskild fil, behöver du inte röra de andra. Men kontrollera laddordningen om du introducerar nya beroenden.
- Verifiera manuellt efter varje slice (samma stegs-checklista som under "Saker att prova" i README).
- Om du ändrar happy-path-strukturen, kom ihåg att `applyAutomation` hänger på `role`-fält (inte tech-namn), så nya steg behöver ett role för att kunna automatiseras.

## Framtida slice-idéer

Listan är inte prioriterad — flera kan göras oberoende.

- **Justerbar arrival rate** — slumpa ankomsttider istället för fast 1500ms-spawning, så användaren kan se hur burst-load påverkar kölängd.
- **Statusvy per dekompositionsnivå** — visa simulerade tillstånd (completed / active / reserved / orphaned / verified / partial) på decomp-trädets noder. Adresserar visuellt "order active ≠ service working".
- **TMF API-mappnings-tabell** — Customer Order ↔ TMF622, Service Order ↔ TMF641, Resource Order ↔ TMF652, Service Activation ↔ TMF640. Bygger broar till industristandard utan att kräva implementation av TMF-payloads.
- **Produkt-specifika failure modes** — fiber: dispatch no-show, address validation fail. Mobile: RSP timeout, IMSI conflict, MNP block. Skulle stärka domänlärandet utan stor logikändring.
- **Fler produktfamiljer** — IoT-abonnemang (massa-SIM, eUICC, DVA), B2B SD-WAN (CE-router + IPSec + bandwidth-on-demand), fast telefoni (number portability + SIP trunk). Var och en med eget happy path.
- **Assurance-loop efter aktivering** — post-activation incident → root cause → fix-flödet. Kräver ny domänlogik men öppnar för incident management-lärande.
- **Kanban-style swimlanes** — visa ordrar som kort som rör sig mellan domäner istället för i en lista.
- **Nivå-baserad scenarios** — guided tour: introducerar en sak åt gången (lead time → handoffs → bottlenecks → variability → automation), istället för att exponera alla kontroller direkt.
- **Produktväljare i Optimize-mode** — idag är produktknapparna `learn-only` (inom decomp-panelen). En kompakt produkt-pill i Optimize-mode skulle låta användaren byta produkt mellan körningar utan att gå tillbaka till Learn.
- **UI-disclaimer mer synlig** — en klickbar "?" i headern som öppnar en kort förklaring "This is a learning model. See Documentation → Realism Notes."
- **Skala-tooltip i metrics** — vid hover på "Total lead time", visa text om att 16.2s simtid representerar dagar/veckor i en verklig fiber-installation.
