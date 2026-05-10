---
title: Flow Systems Simulator Platform — vision och strategi
description: Strategiskt visionsdokument för en möjlig generalisering av telecom-simulatorn till en flerdomäns lärplattform för komplexa flödessystem. Inte aktuellt scope — analys, riktning och risker.
category: vision
status: exploration
last_updated: 2026-05-10
sections: [Status och scope, Vision, Hypotes, Domain mapping, Vad är generiskt vs domänspecifikt, Arkitekturskiss, Domain manifest, UI/UX-mönster att återanvända, Pedagogiska designprinciper, Risker med för tidig generalisering, Strategi telecom first platform later, Framtida epics, Frågor som måste valideras]
tags: [vision, strategy, platform, pedagogy, simulation, systems-thinking]
related: [README.md, REALISM_NOTES.md]
---

# Flow Systems Simulator Platform — vision och strategi

> **Status:** Detta dokument är ett *visionsdokument*, inte en plan. Inget av nedanstående är aktuellt scope. Telecom-simulatorn fortsätter vara fokus tills den är validerad. Detta dokument finns för att (1) fånga en idé som annars riskerar gå förlorad, (2) ge framtida designbeslut en riktning att kalibrera mot, och (3) förebygga oavsiktlig low-cohesion-utveckling som gör en eventuell platform-resa onödigt smärtsam.

---

## Vision

> **En interaktiv lärsimulator som hjälper människor att intuitivt förstå komplexa flödessystem — genom att låta dem köra dem, bryta dem, och se hur fel sprider sig i organisationen.**

I de flesta organisatoriska domäner — telecom, software delivery, sjukvård, supply chain, manufacturing — är de mentala modellerna för komplexa för att förstås genom att läsa böcker. Människor lär sig snabbast genom att *se* flödet, *interagera* med det, och få *omedelbar feedback* på sina experiment.

Befintliga lärverktyg är typiskt antingen:

- **Statiska diagram + text** (BPMN-böcker, ArchiMate-kataloger) — pedagogisk dödszon. Läsaren förstår orden men inte beteendet.
- **Tunga enterprise-simulationer** (Anylogic, Simio) — kraftfulla men kräver veckor av setup. Inte verktyg för att lära ut, utan verktyg för att modellera.
- **Spel-baserade simuleringar** (Beer Distribution Game, Kanban Pizza) — pedagogiskt utmärkta men inte återanvändbara, inte digitala, inte mätbara.

Vår simulator landar i en gap där: lättviktig, körbar i en webbläsare, pedagogiskt designad, men ändå "verklig" nog att flödet beter sig som det gör i en riktig stack.

---

## Hypotes

Samma grundläggande primitiv återkommer i många flödesdomäner. Det innebär att simuleringsmotorn potentiellt skulle kunna återanvändas för fler domäner än telecom — om vi bygger den rätt.

Hypotesen är inte att "alla flödessystem är samma". Hypotesen är att **det finns en grupp gemensamma byggstenar** som — om de modelleras som fristående koncept — skulle ge betydande återanvändning över domäner. Domänspecifik nyans skulle bo i konfiguration och pedagogiskt innehåll, inte i kärnmotorn.

Hypotesen behöver valideras innan vi designar för den. Just nu ÄR den en hypotes — inte ett bevis.

---

## Domain mapping

### Telecom (befintlig)

```
Customer Order
    ↓
Service Order ─────────────→ Service Inventory
    ↓
Resource Orders ───────────→ Resource Inventory
    ↓
Provisioning / Activation
    ↓
Verification
    ↓
BillingStartRequested

Assurance ←──────────────── (when things go wrong)
```

### Software Delivery (potentiell andra domän)

```
Feature Request
    ↓
Epic / Capability ─────────→ Service Catalog / Architecture
    ↓
Stories / Tasks ───────────→ Backlog / WIP
    ↓
CI/CD Pipeline
    ↓
Deployment
    ↓
Smoke / Canary / Verification
    ↓
ProductionReadyRequested

Monitoring / On-call ←────── (when things go wrong)
```

### Konceptuell mappning

