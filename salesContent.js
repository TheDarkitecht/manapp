// salesContent.js
// All sales training blocks — theory, YouTube video, and quiz questions.

const blocks = [

  // ── 1. Inledning & Första Intrycket ───────────────────────────────────────
  {
    id: 'forsta-intrycket',
    title: 'Inledning & Första Intrycket',
    subtitle: 'Skapa förtroende på sju sekunder',
    icon: '🤝',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#6366f1',
    youtubeId: 'GqGksNRYu8s',
    theory: `
      <h3>De första sju sekunderna</h3>
      <p>Forskning visar att vi bildar ett första intryck inom 7 sekunder. Under den tiden har du ännu inte sagt ett enda ord av värde — men kunden har redan bestämt hur de uppfattar dig. Det är varken rättvist eller logiskt, men det är verkligheten du arbetar i.</p>
      <p>Ditt jobb är att <strong>äga de första sju sekunderna</strong> — inte råka ha dem.</p>

      <h3>Mehrabians regel — 7-38-55</h3>
      <p>Psykologen Albert Mehrabian visade att hur vi uppfattas beror på tre saker:</p>
      <ul>
        <li><strong>7%</strong> — Vad du faktiskt säger (orden)</li>
        <li><strong>38%</strong> — Hur du säger det (röst, tempo, tonläge)</li>
        <li><strong>55%</strong> — Ditt kroppsspråk (hållning, blickkontakt, gester)</li>
      </ul>
      <p>Det betyder att <strong>93% av ditt intryck</strong> är icke-verbalt. Jobbar du bara på vad du säger, optimerar du fel sak.</p>

      <h3>Kroppsspråk som skapar förtroende</h3>
      <ul>
        <li><strong>Blickkontakt</strong> — håll ögonkontakt 60–70% av tiden. Mer upplevs som stirrande, mindre som ointresse.</li>
        <li><strong>Öppen hållning</strong> — armarna längs sidan, inte korsade. Korsade armar signalerar defensivitet.</li>
        <li><strong>Handslaget</strong> — fast, inte krossande. Tre sekunder. Se personen i ögonen.</li>
        <li><strong>Luta dig lätt framåt</strong> — signalerar intresse och engagemang.</li>
        <li><strong>Leende</strong> — ett äkta leende (Duchenne-leende) involverar ögonen, inte bara munnen.</li>
      </ul>

      <h3>Spegelteknik (Mirroring)</h3>
      <p>Spegelteknik innebär att du subtilt speglar kundens kroppsspråk, taltempo och tonläge. Det skapar omedveten samhörighet — vi gillar människor som liknar oss.</p>
      <p>Exempel: Om kunden pratar lugnt och metodiskt — matcha det. Börja inte sälja snabbt och energiskt. Om de lutar sig bakåt — ge dem utrymme, luta dig inte framåt.</p>

      <h3>Hur du öppnar en säljkonversation</h3>
      <p>Undvik att börja med att prata om dig själv, ditt företag eller din produkt. Börja istället med <strong>kunden</strong>.</p>
      <ul>
        <li>❌ "Hej, jag heter Anna och arbetar på X och vi erbjuder Y..."</li>
        <li>✅ "Hej [namn], jag såg att ni [specifik observation]. Hur jobbar ni med det idag?"</li>
      </ul>
      <p>En stark öppning visar att du har gjort din research och att du är intresserad av dem — inte av din provision.</p>

      <h3>Rapport — grunden för allt sälj</h3>
      <p>Rapport är den känsla av samhörighet och förtroende som gör att kunden <em>vill</em> köpa av just dig. Det är inte ett trick — det är en äkta mänsklig koppling.</p>
      <p>Rapport byggs genom: gemensamma intressen, aktiv lyssning, att använda personens namn, att visa genuint intresse och att matcha deras kommunikationsstil.</p>
    `,
    quiz: [
      { q: 'Enligt Mehrabians regel, hur stor andel av kommunikation utgörs av kroppsspråk?', options: ['7%', '38%', '55%', '70%'], answer: 2 },
      { q: 'Hur lång tid tar det att bilda ett första intryck av en person?', options: ['30 sekunder', '1 minut', '7 sekunder', '3 minuter'], answer: 2 },
      { q: 'Hur stor andel av kommunikation är tonläge och röst enligt Mehrabian?', options: ['7%', '38%', '55%', '25%'], answer: 1 },
      { q: 'Vad innebär spegelteknik (mirroring)?', options: ['Att repetera vad kunden sagt ordagrant', 'Att subtilt spegla kundens kroppsspråk och taltempo', 'Att visa kunden ditt sortiment', 'Att ständigt hålla ögonkontakt'], answer: 1 },
      { q: 'Hur länge bör du hålla ögonkontakt under ett samtal för att verka trovärdig?', options: ['10–20% av tiden', '60–70% av tiden', '100% av tiden', '30–40% av tiden'], answer: 1 },
      { q: 'Vad är rätt sätt att öppna en säljkonversation?', options: ['Presentera dig och ditt företag direkt', 'Berätta om ert bästa erbjudande', 'Visa intresse för kunden med en specifik observation', 'Fråga om de har tid att prata'], answer: 2 },
      { q: 'Vad signalerar korsade armar i en konversation?', options: ['Intresse', 'Förtroende', 'Defensivitet', 'Entusiasm'], answer: 2 },
      { q: 'Vad är rapport?', options: ['En försäljningsteknik för att pressa priser', 'En känsla av samhörighet och förtroende', 'En metod för att hantera invändningar', 'Ett avslutssystem'], answer: 1 },
      { q: 'Vilket leende skapar mest äkta förtroende?', options: ['Ett brett leende med tänderna synliga', 'Ett leende som involverar ögonen (Duchenne-leende)', 'Ett subtilt, nästan omärkbart leende', 'Det spelar ingen roll vilket leende'], answer: 1 },
      { q: 'Varför är de första 7 sekunderna så viktiga i sälj?', options: ['Kunden bestämmer priset', 'Kunden bildar ett intryck som är svårt att ändra', 'Du måste hinna presentera produkten', 'Det är när kunden bestämmer sig för att köpa'], answer: 1 },
    ],
  },

  // ── 2. Prospektering ──────────────────────────────────────────────────────
  {
    id: 'prospektering',
    title: 'Prospektering',
    subtitle: 'Hitta rätt kunder — inte flest kunder',
    icon: '🎯',
    gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    color: '#0ea5e9',
    youtubeId: 'u68KCMTGXSk',
    theory: `
      <h3>Vad är prospektering?</h3>
      <p>Prospektering är processen att identifiera och kvalificera potentiella kunder (prospects) som passar din produkt eller tjänst. Det är säljprocessens fundament — utan en fylld pipeline finns inget att sälja till.</p>
      <p><strong>Kom ihåg:</strong> Fler prospekts ≠ bättre resultat. Rätt prospekts = bättre resultat.</p>

      <h3>ICP — Ideal Customer Profile</h3>
      <p>Innan du börjar prospektera måste du definiera vem din ideala kund är. En ICP beskriver:</p>
      <ul>
        <li><strong>Bransch</strong> — Vilken industri?</li>
        <li><strong>Storlek</strong> — Hur många anställda? Vilken omsättning?</li>
        <li><strong>Geografi</strong> — Var befinner de sig?</li>
        <li><strong>Problem</strong> — Vilket specifikt problem löser du åt dem?</li>
        <li><strong>Beslutsfattare</strong> — Vem fattar köpbeslutet?</li>
      </ul>
      <p>En tydlig ICP sparar dig hundratals timmar av prospektering på fel personer.</p>

      <h3>BANT-modellen</h3>
      <p>BANT är ett klassiskt ramverk för att kvalificera om en prospect är värd att satsa tid på:</p>
      <ul>
        <li><strong>B — Budget</strong>: Har de råd med din lösning?</li>
        <li><strong>A — Authority</strong>: Pratar du med rätt beslutsfattare?</li>
        <li><strong>N — Need</strong>: Har de ett genuint behov?</li>
        <li><strong>T — Timeline</strong>: Är de redo att agera inom rimlig tid?</li>
      </ul>
      <p>Om en prospect inte uppfyller BANT — prioritera inte dem. Du arbetar mot fel mål.</p>

      <h3>Kanaler för prospektering</h3>
      <ul>
        <li><strong>LinkedIn</strong> — B2B-guld. Sök efter titel, bransch, företagsstorlek. Skicka personliga meddelanden, inte mallar.</li>
        <li><strong>Cold calling</strong> — Undervärdesatt och kraftfull. En personlig telefonkontakt slår e-post 10x i konvertering.</li>
        <li><strong>Referrals</strong> — Din bästa källa. En rekommendation från en befintlig kund stänger 4x snabbare än cold outreach.</li>
        <li><strong>Nätverksevent</strong> — Branschmässor, konferenser. Möt rätt personer ansikte mot ansikte.</li>
        <li><strong>Inbound leads</strong> — Kunder som hittat dig via din webbplats eller innehåll. Enklast att konvertera.</li>
      </ul>

      <h3>Pipeline-tänkandet</h3>
      <p>Din pipeline är din säljtratt. Prospektering fyller toppen av tratten. Om du slutar prospektera idag, töms din pipeline om 60–90 dagar. Prospektering är inte något du gör när det är lugnt — det är något du gör <strong>varje dag</strong>.</p>
      <p>Sätt ett dagligt mål: t.ex. 10 nya kontakter, 5 uppföljningar och 2 boka möten.</p>
    `,
    quiz: [
      { q: 'Vad är syftet med prospektering?', options: ['Att presentera din produkt så snabbt som möjligt', 'Att identifiera och kvalificera potentiella kunder', 'Att skicka massutskick', 'Att ringa så många samtal som möjligt'], answer: 1 },
      { q: 'Vad står "A" för i BANT-modellen?', options: ['Ambition', 'Authority (Beslutsfattare)', 'Availability', 'Action'], answer: 1 },
      { q: 'Vad är en ICP?', options: ['En intern certifikation för säljare', 'En beskrivning av din ideala kund', 'En invändningshanteringsteknik', 'En typ av avslutsstrategi'], answer: 1 },
      { q: 'Vilken prospekteringskanal ger generellt sett snabbast konvertering?', options: ['Cold e-post', 'LinkedIn ads', 'Referrals från befintliga kunder', 'Mässor'], answer: 2 },
      { q: 'Vad händer om du slutar prospektera i 60–90 dagar?', options: ['Ingenting — du har fortfarande dina gamla kunder', 'Din pipeline töms', 'Du får fler inbound leads', 'Din stängningsprocent ökar'], answer: 1 },
      { q: 'Vad är det viktigaste att definiera i ett LinkedIn-prospekteringsmeddelande?', options: ['Att det är personligt och specifikt för mottagaren', 'Att det är kort och innehåller ett erbjudande', 'Att det skickas vid rätt tid på dygnet', 'Att det innehåller ett webbplatsbesök'], answer: 0 },
      { q: 'Vad betyder "T" i BANT?', options: ['Talent', 'Trust', 'Timeline (Tidsram)', 'Target'], answer: 2 },
      { q: 'Varför är det viktigt att ha en tydlig ICP?', options: ['Det gör att du slipper sälja till alla', 'Det sparar tid och fokuserar insatserna på rätt kunder', 'Det är ett lagkrav', 'Det gör dig till specialist automatiskt'], answer: 1 },
      { q: 'Hur bör prospektering behandlas tidsmässigt?', options: ['Bara när det är lugnt i säljarbetet', 'Som en daglig aktivitet', 'En gång i månaden', 'Enbart i början av kvartalet'], answer: 1 },
      { q: 'Vad är en pipeline?', options: ['En CRM-programvara', 'Din säljtratt med alla aktuella prospekts och affärer', 'En lista med befintliga kunder', 'En rapport till chefen'], answer: 1 },
    ],
  },

  // ── 3. Behovsanalys ───────────────────────────────────────────────────────
  {
    id: 'behovsanalys',
    title: 'Behovsanalys',
    subtitle: 'Förstå kunden bättre än de förstår sig själva',
    icon: '🔍',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#10b981',
    youtubeId: 'HiEjkMQtZuI',
    theory: `
      <h3>Varför behovsanalys är nyckeln</h3>
      <p>De flesta säljare pratar för mycket. De presenterar, förklarar och argumenterar — utan att först förstå vad kunden faktiskt behöver. Resultatet: en presentation som missar målet och en kund som inte känner sig förstådd.</p>
      <p>En stark behovsanalys vänder på dynamiken. Du lyssnar mer än du pratar. Du ställer frågor som får kunden att tänka nytt. Och när du väl presenterar din lösning — passar den perfekt.</p>

      <h3>SPIN Selling — Neil Rackham</h3>
      <p>SPIN Selling är ett av de mest forskningsbaserade säljramverken som finns. Det bygger på fyra typer av frågor:</p>
      <ul>
        <li><strong>S — Situationsfrågor</strong>: Samla fakta om kundens nuläge. Hur jobbar ni idag? Hur stor är er försäljningsstyrka? <em>(Använd sparsamt — för många situationsfrågor upplevs som ett formulär, inte ett samtal.)</em></li>
        <li><strong>P — Problemfrågor</strong>: Identifiera pain points. Vad fungerar inte optimalt idag? Vad kostar det er mest tid? Vad är er största utmaning med X?</li>
        <li><strong>I — Implikationsfrågor</strong>: Förstärk konsekvenserna av problemen. Vad händer om ni inte löser det? Hur påverkar det er intäkt/team/kunder? <em>(Kraftfullaste kategorin — skapar urgency.)</em></li>
        <li><strong>N — Nyttofrågor (Need-Payoff)</strong>: Låt kunden artikulera värdet av lösningen. Om ni kunde lösa X, vad skulle det innebära? Hur viktig är det för er att åtgärda detta?</li>
      </ul>

      <h3>Aktivt lyssnande</h3>
      <p>Aktivt lyssnande är inte att vänta på din tur att prata. Det är att verkligen absorbera vad kunden säger — och visa det.</p>
      <ul>
        <li>Nik och bekräfta: "Mm", "Jag förstår", "Berätta mer"</li>
        <li>Sammanfatta vad kunden sagt med dina egna ord</li>
        <li>Ställ följdfrågor på det de precis berättat</li>
        <li>Undvik att avbryta — låt dem tala klart</li>
      </ul>

      <h3>Öppna vs. stängda frågor</h3>
      <p><strong>Öppna frågor</strong> börjar med Vad, Hur, Varför, Berätta. De genererar djupa svar och information.<br>
      <strong>Stängda frågor</strong> besvaras med Ja/Nej. Använd dem för att bekräfta eller stänga av alternativ.</p>
      <p>I behovsanalysen — använd 80% öppna frågor. I avslutsfasen — stängda frågor för att säkra beslut.</p>

      <h3>Regeln om 70/30</h3>
      <p>I en behovsanalys bör kunden prata <strong>70%</strong> av tiden. Du pratar <strong>30%</strong> — och mestadels för att ställa frågor. Ju mer kunden pratar, desto mer information har du. Ju mer de berättar om sina problem, desto mer säljer de sig själva på lösningen.</p>
    `,
    quiz: [
      { q: 'Vad står "I" för i SPIN Selling?', options: ['Introduction', 'Implikationsfrågor', 'Information', 'Insight'], answer: 1 },
      { q: 'Vilken typ av SPIN-frågor är mest kraftfulla för att skapa urgency?', options: ['Situationsfrågor', 'Problemfrågor', 'Implikationsfrågor', 'Nyttofrågor'], answer: 2 },
      { q: 'Hur stor andel av samtalet bör kunden prata under behovsanalysen?', options: ['30%', '50%', '70%', '90%'], answer: 2 },
      { q: 'Vad är aktivt lyssnande?', options: ['Att vänta på sin tur att prata', 'Att verkligen absorbera och bekräfta vad kunden säger', 'Att anteckna allt kunden säger', 'Att ställa många frågor'], answer: 1 },
      { q: 'Vad är en öppen fråga?', options: ['En fråga som kan besvaras med Ja/Nej', 'En fråga som genererar längre, beskrivande svar', 'En fråga om pris', 'En fråga om konkurrenter'], answer: 1 },
      { q: 'Vad är nyttofrågor (N i SPIN) till för?', options: ['Att samla information om kundens situation', 'Att låta kunden artikulera värdet av en lösning', 'Att identifiera problem', 'Att förstärka konsekvenserna'], answer: 1 },
      { q: 'Vem skapade SPIN Selling-metoden?', options: ['Brian Tracy', 'Neil Rackham', 'Dale Carnegie', 'Grant Cardone'], answer: 1 },
      { q: 'Varför är det problematiskt att använda för många situationsfrågor?', options: ['De avslöjar för mycket om din produkt', 'De upplevs som ett formulär, inte ett samtal', 'De är svåra att svara på', 'De leder direkt till invändningar'], answer: 1 },
      { q: 'När ska du använda stängda frågor?', options: ['I inledningen av mötet', 'Under behovsanalysen', 'För att bekräfta beslut och stänga av alternativ', 'Aldrig i sälj'], answer: 2 },
      { q: 'Vad är huvudsyftet med behovsanalysen?', options: ['Att presentera din lösning', 'Att förstå kundens situation och problem på djupet', 'Att hantera invändningar', 'Att bestämma priset'], answer: 1 },
    ],
  },

  // ── 4. Presentation & Erbjudande ──────────────────────────────────────────
  {
    id: 'presentation',
    title: 'Presentation & Erbjudande',
    subtitle: 'Sätt värdet — inte produkten — i centrum',
    icon: '🎤',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#f59e0b',
    youtubeId: 'IiD-0kFdp2k',
    theory: `
      <h3>Det vanligaste misstaget i presentationen</h3>
      <p>De flesta säljare presenterar <em>features</em> — vad produkten kan göra. Kunderna köper <em>outcomes</em> — vad det gör för <strong>dem</strong>. Det är en fundamental skillnad.</p>
      <p>"Vår plattform har AI-driven analys" är en feature.<br>"Ni sparar 8 timmar per vecka på manuell rapportering" är ett outcome.</p>
      <p>Kunder betalar för outcomes. Presentera därefter.</p>

      <h3>FAB-modellen</h3>
      <p>FAB är ett enkelt ramverk för att binda ihop produktens egenskaper med kundens värde:</p>
      <ul>
        <li><strong>F — Feature (Egenskap)</strong>: Vad är det? "Vi har 24/7 support"</li>
        <li><strong>A — Advantage (Fördel)</strong>: Vad gör det? "Det innebär att problem löses dygnet runt"</li>
        <li><strong>B — Benefit (Nytta)</strong>: Vad är värdet för kunden? "Det betyder att ni aldrig förlorar intäkter på systemstopp"</li>
      </ul>
      <p>Kom alltid till B. Features och Advantages berättar om produkten — Benefits berättar om kunden.</p>

      <h3>Storytelling i sälj</h3>
      <p>Fakta informerar. Historier övertalar. En case study berättad som en historia är 22 gånger mer minnesvärd än en lista med punkter.</p>
      <p>Struktur för en säljhistoria:</p>
      <ul>
        <li><strong>Karaktären</strong>: En kund precis som dem (samma bransch, samma problem)</li>
        <li><strong>Konflikten</strong>: Vilket problem hade de? Vad kostade det dem?</li>
        <li><strong>Lösningen</strong>: Hur använde de din produkt?</li>
        <li><strong>Resultatet</strong>: Konkret outcome med siffror. "De ökade sin stängningsprocent med 34% på 90 dagar."</li>
      </ul>

      <h3>Elevator pitch</h3>
      <p>En elevator pitch är en 30–60 sekunders presentation av vad du gör och för vem. Den ska besvara tre frågor:</p>
      <ul>
        <li>Vem hjälper du?</li>
        <li>Vilket problem löser du?</li>
        <li>Vad är det unika resultatet?</li>
      </ul>
      <p>Exempel: "Vi hjälper B2B-säljchefer att korta sin säljcykel med 40% genom att automatisera behovsanalysen."</p>

      <h3>Anpassa presentationen till kunden</h3>
      <p>Använd det du lärde dig i behovsanalysen. En presentation som speglar kundens egna ord och problem är extremt kraftfull. De känner sig sedda.</p>
      <p>Börja presentationen med: "Baserat på vad ni berättade — att X är er största utmaning och att Y kostar er mest — vill jag visa hur vi löser just det."</p>
    `,
    quiz: [
      { q: 'Vad köper kunder egentligen, enligt en stark presentation?', options: ['Features', 'Tekniska specifikationer', 'Outcomes och värde', 'Priset'], answer: 2 },
      { q: 'Vad är "B" i FAB-modellen?', options: ['Budget', 'Benefit (Nytta för kunden)', 'Buyer', 'Brand'], answer: 1 },
      { q: 'Hur mycket mer minnesvärd är en historia jämfört med en punktlista?', options: ['2 gånger', '5 gånger', '22 gånger', 'Ingen skillnad'], answer: 2 },
      { q: 'Vad är en elevator pitch?', options: ['En lång produktdemo', 'En 30–60 sekunders kärnpresentation av vad du gör och för vem', 'En prisnegotiation', 'En metod för att hantera invändningar'], answer: 1 },
      { q: 'Hur bör du börja din presentation efter en behovsanalys?', options: ['Med priset direkt', 'Med att spegla kundens egna problem och mål', 'Med företagets historia och bakgrund', 'Med en teknisk demo av alla features'], answer: 1 },
      { q: 'Vad är skillnaden mellan Feature och Benefit i FAB?', options: ['Ingen skillnad — de betyder samma sak', 'Feature beskriver produkten, Benefit beskriver värdet för kunden', 'Benefit handlar om pris, Feature om funktion', 'Feature är för B2B, Benefit för B2C'], answer: 1 },
      { q: 'Vad ska en bra case study-historia innehålla?', options: ['Tekniska detaljer och specifikationer', 'Karaktär, konflikt, lösning och konkret resultat', 'Pris och jämförelse med konkurrenter', 'En lista med fördelar'], answer: 1 },
      { q: 'Vad är det vanligaste misstaget säljare gör i sin presentation?', options: ['De pratar för lite', 'De presenterar features istället för outcomes', 'De ger rabatt för tidigt', 'De pratar för sakta'], answer: 1 },
      { q: 'Vad bör ingå i en elevator pitch?', options: ['Vem du hjälper, vilket problem du löser och det unika resultatet', 'Företagets historia, storlek och antal anställda', 'Pris och leveranstider', 'En teknisk genomgång av produkten'], answer: 0 },
      { q: 'Varför är storytelling effektivt i sälj?', options: ['Det förkortar säljmötet', 'Historier är mer minnesvärda och övertygande än fakta', 'Det undviker frågor om pris', 'Det visar teknisk kompetens'], answer: 1 },
    ],
  },

  // ── 5. Invändningshantering ───────────────────────────────────────────────
  {
    id: 'invandningar',
    title: 'Invändningshantering',
    subtitle: 'En invändning är ett köpsignal i förklädnad',
    icon: '🛡️',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#ef4444',
    youtubeId: 'KwlB04OoBds',
    theory: `
      <h3>Vad en invändning verkligen är</h3>
      <p>Många säljare fruktar invändningar. Det är fel reaktion. En invändning visar att kunden är engagerad — de är fortfarande i samtalet, de vill förstå mer, de behöver mer övertygelse. En tyst kund som inte invänder är farligare.</p>
      <p><strong>En invändning är en fråga i förklädnad.</strong> "Det är för dyrt" betyder egentligen "Jag förstår inte värdet ännu." "Jag måste tänka på det" betyder "Du har inte gett mig tillräcklig anledning att agera nu."</p>

      <h3>LAER-modellen</h3>
      <p>LAER är ett strukturerat sätt att hantera invändningar utan att bli defensiv:</p>
      <ul>
        <li><strong>L — Listen (Lyssna)</strong>: Låt kunden tala klart. Avbryt aldrig en invändning.</li>
        <li><strong>A — Acknowledge (Bekräfta)</strong>: Visa att du hörde och förstod. "Jag förstår vad du menar." Aldrig "Men..."</li>
        <li><strong>E — Explore (Utforska)</strong>: Ställ följdfrågor för att förstå den verkliga invändningen. "Berätta mer om det — vad menar du med för dyrt?"</li>
        <li><strong>R — Respond (Svara)</strong>: Adressera den faktiska invändningen med ett faktabaserat svar.</li>
      </ul>

      <h3>De fem vanligaste invändningarna</h3>
      <ul>
        <li><strong>"Det är för dyrt"</strong> → Flytta fokus från kostnad till ROI. "Vad kostar det er att <em>inte</em> lösa det här idag?"</li>
        <li><strong>"Jag måste tänka på det"</strong> → Identifiera vad de egentligen tänker på. "Absolut. Vad är det specifika du vill fundera på?"</li>
        <li><strong>"Vi är nöjda med vår nuvarande leverantör"</strong> → Utmana status quo. "Bra att höra. Vad skulle göra att ni är intresserade av att ens jämföra?"</li>
        <li><strong>"Nu är inte rätt tid"</strong> → Skapa urgency. "Vad gör att det inte är rätt tid just nu? Och vad händer om ingenting förändras?"</li>
        <li><strong>"Jag behöver prata med min chef"</strong> → Erbjud dig att delta. "Självklart. Vill du att vi sätter ihop ett möte tillsammans så att jag kan besvara eventuella frågor?"</li>
      </ul>

      <h3>Pris vs. Värde</h3>
      <p>Prisinvändningar uppstår alltid när värdet inte är tydligt nog. Om kunden säger "det är för dyrt" har du ett presentationsproblem, inte ett prisproblem.</p>
      <p>Svara aldrig med rabatt direkt. Flytta samtalet till värde: "Låt mig visa hur den investeringen ser ut jämfört med vad ni tjänar på det."</p>

      <h3>Emotionella vs. rationella invändningar</h3>
      <p>Rationella invändningar (pris, timing, features) är lättare att hantera — de har faktasvar. Emotionella invändningar (rädsla för förändring, förtroendebrist) kräver mer lyssning och empati. Identifiera vilken typ du möter.</p>
    `,
    quiz: [
      { q: 'Vad signalerar en invändning från kunden?', options: ['Att de inte vill köpa', 'Att de är engagerade och behöver mer övertygelse', 'Att priset är fel', 'Att mötet bör avslutas'], answer: 1 },
      { q: 'Vad är det första steget i LAER-modellen?', options: ['Acknowledge', 'Respond', 'Explore', 'Listen'], answer: 3 },
      { q: 'Vad betyder "Jag måste tänka på det" egentligen?', options: ['De är inte intresserade', 'De behöver mer tid', 'Du har inte gett dem tillräcklig anledning att agera nu', 'De har inte budget'], answer: 2 },
      { q: 'Hur bör du inte svara på en prisinvändning?', options: ['Flytta fokus till ROI', 'Ge rabatt direkt', 'Fråga vad de menar med "dyrt"', 'Visa vad det kostar att inte lösa problemet'], answer: 1 },
      { q: 'Vad är det andra steget i LAER (A)?', options: ['Action', 'Acknowledge — bekräfta att du hört och förstått', 'Ask — ställ en fråga direkt', 'Argue — argumentera mot invändningen'], answer: 1 },
      { q: 'Om kunden säger "vi är nöjda med vår nuvarande leverantör", vad är bästa svaret?', options: ['Avsluta mötet', 'Fråga vad som skulle göra dem intresserade av att ens jämföra', 'Prisa ner ditt pris', 'Lista alla dina fördelar mot konkurrenten'], answer: 1 },
      { q: 'När uppstår prisinvändningar oftast?', options: ['När produkten är för dyr', 'När värdet inte är tillräckligt tydligt presenterat', 'När kunden inte har budget', 'När säljaren pratar för länge'], answer: 1 },
      { q: 'Vad är skillnaden mellan emotionella och rationella invändningar?', options: ['Det är ingen skillnad', 'Rationella har faktasvar, emotionella kräver empati och lyssning', 'Emotionella är lättare att hantera', 'Rationella invändningar gäller alltid priset'], answer: 1 },
      { q: 'Vad innebär "E" (Explore) i LAER?', options: ['Att avsluta samtalet', 'Att ställa följdfrågor för att förstå den verkliga invändningen', 'Att presentera fler features', 'Att ge ett exempel'], answer: 1 },
      { q: 'Om kunden säger "nu är inte rätt tid", vad frågar du?', options: ['Okej, när ska jag höra av mig?', 'Vad gör att det inte är rätt tid, och vad händer om ingenting förändras?', 'Kan jag ge er en rabatt?', 'Har ni budget för nästa kvartal?'], answer: 1 },
    ],
  },

  // ── 6. Avslutstekniker ────────────────────────────────────────────────────
  {
    id: 'avslut',
    title: 'Avslutstekniker',
    subtitle: 'Stäng affären utan press — med struktur',
    icon: '✅',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: '#8b5cf6',
    youtubeId: 'q9QmsJMdIno',
    theory: `
      <h3>Varför säljare misslyckas med avslut</h3>
      <p>Forskning visar att 48% av säljare aldrig ber om affären. De lämnar möten utan ett tydligt nästa steg, hoppas att kunden ska ta initiativet, och undviker den obehagliga känslan av ett eventuellt nej.</p>
      <p>Avslut handlar inte om manipulation — det handlar om att guida kunden till ett beslut de redan är nära att fatta.</p>

      <h3>Läsa köpsignaler</h3>
      <p>Kunder skickar verbala och icke-verbala signaler när de är redo att köpa:</p>
      <ul>
        <li>De börjar prata i "vi"-form: "Hur skulle <em>vi</em> använda det här?"</li>
        <li>De frågar om detaljer: leveranstid, support, implementering</li>
        <li>De lutar sig framåt eller ändrar tonläge till mer engagerat</li>
        <li>De frågar: "Vad är nästa steg?"</li>
      </ul>
      <p>När du ser köpsignaler — avsluta. Vänta inte.</p>

      <h3>Trial Close — test-avslut</h3>
      <p>Innan du ber om affären, testa temperaturen: "Hur låter det hittills?" eller "Ser du hur det här löser er situation?" Positiva svar = grön flagg för avslut.</p>

      <h3>Assumptive Close — antagandeavslut</h3>
      <p>Du agerar som om beslutet redan är fattat och pratar om nästa steg. "Vilken dag passar bäst för uppstart — tisdag eller torsdag?" Istället för: "Vill ni köpa?"</p>
      <p>Denna teknik fungerar bäst när du har byggt stark rapport och kunden är tydligt positiv.</p>

      <h3>Summary Close — sammanfattningsavslut</h3>
      <p>Sammanfatta alla fördelar och det värde ni diskuterat, sedan be om beslutet. "Vi har pratat om att ni sparar X timmar, löser Y problem och får Z resultat — är ni redo att gå vidare?"</p>

      <h3>Urgency Close — tidspressen</h3>
      <p>Skapa genuint skäl till snabbt beslut: begränsat erbjudande, prisändring, kapacitetsbegränsning. <strong>Aldrig fabricerat</strong> — det skapar misstro.</p>
      <p>"Vårt implementeringsteam har kapacitet i Q2 — men det fyller på sig snabbt. Vill ni säkra er plats nu?"</p>

      <h3>Hantera "nej" på rätt sätt</h3>
      <p>Ett nej är sällan ett definitivt nej. Det är ofta ett nej-för-nu. Fråga: "Vad skulle krävas för att ni ska säga ja?" och "Är det okej om jag hör av mig om X veckor?"</p>
    `,
    quiz: [
      { q: 'Hur stor andel av säljare ber aldrig om affären?', options: ['10%', '25%', '48%', '65%'], answer: 2 },
      { q: 'Vad är en köpsignal?', options: ['När kunden frågar om rabatt', 'Verbala eller icke-verbala signaler om att kunden är redo att köpa', 'När kunden invänder mot priset', 'När kunden frågar vem dina konkurrenter är'], answer: 1 },
      { q: 'Vad innebär "Assumptive Close"?', options: ['Du antar att kunden inte vill köpa', 'Du agerar som om beslutet redan är fattat och pratar om nästa steg', 'Du sammanfattar alla fördelar', 'Du skapar tidsbrist'], answer: 1 },
      { q: 'Vad är ett "Trial Close"?', options: ['En testperiod av produkten', 'Ett sätt att testa kundens temperatur innan avslut', 'En metod för att få kunden att prova produkten', 'En teknik för att hantera invändningar'], answer: 1 },
      { q: 'Vad innebär "Summary Close"?', options: ['Du avslutar mötet snabbt', 'Du sammanfattar värde och fördelar och ber sedan om beslutet', 'Du skickar en sammanfattning via e-post', 'Du repeterar priset tre gånger'], answer: 1 },
      { q: 'När bör du initiera ett avslut?', options: ['I slutet av varje möte alltid', 'När du ser köpsignaler — oavsett när i mötet', 'Bara om kunden frågar om pris', 'Efter tre möten'], answer: 1 },
      { q: 'Vad bör du göra vid en "Urgency Close"?', options: ['Hitta på en tidsbegränsning', 'Använda genuina skäl för snabbt beslut — aldrig fabricerade', 'Sänka priset om de beslutar idag', 'Pressa kunden hårt verbalt'], answer: 1 },
      { q: 'Vad innebär ett "nej" från kunden ofta i verkligheten?', options: ['Att de aldrig vill köpa', 'Att de valt en konkurrent', 'Att det är ett nej-för-nu, inte ett definitivt nej', 'Att priset är för högt'], answer: 2 },
      { q: 'Vad frågar du när kunden sagt nej?', options: ['Okej, tack för din tid.', 'Vad skulle krävas för att ni säger ja?', 'Ska jag sänka priset?', 'Vill du ha mer tid att tänka?'], answer: 1 },
      { q: 'Varför misslyckas många säljare med avslut?', options: ['De har fel produkt', 'De undviker att be om affären av rädsla för ett nej', 'De saknar produktkunskap', 'De pratar för lite'], answer: 1 },
    ],
  },

  // ── 7. Uppföljning ────────────────────────────────────────────────────────
  {
    id: 'uppfoljning',
    title: 'Uppföljning',
    subtitle: '80% av affärerna kräver 5+ kontakter',
    icon: '📞',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    color: '#14b8a6',
    youtubeId: 'uSMBHFvDhQE',
    theory: `
      <h3>Uppföljningens verklighet</h3>
      <p>Statistik som varje säljare bör känna till:</p>
      <ul>
        <li><strong>80%</strong> av affärer kräver 5 eller fler uppföljningskontakter</li>
        <li><strong>44%</strong> av säljare ger upp efter ett enda uppföljningsförsök</li>
        <li><strong>12%</strong> ger upp efter tre försök</li>
        <li><strong>Bara 8%</strong> av säljare gör 5+ uppföljningar — och de stänger 80% av affärerna</li>
      </ul>
      <p>Konsekvensen: Uthållighet är en av de viktigaste säljkompetenserna.</p>

      <h3>Timing och frekvens</h3>
      <p>Det finns ingen perfekt formel, men ett bra riktmärke:</p>
      <ul>
        <li><strong>24 timmar</strong> efter mötet: Tack-mail med sammanfattning och nästa steg</li>
        <li><strong>3–5 dagar</strong>: Första uppföljning med ett mervärde (artikel, case study)</li>
        <li><strong>1–2 veckor</strong>: Andra uppföljning, fråga om progress</li>
        <li><strong>2–4 veckor</strong>: Tredje uppföljning — nytt perspektiv eller ny information</li>
        <li><strong>Månadsvis</strong>: Underhåll tills de är redo eller säger tydligt nej</li>
      </ul>

      <h3>Värde i varje kontakt</h3>
      <p>Uppföljning är inte att fråga "Har ni bestämt er?" om och om igen. Varje kontakt ska tillföra värde: en relevant artikel, ett case study, en ny insikt, ett evenemang att bjuda in till.</p>
      <p>Kunderna ska se fram emot dina meddelanden — inte frukta dem.</p>

      <h3>CRM — din uppföljningsmotor</h3>
      <p>Ett CRM-system (t.ex. HubSpot, Salesforce, Pipedrive) låter dig spåra alla kontakter, sätta påminnelser och aldrig missa en uppföljning. Utan CRM lever du i kaos och tappar affärer du förtjänar att stänga.</p>

      <h3>Upselling och cross-selling</h3>
      <p>Din befintliga kundbas är din lättaste marknad. En befintlig kund är 5x lättare att sälja till än en ny. Uppföljning efter köp syftar inte bara till retention — det syftar till expansion.</p>
      <ul>
        <li><strong>Upsell</strong>: Uppgradera kunden till ett högre paket/tier</li>
        <li><strong>Cross-sell</strong>: Sälj ett kompletterande produkt eller tjänst</li>
        <li><strong>Referral</strong>: Be nöjda kunder om en introduktion till tre personer de känner</li>
      </ul>
    `,
    quiz: [
      { q: 'Hur stor andel av affärerna kräver 5 eller fler uppföljningskontakter?', options: ['20%', '50%', '80%', '95%'], answer: 2 },
      { q: 'Hur stor andel av säljare ger upp efter ett enda uppföljningsförsök?', options: ['10%', '44%', '60%', '75%'], answer: 1 },
      { q: 'Hur snabbt bör du skicka ditt uppföljningsmail efter ett möte?', options: ['Inom 1 vecka', 'Inom 3 dagar', 'Inom 24 timmar', 'Samma dag på kvällen'], answer: 2 },
      { q: 'Vad ska varje uppföljningskontakt innehålla?', options: ['Frågan om de bestämt sig', 'Mervärde — ny insikt, artikel eller case study', 'En ny rabatt', 'En demo av produkten'], answer: 1 },
      { q: 'Vad är ett CRM-system?', options: ['Ett bokföringssystem', 'Ett system för att spåra kundkontakter och uppföljningar', 'En typ av säljmetodik', 'En kurs i kundservice'], answer: 1 },
      { q: 'Hur mycket lättare är det att sälja till en befintlig kund vs. en ny?', options: ['2 gånger', '5 gånger', '10 gånger', 'Ingen skillnad'], answer: 1 },
      { q: 'Vad innebär "cross-selling"?', options: ['Att uppgradera kunden till ett dyrare paket', 'Att sälja ett kompletterande produkt eller tjänst', 'Att ta kunder från en konkurrent', 'Att dela kunder med en kollega'], answer: 1 },
      { q: 'Hur stor andel av säljare gör 5 eller fler uppföljningar och stänger 80% av affärerna?', options: ['30%', '20%', '15%', '8%'], answer: 3 },
      { q: 'Vad är syftet med en referral i uppföljningen?', options: ['Be kunden om en recension online', 'Be nöjda kunder om en introduktion till nya potentiella kunder', 'Erbjuda kunden ett bonusprogram', 'Fråga om de vill förlänga kontraktet'], answer: 1 },
      { q: 'Vad är "upselling"?', options: ['Att sälja till en ny kund', 'Att uppgradera en befintlig kund till ett högre paket', 'Att sälja produkten till ett högre pris', 'Att ge kunden en gratis provperiod'], answer: 1 },
    ],
  },

  // ── 8. Mål & Motivation ───────────────────────────────────────────────────
  {
    id: 'mal-motivation',
    title: 'Mål & Motivation',
    subtitle: 'Bygg systemet — inte bara viljan',
    icon: '🚀',
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#f97316',
    youtubeId: 'V1bFr2SWP1I',
    theory: `
      <h3>Motivation vs. System</h3>
      <p>Motivation är känsla. System är struktur. Framgångsrika säljare förlitar sig inte på att de "känner för att" ringa samtal — de har ett system som kör oavsett hur de mår.</p>
      <p>James Clear (Atomic Habits): "Du faller inte till nivån på dina mål. Du faller till nivån på dina system."</p>

      <h3>SMART-mål</h3>
      <p>Ett välformulerat mål är:</p>
      <ul>
        <li><strong>S — Specifikt</strong>: "Jag ska ringa 20 samtal per dag" inte "Jag ska ringa fler"</li>
        <li><strong>M — Mätbart</strong>: Du kan räkna eller mäta det</li>
        <li><strong>A — Accepterat</strong>: Du tror verkligen på målet</li>
        <li><strong>R — Relevant</strong>: Det kopplar till dina övergripande mål</li>
        <li><strong>T — Tidsbundet</strong>: "Senast 30 juni" inte "snart"</li>
      </ul>

      <h3>Aktivitetsmål vs. Resultatmål</h3>
      <p>Resultatmål (intäkt, antal affärer) är vad du vill uppnå. Aktivitetsmål är det du faktiskt kontrollerar: samtal per dag, möten per vecka, offerter per månad.</p>
      <p><strong>Fokusera på aktivitetsmålen</strong> — de är dina. Resultaten är en konsekvens av aktiviteterna.</p>
      <p>Exempel: Om din stängningsprocent är 20% och du behöver 4 affärer i månaden → du behöver 20 kvalificerade möten → du behöver ringa 100 samtal.</p>

      <h3>Growth Mindset</h3>
      <p>Carol Dweck's forskning visar att framgångsrika individer har ett "growth mindset" — de ser motgångar som möjligheter att lära sig, inte bevis på att de inte duger.</p>
      <ul>
        <li><strong>Fixed mindset</strong>: "Jag är dålig på cold calling" (permanent)</li>
        <li><strong>Growth mindset</strong>: "Jag är inte bra på cold calling ännu — men jag förbättras varje samtal"</li>
      </ul>

      <h3>Hantera avvisanden</h3>
      <p>Avvisande är en oundviklig del av sälj. Toppsäljare avvisas lika ofta som alla andra — skillnaden är hur de tolkar det.</p>
      <ul>
        <li>Avvisande är inte personligt — de svarar nej på <em>erbjudandet</em>, inte på <em>dig</em></li>
        <li>Sätt ett mål för antalet nej — "Jag behöver 50 nej för att hitta 10 ja"</li>
        <li>Fira aktiviteten, inte bara resultaten</li>
      </ul>

      <h3>Dagliga rutiner för toppsäljare</h3>
      <ul>
        <li>Morgonrutin med tydlig prioritering av dagen</li>
        <li>Dagliga aktivitetsmål (samtal, uppföljningar, nya prospects)</li>
        <li>Daglig reflektion: Vad gick bra? Vad förbättrar jag imorgon?</li>
        <li>Veckovis pipeline-review: Är du på track mot målet?</li>
      </ul>
    `,
    quiz: [
      { q: 'Vad är skillnaden mellan motivation och system?', options: ['Motivation är mer effektivt', 'Motivation är känsla, system är struktur som kör oavsett känsla', 'System är beroende av motivation', 'Det är ingen skillnad'], answer: 1 },
      { q: 'Vad står "T" för i SMART-mål?', options: ['Tydligt', 'Tidsbundet', 'Trovärdigt', 'Testbart'], answer: 1 },
      { q: 'Vad är ett aktivitetsmål?', options: ['Det resultat du vill uppnå', 'Något du inte kan kontrollera', 'De aktiviteter du faktiskt kontrollerar: samtal, möten, offerter', 'Ett mål som din chef sätter'], answer: 2 },
      { q: 'Vem forskar om Growth Mindset?', options: ['Brian Tracy', 'Neil Rackham', 'Carol Dweck', 'Malcolm Gladwell'], answer: 2 },
      { q: 'Vad är ett Growth Mindset i säljkontext?', options: ['Att alltid nå sina mål', 'Att se motgångar som möjligheter att lära sig och förbättras', 'Att ha höga mål', 'Att jobba fler timmar'], answer: 1 },
      { q: 'Varför bör du fokusera på aktivitetsmål snarare än resultatmål?', options: ['Resultatmål är oviktiga', 'Aktiviteter är det du faktiskt kontrollerar — resultaten är en konsekvens', 'Det är enklare att mäta', 'Din chef kräver det'], answer: 1 },
      { q: 'Hur bör du tolka ett avvisande från en kund?', options: ['Som ett personligt misslyckande', 'Som ett tecken på att produkten är fel', 'Som ett nej på erbjudandet, inte på dig som person', 'Som en anledning att ge rabatt'], answer: 2 },
      { q: 'Vad ingår i en effektiv morgonrutin för säljare?', options: ['Kontrollera sociala medier', 'Tydlig prioritering av dagen och dagliga aktivitetsmål', 'Läsa e-post i en timme', 'Vänta på inbound-leads'], answer: 1 },
      { q: 'Vilket påstående representerar ett "Fixed Mindset"?', options: ['"Jag förbättras varje samtal"', '"Det finns alltid något att lära"', '"Jag är dålig på cold calling och det förändras inte"', '"Avvisanden gör mig starkare"'], answer: 2 },
      { q: 'Vad menade James Clear med "Du faller till nivån på dina system"?', options: ['Att system alltid slår mål', 'Att dina dagliga vanor och strukturer avgör resultaten — inte ambition', 'Att teknologi är viktigast', 'Att du aldrig uppnår dina mål'], answer: 1 },
    ],
  },

];

module.exports = blocks;
