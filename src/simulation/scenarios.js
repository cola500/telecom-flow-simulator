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
    role: "Skickar trigger till charging",
    what: "Tar emot signal när tjänsten faktiskt aktiverats och skickar trigger till charging-systemet — som i sin tur producerar fakturan. Det här systemet *triggar* alltså fakturering, det fakturerar inte själv.",
    why: "Om triggern kommer för sent eller fel tappas intäkt; kommer den för tidigt fakturerar vi för icke-levererat.",
    problems: "Drift mellan teknisk aktivering och billing-event, saknade trigger-event vid fel-handling. Strategy & Enablement-frågor: Hur lång är ledtiden mellan ServiceActivated och BillingStartRequested? Triggar vi på verifierad leverans eller bara på orderstatus?"
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

// More descriptive label for the *activity* that's slow at each system, used
// in insight text so the explanation reads "Resource reservation / inventory
// validation is the bottleneck" instead of "Resource Inventory is the
// bottleneck" (which conflates the activity with the whole domain).
const BOTTLENECK_DETAIL = {
  crm: "CRM lookup",
  om: "Order management dispatch",
  billing: "Billing trigger send",
  si: "Feasibility check (Service Inventory)",
  ri: "Resource reservation / inventory validation",
  prov: "Network config push (Provisioning)",
  assur: "Assurance loop"
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
  },
  customer_order: {
    title: "What is a Customer Order?",
    body: "En *customer order* är det kunden faktiskt köper. Den är formulerad i kommersiella termer: 'Fiber 500 Mbps med fast IP', 'Mobilt abonnemang 50 GB', 'Företagsavtal SD-WAN för 12 kontor'. Ägs av BSS-sidan (CRM och Order Management). Innehåller saker som inte spelar någon roll för nätet — kontaktperson, betalningsvillkor, kampanjkod, leveransadress för faktura. Och saknar i sig själv tillräckligt med detaljer för att nätet ska kunna leverera. Customer order är *intentionen* från affärssidan; den måste sedan översättas till tekniska arbetsobjekt nedströms. Vanlig fallgrop: att försöka *köra customer order direkt mot nätet* — då blandar man kommersiella regler med teknisk leverans, och båda blir svåra att underhålla."
  },
  service_order: {
    title: "What is a Service Order?",
    body: "En *service order* är den tjänst som måste skapas, ändras eller avvecklas för att uppfylla customer order. Den är *teknisk i intention* men fortfarande på en hög abstraktionsnivå: 'Broadband Access service', 'Mobile Voice service', 'L3 VPN'. Ägs av OSS-sidan, typiskt registrerad i Service Inventory. Servicen är *kundagnostisk* i strukturen — samma 'Broadband Access service'-mall används för tusentals kunder, bara med olika parametrar. Tanken: customer order säger *vad* kunden får; service order säger *vilken tjänst som finns i nätet*. En customer order kan generera en eller flera service orders (t.ex. fiber + IP-telefoni i samma kontrakt). Service Inventory är källan för feasibility-check: kan vi över huvud taget leverera den här typen av tjänst på den här adressen?"
  },
  resource_order: {
    title: "What is a Resource Order?",
    body: "En *resource order* är beställningen av de fysiska eller logiska resurser som tjänsten kräver. Resurser är konkreta saker: en fiberport på en specifik DSLAM/OLT, en IP-adress ur en pool, ett VLAN-id, en CPE/router, en fysisk fiberblåsning, ett licensnummer. Ägs av OSS, registrerade i Resource Inventory. En enda service order genererar oftast flera resource orders parallellt — fiber kräver port + profile + IP + CPE. Här uppstår en stor del av flödets fall-out: feasibility lovade en port som *enligt inventory* finns, men i verkligheten finns den inte (inventory drift). Eller två resource orders råkar reservera samma resurs (race condition). Eller en resurs reserveras men aktiveras aldrig och blir 'orphaned'. Resource Inventory accuracy är ett av de viktigaste KPI:erna i en operatör — och en av de svåraste att hålla."
  },
  activation: {
    title: "What is Activation?",
    body: "*Activation* är de faktiska tekniska aktiviteterna som gör tjänsten levande i nätet — det som översätter resource orders till konfiguration mot nätelementen. Konkreta steg: skicka NETCONF/CLI-kommandon till routers, OLT, IMS-core, SBC; uppdatera VLAN och QoS; binda kund-id till tjänsteinstans; uppdatera service inventory till state 'active'; verifiera end-to-end att tjänsten faktiskt fungerar. Här ligger en av de viktigaste skillnaderna i mogen telekom: *provisioning* (config push) och *activation* (verifierad funktion) är ofta separerade. En config kan accepteras av elementen men tjänsten fungerar ändå inte — det är *partial activation*, en av de dyraste felmoderna. En mogen aktiveringsprocess har post-activation tester innan billing triggas. Strategy & Enablement: är vår aktiveringsmodell *intent-based* (vi beskriver önskad sluttillstånd, systemet räknar ut config) eller *imperativ* (vi skickar specifika kommandon)? Det första är mer modernt men kräver bättre data."
  },
  decomposition_why: {
    title: "Why decomposition matters",
    body: "Varför inte bara skicka customer order rakt till nätet? Tre skäl: (1) *Olika ägare och olika livscykler.* Customer order ägs av BSS — kontrakt, fakturering, kundvård. Service och resource orders ägs av OSS — nät, kapacitet, drift. Att blanda lager skapar tighta beroenden och gör det svårt att byta ut antingen affärslogik eller nätteknologi. (2) *En customer order = flera tekniska arbetsobjekt.* Ett kontrakt på fiber+TV+telefoni innebär flera service orders, var och en med flera resource orders. Utan dekomponering kan du inte parallellisera, prioritera, eller felhantera de tekniska delarna oberoende. (3) *Order active ≠ service working.* Customer order kan vara 'completed' i CRM medan tjänsten ännu inte fungerar i nätet — eller fungerar men inte syns i inventory. Dekomponeringen ger dig olika status per nivå: customer order = 'levererad', service = 'aktiv', resource = 'reserverad', activation = 'verifierad'. Utan denna separation blir det omöjligt att svara på den enkla frågan *'vad har egentligen gått fel?'* när något inte stämmer."
  },
  provisioning_activation: {
    title: "Provisioning, activation, and the limits of automation",
    body: "*Provisioning* är att skicka konfiguration till nätet — NETCONF/CLI mot routers, OLT, IMS-core, SBC. *Activation* är att verifiera att tjänsten faktiskt fungerar end-to-end. Det är två olika saker, även om de ofta hanteras av samma system och ibland slås ihop i språkbruket. Skillnaden spelar roll: en config kan accepteras av elementen men tjänsten ändå inte fungera (CPE inte konfigurerad rätt, IP routing mismatch, port aktiverad fel) — det är *partial activation*, en av de dyraste felmoderna eftersom kunden tror att tjänsten är klar. Reservation (Resource Inventory) är *ytterligare* en separat sak: att låsa rätt port/IP/profile *innan* aktiveringen börjar. Reservation utan aktivering ger 'orphaned resources'; aktivering utan reservation ger race conditions där två orders konkurrerar om samma resurs.\n\n*Automation* av provisioning/activation är en klassisk modernisering i operatörer — från manuella ärenden hos NOC, via skript-baserad provisioning, till intent-based aktivering med template-bibliotek och CI/CD för nätconfig. Vinsterna är reella: ledtid sjunker (från timmar/dagar till minuter), variation minskar (samma input → samma output), och team-tid frigörs från repetitivt arbete. Men automation tar inte bort alla fel. Den eliminerar inte:\n\n- *Inventory mismatch* — om templaten utgår från en port som inte finns där den ska, får du fortfarande ActivationRejected.\n- *Nätfel* — element down, fiber broken, EMS unresponsive — automation kan inte trolla fram en fungerande infrastruktur.\n- *Felaktiga produktregler* — en automatiserad mall som översätter customer order fel ger fortfarande fel tjänst, bara snabbare.\n- *Partial activation-risken* — automation kan trycka config snabbt, men om du inte automatiserat *verifieringen* har du bara automatiserat halva problemet.\n\nDärför ska *Billing trigger* aldrig kopplas till orderstatus eller config-acceptans — den ska kopplas till verifierad aktivering. Strategy & Enablement: är vår automation *intent-based* (vi beskriver önskat sluttillstånd, systemet räknar ut config) eller *imperativ* (vi skickar specifika kommandon)? Det första kräver mer mogen inventory men ger bättre rollback och mindre custom-templating per produkt."
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
  { tech: "BillingStartRequested", system: "billing", duration: 800,
    domain: "Trigger skickas till charging-systemet — själva fakturan produceras nedströms av billing/charging.",
    teach: "Lär dig: detta är en signal, inte en faktura. Triggern bör synka mot verifierad aktivering, inte mot ordertillstånd, för att undvika fakturering av icke-levererade tjänster." }
];

