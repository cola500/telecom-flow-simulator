---
title: Project Brain — Verifiering
description: Hypotes och verifiering av Project Brain 0.1 som gemensamt arbetsminne mellan ChatGPT och Claude.
category: project-brain
status: in-progress
last_updated: 2026-07-04
sections: [Hypothesis, Experiment, Success criteria, How to verify, Result]
---

# Verifiering

## Hypothesis

Om ChatGPT och Claude kan utgå från samma Project Brain minskar behovet av långa manuella överlämningar.

## Experiment

Använd `project-brain/`-filerna som gemensam startpunkt under en period av verkligt arbete på Enterprise Delivery Lab. Vid varje överlämning: peka verktyget till `project-brain/current.md` istället för att skriva om kontexten manuellt.

## Success criteria

- Johan behöver skriva mindre kontext mellan ChatGPT och Claude.
- Claude kan förstå nästa steg genom att läsa `project-brain/current.md`.
- Beslut hamnar i `decisions.md` istället för att försvinna i chatten.
- Nästa slice går att starta från Project Brain utan lång prompt.

## How to verify

- Starta en ny session med bara "läs `project-brain/current.md` och föreslå nästa steg" — kolla om svaret blir användbart utan mer kontext.
- Notera efter varje överlämning: behövde jag klistra in extra bakgrund? Hur mycket?
- Kolla att fattade beslut faktiskt landar i `decisions.md`.
- Jämför upplevd överlämningsfriktion före/efter.

## Result

*(Ej ifyllt ännu — fylls i efter några skarpa överlämningar. Se [tasks.md](tasks.md) → Later.)*
