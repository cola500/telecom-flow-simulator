---
title: Flow och systems thinking
description: Flödes- och systems thinking-teori bakom simulatorn — lead time, handoffs, bottlenecks, kö, throughput, variation och Theory of Constraints. Hur man läser metrics och vad de betyder operativt.
category: learning-content
status: in-progress
last_updated: 2026-05-11
sections: [Lead time handoffs och bottlenecks — tre nyckelbegrepp, Frågor att ställa per domän, Hur kan team arbeta med flödet, Hur skulle ett agilt team förbättra detta flöde, Köbildning och belastning]
related: [README.md, telecom-theory.md, learning-philosophy.md]
---

# Flow och systems thinking

Den här filen samlar flödes- och systems thinking-teorin bakom simulatorn. Den fokuserar på *mönstren* — varför kö växer, hur bottlenecks flyttar, varför hög utilization är farligt, hur variation slår mot flow efficiency.

För telecom-specifik domänteori, se [`telecom-theory.md`](telecom-theory.md). För pedagogisk filosofi, se [`learning-philosophy.md`](learning-philosophy.md).

## Lead time, handoffs och bottlenecks — tre nyckelbegrepp

Det här är tre nyckelbegrepp som tillsammans utgör grunden för att resonera om processoptimering i ett OSS/BSS-flöde — och som simulatorn gör synliga vid varje körning.

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

## Frågor att ställa per domän

Bra frågor att ställa när man vill förstå var ett OSS/BSS-flöde fungerar bra eller dåligt — fokus ligger på *processoptimering, automationsgrad och datakvalitet*:

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

## Hur kan team arbeta med flödet?

Det här arbetet handlar typiskt *inte* om att bygga systemen — utan om att hjälpa organisationen att (1) förstå vad som faktiskt händer i flödet, (2) prioritera rätt förbättringar, och (3) bygga gemensamma mätetal och språk över domäner.

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

## Köbildning och belastning

När du klickar på *5 orders* eller *20 orders* (i Optimize-läget) börjar simulatorn bete sig som ett system, inte bara ett enskilt scenario: köer bildas, lead time skenar, incidents spikar. Här är begreppen som hjälper dig läsa vad som händer.

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

### Provisioning / Activation automation

Det andra automationsläget i simulatorn — toggle **Automated provisioning / activation** — adresserar nästa bottleneck efter Resource Inventory: själva *aktiveringssteget* i nätet.

**Vad gör automatiseringen?**

- `ProvisioningStarted`: 3.0s → 1.8s simtid (~40% snabbare config-push).
- `ServiceActivated`: 1.0s → 0.7s simtid (verifieringen är *kvar*, bara snabbare).
- Fail-prob i Provisioning multipliceras med 0.5 (5% → 2.5%, 15% → 7.5%, 30% → 15%).

**Vad lär sig användaren här?**

- *Provisioning* är inte samma som *activation*. Provisioning = att skicka konfig till nätet. Activation = att verifiera att tjänsten faktiskt fungerar end-to-end. Att slå ihop dem ger *partial activation*, en av de dyraste felmoderna.
- *Reservation* (Resource Inventory) och *activation* (Provisioning) är olika problem. Reservation utan activation ger orphaned resources; activation utan reservation ger race conditions.
- Automation kortar ledtid och minskar variation — men eliminerar inte inventory mismatch, nätfel eller felaktiga produktregler. Modellen visar detta genom att fail-prob multipliceras, inte nollställs.
- *Billing trigger* (`BillingStartRequested`) går fortfarande bara efter `ServiceActivated` — automation flyttar inte den ordningen. Att trigga billing på orderstatus eller på config-acceptans (utan verifiering) är ett av de klassiska sätten att fakturera icke-levererade tjänster.

**Pedagogisk experiment-loop:**

1. Reset, lämna prov-automation **AV**, kör 20 orders. Notera avg lead time, incidents, slowest step.
2. Slå **PÅ** prov-automation, kör 20 orders direkt efter (utan reset, så ghost-trace + run comparison visas).
3. Jämför korten: lead time bör sjunka, incidents bör sjunka — men inte till noll. Resource Inventory kan fortfarande vara bottleneck (5s reservation > 1.8s + 0.7s prov), vilket är poängen: *att automatisera nedströms från bottlenecken hjälper inte total throughput*. Höj också `Resource Inventory workers` till 2 och kör om — då flyttar bottlenecken och prov-automationen får full effekt.

### Activation capacity

Utöver `Resource Inventory workers` finns nu också `Provisioning / Activation capacity` (1–3). Två separata kapacitetsknappar, två oberoende ratt:

- **Resource Inventory workers** styr hur många reservationer som kan göras parallellt (5s-steget).
- **Provisioning / Activation capacity** styr hur många activation-jobb som kan köras parallellt (1.8–3.0s-steget).

I simulatorn är "workers" en förenklad mental modell för parallell teknisk aktiveringskapacitet — *inte* personer. I en verklig OSS-stack kan kapacitet motsvara fler adapter-instanser, parallell orchestration, eller bättre köhantering.

**Capacity vs automation** — två olika förbättringar:

- *Capacity* påverkar **parallellism** (hur många orders i flykt samtidigt).
- *Automation* påverkar **duration och felrisk per order** (hur snabbt och pålitligt en enskild aktivering går).

