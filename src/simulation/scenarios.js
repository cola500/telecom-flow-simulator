// --- Domain data -------------------------------------------------------------
const SYSTEMS = {
  crm: {
    layer: "bss",
    name: "CRM / Customer",
    role: "Vem är kunden?",
    what: "Håller kundinformation, kontrakt, kontaktytor och säljinteraktioner.",
    why: "Utan en sann kundvy kan order, fakturering och support inte kopplas till rätt person eller företag.",
    problems: "Dubbletter i kunddatabasen, manuell kunduppdatering, sales-order-data tappar bort sig på vägen till order management. Strategy & Enablement-frågor: Hur unik är vår kund-id-modell mellan B2B/B2C? Hur sköts master data?"
  },
  om: {
    layer: "bss",
    name: "Order Management",
    role: "Tar emot och driver ordern",
    what: "Validerar, dekomponerar och styr ordern genom hela livscykeln tills tjänsten är aktiv.",
    why: "Översätter en kommersiell beställning till tekniska steg som OSS-domänerna kan utföra. Är 'taktpinnen' i order-to-activate.",
    problems: "Manuella handpåläggningar, otydlig dekomponering till tekniska delordrar, brist på end-to-end status. Strategy & Enablement-frågor: Hur hög är truly-touchless-andelen? Var fastnar ordrar mest?"
  },
  billing: {
    layer: "bss",
    name: "Billing Trigger",
    role: "Startar fakturaklocka",
    what: "Tar emot signal när tjänsten faktiskt aktiverats och initierar fakturering/charging.",
    why: "Om triggern kommer för sent eller fel tappas intäkt; kommer den för tidigt fakturerar vi för icke-levererat.",
    problems: "Drift mellan teknisk aktivering och billing-event, saknade trigger-event vid fel-handling. Strategy & Enablement-frågor: Hur lång är ledtiden mellan ServiceActivated och första debitering?"
  },
  si: {
    layer: "oss",
    name: "Service Inventory",
    role: "Vad har kunden?",
    what: "Speglar tjänster som är beställda, planerade eller aktiva — den logiska tjänstenivån.",
    why: "Behövs för feasibility-check, ändringar, felhantering och för att förstå vad fakturering ska gälla.",
    problems: "Service inventory är ur synk med verkligheten ('inventory drift'). Strategy & Enablement-frågor: Hur ofta avstäms inventory mot nätet? Vem äger kvaliteten?"
  },
  ri: {
    layer: "oss",
    name: "Resource Inventory",
    role: "Vilka resurser finns?",
    what: "Håller fysiska och logiska resurser: portar, IP-adresser, fiberpar, slots, licenser.",
    why: "Order management måste reservera rätt resurser innan provisioning kan starta. Är källan när vi gör feasibility.",
    problems: "Stale data, dubbelreserverade portar, gap mellan inventory och faktiskt nät. Strategy & Enablement-frågor: Vad är vår inventory accuracy? Hur snabbt syns nya resurser efter rollout?"
  },
  prov: {
    layer: "oss",
    name: "Provisioning / Activation",
    role: "Konfigurerar nätet",
    what: "Översätter ordern till konkreta konfigurationskommandon mot nätelement (router, OLT, core, IMS).",
    why: "Det är här tjänsten faktiskt 'tänds'. Misslyckas detta är ordern inte värd något.",
    problems: "Felaktiga templates, rollback-svårigheter, leverantörsspecifika adapters. Strategy & Enablement-frågor: Hur många provisioning-mallar har vi och hur testas de? Är vi declarative (intent-based) eller imperativa?"
  },
  assur: {
    layer: "oss",
    name: "Assurance / Incident",
    role: "Övervakar och åtgärdar",
    what: "Övervakar tjänster post-aktivering, korrelerar larm, skapar incidenter, eskalerar.",
    why: "En tjänst kan vara aktiverad men inte fungera. Assurance verifierar leverans och fångar driftstörningar.",
    problems: "Larmstormar utan korrelation, oklart vilka larm som motsvarar kundupplevd störning. Strategy & Enablement-frågor: Hur många incidenter är 'self-detected' vs. anmälda av kund?"
  }
};

