---
title: OSS/BSS Order-to-Activate Simulator
description: Lokal browser-baserad lärsimulator för en förenklad telekom-stack — visar order-to-activate-flödet, lead time, handoffs, bottlenecks och förbättringsfrågor.
category: learning-tool
status: in-progress
last_updated: 2026-05-10
sections: [Disclaimer, Three modes Learn OSS/BSS Optimize Process Documentation, Vad simulatorn lär ut, Saker att prova, Vad är BSS, Vad är OSS, From Customer Order to Service and Resource Orders, Same flow different product decomposition, Same operating pattern different technical flow, Order-to-Activate, Lead time, Handoffs, Bottlenecks, Strategy & Enablement, Förbättring i agila team, Förbättringsexperiment, Köbildning och belastning, Provisioning / Activation automation, Activation capacity, Variation is the enemy of flow, Felscenarier, Begränsningar, For developers]
---

# OSS/BSS Order-to-Activate Simulator

Ett interaktivt lärverktyg för att förstå hur en kundorder vandrar genom en telekomoperatörs IT-system tills tjänsten är aktiverad och fakturering startar.

Simulatorn hjälper dig att se:
- hur de stora system-domänerna i telekom är uppdelade (BSS för affär och kund, OSS för nät och tjänst);
- hur en order dekomponeras till tekniska arbetsobjekt;
- var flöden typiskt fastnar (köer, handoffs, "bottlenecks");
- hur olika beslut — automation, kapacitet, variation — påverkar tjänstens leverans.

Du behöver inte ha jobbat med telekom tidigare. Allt förklaras stegvis i appens *Learn OSS/BSS*-läge och i denna dokumentation.

> **This is a simplified learning model, not a full telecom architecture.**
> Domänerna och flödesfaserna är inspirerade av industristandard (TM Forum SID/eTOM), men eventnamn, durations, fail-typer och flöde är kraftigt förenklade för att vara begripliga på 5 minuter. Se [`REALISM_NOTES.md`](REALISM_NOTES.md) för en kalibrering: vad är realistiskt, vad är pedagogiskt förenklat, och vilka antaganden modellen gör.

## Three modes: Learn OSS/BSS, Optimize Process, Documentation

Simulatorn har tre lägen, valbara via tabs i headern:

- **Learn OSS/BSS** (default) — fokus på domänen. Systemkartan, Order Decomposition (fiber/mobile), eventflödet vid en enskild order, Timeline, och Learning-panelen är synliga. Optimeringskontroller och belastnings-paneler är dolda.
- **Optimize Process** — fokus på experiment och metrics. Belastnings-dashboard, kö-panel, throughput-chart, run comparison och alla optimeringskontroller (capacity, automation, variability, backpressure, batch-knappar) är synliga. Order Decomposition är dold.
- **Documentation** — läser `README.md` och `REALISM_NOTES.md` direkt i appen via en minimal markdown-renderare. Båda dokumenten kan fortfarande läsas i repot (du gör det just nu); Documentation-vyn är ett bekvämt sätt att slå upp koncept utan att lämna appen.

Learning-panelen (höger sidopanel) och Systemkartan är synliga i Learn och Optimize — i Documentation visas bara docs-vyn för fokuserad läsning. Mode-byte är fryst under en pågående batch.

Det är samma underliggande simulator-engine i alla lägena — bara olika UI-fokus för att minska kognitiv belastning.

**Single-order metrics och system metrics är två olika vyer av samma flöde.**

- *Order metrics* (Metrics-panelen) visar en enskild orders resa genom systemet — total lead time, tid i handoffs, längsta steg, antal handoffs och failed events. Bra för att förstå *var tiden går* för en specifik kund. Dyker upp när du klickar **1 order** eller ett fail-scenario.
- *System metrics (batch run)* (Belastnings-dashboard) visar hur systemet beter sig över en hel batch — average lead time, queue depth, system throughput, batch incidents. Bra för att förstå hur flödet skalas vid load. Dyker upp när du klickar **5 orders** eller **20 orders**.

Båda mäter samma flöde, men ur olika perspektiv. En enskild order kan se snabb ut samtidigt som systemet i stort byggt upp en kö som påverkar nästa order.

## Vad simulatorn lär ut

- **Var** de centrala domänerna sitter i en stack och vilken sida (BSS vs OSS) de tillhör.
- **Vad varje domän gör**, varför den behövs, och var den brukar göra ont.
- **Hur ett order-to-activate-flöde ser ut** som en sekvens av events.
- **Var tid spenderas** — vilka steg tar längst, hur stor andel av lead time som är handoffs.
- **Var flaskhalsar uppstår** — flödet markerar automatiskt det långsammaste steget.
- **Vad handoffs kostar** — varje gång arbete byter system eller team uppstår friktion.
- **Var flödet typiskt går sönder** — ResourceMissing och ProvisioningFailed är de två klassiska.
- **Vilka frågor en Strategy & Enablement-roll** kan ställa för att förbättra flödet.

