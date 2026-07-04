---
title: Produktvision och Capability Map
description: Projektets North Star — varför simulatorn finns, vad den ska bli och hur framtida arbete prioriteras utifrån gapet mellan nuläge och vision. Produkt- och visionsdokument, inte tekniskt designdokument.
category: vision
status: active
last_updated: 2026-07-04
sections: [1. Vision, 2. Varför finns projektet?, 3. Produktens tes, 4. Målgrupper, 5. Pedagogisk filosofi, 6. Efter en learning journey ska användaren kunna…, 7. Designprinciper, 8. Capability Map, 9. Current State, 10. Gap Analysis, 11. Prioriteringsprincip, 12. Not Doing, 13. Hur vet vi att produkten lyckas?, 14. Levande dokument]
tags: [vision, product, north-star, pedagogy, capability-map]
related: [VISION.md, README.md, docs/learning-philosophy.md, docs/enterprise-delivery-lab-design.md]
---

# Produktvision och Capability Map

> **Detta är projektets North Star.** Det beskriver varför projektet finns, vad det ska bli och hur vi väljer vad som byggs härnäst. Det är inte ett tekniskt designdokument, inte en backlog och inte en roadmap med datum. När flera idéer konkurrerar är det gapet mellan nuläget i detta dokument och visionen i detta dokument som avgör — inte den senaste idéns lyskraft. För plattformsstrategi och arkitekturresonemang, se [VISION.md](../VISION.md).

**I en mening:** en interaktiv simulator som hjälper människor att förstå och förbättra komplexa leveranssystem — genom experiment, reflektion och systems thinking.

---

## 1. Vision

**Simulatorn ska bli det bästa interaktiva sättet att förstå och förbättra komplexa leveranssystem.**

Genom att köra ett flöde, bryta det och reparera det ska användaren utveckla systems thinking: en intuitiv känsla för hur beslut, beroenden, köer och flaskhalsar påverkar helheten — och varför lokala förbättringar inte alltid förbättrar systemet.

Visionen är domänoberoende. Telecom var första domänen och enterprise IT-leverans är den andra, men det som lärs ut — flöde, väntan, handoffs, kapacitet, återkopplingsloopar, trade-offs — gäller i varje organisation där arbete rör sig genom många händer. En användare som förstått varför en order fastnar i Resource Inventory har verktyg att förstå varför ett initiativ fastnar i en säkerhetsgranskning, en patient i en vårdkö eller en bil i en fabriksbuffert.

Målet är inte att modellera verkligheten exakt. Målet är att användaren efter en halvtimmes lekfullt experimenterande ser sitt eget arbetsflöde med nya ögon.

---

## 2. Varför finns projektet?

Komplexa leveranssystem lärs oftast ut på sätt som inte fungerar för komplexa system.

De vanliga kanalerna — processdokument, PowerPoint-presentationer, certifieringskurser, ramverksplanscher — förmedlar *ord om* systemet. Läsaren kan återge begreppen men har ingen känsla för beteendet: hur en kö byggs upp, hur ett fel kaskaderar, hur en förbättring på ett ställe flyttar problemet till nästa. Den kunskapen är dynamisk, och dynamik går inte att läsa sig till.

Komplexa system förstås bättre genom:

- **experiment** — ändra en sak, se vad som händer;
- **visualisering** — se kön växa istället för att läsa köteorins formel;
- **reflektion** — stanna upp och sätta ord på det man just såg;
- **aktivt lärande** — göra, inte lyssna.

De verktyg som finns lämnar ett gap. Statiska diagram och böcker förklarar orden men inte beteendet. Tunga simuleringsplattformar kan modellera beteendet men kräver veckor av setup — de är modelleringsverktyg, inte lärverktyg. Spelbaserade övningar är pedagogiskt utmärkta men analoga, svåra att upprepa och omätbara.

