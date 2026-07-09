---
title: Enterprise Delivery Lab — designdokument
description: Designförslag för en isolerad andra-domän-simulator (enterprise IT-leverans) i OSS/BSS-simulator-repot. Bygger på VISION.md:s Fas 2-strategi ("copy, don't abstract") och FlowLab-precedenten. Ingen implementation — arkitektur, återanvändning, första slice och risker.
category: design
status: proposal
last_updated: 2026-07-04
sections: [Status och scope, Syfte och pedagogiskt mål, Guardrails, Designprinciper, Domänmodell, Arkitekturupplägg, Återanvändbara mönster, Domänspecifikt, Första vertikala slice, Roadmap: MVP → framtid, Risker med för tidig generalisering, Öppna frågor, Definition of Done för slice 1]
tags: [design, enterprise-delivery, platform, phase-2, simulation, pedagogy]
depends_on: [VISION.md]
related: [VISION.md, README.md, flow-lab.html]
---

# Enterprise Delivery Lab — designdokument

> **Status:** Detta är ett *designdokument*, inte en plan och inte kod. Det beskriver en möjlig andra domän för simulatorn — enterprise IT-leverans — och hur en första minimal slice skulle byggas *isolerat* utan att röra telecom-simulatorn. Ingen implementation ska ske baserat på detta dokument utan explicit beslut. Dokumentet är kalibrerat mot `VISION.md` (Fas 2: "second domain by copy-paste").

---

## Status och scope

**I scope för detta dokument:**

- Arkitekturupplägg för en isolerad enterprise-leveranssimulator.
- Vilka mönster från telecom-simulatorn och FlowLab som återanvänds — och *hur* (kopia, inte delad kod).
- Vad som måste vara domänspecifikt.
- En första minimal vertikal slice.
- Risker med att generalisera för tidigt.

**Inte i scope:**

- Ingen kod. Ingen engine-extraction. Ingen platform-abstraktion.
- Ingen ändring i telecom-simulatorn (`index.html`, `src/simulation/*`, `src/ui/*`).
- Ingen ändring i FlowLab (`flow-lab.html`, `src/flow-lab/*`).
- Inga senare slices (parallell batch, grafer, reglage, optimize-mode) — de skisseras men designas inte.

Detta dokument är i linje med `VISION.md`: telecom är fortfarande huvudfokus, och en andra domän byggs — *om* den byggs — som en separat instans med accepterad duplicering, inte som en generaliserad plattform.

---

## Syfte och pedagogiskt mål

En generell, publik och ofarlig simulator för komplex IT-/verksamhetsleverans i stora industri-/engineeringbolag. Den ska hjälpa användaren att intuitivt förstå:

- **Varför enterprise delivery blir långsamt** — inte på grund av lat personal, utan på grund av struktur: handoffs, beroenden och köer.
- **Hur beroenden skapar väntan** — ett steg kan vara klart men ändå blockerat av att arkitektur, säkerhet eller drift inte är aligned.
- **Varför lokala förbättringar inte alltid förbättrar helheten** — att snabba upp implementation hjälper inte om flaskhalsen sitter i security review.
- **Varför tidig alignment minskar rework** — arkitektur- och säkerhetsdialog sent i flödet kostar omtag; tidig kostar mindre.
- **Hur hypotesdriven förbättring fungerar i komplexa leveranssystem** — samma *nuläge → mål → hinder → experiment*-loop som telecom-simulatorn redan använder.

Det pedagogiska bäraren är samma treklang som resten av verktyget (VISION.md, "Run, break, repair"):

1. **Run** — kör ett initiative genom happy path, se att det når driftsatt förmåga.
2. **Break** — trigga en blocker (t.ex. security review delay), se ledtiden och konsekvenserna växa.
3. **Repair** — (senare slice) justera en kontroll och se effekten i delta mot förra körningen.

---

## Guardrails

Dessa är hårda och ska stå i klartext överst i domändatafilen när/om kod skrivs:

- **Ingen Saab-branding.** Ingen organisationsspecifik identitet.
- **Inga militära system, inga flygplansspecifika detaljer.**
- **Inga antaganden om verkliga interna processer** hos något specifikt bolag. Modellen är en generisk lärkonstruktion, inte en avbildning.
- **Håll det generiskt och publikt.** Aktörer och steg är arketyper (Business Owner, Enterprise Architecture, Security…), inte verkliga roller på en verklig arbetsplats.
- **Telecom-simulatorn får inte gå sönder.** Isolering är ett strukturellt krav, inte en ambition.
- **Telecom first, platform later.** Denna domän är sekundär tills telecom är validerad.
- **Boy Scout Rule, men ingen stor opportunistisk refactor.**

