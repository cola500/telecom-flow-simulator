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

## 2026-07-04 — Project Brain 0.1 som gemensamt arbetsminne

- **Vi testar Project Brain 0.1** som gemensamt arbetsminne mellan ChatGPT och Claude.
  - *Varför:* minska långa manuella överlämningar av kontext mellan verktygen.
- **Vi börjar med markdown-filer** i `project-brain/`.
  - *Varför:* enklast möjliga som kan bli single source of truth; inga deps, öppnas direkt.
- **Vi bygger ingen orchestrator ännu.**
  - *Varför:* undvik komplexitet innan hypotesen är bekräftad. Markdown först, verktyg sen om det behövs.
- **Enterprise Delivery Lab är testbädden.**
  - *Varför:* pågående arbete med tydliga slices — bra fall för att pröva om delat minne minskar överlämningsfriktion.
