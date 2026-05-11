---
title: OSS/BSS Order-to-Activate Simulator
description: Lokal browser-baserad lärsimulator för en förenklad telekom-stack — visar order-to-activate-flödet, lead time, handoffs, bottlenecks och förbättringsfrågor.
category: learning-tool
status: in-progress
last_updated: 2026-05-11
sections: [Disclaimer, Three modes Learn OSS/BSS Optimize Process Documentation, Vad simulatorn lär ut, Saker att prova, Dokumentationsöversikt, Begrepp och förkortningar, Tillgänglighet och läsbarhet, Begränsningar, For developers]
---

# OSS/BSS Order-to-Activate Simulator

> 🔗 **Live demo:** [cola500.github.io/telecom-flow-simulator](https://cola500.github.io/telecom-flow-simulator/) — kör direkt i webbläsaren, ingen installation behövs.

Ett interaktivt lärverktyg för att förstå hur en kundorder vandrar genom en telekomoperatörs IT-system tills tjänsten är aktiverad och fakturering startar.

Simulatorn hjälper dig att se:
- hur de stora system-domänerna i telekom är uppdelade (BSS för affär och kund, OSS för nät och tjänst);
- hur en order dekomponeras till tekniska arbetsobjekt;
- var flöden typiskt fastnar (köer, handoffs, "bottlenecks");
- hur olika beslut — automation, kapacitet, variation — påverkar tjänstens leverans.

Du behöver inte ha jobbat med telekom tidigare. Allt förklaras stegvis i appens *Learn OSS/BSS*-läge och i denna dokumentation.

> **This is a simplified learning model, not a full telecom architecture.**
> Domänerna och flödesfaserna är inspirerade av industristandard (TM Forum SID/eTOM), men eventnamn, durations, fail-typer och flöde är kraftigt förenklade för att vara begripliga på 5 minuter. Se [`REALISM_NOTES.md`](REALISM_NOTES.md) för en kalibrering: vad är realistiskt, vad är pedagogiskt förenklat, och vilka antaganden modellen gör. För telekomförkortningar (BSS, OSS, IMSI, MSISDN, OLT, RSP, HSS, …) finns en samlad referens i sektionen [Begrepp och förkortningar](#begrepp-och-förkortningar).

## Three modes: Learn OSS/BSS, Optimize Process, Documentation

Simulatorn har tre lägen, valbara via tabs i headern:

- **Learn OSS/BSS** (default) — fokus på domänen. Systemkartan, en guidad teoriresa från kundorder till aktiverad tjänst, Order Decomposition (fiber/mobile), eventflödet vid en enskild order, Timeline, och Learning-panelen är synliga. Optimeringskontroller och belastnings-paneler är dolda.
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
- **Vilka frågor team kan ställa** för att hitta var flödet bryter och var förbättring ger mest effekt.

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

## Dokumentationsöversikt

README är portalen — innehållet är uppdelat i fyra fördjupningsdokument som var och en är tillgänglig direkt i appens Documentation-vy:

- **[Telecom-domänen — OSS och BSS](docs/telecom-theory.md)** — BSS- och OSS-systemen, customer/service/resource-decomposition, fiber vs mobile, hur Order-to-Activate-flödet hänger ihop, typiska felscenarier.
- **[Flow och systems thinking](docs/flow-systems-thinking.md)** — Lead time, handoffs och bottlenecks. Köbildning, throughput, Little's Law, flow efficiency, Theory of Constraints, variation, cascading failures. Hur man läser simulatorns metrics och tar systems-thinking-perspektivet.
- **[Pedagogisk filosofi](docs/learning-philosophy.md)** — Hur simulatorn är designad pedagogiskt: discovery före text, kör/bryt/reparera, reflektionsfrågor, flera zoom-nivåer, run comparison. Konkret experiment-exempel: automatisera resource reservation.
- **[Realism och förenklingar](REALISM_NOTES.md)** — Vad i simulatorn speglar verklig OSS/BSS, vad är pedagogiskt förenklat, vilka antaganden modellen gör. Per-aspekt-bedömning High/Medium/Low realism för fiber- och mobile-flödet, plus dokumenterade trade-offs.

För platformstanke och framtida riktning (kan samma simulatorprinciper användas för andra domäner?), se [`VISION.md`](VISION.md).

## Begrepp och förkortningar

Central referens för telekom- och OSS/BSS-termer som dyker upp i appen. Använd den för att slå upp en förkortning du stöter på, eller som komplement till de djupare förklaringarna i learning-panelen.

Konvention i resten av dokumentationen: en förkortning förklaras vid första användning i ett dokument (*"IMSI (International Mobile Subscriber Identity)"*), och används som kort form därefter (*"IMSI"*).

- **3GPP** (3rd Generation Partnership Project) — Standardiseringsorgan som tar fram mobilnätsstandarder från 3G till 5G/6G. Källa för IMSI-, HSS- och UDM-koncept i simulatorn.
- **Activation** — Det tekniska steget där en konfigurerad tjänst görs faktiskt levande i nätet, ofta i flera sub-steg. I simulatorn separerat från *Provisioning* (config push) och *Verification* (test att det fungerar).
- **Assurance** — Domänen som bevakar tjänster i drift: larm, incidenter, felavhjälpning. Hör hemma på OSS-sidan och är där fall-out från fulfillment landar som arbete.
- **Backpressure** — Mekanism där uppströms-system tillfälligt pausar inflödet när nedströms-kö passerar en tröskel. Hellre långsam respons än kollaps. Modelleras som en valbar toggle i Optimize-mode.
- **BSS** (Business Support Systems) — Den kommersiella sidan: CRM, Order Management, Billing. Äger kund, produkt, avtal och fakturering.
- **CDR** (Call Detail Record) — Datapost som beskriver en kommunikationshändelse. Råmaterial för billing/charging, finns inte modellerat i simulatorn men nämns i Operativ påverkan-kontexten.
- **CPE** (Customer Premises Equipment) — Hårdvaran hos kunden, typiskt en router som ansluts till fiber-uttaget. En av fiber-flödets resource orders.
- **CRM** (Customer Relationship Management) — System som äger kund-, avtals- och kontaktinformation. Default-startpunkt för en customer order.
- **DORA** — Forskningsbaserade mätetal för software delivery performance (Deployment Frequency, Lead Time for Changes, Change Failure Rate, MTTR). Inte aktuellt i telecom-simulatorn men refereras i VISION.md som potentiell future-domain.
- **EMS** (Element Management System) — System som hanterar enskilda nätelement (t.ex. en OLT-modell). En provisioning-adapter pratar ofta med EMS hellre än elementet direkt.
- **eSIM** (embedded SIM) — Mjukvaruprofil i ett chip i telefonen. Distribueras via en RSP istället för fysisk SIM-leverans.
- **eTOM** (enhanced Telecom Operations Map) — TM Forums processramverk som beskriver typiska operatörsprocesser. Simulatorns flödesfaser är inspirerade av eTOM:s fulfillment-domän.
- **Fall-out** — Order som inte tar sig genom flödet utan kräver manuell handpåläggning. En av branschens centrala KPI:er och drivkraften bakom Operativ påverkan-panelen.
- **GDPR** (General Data Protection Regulation) — EU:s dataskyddsförordning. Påverkar samtycke, lagring och radering av kunddata i en faktisk operatörsmiljö, men är utelämnad i simulatorn.
- **GSMA** (GSM Association) — Branschorganisation som standardiserar mobilbranschens samverkan, inklusive eSIM RSP-protokollet.
- **Handoff** — När arbete byter system eller team. Varje handoff kostar tid genom kö, översättning, informationsförlust och kontextväxling. Simulatorn visualiserar handoffs som streckmönstrade timeline-staplar.
- **HSS** (Home Subscriber Server) — 3G/4G-centralregister med abonnentdata, autentisering och tjänsteinformation. Aktivering av en mobiltjänst innebär en uppdatering i HSS.
- **IMS** (IP Multimedia Subsystem) — Arkitektur för IP-baserade telekommunikationstjänster (VoLTE, VoWiFi). Provisioning-adaptern i simulatorn pratar mot "IMS-core" som abstrakt mål.
- **IMSI** (International Mobile Subscriber Identity) — Intern abonnentidentitet i mobilnätet, 15 siffror. Lagras på SIM/eSIM och i HSS/UDM. Olikt MSISDN — IMSI är intern, MSISDN är publik.
- **Inventory drift** — När inventory-data inte stämmer med verkligheten i nätet. En av telekomdriftens vanligaste tysta problem och det vi simulerar med ResourceUnavailable-scenariot.
- **KYC** (Know Your Customer) — Process för att verifiera kundens identitet vid avtalstecknande. Lagkrav i många jurisdiktioner men inte modellerat i simulatorn.
- **MEF** — Branschorganisation som standardiserar Carrier Ethernet och SD-WAN. Refereras i samband med provisioning-protokoll.
- **MNP** (Mobile Number Portability) — Process som låter en kund behålla sitt MSISDN vid byte av operatör. Förklaras i MSISDN-pattern men är inte simulerat som scenario.
- **MSISDN** (Mobile Station International Subscriber Directory Number) — Publika telefonnumret, struktur enligt ITU-T E.164. Allokeras ur en nummerpool vid mobile-aktivering.
- **NETCONF** — Standardiserat nätverksprotokoll för att konfigurera nätelement. Typisk transportväg från provisioning-systemet till routers, OLT och liknande.
- **NMS** (Network Management System) — System som ger övergripande syn på och kontroll över hela nätet. Sitter typiskt ovanpå EMS:erna.
- **NOC** (Network Operations Center) — Operativ enhet som bevakar och hanterar nätet dygnet runt. Manuella escalation från provisioning-fel landar ofta här.
- **OCS** (Online Charging System) — Realtidssystem för att styra debitering vid användning. Definierat av 3GPP, inte modellerat i simulatorn.
- **OLT** (Optical Line Terminal) — Aktiv nätutrustning som terminerar fiber mot kunder. En begränsad fysisk resurs — fiber-flödets typiska bottleneck-kandidat tillsammans med fiberpar.
- **OSS** (Operational Support Systems) — Den tekniska sidan: Service Inventory, Resource Inventory, Provisioning, Assurance. Driver och övervakar nätet.
- **Partial activation** — När en aktivering accepteras av nätet delvis men inte fungerar end-to-end. Service inventory tror tjänsten är aktiv, men kunden får inte tjänsten. En av de dyraste felmoderna eftersom den hittas långt senare.
- **Provisioning** — Att skicka konfiguration till nätelement (typiskt via NETCONF/CLI). Skild från activation och verification.
- **QoS** (Quality of Service) — Policy som styr prioritet, garanterad bandbredd och latens per trafiktyp. En del av en network profile för fiber.
- **RSP** (Remote SIM Provisioning) — GSMA-standardiserad eSIM-leveransprocess via extern profile-server. Lägger till en extern part i flödet — vanlig fel-källa vid eSIM-aktivering.
- **SBC** (Session Border Controller) — Nätelement som hanterar signalering och media vid kanten av IP-telefoninät. Provisioning-target för röst-tjänster.
- **SID** (Service Information Data) — TM Forums datamodell för OSS/BSS-domänerna. Beskriver hur kund, produkt, tjänst, resurs och avtal relaterar.
- **SIM** (Subscriber Identity Module) — Fysiskt kort som lagrar IMSI och autentiseringsnycklar. Fysisk variant av det eSIM gör som mjukvaruprofil.
- **SLA** (Service Level Agreement) — Kontrakterad servicenivå, t.ex. leveranstid och tillgänglighet. Bryts om en order tar för lång tid eller fail:ar — vilket landar som credits, eskaleringar eller regulatorisk rapportering.
- **TM Forum** — Branschorganisation för OSS/BSS-standarder. Producerar SID-datamodellen, eTOM-processramverket och TMF Open APIs.
- **TMF Open APIs** — Standardiserade REST-API:er för OSS/BSS-domänerna. Exempel: TMF622 (Product Order), TMF641 (Service Order), TMF638/639 (Service/Resource Inventory), TMF640 (Service Activation). Simulatorn använder konventionerna som inspiration utan att implementera schemana.
- **UDM** (Unified Data Management) — 5G-motsvarigheten till HSS. Centralregister för abonnentdata med uppdaterad arkitektur.
- **VLAN** (Virtual LAN) — Logisk indelning av nätverk på Layer 2. En del av en network profile som styr vilket logiskt nät en fiberport tillhör.

## Tillgänglighet och läsbarhet

Simulatorn försöker vara behaglig att läsa och navigera även om den inte är fullt WCAG-certifierad. Konkret innebär det:

- Textfärger har minst 4.5:1 kontrast på vit bakgrund (WCAG AA för normal text).
- Interaktiva element (knappar, länkar, info-ikoner, mode-tabs, sökresultat) har synlig `:focus-visible`-fokusring så tangentbordsanvändare ser var fokus är.
- En "Hoppa till innehåll"-länk dyker upp vid första Tab så skärmläsar- och tangentbordsanvändare kan förbi headerns mode-tabs och söka.
- Längre sektioner är collapsible, så användaren själv styr hur mycket innehåll som är öppet — *progressive disclosure* istället för en lång oavbruten sida.
- Större text och 40 px touch-targets på mobil (≤ 640 px viewport).
- aria-label på alla ikon-knappar (info-ikoner, ✕ för rensa sök, ↑ för till toppen, panel-toggles).

Det här är inte en accessibility-revision och simulatorn täcker inte alla WCAG-kriterier. Om du upplever en specifik svårighet — t.ex. tangentbordsnavigation som hakar, eller dålig kontrast någonstans — är feedback uppskattad.

## Begränsningar

Detta är ett **lärverktyg, inte en arkitekturreferens**. Förenklingar:

- Inget Product Catalog, inga produkter att välja mellan.
- Ingen orderdekomponering — modellen hoppar direkt från kommersiell order till en teknisk delorder.
- Inga TMF Open API-payloads (TMF622/TMF641 etc.). Eventnamnen är illustrativa.
- Ingen persistens, ingen samtidighet, en order i taget.
- Ingen riktig assurance-loop efter aktivering.

## For developers

Teknisk dokumentation — hur appen körs lokalt, kodstruktur, laddordning, och hur du lägger till nya pedagogiska slices — finns i [`DEVELOPMENT.md`](DEVELOPMENT.md). Modellantaganden och realism-bedömningar finns i [`REALISM_NOTES.md`](REALISM_NOTES.md).
