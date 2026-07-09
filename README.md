---
title: FlowLab — interaktiv lärplattform för systems thinking
description: FlowLab är en lärplattform där man förstår komplexa leveranssystem genom att köra dem, bryta dem och reparera dem. Tre labb i tre domäner — telecom, enterprise-leverans och organisationsförändring — som delar samma pedagogiska DNA.
category: learning-tool
status: in-progress
last_updated: 2026-07-09
sections: [Vision, De tre labben, Designprinciper, Vad som finns idag, Roadmap, Köra lokalt, Dokumentation, Tillgänglighet och begränsningar, For developers]
---

# FlowLab

> Interaktiv lärplattform för **systems thinking**. Du lär dig inte om komplexa leveranssystem genom att läsa — du lär dig genom att **köra dem, bryta dem och reparera dem**, och genom att gissa utfall, experimentera och reflektera.

> 🔗 **Live demo:** [cola500.github.io/telecom-flow-simulator](https://cola500.github.io/telecom-flow-simulator/) — kör direkt i webbläsaren, ingen installation. (Landar i OSS/BSS-simulatorn; övriga labb nås därifrån och via `enterprise-lab.html`.)

<img width="1232" height="680" alt="OSS/BSS Simulator — Learn-läget" src="https://github.com/user-attachments/assets/58ceba39-3cf9-4196-9919-04cf9be56c73" />

<img width="1234" height="698" alt="OSS/BSS Simulator — Optimize-läget" src="https://github.com/user-attachments/assets/1865f6af-2d15-43bb-a4ce-d279d76e0faf" />

## Vision

Systemdynamik — köer, flaskhalsar, WIP-effekter, transitionskostnader, lokala vs globala optimeringar — är kontraintuitiv och förstås bäst genom att *upplevas*. FlowLab låter användaren köra en organisation i miniatyr och upptäcka, genom experiment, varför leverans i stora system blir långsam. Samma pedagogiska tes bär alla labben: **gissa → kör → observera → reflektera → inse.**

Full vision och capability map: [`docs/product-vision-and-capability-map.md`](docs/product-vision-and-capability-map.md).

## De tre labben

```
FlowLab
├── OSS/BSS Simulator        — telecom: order → aktiverad tjänst
├── Enterprise Delivery Lab  — enterprise IT-leverans: ett initiativ + ett system
└── Transformation Lab       — organisationsförändring mot gemensamt arbetssätt
```

Var de bor: **OSS/BSS Simulator** = `index.html`. **Enterprise Delivery Lab** och **Transformation Lab** (plus systemexperimentet och Scenario Lab) delar sidan `enterprise-lab.html`. Samma mekanik, olika domäner och innehåll — byggda som separata instanser, inte generaliserad plattform (se *Designprinciper*).

## Designprinciper

- **Lär genom att göra.** Kör → bryt → reparera. Text finns som fördjupning, aldrig som huvudkanal.
- **En slice = en idé.** En smal men komplett övning slår en bred halvfärdig funktion.
- **Inga ramverk, inga build-tools, inga beroenden.** Allt är plain HTML/CSS/JS och öppnas direkt från disk.
- **Copy, don't abstract.** Nya domäner byggs som egna instanser; en gemensam plattform extraheras först när flera domäner bevisat samma behov.
- **Visa, förklara inte.** Poängen ska framgå av att man kör, inte av en textvägg.
- **Generiska, publika modeller.** Inga verkliga organisationer eller interna processer — bara arketyper. Medvetet förenklat för att vara begripligt på minuter.

## Vad som finns idag

**OSS/BSS Simulator** (`index.html`) — tre lägen (Learn / Optimize / Documentation): guidad teoriresa, systemkarta, enskild order genom flödet, parallell batch (5/20 orders) med köer, flaskhalsar, kapacitet, automation, backpressure, throughput-graf och run-jämförelse. Begreppssök och operational impact.

**Enterprise Delivery Lab** (`enterprise-lab.html`):
- Learning journey över de tio leveransstegen (collapsible).
- Ett initiativ genom flödet med blockers (*security review delay*, *architecture rework*) och kontrollen *tidig alignment* — plus operational impact.
- **Prediction & reflektion:** gissa utfallet, kör, jämför mot en spegel med reflektionsfrågor.
- **Statuskarta** och datadrivna **lärkort** (Begrepp / Mönster / Varför?).
- **Systemexperiment:** tre samtidiga initiativ, en begränsad resurs, kö och tidsserie-graf.

**Transformation Lab** (i `enterprise-lab.html`) — tre enheter som inför ett gemensamt arbetssätt; standardisering som avvägning (variation ↓, förutsägbarhet ↑, transitionskostnad i ledtid), uppspelad månad för månad med milstolpar.

**Scenario Lab** (i `enterprise-lab.html`) — en storytelling-övning: läs en rörig situation, välj ett agerande, se den organisatoriska konsekvensen och en reflektion.

## Roadmap

Riktning, inte datum:

- Fler scenarier i Scenario Lab och koppling till reflektions-loopen.
- **Consultant Lens** i produkten — diagnos-frågor för första veckan på ett uppdrag (finns idag i [`docs/transformation-lab.md`](docs/transformation-lab.md)).
- Ett samlat **FlowLab-hem** som binder ihop de tre labben och föreslår en startpunkt.
- Tydligare navigation i Enterprise Delivery Lab och synligare transitionskostnad i Transformation Lab (se design-reviewen).
- Fler domäner — när mönstren bär (copy, don't abstract).

## Köra lokalt

Inga deps, ingen build. Öppna filerna direkt:

```bash
open index.html            # OSS/BSS Simulator
open enterprise-lab.html   # Enterprise Delivery Lab + Transformation Lab + Scenario Lab
```

## Dokumentation

- **Teori & pedagogik:** [telecom-domänen](docs/telecom-theory.md) · [flow och systems thinking](docs/flow-systems-thinking.md) · [pedagogisk filosofi](docs/learning-philosophy.md)
- **Produkt & vision:** [product vision & capability map](docs/product-vision-and-capability-map.md) (North Star) · [plattformsvision](VISION.md) · [hypotes](HYPOTHESIS.md)
- **Domändesign (koncept):** [Enterprise Delivery Lab](docs/enterprise-delivery-lab-design.md) · [Enterprise Delivery System 2.0](docs/enterprise-delivery-system-2.md) · [Transformation Lab](docs/transformation-lab.md)
- **Realism & förenklingar:** [REALISM_NOTES.md](REALISM_NOTES.md)

## Tillgänglighet och begränsningar

Verktyget siktar på god läsbarhet och tangentbordsnavigation (kontrast, `:focus-visible`, skip-links, aria-labels), men är inte fullt WCAG-certifierat. Modellerna är **lärkonstruktioner, inte arkitekturreferenser** — durations, procent och utfall är pedagogiskt kalibrerade, inte empiriska. `flow-lab.html` är en tidig fristående inkubator som behållits för referens.

## For developers

Kodstruktur, laddordning och hur du lägger till nya pedagogiska slices: [`DEVELOPMENT.md`](DEVELOPMENT.md). Modellantaganden och realism-bedömningar: [`REALISM_NOTES.md`](REALISM_NOTES.md).
