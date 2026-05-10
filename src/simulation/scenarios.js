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

// Product-specific decomposition data. Drives the Order Decomposition view —
// does NOT touch the simulator's HAPPY_PATH/engine. Two products keep the
// pedagogical contrast tight: same BSS-side flow, very different OSS-side
// resources and activation tasks.
const PRODUCTS = {
  fiber: {
    label: "Fiber 500 Mbps",
    customer: {
      title: "Customer Order",
      desc: "Det kunden faktiskt beställer (t.ex. <em>\"Fiber 500 Mbps\"</em>). Kommersiella villkor, kontaktperson, kampanj.",
      o2a: "<code>OrderCreated</code> · CRM / Order Management",
      pattern: "customer_order"
    },
    service: {
      title: "Service Order: Broadband Access",
      desc: "Den tjänst som ska skapas i nätet — bredbandsuppkoppling med fiber-access. Kundagnostisk mall, parametriseras per order.",
      o2a: "<code>FeasibilityChecked</code> · Service Inventory",
      pattern: "service_order"
    },
    resources: [
      { name: "RO: Fiber access", desc: "Tillgänglig fiberport på OLT + fiberpar fram till adressen", pattern: "resource_order" },
      { name: "RO: Network profile", desc: "VLAN, QoS, IP ur pool, tjänsteprofil", pattern: "resource_order" },
      { name: "RO: CPE / Router", desc: "Hårdvara hos kund + initial konfig", pattern: "resource_order" },
      { name: "RO: Capacity reservation", desc: "Reserverad bandbredd + kapacitet i bakhalsen", pattern: "resource_order" }
    ],
    activation: {
      title: "Activation Tasks",
      desc: "Konfigurera nätet, binda kund till tjänst, verifiera end-to-end",
      o2a: "<code>ProvisioningStarted</code> → <code>ServiceActivated</code>"
    },
    failureModes: [
      { name: "Address mismatch", desc: "Order ankom adress som inte finns i adresskatalogen, eller adress stämmer inte mellan CRM och inventory" },
      { name: "Unavailable access port", desc: "Feasibility lovade en port som enligt inventory finns ledig, men i verkligheten är upptagen (inventory drift)" },
      { name: "CPE config failed", desc: "Felaktig template för CPE-modellen, eller adapter mot CPE svarar inte" },
      { name: "Capacity unavailable", desc: "Fiberparet eller bakhalsen är fullt — kapacitetsplanering har inte hängt med rollouten" }
    ],
    example: {
      wants: ["Fiber 500 Mbps, fast IP, månadsvis fakturering"],
      service: ["Broadband Access (B2C, fiber, 500/500 Mbps, statisk IP)"],
      resources: [
        "Tillgänglig fiber-access (port + fiberpar)",
        "Network profile (VLAN, QoS, IP)",
        "CPE / router",
        "Customer service location / adress"
      ],
      activation: [
        "Configure access (NETCONF mot OLT)",
        "Bind service to customer",
        "Verify service end-to-end",
        "Request billing start"
      ],
      foot: "En customer order blev fyra parallella resource orders och fyra activation tasks. Allt detta måste lyckas — och verifieras — innan billing får triggas. <em>\"Order active\" ≠ \"service working\".</em>"
    }
  },
  mobile: {
    label: "Mobile subscription",
    customer: {
      title: "Customer Order",
      desc: "Det kunden faktiskt beställer (t.ex. <em>\"Mobilt abonnemang 50 GB med EU-roaming\"</em>). Kontrakt, kampanj, eventuell portering av befintligt nummer.",
      o2a: "<code>OrderCreated</code> · CRM / Order Management",
      pattern: "customer_order"
    },
    service: {
      title: "Service Order: Mobile Connectivity",
      desc: "Den tjänst som ska skapas i mobilnätet — abonnemangsprofil + datatjänst + ev. röst/SMS. Kundagnostisk mall.",
      o2a: "<code>FeasibilityChecked</code> · Service Inventory",
      pattern: "service_order"
    },
    resources: [
      { name: "RO: MSISDN / phone number", desc: "Tilldelat telefonnummer ur nummerserie eller via portering från annan operatör", pattern: "msisdn" },
      { name: "RO: SIM / eSIM profile", desc: "Fysisk SIM eller eSIM-profil hos OEM/eSIM Remote Service Provider", pattern: "sim_esim" },
      { name: "RO: IMSI / subscriber identity", desc: "Internationell unik identifierare i HSS/UDM", pattern: "imsi" },
      { name: "RO: Subscription profile", desc: "Plan, QoS, datapaket, voice/SMS-tillgänglighet", pattern: "resource_order" },
      { name: "RO: Roaming / data package <em>(optional)</em>", desc: "Roaming-avtal, datapaket, EU-flat", pattern: "resource_order" }
    ],
    activation: {
      title: "Activation Tasks",
      desc: "Allokera nummer, binda SIM/eSIM till subscriber, aktivera profil i HSS, verifiera registreringsklarhet",
      o2a: "<code>ProvisioningStarted</code> → <code>ServiceActivated</code>"
    },
    failureModes: [
      { name: "Number allocation failed", desc: "Nummerserie tom på rätt prefix, eller portering till annan operatör pågår" },
      { name: "SIM/eSIM profile mismatch", desc: "Fel profile för enhetstyp eller operatör; eSIM RSP avvisar download" },
      { name: "Subscriber profile activation failed", desc: "HSS/UDM-uppdatering avvisad — inkompatibel plan eller race med annan provisioning" },
      { name: "Roaming/data package mismatch", desc: "Paket otillgängligt i destinationsmarknad, eller avtal med roaming-partner saknas" }
    ],
    example: {
      wants: ["Mobilt abonnemang 50 GB, fri tal, EU-roaming"],
      service: ["Mobile Connectivity (B2C, 50 GB, voice, EU-roaming)"],
      resources: [
        "MSISDN ur nummerpool",
        "eSIM-profil från RSP",
        "IMSI i HSS",
        "Subscription profile (50 GB, voice, EU)"
      ],
      activation: [
        "Allocate MSISDN",
        "Bind eSIM to IMSI",
        "Activate subscription profile in HSS/UDM",
        "Verify registration readiness",
        "Request billing start"
      ],
      foot: "Ingen fysisk fiber, ingen CPE — men <em>fyra logiska resurser i fyra olika system</em> (numbering plan, SIM/eSIM RSP, HSS/UDM, billing). Activation kräver att alla syncar."
    }
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
    body: "Varje gång arbete byter system eller team uppstår fyra kostnader:\n\n- *Väntetid* — köer mellan team eller integrationer som kör batch.\n- *Översättning* — data formateras om, fält mappas, ibland förloras något.\n- *Informationsförlust* — kontext som fanns hos den som lämnade ordern når inte den som tar emot.\n- *Kontextväxling* — den som tar emot måste sätta sig in i ordern.\n\nI telekom är det vanligt med 5–10 handoffs i ett enda order-to-activate-flöde. Tumregel: handoff-tiden är ofta större än själva arbetstiden.\n\nProcess-optimering handlar lika mycket om att ta bort handoffs som att snabba upp arbetssteg."
  },
  inventory: {
    title: "Varför inventory blir source-of-truth-problem",
    body: "Inventory ska spegla verkligheten — men nätet förändras genom utbyggnad, byten och fel, medan inventory uppdateras genom processer som kan halka efter. Resultatet är 'inventory drift': feasibility säger 'ja' till en port som inte finns, eller order management reserverar en resurs som någon annan redan tagit.\n\nSymptom: höga 'jeopardy'-rates, manuella fall-out-ärenden, partial activations.\n\nLösningar: discovery/audit-jobb som löpande stämmer av inventory mot nätet, tydligt data ownership per domän, och ett medvetet val mellan 'inventory drives nätet' (provisionering läser från inventory) och 'nätet drives inventory' (discovery skriver till inventory)."
  },
  downstream: {
    title: "Varför provisioningfel skapar downstream incidents",
    body: "När provisioning misslyckas och flödet inte rullas tillbaka rent uppstår 'partial activation': delar av konfigurationen finns i nätet, service inventory säger 'aktiv', billing kanske triggar — men kunden får inte tjänsten.\n\nDet här blir incidents nedströms: kunden ringer, supporten ser 'service active' i systemen, assurance ser inga element-larm (för elementen funkar var för sig), och felet kan ta dagar att lokalisera.\n\nStrategi för att minska detta:\n\n- Intent-baserad provisioning med automatisk rollback.\n- Post-activation verification — kontrollera att tjänsten faktiskt går genom, inte bara att configen accepterades.\n- Korrelation mellan billing-event och bekräftad tjänstetillgång."
  },
  queueing: {
    title: "Queueing theory på 60 sekunder",
    body: "När arbete kommer in fortare än ett system hinner processa det bildas en kö. Det viktiga är: kötid skalar inte linjärt med belastning — den exploderar nära 100% utilization.\n\nVid 70% utilization är genomsnittlig kötid ofta jämförbar med betjäningstiden; vid 90% är den 9× betjäningstiden; vid 99% är den ~99× — kön drar mot oändligheten. Det är därför man inte ska köra system 'maxat' om man bryr sig om lead time.\n\nLittle's Law gör matematiken explicit: average queue length = arrival rate × average wait time.\n\nTre sätt att minska kö:\n\n- Öka kapaciteten (fler 'workers' i bottleneck).\n- Minska variabilitet i ankomst eller arbetstid.\n- Sänk utilization."
  },
  utilization: {
    title: "Varför hög utilization är farligt",
    body: "I IT-organisationer är det frestande att maxa system och team — 'effektivt utnyttjande av resurser'. Men det är resource efficiency, inte flow efficiency.\n\nResource efficiency mäter hur upptagen en resurs är (server, team, system); flow efficiency mäter hur mycket av en orders totala tid som faktiskt är värdeskapande arbete (inte väntan).\n\nDe två står i konflikt vid hög load: en resurs som är 95% utnyttjad har ingen luft för variation, så när en spike kommer hopas kön. Lean och kanban föredrar låg-medel utilization i bottleneck (60-80%) eftersom flow efficiency då blir hög.\n\nTelekomflöden där order-to-activate-tid mäts i timmar/dagar har ofta flow efficiency under 10% — resterande 90%+ är väntan."
  },
  flow_efficiency: {
    title: "Resource efficiency vs flow efficiency",
    body: "Resource efficiency frågar: 'hur upptagen är denna resurs?'. Flow efficiency frågar: 'hur mycket av kundens väntan är faktiskt arbete på kundens ärende?'.\n\nExempel: kund beställer fiber. Aktivering tar 5 dagar. I de 5 dagarna har systemen aktivt arbetat med ordern i kanske 30 minuter — resten är kötid mellan handoffs, batchjobb som körs en gång per dygn, och godkännanden. Flow efficiency är alltså 30 min / 5 dagar ≈ 0.4%.\n\nAtt jaga resource efficiency ('alla våra system kör på 95%!') gör inget för kundens upplevelse. Att jaga flow efficiency tvingar fram värdebanan — och leder ofta till motsatta beslut: minska batch-storlek, öka redundans, skär bort handoffs."
  },
  customer_order: {
    title: "What is a Customer Order?",
    body: "En *customer order* är det kunden faktiskt köper. Den är formulerad i kommersiella termer: 'Fiber 500 Mbps med fast IP', 'Mobilt abonnemang 50 GB', 'Företagsavtal SD-WAN för 12 kontor'. Ägs av BSS-sidan (CRM och Order Management).\n\nInnehåller saker som inte spelar någon roll för nätet — kontaktperson, betalningsvillkor, kampanjkod, leveransadress för faktura. Och saknar i sig själv tillräckligt med detaljer för att nätet ska kunna leverera. Customer order är *intentionen* från affärssidan; den måste sedan översättas till tekniska arbetsobjekt nedströms.\n\nVanlig fallgrop: att försöka *köra customer order direkt mot nätet* — då blandar man kommersiella regler med teknisk leverans, och båda blir svåra att underhålla."
  },
  service_order: {
    title: "What is a Service Order?",
    body: "En *service order* är den tjänst som måste skapas, ändras eller avvecklas för att uppfylla customer order. Den är *teknisk i intention* men fortfarande på en hög abstraktionsnivå: 'Broadband Access service', 'Mobile Voice service', 'L3 VPN'. Ägs av OSS-sidan, typiskt registrerad i Service Inventory.\n\nServicen är *kundagnostisk* i strukturen — samma 'Broadband Access service'-mall används för tusentals kunder, bara med olika parametrar. Tanken: customer order säger *vad* kunden får; service order säger *vilken tjänst som finns i nätet*. En customer order kan generera en eller flera service orders (t.ex. fiber + IP-telefoni i samma kontrakt).\n\nService Inventory är källan för feasibility-check: kan vi över huvud taget leverera den här typen av tjänst på den här adressen?"
  },
  resource_order: {
    title: "What is a Resource Order?",
    body: "En *resource order* är beställningen av de fysiska eller logiska resurser som tjänsten kräver. Resurser är konkreta saker: en fiberport på en specifik DSLAM/OLT, en IP-adress ur en pool, ett VLAN-id, en CPE/router, en fysisk fiberblåsning, ett licensnummer. Ägs av OSS, registrerade i Resource Inventory.\n\nEn enda service order genererar oftast flera resource orders parallellt — fiber kräver port + profile + IP + CPE. Här uppstår en stor del av flödets fall-out: feasibility lovade en port som *enligt inventory* finns, men i verkligheten finns den inte (inventory drift). Eller två resource orders råkar reservera samma resurs (race condition). Eller en resurs reserveras men aktiveras aldrig och blir 'orphaned'.\n\nResource Inventory accuracy är ett av de viktigaste KPI:erna i en operatör — och en av de svåraste att hålla."
  },
  activation: {
    title: "What is Activation?",
    body: "*Activation* är de faktiska tekniska aktiviteterna som gör tjänsten levande i nätet — det som översätter resource orders till konfiguration mot nätelementen. Konkreta steg: skicka NETCONF/CLI-kommandon till routers, OLT, IMS-core, SBC; uppdatera VLAN och QoS; binda kund-id till tjänsteinstans; uppdatera service inventory till state 'active'; verifiera end-to-end att tjänsten faktiskt fungerar.\n\nHär ligger en av de viktigaste skillnaderna i mogen telekom: *provisioning* (config push) och *activation* (verifierad funktion) är ofta separerade. En config kan accepteras av elementen men tjänsten fungerar ändå inte — det är *partial activation*, en av de dyraste felmoderna. En mogen aktiveringsprocess har post-activation tester innan billing triggas.\n\nStrategy & Enablement: är vår aktiveringsmodell *intent-based* (vi beskriver önskad sluttillstånd, systemet räknar ut config) eller *imperativ* (vi skickar specifika kommandon)? Det första är mer modernt men kräver bättre data."
  },
  decomposition_why: {
    title: "Why decomposition matters",
    body: "Varför inte bara skicka customer order rakt till nätet? Tre skäl:\n\n- *Olika ägare och olika livscykler.* Customer order ägs av BSS — kontrakt, fakturering, kundvård. Service och resource orders ägs av OSS — nät, kapacitet, drift. Att blanda lager skapar tighta beroenden och gör det svårt att byta ut antingen affärslogik eller nätteknologi.\n- *En customer order = flera tekniska arbetsobjekt.* Ett kontrakt på fiber+TV+telefoni innebär flera service orders, var och en med flera resource orders. Utan dekomponering kan du inte parallellisera, prioritera, eller felhantera de tekniska delarna oberoende.\n- *Order active ≠ service working.* Customer order kan vara 'completed' i CRM medan tjänsten ännu inte fungerar i nätet — eller fungerar men inte syns i inventory. Dekomponeringen ger dig olika status per nivå: customer order = 'levererad', service = 'aktiv', resource = 'reserverad', activation = 'verifierad'. Utan denna separation blir det omöjligt att svara på den enkla frågan *'vad har egentligen gått fel?'* när något inte stämmer."
  },
  provisioning_activation: {
    title: "Provisioning, activation, and the limits of automation",
    body: "*Provisioning* är att skicka konfiguration till nätet — NETCONF/CLI mot routers, OLT, IMS-core, SBC. *Activation* är att verifiera att tjänsten faktiskt fungerar end-to-end. Det är två olika saker, även om de ofta hanteras av samma system och ibland slås ihop i språkbruket. Skillnaden spelar roll: en config kan accepteras av elementen men tjänsten ändå inte fungera (CPE inte konfigurerad rätt, IP routing mismatch, port aktiverad fel) — det är *partial activation*, en av de dyraste felmoderna eftersom kunden tror att tjänsten är klar. Reservation (Resource Inventory) är *ytterligare* en separat sak: att låsa rätt port/IP/profile *innan* aktiveringen börjar. Reservation utan aktivering ger 'orphaned resources'; aktivering utan reservation ger race conditions där två orders konkurrerar om samma resurs.\n\n*Automation* av provisioning/activation är en klassisk modernisering i operatörer — från manuella ärenden hos NOC, via skript-baserad provisioning, till intent-based aktivering med template-bibliotek och CI/CD för nätconfig. Vinsterna är reella: ledtid sjunker (från timmar/dagar till minuter), variation minskar (samma input → samma output), och team-tid frigörs från repetitivt arbete. Men automation tar inte bort alla fel. Den eliminerar inte:\n\n- *Inventory mismatch* — om templaten utgår från en port som inte finns där den ska, får du fortfarande ActivationRejected.\n- *Nätfel* — element down, fiber broken, EMS unresponsive — automation kan inte trolla fram en fungerande infrastruktur.\n- *Felaktiga produktregler* — en automatiserad mall som översätter customer order fel ger fortfarande fel tjänst, bara snabbare.\n- *Partial activation-risken* — automation kan trycka config snabbt, men om du inte automatiserat *verifieringen* har du bara automatiserat halva problemet.\n\nDärför ska *Billing trigger* aldrig kopplas till orderstatus eller config-acceptans — den ska kopplas till verifierad aktivering. Strategy & Enablement: är vår automation *intent-based* (vi beskriver önskat sluttillstånd, systemet räknar ut config) eller *imperativ* (vi skickar specifika kommandon)? Det första kräver mer mogen inventory men ger bättre rollback och mindre custom-templating per produkt."
  },
  msisdn: {
    title: "What is MSISDN?",
    body: "*MSISDN* (Mobile Station International Subscriber Directory Number) är det publika telefonnumret — det som syns för andra när du ringer eller SMS:ar. Strukturen följer ITU-standarden E.164: landskod + nationell prefix + abonnentnummer (t.ex. +46 70 123 4567).\n\nOperatören har en *numbering plan* per marknad där fria nummer hålls i en pool, och vid aktivering av en mobiltjänst allokeras ett MSISDN ur poolen och kopplas till abonnentens IMSI i HSS/UDM.\n\nTvå viktiga skillnader mot fast adress:\n\n- *MSISDN är portabelt* — kunden kan ta med sitt nummer till en annan operatör (number portability), vilket kräver synk mellan operatörer via Mobile Number Portability-systemet och kan ta från minuter till dygn.\n- *Nummerserien är en begränsad resurs* — varje land har en regulator (i Sverige: PTS) som tilldelar nummerserier, och en operatör kan teoretiskt få slut på rätt typ av nummer (t.ex. specifika prefix).\n\nVanlig fel-källa: order kommer in, MSISDN allokeras tentativt, men porteringen från annan operatör drar ut på tiden eller faller — då måste numret återlämnas och hela aktiveringen vänta."
  },
  imsi: {
    title: "What is IMSI?",
    body: "*IMSI* (International Mobile Subscriber Identity) är abonnentens *interna* identitet i mobilnätet — det operatören använder för att identifiera vem du är när din telefon registrerar sig. Strukturen är 15 siffror: MCC (landskod, 3 siffror) + MNC (nätoperatörskod, 2-3 siffror) + MSIN (abonnent, 9-10 siffror). IMSI lagras i SIM-kortet (eller eSIM-profilen) och i operatörens HSS (Home Subscriber Server) eller UDM (Unified Data Management i 5G). När telefonen slås på och söker efter nät, skickar den sin IMSI till basstationen — som frågar HSS *\"känns den här igen?\"*. Är svaret ja, registreras telefonen och får tillgång till tjänster.\n\nNyckelpoäng: *MSISDN är publikt, IMSI är internt*. Du visar aldrig din IMSI för någon — men nätet använder den hela tiden. *MSISDN ↔ IMSI-mappningen* sker i HSS/UDM och kan ändras (t.ex. när du byter SIM behåller du MSISDN men får ny IMSI). I 5G använder telefonen oftast en krypterad version (SUCI/SUPI) av IMSI för att skydda integriteten — gammal 2G/3G skickade IMSI i klartext, vilket var en känd säkerhetsbrist. Vanlig fel-källa: aktivering misslyckas i HSS för att IMSI redan är allokerad till annan abonnent (databas-state out-of-sync mellan inventory och HSS)."
  },
  sim_esim: {
    title: "What is SIM/eSIM provisioning?",
    body: "*SIM* (Subscriber Identity Module) är det fysiska kortet som lagrar abonnentens IMSI och autentiseringsnycklar (Ki/K). När du köper ett mobilabonnemang får du historiskt ett SIM-kort posten eller i butiken — kortet tillverkas av en SIM-leverantör (Gemalto, IDEMIA, m.fl.) och innehåller redan IMSI och nycklar som operatörens HSS också har en kopia av. Vid aktivering kopplas SIM-kortets IMSI till MSISDN och subscription profile.\n\n*eSIM* (embedded SIM) är samma sak men som mjukvaruprofil i en chip i telefonen — ingen fysisk leverans behövs. Provisioneringen sker via en eSIM RSP (Remote Service Provider, GSMA-standardiserad) som tar emot operatörens beställning och pushar profilen till telefonen via QR-kod eller in-app-flöde. Vinsterna: ingen logistik, snabbare aktivering, möjlighet att ha flera profiler i samma enhet (en personlig + en jobb-eSIM). Komplikationerna: profilen är låst till device-modellen, RSP är en extern part i flödet, och fel kan vara svåra att felsöka eftersom de spänner över operatör + RSP + device-OEM.\n\nVanliga fel-modes: profile mismatch (fel typ för enhetsmodellen), RSP timeout, kunden hinner inte aktivera QR-koden inom giltighetsfönstret, eller IMSI:n redan tilldelad i HSS från en tidigare order som inte städats upp."
  },
  fiber_vs_mobile: {
    title: "Why fiber and mobile decompose differently",
    body: "Customer order *kan* se nästan identisk ut på BSS-sidan: kund + produkt + kontrakt + faktureringsmodell. Men på OSS-sidan dekomponeras de till helt olika världar.\n\n*Fiber* är fysisk-domän: en specifik fiberport på en specifik OLT vid en specifik adress, en CPE i kundens hem, ett fiberpar fysiskt blåst i marken. Resource orders är geografiskt bundna och rumsligt unika. Activation handlar om att konfigurera ett fåtal kända element (OLT + CPE) och verifiera att paketen tar sig från kund till bakhalsen.\n\n*Mobile* är logisk-domän: ett MSISDN ur en pool, en SIM/eSIM-profil från en RSP, en IMSI i HSS, en subscription profile. Resurserna är inte geografiskt bundna — de följer kunden vart hen än reser. Activation handlar om att synka tre+ system (numbering plan, RSP, HSS/UDM) som var och en kan misslyckas oberoende, och verifiera att telefonen kan registrera sig på nätet.\n\nKonsekvenser: (1) *Olika failure modes* — fiber-fel är fysiska (port full, fiber av), mobile-fel är data-synk-fel (IMSI dubbelallokerad, RSP timeout). (2) *Olika ledtider* — fiber kan kräva fältbesök (dagar/veckor), mobile kan vara minuter. (3) *Olika inventory* — fiber-inventory är geografisk och behöver discovery mot fysiska element; mobile-inventory är logisk och behöver synk med RSP/HSS. (4) *Olika produktregler* — fiber-produkter beror på vad nätet täcker; mobile-produkter beror på vilka roaming-avtal och nummerserier som finns.\n\nDet är därför *Product Catalog* är ett centralt OSS/BSS-system — det är där reglerna för hur en customer order översätts till service + resource orders bor, per produktfamilj. Utan en bra product catalog hamnar dekompositions-logik utspridd i Order Management och blir omöjlig att underhålla."
  },
  common_across_products: {
    title: "What stays the same across products?",
    body: "Trots att fiber och mobile dekomponeras väldigt olika på OSS-sidan, är det förvånansvärt mycket som är *gemensamt* i flödet. Det här är värt att se tydligt eftersom det är vad som motiverar generiska OSS/BSS-plattformar: bygg ramverket en gång, parametrisera per produkt.\n\n**Vad som är gemensamt:**\n\n- *Order-to-Activate-flödet på hög nivå.* OrderCreated → FeasibilityChecked → ResourcesReserved → ProvisioningStarted → ServiceActivated → BillingStartRequested gäller båda produkterna, även om innehållet i varje steg skiljer sig.\n- *Domänansvar.* CRM äger kund. Order Management driver flödet. Service Inventory äger tjänsten. Resource Inventory äger resurserna. Provisioning aktiverar. Assurance bevakar. Samma domäner, samma ansvarsfördelning.\n- *KPI-strukturen.* End-to-end lead time, fall-out rate per steg, truly-touchless-andel, inventory accuracy — relevant för båda produkterna.\n- *Bottleneck-mönster.* Begränsade resurser och kö-driven failure-prob fungerar likadant — bara att begränsningen är olika (fysisk fiberport vs eSIM RSP-genomströmning).\n- *Billing-disciplin.* Trigger ska komma efter verifierad aktivering, oberoende av produkt.\n- *Decomposition-strukturen.* Customer Order → Service Order → Resource Orders → Activation Tasks är samma struktur — bara innehållet varierar.\n\n**Vad som varierar (och hör hemma i Product Catalog):**\n\n- Vilka resource orders skapas\n- Vilka activation tasks som krävs\n- Vilka systemen som ska konsulteras (HSS vs OLT)\n- Specifika failure modes och retry-strategier\n- Sannolikheten att olika steg blir manuella (mobile är ofta mer automatiserat än fiber)\n\nLärdomen: *bygg flödesmotorn produktagnostiskt, lägg produktreglerna i katalogen.* Det är därför TM Forum SID-modellen separerar Customer Facing Service (CFS) från Resource Facing Service (RFS) — för att kunna återanvända samma kommersiella mall över olika tekniska implementationer."
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
