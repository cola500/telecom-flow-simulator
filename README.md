---
title: OSS/BSS Order-to-Activate Simulator
description: Lokal browser-baserad lärsimulator för en förenklad telekom-stack — visar order-to-activate-flödet, lead time, handoffs, bottlenecks och förbättringsfrågor.
category: learning-tool
status: in-progress
last_updated: 2026-05-09
sections: [Vad simulatorn lär ut, Kör den, Kodstruktur, Vad är BSS, Vad är OSS, Order-to-Activate, Lead time, Handoffs, Bottlenecks, Strategy & Enablement, Förbättring i agila team, Förbättringsexperiment, Köbildning och belastning, Felscenarier, Begränsningar, Lägga till nya pedagogiska slices, Nästa slice]
---

# OSS/BSS Order-to-Activate Simulator

En enkel HTML-simulator som visar hur en kundorder vandrar genom en telekomoperatörs OSS/BSS-stack tills tjänsten är aktiverad och fakturering startar.

## Vad simulatorn lär ut

- **Var** de centrala domänerna sitter i en stack och vilken sida (BSS vs OSS) de tillhör.
- **Vad varje domän gör**, varför den behövs, och var den brukar göra ont.
- **Hur ett order-to-activate-flöde ser ut** som en sekvens av events.
- **Var tid spenderas** — vilka steg tar längst, hur stor andel av lead time som är handoffs.
- **Var flaskhalsar uppstår** — flödet markerar automatiskt det långsammaste steget.
- **Vad handoffs kostar** — varje gång arbete byter system eller team uppstår friktion.
- **Var flödet typiskt går sönder** — ResourceMissing och ProvisioningFailed är de två klassiska.
- **Vilka frågor en Strategy & Enablement-roll** kan ställa för att förbättra flödet.

## Kör den

```bash
open index.html
```

Eller dra filen till en webbläsare. Ingen build, inga deps. Allt sker i klienten.

**Saker att prova:**

1. Klicka **"1 order"** → se de 6 eventen ticka in. Notera vilken systemruta som lyser i varje steg.
2. Titta på **Timeline** — du ser både eventen och handoffs (streckmönstrade staplar) mellan domäner. Det längsta steget får röd kant och systemboxen markeras som flaskhals.
3. Titta på **Metrics** — total lead time, hur stor andel som var handoffs, antal handoffs, antal failed events.
4. Klicka på en domänruta eller på ett event i loggen → **Learning mode** förklarar Vad / Varför / Typiska problem.
5. Klicka på "Process patterns"-länkarna i Learning mode för att läsa om handoffs, inventory som source-of-truth, downstream incidents, queueing theory, hög utilization och flow vs resource efficiency.
6. Klicka **Reset** och kör de två felscenarierna. Lägg märke till var flödet stannar och hur Metrics visar 'lost work'.
7. Toggla **Automatisera resource reservation** och kör 1 order igen → se "Förbättringsexperiment"-blocket räkna ut diff och se hur bottlenecken flyttar.
8. Klicka **"5 orders"** → simulatorn växlar till parallel-mode. Se köpanelen för Resource Inventory bygga upp en kö, dashboard räkna avg lead time och throughput, systemkartan färgsättas som heatmap.
9. Klicka **"20 orders"** → samma sak men starkare. Resource Inventory blir röd, lead time skenar, Provisioning börjar fail:a och retry-ordrar dyker upp i listan med "·R"-badge.
10. Jämför avg lead time mellan 1 / 5 / 20 orders. Skillnaden är inte linjär — den är hela poängen.
11. Höj **Resource Inventory workers** till 2 eller 3, klicka 20 orders igen. Kön framför RI minskar dramatiskt — men Provisioning blir nu ny bottleneck. Insight-rutan flaggar att bottlenecken har flyttat. Det är Theory of Constraints steg 5 ("hitta nästa bottleneck") visualiserat.
12. Titta på **Throughput &amp; system pressure over time**-grafen under körningen. Fyra linjer ritar sig: completed (grön, kumulativ — lutningen är throughput), active (blå), queue length (gul), incidents (röd). Mönster att leta efter: när blir gula linjen brant (kön bygger upp)? När börjar gröna linjens lutning plana ut (throughput nådd)? När börjar röda linjen ticka (load skapar incidents)? Kör samma 20-order-batch med 1 vs 3 workers och jämför formerna.
13. Toggla **Backpressure** på och kör 20 orders med 1 worker. En streckad gul linje visas på grafen vid tröskeln (3) — gula linjen klipps automatiskt mot den och plattar ut, eftersom Order Management pausar nya ordrar när RI:s kö når 3. Färre incidents, men längre real-tid att processa hela batchen. Det är trade-offen mellan flow och throughput.
14. Kör en till batch och titta på **jämförelse-blocket** under grafen. Den förra körningens kurva ritas svagt och streckad bakom den nuvarande, och fyra kort visar avg lead time / incidents / max queue / throughput (previous vs current) med pilar för bättre/sämre. Ändra ett enskilt reglage (capacity, automation, backpressure) mellan två körningar — då blir effekten av just den ändringen visuellt tydlig. Det här är simulatorns experiment-loop: ändra något, kör, se diff.