Simulatorn finns för att fylla det gapet: lättviktig nog att öppnas direkt i en webbläsare, pedagogiskt designad från grunden, och ändå tillräckligt verklig för att flödet ska bete sig som flöden gör på riktigt.

---

## 3. Produktens tes

Allt i detta dokument vilar på ett enda påstående — projektets grundhypotes, den vi försöker bevisa eller motbevisa genom att bygga:

> **Vi tror att människor förstår komplexa leveranssystem bättre genom att experimentera med dem än genom att läsa om dem.**

Därför bygger vi simulatorer där användaren kör, bryter, observerar, reflekterar och förbättrar ett system — istället för att enbart konsumera teori om det.

Varje ny domän — telecom, enterprise delivery och de som kommer efter — är ett nytt experiment som testar samma tes: att systems thinking utvecklas bäst genom aktivt utforskande. Produkten är därför inte bara en simulator av komplexa system; den är också ett pågående experiment i hur människor lär sig komplexa system.

Tesen förpliktigar åt båda håll. Produkten byggs på samma sätt som den lär ut: i små experiment med en hypotes, ett utfall och en lärdom — nuläge, målbild, hinder, nästa steg. Och om verkliga användare visar att tesen är felaktig är det produkten som ska förändras, inte användarna.

Resten av dokumentet är tesen utvecklad: målgrupperna är de vi tror behöver den, den pedagogiska filosofin är hur vi tror experimenterandet blir lärande, capability-kartan är vad som krävs för att testa tesen på allvar, och framgångstecknen i slutet är hur vi avläser om den håller.

---

## 4. Målgrupper

Produkten är byggd för människor som arbetar *i* eller *med* leveranssystem utan att ha byggt dem — och som behöver en intuitiv förståelse för systemets beteende för att göra sitt jobb bra.

### Primära målgrupper

De som simulatorn designas för i första hand:

- **IT-projektledare och Delivery Managers** — leder leveranser genom flöden de sällan själva format. Simulatorn ger dem känslan för var tiden faktiskt tar vägen: i väntan mellan stegen, inte i stegen.
- **Release Train Engineers och Scrum Masters** — faciliterar flöde över team och behöver göra flödesproblem synliga för andra. Simulatorn är ett neutralt, körbart samtalsunderlag för retrospektiv och förbättringsarbete.
- **Produktägare** — prioriterar arbete in i systemet. Simulatorn visar varför "mer in" ofta betyder "mindre ut", och vad WIP och köer gör med ledtiden för allt.
- **Enterprise- och lösningsarkitekter** — arbetar med strukturen som driver beteendet. Simulatorn visar konsekvensen av sena beroenden och värdet av tidig samordning — argument de annars får framföra i abstrakta termer.
- **Konsulter inom förändring och digital transformation** — behöver göra systemeffekter begripliga för kunder snabbt. En körbar modell övertygar där en rapport förklarar.
- **Studenter inom systemutveckling och informationssystem** — saknar åren av erfarenhet som byggt intuitionen. Simulatorn komprimerar den erfarenheten: fel som tar år att uppleva i verkligheten kan triggas och förstås på en eftermiddag.

### Sekundära målgrupper

De som möter simulatorn via någon annan, eller använder den som ram snarare än verktyg:

- **Ledningsgrupper** — fattar portfölj- och prioriteringsbeslut vars systemkonsekvenser sällan syns i beslutsrummet. En kort session visar vad "allt är prio ett" gör med helheten.
- **Företagsutbildningar, universitet och yrkeshögskolor** — får färdigt aktivt lärmaterial som körs i webbläsaren utan installation, licens eller förberedelse.
- **Team som vill förstå sitt eget leveransflöde** — kan spegla sitt flöde i en neutral modell och prata om mönstret istället för om varandra.
- **Organisationer som vill introducera systems thinking** — får en konkret startpunkt: en upplevelse att referera till, istället för en teori att läsa in.