// --- Process patterns (learning mode) ---------------------------------------
const PATTERNS = {
  handoffs: {
    title: "Varför handoffs skapar friktion",
    body: "Varje gång arbete byter system eller team uppstår fyra kostnader: (1) väntetid — köer mellan team eller integrationer som kör batch, (2) översättning — data formateras om, fält mappas, ibland förloras något, (3) informationsförlust — kontext som fanns hos den som lämnade ordern når inte den som tar emot, (4) kontextväxling — den som tar emot måste sätta sig in i ordern. I telekom är det vanligt med 5–10 handoffs i ett enda order-to-activate-flöde. Tumregel: handoff-tiden är ofta större än själva arbetstiden. Process-optimering handlar lika mycket om att ta bort handoffs som att snabba upp arbetssteg."
  },
  inventory: {
    title: "Varför inventory blir source-of-truth-problem",
    body: "Inventory ska spegla verkligheten — men nätet förändras genom utbyggnad, byten och fel, medan inventory uppdateras genom processer som kan halka efter. Resultatet är 'inventory drift': feasibility säger 'ja' till en port som inte finns, eller order management reserverar en resurs som någon annan redan tagit. Symptom: höga 'jeopardy'-rates, manuella fall-out-ärenden, partial activations. Lösningar: discovery/audit-jobb som löpande stämmer av inventory mot nätet, tydligt data ownership per domän, och ett medvetet val mellan 'inventory drives nätet' (provisionering läser från inventory) och 'nätet drives inventory' (discovery skriver till inventory)."
  },
  downstream: {
    title: "Varför provisioningfel skapar downstream incidents",
    body: "När provisioning misslyckas och flödet inte rullas tillbaka rent uppstår 'partial activation': delar av konfigurationen finns i nätet, service inventory säger 'aktiv', billing kanske triggar — men kunden får inte tjänsten. Det här blir incidents nedströms: kunden ringer, supporten ser 'service active' i systemen, assurance ser inga element-larm (för elementen funkar var för sig), och felet kan ta dagar att lokalisera. Strategi för att minska detta: (a) intent-baserad provisioning med automatisk rollback, (b) post-activation verification — kontrollera att tjänsten faktiskt går genom, inte bara att configen accepterades, (c) korrelation mellan billing-event och bekräftad tjänstetillgång."
  },
  queueing: {
    title: "Queueing theory på 60 sekunder",
    body: "När arbete kommer in fortare än ett system hinner processa det bildas en kö. Det viktiga är: kötid skalar inte linjärt med belastning — den exploderar nära 100% utilization. Vid 70% utilization är genomsnittlig kötid ofta jämförbar med betjäningstiden; vid 90% är den 9× betjäningstiden; vid 99% är den ~99× — kön drar mot oändligheten. Det är därför man inte ska köra system 'maxat' om man bryr sig om lead time. Little's Law gör matematiken explicit: average queue length = arrival rate × average wait time. Tre sätt att minska kö: (1) öka kapaciteten (fler 'workers' i bottleneck), (2) minska variabilitet i ankomst eller arbetstid, (3) sänk utilization."
  },
  utilization: {
    title: "Varför hög utilization är farligt",
    body: "I IT-organisationer är det frestande att maxa system och team — 'effektivt utnyttjande av resurser'. Men det är resource efficiency, inte flow efficiency. Resource efficiency mäter hur upptagen en resurs är (server, team, system); flow efficiency mäter hur mycket av en orders totala tid som faktiskt är värdeskapande arbete (inte väntan). De två står i konflikt vid hög load: en resurs som är 95% utnyttjad har ingen luft för variation, så när en spike kommer hopas kön. Lean och kanban föredrar låg-medel utilization i bottleneck (60-80%) eftersom flow efficiency då blir hög. Telekomflöden där order-to-activate-tid mäts i timmar/dagar har ofta flow efficiency under 10% — resterande 90%+ är väntan."
  },
  flow_efficiency: {
    title: "Resource efficiency vs flow efficiency",
    body: "Resource efficiency frågar: 'hur upptagen är denna resurs?'. Flow efficiency frågar: 'hur mycket av kundens väntan är faktiskt arbete på kundens ärende?'. Exempel: kund beställer fiber. Aktivering tar 5 dagar. I de 5 dagarna har systemen aktivt arbetat med ordern i kanske 30 minuter — resten är kötid mellan handoffs, batchjobb som körs en gång per dygn, och godkännanden. Flow efficiency är alltså 30 min / 5 dagar ≈ 0.4%. Att jaga resource efficiency ('alla våra system kör på 95%!') gör inget för kundens upplevelse. Att jaga flow efficiency tvingar fram värdebanan — och leder ofta till motsatta beslut: minska batch-storlek, öka redundans, skär bort handoffs."
  }
};