## Kodstruktur

Projektet är ren vanilla JS — inga build-tools, inga dependencies, ingen bundler. Filerna laddas i ordning som plain `<script>`-taggar och delar en gemensam global namnrymd (samma sak som om allt låg i ett enda script-block, bara delat i läsbara filer).

```
oss-bss-simulator/
├── index.html              ← HTML body + script-taggar i rätt ordning
├── README.md               ← denna fil
├── HYPOTHESIS.md           ← experimenthypotes + verifieringskriterier
└── src/
    ├── app.js              ← bootstrap (renderSystems, showLearningEmpty) + alla event listeners
    ├── simulation/
    │   ├── scenarios.js    ← SYSTEMS (de 7 domänerna), PATTERNS (lärotexter), HAPPY_PATH/FAIL_*
    │   ├── events.js       ← applyAutomation, fmtMs, calcHandoff, buildQueue (event-helpers)
    │   ├── metrics.js      ← finalize (single), hideImprovement, showImprovement, loadClass
    │   └── engine.js       ← state + runFlow (single) + parallel-engine + finalizeParallel
    ├── ui/
    │   ├── render.js       ← alla DOM-refs + renderSystems, log, timeline, dashboard, queue, order-list
    │   ├── charts.js       ← updateChart (SVG), summarizeRun, setCmpCell, updateRunCompare
    │   └── learning.js     ← right-hand learning panel (system-vy + pattern-vy)
    └── styles/
        └── main.css        ← all CSS
```

**Laddordning (definierad i `index.html`):**

```
scenarios → events → metrics → engine → render → charts → learning → app
```

`app.js` laddas sist eftersom den anropar funktioner från alla andra filer. State (som `parallelSim`, `automationEnabled`, `runHistory`) ägs av `engine.js` men läses/skrivs av render/charts/app — möjligt eftersom plain scripts delar en global namnrymd.

## Vad är BSS?

**Business Support Systems** är den kommersiella sidan av operatörens IT-stack — det som vetter mot kund och pengar.

Typiska BSS-domäner:

- **CRM / Customer** — vem kunden är, kontrakt, kontaktpunkter.
- **Order Management** — tar emot ordern, bryter ner den i tekniska delar och driver den till färdig leverans.
- **Billing / Charging** — fakturering, debitering, intäktsuppföljning.
- **Product Catalog** — vad som överhuvudtaget går att sälja (utelämnad i denna MVP för att hålla det smalt).

BSS svarar på frågor som *"Vad har kunden köpt? Vad ska vi ta betalt för? När ska faktureringen börja?"*

## Vad är OSS?

**Operational Support Systems** är den tekniska sidan — det som faktiskt levererar tjänsten i nätet.

Typiska OSS-domäner:

- **Service Inventory** — den logiska tjänstevyn (vilka tjänster finns, är de planerade/aktiva).
- **Resource Inventory** — fysiska och logiska resurser (portar, IP, fiberpar, slots, licenser).
- **Provisioning / Activation** — översätter ordern till konfigurationskommandon mot nätelement.
- **Assurance / Incident** — övervakar tjänster post-aktivering, korrelerar larm.

OSS svarar på frågor som *"Kan vi leverera detta? Är resurserna lediga? Har konfigurationen gått ut till nätet? Funkar tjänsten i drift?"*

Gränsen BSS/OSS är inte stenhård — *Order Management* sitter ofta som brygga mellan dem och olika operatörer drar gränserna olika.

## Hur hänger Order-to-Activate ihop?

