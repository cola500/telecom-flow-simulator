---
title: Realism Notes
description: Vad i simulatorn speglar verklig telekom-OSS/BSS, vad är pedagogiskt förenklat, vilka antaganden gör modellen, och vilka namn-/textändringar som skulle öka trovärdigheten utan att göra appen komplex.
category: learning-tool
status: draft
last_updated: 2026-05-11
sections: [Syfte, Vad är realistiskt, Vad är pedagogiskt förenklat, Explicita antaganden, Implicita antaganden, Product-specific flow realism, Order decomposition trade-offs, Föreslagna namn- och textändringar, Nästa rimliga steg, Vad vi medvetet undviker]
---

# Realism Notes

## Syfte

Den här filen är en kalibrering: simulatorn ska förbli pedagogisk men inte bygga upp en *felaktig* mental modell av verklig telekom hos den som använder den. Vi bevarar enkelheten, men gör explicit var modellen drar förenklingar — och listar små ändringar som höjer trovärdigheten utan att lägga till komplexitet.

> **Kort form:** Simulatorn är en *learning model*, inte en arkitekturreferens. Domänerna och flödesfaserna är industristandard. Detaljerna är illustrativa.

## Vad är realistiskt

| Område | Vad simulatorn gör rätt |
|---|---|
| **BSS/OSS-uppdelningen** | Speglar TM Forums standardvy. CRM/OM/Billing på BSS-sidan, SI/RI/Prov/Assurance på OSS — så ritar de flesta operatörer det. |
| **Domännamnen** | Customer/CRM, Order Management, Service Inventory, Resource Inventory, Provisioning/Activation, Assurance, Billing finns alla i industrin (SID-modellen, eTOM). |
| **Order-to-Activate som processkoncept** | O2A är ett verkligt KPI-område hos alla operatörer. Värdeflödet OrderCreated → BillingStarted är reellt. |
| **Lead time / handoffs / bottlenecks som ramverk** | Direkt applicerbara begrepp. Telekomflöden mäts i exakt dessa termer. |
| **Inventory drift som problem** | Ett av de tre största driftsproblemen i OSS. Verkligt. |
| **Kö-driven incident-spike** | Mekanistiskt korrekt: överbelastad provisioning → sämre felhantering → mer fall-out → retries → mer load. *Cascading failures* är ett etablerat mönster. |
| **Backpressure som strategi** | Reell — operatörer som mognar i async-arkitekturer pratar om detta som *load shedding* eller *order intake control*. |
| **Theory of Constraints, Little's Law, queueing math** | Inte teori "applicerad på telekom" — det är teori som *gäller* telekom. Verkliga operatörer har bottlenecks som flyttar exakt så här. |
| **Variation som flow killer** | Variabilitet i betjäningstid är en av de två stora kö-drivarna i alla tjänsteflöden. |
| **Resource efficiency vs flow efficiency-konflikten** | Kärnkonflikt i flera operatörers KPI-struktur (system utilization vs end-to-end fulfillment time). |

## Vad är pedagogiskt förenklat