| Generiskt koncept           | Telecom                          | Software Delivery                   |
|-----------------------------|----------------------------------|-------------------------------------|
| Kommersiell intent          | Customer Order                   | Feature Request                     |
| Logisk dekomposition        | Service Order                    | Epic / Capability                   |
| Operativ dekomposition      | Resource Orders, Activation Tasks | Stories / Tasks / Subtasks         |
| Stateful katalog            | Service / Resource Inventory     | Service Catalog / Architecture Map  |
| Begränsad resurs            | RI/Prov workers, fiberport       | CI agents, reviewers, env-slots     |
| Provisionering              | Network configuration            | CI/CD build/deploy                  |
| Aktivering                  | Service Activated                | Feature flag enabled / released     |
| Verifiering                 | Service Verified                 | Smoke / canary tests pass           |
| Billing-trigger             | BillingStartRequested            | Released / Done / DoD-uppfyllt      |
| Assurance / observability   | Network alarms, NOC              | APM / on-call / incident response   |
| Dominerande feedback-loop   | Fail → retry → cascade           | Flaky test → rerun → toil           |
| Inventory drift             | Port marked free, actually used  | Stale env config, drift from prod   |
| Manuell handpåläggning      | Provisioning-tekniker            | Engineer toil, manual rollback      |
| SLA                         | Leveranstid (5 dagar fiber etc.) | DORA Lead Time, SLO                 |
| Operativ konsekvens         | Manuella undersökningar, billing-fördröjning, supportsamtal | Toil, on-call burnout, missed releases |

Mönstret är tydligt nog att vara intressant — och olikt nog att vara icke-trivialt att modellera. Det är just det som gör det till en bra hypotes.

---

## Vad är generiskt vs domänspecifikt

Det här är kärnfrågan. Om generic-andelen är liten är hela platformen meningslös. Om den är stor är värdet betydande.

### Vad som verkar generiskt (kandidat-engine)

- **Flow engine**: en arbetsenhet rör sig genom en sekvens av events med duration. Discrete event simulation.
- **Capacity-limited systems**: en delmängd av systemen har begränsad kapacitet, andra är "snabba lookups". Köbildning sker på de begränsade.
- **Handoffs**: arbete byter ägare mellan systems/teams med en cost (translation, queue, context-switch).
- **Failure injection + retry loops**: sannolikhet för fel ökar med belastning; fel kan genera ny arbetsenhet.
- **Backpressure**: uppströms paus när nedströms-kö når tröskel.
- **Variability**: stochastic duration kring deterministisk baseline.
- **Run history**: lagring av tidigare körningar för diff/jämförelse.
- **Time-series sampling**: sampla state per tick för rendering över tid.
- **Insight derivation**: regler som tar metrics och genererar pedagogiska påståenden.
- **Operational impact translation**: regler som tar metrics + failure-events och genererar org-konsekvenser.

Allt detta är *strukturella primitiv*, inte domänkonventioner.

### Vad som verkar domänspecifikt

- **Layer-koncept**: telecom har BSS/OSS-uppdelning. Software har inte exakt motsvarighet (möjligen "product/platform" eller "build/runtime"). Healthcare har "front-of-house / back-of-house". Layern är en pedagogisk presentation, inte en flow-egenskap.
- **System-namn, färger, ikoner**: trivialt att lyfta ut.
- **Specifika event-namn**: ResourcesReserved vs PRMerged. Bara strängar — trivialt.
- **Specifika failure modes**: ResourceUnavailable vs FlakeyTestFailure. Mekaniken är samma; rubriken är domänspecifik.
- **Glossary content**: ren text-content per domän.
- **Pattern-förklaringar**: Theory of Constraints är generisk. Men exemplet ("RI är bottlenecken med 1 worker — höj till 2") är domänspecifikt.
- **Decomposition-strukturer**: Customer→Service→Resource Orders för telecom. Feature→Epic→Story→Task för software. Strukturen är liknande (recursive), innehållet olikt.
- **Metrics-tolkning**: "lead time" är generisk; "truly-touchless-rate" är telecom-jargong; "DORA Lead Time for Changes" är software-jargong.

### Det grå zonet