Skiljelinjen är enkel: de primära målgrupperna använder simulatorn själva, i sitt arbete eller lärande; de sekundära möter den genom en faciliterare, utbildare eller kollega ur den första gruppen.

---

## 5. Pedagogisk filosofi

Projektet bygger på en enkel övertygelse: **den som agerar lär sig; den som lyssnar glömmer.** Filosofin är inspirerad av etablerade idéer inom aktivt lärande — bland annat Training from the Back of the Room och The Ten-Minute Trainer — utan att göra anspråk på akademisk referensapparat.

Principerna, och hur de redan tar sig uttryck i simulatorn:

**Aktivt lärande före text.** Default-handlingen är att göra något — klicka, köra, observera — inte att läsa. Texter finns som fördjupning för den som vill, aldrig som huvudkanal. I simulatorn: run/break/repair-loopen är förstahandsupplevelsen; dokumentation och teori ligger ett klick bort men aldrig i vägen.

**Prediction before explanation.** Den som först gissar vad som kommer hända, och sedan ser utfallet, lär sig mer än den som får svaret direkt. Överraskningen är läromomentet. I simulatorn: experimentloopen uppmuntrar användaren att formulera en förväntan innan en körning — och run-jämförelsen visar sedan svart på vitt om förväntan höll.

**Retrieval practice.** Kunskap fäster när man hämtar den ur minnet, inte när man läser om den. I simulatorn: reflektionsfrågorna efter en körning — *vad observerade du? vad förvånade dig? vad testar du härnäst?* — tvingar användaren att formulera sina egna observationer istället för att konsumera färdiga slutsatser.

**Teach-back.** Att förklara för någon annan är det starkaste testet på förståelse. Simulatorn är byggd för att vara ett samtalsartefakt: en faciliterare, coach eller kollega kan använda en körning som gemensam referenspunkt och låta deltagaren förklara vad som hände och varför.

**Progressive disclosure.** Allt på en gång är samma sak som ingenting. I simulatorn: lägen (Learn/Optimize/Documentation) separerar mentala moder, hopfällbara paneler låter användaren styra sin egen kognitiva belastning, och info-popovers ger fördjupning exakt där frågan uppstår.

**Strukturerad förbättring som lärandeform.** Toyota Kata-loopen — nuläge, målbild, hinder, nästa experiment — är inbyggd i Optimize-läget. Användaren lär sig inte bara *om* systemet utan tränar samtidigt *metoden* för att förbättra det.

**Konsekvens före siffra.** Abstrakta metrics är svaga; organisatoriska konsekvenser är starka. "5 incidents" säger lite; "5 manuella undersökningar och 6 supportsamtal" säger allt. Operational impact-panelerna är denna princip institutionaliserad.

**Guidad utforskning, inte fri yta.** Learning journeys och guidade scenarier ger nybörjaren en trygg väg genom domänen, samtidigt som den nyfikne kan lämna stigen när som helst. Friheten är poängen — stigen är inbjudan.

---

## 6. Efter en learning journey ska användaren kunna…

Filosofin i föregående avsnitt är bara värd något om den skapar förmågor. Detta är lärandet produkten faktiskt vill åstadkomma — uttryckt som vad användaren ska *kunna göra*, inte vad den ska ha läst:

- **identifiera en flaskhals** i ett leveransflöde — och förutse vart den flyttar när man lättar på den;
- **förklara varför lokal optimering inte alltid förbättrar helheten** — med ett konkret exempel den själv har kört;
- **resonera kring beroenden och väntetider** — se att ledtid oftast domineras av väntan mellan steg, inte av arbetet i stegen;
- **formulera en hypotes innan en förändring genomförs** — "om vi ändrar X förväntar jag mig Y, därför att…";
- **jämföra förväntat och faktiskt utfall** — och behandla avvikelsen som lärande, inte som misslyckande;
- **förstå varför tidig samordning kan minska dyrt omarbete** — och varför den försäkringen har en premie som ändå lönar sig;
- **tillämpa enkla systems thinking-principer på sitt eget arbete** — känna igen köer, WIP-effekter och återkopplingsloopar i sin egen vardag, inte bara i simulatorn.

