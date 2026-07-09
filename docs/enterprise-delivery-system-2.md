---
title: Enterprise Delivery System 2.0 — konceptdokument
description: Discovery-design för nästa generations Enterprise Delivery Lab — från ett initiativ till ett system av samtidiga initiativ med begränsad kapacitet, köer och systemeffekter. Endast modell och riktning, ingen implementation.
category: design
status: proposal
last_updated: 2026-07-05
sections: [Status och scope, Vision, Arbetsobjekt, Flöde, Resurser, Blockers, Metrics, Visualisering, Learning, Toyota Kata, Återanvändning, Förslag på minsta vertikala slice]
tags: [design, enterprise-delivery, systems-thinking, simulation, discovery, phase-2]
depends_on: [docs/product-vision-and-capability-map.md, VISION.md, docs/enterprise-delivery-lab-design.md]
related: [enterprise-lab.html, index.html]
---

# Enterprise Delivery System 2.0 — konceptdokument

> **Status: discovery.** Detta dokument beskriver en *modell*, inte en plan och inte kod. Inget ska implementeras baserat på det utan ett eget beslut. Målet är inte fler features — målet är att simulatorn ska börja simulera **systemdynamik**: gå från "ett initiativ" till "ett system av samtidiga initiativ". Principerna nedan är inspirerade av Little's Law, Theory of Constraints, Lean Product Development, Kanban, Team Topologies, Accelerate och systems thinking — som *inspiration*, inte som något att implementera bokstavligt.

---

## Status och scope

**I scope:** en modell för flermängds-simulering i Enterprise Delivery Lab — arbetsobjekt, flöde, begränsad kapacitet, köer, blockers som systemeffekter, systemmetrics, visualisering, lärande, och hur Toyota Kata lyfts till systemnivå. Plus en identifiering av vad som kan återanvändas från OSS/BSS-simulatorns befintliga parallell-motor.

**Inte i scope:** ingen kod, ingen refactor, ingen engine-extraktion, ingen plattform. Ingen ändring i telecom eller i nuvarande EDL. Dokumentet avslutas med *en* minsta vertikal slice som kan byggas på 1–2 timmar — men bygget är ett separat beslut.

Detta ligger i linje med Product Vision (avsnitt om gap): det största gapet är att EDL har mekanik men ännu inte visar systemdynamik. Denna epik adresserar det.

---

## Vision

Nästa generations Enterprise Delivery Lab låter användaren *köra en organisation*, inte bara ett initiativ.

Idag följer man ett initiativ genom tio steg och ser var det fastnar. Det lär ut lokal orsak–verkan. Men det som gör stora organisationer långsamma syns inte i ett enskilt initiativ — det syns i **mängden**: när tjugo initiativ konkurrerar om samma arkitekter, när en kö framför säkerhetsgranskning växer tills den dominerar ledtiden, när "mer arbete igång" paradoxalt ger *mindre* levererat.

2.0 ska göra det osynliga synligt: användaren startar flera initiativ, ser dem röra sig genom ett flöde med begränsad kapacitet, och upptäcker — genom att experimentera — att systemets beteende inte är summan av delarna. En flaskhals flyttar sig när man lättar på den. Att sänka WIP kan korta ledtiden mer än att jobba snabbare. En lokal optimering kan försämra helheten.

Målet är en känsla i magen för flödesdynamik, byggd genom att göra — samma pedagogiska treklang som resten av verktyget (kör → bryt → reparera), men på **systemnivå**.

---

## Arbetsobjekt

Arbetsenheten är ett **initiativ**: en efterfrågad förändring som rör sig genom leveranssystemet. I dagens EDL är initiativet ett hårdkodat exempel med en enda instans. I 2.0 finns många samtidigt, och var och en bär den information som avgör hur det belastar systemet och var det riskerar att fastna.

Minsta meningsfulla informationsbärare:

| Fält | Vad det gör i modellen |
|---|---|
| `id` | Identitet, för att följa ett enskilt initiativ genom systemet. |
| `businessCapability` | Vad initiativet levererar — etikett för lärande och gruppering, inte mekanik. |
| `size` | Arbetsmängd (t.ex. S/M/L). Skalar hur länge det tar i varje steg. Driver variation i ledtid. |
| `risk` | Sannolikhet att trigga en blocker (t.ex. arkitektur-omtag). Kopplar arbetsobjekt till systemhändelser. |
| `archImpact` | Hur mycket steget Architecture belastas / hur troligt sent omtag är. |
| `secImpact` | Hur mycket Security & Compliance belastas / köbenägenhet. |
| `priority` | Kö-disciplin: avgör ordning när flera initiativ väntar på samma begränsade steg. |

Designnot: fälten är medvetet få. Varje fält måste tjäna en *observerbar* systemeffekt (en kö som växer, en ledtid som skenar). Fält som bara är "realistiska" men inte syns i beteendet hör inte hemma här — det är samma disciplin som i nuvarande domänmodell: nyans i data, mekanik i motorn.

---

## Flöde

Initiativ rör sig genom en sekvens av steg. 2.0 kondenserar dagens tio steg till en systemvänlig kedja med tydliga kapacitetspunkter:

```
Architecture → Security → Planning → Implementation → Testing → Deployment → Operations
```

Mappning mot dagens tio EDL-steg (så kontinuiteten är tydlig): Business Need och Intake antas ha skett (initiativet är redan efterfrågat och prioriterat); Architecture och Security motsvarar dagens granskningsgrindar; Implementation + Integration & Test bär bygget; Deployment och Operations motsvarar driftsättning och överlämning; Capability Realized är utflödet (det som räknas som "klart").

Två egenskaper skiljer 2.0-flödet från dagens single-initiative-flöde:

1. **Parallellism.** Många initiativ befinner sig i olika steg samtidigt. Systemet tickar framåt i diskret tid; i varje tick flyttas initiativ som kan flyttas.
2. **Kapacitetsgrindar.** Vissa steg kan bara arbeta med ett begränsat antal initiativ samtidigt. När fler vill in än kapaciteten tillåter bildas en **kö** framför steget. Kön — inte arbetet i steget — är det som gör leveransen långsam.

Detta är exakt exekveringsmodellen som telecom-simulatorns parallell-läge redan använder (tick-baserad diskret simulering med köer per begränsat system). Skillnaden är domän-content, inte mekanik.

---

## Resurser

Begränsad kapacitet är motorn i hela modellen. Utan den finns ingen kö, och utan kö ingen systemdynamik.

**Var kapaciteten är begränsad (kandidater):**

- **Architecture** — få arkitekter, hög efterfrågan. Klassisk uppströms-flaskhals.
- **Security & Compliance** — obligatorisk grind med begränsad granskningskapacitet (redan idag EDL:s `sec_delay`-flaskhals).
- **Testing** — delade testmiljöer, en begränsad fysisk/logisk resurs.
- **Implementation** — begränsat antal team.

**Kapacitetsmodell:** varje steg har ett tal `capacity` = hur många initiativ det kan arbeta med samtidigt. `capacity = ∞` betyder "snabb genomgång, ingen kö" (som telecom-simulatorns icke-`SINGLE_PROC`-system). `capacity = 1..N` betyder begränsad resurs där köer bildas. I en första version räcker det att **ett fåtal** steg är begränsade — pedagogiken kräver tydliga ställen där köer syns, inte realism i varje steg.

**Hur köer bildas:** när ett initiativ är klart i steg *n* och steg *n+1* har alla kapacitetsplatser upptagna, ställer sig initiativet i kö framför *n+1*. Kön töms enligt kö-disciplin (FIFO som default; `priority` kan senare tillåta förtur). Väntan i kö är ren waste — inget arbete utförs — och det är just den insikten simulatorn ska göra kroppslig.