- **Concept flow ("Kund → Order → Tjänst → Resurser → Aktivering → Fakturering")**: format är generiskt, innehåll specifikt.
- **Decomposition tree-rendering**: visualiseringsmönstret är generiskt, men terminologin per nivå är domän-specific.
- **Theory journey (8 steg)**: strukturen "guidad linjär resa" är generisk, men varje steg är skrivet specifikt för telecom.
- **Operational impact-kategorier**: vissa är universella (manuella undersökningar, SLA risk, supportlast), andra är specifika (inventory reconciliation finns i telecom + supply chain men inte i software på samma sätt).

Slutsats: ungefär **70 % av nuvarande engine + UI är strukturellt generic**, **30 % är innehåll/etiketter**. Det är en bra balans för platform-hypotesen — men endast om man inte underskattar 30 %, för det är där pedagogiken lever.

---

## Arkitekturskiss

> **Disclaimer:** detta är *en* möjlig arkitektur, skissad som tankefigur. Den kommer behöva justeras när faktiska behov uppstår. Den ska inte byggas i förebyggande syfte.

### Tre lager

```
┌──────────────────────────────────────────────────────────┐
│  DOMAIN PACKAGE                                          │
│  (telecom · software-delivery · healthcare · supply…)    │
│                                                          │
│  • SYSTEMS, PRODUCTS, FLOWS                              │
│  • PATTERNS, GLOSSARY                                    │
│  • FAILURE_MODES, IMPACT_RULES                           │
│  • Layer-konvention (BSS/OSS, dev/ops, …)                │
│  • Pedagogiska texter och resor                          │
├──────────────────────────────────────────────────────────┤
│  ENGINE                                                  │
│  (generisk flödessimulator)                              │
│                                                          │
│  • work-unit lifecycle                                   │
│  • stateful systems with capacity                        │
│  • handoffs                                              │
│  • queueing / backpressure                               │
│  • failure injection + retry                             │
│  • variability                                           │
│  • run history & comparison                              │
│  • metrics & insight derivation                          │
├──────────────────────────────────────────────────────────┤
│  UI FRAMEWORK                                            │
│  (rendering primitives, mode-system)                     │
│                                                          │
│  • Panel system (collapsible, sticky aside)              │
│  • Mode tabs (Learn / Optimize / Documentation)          │
│  • System map renderer                                   │
│  • Decomposition tree                                    │
│  • Timeline                                              │
│  • Dashboard cards                                       │
│  • Learning panel + popovers                             │
│  • Operational impact panel                              │
│  • Charts (throughput, queue depth)                      │
│  • Mini-flow concept row                                 │
└──────────────────────────────────────────────────────────┘
```

### Dataflöde

```
DOMAIN (bara konfiguration + content)
   ↓
ENGINE (kör flödet utan att veta vad domänen handlar om)
   ↓
UI FRAMEWORK (renderar engine state + domain labels)
```

Engine ska aldrig importera ur Domain-paketet direkt. Allt domänspecifikt skickas in som data, inte hämtas via referens. Det är just det som gör att domains är utbytbara.

### Vad är *inte* i denna arkitektur (medvetet)

- **Persistence-lager**: ingen anledning. Simulatorn är stateless mellan sessioner (utöver localStorage för UI-preferenser).
- **Server-komponent**: client-only är en *feature*, inte en begränsning. Hela poängen är att kunna öppna en HTML-fil och köra.
- **Auth/users/sessions**: irrelevant för en lär-simulator.
- **Ramverk**: vanilla JS är ett medvetet val (se README). Att börja använda React/Vue för en platform-resa skulle vara en separat strategisk diskussion — inte en självklar konsekvens.

---

## Domain manifest

Skiss på hur ett domänpaket *skulle kunna* se ut som en self-contained datastruktur. Detta är inte ett API-förslag — det är en tankefigur för att se *om* det faktiskt går att kapsla in en domän.