const FAIL_RESOURCE = [
  HAPPY_PATH[0],
  HAPPY_PATH[1],
  { tech: "ResourceUnavailable", system: "ri", fail: true, duration: 4000,
    domain: "Resource Inventory hittar ingen ledig port för adressen — flödet stoppas. Vanligaste underliggande orsak är inventory drift, inte att porten faktiskt saknas i nätet.",
    teach: "Lär dig: en av de vanligaste orsakerna till manuella ärenden i order-to-activate. Inventory-data ligger ur synk med nätet, så feasibility kan säga 'ja' till en resurs som någon annan redan tagit." }
];

const FAIL_PROV = [
  HAPPY_PATH[0],
  HAPPY_PATH[1],
  HAPPY_PATH[2],
  HAPPY_PATH[3],
  { tech: "ActivationRejected", system: "prov", fail: true, duration: 3000,
    domain: "Nätelementet (eller dess EMS/NMS-adapter) avvisar konfigurationen — fel template, syntax-mismatch, eller ett element som inte svarar.",
    teach: "Lär dig: utan rollback hamnar vi i 'partial activation' — config finns delvis i nätet, service inventory tror det är aktivt, men kunden får inte tjänsten. Strategy & Enablement: hur ser vår rollback-strategi ut, och verifierar vi tjänsten post-activation?" }
];