**Little's Law som mental modell:** genomsnittlig ledtid ≈ WIP / throughput. Fler samtidiga initiativ (högre WIP) utan högre kapacitet ⇒ längre ledtid. Modellen behöver inte räkna Little's Law explicit — den ska få användaren att *upptäcka* relationen genom att skruva på WIP och se ledtiden svara.

---

## Blockers

Idag påverkar en blocker ett initiativ: `sec_delay` fördröjer *det* initiativet, `arch_rework` skickar tillbaka *det* genom några steg. I ett system förändras blockerns natur helt.

**Blocker som lokal händelse:** ett enskilt initiativ råkar ut för arkitektur-omtag och måste göra om steg. Isolerat kostar det bara det initiativet tid.

**Blocker som systemeffekt:** samma omtag skickar tillbaka initiativet *in i en redan belastad Architecture-kö*. Nu konkurrerar det omtagna arbetet med nytt inflöde. Kön växer. Alla efterföljande initiativ väntar längre. En lokal händelse har blivit en systemförsämring.

**När blir det en systemeffekt?** När den begränsade resursen som blockern belastar redan har en kö. Då är marginalkostnaden av en extra enhet arbete inte "en enhet" — den är "en enhet plus all väntan den påför alla bakom sig i kön". Det är den icke-linjära effekten som gör stora system svåra att intuitivt förstå, och det är kärnan i vad 2.0 ska lära ut.

**Återkopplingsslinga (medveten):** hög belastning ⇒ längre köer ⇒ mer stress/omtag ⇒ ännu högre belastning. Telecom-simulatorn har exakt denna slinga i Provisioning (fail-sannolikhet stiger med kölängd, fail spawnar retry). EDL 2.0 kan spegla den: risk för omtag stiger när ett steg är överbelastat. Precis som i telecom är detta en *lärandeeffekt*, inte en bugg — den ska inte "fixas".

---

## Metrics

I ett system blir flödesmetrics meningsfulla — de flesta av dem är odefinierbara för ett enda initiativ.

| Metric | Betyder | Varför den lär ut något |
|---|---|---|
| **Lead Time** | Tid från start till levererad förmåga, per initiativ. | Det mått verksamheten känner. Sprider sig när WIP stiger. |
| **Cycle Time** | Tid i aktivt arbete (exkl. kö). | Skillnaden mot lead time *är* väntan — ofta majoriteten. |
| **WIP** | Antal initiativ igång samtidigt. | Den variabel användaren styr; kopplas till lead time via Little's Law. |
| **Throughput** | Levererade initiativ per tidsenhet. | Visar att mer WIP inte ger mer output efter mättnad. |
| **Queue Length** | Antal väntande per begränsat steg. | Gör flaskhalsen visuell och tidsvarierande. |
| **Blocked Time** | Total tid initiativ stått i kö/blockerade. | Kvantifierar waste — det som förbättring ska minska. |
| **Rework %** | Andel arbete som gjorts om. | Kopplar sen alignment till systemkostnad. |
| **Flow Efficiency** | Cycle Time / Lead Time. | Ett enda tal som avslöjar hur mycket av tiden som är väntan. Ofta chockerande lågt. |

Designnot: en första version behöver inte alla åtta. Lead Time, WIP, Queue Length och Throughput räcker för att visa kärnbudskapet. De övriga läggs till när de har en observerbar poäng att bära.

---

## Visualisering

Så här *borde* det se ut (beskrivning, ingen implementation):

**Systemvy (huvudvy).** En horisontell kedja av de sju stegen — samma visuella språk som dagens statuskarta, men varje steg är nu en *behållare* som kan innehålla flera initiativ samtidigt. Varje initiativ är en liten bricka. Begränsade steg visar sin `capacity` och en **kö** som byggs upp framför sig (en synlig stapel av väntande brickor). Man ser initiativ flöda in, samlas framför flaskhalsen, och droppa ut på andra sidan.

**Kö-tryck.** Färg eller höjd på kön framför varje begränsat steg visar tryck i realtid — en heatmap över var systemet gör ont, precis som telecom-simulatorns systemkarta färgas vid last.