Order-to-Activate (O2A) är processen från att kunden lägger en order tills tjänsten är aktiverad och fakturering startar. Simulatorn modellerar det som en eventström:

```
1. OrderCreated         (CRM/OM)        - kommersiell order finns
2. FeasibilityChecked   (Service Inv)   - kan vi leverera den här tjänsten?
3. ResourcesReserved    (Resource Inv)  - port/IP/fiber är låsta
4. ProvisioningStarted  (Provisioning)  - konfig pushas mot nätet
5. ServiceActivated     (Provisioning)  - tjänsten är tänd och verifierad
6. BillingStarted       (Billing)       - fakturaklockan börjar gå
```

I verkligheten är varje steg en eller flera tjänster, och varje övergång är ett eller flera event som färdas mellan system. Det är därför **observability genom hela flödet** är ett av de stora värdena av en bra O2A-arkitektur — och en av de saker som ofta saknas.

## Lead time, handoffs och bottlenecks — tre nyckelbegrepp

Slice A i simulatorn lägger till tre koncept som tillsammans utgör grunden för att resonera om processoptimering i ett OSS/BSS-flöde.

### Vad är lead time?

**Lead time** är den totala tiden från det att kunden lägger en order tills tjänsten är aktiv och fakturering startar. I telekom mäts det ofta i timmar eller dagar — för B2B-fiber kan det vara veckor.

Lead time består av två sorters tid:

- **Värdeskapande tid** — när någon eller något faktiskt arbetar på ordern.
- **Väntetid** — när ordern ligger still mellan system, team eller godkännanden.

En tumregel som ofta gäller i telekom (och i de flesta tjänsteflöden): **väntetiden är 5–10 gånger längre än den värdeskapande tiden**. Att halvera väntetiden ger därför mycket större effekt än att halvera arbetstiden — men kräver att man förstår var väntan sker.

### Vad är handoffs?

En **handoff** är när arbete byter ägare — mellan system, team eller roller. Varje handoff kostar tid genom fyra mekanismer:

1. **Kö** — den som tar emot arbetar med annat just nu.
2. **Översättning** — data formateras om, fält mappas, ibland tappas något.
3. **Informationsförlust** — kontext från avsändaren når inte mottagaren.
4. **Kontextväxling** — mottagaren behöver sätta sig in i ärendet.

I order-to-activate är handoffs vanliga vid: CRM → Order Management, Order Management → Inventory, Inventory → Provisioning, Provisioning → Billing, samt när manuella godkännanden eller fall-out-handläggning involveras. Simulatorn visar handoffs som streckmönstrade staplar i timeline-vyn.

### Vad är en bottleneck?

En **bottleneck** är det steg som begränsar hela flödets genomströmning. I order-to-activate känner man ofta igen den genom att (a) den har högst genomsnittlig duration, (b) den har en kö framför sig, eller (c) den driver flest fall-outs. Klassiska bottlenecks i telekom:

- **Resource Inventory / Reservation** — när inventory-data är lågkvalitativ uppstår manuella ärenden.
- **Provisioning** — när templates inte täcker alla varianter behövs handgrepp per order.
- **Manuella godkännanden** — kreditkontroll, platsbesök, leveransbekräftelse.

Simulatorn markerar automatiskt det långsammaste steget i ett flöde och beräknar dess andel av total lead time. Det är det enklaste sättet att börja en förbättringsdiskussion: *"Det här steget tog 47% av tiden — varför?"*



En Strategy & Enablement-roll i ett telekom-OSS/BSS-program tittar typiskt på *processoptimering, automationsgrad och datakvalitet*. Bra frågor att ställa per domän:

**CRM / Customer**
- Hur unik är vår kund-id-modell mellan B2B/B2C? Hur sker master data-styrning?
- Hur går säljinformation över till order management — manuell eller maskinläsbar?

**Order Management**
- Vad är vår *truly-touchless-andel* (orderpassering helt utan handpåläggning)?
- Var fastnar ordrar mest, och varför? Är det dataproblem, processproblem eller integrationsproblem?
- Är dekomponeringen från kommersiell order till tekniska delordrar regel-baserad eller hårdkodad?

**Service & Resource Inventory**
- Vad är vår inventory accuracy? Hur ofta avstäms inventory mot nätet (audit/discovery)?
- Vem äger datakvaliteten — finns det ett tydligt data ownership?
- Hur snabbt syns nya resurser i inventory efter rollout/utbyggnad?

