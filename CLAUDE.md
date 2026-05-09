# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Köra simulatorn

```bash
open index.html
```

Inga deps, ingen build, ingen bundler. Allt körs i klienten via plain `<script>`-taggar. Det finns inga tester eller linters i projektet — verifiering sker manuellt mot 14-stegs-checklistan i README ("Saker att prova").

## Arkitektur — viktigt att förstå innan du ändrar något

### Plain-script-modul med delad global namnrymd

Filerna laddas i en specifik ordning från `index.html` och delar **en gemensam global namnrymd** (samma sak som om allt låg i ett enda `<script>`-block). Det betyder att funktioner och variabler i en fil refererar fritt till sådant som definieras i en annan fil — bindningen sker vid runtime, inte vid load.

**Laddordning (definierad i `index.html`):**

```
scenarios → events → metrics → engine → render → charts → learning → app
```

`app.js` laddas sist eftersom den anropar funktioner från alla andra filer.

**Konsekvens:** State som `parallelSim`, `automationEnabled`, `workersPerSystem`, `runHistory` ägs av `engine.js` men läses/skrivs direkt av `render.js`, `charts.js` och `app.js`. Om du flyttar state mellan filer eller ändrar laddordningen kan du tyst bryta saker som inte syns vid sidladdning. Behåll plain-script-strukturen — det är ett medvetet val (se README "Lägga till nya pedagogiska slices").

### Två simulationslägen i samma engine

`engine.js` driver **två separata exekveringsmodeller** mot samma `SYSTEMS` och `HAPPY_PATH`:

1. **Single-order flow** (`runFlow`): en `setTimeout`-driven sekvens av events för en order. Används av "1 order" + felscenarierna. Renderar timeline, event-logg, metrics.
2. **Parallel batch sim** (`startParallel` → `parallelTick` på `setInterval`): en diskret tick-baserad simulator med `simTime`, köer per system, retry-logik, sampling till en time-series. Används av "5 orders" / "20 orders". Renderar dashboard, queue-panel, throughput-graf, order-list.

Body-klassen `mode-parallel` toggles för att visa/dölja paneler. CSS-väljarna `.singel-only` och `.parallel-only` styr vad som syns i vilket läge.

### Single-proc systems och var bottlenecks uppstår

Endast två system har köer i parallel-läget: `ri` (Resource Inventory) och `prov` (Provisioning), via konstanten `SINGLE_PROC` i `engine.js`. Övriga är "snabba lookups" som processar parallellt. Detta är en pedagogisk förenkling — hela poängen med simulatorn är att visualisera bottlenecks, så vi vill ha tydliga ställen där köer bildas.

`workersPerSystem.ri` är capacity-knappen i UI:t. Höjs den från 1 → 2/3 flyttar bottlenecken från RI till Provisioning — det är det avsedda lärtillfället (Theory of Constraints steg 5).

### Fail/retry-loopen som driver "incident cascade"

I `parallelTick` ökar fail-sannolikheten i Provisioning när dess kö växer (`failProb`: 5% → 15% → 30%). En fail har 50% chans att spawna en retry-order med id `+ "-R"`. Det är **medvetet en återkopplingsslinga** — högre load → fler fails → fler retries → ännu högre load. Om du fixar en "bug" där incidents växer exponentiellt under last, fundera först på om du raderar lärandeeffekten.

### Förbättringsexperiment och run-comparison

Två mekanismer driver "ändra något, kör, se diff":

- `runHistory[scenarioId]` (i `engine.js`) lagrar manual + automated lead time per scenario för single-order flow. `metrics.js → showImprovement` visar diff när båda finns.
- `lastParallelRun` + `comparePreviousRun` (i `engine.js`) lagrar förra parallel-batchens series + KPI:er. `charts.js → updateRunCompare` ritar ghost-kurva och delta-celler. **`comparePreviousRun` snapshottas i `startParallel` *innan* `resetUI`** — annars nollas det och jämförelsen tappas. Var försiktig med ordningen där.

## Var lägger jag ändringar?

| Vad du vill göra | Var |
|---|---|
| Nytt felscenario eller ny domän | `src/simulation/scenarios.js` (utöka `SYSTEMS`, lägg till `FAIL_*`-array) |
| Ändra hur lead time / handoffs / bottleneck räknas (single-order) | `src/simulation/metrics.js` |
| Ändra hur batch-metrics räknas | `src/simulation/engine.js → finalizeParallel` |
| Ny event-transformer (annan automationsregel) | `src/simulation/events.js` |
| Ändra spawn-logik, kö-policy, fail-sannolikhet | `src/simulation/engine.js` (parallel-engine) |
| Ny dashboard-card eller order-list-kolumn | `src/ui/render.js` + uppdatera HTML i `index.html` |
| Förändra grafen | `src/ui/charts.js` |
| Ny "Process pattern"-text | `src/simulation/scenarios.js → PATTERNS` + `src/ui/learning.js → patternList()` |
| Ny knapp som triggar scenario | `index.html` (knappen) + `src/app.js` (event listener) |

## Konventioner

- **En slice = en idé.** Försök inte bygga två förbättringar samtidigt. Verifiera manuellt mot README-checklistan efter varje slice.
- **Inga ramverk, inga build-tools, inga deps.** Det är en uttalad designprincip — simulatorn ska kunna öppnas direkt från disk.
- **Durations i ms** representerar konceptuell "sekund i verkligheten" (1 ms UI ≈ 1 sekund). `SIM_PER_TICK` i parallel-engine är 100 ms simtid per 50 ms realtid (2x speed).
- **DOM-refs** cachas en gång i `render.js` (t.ex. `logEl`, `timelineEl`, `automationToggle`) och används som globala variabler från övriga filer.
- **Frontmatter på .md-filer** krävs enligt parent-projektets `CLAUDE.md` (se README/HYPOTHESIS för format). Uppdatera `last_updated` vid ändringar.