| Område | Förenklingen | Vad verkligheten ser ut som |
|---|---|---|
| **Två produkter, en order i taget** | Fiber 500 Mbps och Mobile subscription kan väljas i decomp-vyn och påverkar order-flödet. Men varje order är fortfarande en enstaka produkt. | Operatörer hanterar fler produktfamiljer (IoT, B2B SD-WAN, fast telefoni, IPTV, etc.) och kombinerade kontrakt (fiber+TV+telefoni samtidigt). Olika SLA, olika bottlenecks per familj. |
| **Ingen orderdekomponering** | Kommersiell order = teknisk order. | I verkligheten dekomponeras en order till flera *tekniska delordrar* (CFS → RFS), ofta parallella, med beroenden. |
| **8–9 events per happy path** | Fiber 9 steg, Mobile 8 steg (se *Product-specific flow realism*-sektionen). | Verkliga flöden har 20–50 events: address validation, credit check, design, dispatch, install, test, activation, post-activation verification, etc. |
| **Bara 2 fail-typer** | ResourceUnavailable, ActivationRejected — samma två oavsett produkt. | I verkligheten har varje produkt egna fail-modes: fiber har address validation fail, dispatch no-show, install fail; mobile har RSP timeout, IMSI conflict, portering-fel, MNP block. |
| **2 single-proc system** | RI och Prov är de enda begränsade resurserna. | I verkligheten finns många flaskhalsar: kreditkontroll-batch, manuella godkännanden, NMS-bandbredd, NETCONF-sessioner per element, fysisk fiberblåsning, fälttekniker-kapacitet. |
| **Hard-coded durations** | Steg tar 0.8–5 sekunder simtid. | Verkligheten har enorm spridning: API-anrop tar 100ms, batch-jobb körs en gång per dygn, fält-installation tar dagar/veckor. |
| **Konstanta handoff-tider** | 600ms inom layer, 1200ms mellan. | I verkligheten är handoffs den största variabilitetskällan — köer mellan team, batch-integrationer, godkännandetider varierar från sekunder till veckor. |
| **Inga TMF-payloads** | Eventnamnen är illustrativa. | Operatörer som följer TM Forum använder TMF622 (Product Order), TMF641 (Service Order), TMF638 (Service Inventory), TMF639 (Resource Inventory), TMF640 (Service Activation) — varje event har specificerat schema. |
| **Service Inventory uppdateras inte explicit** | Aktivering markerar inte SI som "active" i flödet. | I verkligheten uppdateras SI vid varje state-övergång och är källan för Assurance-koppling. |
| **Provisioning, activation och verification är separata steg, men alla på prov-systemet** | Provisioning, activation och verification är nu separata events (`ProvisioningStarted`/`CPEConfigurationStarted`, `ServiceActivated`, `ServiceVerified`) men kör mot samma `prov`-system. | I verkligheten är post-activation testing ofta ett separat system (eller separat orchestration-flöde) — inte samma engine som driver config-push. |
| **Billing triggas efter `ServiceVerified`** (inte direkt efter `ServiceActivated`) | Billing kommer alltid sist i happy path, efter både activation och verification. | I verkligheten finns ofta ytterligare grace period eller manuell godkännande innan första charge — eller billing triggas direkt på order-acceptans (med revenue-leakage-risk). |
| **Retry är 1-stegs, fix prob 50%** | Failed → kanske retry → success/permanent fail. | Verkligheten har exponential backoff, escalation till manual fall-out, partial rollback, ärenden som flyttar mellan team. |
| **Inga SLA-skillnader** | Alla orders behandlas lika. | Premium-kunder, B2B-avtal, regulatoriska tjänster har olika SLA — vilket påverkar kö-prioritet och fail-prob-tolerans. |
| **"Snabba lookups" är instant** | CRM, Order Management, Billing antas inte vara begränsade. | I verkligheten är CRM ofta en flaskhals (master data sync), Order Management är *själva* taktpinnen och kan stannas av sin egen kösituation. |
| **Inga manuella touch-points** | Alla steg är automatiserade. | I verkligheten kräver många flöden manuella touches — och *truly-touchless-andelen* är ett centralt KPI. Manual handover ger köer på timmar/dagar, inte sekunder. |

## Explicita antaganden

Dessa är medvetna val i koden, dokumenterade här för transparens:

1. **Sekventiellt händelseflöde per order.** Inga parallella delsteg, ingen orderdekomponering.
2. **Endast Resource Inventory och Provisioning är begränsade.** Övriga system är "snabba lookups" som processar parallellt.
3. **Failure-prob är kö-driven, men bara i Provisioning.** 5% baseline → 15% vid kö ≥ 1 → 30% vid kö ≥ 3.
4. **Retries är max 1 nivå djupa, 50% prob.** Ingen retry på en retry.
5. **Handoff-tider är konstanta** per layer-relation: 600ms intra-layer, 1200ms cross-layer.
6. **Sim-tid är 2× real-tid.** `SIM_PER_TICK=100` per `TICK_REAL_MS=50`.
7. **`SPAWN_INTERVAL_SIM=1500`** mellan ankomster (deterministisk Poisson-light).
8. **1 ms duration ≈ 1 sekund konceptuell verklighet.** Skala valts för att en happy path tar ~16 sekunder att titta på.
9. **`automation toggle` påverkar reservation-roll-steg** (× 0.5). Mobile har två reservation-steg, fiber har ett — båda halveras.
10. **`provisioning automation toggle` påverkar provisioning (× 0.6) och activation/verification (× 0.7) plus fail-prob (× 0.5).** Eliminerar inte fel — bara minskar dem.
11. **`variability slider` påverkar bara duration per steg.** Ingen variabilitet i ankomstrate, fail-prob eller handoff-tider.
12. **`Resource Inventory workers` och `Provisioning capacity` är 1–3.** Verkligheten har ofta tiotals parallella aktiveringar.

## Implicita antaganden

Dessa är inte uttalade i koden men formar modellens världsbild:

1. **Inventory är binärt korrekt eller inte.** I verkligheten har inventory en *probabilistic accuracy*: 92%, 87%, 95% — fel skalar med produktfamilj och nätsegment.
2. **Aktivering = leverans till kund.** I verkligheten finns ett gap: tjänsten är "tänd" men kunden kan inte använda den (CPE inte konfigurerad, port aktiverad fel, IP routing mismatch).
3. **Billing-trigger sker omedelbart vid `ServiceActivated`.** I verkligheten kan billing triggas på order-acceptance, på aktiverings-event, eller på post-activation-verification — varje val har olika revenue-leakage-risker.
4. **En order = en kund.** Inget B2B-avtalsflöde, inga partner-orders, inga site-orders mot multipla kunder.
5. **Inga regulatoriska checkpoints.** I verkligheten kan KYC, GDPR-samtycke, telekomregleringsbeslut blockera ordern.
6. **Inga säkerhetskontroller.** Fraud detection, credit hold, anti-money-laundering finns inte i modellen.
7. **Network elements svarar alltid (eller fail:ar deterministiskt).** I verkligheten finns timeouts, partial responses, EMS/NMS-degradation.
8. **Ingen tidsdrift mellan system.** Alla system har samma "klocka". I verkligheten ligger systemen på olika tidsskalor (real-time vs hourly batch vs daily reconciliation).

## Product-specific flow realism

Simulatorn har två produkt-specifika happy paths: Fiber 500 Mbps (9 steg) och Mobile subscription (8 steg). Internt körs samma engine för båda — varje step har ett generiskt `role`-fält som styr automation-multiplikatorer.

Den här sektionen kalibrerar realism-nivån för varje aspekt så användaren inte bygger fel mental bild från modellen.

### Realism-skala

- **High realism** — Speglar etablerad praxis och industristandard (TM Forum SID, eTOM, GSMA).
- **Medium realism** — Pedagogiskt korrekt mönster, men implementation varierar mellan operatörer/plattformar.
- **Low realism** — Pedagogisk förenkling. Verkliga värden eller strukturer kan se annorlunda ut.

### Fiber flow (9 steg)

