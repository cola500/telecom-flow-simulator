---
title: Project Brain — Projektöversikt
description: Delat arbetsminne för Enterprise Delivery Lab. Vision, syfte, målgrupp och designprinciper.
category: project-brain
status: active
last_updated: 2026-07-04
sections: [Vision, Syfte, Målgrupp, Vad labbet ska hjälpa användaren förstå, Designprinciper]
---

# Project Brain — Enterprise Delivery Lab

> Detta är en av fem filer i `project-brain/`. Se [current.md](current.md) för vad som händer just nu.

## Vision

En liten, körbar simulator som gör *enterprise IT-leverans* begriplig på samma sätt som telecom-simulatorn gör order-to-activate begripligt: du ser flödet, ser var det stockar sig, ändrar en sak och ser skillnaden.

## Syfte

Att förklara varför leverans i stora organisationer tar tid — handoffs, köer, väntan, beroenden — genom att låta någon *leka* med systemet istället för att läsa en rapport.

## Målgrupp

- Personer utan djup process- eller flödesbakgrund som ändå behöver förstå varför leverans är långsam.
- Johan själv, som verktyg för att tänka och förklara.
- Sekundärt: kollegor/kunder i samtal om leveransflöden.

## Vad labbet ska hjälpa användaren förstå

- Att ledtid domineras av väntan mellan steg, inte av arbetet i stegen.
- Att en flaskhals flyttar sig när man lättar på den (Theory of Constraints).
- Att lokala optimeringar inte förbättrar helheten.
- Att fler samtidiga initiativ ofta gör allt långsammare (WIP-effekten).

## Designprinciper

- **En slice = en idé.** Bygg en pedagogisk poäng i taget.
- **Inga ramverk, inga build-tools, inga deps.** Ska öppnas direkt från disk.
- **Copy, don't abstract.** Andra domänen byggs isolerat, inte genom att generalisera telecom-koden (se `VISION.md` Fas 2).
- **Visa, förklara inte.** Poängen ska framgå av att man kör, inte av text.
- **Kort och praktiskt.** Gäller både kod och dokumentation.
