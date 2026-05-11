// --- Reflection questions ---------------------------------------------------
// Korta reflektionsfrågor som visas i en egen panel efter en körning.
// Frågorna är inte ett quiz med rätt/fel — det är pedagogiska prompts som
// hjälper användaren formulera vad hen just såg. "Visa hint" expanderar ett
// kort svar/förklaring kopplat till simulatorns metrics och koncept.
//
// State-driven: senaste scenario (empty / happy / resource_fail / prov_fail /
// batch) styr vilka frågor som visas. Engine/metrics uppdaterar via
// updateReflectionFor(scenarioId).

let lastReflectionScenario = "empty";

const REFLECTION_QUESTIONS = {
  empty: [
    {
      q: "Vad tror du tar mest tid i ett verkligt order-to-activate-flöde?",
      a: "I de flesta operatörer är det inte själva nät-konfigurationen. Det är *väntan mellan handoffs*, manuella godkännanden, batchjobb som körs en gång per dygn, och fält-installation. Resource efficiency skapar inte automatiskt flow efficiency."
    },
    {
      q: "Vilka tre saker brukar driva bottlenecks i telekomflöden?",
      a: "Capacity-begränsade resurser (workers, fiber-portar), manuella godkännanden (kreditkontroll, dispatch), och *variation* i hur lång tid ett steg tar. Kombinationen gör att även måttlig load kan ge stora kötider."
    }
  ],
  happy: [
    {
      q: "Vilket steg tog längst tid i din körning?",
      a: "Kolla *Slowest step* i Ordermått-panelen. I happy path är det typiskt resource reservation eller provisioning — eftersom de är de mest komplexa stegen. Det är där förbättringsarbete brukar ge mest effekt."
    },
    {
      q: "Varför kommer billing-eventet sist?",
      a: "Billing ska trigga på *verifierad leverans*, inte på orderstatus. Om billing triggades direkt vid order-acceptans skulle kunder få faktura för tjänster som inte fungerar — en av branschens dyraste fel-modi."
    },
    {
      q: "Hur många handoffs ser du i timeline?",
      a: "Streckmönstrade staplar = handoffs mellan system. Varje handoff kostar tid via kö, översättning, informationsförlust och kontextväxling. Tumregel: i mogna flöden är *handoff-tiden större än arbetstiden*."
    }
  ],
  resource_fail: [
    {
      q: "Vad innebär ResourceUnavailable operativt?",
      a: "Inventory drift: data säger att en resurs (port, IP, SIM) är ledig fast den i verkligheten används. Det genererar en manuell undersökning + inventory reconciliation — två operativa konsekvenser som du ser i Operativ påverkan-panelen."
    },
    {
      q: "Varför är inventory drift så vanligt i telekomdrift?",
      a: "Nätet förändras genom utbyggnad, byten och fel medan inventory uppdateras genom processer som kan halka efter. Lösningar: discovery/audit-jobb som löpande stämmer av inventory mot nätet, och tydligt data ownership per domän."
    }
  ],
  prov_fail: [
    {
      q: "Vad är skillnaden mellan ActivationRejected och partial activation?",
      a: "ActivationRejected = nätet säger nej, flödet stoppar. *Partial activation* = nätet säger ja delvis men tjänsten fungerar inte, och systemen tror den är OK. Den senare är farligare — kunden upptäcker felet, inte vi."
    },
    {
      q: "Vad i simulatorn minskar risken för partial activation?",
      a: "Det separata <code>ServiceVerified</code>-steget i happy path. Det är post-activation-testet — en mogen plattform fångar fel där innan billing triggas. Utan det skulle billing trigga på orderstatus istället för på verifierad leverans."
    }
  ],
  batch: [
    {
      q: "Vilket system tror du var bottleneck under denna batch?",
      a: "Kolla *Mest kötid totalt* i insight-rutan. Med default capacity (RI=1, Prov=1) är det typiskt Resource Inventory. Höj RI-capacity till 2 eller 3 och kör om — bottlenecken brukar flytta till Provisioning. Det är Theory of Constraints i praktiken."
    },
    {
      q: "Vad tror du händer om provisioning capacity ökar?",
      a: "Genomströmningen ökar och kötiden i Provisioning sjunker. Men om en annan resurs (typiskt RI) fortfarande är begränsad blir den den nya bottlenecken. Bottlenecks försvinner inte — de *flyttar*."
    },
    {
      q: "Varför skapar fail-prob × kö-längd kaskadeffekter?",
      a: "När Provisioning-kön växer ökar sannolikheten för fel. En fail kan generera en retry — som lägger till en order i samma kö. Mer last → mer fel → mer retry → mer last. *Cascading failure* är ett etablerat mönster, inte slumpmässig otur."
    }
  ]
};

function escapeReflHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Lättviktig inline-formatering: *italic* och behåll <code>-tags som redan
// finns i textstring (en av frågorna refererar till ServiceVerified). Övriga
// HTML är escapad.
function formatReflectionText(s) {
  // Skydda <code>...</code> innan escape så koden inte escapas
  const codes = [];
  s = s.replace(/<code>([^<]+)<\/code>/g, (_, c) => {
    codes.push(`<code>${escapeReflHtml(c)}</code>`);
    return `\x00C${codes.length - 1}\x00`;
  });
  let html = escapeReflHtml(s).replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\x00C(\d+)\x00/g, (_, i) => codes[+i]);
  return html;
}

function renderReflection() {
  const list = document.getElementById("reflection-list");
  if (!list) return;
  const scenario = lastReflectionScenario in REFLECTION_QUESTIONS ? lastReflectionScenario : "empty";
  const questions = REFLECTION_QUESTIONS[scenario];

  list.innerHTML = questions.map((qa, i) => `
    <div class="reflection-card">
      <div class="reflection-q">${formatReflectionText(qa.q)}</div>
      <button type="button" class="reflection-toggle" data-idx="${i}" aria-expanded="false">Visa hint</button>
      <div class="reflection-a hidden">${formatReflectionText(qa.a)}</div>
    </div>
  `).join("");

  list.querySelectorAll(".reflection-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".reflection-card");
      const ans = card.querySelector(".reflection-a");
      const willShow = ans.classList.contains("hidden");
      ans.classList.toggle("hidden", !willShow);
      btn.setAttribute("aria-expanded", willShow ? "true" : "false");
      btn.textContent = willShow ? "Dölj hint" : "Visa hint";
    });
  });
}

// Anropas från engine/metrics när en körning slutförts. scenarioId är
// "happy" / "resource" / "prov" för single-order, "batch" för parallel run.
function updateReflectionFor(scenarioId) {
  const map = {
    happy: "happy",
    resource: "resource_fail",
    prov: "prov_fail",
    batch: "batch"
  };
  lastReflectionScenario = map[scenarioId] || "empty";
  renderReflection();
}