Listan är också måttstocken för lärande-förmågorna i capability-kartan: en learning journey, ett scenario eller en reflektionsfråga som inte bidrar till någon av punkterna ovan har oklart existensberättigande.

---

## 7. Designprinciper

Principerna som styr hur produkten byggs. De är födda ur erfarenhet i projektet, i linje med lean-tänkande och Domain-Driven Design, och de gäller tills ett medvetet beslut ändrar dem.

- **Domän före plattform.** Vi bygger konkreta, pedagogiskt skarpa domäner. En generell plattform extraheras först när minst två domäner empiriskt visat samma behov — abstraktion upptäcks ur observation, inte spekuleras fram.
- **Börja med en liten vertikal slice.** En smal men komplett upplevelse som faktiskt lär ut något slår en bred halvfärdig funktion. En slice = en pedagogisk idé.
- **Återanvänd beteenden före implementation.** Validerade pedagogiska mönster (run-jämförelse, impact-paneler, reflektion) kopieras till nya domäner som *mönster*, inte som delad kod — tills plattformsbehovet är bevisat.
- **Simulatorn lär ut genom interaktion.** Om en poäng inte kan undervisas genom att användaren kör, bryter och reparerar hör den hemma i en bok, inte i simulatorn.
- **Visualisera systemeffekter.** Köer, kaskader och flyttande flaskhalsar ska synas, inte beskrivas. Visualiseringen är ett kognitivt verktyg, inte estetik.
- **Gör trade-offs tydliga.** Inga gratisluncher. En förbättring som kostar något (en premie, en fördröjning, en begränsning) ska visa sin kostnad ärligt — det är så verkliga system fungerar, och det är den obekväma sanningen som lär ut mest.
- **Förenkla medvetet och dokumentera förenklingarna.** Varje domän är en pedagogisk modell, inte en avbildning. Vad som är realistiskt och vad som är förenklat ska stå i klartext.
- **Domänkunskap bor i domändata.** Motorer känner mekanik — steg, väntan, omtag. Vad stegen heter och varför de är pedagogiskt viktiga bor i domänens innehåll. Det är det som håller pedagogiken skarp och en framtida plattform möjlig.
- **Ingen installation, inga beroenden.** Simulatorn öppnas direkt från disk eller länk. Den ergonomin är en produktegenskap, inte en teknisk detalj.
- **Boy Scout Rule gäller alltid.** Det man rör lämnar man lite bättre — proportionerligt, utan opportunistiska storrefaktorer.

---

## 8. Capability Map

Kärnan i dokumentet: de förmågor produkten långsiktigt ska ha, och var varje förmåga står idag. Statusskala: **Inte påbörjad → Tidig → Fungerande → Mogen.**

Kartan är viktigare än en backlog. En backlog svarar på "vad står på tur?"; kartan svarar på "var är vi svaga i förhållande till det vi vill bli?".

### 8.1 Domäner

*Vision: flera domäner som var och en är pedagogiskt skarp på egen hand, och som tillsammans visar att samma systemprinciper gäller överallt.*

| Capability | Vision | Status |
|---|---|---|
| **Telecom (order-to-activate)** | Referensdomänen: komplett run/break/repair, tre lägen, batch-simulering, experimentloop | **Fungerande** — rikast i produkten, men lärandeeffekten är ännu inte validerad med externa användare |
| **Enterprise Delivery** | Enterprise IT-leverans lika pedagogiskt komplett som telecom: blockers, förbättringar, reflektion, skala | **Tidig** — run/break/repair fungerar för ett initiativ; två blockers, en förbättringskontroll, delta-jämförelse |
| **Generiska flödesexperiment (FlowLab)** | Inkubator för domänoberoende flödesmekanik (WIP, kanban, tick-motor) | **Tidig** — medvetet experimentell |
| **Automotive** | Fordonsindustrins leveransflöden (t.ex. order-till-fabrik, eftermarknad) | **Inte påbörjad** |
| **Healthcare** | Patientflöden, vårdköer, delade resurser | **Inte påbörjad** |
| **Banking** | Onboarding-, kredit- eller betalflöden med compliance-grindar | **Inte påbörjad** |

