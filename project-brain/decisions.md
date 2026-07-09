---
title: Project Brain — Beslutslogg
description: Kronologisk logg av beslut för Enterprise Delivery Lab och Project Brain. Beslut hamnar här istället för att försvinna i chatten.
category: project-brain
status: active
last_updated: 2026-07-04
sections: [Beslutslogg]
---

# Beslutslogg

> Ett beslut per rad-block, senaste överst. Skriv "varför" mer än "vad".

## 2026-07-04 — Enterprise Delivery Lab: repair-slice (early alignment)

- **Repair-halvan av treklangen byggs som nästa slice**: en förbättringskontroll (tidig arkitektur- & säkerhets-alignment) + delta mot förra körningen.
  - *Varför:* run → break fanns redan; repair fullbordar den pedagogiska kärnan "ändra en sak, se skillnaden".
- **Tradeoff-modell, inte gratis prevention.** Alignment kostar en premie uppfront (+3 dagar vardera på Architecture och Security) men krymper `arch_rework`-omtaget från 4 steg till 1.
  - *Varför:* en gratis toggle lär inget; premien gör poängen ärlig — tidig alignment är en försäkring, inte magi.
- **Premien syns alltid**, även på happy path (128 d mot 122).
  - *Varför:* verktygets själ är att visa den obekväma sanningen — en försäkring kostar även när smällen uteblir. Eventloggen förklarar premie-raden.
- **Jämförelse via delta-badges på impact-korten**, återanvänder telecom-mönstret `comparePreviousRun`. `previousSummary` lever i motorns modulscope så auto-reset inte tappar jämförelsen; bara manuella Återställ rensar den.
  - *Varför:* samma reset-fälla som telecom varnar för — undveks medvetet.

## 2026-07-04 — Project Brain 0.1 som gemensamt arbetsminne

- **Vi testar Project Brain 0.1** som gemensamt arbetsminne mellan ChatGPT och Claude.
  - *Varför:* minska långa manuella överlämningar av kontext mellan verktygen.
- **Vi börjar med markdown-filer** i `project-brain/`.
  - *Varför:* enklast möjliga som kan bli single source of truth; inga deps, öppnas direkt.
- **Vi bygger ingen orchestrator ännu.**
  - *Varför:* undvik komplexitet innan hypotesen är bekräftad. Markdown först, verktyg sen om det behövs.
- **Enterprise Delivery Lab är testbädden.**
  - *Varför:* pågående arbete med tydliga slices — bra fall för att pröva om delat minne minskar överlämningsfriktion.
