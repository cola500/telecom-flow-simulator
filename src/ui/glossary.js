// --- Glossary popovers ------------------------------------------------------
// Korta kontextuella förklaringar nära begreppen där de dyker upp i UI:t.
// Kompletterar (ersätter inte) learning cards och Documentation-vyn.
//
// Användning: lägg en knapp `<button class="info-icon" data-info="key" ...>`
// nära begreppet. wireInfoIcons() event-delegerar klick till en singleton
// popover som flyttas runt, så bara EN popover kan vara öppen i taget.

const GLOSSARY = {
  // --- BSS/OSS layers
  bss: {
    title: "BSS — Business Support Systems",
    body: "Den kommersiella sidan av en telekomoperatörs IT-stack. Hanterar kund, order, produkt och fakturering.",
    why: "BSS bestämmer vad som säljs och hur betalning fungerar — bryggan mellan kunden och nätet."
  },
  oss: {
    title: "OSS — Operational Support Systems",
    body: "Den tekniska sidan som faktiskt levererar tjänsten i nätet — inventory, provisioning, aktivering, övervakning.",
    why: "OSS svarar på 'kan vi leverera detta?' och 'fungerar det i drift?' — det som gör att kunden får sin tjänst."
  },

  // --- System-domäner
  crm: {
    title: "CRM / Customer",
    body: "Den kommersiella kundvyn — vem kunden är, kontrakt, kontaktpunkter och säljinteraktioner.",
    why: "Utan en sann kundvy kan order, fakturering och support inte kopplas till rätt person eller företag."
  },
  om: {
    title: "Order Management",
    body: "Tar emot ordern, validerar och dekomponerar den till tekniska steg, och driver ordern hela vägen tills tjänsten är aktiv.",
    why: "Order Management är 'taktpinnen' i order-to-activate — där kommersiell intent översätts till teknisk handling."
  },
  billing: {
    title: "Billing Trigger",
    body: "Skickar trigger till charging-systemet när tjänsten är verifierad. Triggar fakturering — producerar inte själva fakturan.",
    why: "Triggar man för tidigt fakturerar man icke-levererade tjänster. För sent → revenue leakage."
  },
  si: {
    title: "Service Inventory",
    body: "Den logiska tjänstevyn — vilka tjänster finns, är de planerade eller aktiva, vilka kunder har dem.",
    why: "Källan för feasibility ('kan vi leverera detta?') och kopplingen mellan kund, tjänst och resurser."
  },
  ri: {
    title: "Resource Inventory",
    body: "Fysiska och logiska resurser — fiberportar, IP-adresser, fiberpar, slots, licenser, MSISDN-pooler.",
    why: "Provisioning kräver att rätt resurser är reserverade. 'Inventory drift' (data ur synk med nätet) är en av de vanligaste orsakerna till manuella fall-out-ärenden."
  },
  prov: {
    title: "Provisioning / Activation",
    body: "Här konfigureras tjänsten i nätet och verifieras end-to-end. Provisioning = config push; activation = bekräftad funktion.",
    why: "Det är här tjänsten faktiskt 'tänds'. Misslyckas detta — eller verifieras det inte — får kunden inte sin tjänst."
  },
  assur: {
    title: "Assurance / Incident",
    body: "Övervakar tjänster efter aktivering, korrelerar larm, skapar incidenter, eskalerar.",
    why: "En tjänst kan vara aktiverad men inte fungera. Assurance fångar driftstörningar och kopplar dem till kundupplevelse."
  },

  // --- Order-decomposition begrepp
  customer_order: {
    title: "Customer Order",
    body: "Det kunden faktiskt köper i kommersiella termer (t.ex. 'Fiber 500 Mbps'). Lever på BSS-sidan.",
    why: "Customer order är affärs-intentionen — den måste översättas till tekniska arbetsobjekt innan något kan hända i nätet."
  },
  service_order: {
    title: "Service Order",
    body: "Den tjänst som ska skapas i nätet (t.ex. 'Broadband Access service'). Kundagnostisk mall som parametriseras per kund.",
    why: "Skiljer 'vad kunden får' från 'vilken tjänst som finns i nätet' — gör det möjligt att återanvända samma tekniska implementation över flera kunder."
  },
  resource_order: {
    title: "Resource Order",
    body: "Beställningen av de fysiska eller logiska resurser tjänsten kräver — port, IP, VLAN, CPE, MSISDN, IMSI.",
    why: "Här uppstår en stor del av flödets fall-out. Inventory drift, race conditions och 'orphaned' reservationer är vanliga problem."
  },

  // --- Mobile-specifika
  msisdn: {
    title: "MSISDN",
    body: "Det publika telefonnumret (Mobile Station International Subscriber Directory Number). Följer ITU-standarden E.164.",
    why: "MSISDN är portabelt mellan operatörer och regulatorbegränsat — det är inte en oändlig pool."
  },
  imsi: {
    title: "IMSI",
    body: "Abonnentens *interna* identitet i mobilnätet — det operatören använder för att identifiera vem du är när din telefon registrerar sig.",
    why: "MSISDN är publikt, IMSI är internt. Aktivering kräver att SIM/eSIM-profilens IMSI matchas mot HSS/UDM."
  },
  sim_esim: {
    title: "SIM / eSIM",
    body: "SIM-kortet (eller eSIM-profilen) lagrar IMSI och autentiseringsnycklar. eSIM pushas via en RSP istället för att skickas fysiskt.",
    why: "eSIM ger snabbare aktivering och stöd för flera profiler i samma enhet — men introducerar en extern part (RSP) i flödet."
  },
  cpe_router: {
    title: "CPE / router",
    body: "Customer Premises Equipment — hårdvaran hos kunden (router, gateway, modem) som kopplar dem till operatörens nät.",
    why: "CPE är ofta en separat fail-mode från access-konfig. Kan accepteras som installerad utan att tjänsten fungerar end-to-end."
  },

  // --- Optimize-mode begrepp
  bottleneck: {
    title: "Bottleneck",
    body: "Det steg som begränsar hela flödets genomströmning. Känns igen genom hög genomsnittlig duration eller en kö framför sig.",
    why: "Förbättringar utanför bottlenecken ger ingen total throughput-vinst. Theory of Constraints säger: identifiera, exploatera, höj kapacitet."
  },
  handoff: {
    title: "Handoff",
    body: "När arbete byter ägare — mellan system, team eller roller. Kostar tid genom kö, översättning, informationsförlust och kontextväxling.",
    why: "I telekom är handoff-tiden ofta större än själva arbetstiden. Att ta bort handoffs ger ofta mer effekt än att snabba upp varje steg."
  },
  queue: {
    title: "Queue",
    body: "Ordrar som väntar på ett begränsat system. När arbete kommer in fortare än det processas bildas en kö.",
    why: "Kötid skalar inte linjärt med belastning — den exploderar nära 100 % utilization. Det är därför kapacitetsplanering är så viktigt."
  },
  backpressure: {
    title: "Backpressure",
    body: "När Order Management slutar acceptera nya ordrar för att bottlenecken är full — istället för att låta köerna växa till kollaps.",
    why: "Hellre långsam respons uppströms än cascading failures nedströms. Klassisk lösning på överbelastning."
  },
  throughput: {
    title: "System throughput",
    body: "Hur många ordrar systemet klarar av per tidsenhet (mätt i sim-sekunder). Begränsas av bottleneckens kapacitet.",
    why: "Throughput och lead time är inte samma sak. Du kan ha hög throughput och hög lead time samtidigt — köfabriken."
  },
  lead_time: {
    title: "Lead time (per order)",
    body: "Total tid från det kunden lägger order tills tjänsten är aktiv och fakturering startar. Värdeskapande tid + väntetid. I batch-vyn visas *Average lead time* — genomsnittet över alla orders.",
    why: "Tumregel i tjänsteflöden: väntetiden är 5–10× längre än värdeskapande tid. Att halvera väntan ger mycket större effekt än att halvera arbete."
  },
  flow_efficiency: {
    title: "Flow efficiency",
    body: "Hur stor andel av en orders totala tid som faktiskt är värdeskapande arbete (inte väntan).",
    why: "Resource efficiency mäter hur upptagen en resurs är. Flow efficiency mäter kundens upplevelse. De står i konflikt vid hög load."
  },

  // --- Optimize-mode kontroller
  ri_capacity: {
    title: "Resource Reservation capacity",
    body: "Hur många reservationer som kan göras parallellt i Resource Inventory (1–3 'workers').",
    why: "Att höja kapaciteten flyttar bottlenecken. Representerar parallell teknisk kapacitet — inte personer."
  },
  prov_capacity: {
    title: "Provisioning / Activation capacity",
    body: "Hur många activation-jobb som kan köras parallellt (1–3 'workers'). Representerar adapterinstanser, parallel orchestration eller bättre köhantering.",
    why: "*Capacity* påverkar parallellism — *automation* påverkar duration och felrisk. Två oberoende förbättringar."
  },
  automation_reservation: {
    title: "Automatisera resource reservation",
    body: "När på: reservation-steg halveras (× 0.5). Simulerar att gå från manuell tilldelning till API-baserad reservation.",
    why: "Lead time minskar och bottlenecken kan flytta nedströms — visar Theory of Constraints i praktiken."
  },
  automation_provisioning: {
    title: "Automated provisioning / activation",
    body: "När på: provisioning × 0.6, activation och verification × 0.7, fail-prob × 0.5. Verifieringen finns kvar.",
    why: "Automation tar inte bort inventory mismatch eller nätfel — den minskar variation och felrisk per order, men eliminerar inte fel."
  },
  variability: {
    title: "Variation i betjäningstid",
    body: "Slumpar varje stegs duration kring sitt medelvärde (0 % / ±25 % / ±50 %). Genomsnittet är samma — bara spridningen ändras.",
    why: "Köteorin: variation är minst lika viktig drivare av kötid som utilization. *Variation is the enemy of flow.*"
  },

  // --- Panel-level metrics-perspektiv
  system_metrics: {
    title: "System metrics (batch run)",
    body: "These metrics describe the system during the whole simulation run, not a single order. Average lead time, queue depth och throughput aggregeras över alla orders i batchen.",
    why: "I produktion kör operatörens flöden tusentals orders parallellt. För att förstå om systemet håller — eller om det skapar köer och incidents — behöver man system-vy, inte bara enskild-order-vy."
  },
  order_metrics: {
    title: "Order metrics",
    body: "These metrics describe a single order's journey through the flow — total lead time, time spent in handoffs, slowest step. Visas efter att du klickar 1 order eller ett fail-scenario.",
    why: "Order-nivå är bra för att förstå *var* tiden går för en enskild kund. System-nivå (batch) är bra för att förstå hur flödet skalas."
  },

  // --- Dashboard / Metrics
  active: {
    title: "Active orders",
    body: "Ordrar som just nu processas (in_progress eller in_transit mellan steg).",
    why: "Tillsammans med kö-värdet visar det systemets aktuella belastning."
  },
  queued: {
    title: "Queue depth",
    body: "Antal ordrar som väntar på ett begränsat system (typiskt Resource Inventory eller Provisioning).",
    why: "Växande kö är första tecknet på att bottlenecken inte hinner med flödet."
  },
  completed: {
    title: "Completed orders",
    body: "Ordrar som har gått hela vägen till BillingStartRequested (verifierad aktivering + billing-trigger).",
    why: "Bara verifierade orders räknas som klara — samma disciplin som riktiga operatörer behöver tillämpa."
  },
  incidents: {
    title: "Batch incidents",
    body: "Antal failures under batchen — typiskt ActivationRejected från överbelastad Provisioning.",
    why: "Incidents är inte slumpmässiga: fail-sannolikheten ökar när Provisionings kö växer. Hög load → mer fall-out → fler retries → ännu högre load."
  },

  // --- Metrics-specifika
  bottleneck_metric: {
    title: "Slowest step (this run)",
    body: "Det enskilda steg som tog längst tid i den senaste körningen.",
    why: "Det säger vart processoptimeringen bör fokusera först. Kan flytta mellan körningar — därför 'this run', inte 'permanent bottleneck'."
  },
  handoff_time: {
    title: "Tid i handoffs",
    body: "Total tid där ordern vandrar mellan domäner (CRM → Service Inventory → Resource Inventory → Provisioning → Billing).",
    why: "I verkligheten är handoff-tiden ofta större än arbetstiden. Att eliminera handoffs (eller automatisera dem) ger ofta största förbättring."
  },
  failed_events: {
    title: "Failed events",
    body: "Events som stoppade flödet — typiskt ResourceUnavailable eller ActivationRejected.",
    why: "Tiden som spenderades fram till felet är 'lost work' om ordern måste startas om. Fall-out rate är ett centralt KPI."
  }
};

