---
title: Project Brain — Briefing
description: Kort handoff-läsning (max ~en A4) för ChatGPT och Johan. Förstå läget snabbt utan att läsa hela repot.
category: project-brain
status: active
last_updated: 2026-07-04
sections: [Project, Current focus, Current slice, Completed since last briefing, Current status, Open questions, Decision needed, Recommended next step, Links]
---

# Briefing

> **Läs den här vid varje handoff.** En sida räcker för att förstå var vi är. Djupare detaljer finns i de andra `project-brain/`-filerna (länkar sist).

## Project

Enterprise Delivery Lab — en liten körbar simulator som gör enterprise IT-leverans begriplig (flöde, flaskhalsar, WIP-effekter), i samma anda som telecom-simulatorn i repot. Se [project.md](project.md).

## Current focus

Etablera **Project Brain 0.1** som gemensamt arbetsminne mellan ChatGPT och Claude, för att minska manuell kontextöverföring vid överlämningar. Enterprise Delivery Lab är testbädden.

## Current slice

Project Brain 0.1 — markdown-filerna i `project-brain/`. Enterprise Delivery Lab ligger på en enda "single initiative"-slice (`enterprise-lab.html`).

## Completed since last briefing

- Project Brain 0.1-struktur skapad: `project.md`, `current.md`, `decisions.md`, `tasks.md`, `verification.md`.
- Denna `briefing.md` tillagd som handoff-läsning.
- `DEVELOPMENT.md` länkar till `current.md` som ingång för pågående arbete.
- Enterprise Delivery Lab-slice på plats (`enterprise-lab.html`, designdok i `docs/enterprise-delivery-lab-design.md`).

## Current status

Struktur på plats, ingen orchestrator och ingen automation — medvetet. Markdown räcker tills hypotesen är bekräftad.

## Open questions

- När räknas Project Brain 0.1 som verifierat? Se [verification.md](verification.md).
- Vilken pedagogisk idé står på tur som nästa Enterprise Delivery Lab-slice?
- Ska README länka till `project-brain/` senare, eller bara `DEVELOPMENT.md` tills vidare?

## Decision needed

Inget blockerande beslut just nu. Nästa beslut aktualiseras när verifieringen ger utslag: fortsätta med enbart markdown, eller lägga till mall/verktyg.

## Recommended next step

Kör verifieringstestet: starta nästa slice genom att **endast** läsa `briefing.md` / `current.md` — utan att klistra in extra kontext — och notera i [verification.md](verification.md) om det räckte.

## Links

- [project.md](project.md) — vision, syfte, målgrupp, designprinciper
- [current.md](current.md) — nuläge i detalj
- [decisions.md](decisions.md) — beslutslogg
- [tasks.md](tasks.md) — Now / Next / Later / Done
- [verification.md](verification.md) — hypotes och verifiering
