---
title: Telecom-domänen — OSS och BSS
description: Telecom-specifik teori bakom simulatorn — BSS/OSS-uppdelningen, order-decomposition, fiber vs mobile, fulfillment-flödet och typiska felscenarier.
category: learning-content
status: in-progress
last_updated: 2026-05-11
sections: [Vad är BSS, Vad är OSS, From Customer Order to Service and Resource Orders, Same flow different product decomposition, Same operating pattern different technical flow, Hur hänger Order-to-Activate ihop, Felscenarier]
related: [README.md, REALISM_NOTES.md, flow-systems-thinking.md, learning-philosophy.md]
---

# Telecom-domänen — OSS och BSS

Den här filen samlar telecom-specifik teori. Den fokuserar på *domänen* — hur OSS- och BSS-systemen hänger ihop, hur en kundorder dekomponeras till tekniska delar, varför fiber och mobil hanteras så olika på OSS-sidan, och vilka felmönster som är vanliga.

För flödes- och systems thinking-perspektiv (lead time, bottlenecks, kö, throughput), se [`flow-systems-thinking.md`](flow-systems-thinking.md). För pedagogisk filosofi, se [`learning-philosophy.md`](learning-philosophy.md). För realism och förenklingar, se [`REALISM_NOTES.md`](../REALISM_NOTES.md).

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
3. Klicka på *Why fiber and mobile decompose differently* i learning-panelen för att förstå *varför* de skiljer sig så mycket på OSS-sidan.
4. Klicka på *What stays the same across products?* för att se vad som motiverar generiska OSS/BSS-plattformar — samma ramverk, parametriserat per produkt.

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

> *Se [`REALISM_NOTES.md`](../REALISM_NOTES.md) för modellantaganden och förenklingar* — där varje aspekt av flödet (för båda produkter) är bedömd som High / Medium / Low realism, med tydlig markering av vad som är osäkert eller inte verifierat mot specifik operatör.

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

## Felscenarier

Simulatorn modellerar två klassiska fel:

- **ResourceMissing** — Resource Inventory hittar ingen ledig resurs efter feasibility. Pekar oftast på *inventory drift* eller dåligt synkad utbyggnadsplanering.
- **ProvisioningFailed** — adaptern eller nätelementet avvisar konfigurationen. Risken är *partial activation* — tjänsten är halvtänd och billing kanske ändå triggar.

Båda dessa fel pekar på samma underliggande tema: *datakvalitet* och *integration mellan domäner*. För hur dessa fel propagerar till operativ belastning i en organisation, se Operativ påverkan-panelen i appen.