// Singleton popover-element flyttas runt — bara EN öppen åt gången.
let _popoverEl = null;
let _activeBtn = null;

function _ensurePopoverEl() {
  if (_popoverEl) return _popoverEl;
  _popoverEl = document.createElement("div");
  _popoverEl.className = "info-popover";
  _popoverEl.setAttribute("role", "tooltip");
  _popoverEl.style.display = "none";
  document.body.appendChild(_popoverEl);
  return _popoverEl;
}

function _showPopover(btn, key) {
  const def = GLOSSARY[key];
  if (!def) return;
  const el = _ensurePopoverEl();
  el.innerHTML = `
    <h5 class="info-popover-title">${def.title}</h5>
    <p class="info-popover-body">${def.body}</p>
    ${def.why ? `<p class="info-popover-why"><strong>Why it matters:</strong> ${def.why}</p>` : ""}
  `;
  el.style.display = "block";
  // Positionera nära knappen, klipp mot viewport
  const rect = btn.getBoundingClientRect();
  const popW = 300;
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 6;
  if (left + popW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - popW - 8);
  el.style.left = left + "px";
  el.style.top = top + "px";
  if (_activeBtn) _activeBtn.setAttribute("aria-expanded", "false");
  _activeBtn = btn;
  btn.setAttribute("aria-expanded", "true");
}