```js
const TELECOM_DOMAIN = {
  id: "telecom",
  name: "OSS/BSS Order-to-Activate",
  short: "Telecom",

  // Pedagogiska ramar — visas i UI
  conceptFlow: ["Kund", "Order", "Tjänst", "Resurser", "Aktivering", "Fakturering"],
  layers: [
    { id: "bss", name: "Business Support Systems", color: "#4a6cf7" },
    { id: "oss", name: "Operational Support Systems", color: "#2da66a" }
  ],

  // Strukturella system som arbetsenheten passerar
  systems: {
    crm:     { name: "CRM",                        layer: "bss" },
    om:      { name: "Order Management",           layer: "bss" },
    si:      { name: "Service Inventory",          layer: "oss" },
    ri:      { name: "Resource Inventory",         layer: "oss", capacity: { default: 1, options: [1, 2, 3] } },
    prov:    { name: "Provisioning / Activation",  layer: "oss", capacity: { default: 1, options: [1, 2, 3] } },
    assur:   { name: "Assurance",                  layer: "oss" },
    billing: { name: "Billing",                    layer: "bss" }
  },

  // Vad arbetsenheten är och hur den dekomponeras
  workUnit: {
    name: "Order",
    decomposition: [
      { level: "customer_order", label: "Customer Order", layer: "bss" },
      { level: "service_order",  label: "Service Order",  layer: "bss" },
      { level: "resource_orders", label: "Resource Orders", layer: "oss", multiple: true }
    ]
  },

  // Konkreta produkter / varianter (separata happy-paths)
  products: {
    fiber:  { name: "Fiber 500 Mbps",     happyPath: [...], failureModes: [...] },
    mobile: { name: "Mobile subscription", happyPath: [...], failureModes: [...] }
  },

  // Pedagogiska byggstenar
  patterns: { /* keyed by id, group, body */ },
  glossary: { /* keyed by term */ },

  // Operational impact-regler — hur metrics översätts till org-konsekvenser
  impactRules: [
    { id: "investigations", derive: ({ failed }) => failed.length },
    { id: "recon",          derive: ({ failed }) => failed.filter(f => /Resource/i.test(f.tech)).length },
    // …
  ]
};
```

Software Delivery-domänen skulle ha samma struktur men med *helt annan content*: systems = `[backlog, plan, build, ci, staging, prod, observability]`, workUnit = `Feature → Epic → Story → Task`, etc.

Värdet av att tvinga sig själv att skissa det här — även utan att bygga det — är att man **upptäcker var domain-knowledge faktiskt sitter**, och därmed var hidden coupling skulle uppstå om man bytte domän.

---

## UI/UX-mönster att återanvända

Den nuvarande appen har kristalliserat ett antal UX-mönster som är **påtagligt domain-agnostic** och bör behandlas som platformens UI-grammatik:

| Mönster | Vad det gör pedagogiskt | Återanvändbart? |
|---|---|---|
| **Mode-tabs** (Learn / Optimize / Docs) | Skiljer "förstå domänen" från "experimentera" och "läs djup-content" | Ja — varje domän har samma tre behov |
| **Mini-flow concept row** | Snabb orientering: en rad chips med pilar | Ja — bara content byts |
| **Theory journey** (numrerade kort) | Linjär guidad resa genom domänens grundbegrepp | Ja — struktur är identisk, content är specifik |
| **Decomposition tree** | Visar hierarkisk dekomposition (work → sub-work → resources) | Ja — ren rekursiv struktur |
| **System map** | Visar topologin: vilka system finns, hur de grupperas, var de lyser i realtid | Ja — layer-namn + system-uppsättning är data |
| **Event log + timeline** | Eventflöde under en körning + tidsvisualisering | Ja — eventnamn är data |
| **Dashboard cards** + **metrics-grid** | Aggregerad batch-metrics med info-popovers | Ja — kategorier är data |
| **Operational impact panel** | Översätter abstrakta metrics till organisatoriska konsekvenser | Ja — impact-kategorier varierar lite per domän men strukturen är identisk |
| **Run comparison** (ghost curve) | Lärande sker i delta: "vad ändrades när jag gjorde X?" | Ja — metrics och insights skiljer sig per domän, mekaniken är samma |
| **Collapsible panels + sticky learning aside** | Reducerar kognitiv belastning | Ja — UI-mekanik, inte content |
| **Info-popovers (data-info)** | Kontextuell fördjupning utan att sidan blir överladdad | Ja — popover-keys mappas mot domain glossary |
| **Pattern-list i learning-panel** | Bibliotek med pedagogiska mönster, kategoriserade per mode | Ja — patterns är data |