## Saker att prova

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

## From Customer Order to Service and Resource Orders

En av de viktigaste lärdomarna att ta med sig från OSS/BSS är att en *kundorder* aldrig är ett enda arbetsobjekt i nätet. Den dekomponeras i flera nivåer innan något faktiskt aktiveras. Simulatorns panel "Order Decomposition" visar hur:

```
Customer Order        BSS — det kunden köper ("Fiber 500 Mbps")
        │
        ▼
Service Order         OSS — den tjänst som ska skapas ("Broadband Access")
        │
        ├─ Resource Order: Access            OSS — port + fiberpar
        ├─ Resource Order: CPE / Router      OSS — hårdvara hos kund
        ├─ Resource Order: Network Profile   OSS — VLAN, QoS, IP
        └─ Activation Tasks                  OSS — config + verifiering
        │
        ▼
Billing trigger       BSS — först efter verifierad aktivering
```

**BSS fokuserar på kund, order, produkt och kommersiella triggers.** Vem är kunden, vad har de köpt, vad ska de betala, när startar fakturaklockan. Affärs-domän, oftast långsam livscykel (kontraktsförändringar, kampanjer).

**OSS fokuserar på tjänster, resurser, nät, aktivering och assurance.** Vad ska finnas i nätet, vilka portar/IP/profiler krävs, är konfigurationen pushad, fungerar tjänsten i drift. Teknisk domän, snabb operativ livscykel.

**Decomposition är bryggan mellan affärsorder och teknisk leverans.** Tre skäl att ha den:

1. *Olika ägare och olika livscykler* — BSS-team och OSS-team behöver kunna utveckla och driva sina respektive system oberoende.
2. *En customer order = flera tekniska arbetsobjekt* — fiber+TV+telefon innebär minst tre service orders, var och en med flera resource orders. Utan dekomponering kan du inte parallellisera, prioritera eller felhantera dem oberoende.
3. *Order active ≠ service working* — customer order kan vara "completed" i CRM medan tjänsten ännu inte fungerar i nätet. Du behöver olika status per nivå för att kunna svara på frågan *"vad har egentligen gått fel?"* när något inte stämmer.

Klicka på en nivå i "Order Decomposition"-panelen för att läsa mer i learning-mode (Customer Order, Service Order, Resource Order, Activation, eller "Why decomposition matters").

## Same flow, different product decomposition

Order Decomposition-panelen har en produktväljare: **Fiber 500 Mbps** eller **Mobile subscription**. Skifta mellan dem och du ser att resource orders och activation tasks ändras kraftigt — men det överordnade flödet är samma.

**BSS-flödet kan se nästan likadant ut.** Customer Order, kontrakt, fakturering, kampanj — affärssidan har en produktagnostisk struktur. Det är i Product Catalog som reglerna för översättning till tekniska ordrar bor.

**OSS-dekompositionen varierar kraftigt.** Fiber är fysisk-domän: en specifik port på en specifik OLT vid en specifik adress, en CPE i kundens hem. Mobile är logisk-domän: ett MSISDN ur en pool, en SIM/eSIM-profil från en RSP, en IMSI i HSS, en subscription profile. Olika resource inventory, olika activation-flöden, olika failure modes.

**Därför blir Product Catalog, Inventory och Activation centrala i telekom.** Dessa tre system är de som skiljer sig mest mellan produktfamiljer:

- *Product Catalog* — definierar vilka resource orders och activation tasks som ska skapas per customer order. Utan en bra katalog hamnar dekompositions-logik utspridd i Order Management.
- *Inventory* — fiber kräver geografisk inventory mot fysiska element, mobile kräver synk med RSP/HSS/numbering plan. Olika datamodell, olika konsistens-utmaningar.
- *Activation* — fiber-aktivering = NETCONF mot ett fåtal element. Mobile-aktivering = synk mellan flera externa system (RSP, HSS, billing). Olika fel-modes, olika retry-strategier, olika automationsmöjligheter.

Det är därför TM Forums SID-modell separerar *Customer Facing Service* (CFS, det kunden köper) från *Resource Facing Service* (RFS, det som körs i nätet) — för att samma kommersiella mall ska kunna återanvändas över olika tekniska implementationer.

**Pedagogisk experiment-loop:**

1. Välj **Fiber 500 Mbps** i produktväljaren. Notera resource orders, activation tasks och failure modes.
2. Växla till **Mobile subscription**. Notera vilka resurser som försvinner (fiber port, CPE), vilka som tillkommer (MSISDN, IMSI, SIM/eSIM, subscription profile).
3. Klicka på <em>Why fiber and mobile decompose differently</em> i learning-panelen för att förstå *varför* de skiljer sig så mycket på OSS-sidan.
4. Klicka på <em>What stays the same across products?</em> för att se vad som motiverar generiska OSS/BSS-plattformar — samma ramverk, parametriserat per produkt.