**Provisioning / Activation**
- Hur många provisioning-mallar/templates har vi, och hur testas de innan de når prod?
- Är vi declarative (intent-based) eller imperativa? Hur ser rollback-strategin ut vid partial activation?
- Vilken andel av provisioning sker via standardiserade interface (TMF, MEF, NETCONF) vs leverantörsspecifika adapters?

**Assurance / Incident**
- Hur stor andel incidenter är *self-detected* vs anmälda av kund?
- Är larmen korrelerade till tjänstepåverkan eller bara till elementhälsa?

**Billing Trigger**
- Vad är ledtiden mellan ServiceActivated och första debitering, och varför?
- Triggar vi billing på *verifierad leverans* eller bara på orderstatus?

**Tvärgående**
- Hur mäter vi *end-to-end fulfillment lead time* — från OrderCreated till BillingStarted?
- Var i flödet förlorar vi automation? (Find the manual handovers and remove them.)
- Hur lätt är det att lägga till en ny produkt i flödet — kräver det kodändring i alla domäner?

## Hur kan Strategy & Enablement arbeta med detta?

Strategy & Enablement-rollen i ett OSS/BSS-program är typiskt *inte* den som bygger systemen — utan den som hjälper organisationen att (1) förstå vad som faktiskt händer i flödet, (2) prioritera rätt förbättringar, och (3) bygga gemensamma mätetal och språk över domäner.

Konkreta arbetssätt som passar den här simulatorns frågeställningar:

- **Value stream mapping** av order-to-activate per produktfamilj. Mät både värdeskapande tid och väntetid. Ofta är det första gången hela flödet syns på ett ställe.
- **Bottleneck-driven backlog**. Istället för att göra "förbättringar överallt" — fokusera teamen på det steg som mäter sämst. Theory of Constraints säger att förbättringar utanför bottlenecken inte ger genomströmning.
- **KPI-arkitektur**. Definiera och mät: end-to-end lead time, fall-out rate per steg, truly-touchless-andel, inventory accuracy, mean time to provision, billing trigger lag. Gör dem synliga för alla domäner samtidigt.
- **Handoff-reduktion som strategi**. För varje handoff: kan vi automatisera den, eliminera den, eller göra den icke-blockerande (asynkron med tydligt SLA)?
- **Domain ownership och datakvalitet**. Vem äger inventory-kvaliteten? Vem äger product catalog-kvaliteten? Utan tydligt ownership glider data isär och alla flöden lider.
- **Architecture as enablement**. Hjälp teamen välja arkitekturmönster som möjliggör förbättring — t.ex. event-driven istället för synkrona kedjor, intent-based provisioning istället för imperativ, declarative inventory.
- **Demo / lärande**. Använd verktyg som den här simulatorn för att skapa gemensam förståelse mellan affär, IT och nät — det är ofta missförståndet mellan dessa som skapar de värsta processproblemen.

## Hur skulle ett agilt team förbättra detta flöde?

Ett agilt team som äger en del av order-to-activate-flödet (säg, Provisioning) skulle typiskt:

1. **Mäta sin del först.** Vad är vår genomsnittliga ledtid? Var fastnar ärenden? Hur ofta gör vi rollback? Visualisera på en kanban-board eller en cycle-time-graf.
2. **Hitta toppen-3-orsaker till fall-out.** Inte gissa — analysera senaste 100 fall. Är det fel template? Saknad data från inventory? Element som inte svarar?
3. **Eliminera en orsak per iteration.** En sprint, ett experiment, en hypotes. T.ex. "om vi lägger till template-validering pre-deploy minskar vi provisioning failures med 30%."
4. **Bygga små förbättringar i hela kedjan, inte bara hos sig själv.** Om provisioning ofta får dålig data från inventory — ta upp det i ett gemensamt forum och fixa uppströms.
5. **Sätta tydliga SLA på handoffs.** Inte bara "vi tar ärenden så fort vi kan" — utan "ärenden ska börja bearbetas inom 15 min".
6. **Automatisera testning av provisioning-mallar.** Som CI/CD för nätet. Då kan vi rulla ut nya produkter snabbare utan att introducera fall-outs.
7. **Demo varje iteration.** Visa förbättringen som en synlig effekt i lead time eller fall-out rate, inte bara som "vi byggde feature X".

Det viktiga är att *teamet inte bara optimerar inom sin domän* — utan ser sig själv som en del av ett värdeflöde och tar ansvar för att hela flödet fungerar.