Nya domäner byggs enligt "copy, don't abstract" tills plattformsbehovet är bevisat (se [VISION.md](../VISION.md)).

### 8.2 Simulering

*Vision: en simuleringsförmåga som gör systemdynamik — köer, kaskader, flyttande flaskhalsar — omedelbart synlig och experimenterbar.*

| Capability | Vision | Status |
|---|---|---|
| **Event engine** | Driva flöden av arbetsenheter genom steg med duration, köer och kapacitet | **Fungerande** — single-flow och tick-baserad batch i telecom; enklare motorer i FlowLab och Enterprise Delivery |
| **Scenarios** | Bibliotek av körbara situationer per domän (happy path, felscenarier, lastfall) | **Fungerande** i telecom, **Tidig** i Enterprise Delivery |
| **Blockers / felinjektion** | Användaren triggar realistiska fel och ser konsekvensen sprida sig | **Fungerande** i telecom, **Tidig** i Enterprise Delivery (2 av 5 designade blockers) |
| **Operational impact** | Metrics översätts till organisatoriska konsekvenser | **Fungerande** i båda aktiva domänerna |
| **Metrics** | Lead time, köer, throughput, rework — per körning och över tid | **Fungerande** i telecom, **Tidig** i Enterprise Delivery |
| **Experiment / run-jämförelse** | Ändra en sak, kör igen, se skillnaden tydligt | **Fungerande** i telecom (ghost-kurvor, delta-kort), **Tidig** i Enterprise Delivery (delta-badges) |
| **Toyota Kata-loop** | Strukturerad förbättringscykel som del av upplevelsen | **Tidig** — finns i telecoms Optimize-läge, ny och obeprövad |

### 8.3 Lärande

*Vision: pedagogiken är produktens kärna — varje förmåga här väger tyngre än motsvarande teknisk förmåga.*

| Capability | Vision | Status |
|---|---|---|
| **Learning journeys** | Guidade resor genom en domäns grundbegrepp, steg för steg | **Fungerande** i telecom (theory journey), **Inte påbörjad** i Enterprise Delivery |
| **Reflection** | Reflektionsfrågor efter körningar som tvingar fram egna observationer | **Fungerande** i telecom, **Inte påbörjad** i Enterprise Delivery |
| **Prediction** | Användaren gissar utfallet innan körningen — överraskningen blir läromomentet | **Inte påbörjad** som explicit mekanik i någon domän |
| **Guided scenarios** | Färdiga uppdrag ("sänk lead time under X utan att öka incidents") som ram för experiment | **Inte påbörjad** |
| **Glossary** | Uppslagsverk med domänbegrepp, nåbart i kontext via popovers | **Fungerande** i telecom, **Inte påbörjad** i Enterprise Delivery |
| **Documentation** | Fördjupningsdokument läsbara direkt i appen | **Fungerande** i telecom (Documentation-läget) |
| **Search** | Sök över begrepp, patterns och dokumentation | **Fungerande** i telecom |

### 8.4 Produkt

*Vision: en produkt som är tillgänglig, hittbar och behaglig oavsett enhet och förkunskap.*