---

## Designprinciper

Hur vi vill bygga simulatorn — värderingarna bakom arkitektur- och slice-besluten i detta dokument:

- **Domän före plattform.** Bygg en konkret domän klart innan någon generalisering ens övervägs.
- **Återanvänd beteenden och pedagogiska mönster före implementation.** Kopiera det som redan är validerat i telecom/FlowLab istället för att uppfinna nytt.
- **Lär genom interaktion snarare än långa texter.** Default-handlingen är att göra något — klicka, prova, observera — inte att läsa.
- **Börja med en liten vertikal slice som ger verkligt lärande.** En smal men komplett *run → break*-loop slår en bred men halvfärdig funktion.
- **Generalisera först när minst två domäner har visat samma behov.** Abstraktion upptäcks från observation, inte från spekulation.
- **Håll simulatorn publik och generisk.** Inga företagsinterna processer, ingen skyddsvärd information — bara arketyper.
- **Följ Boy Scout Rule, men undvik opportunistiska storrefaktorer.**

---

## Domänmodell

### Delivery flow — "Från verksamhetsbehov till driftsatt IT-förmåga"

Tio steg. Arbetsenheten (ett *initiative*) passerar dem i sekvens:

1. **Business Need** — verksamhetsbehov formuleras.
2. **Intake / Prioritering** — behovet tas emot, värderas, prioriteras.
3. **Architecture Review** — passar lösningen in i mål-arkitekturen?
4. **Security & Compliance Review** — risk, regelefterlevnad, godkännande.
5. **Delivery Planning** — resurser, beroenden, sekvensering.
6. **Implementation** — själva byggandet.
7. **Integration & Test** — integration mot omgivande system, verifiering.
8. **Deployment / Release** — driftsättning, change advisory.
9. **Operational Handover** — överlämning till drift.
10. **Benefit / Capability Realized** — förmågan är i produktion och ger nytta.

### Aktörer / system

Arketyper som "äger" olika steg och skapar handoffs mellan sig:

- Business Owner
- Project Management
- Enterprise Architecture
- Security
- Compliance
- IT Delivery Team
- Infrastructure / Platform
- Operations
- Vendor
- Change Advisory / Release

Handoffs mellan aktörer är en central källa till väntan — varje ägarbyte har en kostnad (översättning, kö, kontextväxling). Det är samma mekanik som telecom-simulatorns handoffs, med annan etikett.

### Blockers (fail-injektion)

Fem domänspecifika blockers som användaren kan trigga. Var och en är mekaniskt en fördröjning och/eller ett omtag, men bär enterprise-nyans (viktigt — se Risk 1):

| Blocker | Var den slår | Pedagogisk poäng |
|---|---|---|
| **Security review delay** | Steg 4 | En färdig implementation kan stå still för att en review-kö är lång. Kön, inte arbetet, är flaskhalsen. |
| **Architecture rework** | Steg 3 → tillbaka | Sen arkitektur-alignment tvingar omtag av redan gjort arbete. Tidig alignment hade varit billigare. |
| **Vendor dependency** | Steg 5/6 | Externt beroende skapar väntan som teamet inte råder över. |
| **Test environment unavailable** | Steg 7 | Delad, begränsad resurs (testmiljö) blir en kö-punkt. |
| **Operations handover missing** | Steg 9 | Klart i test men inte driftsatt — "done" ≠ "i produktion och förvaltat". |

### Impact — operational consequence first

Metrics översätts till konkreta konsekvenser (VISION.md-princip 4). Abstrakta siffror är svaga; konsekvenser är starka:

- **Lead time** — total tid från behov till realiserad förmåga.
- **Queue pressure** — hur mycket arbete som väntar på begränsade steg (review, testmiljö).
- **Rework** — andel arbete som fått göras om p.g.a. sen alignment.
- **Delayed deployment** — hur mycket release-datumet glider.
- **Stakeholder confidence risk** — mjuk men affärskritisk konsekvens: varje glidning och omtag urholkar förtroendet hos beställare. Detta är domänens motsvarighet till telecom-simulatorns "supportsamtal + billing-fördröjning".