// --- Event flow definitions --------------------------------------------------
// Durations in ms — 1ms UI = 1 conceptual time unit ("sekund i verkligheten").
const HAPPY_PATH = [
  { tech: "OrderCreated",        system: "crm",     duration: 800,
    domain: "Säljaren har lagt en kommersiell order. CRM och Order Management har en gemensam förståelse av kund + produkt.",
    teach: "Lär dig: ordern är kommersiell tills den dekomponeras till tekniska delar." },
  { tech: "FeasibilityChecked",  system: "si",      duration: 2000,
    domain: "Service Inventory svarar: 'ja, den här tjänsten kan levereras till denna adress'.",
    teach: "Lär dig: feasibility skiljer 'kan vi sälja det' från 'kan vi leverera det'." },
  { tech: "ResourcesReserved",   system: "ri",      duration: 5000,
    domain: "Port, IP, fiberpar är reserverade för just denna order.",
    teach: "Lär dig: reservationer ligger ofta i kö bakom andra ordrar — typisk källa till bottleneck." },
  { tech: "ProvisioningStarted", system: "prov",    duration: 3000,
    domain: "Konfigurationen pushas mot nätet via adapters/EMS/NMS.",
    teach: "Lär dig: provisioning är där OSS möter verkligheten — det är här fel oftast händer." },
  { tech: "ServiceActivated",    system: "prov",    duration: 1000,
    domain: "Tjänsten är tänd och verifierad. Service Inventory uppdateras till 'active'.",
    teach: "Lär dig: aktivering ≠ leverans förrän kund kan använda tjänsten — assurance bekräftar." },
  { tech: "BillingStarted",      system: "billing", duration: 800,
    domain: "Billing-triggern går: nu får kunden faktura.",
    teach: "Lär dig: triggern bör synka mot riktig aktivering, inte mot ordertillstånd, för att undvika felfakturering." }
];

const FAIL_RESOURCE = [
  HAPPY_PATH[0],
  HAPPY_PATH[1],
  { tech: "ResourceMissing", system: "ri", fail: true, duration: 4000,
    domain: "Resource Inventory hittar ingen ledig port för adressen — flödet stoppas.",
    teach: "Lär dig: en av de vanligaste orsakerna till manuella ärenden i order-to-activate. Drivs ofta av inventory drift." }
];

const FAIL_PROV = [
  HAPPY_PATH[0],
  HAPPY_PATH[1],
  HAPPY_PATH[2],
  HAPPY_PATH[3],
  { tech: "ProvisioningFailed", system: "prov", fail: true, duration: 3000,
    domain: "Adaptern avvisar konfigurationen — kanske fel template, kanske ett element som inte svarar.",
    teach: "Lär dig: utan rollback hamnar vi i 'partial activation'. Strategy & Enablement: hur ser vår rollback-strategi ut?" }
];