| Capability | Vision | Status |
|---|---|---|
| **Accessibility** | Fullt navigerbar med tangentbord och skärmläsare, god kontrast, begriplig struktur | **Fungerande** — kontrast, fokusringar, skip-links, aria-labels; ingen fullständig WCAG-revision |
| **Mobil** | Fullvärdig upplevelse på mobil och surfplatta | **Tidig** — grundläggande responsivitet och touch-targets; stabilisering återstår |
| **Replay** | Spela upp en körning igen i efterhand, pausa och stega — för genomgångar och undervisning | **Inte påbörjad** |
| **Scenario library** | Delbara, namngivna scenarier som en lärare eller coach kan skicka till en grupp | **Inte påbörjad** |
| **Distribution** | Produkten är hittbar för de målgrupper som har nytta av den | **Tidig** — publik demo finns; ingen aktiv spridning |

### 8.5 Research & Validation

*Vision: produkten utvecklas genom att observera hur verkliga människor lär sig — inte bara genom att bygga fler funktioner. Detta område är hur produktens tes (avsnitt 3) testas på riktigt.*

| Capability | Vision | Status |
|---|---|---|
| **User Observation** | Observera riktiga användare när de använder simulatorn — utan att hjälpa dem. Var de fastnar, vad de missförstår och vad de aldrig hittar är produktens värdefullaste data | **Inte påbörjad** |
| **Learning Validation** | Verifiera att simulatorn faktiskt leder till förmågorna i avsnitt 6 — att användare efteråt kan identifiera flaskhalsar, formulera hypoteser och resonera i system, inte bara att de tyckte det var trevligt | **Inte påbörjad** |
| **Hypothesis Tracking** | Dokumentera pedagogiska hypoteser, experiment, observationer och lärdomar över tid — samma nuläge/mål/hinder/experiment-loop som produkten lär ut, tillämpad på produkten själv | **Inte påbörjad** |
| **Workshop Support** | Simulatorn kan användas i faciliterade workshops där observationer och diskussioner blir en del av produktutvecklingen | **Tidig** — produkten är designad som samtalsartefakt (reflektionsfrågor, körbar utan installation), men inget stöd finns ännu för faciliterare eller för att fånga observationerna |

### 8.6 Plattform

*Vision: när flera domäner bevisat samma behov extraheras en gemensam grund — engine, UI-grammatik och domänpaket — så att en tredje domän mest är innehåll.*

| Capability | Vision | Status |
|---|---|---|
| **Shared UI** | Gemensam UI-grammatik (paneler, lägen, kartor, tidslinjer, impact-kort) | **Tidig** — CSS-primitiver delas; mönster kopieras medvetet istället för att abstraheras |
| **Shared simulation concepts** | Dokumenterade gemensamma primitiv (arbetsenhet, kö, handoff, felinjektion, jämförelse) | **Tidig** — kartlagda i VISION.md och bekräftade i två domäner; ingen extraktion |
| **Domain plugins** | En ny domän definieras som självständigt datapaket ovanpå gemensam motor | **Inte påbörjad** — medvetet; kräver att minst två domäner kört klart (Fas 3 i VISION.md) |

---

## 9. Current State

Kort och konkret, sommaren 2026:

- **Telecom-simulatorn är produktens tyngdpunkt.** Tre lägen (Learn/Optimize/Documentation), single-order och parallell batch, felscenarier, operational impact, run-jämförelse, Toyota Kata-inspirerad experimentloop, glossary, sök, in-app-dokumentation och en publik demo. Det som saknas är inte funktioner utan *bevis*: vi vet ännu inte om externa användare faktiskt lär sig av den.
- **Enterprise Delivery Lab är en ung andra domän.** Ett initiativ kan köras genom tio leveranssteg, två blockers kan triggas, en förbättringskontroll (tidig arkitektur- och säkerhetsförankring) visar trade-offen mellan premie och besparing, och delta-badges jämför körningar. Reflektion, learning journey och skala (flera initiativ) saknas.
- **FlowLab är en inkubator** för generisk flödesmekanik, medvetet experimentmärkt.
- **Ingen plattform är byggd** — dupliceringen mellan domänerna är ett aktivt val tills mönstren bevisat sig.
- **Allt körs utan installation**, direkt från disk eller webblänk, utan ramverk och beroenden.