Det här är inte "telecom-UI". Det är **flow-systems-UI**. Var och en av komponenterna är ett legitimt UX-bidrag på egen hand.

---

## Pedagogiska designprinciper

Dessa principer är delvis upptäckta under telecom-arbetet, delvis hämtade från publik pedagogisk teori. De ska gälla för alla framtida domäner — det är de som gör simulatorn till en *lär*-simulator istället för bara en *modellerings*-simulator.

### 1. Discovery > Documentation

Lärandet ska ske genom interaktion, inte genom att läsa beskrivningar. Beskrivningar finns som *backup*, inte som *huvudkanal*. Användaren ska kunna förstå 70 % av flödet utan att läsa en mening, bara genom att klicka.

Detta ligger nära principer inom experiential learning och learner-driven facilitation: den som agerar lär sig. När användaren klickar, prövar, ser konsekvenser i realtid är hen i ett djupare lärtillstånd än som passiv mottagare av text.

### 2. Run, break, repair

Treklangen som driver pedagogisk insikt:

1. **Run** — kör happy path, se att det fungerar.
2. **Break** — trigga ett fel, se konsekvensen.
3. **Repair** — använd en kontroll (automation, capacity, backpressure), se hur det förändras.

Varje pedagogiskt budskap (Theory of Constraints, partial activation, queueing theory) ska kunna undervisas via denna treklang. Om det inte kan det, är det fel kanal — det hör hemma i en bok.

### 3. Show flow, not slides

När man kan *se* en kö växa förstår man kö-teori snabbare än genom att läsa Little's Law-formeln. Visualiseringen är inte estetik — den är *kognitivt verktyg*.

### 4. Operational consequence first

Tekniska siffror är abstrakta. *Konsekvenser* är konkreta. "5 incidents" är abstrakt; "5 manuella undersökningar + 5 försenade fakturor + ~6 supportsamtal" är konkret. Operational Impact-panelen är denna princip institutionaliserad.

### 5. Multiple zoom levels

Användaren ska själv kunna välja zoom: orientera (mini-flow) → förstå struktur (systemkarta) → följa enskild order (timeline) → analysera batch (charts). Att tvinga en zoom-nivå förlorar olika typer av lärande.

### 6. Modes for cognitive load

"Förstå domänen" och "experimentera med kontroller" är två olika mentala lägen. Att blanda dem ökar kognitiv belastning. Mode-tabs gör skillnaden explicit.

### 7. Compare runs

Det viktigaste lärandet sker ofta i **delta** mellan två körningar. "Innan automation: 12 sek. Efter: 8 sek. Bottlenecken flyttade från RI till Prov." Det är där insight kondenserar — inte i en enskild siffra.

### 8. Reflect explicitly

Varje pattern, insight, "varför spelar det roll" gör det implicita explicit. En förbättringsorienterad reflektionsstruktur — *nuläge → mål → hinder → nästa experiment* — är inbyggd i UX:n via insight-rutor och run-jämförelser.

### 9. Multiple entry points to the same insight

Samma lärdom (t.ex. "billing ska triggas på verifierad aktivering, inte orderstatus") når användaren via flera kanaler: theory journey-steget, fail-prov-scenariots impact-panel, glossary-popovern för Failed Activations. Redundans är pedagogiskt välgörande, inte design-fel.

### Pedagogiska influenser

Designprinciperna ovan är inte uppfunna här. De ligger i linje med etablerade idéer inom systems thinking, agile coaching och experiential learning. Utan att göra anspråk på direkt citering eller exakt återgivning av specifika verk — inspirationsriktningen kan beskrivas så här:

- **Systems thinking och systems awareness.** Simulatorns kärna är att göra struktur synlig och låta användaren se hur strukturen driver beteendet. Det ligger nära ansatser där lokala optimeringar visas ha icke-uppenbara globala effekter, och där pedagogiken handlar om att bygga organisatorisk självmedvetenhet om de egna flödena.