### Konceptuell mappning telecom → enterprise delivery

Bekräftar att mekaniken är densamma och att endast content skiljer (jfr. VISION.md:s domain mapping):

| Generiskt koncept | Telecom | Enterprise Delivery |
|---|---|---|
| Kommersiell/verksamhets-intent | Customer Order | Business Need |
| Intag och styrning | Order Management | Intake / Prioritering |
| Godkännande-grind | (implicit) | Architecture + Security/Compliance Review |
| Begränsad resurs → kö | RI/Prov workers, fiberport | Reviewers, testmiljö-slots, vendor |
| Bygg/aktivering | Provisioning / Activation | Implementation + Integration & Test |
| Verifiering | Service Verified | Integration & Test pass |
| "Klart"-signal | BillingStartRequested | Capability Realized |
| Assurance/observability | Network alarms, NOC | Operations / on-call |
| Dominerande feedback-loop | Fail → retry → cascade | Rework → omtag → försening |
| Operativ konsekvens | Manuella undersökningar, billing-fördröjning | Rework, delayed deployment, stakeholder confidence risk |

---

## Arkitekturupplägg

### Princip: copy, don't abstract (VISION.md Fas 2)

`VISION.md` är explicit: *"second domain by copy-paste, third domain by platform"*. Andra domänen ska byggas som en **separat instans** — kopiera struktur, byt content, **acceptera duplicering**. Ingen generisk engine ska extraheras nu. Skälet är att den generiska modellen ska *upptäckas* från observerade likheter mellan två konkreta domäner, inte spekuleras fram (VISION.md Risk 2 och Risk 5).

Detta matchar också guardrailen "ingen stor refactor" och "telecom får inte gå sönder": eftersom ingen delad kod rörs, kan telecom per definition inte regrediera.

### FlowLab som strukturell precedent

`flow-lab.html` + `src/flow-lab/*` är redan en fungerande, isolerad sido-simulator i samma repo:

- Egen HTML-sida med länk fram och tillbaka till huvudsimulatorn.
- Eget scope via IIFE och ett enda globalt API-objekt (`window.FlowLabEngine`) — läcker inte in i telecom-namnrymden.
- Egna filer under `src/flow-lab/`, egen CSS som bygger på `main.css`-primitiver.
- En "experiment · inkubator"-badge som signalerar att det är en pågående utforskning.

Enterprise Delivery Lab byggs enligt exakt samma mönster. FlowLabs `flow-engine.js` (tick-baserad discrete-event-motor med spawn → step-transitions → sample → subscribers) är den mekaniska förlagan — men den **kopieras konceptuellt, importeras inte**. Varje gång man under bygget tvingas avvika från FlowLab-mönstret för att få enterprise-flödet att fungera är en observation att notera; det är just den datan som en framtida Fas 3-abstraktion ska bygga på.

### Föreslagen filstruktur

```
enterprise-lab.html               ← ny egen sida (systervy till flow-lab.html)
src/enterprise-lab/
  ed-domain.js                    ← ALL domänspecifik data: STAGES, ACTORS, BLOCKERS, IMPACT_RULES
                                     + guardrails som kommentar överst
  ed-engine.js                    ← single-initiative flow-motor (konceptuell kopia av
                                     flow-engine-mönstret, reducerad till det slice 1 behöver)
  ed-render.js                    ← rendering: timeline, event-logg, impact-panel, DOM-refs
  ed-app.js                       ← wiring: knappar → engine, engine-subscribers → render
src/styles/enterprise-lab.css     ← egen stil, återanvänder main.css-primitiver
docs/enterprise-delivery-lab-design.md   ← detta dokument
```

**Laddordning i `enterprise-lab.html`** (samma plain-script-modell som resten av repot):

```
ed-domain → ed-engine → ed-render → ed-app
```

`ed-app.js` laddas sist eftersom den wire:ar ihop de andra. Domändata laddas först eftersom motorn och renderingen läser den.

### Vad som *inte* ändras

- `index.html` — orörd.
- `src/simulation/*`, `src/ui/*`, `src/app.js` — orörda.
- `flow-lab.html`, `src/flow-lab/*` — orörda.
- `src/styles/main.css` — orörd (återanvänds read-only via `<link>`).

Enda tillägg utanför den nya `src/enterprise-lab/`-mappen är detta designdokument. En framtida implementation lägger till `enterprise-lab.html` och `enterprise-lab.css` men rör fortfarande ingen befintlig fil.