---

## 10. Gap Analysis

De största gapen mellan nuläge och vision — inte en backlog, utan de utvecklingsområden som väger tyngst när slices väljs:

1. **Ovaliderad lärandeeffekt.** Visionen säger "bästa interaktiva sättet att förstå leveranssystem"; nuläget kan inte visa att någon utanför projektet lärt sig något. Detta är projektets viktigaste okända och styr allt annat: utan validering vet vi inte om vi bygger rätt saker. Lösningen är inte i första hand mer kod — det är bättre observation och validering: capability-området Research & Validation (avsnitt 8.5), där varje förmåga idag är i stort sett opåbörjad. Att stänga detta gap handlar om att se riktiga användare lära sig (eller inte), och låta det styra vad som byggs. (Fas 1-kriteriet i VISION.md.)
2. **Pedagogisk obalans mellan domänerna.** Telecom har journeys, reflektion, glossary och guidning; Enterprise Delivery har nästan inget av det. Om andra domänen bara är mekanik utan pedagogik motbevisar den snarare än stärker visionen om domänoberoende lärande.
3. **Prediction saknas helt.** Filosofin säger "prediction before explanation", men ingen del av produkten ber användaren gissa innan den kör. Det är det största gapet mellan uttalad pedagogik och byggd produkt — och sannolikt den billigaste stora lärandevinsten.
4. **Systemeffekter i Enterprise Delivery.** Domänens kärnbudskap — WIP-effekten, delade granskningsresurser, köer mellan initiativ — kräver flera samtidiga initiativ. Idag finns bara ett. Utan skala kan domänen inte lära ut det den finns till för.
5. **Guidning för den som inte vet var den ska börja.** Produkten belönar nyfikna utforskare men lämnar nybörjaren utan uppdrag. Guided scenarios och tydligare ingångar är gapet mellan "verktyg för den redan frälste" och "lärverktyg för målgruppen".
6. **Hittbarhet.** En produkt som ingen hittar validerar ingenting. Distribution är inte marknadsföring av en färdig produkt utan en förutsättning för gap 1.

---

## 11. Prioriteringsprincip

När flera idéer konkurrerar om nästa slice ställs de mot dessa frågor, i ordning:

1. **Vilket gap minskar detta?** Idéer som inte adresserar något av gapen i avsnitt 10 får vänta, oavsett hur roliga de är att bygga.
2. **Ger det bättre lärande?** En förmåga som gör användaren klokare slår en förmåga som gör produkten rikare. Pedagogik före features.
3. **Är det en liten vertikal slice?** En idé som inte kan skäras ner till en komplett, körbar, pedagogiskt meningsfull skiva är inte redo att byggas.
4. **Går det att verifiera?** Varje slice ska ha ett svar på "hur vet vi att den fungerar?" innan den byggs — en checklista, ett mätbart utfall eller en observerbar användarreaktion.
5. **Behöver vi verkligen generalisera nu?** Default-svaret är nej. Duplicering är billigare än fel abstraktion, och plattformsbeslut har en egen grind (VISION.md, Fas 3).

Och en övergripande princip ovanpå frågorna: **när osäkerheten är hög prioriterar vi slices som ökar vår förståelse framför slices som ökar produktens funktionalitet.** Det är produktens tes tillämpad på oss själva — bygg det minsta som ger ett svar, lär av utfallet, välj nästa steg därefter. I ett läge där den största okända är om användare faktiskt lär sig (avsnitt 10, gap 1) är ett experiment som ger kunskap värt mer än en funktion som ger yta.

Principerna skyddar mot projektets största inre risk: att den som bygger vill bygga. Spontana idéer är välkomna — men de går genom samma frågor som alla andra.