## Förbättringsexperiment — automatisera resource reservation

Simulatorn har en toggle: **Automatisera resource reservation**. När den är på minskar `ResourcesReserved`-stegets duration från 5.0s till 2.5s — typexempel på vad en förbättring i Resource Inventory-domänen kan ge (t.ex. att gå från manuell tilldelning av portar till automatisk reservation via API).

**Kör så här:**

1. Toggle av — klicka "Create customer order". Notera total lead time och bottleneck.
2. Toggle på — klicka "Create customer order" igen. Förbättringsexperiment-rutan visar nu manual vs automated, förbättring i sekunder och procent, och om bottlenecken har flyttat.

**Vad simulatorn lär ut här:**

- **Konkret förbättring blir mätbar.** Det är skillnad på att säga "vi borde automatisera reservation" och att se "lead time minskade med 15%". Den senare formuleringen håller över ett ledningsmöte.
- **Bottlenecks flyttar.** När man fixar den långsammaste delen blir nästa del den långsammaste. *Theory of Constraints* säger att det är så det ska gå till — flytta begränsningen tills den ligger där det är billigast att hantera.
- **Förbättring nedströms från bottlenecken är värdelös.** Om vi istället hade automatiserat något i Provisioning (som inte var bottlenecken) hade total lead time inte påverkats — eftersom Resource Inventory ändå skulle hålla flödet tillbaka. Det här är en av de viktigaste lärdomarna i processoptimering.
- **Förbättring uppströms från bottlenecken är "wasteful effort".** Att snabba upp Order Management när Resource Inventory är bottleneck betyder bara att fler ärenden köar framför Resource Inventory — kön blir längre, lead time minskar inte.

**Strategy & Enablement-vinkel:** det här är varför *bottleneck-driven backlog* är ett kraftfullt prioriteringsverktyg. Mät, hitta bottlenecken, förbättra den, mät om, hitta nya bottlenecken, prioritera där. Linjärt och pragmatiskt — istället för att låta varje team optimera lokalt utan koppling till värdeflödet.

## Köbildning och belastning

Slice F lägger till parallella ordrar (knapparna **5 orders** och **20 orders**). Plötsligt börjar simulatorn bete sig som ett system, inte ett scenario: köer bildas, lead time skenar, incidents spikar. Här är begreppen som hjälper dig läsa vad som händer.

### Vad är köbildning?

En **kö** uppstår när arbete kommer in fortare än ett system hinner processa det. I simulatorn är `Resource Inventory` och `Provisioning` *single-proc* — bara en order åt gången, övriga väntar i kö. Övriga system processar parallellt (CRM, Order Management m.fl. är "snabba lookups" snarare än begränsade resurser).

Pedagogiska poängen blir tydlig när du jämför 1 order med 20 orders:

- 1 order: total lead time ≈ 16s. Reservation tar 5s, ingen väntar.
- 20 orders: avg lead time kan bli 60–90s. Själva arbetet på varje order är fortfarande ~16s — resten är *väntan*. Ordrarna har spenderat huvuddelen av sin tid med att titta på taket i en kö.

Det här är systems thinking-insikten: när belastningen ökar är problemet inte att jobben tar lång tid, utan att de väntar lång tid.

### Vad är throughput?

**Throughput** är hur många ordrar systemet klarar av per tidsenhet (visas i dashboarden som `orders/s` i simtid). Det är begränsat av bottleneckens kapacitet — i simulatorn av Resource Inventory som klarar 1 order per 5 sekunder = 0.2/s i bästa fall.

Throughput och lead time är *inte samma sak*:

- Du kan ha hög throughput och hög lead time samtidigt (köfabriken: stort flöde igenom, men varje order väntar länge).
- Du kan ha låg throughput och låg lead time (oexploaterat system: snabbt igenom när det väl händer, men ovanligt).

Båda spelar roll. Operativa team mäter ofta throughput (rättvisad i SLA), men kund upplever lead time.

### Little's Law

En av de mest underbarvenliga formlerna i operations:

```
L = λ × W
```

där `L` = genomsnittligt antal i systemet (kö + arbete), `λ` = arrival rate, `W` = genomsnittlig lead time.

Praktisk användning: om du vet två av variablerna kan du räkna ut den tredje. Om en operatör säger "vi får in 100 ordrar om dagen och har i snitt 500 ordrar i pågående bearbetning", då är genomsnittlig lead time 5 dagar. Inga andra antaganden behövs. Lagen gäller alla flöden i steady state.