| Aspekt | Realism | Kommentar |
|---|---|---|
| Övergripande pattern: Customer Order → Service Order → Feasibility → Reservation → Provisioning → Activation → Verification → Billing | **High** | TM Forum SID/eTOM standardflöde. |
| Att fiber kräver geografisk *FeasibilityChecked* (service location/address) | **High** | Verkligt steg — alla fiber-operatörer måste verifiera adressen mot täckningskartan. |
| Att fiber-reservation täcker port + profile + CPE samtidigt | **Medium** | Pedagogiskt rimligt; verkligheten varierar — vissa har separata reservation-system per resurs-typ, andra har kombinerad reservation. |
| Att *CPEConfigurationStarted* är ett separat provisioning-steg från access-config | **Medium** | Korrekt separation i många implementationer (CPE och OLT är olika element med olika fail-modes). I vissa moderna intent-baserade plattformar kan de orchestreras som en enhet. |
| Att *ServiceVerified* finns som separat post-activation-steg | **Medium** | Best-practice som mogna operatörer implementerar. Mindre mogna plattformar hoppar över det och triggar billing direkt på activation — vilket är just den fel-modus modellen vill flagga. |
| Eventnamnen (`CustomerOrderCreated`, `FeasibilityChecked`, `ResourcesReserved`, `ProvisioningStarted`, `CPEConfigurationStarted`, `ServiceActivated`, `ServiceVerified`, `BillingStartRequested`) | **Medium** | Illustrativa namn som följer TMF-konventioner, men inte 1:1 med TMF622/TMF640/TMF638-payloads. |
| Specifika durations (5s reservation, 1.5s prov-steg, 800ms billing-trigger) | **Low** | Skala valt för 16-sekunders titt-tid. Verkligheten: API-anrop tar 100ms, fält-installation tar dagar. Förhållanden mellan steg är pedagogiska, inte uppmätta. |
| Att fiber-baseline är ~16.5s simtid | **Low** (tids-skala), **Medium** (relativ ordning) | Verkligheten: B2C fiber-aktivering tar 1-30 dagar inkl. fält-installation. Att fiber är *långsammare* än mobile är dock korrekt. |
| Att alla 9 steg är linjära och sekventiella | **Low** | Verkligheten har parallellism (CPE-frakt + access-provision körs samtidigt) och ordersplit (en customer order → flera service orders). |

### Mobile flow (8 steg)

| Aspekt | Realism | Kommentar |
|---|---|---|
| Övergripande pattern: Customer Order → Service Order → Reservation → Provisioning → Activation → Verification → Billing | **High** | Samma SID/eTOM-mönster. |
| MSISDN och IMSI som separata logiska identiteter | **High** | Direkt från 3GPP-standard (E.164 för MSISDN, IMSI = MCC+MNC+MSIN). |
| SIM/eSIM-profile som separat reservation från numbering | **High** | Verkligheten: numbering plan, SIM-leverantör/RSP, och HSS är tre olika system med separata reservation-flöden. |
| HSS/UDM som central activation-target | **High** | 3GPP-standard. UDM ersätter HSS i 5G-kärnnätet men funktionellt samma roll. |
| Att mobile *saknar* FeasibilityChecked-steg | **Medium** | Pedagogiskt val: vi vill kontrastera mot fiber. Verkligheten: vissa operatörer har feasibility-checks även för mobile (enhets-kompatibilitet, market availability, roaming-partner-täckning) — bara inte adress-baserade. |
| `SubscriberProfileProvisioningStarted` (HSS/UDM update) | **High** | Reell 3GPP-procedur. |
| `NetworkSubscriptionActivated` som separat steg från subscriber-profile | **Medium** | Konceptuellt korrekt; i vissa plattformar är det en atomisk operation, i andra är det stegvis (HSS update → MME notify → policy push). |
| `RegistrationReadinessVerified` som separat post-activation | **Medium** | Best-practice (testa att telefonen kan attacha). Vissa operatörer hoppar över det och förlitar sig på första-användning som verifiering. |
| Att mobile-baseline är ~15.1s simtid (snabbare än fiber) | **High** (relativ ordning) | Mobile saknar fält-installation och har därmed väsentligt kortare lead time än fiber. Skalan är ändå förenklad. |
| Specifika durations (2s NumberReserved, 3s SimProfileReserved) | **Low** | Pedagogiska. |
| Att mobile-flödet är 8 linjära steg | **Low** | Verkligheten har fler steg (number portability validation, fraud screen, SIM logistics for fysisk SIM, eSIM RSP-handshake, etc.). Och flera kan parallelliseras. |

### Tvärgående aspekter