## Same operating pattern, different technical flow

Nu när du sett att fiber och mobil har olika dekomposition, är det värt att zooma ut. Båda produkter följer samma *övergripande mönster* från order till färdig leverans:

```
Customer Order → Service Order → (Feasibility) → Reservation → Provisioning
              → Activation → Verification → BillingStartRequested
```

Men *de konkreta tekniska stegen inom mönstret skiljer sig per produkt* — för att modellen inte ska bygga upp en felaktig mental bild om att aktivering är "samma sak" oavsett vad kunden köper.

**Fiber 500 Mbps (9 steg):**

1. `CustomerOrderCreated` (CRM) — kunden lägger en order
2. `ServiceOrderCreated` (Service Inventory) — Broadband Access-tjänsten skapas
3. `FeasibilityChecked` (Service Inventory) — finns fiber till adressen?
4. `ResourcesReserved` (Resource Inventory) — fiberport, profil, CPE/router reserveras
5. `ProvisioningStarted` (Provisioning) — konfiguration pushas till OLT (fiber-utrustningen)
6. `CPEConfigurationStarted` (Provisioning) — kundens router konfigureras
7. `ServiceActivated` (Provisioning) — tjänsten aktiveras i nätet
8. `ServiceVerified` (Provisioning) — end-to-end-test bekräftar att den faktiskt fungerar
9. `BillingStartRequested` (Billing Trigger) — fakturaklockan startar

**Mobile subscription (8 steg):**

1. `CustomerOrderCreated` (CRM)
2. `ServiceOrderCreated` (Service Inventory) — Mobile Connectivity-tjänsten
3. `NumberReserved` (Resource Inventory) — MSISDN (telefonnumret) tas ur poolen
4. `SimProfileReserved` (Resource Inventory) — SIM/eSIM + IMSI-identitet bindas
5. `SubscriberProfileProvisioningStarted` (Provisioning) — kundens prenumerationsprofil läggs in i HSS/UDM (mobilnätets centrala kunddatabas)
6. `NetworkSubscriptionActivated` (Provisioning) — nätbindningen slutförs
7. `RegistrationReadinessVerified` (Provisioning) — telefonen kan nu registrera sig på nätet
8. `BillingStartRequested` (Billing Trigger)

**Pedagogiska skillnader att lägga märke till:**

- *Mobile har ingen separat feasibility-check.* Det finns ingen geografisk adressvalidering som för fiber — service availability hanteras istället via SIM-profil och numbering plan.
- *Mobile splittar reservation i två steg* (nummer + SIM/eSIM). Två separata logiska resurser, två separata externa system. Fiber har en kombinerad reservation av flera fysiska resurser.
- *Fiber har ett extra provisioning-steg* (`CPEConfigurationStarted`). CPE-konfig är ofta separat från access-konfig — två olika element med olika fail-modes.
- *Mobile är typiskt snabbare* än fiber (~15s baseline mot ~16.5s i simulatorn). Det speglar verkligheten där mobil aktivering ofta tar minuter medan fiber kan ta dagar eller veckor.

**Hur det fungerar internt:** simulatorn kör samma motor för båda produkter. Varje steg har ett generiskt *role* (reservation, provisioning, activation, verification) som styr automation-effekter och fail-sannolikhet. Bara *namnet* på steget och *vilket system* det körs mot skiljer sig per produkt.

Det är hur en mogen OSS/BSS-plattform faktiskt är byggd: *en gemensam flödesmotor* som parametriseras per produkt via en Product Catalog. Affärslogik och teknisk implementation hålls åtskilda så att samma motor kan stödja många produktfamiljer.

> *Se [`REALISM_NOTES.md`](REALISM_NOTES.md) för modellantaganden och förenklingar* — där varje aspekt av flödet (för båda produkter) är bedömd som High / Medium / Low realism, med tydlig markering av vad som är osäkert eller inte verifierat mot specifik operatör.

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
- Ingen orderdekomponering — modellen hoppar direkt från kommersiell order till en teknisk delorder.
- Inga TMF Open API-payloads (TMF622/TMF641 etc.). Eventnamnen är illustrativa.
- Ingen persistens, ingen samtidighet, en order i taget.
- Ingen riktig assurance-loop efter aktivering.

## For developers

Teknisk dokumentation — hur appen körs lokalt, kodstruktur, laddordning, och hur du lägger till nya pedagogiska slices — finns i [`DEVELOPMENT.md`](DEVELOPMENT.md). Modellantaganden och realism-bedömningar finns i [`REALISM_NOTES.md`](REALISM_NOTES.md).