---

## Återanvändbara mönster

Dessa återanvänds som *mönster* (kopierade och anpassade), inte som delad kod. De är redan validerade i telecom/FlowLab och identifierade som domain-agnostic i `VISION.md`:

| Mönster | Källa | Hur det återanvänds |
|---|---|---|
| Discrete-event tick-loop | `flow-engine.js` | Konceptuell kopia; reduceras till single-initiative i slice 1. |
| Single-flow timeline | telecom `runFlow` + `render.js` | Ett initiative visas som en tidslinje av steg. |
| Event-logg | telecom `render.js` | Textström av vad som händer per steg. |
| Blocker/fail-injektion | telecom `parallelTick` failProb | Användaren triggar en blocker; ett steg fördröjs/omtas. |
| Operational Impact-panel | telecom `metrics.js` / impact-mönstret | Metrics → org-konsekvenser (lead time, rework, confidence risk). |
| Reflection-frågor | `src/ui/reflection.js` | *Vad observerade du? Vad förvånade dig? Vad testar du härnäst?* |
| Run-comparison (delta) | telecom `comparePreviousRun` | *Senare slice* — delta mellan två körningar. |
| Collapsible panels + mode-tabs | `main.css` + telecom UI | *Senare slice* — Learn/Optimize-lägen. |
| CSS-primitiver | `main.css` | Delas rakt av via `<link>` (ren styling, ingen logik). |

Poängen (VISION.md): dessa är inte "telecom-UI", de är *flow-systems-UI*. Att de fungerar i två domäner är själva signalen inför en eventuell Fas 3.

---

## Domänspecifikt

Allt nedan bor i `ed-domain.js` och ingenting av det får sippra in i motorn (motorn ska veta att det *finns* steg och blockers — inte vad de heter eller varför de är pedagogiskt viktiga). Detta är VISION.md:s mitigation mot Risk 1 (domain knowledge loss):

- **STAGES** — de 10 delivery-stegen med namn, ägande aktör, baseline-duration.
- **ACTORS** — de 10 aktörsarketyperna med namn och roll.
- **BLOCKERS** — de 5 blockers med var de slår, effekt (fördröjning/omtag) och pedagogisk text.
- **IMPACT_RULES** — regler som härleder lead time, queue pressure, rework, delayed deployment, stakeholder confidence risk ur körningens händelser.
- **Guardrails** — som kommentar överst i filen, så att den som redigerar content påminns.

Content är skarp och konkret, aldrig generisk "enterprise BPMN"-text — det är vad som håller domänen pedagogiskt levande (Risk 2).

---

## Första vertikala slice

**Slice 1: Single-initiative flow med blockers och impact.** Minsta möjliga treklang.

Användaren kan:

1. **Skapa ett initiative** (en knapp — som telecom "1 order").
2. **Se det röra sig genom de 10 stegen** på en timeline, med event-logg som berättar vad som händer.
3. **Trigga en blocker** (fem knappar) och se den slå på rätt steg.
4. **Se impact** — lead time ökar, impact-panelen fylls med queue pressure, rework, delayed deployment och stakeholder confidence risk.

**Uttryckligen INTE i slice 1** (håller slicen minimal och YAGNI):

- Ingen parallell batch av flera initiatives.
- Inga grafer (throughput/queue depth).
- Inga reglage (WIP, capacity, variation).
- Inget optimize-mode och ingen run-comparison.
- Ingen mode-tab-struktur.

Slice 1 räcker för att leverera det pedagogiska kärnbudskapet *run → break*: användaren ser ett initiative lyckas, triggar sedan en blocker och ser konkret varför enterprise delivery blir långsamt och hur ett beroende skapar väntan. *Repair*-halvan (kontroller som förbättrar) kommer i en senare slice, precis som i telecom-simulatorns utvecklingsordning.

---

## Roadmap: MVP → framtid

Den första slicen är medvetet liten. Det är ett *designval*, inte slutmålet: en smal men komplett vertikal skiva som faktiskt lär ut något, byggd innan något större. Roadmapen nedan visar vart det kan växa — men allt bortom MVP designas inte här (en slice = en idé).

### MVP (Slice 1)

- Ett initiative.
- En tidslinje.
- Ett blocker.
- Operational impact.
- Reflektion efter körning.