| Aspekt | Realism | Kommentar |
|---|---|---|
| Samma simulator-engine driver båda produkter via produkt-specifika data | **High** | Detta speglar exakt hur en mogen OSS/BSS-plattform är byggd: en gemensam orchestration engine + Product Catalog som parametriserar per produkt. |
| `role`-fält (`reservation`, `provisioning`, `activation`, `verification`) som styr automation oberoende av tech-namn | **Medium** | Pedagogisk modellering. Verkliga plattformar grupperar steg på liknande sätt (state-baserade workflow-engines), men "role" som specifikt fält är vårt namnval. |
| System-IDs (CRM, SI, RI, Prov, Billing) är samma för båda produkter | **High** | TM Forums standardvy: domänerna är produkt-agnostiska, det är *innehållet* per domän som varierar. |
| Att samma fail-typer (ResourceUnavailable, ActivationRejected) finns för båda produkter | **Medium** | Konceptuellt rätt (båda kan ha både inventory-fel och nätelement-fel), men de tekniska orsakerna är väldigt olika. Mobile har inte modellerade RSP-timeouts eller IMSI-conflicts; fiber har inte modellerade dispatch no-show eller install-fel. |
| Failure-prob × kö-längd i Provisioning | **Medium** | Korrekt princip (överbelastning → mer fall-out), men exakta multiplikatorer (5%/15%/30%) är pedagogiska. |
| Att mobile är typiskt snabbare än fiber | **High** | Fiber: dagar–veckor inkl. fält. Mobile: minuter–timmar. Vår 1.4× simtid-skillnad är förenklad men riktning korrekt. |
| `runHistory` nollas vid produktbyte | **High** | Korrekt designval — fiber-baseline och mobile-baseline är inte direkt jämförbara, så improvement-panel ska inte blanda dem. |

### Vad vi *inte* har verifierat

Modellen är baserad på allmän OSS/BSS-arkitektur:

- **TM Forum SID/eTOM** för domänstruktur och flödesmönster
- **3GPP** för mobile-koncept (IMSI, MSISDN, HSS/UDM)
- **GSMA** för eSIM-koncepter (RSP, profile push)
- **ITU-T E.164** för nummerstruktur

**Vi har inte kontrollerat mot någon specifik operatörs faktiska implementation** — varken inom Norden eller globalt. Inga jämförelser mot Tele2/Telia/Telenor/Three eller större internationella operatörer. Inga jämförelser mot leverantörsplattformar (Ericsson OSS, Amdocs, Netcracker, Salesforce Communications Cloud, MATRIXX, etc.).

Om du arbetar mot en specifik operatör eller plattform, förvänta dig:

- *Andra eventnamn* — varje plattform har sina TMF-payloads, interna events eller plattformsspecifika namn.
- *Olika antal steg* — verkligheten har ofta 20–50 events per produkt, inte 8–9.
- *Plattformsspecifika failure modes* — RSP integration patterns, NETCONF dialect quirks, EMS/NMS particularities.
- *Annan ordning vid edge cases* — manuell fall-out, partial activation, retry-strategier hanteras väldigt olika.
- *Olika kapacitetsbegränsningar* — vad som är "begränsat" varierar (vissa har manual approvals som bottleneck, andra har integration adapters, andra har fysisk dispatch).

Modellen är en *pedagogisk simulator för att förklara mönstret*, inte en arkitekturreferens. Använd den för att introducera koncept, inte för att designa eller felsöka en faktisk plattform.

## Order decomposition trade-offs

Ordernedbrytning-panelen i Learn-mode har produkt-specifika happy paths och produkt-specifika resource-patterns för både fiber och mobile. Den här sektionen klargör vad modellen *avsiktligt fördjupar* och vad den lika avsiktligt utelämnar — så användaren inte bygger en falsk känsla av att decomposition-trädet är en operatörsreferens.

### Avsikten med decomposition-vyn

Fiber 500 Mbps och Mobile subscription är valda som *pedagogiska kontraster*, inte som en komplett produktkatalog. Målet är att visa att:

- Customer Order-mönstret är produktagnostiskt — kund → kontrakt → leverans-promise gäller båda.
- Service Order-nivån parametriseras per tjänsttyp men håller samma form.
- *Resource Order-nivån är där produkterna divergerar dramatiskt* — fiber bryts ner till fysiska/geografiska resurser, mobile bryts ner till logiska/synkroniserade identiteter.
- Activation- och verification-stegen följer samma processstruktur men har helt olika tekniskt innehåll.

Det är just det här mönstret — *"same shape, different content"* — som motiverar varför mogna OSS/BSS-plattformar byggs som en gemensam orchestration-engine + en Product Catalog som parametriserar per produktfamilj. Det är också den enda strukturella poäng decomposition-vyn försöker göra. Allt annat är illustrativt.

### Vad vi fördjupar

För båda produkter finns produktspecifika learning patterns (klick på en resurs i decomp-trädet öppnar den i learning-panelen):

**Fiber:**

- *Fiber access* (port + fiberpar) — fysiskt begränsad resurs, adress-driven feasibility, inventory drift som vanligaste fel-källa.
- *Network profile* (VLAN, QoS, IP) — konfigurationspaketet som styr vad kunden faktiskt får av sin access; där "service active men kunden får ingen IP" uppstår.
- *CPE / Router* — hårdvara hos kund, pre-staging vs zero-touch provisioning, var kunden själv har inflytande på felsökning.

**Mobile:**

- *MSISDN* — publikt telefonnummer, E.164-struktur, nummerportabilitet, regulator-tilldelade nummerserier.
- *SIM / eSIM* — fysisk vs logisk profile-leverans, GSMA RSP-flöden, profile mismatch som vanlig fel-källa.
- *IMSI* — intern abonnentidentitet i HSS/UDM, MCC+MNC+MSIN-struktur, MSISDN ↔ IMSI-mappning.

Patternsen är formulerade i samma stil för båda produkter — *vad är det, varför är det centralt, vanlig fel-källa* — för att decomposition-djupet ska kännas konsekvent oavsett vilken produkt användaren utforskar.

### Vad vi *inte* går djupt in på

Avsiktligt utelämnade trots att de är viktiga i verklig drift:

- **Full produktkataloglogik** — produkt-attribut, kompatibilitetsregler, prissättningskedjor, kombinationsorders (fiber + TV + telefoni i samma kontrakt). Skulle dubbla domain-content utan att lägga till lärande på flödet.
- **TM Forum Open API-payloads** — TMF622 (Product Order), TMF641 (Service Order), TMF634 (Service Catalog), TMF638/639 (Service/Resource Inventory), TMF640 (Service Activation). Vi använder TMF-konventioner som inspiration, men inga konkreta payload-scheman.
- **Exakt orchestration mellan Customer Order, Service Order och Resource Order** — vem som dispatchar, vem som äger state, hur compensation/rollback hanteras mellan nivåer, hur saga-pattern eller workflow-engines implementeras i praktiken.
- **Full network topology** — vilka OLT-/edge-router-modeller som finns, hur backhaul kapacitetsplaneras, vilka mobile-kärnnodsroller (MME, AMF, SMF, UPF) som är involverade vid aktivering.
- **Detaljerad OSS-vendor-arkitektur** — Ericsson OSS, Amdocs, Netcracker, Salesforce Communications Cloud, MATRIXX, Blue Planet m.fl. har olika modeller och vi tar inte ställning till någon av dem.
- **Installation och field service** — fälttekniker-scheduling, dispatch optimization, on-site test, kund-handover-protokoll, no-show-hantering.
- **Number portability** — MNP-processen mellan operatörer, donor/recipient-flöden, regulator-rapportering, timing windows, error-recovery vid avbruten portering.
- **Roaming och HLR/HSS/UDM-detaljer** — roaming-avtal, IPX-anslutningar, steering of roaming, lawful intercept, fraud detection i roaming-flöden.
- **Capacity planning i full skala** — backhaul-planering, peering-strategier, geo-rebalansering av fiber-noder, mobile capacity expansion mot prognoser.
- **Billing rating och charging** — real-time charging system (OCS), CDR-pipeline, mediation, rating engines, prorating, discounting, dispute-flöden.
- **Regulatoriska krav och operatörsspecifika processer** — KYC, GDPR-samtyckesflöden, lagrings- och rapporteringsdirektiv, fraud screening, sanctions screening.