function _hidePopover() {
  if (_popoverEl) _popoverEl.style.display = "none";
  if (_activeBtn) _activeBtn.setAttribute("aria-expanded", "false");
  _activeBtn = null;
}

// Event-delegering: klick på info-ikon togglar popover. Klick utanför eller
// ESC stänger. Bara en handler för hela appen — funkar även för dynamiskt
// renderade ikoner (t.ex. systemkartans cards via renderSystems).
function wireInfoIcons() {
  document.body.addEventListener("click", e => {
    const btn = e.target.closest(".info-icon");
    if (btn) {
      e.stopPropagation();
      const key = btn.dataset.info;
      if (_activeBtn === btn) _hidePopover();
      else _showPopover(btn, key);
      return;
    }
    // Klick utanför popover-icon och utanför popover → stäng
    if (_activeBtn && !(_popoverEl && _popoverEl.contains(e.target))) {
      _hidePopover();
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && _activeBtn) _hidePopover();
  });
}

// Helper för platser som genererar HTML från JS (t.ex. renderSystems).
function infoIconHTML(key, label) {
  const aria = label || (GLOSSARY[key]?.title || key);
  return `<button type="button" class="info-icon" data-info="${key}" aria-label="Förklara ${aria}" aria-expanded="false">i</button>`;
}
