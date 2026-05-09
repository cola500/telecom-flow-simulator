---
title: Realism Notes
description: Vad i simulatorn speglar verklig telekom-OSS/BSS, vad är pedagogiskt förenklat, vilka antaganden gör modellen, och vilka namn-/textändringar som skulle öka trovärdigheten utan att göra appen komplex.
category: learning-tool
status: draft
last_updated: 2026-05-09
sections: [Syfte, Vad är realistiskt, Vad är pedagogiskt förenklat, Explicita antaganden, Implicita antaganden, Föreslagna namn- och textändringar, Nästa rimliga steg, Vad vi medvetet undviker]
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
| **En produkt, en order** | Alla orders är samma "tjänst". | Operatörer hanterar fiber, mobil, IoT, B2B vs B2C — varje produktfamilj har olika flöde, olika bottlenecks, olika SLA. |
| **Ingen orderdekomponering** | Kommersiell order = teknisk order. | I verkligheten dekomponeras en order till flera *tekniska delordrar* (CFS → RFS), ofta parallella, med beroenden. |
| **Bara 6 events i happy path** | OrderCreated → FeasibilityChecked → ResourcesReserved → ProvisioningStarted → ServiceActivated → BillingStarted. | Verkliga flöden har 20–50 events: address validation, credit check, design, dispatch, install, test, activation, post-activation verification, etc. |
| **Bara 2 fail-typer** | ResourceMissing, ProvisioningFailed. | I verkligheten: address validation fail, credit fail, design fail, dispatch no-show, install fail, test fail, partial activation, post-go-live degradation, kundavtal fail. |
| **2 single-proc system** | RI och Prov är de enda begränsade resurserna. | I verkligheten finns många flaskhalsar: kreditkontroll-batch, manuella godkännanden, NMS-bandbredd, NETCONF-sessioner per element, fysisk fiberblåsning, fälttekniker-kapacitet. |
| **Hard-coded durations** | Steg tar 0.8–5 sekunder simtid. | Verkligheten har enorm spridning: API-anrop tar 100ms, batch-jobb körs en gång per dygn, fält-installation tar dagar/veckor. |
| **Konstanta handoff-tider** | 600ms inom layer, 1200ms mellan. | I verkligheten är handoffs den största variabilitetskällan — köer mellan team, batch-integrationer, godkännandetider varierar från sekunder till veckor. |
| **Inga TMF-payloads** | Eventnamnen är illustrativa. | Operatörer som följer TM Forum använder TMF622 (Product Order), TMF641 (Service Order), TMF638 (Service Inventory), TMF639 (Resource Inventory), TMF640 (Service Activation) — varje event har specificerat schema. |
| **Service Inventory uppdateras inte explicit** | Aktivering markerar inte SI som "active" i flödet. | I verkligheten uppdateras SI vid varje state-övergång och är källan för Assurance-koppling. |
| **Provisioning + Activation är samma steg** | "ProvisioningStarted" och "ServiceActivated" hanteras båda av prov-systemet. | Ofta separata steg: provision = config push (kan accepteras av elementen), activation = end-to-end test (verifierar att tjänsten faktiskt fungerar). |
| **Billing triggas direkt efter aktivering** | Antagandet att aktivering = OK att fakturera. | Ofta finns en *hold-period* för att verifiera tjänsten innan billing — eller billing triggas på post-activation verification, inte aktiveringseventet. |
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
9. **`automation toggle` påverkar bara `ResourcesReserved`** (5s → 2.5s).
10. **`variability slider` påverkar bara duration per steg.** Ingen variabilitet i ankomstrate, fail-prob eller handoff-tider.

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

## Föreslagna namn- och textändringar

Låg-risk ändringar som ökar trovärdigheten utan att ändra beteendet. **Inte gjorda än** — denna fil dokumenterar förslagen.

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

Små förändringar som höjer trovärdighet utan att lägga till komplexitet. Listan är prioriterad efter värde-per-arbete.

1. **Genomför namnändringarna ovan.** Ren textändring i scenarios.js + ett par platser i README/learning-texterna. Ingen logik rörd.
2. **Lägg till en synlig disclaimer i UI:t.** En liten footer eller "?" i headern som öppnar en kort förklaring: "This is a learning model. See REALISM_NOTES.md for what's real and what's simplified." Räcker som textändring.
3. **Skala-tooltip i metrics.** Vid hover på "Total lead time" — visa text om att 16.2s simtid representerar något som i verkligheten är dagar/veckor. Utbildar utan att ändra modellen.
4. **Förtydliga `teach`-texterna i HAPPY_PATH.** Varje event har redan en `teach`-rad — använd den för att flagga var modellen förenklat (t.ex. "I verkligheten består detta steg av address-validation + credit-check + design").
5. **Notera explicit i README var TMF-mappningen ligger.** En liten tabell: "Vårt event ↔ Närmsta TMF-event". Bygger broar till industristandard utan att kräva implementation.
6. **Lägg in en länk till TM Forum SID/eTOM** i learning-panelen för den som vill djupdyka.

## Vad vi medvetet undviker

För att hålla simulatorn pedagogisk *avstår* vi från följande, även om det skulle göra modellen mer realistisk:

- **TMF-payloads med JSON-schema.** Skulle göra eventen oläsliga utan att lägga till lärdom.
- **Orderdekomponering till tekniska delordrar.** Skulle dubbla mängden boxes och kräva ny UI för att visa parent-child-relationer.
- **Multipla produktfamiljer med olika flöden.** Värdefullt men en hel slice i sig — *inte* den här calibrationens uppgift.
- **Manuella touch-points med dagslånga köer.** Pedagogiskt viktigt men kräver tids-skalning eller en "fast forward"-mode för att inte göra UI:t stillastående.
- **Detaljerade fall-out-typer.** Att utöka från 2 till 9 fail-typer skulle kräva nya scenarios + nya teach-texter — nyttigt men bör vara en egen slice.
- **Riktig assurance-loop.** Post-activation incident → root cause → fix-flödet är värdefullt men kräver ny domänlogik.

Dessa hör hemma i framtida slices, inte i en namn-och-text-kalibrering.