Var och en av dessa skulle förtjäna ett eget lärverktyg. Att inkludera dem skulle göra simulatorn ohanterligt bred utan att förbättra *flödesförståelsen* — som är dess kärnvärde.

### Källa och realism-hållning

Simulatorn bygger på *generella OSS/BSS-begrepp och rimliga branschmönster* från publik kunskap och industristandard:

- TM Forum SID/eTOM för domänstruktur och flödesfaser.
- 3GPP-standarder för mobile-koncept (MSISDN, IMSI, HSS/UDM).
- GSMA-specifikationer för eSIM (RSP, profile push).
- ITU-T E.164 för nummerstruktur.

Exakta steg, namn, ordning, durations och failure rates är *pedagogiska förenklingar* — inte uppmätta från en faktisk operatör. Modellen är medvetet kalibrerad för att vara *trovärdig nog att undervisa med*, inte *exakt nog att designa med*.

Om innehållet i simulatorn skulle användas professionellt i en faktisk telekommiljö bör det valideras mot:

- Operatörens interna processdokumentation.
- Den faktiska systemarkitekturen som körs i miljön.
- Den aktiva produktkatalogen och dess regler.
- Den faktiska inventory-modellen och dess accuracy-mätningar.
- Befintliga provisioning- och activation-flöden inklusive automation-grad.
- Subject matter experts från order management, fulfillment, OSS-arkitektur och nätoperation.

Tills dess är simulatorn ett *lärverktyg för att introducera mönstret* — inte en arkitekturreferens, inte en beslutsbas för en specifik miljö, och inte en validerad återgivning av någon konkret operatörs flöden.

## Föreslagna namn- och textändringar

Låg-risk ändringar som ökar trovärdigheten utan att ändra beteendet. *Eventnamn- och UI-ändringarna nedan är genomförda* — tabellerna behålls här som dokumentation av vilka beslut som togs och varför.

### Eventnamn (i `scenarios.js`)

| Nuvarande | Förslag | Varför |
|---|---|---|
| `BillingStarted` | `BillingStartRequested` eller `ReadyForBilling` | Det tekniska eventet betyder *trigger skickad*, inte *faktura ute hos kund*. |
| `ServiceActivated` | `ServiceActivationVerified` eller bibehåll men förtydliga teach-text | Aktivering ≠ kund kan använda. |
| `ResourceMissing` | `ResourceUnavailable` eller `InventoryMismatch` | "Missing" antyder borta — i verkligheten är vanligaste orsaken inventory drift, inte fysisk frånvaro. |
| `ProvisioningFailed` | `ActivationRejected` eller `NetworkConfigRejected` | Specificerar *var* felet sker (nätelement avvisar). |

### Domännamn (i `SYSTEMS`)

| Nuvarande | Förslag | Varför |
|---|---|---|
| `Provisioning / Activation` | Bibehåll, men dela upp i teach-texten | "Provisioning" och "activation" är ofta separata steg (push vs verify). |
| `Resource Inventory` | Bibehåll | Standardterm. |
| `Service Inventory` | Bibehåll | Standardterm. |
| `Billing Trigger` | `Billing Trigger` (förtydliga `role`) | "Startar fakturaklocka" är okej, men kan lägga till "skickar trigger till charging-systemet, inte själva fakturan". |

### Bottleneck-text (i metrics och insight)