- **Iterativa förbättringscykler.** Simulatorn återskapar en förbättringsloop i miniatyr — definiera mål (sänk lead time), mät nuläge (kör en gång), identifiera hinder (bottleneck), kör experiment (toggle automation eller capacity), mät igen. Detta är i samma anda som strukturerade förbättringscykler i lean- och kata-traditionen, där lärande sker i upprepade små experiment.

- **Experiential learning.** Cykeln *konkret upplevelse → reflektion → konceptualisering → ny experimentation* är inbyggd i interaktionen. Användaren kör (konkret), ser metrics (reflekterar), läser pattern-förklaringar (konceptualiserar), togglar kontroller och kör igen (experimenterar).

- **Learner-driven facilitation och guided discovery.** Principen att den som ska lära sig ska *agera*, inte bli förelevsad, är inbakad i UX:n. Default-handlingen är att göra något — klicka, prova, observera — inte att läsa en text. Texter finns som komplement för dem som vill fördjupa.

- **Coaching-anda — guiding over telling.** Simulatorn ersätter inte en coach, men ger en utbildare eller faciliterare ett konkret artefakt att samtala kring. Frågor som *"vad observerade du?", "vad förvånade dig?", "vad skulle du testa härnäst?"* blir kraftfullare när det finns något konkret och delat att referera till.

- **Komplexa adaptiva system och emergent dynamik.** Bottlenecks som flyttar när man förbättrar dem, fail/retry-loopar som förstärker varandra, backpressure som handlar trade-offs mellan lokal och global optimering — det är alla illustrationer av att flöden är emergenta system där lokal optimering inte alltid leder till global förbättring. Det är en grundläggande systems thinking-insikt och en återkommande tematik i strategisk litteratur om organisationsdynamik.

- **Lean och flow-tänkande.** Små batcher, lägre WIP, fokus på flow efficiency framför resource efficiency. Simulatorns Optimize-mode är i praktiken ett lean-laboratorium där dessa principer kan testas i miniatyr istället för att läsas om i bok.

Inget av detta är hårt knutet till ett specifikt kapitel, en specifik författare eller ett specifikt citat. Det är *konceptuell inspiration*, inte akademisk referensapparat — och avsiktligt så. Verktygets pedagogiska kraft ska inte hänga på att läsaren känner igen rätt referenser.

---

## Risker med för tidig generalisering

Det här är den viktigaste sektionen. Den dyraste sortens fel i platform-resor är att designa för förmodade behov som aldrig materialiseras.

### Risk 1: Domain knowledge loss

Telecom-simulatorns nuvarande pedagogiska kraft kommer från domänspecifika nyanser: *partial activation, fiber/mobile-decomposition, inventory drift, Theory of Constraints applicerat på Resource Inventory*. När man abstraherar dessa till "generic failure modes" och "generic resource constraints" tenderar de att förlora sin pedagogiska skärpa.

> **Mitigation:** content lever kvar i domain-paketet, inte i engine. Engine ska veta att det finns failure modes — inte vad de heter eller varför de är pedagogiskt viktiga.

### Risk 2: "Everything is a tree of small boxes"-fällan

Om man försöker abstrahera flow-mönster för tidigt slutar resultatet ofta med en "generisk enterprise BPMN-känsla" — tekniskt korrekt men pedagogiskt dött. Generisering tenderar att ta bort just de delar som gjorde det specifika fallet intressant.

> **Mitigation:** verkligen vänta tills man har minst två konkreta domäner att jämföra. Generic-modellen bör *upptäckas* från observerade likheter, inte *spekuleras fram*.

### Risk 3: Engineering tax

Att bygga generic engine + domain A + domain B kostar typiskt 2–3 × mer än att bygga A separat och B separat. Värdet av platform-arkitekturen visas först när man bygger domän nr 3 — och då bara om de tidigare valen var rätt.

> **Mitigation:** "second domain by copy-paste, third domain by platform". Acceptera duplicering tills mönstret är validerat.

### Risk 4: Pedagogisk leakage

