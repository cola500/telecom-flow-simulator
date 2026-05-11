---
title: Pedagogisk filosofi
description: Hur simulatorn är designad pedagogiskt — discovery före text, kör/bryt/reparera, reflektionsfrågor, flera zoom-nivåer, run comparison. Konkret experiment-exempel för "automatisera resource reservation".
category: learning-content
status: in-progress
last_updated: 2026-05-11
sections: [Designprinciper, Förbättringsexperiment — automatisera resource reservation, Influenser]
related: [README.md, telecom-theory.md, flow-systems-thinking.md, VISION.md]
---

# Pedagogisk filosofi

Den här filen samlar hur simulatorn är designad pedagogiskt. Den fokuserar på *hur* lärandet ska ske, inte vad som lärs ut. För domänteori, se [`telecom-theory.md`](telecom-theory.md). För flödesteori, se [`flow-systems-thinking.md`](flow-systems-thinking.md).

## Designprinciper

Simulatorns UX är inte vald estetiskt — den följer ett antal pedagogiska principer som är gemensamma över sektioner och kommer från etablerade idéer inom experiential learning, systems thinking och guided discovery.

### Discovery > Documentation

Lärandet ska ske genom interaktion, inte genom att läsa beskrivningar. Beskrivningar finns som *backup*, inte som *huvudkanal*. Användaren ska kunna förstå majoriteten av flödet utan att läsa en mening — bara genom att klicka, prova och observera.

### Run, break, repair

Treklang som driver pedagogisk insikt:

1. **Run** — kör happy path, se att det fungerar.
2. **Break** — trigga ett fel (ResourceUnavailable, ActivationRejected, hög load), se konsekvensen.
3. **Repair** — använd en kontroll (automation, capacity, backpressure), se hur det förändras.

Varje pedagogiskt budskap i simulatorn (Theory of Constraints, partial activation, queueing theory) ska kunna undervisas via denna treklang. Om det inte kan det, är det fel kanal — det hör hemma i en bok.

### Show flow, not slides

När man kan *se* en kö växa förstår man kö-teori snabbare än genom att läsa Little's Law-formeln. Visualiseringen är inte estetik — den är *kognitivt verktyg*. Timeline-vyn, system map-färgkodningen, real-time-uppdaterad dashboard, och run comparison-kurvan är alla utformade för att göra struktur synlig.

### Operational consequence first

Tekniska siffror är abstrakta. *Konsekvenser* är konkreta. "5 incidents" säger lite; "5 manuella undersökningar + 5 försenade fakturor + ~6 supportsamtal" säger mer. Operativ påverkan-panelen är denna princip institutionaliserad.

### Multiple zoom levels

Användaren ska själv kunna välja zoom: mini-flow (orientera) → systemkarta (struktur) → eventflöde (detalj) → batch (system-vy). Att tvinga en zoom-nivå förlorar olika typer av lärande.

### Modes for cognitive load

"Förstå domänen" och "experimentera med kontroller" är två olika mentala lägen. Att blanda dem ökar kognitiv belastning. Mode-tabs (Learn / Optimize / Documentation) gör skillnaden explicit.

### Compare runs

Det viktigaste lärandet sker ofta i **delta** mellan två körningar. *"Innan automation: 12 sek. Efter: 8 sek. Bottlenecken flyttade från RI till Prov."* Det är där insight kondenserar — inte i en enskild siffra. Förbättringsexperiment-panelen, ghost-kurvan i throughput-grafen och run comparison-jämförelsen är alla designade för delta-läsning.

### Reflect explicitly

Varje pattern-text, insight-ruta och reflektionsfråga gör det implicita explicit. *Vad såg du? Vad förvånade dig? Vad skulle du testa härnäst?* — strukturen är inspirerad av guided discovery och coaching-anda, inte test eller quiz.

### Multiple entry points to the same insight

Samma lärdom (t.ex. *"billing ska triggas på verifierad aktivering, inte orderstatus"*) når användaren via flera kanaler: theory journey-steget, fail-prov-scenariots impact-panel, glossary-popovern för Failed Activations, reflektionsfrågan efter ett fail. Redundans är pedagogiskt välgörande, inte design-fel.

## Förbättringsexperiment — automatisera resource reservation