Detta räcker för det pedagogiska kärnbudskapet *run → break*: se ett initiative lyckas, trigga en blocker, förstå konkret varför enterprise delivery blir långsamt.

### Möjliga nästa steg

Riktning, inte plan — ungefärligt ordnade efter växande komplexitet:

- Flera samtidiga initiatives.
- Delade resurser.
- Köer och väntetider.
- Bottlenecks.
- Toyota Kata / hypotesdriven förbättring.
- Optimize Process (kontroller som förbättrar — *repair*-halvan av treklangen).
- Batch-simulering.
- System metrics.
- Cross-functional dependencies.

Var och en är en egen framtida slice med egen brainstorm/plan-cykel. De byggs bara när det finns ett konkret skäl, och i den ordning som lärandet kräver — inte alla på en gång.

---

## Risker med för tidig generalisering

Refererar `VISION.md`:s sju risker. De tre skarpaste för denna domän och slice:

### Risk 1 — Domain knowledge loss (störst här)

Om blockers reduceras till generiska "fails" tappar de sin pedagogiska skärpa. "Architecture rework" som bara "en fördröjning" lär ingen någonting; "en färdig lösning måste göras om för att arkitektur-alignment kom sent" lär ut något konkret.

> **Mitigation:** all nyans bor i `ed-domain.js` som skarp, konkret text. Motorn hanterar bara mekaniken.

### Risk 3 — Engineering tax

Att bygga generisk engine + telecom + enterprise kostar 2–3× mer än att bygga dem separat. Värdet av abstraktion syns först vid domän 3.

> **Mitigation:** copy-paste, ingen engine-extraction nu. Notera varje avvikelse från FlowLab-mönstret som data inför en framtida Fas 3.

### Risk 2 — "Allt är en trädstruktur av lådor"

För tidig abstraktion ger en generisk enterprise-BPMN-känsla — tekniskt korrekt, pedagogiskt dött.

> **Mitigation:** vänta med abstraktion tills två domäner faktiskt kört; skriv skarp domän-content, inte generisk.

### Övriga (kort)

- **Risk 4 (pedagogisk leakage):** tvinga inte in enterprise i telecoms BSS/OSS-lager. Denna domän behöver inte samma layer-koncept; aktörer räcker.
- **Risk 6 (tappad ergonomi):** håll plain-script-modellen. Ingen bundler, inga deps — sidan ska öppnas direkt från disk.
- **Risk 7 (den-som-bygger-vill-bygga):** telecom är inte validerad ännu. Denna domän är en *utforskning*, markerad som "experiment · inkubator", inte en produktsatsning. Bygg bara slice 1 när det finns ett konkret skäl.

---

## Öppna frågor

Att besvara innan/under en eventuell implementation:

1. **Timeline vs kanban som primär vy i slice 1?** Telecom använder timeline för single-order; FlowLab använder kanban-kolumner. Timeline passar en linjär 10-stegssekvens bäst — men värt att bekräfta vid bygge.
2. **Hur mycket av event-loggen ska vara förskriven text vs härledd?** Telecom har rika förskrivna event-texter. För slice 1 räcker enkla härledda rader; rikare text kan komma senare.
3. **Ska blockers vara mutually exclusive eller kunna staplas?** Slice 1 kan börja med en blocker i taget för tydlighet.
4. **Var landar "stakeholder confidence risk" visuellt?** En mjuk metric behöver en begriplig representation (t.ex. en fallande förtroende-mätare) — designas när impact-panelen byggs.

---

## Definition of Done för slice 1

När slice 1 en gång byggs (inte nu), är den klar när:

- [ ] `enterprise-lab.html` öppnas direkt från disk och kör utan deps/build.
- [ ] Ett initiative kan skapas och vandrar genom alla 10 steg på en timeline.
- [ ] Alla 5 blockers kan triggas och slår på rätt steg.
- [ ] Impact-panelen visar lead time, queue pressure, rework, delayed deployment och stakeholder confidence risk.
- [ ] Guardrails står i klartext överst i `ed-domain.js`.
- [ ] Telecom-simulatorn och FlowLab är bevisligen orörda (inga diff:ar i deras filer).
- [ ] Manuell verifiering mot en egen kort checklista (i stil med README:s "Saker att prova").

---

> **Nästa steg (om något):** ingen kod. Detta dokument är slutleverabel för denna session. En implementation av slice 1 kräver ett eget, explicit beslut och startar då med en egen brainstorm/plan-cykel.