**Tidsserie.** En graf över tid: WIP, throughput och total kölängd. Här ser man mönstret som en ögonblicksbild missar — när kön börjar skena, när throughput planar ut. Detta är konceptuellt telecom-simulatorns throughput-graf, med enterprise-metrics.

**Initiativlista.** En tabell över alla initiativ med aktuellt steg, tid i system och tid i kö — för att kunna borra ner från system till enskilt fall (samma zoom-nivå-princip som resten av verktyget).

**Reglage.** Antal initiativ (WIP), kapacitet per begränsat steg, och en tidig-alignment-liknande kontroll. Att dra i ett reglage och se systemet svara *är* experimentet.

Fancy behövs inte. HTML/CSS/enkel SVG räcker — samma återhållsamma, pedagogiska estetik som redan finns.

---

## Learning

Vad ska användaren *upptäcka* (inte läsa sig till)?

- **"Det är inte implementation som begränsar systemet."** Man tror bygget är flaskhalsen; simulatorn visar att kön framför Architecture eller Security dominerar ledtiden.
- **"Mer WIP gav längre ledtid."** Att starta fler initiativ samtidigt kändes produktivt men gjorde allt långsammare — Little's Law i magkänsla.
- **"En blocker i arkitektur påverkade fyra initiativ."** En lokal händelse spred sig genom en delad resurs till hela systemet.
- **"Den lokala optimeringen försämrade helheten."** Att snabba upp ett icke-begränsande steg gav ingen effekt — eller flyttade bara flaskhalsen och dolde den.
- **"Flow efficiency var 15 %."** Det mesta av tiden var väntan, inte arbete — nästan alltid en överraskning.

Varje insikt ska nås genom en *körning som motbevisar en gissning*. Det binder ihop med prediction/reflection nedan.

---

## Toyota Kata

Idag körs prediction → experiment → observation → reflection på *initiativnivå*: "vad händer med det här initiativet om jag slår på alignment?" I 2.0 lyfts samma loop till **systemnivå**:

1. **Nuläge (mät):** kör systemet, läs av lead time, WIP, flow efficiency.
2. **Målbild:** t.ex. "halvera genomsnittlig lead time utan att sänka throughput."
3. **Hinder (prediction):** "jag tror flaskhalsen är Implementation." Formulera hypotesen *innan* experimentet.
4. **Experiment:** dra i *ett* reglage — höj Architecture-kapacitet, sänk WIP, aktivera tidig alignment.
5. **Observation:** jämför utfallet mot gissningen (samma spegel som dagens reflektion, men med systemmetrics och en delta mot förra körningen).
6. **Reflektion:** "flaskhalsen var inte där jag trodde — den flyttade till Security." Nästa hinder är fött.

Den avgörande skillnaden: på systemnivå är gissningen nästan alltid fel på ett *lärorikt* sätt, eftersom systemdynamik är kontraintuitiv. Det är där verktyget blir kraftfullast. Prediction/reflection-panelen som redan finns är rätt bärare — den behöver bara mata på systemmetrics istället för enskilda utfall.

---

## Återanvändning

Poängen (VISION.md Fas 2, "copy, don't abstract"): återanvänd *idéer och beteenden* som redan är validerade i telecom-simulatorn — kopiera konceptet, inte koden. Ingen delad motor extraheras nu.

**Kan återanvändas som koncept (finns validerat i telecom-simulatorns parallell-läge):**

| Koncept i OSS/BSS | Hur det återanvänds i EDL 2.0 |
|---|---|
| Tick-baserad diskret motor (`parallelTick` på intervall, `simTime`) | Systemets klocka — flyttar initiativ per tick. |
| Köer per begränsat system (`SINGLE_PROC` = ri/prov) | Köer per begränsat steg (Architecture, Security, Testing). |
| Kapacitetsreglage (`workersPerSystem`) | Kapacitet per steg — flyttar flaskhalsen (Theory of Constraints steg 5). |
| Fail/retry-slinga som stiger med kölängd | Omtag-risk som stiger med belastning — lokal händelse → systemeffekt. |
| Backpressure-toggle | WIP-begränsning: pausa nytt inflöde när en kö når tröskel. |
| Time-series-sampling + throughput/kö-graf | WIP/throughput/kölängd över tid. |
| Run comparison (ghost-kurva, `comparePreviousRun`) | Delta mellan två systemkörningar — kärnan i Kata-experimentet. |
| Systemkarta som heatmap | Kö-tryck per steg i realtid. |
| Prediction/reflection-panel (redan i EDL) | Kata på systemnivå. |