### Vad är flow efficiency?

Två definitioner av "effektivitet":

- **Resource efficiency** — hur upptagen är denna resurs? Hög = bra, säger den klassiska bilden.
- **Flow efficiency** — hur mycket av en orders totala tid är faktiskt arbete på den ordern (inte väntan)?

Ett företag som maxar resource efficiency har ofta mycket låg flow efficiency. Telekomflöden där order-to-activate mäts i timmar/dagar har vanligen flow efficiency under 10% — resten är kötid mellan handoffs.

För kunden är det flow efficiency som syns. För ett bonusprogram som mäter "system utilization" är det resource efficiency. Konflikten är inte hypotetisk.

### Varför är hög utilization farligt?

Köteorin har en obekväm sanning: *kötid skalar inte linjärt med utilization*. Den exploderar mot oändligheten när utilization närmar sig 100%.

Som tumregel:
- Vid 70% utilization är genomsnittlig kötid jämförbar med betjäningstiden.
- Vid 90% utilization är kötiden ~9× betjäningstiden.
- Vid 99% utilization är kötiden ~99× betjäningstiden.

Det är därför rätt kapacitetsmål är 60–80% utilization i bottleneck (inte högre), och varför *att slå dollar för dollar i mer load utan att öka kapacitet är ett av de vanligaste sätten att göra ett system instabilt*.

I simulatorn ser du det när du kör 20 orders: Resource Inventory blir kraftigt rödfärgad (load-high) och dess kö växer. Lead time ökar inte med 20× — den ökar mer.

### Theory of Constraints (kort)

Eli Goldratts *Theory of Constraints* säger:

1. Identifiera bottlenecken.
2. Exploatera den (få ut max från den utan tilläggsinvestering).
3. Subordinera resten av systemet till bottleneckens takt (sluta producera arbete som ändå köar).
4. Höj kapaciteten i bottlenecken om det behövs.
5. När bottlenecken försvinner, börja om från (1) — det finns alltid en ny.

I simulatorn ser du steg 5 på två sätt:

- **Slice C** — toggla automation på reservation och kör om. Lead time minskar, bottleneck flyttar från Resource Inventory till Provisioning. Det är "ändra hur arbetet utförs i bottlenecken" (steg 2).
- **Slice G** — höj `Resource Inventory workers` från 1 till 2 eller 3 och kör 20 orders. Kön framför RI minskar dramatiskt, men nu växer Provisionings kö istället. Det är "höj kapacitet i bottlenecken" (steg 4) följt direkt av "hitta nästa bottleneck" (steg 5).

Två olika typer av förbättring (göra varje order snabbare vs. bearbeta flera parallellt) — men båda visar samma underliggande sanning: bottlenecks försvinner inte, de hittar en ny plats.

### Varför skapar incidenter återarbete?

Slice F:s incident-spike-mekanism: när Provisionings kö är ≥ 3 ordrar ökar fail-sannolikheten från 5% till 30%. Vid fail går 50% chans till retry — en ny order genereras med samma id + "-R". Den är retryorder är bara en till order i flödet — så den bidrar till load.

Loopen blir farlig:
1. Hög load → längre kö i Provisioning.
2. Längre kö → högre fail-sannolikhet.
3. Fler fails → fler retries.
4. Fler retries → ännu högre load.
5. Tillbaka till (1).

Det är så *cascading failures* uppstår i verkliga system. Lösningen är inte att försöka göra Provisioning "mer robust" utan att förhindra att kön byggs upp i första ledet — t.ex. genom *load shedding* (tackla nej till mer arbete när bottlenecken är full) eller *backpressure* (signalera uppströms att sakta ned).

### Hur kan Strategy & Enablement arbeta med detta?

- **Mät utilization i bottlenecken**, inte i hela systemet. Genomsnitt över alla domäner döljer den enda siffra som spelar roll.
- **Mät flow efficiency** (värdeskapande tid / lead time). Sätt det som ett ledningsmått, inte bara teamen.
- **Diskutera kapacitetsbeslut i ljuset av utilization-grafen** — att gå från 70% till 90% utilization sparar inte 20% kapacitet, det skapar volatil lead time.
- **Förstå skillnaden mellan throughput och lead time** internt. Operatörer maxar ofta throughput; kunderna upplever lead time. Båda måste mätas.
- **Hjälp organisationen prata om backpressure** — det låter tekniskt men är i grunden processfråga: ska Order Management ta emot fler ordrar när det är klart att vi inte hinner med?