Att höja capacity flyttar bottleneck men löser inte inventory mismatch eller nätfel. Att slå på automation snabbar upp men tar inte bort partial activation-risken. Och oavsett vilket: `BillingStartRequested` får fortfarande bara triggas efter `ServiceActivated`.

**Experiment att prova:**

1. RI=3, Prov=1 → Provisioning blir bottleneck.
2. RI=1, Prov=3 → Resource Inventory är fortfarande bottleneck (5s reservation dominerar).
3. Båda=3 → mindre kö, bottleneck flyttar nedströms eller försvinner.
4. Båda=3 + Automated provisioning → kortare lead time + färre incidents, men inte noll.

### Variation is the enemy of flow

Hittills har varje order tagit *exakt* samma tid i varje steg. Verkligheten är inte så snäll: vissa ordrar går rakt igenom, andra fastnar i godkännanden, vissa template-anrop tar 4× tiden. Variabilitet finns även när medelvärdet är konstant.

Slidern **Variation i betjäningstid** (0% / ±25% / ±50%) lägger på en uniform slumpfaktor på varje stegs duration när en order spawnar. *Genomsnittet är samma* — bara spridningen ändras.

Det viktiga: även med samma medelarbete växer kötiden mätbart när variationen ökar. Köteorin förklarar varför — kön drivs inte bara av utilization (ρ), utan också av kvadraten på variationskoefficienten:

```
W ≈ (ρ / (1 - ρ)) × ((C_a² + C_s²) / 2) × E[S]
```

där `C_a` och `C_s` är variationskoefficienter för ankomst- respektive betjäningstid. Dubblera spridningen och kötiden växer fyrfaldigt vid samma utilization. Det är därför Lean predikar *"variation is the enemy of flow"* lika mycket som *"don't max utilization"*.

**Pedagogisk experiment-loop:**

1. Reset, sätt variation till 0%, kör 20 orders. Notera avg lead time och max queue.
2. Sätt variation till 50%, kör 20 orders direkt efter (utan reset, så ghost-trace visas).
3. Run comparison-kortet visar diff: lead time ökar, max queue ökar, ofta även incidents — eftersom Provisionings fail-sannolikhet är kö-driven, så större kö → fler retries.

I praktiken är variabilitet det dyraste och svåraste att minska i ett OSS/BSS-flöde: standardisera produkter, automatisera fall-out, sätta SLA på handoffs. Det gör mer för flow än att jaga ytterligare en procent utilization.

### Theory of Constraints (kort)

Eli Goldratts *Theory of Constraints* säger:

1. Identifiera bottlenecken.
2. Exploatera den (få ut max från den utan tilläggsinvestering).
3. Subordinera resten av systemet till bottleneckens takt (sluta producera arbete som ändå köar).
4. Höj kapaciteten i bottlenecken om det behövs.
5. När bottlenecken försvinner, börja om från (1) — det finns alltid en ny.

I simulatorn ser du steg 5 på två sätt:

- **Automatisera reservationen** — toggla *Automatisera resource reservation* och kör om. Lead time minskar, och bottlenecken flyttar från Resource Inventory till Provisioning. Det motsvarar Goldratts steg 2: ändra *hur* arbetet utförs i bottlenecken.
- **Höj kapaciteten** — sätt *Resource Inventory workers* till 2 eller 3 och kör 20 orders. Kön framför RI minskar dramatiskt, men nu växer Provisionings kö istället. Det är steg 4 ("höj kapacitet i bottlenecken") följt direkt av steg 5 ("hitta nästa bottleneck").

Två olika typer av förbättring (göra varje order snabbare vs. bearbeta flera parallellt) — men båda visar samma underliggande sanning: bottlenecks försvinner inte, de hittar en ny plats.

### Varför skapar incidenter återarbete?

Simulatorn modellerar en *incident-spike-mekanism*: när Provisionings kö är ≥ 3 ordrar ökar fail-sannolikheten från 5 % till 30 %. Vid fail finns 50 % chans till retry — en ny order genereras med samma id + "-R" och läggs i kön igen. Retry-ordern är bara ytterligare en order i flödet, så den bidrar till load.

Loopen blir farlig:
1. Hög load → längre kö i Provisioning.
2. Längre kö → högre fail-sannolikhet.
3. Fler fails → fler retries.
4. Fler retries → ännu högre load.
5. Tillbaka till (1).

Det är så *cascading failures* uppstår i verkliga system. Lösningen är inte att försöka göra Provisioning "mer robust" utan att förhindra att kön byggs upp i första ledet — t.ex. genom *load shedding* (tackla nej till mer arbete när bottlenecken är full) eller *backpressure* (signalera uppströms att sakta ned).

### Hur kan team arbeta med detta?

- **Mät utilization i bottlenecken**, inte i hela systemet. Genomsnitt över alla domäner döljer den enda siffra som spelar roll.
- **Mät flow efficiency** (värdeskapande tid / lead time). Sätt det som ett ledningsmått, inte bara teamen.
- **Diskutera kapacitetsbeslut i ljuset av utilization-grafen** — att gå från 70% till 90% utilization sparar inte 20% kapacitet, det skapar volatil lead time.
- **Förstå skillnaden mellan throughput och lead time** internt. Operatörer maxar ofta throughput; kunderna upplever lead time. Båda måste mätas.
- **Hjälp organisationen prata om backpressure** — det låter tekniskt men är i grunden processfråga: ska Order Management ta emot fler ordrar när det är klart att vi inte hinner med?