| Nuvarande | Förslag | Varför |
|---|---|---|
| "Resource Inventory är flödets flaskhals" | "Resource reservation / inventory validation är flödets flaskhals" | Förtydligar att det är *aktiviteten*, inte hela domänen, som är flaskhalsen. |
| "Provisioning är bottlenecken" | "Network config push (Provisioning) är bottlenecken" | Specifikt vad som tar tid. |

### Dashboard

| Nuvarande | Förslag | Varför |
|---|---|---|
| `Throughput: X/s` | `Throughput: X/s simtid` eller `(simtid)`-suffix | Transparent om att vi mäter i sim-sekunder, inte real-sekunder. |
| `Bottleneck: X` | `Slowest step (this run): X` | "Bottleneck" implicerar permanent — i verkligheten skiftar den mellan körningar. |
| `Avg lead time: 16.2s` | Behåll, men lägg till tooltip/hint: "i en verklig fiber-installation är detta dagar–veckor" | Skala-kontext utan att ändra siffran. |

### README-omformuleringar

- Lägg till disclaimer högst upp.
- I "Vad är OSS/BSS"-sektionerna: tillägg om att domängränserna inte är stenhårda och varierar mellan operatörer.
- I "Order-to-Activate"-sektionen: notera att den 6-events-långa modellen är *en pedagogisk minimalvy* av det som ofta är 20–50 events i verkligheten.

## Nästa rimliga steg

Små förändringar som höjer trovärdighet utan att lägga till komplexitet. Status uppdaterad 2026-05-10.

1. ~~**Genomför namnändringarna ovan.**~~ ✅ Genomfört.
2. **Lägg till en synlig disclaimer i UI:t.** En liten footer eller "?" i headern som öppnar en kort förklaring: "This is a learning model. See REALISM_NOTES.md for what's real and what's simplified." Räcker som textändring.
3. **Skala-tooltip i metrics.** Vid hover på "Total lead time" — visa text om att 16.2s simtid representerar något som i verkligheten är dagar/veckor. Utbildar utan att ändra modellen.
4. **Förtydliga `teach`-texterna på varje event.** Varje event har redan en kort *teach*-text — den kan användas för att flagga var modellen förenklat (delvis gjort när produkt-specifika flöden lades till).
5. **Notera explicit i README var TMF-mappningen ligger.** En liten tabell: "Vårt event ↔ Närmsta TMF-event". Bygger broar till industristandard utan att kräva implementation.
6. **Lägg in en länk till TM Forum SID/eTOM** i learning-panelen för den som vill djupdyka.
7. **Produkt-specifika failure modes.** Idag delar fiber och mobile samma två fail-typer. Verkligheten har olika fail-modes per produkt (RSP timeout för mobile, dispatch no-show för fiber). Skulle stärka domänlärandet utan stor logikändring.

## Vad vi medvetet undviker

För att hålla simulatorn pedagogisk *avstår* vi från följande, även om det skulle göra modellen mer realistisk:

- **TMF-payloads med JSON-schema.** Skulle göra eventen oläsliga utan att lägga till lärdom.
- **Orderdekomponering till tekniska delordrar.** Skulle dubbla mängden boxes och kräva ny UI för att visa parent-child-relationer.
- ~~**Multipla produktfamiljer med olika flöden.**~~ ✅ Genomfört: fiber och mobile har nu olika tekniska steg. Fler produktfamiljer (IoT, B2B SD-WAN, fast telefoni) är fortfarande utelämnade.
- **Manuella touch-points med dagslånga köer.** Pedagogiskt viktigt men kräver tids-skalning eller en "fast forward"-mode för att inte göra UI:t stillastående.
- **Detaljerade fall-out-typer.** Att utöka från 2 till 9 fail-typer skulle kräva nya scenarier och nya förklaringstexter — nyttigt men ett separat arbete.
- **Riktig assurance-loop.** Post-activation incident → root cause → fix-flödet är värdefullt men kräver ny domänlogik.

Dessa är möjliga framtida tillägg — inte saker att dölja eller låta bli att flagga.
