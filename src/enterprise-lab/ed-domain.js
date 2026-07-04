// --- Enterprise Delivery Lab: domändata --------------------------------------
// ALL domänspecifik data för Enterprise Delivery Lab bor i den här filen.
// Motorn (ed-engine.js) känner bara till mekanik — steg, väntan, omtag — aldrig
// vad stegen heter eller varför de är pedagogiskt viktiga.
// Se docs/enterprise-delivery-lab-design.md för designbeslut.
//
// GUARDRAILS — läs innan du redigerar content:
//   • Ingen organisationsspecifik branding. Inga verkliga interna processer.
//   • Inga militära system, inga produkt- eller flygplansspecifika detaljer.
//   • Aktörer och steg är generiska arketyper för enterprise IT-leverans.
//   • Håll allt publikt, generiskt och ofarligt.

(function EdLabDomainModule() {
  "use strict";

  // Tidsskala: 1 ms simtid ≈ 0,01 arbetsdag → 100 ms ≈ 1 dag.
  // En happy path på ~12 s realtid motsvarar ~122 dagars leveranstid —
  // medvetet realistisk enterprise-skala (månader, inte minuter).
  const DAYS_PER_MS = 0.01;

  const INITIATIVE = {
    id: "eng-doc-platform",
    name: "Modernize Engineering Document Platform",
    desc: "Ett generiskt exempel-initiativ: ersätt en åldrande intern " +
      "dokumentplattform för engineering-underlag med en modern lösning. " +
      "Berör många intressenter — verksamhet, arkitektur, säkerhet, drift — " +
      "vilket är precis vad som gör enterprise delivery långsam."
  };

  // De tio delivery-stegen. durationMs är baseline-arbetstid i simtid.
  // note.what = vad steget representerar, note.why = varför det spelar roll.
  const STAGES = [
    {
      id: "need",
      name: "Business Need",
      actor: "Business Owner",
      durationMs: 900,
      note: {
        what: "Verksamheten formulerar ett behov: vad som inte fungerar idag och vilken förmåga man vill ha.",
        why: "Otydliga behov är roten till sena ändringar. Ju vagare behovet är här, desto mer rework längre fram."
      }
    },
    {
      id: "intake",
      name: "Intake / Prioritization",
      actor: "Project Management",
      durationMs: 1100,
      note: {
        what: "Behovet tas emot, värderas mot andra initiativ och prioriteras in i portföljen.",
        why: "Allt kan inte göras samtidigt. Utan prioritering blir allt 'viktigast' — och inget blir klart."
      }
    },
    {
      id: "arch",
      name: "Architecture Review",
      actor: "Enterprise Architecture",
      durationMs: 1300,
      note: {
        what: "Enterprise Architecture granskar att lösningen passar in i målarkitekturen: integrationer, dataflöden, livscykel.",
        why: "En lösning som avviker från målarkitekturen skapar teknisk skuld i åratal. Tidig alignment är billig — sen är dyr."
      }
    },
    {
      id: "seccomp",
      name: "Security & Compliance Review",
      actor: "Security + Compliance",
      durationMs: 1400,
      note: {
        what: "Säkerhets- och regelefterlevnadsgranskning: risker, behörigheter, datakrav, lagkrav.",
        why: "I stora industribolag är detta ofta ett obligatoriskt grindsteg med begränsad kapacitet — en klassisk köpunkt."
      }
    },
    {
      id: "planning",
      name: "Delivery Planning",
      actor: "Project Management",
      durationMs: 1200,
      note: {
        what: "Leveransen planeras: resurser, beroenden till andra team och leverantörer, sekvensering.",
        why: "Beroenden som upptäcks här är hanterbara. Beroenden som upptäcks under implementation blir väntan."
      }
    },
    {
      id: "impl",
      name: "Implementation",
      actor: "IT Delivery Team + Vendor",
      durationMs: 2200,
      note: {
        what: "Lösningen byggs — internt team och/eller leverantör konfigurerar, utvecklar och integrerar.",
        why: "Ofta det steg alla stirrar på när leveransen är sen. Men i enterprise delivery är väntan runt steget ofta större än arbetet i det."
      }
    },
    {
      id: "test",
      name: "Integration & Test",
      actor: "IT Delivery Team + Infrastructure / Platform",
      durationMs: 1600,
      note: {
        what: "Lösningen integreras mot omgivande system och verifieras i testmiljö.",
        why: "Testmiljöer är delade, begränsade resurser. 'Klart att testa' och 'testat' kan skiljas åt av veckor i kö."
      }
    },
    {
      id: "deploy",
      name: "Deployment / Release",
      actor: "Change Advisory / Release",
      durationMs: 1000,
      note: {
        what: "Driftsättning godkänns och genomförs — ofta via en change advisory-process med releasefönster.",
        why: "Releasefönster och godkännandegrindar skyddar produktionen, men varje grind är också en kö. Balansgången är medveten."
      }
    },
    {
      id: "handover",
      name: "Operational Handover",
      actor: "Operations",
      durationMs: 900,
      note: {
        what: "Drift tar över: övervakning, support, incidentrutiner, dokumentation.",
        why: "'Driftsatt' utan överlämning är en tickande incident. Utan detta steg äger ingen problemen när de kommer."
      }
    },
    {
      id: "realized",
      name: "Capability Realized",
      actor: "Business Owner",
      durationMs: 600,
      note: {
        what: "Förmågan används i verksamheten och nyttan börjar realiseras.",
        why: "Först här har initiativet levererat värde. Allt innan är kostnad — det är därför lead time hit är det viktigaste måttet."
      }
    }
  ];

  // Blocker-scenarier. Mekaniskt är en blocker antingen en väntan (waitMs på
  // ett steg) eller ett omtag (reworkStages spelas om). Nyansen — varför det
  // händer och vad det lär ut — bor i texterna, inte i motorn.
  const BLOCKERS = {
    sec_delay: {
      id: "sec_delay",
      label: "Security review delay",
      triggerStage: "seccomp",
      waitMs: 2500,
      eventTitle: "BLOCKER: Security review delay",
      eventDetail: "Initiativet är redo för granskning, men Security har en lång kö " +
        "av väntande reviews. Inget arbete pågår — initiativet står bara still.",
      teach: "Arbetet är klart men står still. Kön, inte arbetet, är flaskhalsen — " +
        "att jobba snabbare i andra steg hjälper inte."
    },
    arch_rework: {
      id: "arch_rework",
      label: "Architecture rework required",
      triggerStage: "impl",
      reworkStages: ["arch", "seccomp", "planning", "impl"],
      eventTitle: "BLOCKER: Architecture rework required",
      eventDetail: "Under implementation upptäcks att lösningen avviker från " +
        "målarkitekturen. Initiativet skickas tillbaka till Architecture Review — " +
        "och eftersom arkitekturen ändras måste även säkerhetsgranskning och " +
        "planering göras om.",
      teach: "Sen arkitektur-alignment tvingar omtag av redan gjort arbete — och " +
        "omtag kaskaderar: en ändrad arkitektur river upp godkännanden nedströms. " +
        "Tidig alignment hade varit mycket billigare."
    }
  };

  // Operational impact: översätter en körnings summering till konsekvenser.
  // summary = { baselineDays, actualDays, reworkStageCount, reworkDays, waitDays }
  function deriveImpact(summary) {
    const delayDays = Math.round(summary.actualDays - summary.baselineDays);

    const confidence = delayDays <= 0
      ? { level: "Stabil", tone: "ok",
          detail: "Levererat enligt plan. Intressenternas förtroende är intakt." }
      : delayDays <= 30
        ? { level: "Förhöjd risk", tone: "warn",
            detail: "Leveransen glider. Intressenter börjar fråga varför — varje " +
              "statusmöte utan nytt datum kostar förtroende." }
        : { level: "Hög risk", tone: "danger",
            detail: "Kraftig försening. Beställaren omvärderar initiativet, och " +
              "nästa initiativ möts av hårdare grindar — vilket gör <em>allt</em> långsammare." };

    return [
      {
        id: "delay",
        label: "Delayed delivery",
        value: delayDays > 0 ? `+${delayDays} dagar` : "Enligt plan",
        tone: delayDays > 0 ? (delayDays > 30 ? "danger" : "warn") : "ok",
        detail: delayDays > 0
          ? `Leveransen tog ${Math.round(summary.actualDays)} dagar mot planerade ` +
            `${Math.round(summary.baselineDays)}. Verksamheten väntar på förmågan under tiden.`
          : `Leveransen tog ${Math.round(summary.actualDays)} dagar, som planerat.`
      },
      {
        id: "rework",
        label: "Rework created",
        value: summary.reworkStageCount > 0
          ? `${summary.reworkStageCount} steg (${Math.round(summary.reworkDays)} dagar)`
          : "Inget",
        tone: summary.reworkStageCount > 0 ? "danger" : "ok",
        detail: summary.reworkStageCount > 0
          ? "Redan utfört arbete fick göras om. Rework är ren waste — det ger " +
            "ingen ny nytta, bara samma resultat senare."
          : "Inget arbete behövde göras om."
      },
      {
        id: "confidence",
        label: "Stakeholder confidence risk",
        value: confidence.level,
        tone: confidence.tone,
        detail: confidence.detail
      }
    ];
  }

  // --- Exponera API -----------------------------------------------------------

  window.EdLabDomain = { INITIATIVE, STAGES, BLOCKERS, DAYS_PER_MS, deriveImpact };
})();