## Felscenarier

Simulatorn modellerar två klassiska fel:

- **ResourceMissing** — Resource Inventory hittar ingen ledig resurs efter feasibility. Pekar oftast på *inventory drift* eller dåligt synkad utbyggnadsplanering.
- **ProvisioningFailed** — adaptern eller nätelementet avvisar konfigurationen. Risken är *partial activation* — tjänsten är halvtänd och billing kanske ändå triggar.

Båda dessa fel pekar på samma underliggande tema: *datakvalitet* och *integration mellan domäner*.

## Begränsningar

Detta är ett **lärverktyg, inte en arkitekturreferens**. Förenklingar:

- Inget Product Catalog, inga produkter att välja mellan.
- Ingen orderdekomponering — vi hoppar direkt från kommersiell order till en teknisk delorder.
- Inga TMF Open API-payloads (TMF622/TMF641 etc.). Eventnamnen är illustrativa.
- Ingen persistens, ingen samtidighet, en order i taget.
- Ingen riktig assurance-loop efter aktivering.

## Lägga till nya pedagogiska slices

När du vill bygga ett nytt scenario eller en ny visualisering, börja med att fråga vilken modul ändringen primärt hör hemma i:

| Vad du vill göra | Var lägger du det |
|---|---|
| Lägga till ett nytt felscenario eller domänsystem | `src/simulation/scenarios.js` (utöka `SYSTEMS`, lägg till ny `FAIL_*`-array) |
| Ändra hur lead time / handoffs / bottleneck räknas | `src/simulation/metrics.js` (single) eller `engine.js → finalizeParallel` (batch) |
| Ny event-transformer (t.ex. en annan automationsregel) | `src/simulation/events.js` |
| Ändra spawnlogik, kö-policy, fail-sannolikhet | `src/simulation/engine.js` (parallel-engine) |
| Lägga till en ny dashboard-card eller order-list-kolumn | `src/ui/render.js` + uppdatera HTML i `index.html` |
| Förändra grafen (ny linje, axlar, annotationer) | `src/ui/charts.js` |
| Skriva en ny "Process pattern"-text (queueing, etc.) | `src/simulation/scenarios.js → PATTERNS` + en ny `<button>` i `learning.js → patternList()` |
| Lägga till en ny knapp som triggar ett scenario | `index.html` (knappen) + `src/app.js` (event listener) |

**Tips för att hålla det enkelt:**

- En slice = en idé. Försök inte bygga två förbättringar samtidigt.
- Behåll plain-script-strukturen. Inga ramverk, inga build-tools — det är hela poängen.
- Ändrar du en enskild fil, behöver du inte röra de andra. Men kontrollera laddordningen om du introducerar nya beroenden.
- Verifiera manuellt efter varje slice (samma 14-stegs-checklista som under "Saker att prova").

## Nästa slice (om experimentet bekräftas)

- **Justerbar arrival rate / variabilitet** — slumpa ankomsttider istället för fast 1500ms-spawning, så användaren kan se hur variabilitet påverkar kölängd även vid samma genomsnittliga belastning.
- **Capacity-knapp för Resource Inventory** — låt användaren välja "1 worker" / "2 workers" / "3 workers" för att se hur kapacitetshöjning påverkar throughput och kötid (klassisk ToC-visualisering).
- **Throughput-graf över tid** — line chart som ritar throughput, kö-längd och incident-rate över simulerad tid. Gör skillnaden mellan stationary och bursty load synlig.
- **Backpressure-toggle** — när Order Management ser att Resource Inventorys kö > N, sluta acceptera nya ordrar. Pedagogiskt: hellre långsam respons uppströms än kollaps nedströms.
- **Kanban-style swimlanes** — visa ordrar som kort som rör sig mellan domäner istället för i en lista. Mer "levande" känsla.
- **Product Catalog** + ordervarianter (fiber/mobil/IoT) som ritar olika underflöden — och olika bottlenecks per produkt.
- **TMF-event-payloads** (förenklade) så det blir tydligt hur event ser ut på riktigt.
- **Scenarier som börjar från Assurance** (incident → root cause → fix) för att illustrera flödet baklänges.
