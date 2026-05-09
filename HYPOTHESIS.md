---
title: OSS/BSS Order-to-Activate Simulator
description: Lokal browser-simulator för att förklara order-to-activate-flödet i en telekom OSS/BSS-stack.
category: learning-tool
status: in-progress
last_updated: 2026-05-09
sections: [Hypothesis, Test, Success Criteria, Time Budget, Result]
---

# OSS/BSS Order-to-Activate Simulator

## Hypothesis
En enkel lokal webbsimulator med (a) en systemkarta över de centrala OSS/BSS-domänerna och (b) en sekvensiell eventlogg räcker för att förklara order-to-activate-flödet på under 5 minuter för någon som inte sett OSS/BSS förut. Att även kunna simulera två felscenarier (ResourceMissing, ProvisioningFailed) gör det lättare att prata om var i flödet saker brukar gå sönder.

## Test
- Bygg en `index.html` (vanilla HTML/CSS/JS, inga deps).
- Visa 7 systemdomäner som kort med pedagogisk hover-text.
- Tre knappar: Create order (happy path), Simulera ResourceMissing, Simulera ProvisioningFailed.
- Stegvisa events med synlig fördröjning, eventlogg, orderstatus, "lysande" box för det system som är aktivt.
- Demonstrera flödet för minst en person som inte är telekom-van och se om de följer med.

## Success Criteria
- Happy path triggar exakt: OrderCreated → FeasibilityChecked → ResourcesReserved → ProvisioningStarted → ServiceActivated → BillingStarted.
- ResourceMissing: stannar med fel efter FeasibilityChecked.
- ProvisioningFailed: stannar med fel efter ProvisioningStarted.
- Jag kan utan manus förklara order-to-activate medan jag klickar igenom simulatorn.
- En åhörare utan telekom-bakgrund kan i egna ord beskriva vad varje domän gör efter en demo.

## Time Budget
45 minuter för MVP. Stop-and-evaluate efter slice 1 (happy path + felscenarier i en fil).

## Result
_Filled in after demo._
- **Status**:
- **What we learned**:
- **Decision**:
