// glossary.js
// 60+ sales terms with definitions, categories and optional block links.

const terms = [

  // ── Prospektering & Pipeline ───────────────────────────────────────────────
  { term: 'BANT', category: 'Prospektering', blockId: 'prospektering',
    definition: 'Kvalificeringsmodell: Budget, Authority (beslutsfattare), Need (behov), Timeline (tidsram). Används för att avgöra om en prospect är värd att prioritera.' },

  { term: 'ICP', category: 'Prospektering', blockId: 'prospektering',
    definition: 'Ideal Customer Profile. En detaljerad beskrivning av din perfekta kund — bransch, storlek, problem och beslutsfattare. Grunden för effektiv prospektering.' },

  { term: 'Pipeline', category: 'Prospektering', blockId: 'prospektering',
    definition: 'Din säljtratt med alla pågående affärsmöjligheter. En fylld pipeline är förutsättningen för stabila intäkter. Prospektering fyller toppen av tratten.' },

  { term: 'Lead', category: 'Prospektering', blockId: 'prospektering',
    definition: 'En person eller ett företag som visat intresse för din produkt eller tjänst — men ännu inte kvalificerats som köpklar prospect.' },

  { term: 'Prospect', category: 'Prospektering', blockId: 'prospektering',
    definition: 'Ett kvalificerat lead som uppfyller din ICP och sannolikt har ett genuint behov av din lösning. Nästa steg efter ett lead.' },

  { term: 'MQL', category: 'Prospektering', blockId: null,
    definition: 'Marketing Qualified Lead. Ett lead som marknadsföringen bedömt är redo för säljkontakt, baserat på engagemang (t.ex. laddat ner en guide eller anmält sig till ett webinar).' },

  { term: 'SQL', category: 'Prospektering', blockId: null,
    definition: 'Sales Qualified Lead. Ett lead som säljavdelningen kvalificerat och bedömt är köpklart. SQL är nästa steg efter MQL.' },

  { term: 'Cold calling', category: 'Prospektering', blockId: 'prospektering',
    definition: 'Att ringa en potentiell kund utan föregående kontakt eller relation. Undervärdesatt och kraftfull — en personlig telefonkontakt konverterar 10x bättre än kall e-post.' },

  { term: 'Inbound lead', category: 'Prospektering', blockId: 'prospektering',
    definition: 'En kund som själv hittat dig via din webbplats, innehåll eller rekommendation. Enklast att konvertera eftersom intresset redan finns.' },

  { term: 'Outbound sälj', category: 'Prospektering', blockId: 'prospektering',
    definition: 'Proaktiv försäljning där du kontaktar potentiella kunder som inte aktivt söker din lösning. Inkluderar cold calling, cold email och LinkedIn-outreach.' },

  { term: 'Gatekeeper', category: 'Prospektering', blockId: null,
    definition: 'Person som kontrollerar tillgången till beslutsfattaren — t.ex. en assistent eller receptionist. Att bygga rapport med gatekeepern är viktigt för att nå rätt person.' },

  { term: 'Decision maker', category: 'Prospektering', blockId: 'prospektering',
    definition: 'Beslutsfattaren — personen med mandat att säga ja och skriva under. Att identifiera och nå rätt beslutfattare är avgörande för att stänga affären.' },

  { term: 'Champion', category: 'Prospektering', blockId: null,
    definition: 'En person inuti kundorganisationen som tror på din lösning och aktivt driver ditt ärende internt. Din viktigaste allierade i en komplex affär.' },

  // ── Säljprocess ───────────────────────────────────────────────────────────
  { term: 'SPIN Selling', category: 'Säljprocess', blockId: 'behovsanalys',
    definition: 'Säljmetodik av Neil Rackham: Situation, Problem, Implikation, Nyttofrågor. Världens mest forskningsbaserade säljramverk — fokuserar på att förstå kundens behov på djupet.' },

  { term: 'LAER', category: 'Säljprocess', blockId: 'invandningar',
    definition: 'Modell för invändningshantering: Listen (lyssna), Acknowledge (bekräfta), Explore (utforska), Respond (svara). Strukturerat sätt att hantera motstånd utan att bli defensiv.' },

  { term: 'FAB', category: 'Säljprocess', blockId: 'presentation',
    definition: 'Presentationsmodell: Feature (egenskap), Advantage (fördel), Benefit (nytta för kunden). Binder ihop produktens egenskaper med konkret kundvärde.' },

  { term: 'AIDA', category: 'Säljprocess', blockId: 'epost',
    definition: 'Klassisk kommunikationsmodell: Attention, Interest, Desire, Action. Används i säljmail, presentationer och annonsering för att guida kunden mot ett beslut.' },

  { term: 'Discovery call', category: 'Säljprocess', blockId: 'behovsanalys',
    definition: 'Det första kvalificerande samtalet med en potentiell kund. Syftet är att förstå deras situation, problem och om det finns en matchning — inte att sälja direkt.' },

  { term: 'Behovsanalys', category: 'Säljprocess', blockId: 'behovsanalys',
    definition: 'Processen att förstå kundens verkliga behov, problem och mål. En stark behovsanalys är grunden för en träffsäker presentation. Kunden ska prata 70% av tiden.' },

  { term: 'Säljcykel', category: 'Säljprocess', blockId: null,
    definition: 'Tid från första kontakt till stängd affär. En kortare säljcykel = mer effektiv säljprocess. Mäts i dagar eller veckor beroende på bransch.' },

  { term: 'Köpsignal', category: 'Säljprocess', blockId: 'avslut',
    definition: 'Verbala eller icke-verbala signaler om att kunden är redo att köpa — t.ex. frågor om leveranstid, pratar i "vi"-form eller frågar om nästa steg. Avsluta när du ser dem.' },

  { term: 'Trial close', category: 'Säljprocess', blockId: 'avslut',
    definition: 'Test-avslut för att mäta kundens temperatur: "Hur låter det hittills?" eller "Ser du hur detta löser er situation?" Positiva svar = grön flagg för avslut.' },

  { term: 'Assumptive close', category: 'Säljprocess', blockId: 'avslut',
    definition: 'Avslutsstrategi där du agerar som om beslutet redan är fattat: "Vilken dag passar bäst för uppstart?" Fungerar bäst med stark rapport och ett positivt samtal.' },

  { term: 'Summary close', category: 'Säljprocess', blockId: 'avslut',
    definition: 'Avslutsstrategi där du sammanfattar alla diskuterade fördelar och värden, sedan ber om beslutet. Repetitionen förstärker värdeuppfattningen.' },

  { term: 'Elevator pitch', category: 'Säljprocess', blockId: 'presentation',
    definition: '30–60 sekunders presentation av vad du gör och för vem. Besvarar: Vem hjälper du? Vilket problem löser du? Vad är det unika resultatet?' },

  { term: 'Proposal', category: 'Säljprocess', blockId: null,
    definition: 'Formellt erbjudande/offert till kunden. En bra proposal sammanfattar kundens egna ord om sitt problem och visar exakt hur din lösning adresserar det.' },

  { term: 'Pain point', category: 'Säljprocess', blockId: 'behovsanalys',
    definition: 'Kundens problem, frustration eller utmaning som din produkt kan lösa. Att identifiera och förstärka pain points är kärnan i behovsanalysen.' },

  // ── Kommunikation & Relationer ────────────────────────────────────────────
  { term: 'Rapport', category: 'Kommunikation', blockId: 'forsta-intrycket',
    definition: 'Känslan av samhörighet och förtroende som gör att kunden vill köpa av just dig. Byggs genom genuint intresse, aktivt lyssnande och gemensamma nämnare.' },

  { term: 'Mirroring', category: 'Kommunikation', blockId: 'forsta-intrycket',
    definition: 'Spegelteknik: subtilt matcha kundens kroppsspråk, taltempo och tonläge. Skapar omedveten samhörighet — vi gillar människor som liknar oss.' },

  { term: 'Mehrabians regel', category: 'Kommunikation', blockId: 'forsta-intrycket',
    definition: '7-38-55: 7% av kommunikation är ord, 38% är röst/tonläge, 55% är kroppsspråk. 93% av hur du uppfattas är icke-verbalt.' },

  { term: 'Labeling', category: 'Kommunikation', blockId: 'forhandling',
    definition: 'Chris Voss-teknik: verbalt bekräfta kundens känsla — "Det verkar som att priset är en känslig fråga." Disarmar motstånd och visar empati.' },

  { term: 'Active listening', category: 'Kommunikation', blockId: 'behovsanalys',
    definition: 'Aktivt lyssnande: att verkligen absorbera och bekräfta vad kunden säger — inte vänta på din tur att prata. Inkluderar att nicka, sammanfatta och ställa följdfrågor.' },

  { term: 'Social proof', category: 'Kommunikation', blockId: null,
    definition: 'Bevis på att andra kunder valt och är nöjda med din lösning — case studies, recensioner, referenslistor. En av de starkaste övertygningskrafterna.' },

  { term: 'Storytelling', category: 'Kommunikation', blockId: 'presentation',
    definition: 'Att använda berättelser istället för faktalister i din säljpresentation. En historia är 22x mer minnesvärd än punktlistor och är ett av de mest effektiva säljverktygen.' },

  // ── Förhandling ───────────────────────────────────────────────────────────
  { term: 'BATNA', category: 'Förhandling', blockId: 'forhandling',
    definition: 'Best Alternative To a Negotiated Agreement. Ditt bästa alternativ om förhandlingen misslyckas. Stark BATNA = förhandlingsstyrka och frihet att hålla dina villkor.' },

  { term: 'Anchoring', category: 'Förhandling', blockId: 'forhandling',
    definition: 'Den som nämner ett nummer först sätter referenspunkten (ankaret) för förhandlingen. Det slutliga priset tenderar att gravitera mot det första ankaret.' },

  { term: 'Principled negotiation', category: 'Förhandling', blockId: 'forhandling',
    definition: 'Harvard-modell för förhandling som syftar till win-win — båda parter känner att de fick det de behövde. Fokuserar på intressen, inte positioner.' },

  { term: 'Taktisk empati', category: 'Förhandling', blockId: 'forhandling',
    definition: 'Chris Voss metod: förstå och verbalt bekräfta kundens perspektiv och känslor. Det kraftfullaste förhandlingsverktyget — disarmar motstånd utan konfrontation.' },

  // ── Digital Försäljning ───────────────────────────────────────────────────
  { term: 'Social selling', category: 'Digital Försäljning', blockId: 'linkedin',
    definition: 'Använda sociala medier — primärt LinkedIn — för att bygga relationer med potentiella kunder innan du säljer. Värmer upp cold outreach och förkortar säljcykeln.' },

  { term: 'SSI', category: 'Digital Försäljning', blockId: 'linkedin',
    definition: 'Social Selling Index — LinkedIns mått på din social selling-aktivitet. Mäter professionellt varumärke, rätt personer, insiktsengagemang och relationsbyggande. Sikta på 70+.' },

  { term: 'Cold email', category: 'Digital Försäljning', blockId: 'epost',
    definition: 'E-post till en potentiell kund utan föregående kontakt. Snitt-svarsraten är 1–5%, men toppsäljare når 15–25% med rätt struktur och personalisering.' },

  { term: 'Open rate', category: 'Digital Försäljning', blockId: 'epost',
    definition: 'Andel mottagare som öppnat ditt mail. Genomsnitt för cold email är 21%. Påverkas primärt av ämnesraden och avsändarnamnet.' },

  { term: 'Break-up mail', category: 'Digital Försäljning', blockId: 'epost',
    definition: 'Sista mailet i en sekvens: "Det verkar som tajmingen inte är rätt. Jag hör inte av mig mer." Paradoxalt svarar 10–20% på detta mail.' },

  { term: 'Thought leadership', category: 'Digital Försäljning', blockId: 'personligt-varumarke',
    definition: 'Att dela insikter och perspektiv som positionerar dig som auktoritet i din nisch. Bygger förtroende med potentiella kunder innan de ens kontaktat dig.' },

  { term: 'Personligt varumärke', category: 'Digital Försäljning', blockId: 'personligt-varumarke',
    definition: 'Vad folk säger om dig när du inte är i rummet. Din digitala och fysiska reputation som säljare — avgör om kunder vill ta ditt samtal eller svara på ditt mail.' },

  // ── Mål & Mätning ─────────────────────────────────────────────────────────
  { term: 'KPI', category: 'Mål & Mätning', blockId: 'mal-motivation',
    definition: 'Key Performance Indicator. Nyckeltal som mäter om du är på rätt spår mot ditt mål — t.ex. antal samtal per dag, stängningsprocent, genomsnittlig affärsstorlek.' },

  { term: 'Konverteringsgrad', category: 'Mål & Mätning', blockId: 'mal-motivation',
    definition: 'Andel prospects som blir betalande kunder. Om 100 samtal ger 20 möten och 4 affärer = 4% konvertering från samtal. Viktigt nyckeltal för att optimera säljprocessen.' },

  { term: 'Stängningsprocent', category: 'Mål & Mätning', blockId: 'avslut',
    definition: 'Andel presentationer/demos som resulterar i en stängd affär. En stängningsprocent på 20% = du behöver 5 möten per affär. Förbättras med bättre kvalificering.' },

  { term: 'SMART-mål', category: 'Mål & Mätning', blockId: 'mal-motivation',
    definition: 'Ramverk för målsättning: Specifikt, Mätbart, Accepterat, Relevant, Tidsbundet. Ett SMART-mål är konkret och kontrollerbart — inte vagt och hoppfullt.' },

  { term: 'Aktivitetsmål', category: 'Mål & Mätning', blockId: 'mal-motivation',
    definition: 'Mål du fullt kontrollerar — antal samtal, möten, offerter. Fokusera på aktivitetsmål, resultaten är en konsekvens. Du äger processen, inte utfallet.' },

  { term: 'Resultatmål', category: 'Mål & Mätning', blockId: 'mal-motivation',
    definition: 'Det du vill uppnå — intäkt, antal affärer, marknadsandel. Viktig som riktning men farlig att fokusera på ensam eftersom du inte direkt kontrollerar det.' },

  { term: 'Quota', category: 'Mål & Mätning', blockId: null,
    definition: 'Säljkvot — det intäktsmål eller antal affärer en säljare förväntas uppnå under en period. Vanligtvis satt per kvartal eller år.' },

  { term: 'ROI', category: 'Mål & Mätning', blockId: 'invandningar',
    definition: 'Return on Investment. Avkastning på investering. Kraftfullt argument mot prisinvändningar: "Vad ger er en investering på X om den sparar er Y per månad?"' },

  { term: 'CAC', category: 'Mål & Mätning', blockId: null,
    definition: 'Customer Acquisition Cost. Kostnaden för att förvärva en ny kund — inkluderar säljtid, marknadsföring och verktyg. Viktigt nyckeltal för lönsamhet.' },

  { term: 'LTV', category: 'Mål & Mätning', blockId: null,
    definition: 'Lifetime Value. Totalt värde en kund genererar under hela relationen. En kund med hög LTV motiverar en högre CAC och mer investerad säljtid.' },

  { term: 'CRM', category: 'Mål & Mätning', blockId: 'uppfoljning',
    definition: 'Customer Relationship Management. System för att spåra kundkontakter, pipeline och uppföljningar. Utan CRM lever du i kaos och tappar affärer du förtjänar.' },

  // ── Mindset & Prestation ──────────────────────────────────────────────────
  { term: 'Growth mindset', category: 'Mindset', blockId: 'mal-motivation',
    definition: 'Carol Dwecks begrepp: övertygelsen att förmågor kan utvecklas med träning. Ser motgångar som lärande, inte misslyckanden. Korrelerar starkt med långsiktig säljframgång.' },

  { term: 'Fixed mindset', category: 'Mindset', blockId: 'mal-motivation',
    definition: 'Övertygelsen att förmågor är medfödda och oföränderliga. "Jag är inte en säljare." Begränsar utveckling och leder till att undvika utmaningar.' },

  { term: 'Reframing', category: 'Mindset', blockId: 'mental-styrka',
    definition: 'Att medvetet välja hur du tolkar en händelse. "Jag fick nej" → "Jag kom närmre ett ja." Inte naivt positivt tänkande — strategisk tolkning av verkligheten.' },

  { term: 'Flow', category: 'Mindset', blockId: 'mental-styrka',
    definition: 'Csikszentmihalyis begrepp för djup koncentration där tid verkar stanna. Uppstår när utmaningens nivå matchar din kompetens. Optimal prestationsnivå.' },

  { term: 'Stoicism', category: 'Mindset', blockId: 'mental-styrka',
    definition: 'Filosofi som skiljer mellan vad du kontrollerar (tankar, handlingar) och inte (andras beslut, resultat). Fokusera all energi på det du faktiskt kan påverka.' },

  { term: '80/20-regeln', category: 'Mindset', blockId: 'tidshantering',
    definition: 'Pareto-principen: 20% av dina aktiviteter ger 80% av dina resultat. Identifiera och maximera dina 20% mest värdefulla aktiviteter och kunder.' },

  { term: 'Eat the frog', category: 'Mindset', blockId: 'tidshantering',
    definition: 'Mark Twains princip: gör din svåraste, viktigaste uppgift först på dagen. Bygger momentum och eliminerar den mentala energin du lägger på att skjuta upp det.' },

  { term: 'Time blocking', category: 'Mindset', blockId: 'tidshantering',
    definition: 'Att schemalägga specifika tidsblock för specifika aktiviteter och skydda dem som möten. Förhindrar att reaktivt arbete tränger undan proaktivt säljarbete.' },

  { term: 'Urgency', category: 'Säljprocess', blockId: 'avslut',
    definition: 'Skäl för kunden att agera nu snarare än senare. Kan vara genuint (prisändring, kapacitetsbegränsning) eller skapad. Fabricerad urgency skadar förtroendet — använd bara äkta.' },

  { term: 'Value proposition', category: 'Säljprocess', blockId: 'presentation',
    definition: 'Ditt erbjudandes unika värde för kunden — varför de ska välja dig framför alternativet. En stark value prop svarar på: Vilket problem löser du? Hur? Varför bättre än alternativet?' },

  { term: 'Upselling', category: 'Säljprocess', blockId: 'uppfoljning',
    definition: 'Att sälja en uppgradering eller dyrare version till en befintlig kund. En befintlig kund är 5x lättare att sälja till än en ny. Din viktigaste tillväxtkälla.' },

  { term: 'Cross-selling', category: 'Säljprocess', blockId: 'uppfoljning',
    definition: 'Att sälja ett kompletterande produkt eller tjänst till en befintlig kund. Ökar LTV och fördjupar kundrelationen.' },

  { term: 'Referral', category: 'Säljprocess', blockId: 'uppfoljning',
    definition: 'En rekommendation från en nöjd kund till en ny potentiell kund. Konverterar 4x snabbare än cold outreach och är den mest kostnadseffektiva källan till nya affärer.' },

  // ── AI & Säljteknologi ────────────────────────────────────────────────────
  { term: 'Prompt engineering', category: 'Digital Försäljning', blockId: 'ai-saljverktyg',
    definition: 'Konsten att formulera frågor till AI så att svaret blir användbart. Bygg prompten på fyra delar: roll, uppgift, kontext, ramar. Kvaliteten på svaret beror 90% på kvaliteten på frågan.' },

  { term: 'Agentic AI', category: 'Digital Försäljning', blockId: 'ai-saljverktyg',
    definition: 'AI som inte bara svarar på frågor utan utför uppgifter åt dig — bokar möten, researchar prospekts, skickar uppföljningar. 2026 års stora skifte i säljproduktivitet.' },

  { term: 'AI-hallucination', category: 'Digital Försäljning', blockId: 'ai-saljverktyg',
    definition: 'När en AI-modell hittar på statistik, citat eller fakta som låter rimliga men är felaktiga. Verifiera alltid kritiska fakta innan du citerar AI-genererat material i kundkontakt.' },

  { term: 'EU AI Act', category: 'Digital Försäljning', blockId: 'ai-saljverktyg',
    definition: 'EU-förordningen som gäller från 2026 och reglerar AI-användning. För säljare: transparens krävs när kunden interagerar med AI — låtsas-människor är förbjudna.' },

  { term: 'AI-sparring', category: 'Digital Försäljning', blockId: 'ai-saljverktyg',
    definition: 'Att använda AI som privat rollspelspartner för att öva invändningar, förhandlingar och svåra samtal. Omdömesfritt, tillgängligt dygnet runt — ett av AI:s mest underutnyttjade säljverktyg.' },

  // ── Påverkanspsykologi (Cialdini) ─────────────────────────────────────────
  { term: 'Reciprocitet', category: 'Kommunikation', blockId: 'rekommenderad-lasning',
    definition: 'Cialdinis första påverkansprincip: människor vill återgälda det de får. Ge värde först — insikt, en gratis analys, en ärlig rekommendation — så ökar kundens benägenhet att säga ja.' },

  { term: 'Commitment & Consistency', category: 'Kommunikation', blockId: 'rekommenderad-lasning',
    definition: 'Cialdinis princip: människor vill agera konsekvent med tidigare åtaganden. Små ja leder till större ja. Få kunden att uttala värdet — då blir det hens egen övertygelse.' },

  { term: 'Auktoritet', category: 'Kommunikation', blockId: 'rekommenderad-lasning',
    definition: 'Cialdinis princip: vi lyssnar mer på experter. Bygg auktoritet genom konkret kompetens, erfarenhet och tydlig expertis — inte genom självbeprisning.' },

  { term: 'Knapphet', category: 'Kommunikation', blockId: 'rekommenderad-lasning',
    definition: 'Cialdinis princip: begränsad tillgång ökar upplevt värde. Fungerar bara om knappheten är äkta — fabricerad knapphet skadar förtroendet permanent.' },

  { term: 'Gillande', category: 'Kommunikation', blockId: 'rekommenderad-lasning',
    definition: 'Cialdinis princip: vi köper av människor vi gillar. Likhet, komplimanger och samarbete ökar gillandet. Rapport är det tekniska namnet på detta i säljsammanhang.' },

  // ── Förhandlings- & psykologitermer från bokblocket ───────────────────────
  { term: 'Tactical empathy', category: 'Förhandling', blockId: 'rekommenderad-lasning',
    definition: 'Chris Voss begrepp (Never Split the Difference): att aktivt visa att du förstår motpartens perspektiv — även om du inte håller med. Sänker motstånd och öppnar samtalet.' },

  { term: 'Labeling', category: 'Förhandling', blockId: 'rekommenderad-lasning',
    definition: 'Voss-teknik: att sätta ord på motpartens känsla — "Det låter som att du är orolig för leveranstiden." Avväpnar starka känslor och skapar förtroende i förhandlingen.' },

  { term: '"Det stämmer"', category: 'Förhandling', blockId: 'rekommenderad-lasning',
    definition: 'Voss-mantra: målet i en förhandling är inte att höra "ja", utan "det stämmer". Det betyder att motparten känner sig förstådd på djupet — och då öppnar de för samarbete.' },

  { term: 'System 1 & System 2', category: 'Mindset', blockId: 'rekommenderad-lasning',
    definition: 'Kahnemans modell (Thinking, Fast and Slow): System 1 = snabbt, intuitivt, emotionellt. System 2 = långsamt, logiskt, ansträngande. De flesta köpbeslut börjar i System 1.' },

  { term: 'Challenger Selling', category: 'Säljprocess', blockId: 'rekommenderad-lasning',
    definition: 'Dixons B2B-forskning visade att toppsäljare inte är "relationship builders" — de är "challengers" som utmanar kundens tänkande med nya insikter och leder samtalet.' },

  { term: 'Deep Work', category: 'Mindset', blockId: 'rekommenderad-lasning',
    definition: 'Cal Newports begrepp: fokuserat, ostört arbete på kognitivt krävande uppgifter. En superkraft i en distraherad värld. Säljare som skyddar deep-work-timmar stänger fler affärer.' },

  { term: 'Atomic Habits', category: 'Mindset', blockId: 'rekommenderad-lasning',
    definition: 'James Clears ramverk för beteendeförändring: 1% bättre varje dag slår stora beslut. Cue–Craving–Response–Reward. Systemet slår målet varje gång.' },

  // ── Tonfall & Retorik ─────────────────────────────────────────────────────
  { term: 'Ethos', category: 'Kommunikation', blockId: 'inledning',
    definition: 'Aristoteles första påverkanspelare: trovärdighet. Vem är du och varför ska jag lyssna? Utan ethos biter inga argument.' },

  { term: 'Pathos', category: 'Kommunikation', blockId: 'inledning',
    definition: 'Aristoteles andra pelare: känsla. Alla köp är först emotionella — människor köper med känslan och rättfärdigar med logiken.' },

  { term: 'Logos', category: 'Kommunikation', blockId: 'inledning',
    definition: 'Aristoteles tredje pelare: logik. Argumenten, bevisen, ROI:n. Utan logos kan kunden inte försvara beslutet för sig själv eller sin chef.' },

  { term: 'Majevtik', category: 'Kommunikation', blockId: 'tonfall',
    definition: 'Sokrates "barnmorskekonst" — att genom nyfikna, till synes naiva frågor få motparten att själv föda fram insikter. Antik föregångare till dagens "Förvirrad ton" i sälj.' },

  { term: 'Curiosity tone', category: 'Kommunikation', blockId: 'tonfall',
    definition: 'Nyfiken ton. Avväpnar och får motparten att fylla i. "Jaså, så ni bytte nyligen …?" Perfekt öppning och mirroring-följeslagare.' },

  { term: 'Confused tone', category: 'Kommunikation', blockId: 'tonfall',
    definition: 'Förvirrad ton (Columbo-teknik). "Stanna …? Du menar …?" Triggar kundens behov av att förklara — och den som förklarar tappar greppet om sina invändningar.' },

  { term: 'Playful tone', category: 'Kommunikation', blockId: 'tonfall',
    definition: 'Skojsam/lättsam ton. Skapar rapport, gör samtalet mindre formellt. "Det låter ju nästan som ni betalar för grannens el också." Voss kallar detta default-rösten.' },

  { term: 'No-oriented questions', category: 'Förhandling', blockId: 'tonfall',
    definition: 'Voss-teknik: formulera frågor så att "nej" är det trygga svaret. "Skulle det vara dumt att bara kika på siffrorna?" Kunden slappnar av — och svarar oftast ja.' },

  { term: 'Disbelief / Challenge', category: 'Förhandling', blockId: 'tonfall',
    definition: 'Mild misstro. "Jag har svårt att tro att ert bolag inte erbjuder bättre villkor än så." Triggar motpartens vilja att försvara sig — avslöjar värdefulla detaljer.' },

  { term: 'Controlled silence', category: 'Förhandling', blockId: 'tonfall',
    definition: 'Kontrollerad tystnad efter en laddad fråga. Cicero: silentium eloquens — den vältaliga tystnaden. Den som tål 3–5 sekunder tystnad vinner nästa informationsbit.' },

  { term: 'Framing', category: 'Kommunikation', blockId: 'tonfall',
    definition: 'Att rama in verkligheten. Samma fakta kan låta billigt eller dyrt beroende på inramning: "500 kr/mån" vs "16 kr om dagen". Din inramning formar kundens upplevelse.' },

  { term: 'Anchoring', category: 'Förhandling', blockId: 'tonfall',
    definition: 'Första siffran du nämner blir referenspunkten hjärnan jämför mot. Säg "många betalar 90 öre/kWh" innan du presenterar ditt pris på 60 öre — och 60 upplevs som billigt.' },

  { term: 'Foot-in-the-door', category: 'Säljprocess', blockId: 'tonfall',
    definition: 'Få motparten att säga ja till något litet först — chansen för ett större ja ökar dramatiskt. "Kan vi ta 5 minuter?" öppnar för hela genomgången.' },

  { term: 'Elicitation', category: 'Förhandling', blockId: 'tonfall',
    definition: 'Att framlocka information via ett mindre felaktigt påstående. "Så ni betalar väl runt 800 i månaden?" → motparten korrigerar och avslöjar det faktiska beloppet.' },

];

module.exports = terms;