Telecom-pedagogiken är delvis specifik (BSS/OSS-uppdelningen är ett pedagogiskt artefakt, inte en universal lag). Att tvinga in software delivery i telecom-stil layers (BSS/OSS-analog) skulle skada båda domänerna.

> **Mitigation:** layer-konceptet är en *pedagogisk lins*, inte en *strukturell tvångströja*. Domänen får välja om den använder layers, och vad de heter.

### Risk 5: Plattformseffekt utan plattform

Att designa för "alla framtida domäner" utan att veta vilka 3 domäner det är ger ofta ett dåligt designat platform — overspecificerad i fel dimensioner och underspecificerad där det räknas. Det är en variant av YAGNI-kränkning.

> **Mitigation:** designa för 1, prototypa 2, refaktorera till N. Ingen platform-arkitektur innan domän 2 har kört.

### Risk 6: Tappad ergonomi

Nuvarande simulator har en *kraftfull* egenskap: den öppnas direkt i webbläsaren utan installation, build eller deps. Att introducera ramverk eller komplex bundling under platform-resan skulle förlora denna ergonomi — och den är en del av varför verktyget är pedagogiskt användbart.

> **Mitigation:** håll fast vid plain-script-modellen. Domain-paket kan vara separata `<script>`-laddade filer.

### Risk 7: Den-som-bygger-vill-bygga

Den största risken är inte teknisk. Den är att vi lockas av visionen och börjar bygga *för att det är intressant*, inte *för att det skapar användarvärde*. Telecom-simulatorn är inte färdig som *läranderesurs*. Att flytta fokus till generalisering innan den är validerad är att bryta mot punkt 7.

> **Mitigation:** explicit kriterium för att ens få fundera på platform-utveckling: "telecom-simulatorn används av [N] personer per [period] och har validerade lärandereffekter". Tills dess: vision document, inte vision implementation.

---

## Strategi: telecom first, platform later

En etappstrategi i fyra faser. **Inget i fas 2–4 är inplanerat.** Varje fas kräver explicit beslut + validering av föregående.

### Fas 1 — Validera pedagogiken (där vi är nu)

- Fortsätt polera telecom-simulatorn.
- Mät om den faktiskt används och om användare faktiskt lär sig.
- Få feedback från riktiga målgrupper (process improvement, fulfillment, OSS architecture).
- Producera materielet som möjliggör *uttala* konkreta lärdomar — inte bara "verktyget är trevligt".

**Exit-kriterium**: telecom-simulatorn används av en eller flera externa intressenter och vi kan dokumentera minst tre konkreta lärtillfällen den orsakade.

### Fas 2 — Andra domänen som kopia

- Välj **EN** andra domän — software delivery är starkast kandidat (författarens målgruppsöverlapp, väldokumenterade mönster, tydlig pedagogisk efterfrågan).
- Bygg den som en **separat instans**: kopiera repo eller fork, byt content, behåll struktur. *Acceptera duplicering.*
- Vid utveckling: notera *varje* gång du tvingas ändra engine för att få det att fungera. Det är data om hidden coupling.
- Efter andra domänen: ta tillbaka observationerna och se om de pekar på en naturlig abstraktion.

**Exit-kriterium**: båda domäner körs, och du har en *empirisk* lista över vad som duplicerades och vad som skulle vinna på abstraktion.

### Fas 3 — Refaktorera till engine + domain-paket

- Börja extrahera generic patterns till engine + UI framework.
- Domain manifest föds från observerade behov, inte från fas-1-spekulation.
- Refaktoreringen ska klara båda existerande domäner UTAN regressioner i pedagogisk kvalitet.

**Exit-kriterium**: båda domäner kör på extracted engine; pedagogisk kvalitet bevarad i båda; engine är dokumenterad nog att en tredje domän kunde börja byggas av någon annan.

### Fas 4 — Tredje domänen är platform-test

- Tredje domänen byggs av platform-användare (kanske inte du själv).
- Mätning: hur stor andel av tredje domänen är ny kod vs återanvändning?
- Om < 30 % är ny kod (mestadels content), är platform real.
- Om > 50 % är ny kod, abstraktion är fel — gå tillbaka till fas 3.