**Domänspecifikt (får inte generaliseras bort — det är här pedagogiken lever):**

- Stegen och deras innebörd (Architecture, Security & Compliance, …) och *varför* var och en är en trolig flaskhals.
- Blocker-nyansen: "sent arkitektur-omtag kaskaderar" ≠ generisk "fail".
- Tidig alignment som kontroll och dess trade-off (premie mot besparing).
- Operational impact i enterprise-termer (rework, stakeholder confidence risk), inte telecom-termer.
- Arbetsobjektets fält (business capability, arkitektur-/säkerhetspåverkan).

**Konceptuell mappning telecom → enterprise (bekräftar att mekaniken är densamma, content skiljer):**

| Generiskt | Telecom parallell-läge | EDL 2.0 |
|---|---|---|
| Arbetsenhet | Order | Initiativ |
| Begränsad resurs | RI/Prov workers | Arkitekter, säkerhetsgranskare, testmiljöer |
| Kö | Order-kö framför RI | Initiativ-kö framför Architecture/Security |
| Kapacitetsreglage | Workers per system | Capacity per steg |
| Belastningsdriven fail | Provisioning failProb | Omtag-risk vid överbelastning |
| Utflöde | BillingStartRequested | Capability Realized |

---

## Förslag på minsta vertikala slice

**Slice 1: "Tre initiativ, en flaskhals, en kö."** Den minsta körbara skiva som visar systemdynamik — byggbar på 1–2 timmar genom att kopiera telecom-parallell-mönstret i litet format, isolerat i EDL.

Omfattning:

1. **Spawna 3 initiativ** vid start (en knapp, som dagens "Start", fast tre).
2. **Ett flöde med ETT begränsat steg.** Låt Architecture ha `capacity = 1`; övriga steg är snabba genomgångar. En enkel tick-loop flyttar initiativ; de som inte får plats i Architecture ställs i kö (FIFO).
3. **Visa kön.** Framför Architecture: en synlig stapel av väntande initiativ som växer och krymper. Återanvänd statuskartans visuella språk.
4. **Visa ett mätetal när alla är klara:** genomsnittlig lead time, och (om enkelt) längsta kö.
5. **En lever:** en knapp/reglage som sätter Architecture-kapacitet 1 → 2. Kör igen och se genomsnittlig lead time falla — flaskhalsen lättar.

Uttryckligen INTE i slice 1: inga tidsserie-grafer, ingen backpressure, ingen omtag-slinga, inga sju fullt modellerade kapacitetssteg, ingen prediction-integration. Bara: flera initiativ, en kö, en observerbar WIP/kapacitet-effekt.

Varför denna slice: den levererar hela det pedagogiska kärnbudskapet i miniatyr — *en begränsad resurs skapar en kö, och kön, inte arbetet, styr ledtiden* — och etablerar den tick-baserade flermängds-motorn som allt annat i epiken bygger vidare på. Den bevisar modellen innan vi investerar i grafer, metrics och Kata-på-systemnivå.

Verifiering av slicen (när den byggs): kör med kapacitet 1 → kö bildas framför Architecture, lead time > single-initiative-baseline; höj till 2 → kön krymper, lead time faller. Telecom/FlowLab orörda.

> **Nästa steg (om något):** ingen kod. Detta dokument är discovery-leverabeln. En implementation av slice 1 kräver ett eget beslut och startar då med en egen brainstorm/plan-cykel.