---

## 12. Not Doing

Lika viktigt som visionen är vad projektet medvetet **inte** försöker bli:

- **Inte ett projektverktyg.** Ingen Jira-klon, inget planeringsverktyg, ingen resurshantering. Simulatorn lär ut hur flöden beter sig — den administrerar dem inte.
- **Inte ett ERP- eller processautomationssystem.** Inget verkligt data, inga integrationer, ingen drift.
- **Inte en exakt kopia av verkliga företagsprocesser.** Domänerna är generiska lärkonstruktioner byggda på arketyper. Ingen organisations interna processer avbildas, och realism offras medvetet för begriplighet — dokumenterat och med öppna kort.
- **Inte en certifieringsplattform.** Inga kurser, prov, poäng eller intyg. Måttet på framgång är att användaren förstår sitt system bättre, inte att den samlat badges.
- **Inte ett enterprise planning-verktyg.** Simulatorn hjälper människor resonera om sina flöden — den ersätter inte deras beslutsprocesser, prognoser eller portföljstyrning.
- **Inte en modelleringsplattform.** Användaren ska inte behöva bygga sin modell innan den lär sig något. Färdiga, pedagogiskt designade domäner är produkten; generell modellering är en annan produkt (och andra gör den redan).

Gränserna är inte förbud mot framtida omprövning — men den som vill flytta en av dem ska göra det som ett medvetet beslut i detta dokument, inte som en glidning.

---

## 13. Hur vet vi att produkten lyckas?

Framgång mäts i effekt på människor, inte i tekniska KPI:er. Vi letar efter kvalitativa tecken på att visionen håller — de är också svaret på det största gapet i avsnitt 10 (ovaliderad lärandeeffekt):

- **Användare återkommer för att experimentera vidare.** En simulator man öppnar en gång är en kuriositet; en man återvänder till är ett verktyg.
- **Simulatorn används i utbildningar och workshops** — av faciliterare och utbildare som valt den för att den fungerar, inte för att de ombetts.
- **Användare uttrycker att de förstår sitt eget leveranssystem bättre.** Det starkaste tecknet är när någon spontant kopplar en simulatorobservation till sin egen vardag: "det där är ju precis vår releaseprocess."
- **Samtalen förändras.** Simulatorn är framgångsrik när den leder till bättre samtal om förbättringar — hypoteser, experiment, flaskhalsar — snarare än fler diskussioner om processbeskrivningar och ansvarsfördelning.
- **Nya domäner ryms utan att visionen skrivs om.** Om en tredje domän kan läggas till med detta dokument oförändrat i allt väsentligt, är visionen verkligt domänoberoende — inte bara formulerad så.
- **Projektet fortsätter utvecklas genom små verifierbara experiment** snarare än stora omdesigns. Att produkten byggs på samma sätt som den lär ut är i sig ett kvitto på att principerna bär.

Inga siffror och inga måltal — medvetet. I det här skedet är riktningen på tecknen viktigare än storleken på dem. Den dag mätbarhet behövs (till exempel för Fas-beslut i VISION.md) definieras måtten då, utifrån det vi lärt oss.

---

## 14. Levande dokument

Detta dokument är en riktning, inte en ristning. Varje domän vi bygger och varje användare vi ser lära sig (eller inte lära sig) kommer att lära *oss* något — om leveranssystem, om pedagogik och om var visionen behöver skärpas eller ödmjukas. Dokumentet uppdateras när det händer: capability-statusar när förmågor växer, gap-analysen när gap stängs eller nya upptäcks, och principerna när verkligheten motbevisar dem. Visionen och produktens tes är långlivade; Capability Map, Gap Analysis och prioriteringar förväntas däremot utvecklas kontinuerligt när projektet och dess användare lär oss mer. Om dokumentet och verkligheten pekar åt olika håll är det dokumentet som ska ändras — medvetet, och med varför:et nedskrivet.