**Exit-kriterium**: platform har bevisat sig genom oberoende test.

---

## Framtida epics

Skissade på epic-nivå, **inte** sprintbara stories. De är till för att se konturer, inte för att schemalägga.

### Telecom-tracket (innan platform-resa kan börja)

- **E0a** — Validering: lärandeeffekt-mätning, användarintervjuer.
- **E0b** — Polering: kvarvarande UX-rough-edges, mobil-stabilisering, doc-content.
- **E0c** — Distribution: gör verktyget hittbart för dem som har nytta av det.

### Platform-tracket (när telecom är validerad)

- **E1** — *Domain manifest format*: definiera datastruktur som beskriver en domän self-contained.
- **E2** — *Software Delivery-domänen som kopia*: bygg som separat instans (fas 2 ovan).
- **E3** — *Engine extraction*: lyft generic flow-engine ur telecom-koden.
- **E4** — *UI framework extraction*: lyft generic UI-primitives.
- **E5** — *Multi-domain mode-switcher*: en användare kan välja domän vid sessionsstart, eller jämföra mönster över domäner.
- **E6** — *Cross-domain patterns library*: pedagogiska mönster som gäller över domäner (Theory of Constraints, queueing theory, Little's Law) får egen vy som visar samma mönster i olika domänspråk.
- **E7** — *Domain authoring*: möjligen verktyg för att låta utbildare definiera egna domäner. (Risk: scope creep — kan visa sig vara ett separat produkt-spår.)
- **E8** — *Outcome tracking*: telemetri (opt-in) som mäter om användning leder till lärtillfällen.

---

## Frågor som måste valideras

Det finns ett antal antaganden i hypotesen som **inte är bevisade** och som platform-resans framgång beror på.

1. **Är "flow systems" en kategori användare faktiskt tänker i?** Eller är det en abstraktion *vi* finner elegant men som målgrupperna inte känner igen sig i?

2. **Lär sig telecom-användare något konkret av simulatorn?** Eller är det "trevligt att klicka på"? Skillnaden är skillnaden mellan produkt och leksak.

3. **Skulle software delivery-folk vilja använda en simulator för sin domän?** De har redan kanban-boards och dora-dashboards. Vad ger en simulator dem som de inte har?

4. **Hur stor är overlapparen mellan målgrupper?** Hjälper det en organisation att samma verktyg lär ut både telecom och software delivery, eller är det två orelaterade publik?

5. **Klarar plain-script-modellen flera domäner samtidigt?** Eller blir det ett ramverks-tvång vid fas 3?

6. **Är pedagogiska principer faktiskt domain-agnostic?** Eller har telecom-domänen så starka pedagogiska konventioner (BSS/OSS, ToC, fall-out) att de inte överförs?

7. **Vem är Sponsor?** En platformsproduktstrategi förutsätter någon som vill betala för att den existerar. Telecom-simulatorn är (just nu) en passion project. En platform behöver en kommersiell hypotes.

Att svara på dessa frågor är *fas 1's* riktiga arbete — inte att bygga mer features.

---

## Avslutande reflektion

Den starkaste anledningen till att skriva ner den här visionen *nu* är inte att skynda på platform-resan. Det är att förebygga *omedveten* divergens från den.

Varje gång vi i fas 1 lägger till en ny telecom-feature kommer vi stå inför ett designval: *kapsla det här som domänspecifikt eller hårdkoda det i engine?* Med visionen nedskriven är default-svaret tydligt: **kapsla. Behandla content som data. Behandla regler som data. Tvinga inte engine att veta vad ett "Customer Order" är.**

Det är inte gratis — det är några extra rader struktur per feature. Men det betyder att om vi *aldrig* gör platform-resan, har vi förlorat lite tid. Om vi *gör* den, har vi sparat enormt.

Det är den asymmetrin som motiverar dokumentet. Inte ambitionen.

---

> **Nästa steg (om något)**: nej. Detta dokument är slutleverabel för nu. Ingen kod ska skrivas baserat på det. När/om någon av frågorna i sektionen "Frågor som måste valideras" får ett tydligt svar är det dags att återbesöka dokumentet och fatta beslut om fas 2.