Ett konkret exempel på hur designprinciperna fungerar tillsammans. Simulatorn har en toggle: **Automatisera resource reservation**. När den är på minskar `ResourcesReserved`-stegets duration från 5.0s till 2.5s — typexempel på vad en förbättring i Resource Inventory-domänen kan ge (t.ex. att gå från manuell tilldelning av portar till automatisk reservation via API).

**Kör så här:**

1. Toggle av — klicka "Create customer order". Notera total lead time och bottleneck.
2. Toggle på — klicka "Create customer order" igen. Förbättringsexperiment-rutan visar nu manual vs automated, förbättring i sekunder och procent, och om bottlenecken har flyttat.

**Vad simulatorn lär ut här:**

- **Konkret förbättring blir mätbar.** Det är skillnad på att säga "vi borde automatisera reservation" och att se "lead time minskade med 15%". Den senare formuleringen håller över ett ledningsmöte.
- **Bottlenecks flyttar.** När man fixar den långsammaste delen blir nästa del den långsammaste. *Theory of Constraints* säger att det är så det ska gå till — flytta begränsningen tills den ligger där det är billigast att hantera.
- **Förbättring nedströms från bottlenecken är värdelös.** Om vi istället hade automatiserat något i Provisioning (som inte var bottlenecken) hade total lead time inte påverkats — eftersom Resource Inventory ändå skulle hålla flödet tillbaka. Det här är en av de viktigaste lärdomarna i processoptimering.
- **Förbättring uppströms från bottlenecken är "wasteful effort".** Att snabba upp Order Management när Resource Inventory är bottleneck betyder bara att fler ärenden köar framför Resource Inventory — kön blir längre, lead time minskar inte.

**Förbättringsperspektiv:** det här är varför *bottleneck-driven backlog* är ett kraftfullt prioriteringsverktyg. Mät, hitta bottlenecken, förbättra den, mät om, hitta nya bottlenecken, prioritera där. Linjärt och pragmatiskt — istället för att låta varje team optimera lokalt utan koppling till värdeflödet.

**Hur det kopplar till designprinciperna ovan:**

- *Run, break, repair*: kör → observera bottleneck → toggla automation → kör igen → se delta.
- *Compare runs*: improvement-panelen visar manual vs automated bredvid varandra — lärandet sitter i jämförelsen.
- *Show flow, not slides*: bottleneck-markeringen i timeline-vyn gör Theory of Constraints konkret istället för teoretisk.
- *Reflect explicitly*: efter körningen dyker reflektionsfrågor upp som ber dig formulera vad du just såg.

## Influenser

Designprinciperna är inte uppfunna här. De ligger i linje med etablerade idéer inom systems thinking, experiential learning och guided discovery — utan att hänga på en specifik författare eller ett specifikt verk:

- **Experiential learning** — cykeln *konkret upplevelse → reflektion → konceptualisering → ny experimentation* är inbyggd i interaktionen.
- **Learner-driven facilitation** — den som ska lära sig ska *agera*, inte bli förelevsad. UX:n gör handlingen till default-läget och text till komplement.
- **Improvement-cykler i lean-traditionen** — definiera mål, mät nuläge, identifiera hinder, experimentera, mät igen. Simulatorn återskapar loopen i miniatyr.
- **Systems thinking** — gör struktur synlig så användaren kan se hur lokala optimeringar har globala effekter, och varför bottlenecks flyttar.
- **Coaching-anda — guiding over telling** — simulatorn ersätter inte en coach, men ger en utbildare ett konkret artefakt att samtala kring. Reflektionsfrågorna är ett exempel på den tonen.
- **Komplexa adaptiva system** — fail/retry-loopar som förstärker varandra, backpressure som handlar trade-offs, bottlenecks som flyttar — alla illustrerar att flöden är emergenta system där lokal optimering inte alltid leder till global förbättring.

Inget av detta är hårt knutet till specifika citat eller kapitel. Det är konceptuell inspiration, inte akademisk referensapparat — verktygets pedagogiska kraft ska inte hänga på att läsaren känner igen rätt referenser.

> En djupare diskussion av platformstanken (att samma pedagogiska principer skulle kunna återanvändas för andra domäner som software delivery) finns i [`VISION.md`](../VISION.md).
