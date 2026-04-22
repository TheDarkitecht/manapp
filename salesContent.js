// salesContent.js
// All sales training blocks — theory, YouTube video, and quiz questions.
// Practice data (quickVersion, roleplays, mission, reflections) merges from blockPractice.js.

const practiceData = require('./blockPractice');

const blocks = [

  // ── 1. Inledning — Vad Sälj Egentligen Är ─────────────────────────────────
  {
    id: 'inledning',
    title: 'Inledning — Vad Sälj Egentligen Är',
    subtitle: 'Försäljning är mer än du tror — och viktigare än någonsin',
    icon: '🎭',
    gradient: 'linear-gradient(135deg, #1e293b, #334155)',
    color: '#1e293b',
    youtubeId: null, // Byt till riktigt YouTube-ID när Joakims video är inspelad
    teaser: `
      <h3>Välkommen. Du är redan säljare — visste du det?</h3>
      <p>Om du någon gång har bett din partner om middag på en viss restaurang, övertalat ditt barn att borsta tänderna, eller fått en chef att godkänna en ledig fredag — då har du sålt. Allt sälj handlar om det samma: att påverka någon att agera.</p>
      <p>Det här blocket är kartan över hela yrket. Varför det finns, varför det alltid kommer finnas, och varför det kräver en skickligare människa idag än någonsin förut. Börja här — innan tekniken, innan metoderna. Innan allt annat.</p>
    `,
    theory: `
      <h3>Sälj är inte vad du tror</h3>
      <p>De flesta tänker på "sälj" som en telefonförsäljare, en bilhandlare eller någon som trycker produkter på folk som inte vill ha dem. Den bilden är föråldrad — och faktiskt grundfalsk.</p>
      <p>Sälj är något mycket större: <strong>konsten att påverka andra människor att agera</strong>. Det kan vara en produkt. Det kan vara en tjänst. Det kan vara en idé, en vision, en förändring, ett val. Allt som kräver att någon annan rör sig från punkt A till punkt B är sälj.</p>
      <p>Och när du förstår det — att sälj är ett verktyg för att få världen att röra sig — då slutar du skämmas för yrket. Det är en av de mest värdefulla kompetenser en människa kan ha.</p>

      <h3>Alla säljer — varje dag</h3>
      <p>Politiker säljer en vision om framtiden. Skådespelare säljer en roll de inte är. Läkare säljer en behandlingsplan till en patient som hellre undviker nålar. En förälder säljer grönsaker till en treåring som vill ha godis. En anställd säljer sig själv varje gång hen förhandlar lön eller ber om ett projekt.</p>
      <p>De som påstår att "jag säljer inte" — säljer ofta hårdast av alla. Att vägra spela spelet <em>är</em> ett sätt att spela det. Att positionera sig som "ren" eller "oberoende" eller "bara intresserad av sanningen" är en av de skickligaste försäljningarna som finns — för den som lyckas köper du omedelbart.</p>
      <p>Poängen är inte att alla är lömska. Poängen är att <strong>påverkan är grunden i all mänsklig interaktion</strong>. Du kan välja att lära dig den — eller bli påverkad av andra utan att förstå hur det går till.</p>

      <h3>Masker, behov och begär</h3>
      <p>Människor bär masker. Det är inte cyniskt — det är mänskligt. Vi visar olika sidor av oss själva i olika sammanhang: en sida för chefen, en för föräldrarna, en för barnen, en för bästa vännen. Vi är inte oärliga — vi navigerar sociala rum.</p>
      <p>Bakom varje mask finns samma grundmaterial: <strong>behov och begär</strong>. Behov av trygghet, av tillhörighet, av status, av mening, av kontroll. Begär efter uppskattning, efter frihet, efter resultat, efter att vara tillräcklig.</p>
      <p>En skicklig säljare läser av vilken mask som är på just nu — och vilket behov som ligger bakom. Du säljer inte produkter. Du hjälper människor att ta ett steg mot det de redan vill ha, men inte vet hur de ska få.</p>

      <h3>2500 år av retorik — konsten att övertyga</h3>
      <p>Du står inte i början på någonting. Konsten att övertyga är en av mänsklighetens äldsta discipliner. Redan 500 f.Kr. började grekerna systematiskt studera hur språk och argument påverkar människor.</p>
      <p>Aristoteles formulerade de tre grundpelarna i påverkan — och de har knappt förändrats på 2 300 år:</p>
      <ul>
        <li><strong>Ethos</strong> — trovärdighet. Vem är du? Varför ska jag lyssna på dig? En säljare utan ethos är dömd att misslyckas, oavsett hur bra produkten är.</li>
        <li><strong>Pathos</strong> — känslor. Alla köp är först emotionella. Människor köper med känslan och rättfärdigar med logiken. En säljare som inte rör vid känslan rör inte vid plånboken.</li>
        <li><strong>Logos</strong> — logik. Argumenten, bevisen, ROI:n. Utan logos står kunden ensam efteråt med ett beslut de inte kan försvara för sig själva eller sin chef.</li>
      </ul>
      <p>Cicero, Quintilianus, Machiavelli, Dale Carnegie, Cialdini — varje generation har byggt vidare på samma grund. När du läser en modern säljbok läser du i själva verket en uppdaterad version av Aristoteles <em>Retorik</em>. Det är trösterikt. Du är inte ensam. Du har 2 500 års kunskap i ryggen.</p>

      <h3>Utan sälj överlever inget företag</h3>
      <p>En vanlig missuppfattning: "det är produkten som säljer sig själv om den är bra nog." Det är romantiskt — och falskt. Världen är full av fantastiska produkter som aldrig nådde ut eftersom ingen sålde dem. Och full av medelmåttiga produkter som blev jättar eftersom någon var skicklig nog att sälja dem.</p>
      <p>Siffrorna talar sitt tydliga språk: <strong>ungefär hälften av alla nystartade företag finns inte kvar efter fem år.</strong> De har inte gått i konkurs för att produkten var dålig. De gick under för att de inte lyckades sälja tillräckligt — eller för sent, eller till fel kund, eller för billigt.</p>
      <p>Varje företag med få undantag är i grunden ett säljföretag. Antingen säljer de varor, tjänster, eller — som investerare och fonder — kapital och idéer. Det finns väldigt få organisationer som existerar utan att någon någonstans i kedjan säljer något till någon.</p>

      <h3>Säljare kommer alltid behövas</h3>
      <p>Flera hundra tusen människor i Sverige arbetar direkt med sälj i någon form: B2B-säljare, telefonförsäljare, key account managers, butikssäljare, konsulter, fastighetsmäklare, rekryterare, försäkringsrådgivare. Listan är lång — och den växer.</p>
      <p>Varje år hörs samma profetia: "AI kommer ersätta säljare." På 90-talet sa man att e-handeln skulle göra säljare överflödiga. På 2010-talet var det sociala medier. På 2020-talet är det AI. Säljyrket har begravts många gånger — och aldrig dött.</p>
      <p>Anledningen är enkel: <strong>människor köper av människor de litar på.</strong> Teknik förändrar vilka verktyg en säljare använder. Den förändrar inte grunden — att förtroende är valutan i varje affär som spelar roll.</p>

      <h3>Kunden har tagit över halva säljprocessen</h3>
      <p>Däremot har något fundamentalt förändrats: kunden kommer bättre förberedd idag än någonsin. Tidigare var säljaren informationsbäraren — den enda källan till kunskap om produkten, priset, alternativen. Idag googlar kunden svaret på 30 sekunder.</p>
      <p>Forskning från CEB/Gartner visar att <strong>B2B-kunder idag är klara med över 60% av köpresan innan de ens kontaktar en säljare</strong>. De har läst recensioner, jämfört priser, läst case studies, ställt frågor i forum och pratat med kollegor. När de väl sitter i mötet kan de ofta mer om vissa detaljer än säljaren själv.</p>
      <p>Det betyder att den gamla säljrollen — "informationsbärare som guidar kunden" — är död. Men en ny, mer krävande roll har tagit dess plats.</p>

      <h3>Det krävs en skickligare säljare idag</h3>
      <p>Paradoxalt: ju mer kunden kan själv, desto skickligare måste säljaren vara. Varför? För att kunden inte längre behöver dig för information. De behöver dig för något svårare:</p>
      <ul>
        <li><strong>Insikt</strong> — du måste ge dem perspektiv de inte redan har. Utmana deras antaganden. Säga det ingen annan sa.</li>
        <li><strong>Tolkning</strong> — de har 50 flikar öppna och är förvirrade. Du måste hjälpa dem förstå vad som faktiskt spelar roll och varför.</li>
        <li><strong>Förtroende</strong> — de har blivit brända, sålda fel saker, sett pretentiösa pitchar. Du måste vara den som är raktifram, ärlig och värd att lita på.</li>
        <li><strong>Resultat</strong> — de bryr sig inte om din produkt. De bryr sig om vad den gör för dem. Kan du inte översätta produkt → resultat, är du irrelevant.</li>
      </ul>
      <p>Den säljare som klarar det här — som är del coach, del rådgivare, del psykolog, del expert — är mer värdefull idag än någonsin. Medelmåttan är utraderad. Spetsen är kungar.</p>

      <h3>Ingen blir bra utan träning — inte ens Messi</h3>
      <p>Här är en sanning som få säljchefer pratar om: <strong>säljskicklighet byggs likadant som all annan skicklighet — genom strukturerad träning.</strong> Ingen annan världsklassprestation uppstår spontant. Varför skulle sälj vara annorlunda?</p>
      <ul>
        <li><strong>Grekerna</strong> tränade retorik. Dagligen. I åratal. Aristoteles, Cicero, Demostenes — de repeterade, reciterade och byggde argument tills det satt i ryggmärgen.</li>
        <li><strong>Messi</strong> tränade fotboll. Samma rörelse, tusentals gånger. Skottet, passningen, dribblingen. Talangen är toppen av ett berg av repetition.</li>
        <li><strong>Kirurger</strong> tränar ingrepp innan de skär i en människa. Piloter flyger simulatorer i hundratals timmar. Militärer repeterar scenarier tills de agerar utan att tänka.</li>
      </ul>
      <p>Men säljare? De flesta säljare i världen lär sig genom att <em>misslyckas på riktiga kunder</em>. Det är som att låta en pilot lära sig flyga genom att kraschlanda. Det är dyrt — och ofta i onödan.</p>
      <p>Att bli en skicklig säljare kräver exakt samma sak som vilken annan expertis som helst: <strong>medveten, strukturerad träning — om och om igen — med rätt material, rätt verktyg och rätt miljö.</strong></p>

      <h3>Rätt resurser, rätt verktyg, rätt miljö — det är allt</h3>
      <p>Varför misslyckas de flesta säljare att utvecklas, trots år i yrket? Det är sällan brist på vilja. Det är brist på <strong>rätt förutsättningar</strong>:</p>
      <ul>
        <li><strong>Rätt resurser</strong> — strukturerat material som faktiskt fungerar. Inte en spridd samling YouTube-klipp och en bok någon tipsade om. En samlad utbildning, byggd av någon som gjort jobbet.</li>
        <li><strong>Rätt verktyg</strong> — övningar, scripts, rollspel, AI-coach som svarar när som helst. Reps och feedback. Utan feedback bygger du dåliga vanor snabbare än bra.</li>
        <li><strong>Rätt miljö</strong> — tillgänglighet 24/7. Det går inte att boka en Messi-tränare när du vill öva på en måndagskväll. En plattform gör det. Du kör när du kan.</li>
      </ul>
      <p>Det är precis det du har framför dig nu. 20 block, AI-coachen Jocke, säljordboken, prov efter varje block. Inte för att vi säljer information — den finns gratis på internet. Utan för att vi säljer <strong>strukturen som gör att du faktiskt tränar</strong>. Det är skillnaden mellan att läsa om att spela piano och att faktiskt öva.</p>
      <p>Du kommer inte bli Messi på en vecka. Men på sex månader av strukturerad träning kommer du vara en helt annan säljare än den du är idag. Det är ett löfte — om du gör jobbet.</p>

      <h3>Vad du kommer lära dig här</h3>
      <p>Det här är inte en kurs i "10 säljfraser som stänger affärer." Det är en komplett utbildning i att bli en skicklig, mänsklig och långsiktigt framgångsrik säljare — från första intrycket till mental styrka. 20 block som täcker allt från prospektering till AI-verktyg till vilka böcker du bör läsa efter det här.</p>
      <p>Du kommer lära dig av någon som gjort jobbet — inte läst om det. Joakim Jaksen har 22+ år i branschen, 120 miljoner SEK i säljresultat, och över 500 tränade säljare. Det är materialet han önskar att han haft när han började.</p>

      <h3>Ett sista ord innan vi börjar</h3>
      <p>Sälj är inte ett fult ord. Det är inte en kompromiss mellan "vad jag egentligen vill göra" och "hur jag försörjer mig". Sälj är konsten att hjälpa människor fatta beslut som gör deras liv bättre — och få betalt för att du är bra på det.</p>
      <p>Välkommen. Nu börjar vi.</p>
    `,
    quiz: [
      { q: 'Vad är sälj i sin mest grundläggande form enligt blocket?', options: ['Att trycka produkter på folk', 'Konsten att påverka andra människor att agera', 'Att övertala någon mot deras vilja', 'Endast B2B-försäljning'], answer: 1 },
      { q: 'Vem av följande "säljer" enligt blocket?', options: ['Endast säljare på företag', 'Politiker, skådespelare, föräldrar — alla som vill påverka andra', 'Bara människor i reklambranschen', 'Endast de som får provision'], answer: 1 },
      { q: 'Vilka tre grundpelare i påverkan formulerade Aristoteles?', options: ['Ord, Röst, Kropp', 'Ethos, Pathos, Logos', 'Produkt, Pris, Plats', 'Behov, Värde, Kostnad'], answer: 1 },
      { q: 'Vad är Ethos i Aristoteles modell?', options: ['Känslor och empati', 'Trovärdighet — vem du är och varför du ska lyssnas på', 'Logik och argument', 'En retorisk teknik'], answer: 1 },
      { q: 'Hur gammal är disciplinen retorik (konsten att övertyga)?', options: ['Från 1900-talet', 'Cirka 500 år', 'Över 2 000 år — redan studerat i antikens Grekland', '50-60 år'], answer: 2 },
      { q: 'Ungefär hur stor andel av nystartade företag finns inte kvar efter fem år?', options: ['Under 10%', 'Ungefär hälften', '90%', 'Knappt någon'], answer: 1 },
      { q: 'Varför kommer säljare alltid behövas enligt blocket?', options: ['Eftersom tekniken inte fungerar', 'För att människor köper av människor de litar på — förtroende är valutan i varje affär', 'Eftersom produkter inte säljer sig själva', 'På grund av lagkrav'], answer: 1 },
      { q: 'Hur stor andel av B2B-köpresan har kunden ofta gjort innan de ens träffar en säljare?', options: ['Under 10%', 'Över 60%', 'Exakt 50%', '30%'], answer: 1 },
      { q: 'Vad är konsekvensen av att kunden har tagit över halva säljprocessen?', options: ['Säljare behövs inte längre', 'Det krävs en skickligare säljare — som ger insikt, tolkning, förtroende och resultat', 'Alla priser måste sänkas', 'Säljare ska bara skicka offerter'], answer: 1 },
      { q: 'Vad betyder det när någon säger "jag säljer inte"?', options: ['De är helt ärliga', 'Det är ofta i sig en skicklig försäljning — ett sätt att bygga trovärdighet', 'De har inga produkter', 'De förstår yrket'], answer: 1 },
      { q: 'Hur bygger en säljare skicklighet enligt blocket?', options: ['Genom talang — det är medfött', 'Genom strukturerad träning med rätt resurser, verktyg och miljö — precis som idrottare och retoriker', 'Genom att misslyckas på riktiga kunder tills det sätter sig', 'Genom att läsa en säljbok'], answer: 1 },
    ],
  },

  // ── 2. Första Intrycket ───────────────────────────────────────────────────
  {
    id: 'forsta-intrycket',
    title: 'Första Intrycket',
    subtitle: 'Skapa förtroende på sju sekunder',
    icon: '🤝',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#6366f1',
    youtubeId: null,
    teaser: `
      <h3>Du har sju sekunder. Använd dem.</h3>
      <p>Harvard-forskaren Amy Cuddy har visat att människor bildar ett första intryck på dig inom 7 sekunder. Två frågor besvaras automatiskt: <em>"Kan jag lita på den här personen?"</em> och <em>"Är de kompetenta?"</em> Allt du säger efteråt tolkas genom filtret som sattes i de första sju.</p>
      <p>Det här blocket ger dig Mehrabians regel, det perfekta handslaget, den vetenskapliga öppningen — och exakta fraser för både fysiska möten och de kritiska 10 sekunderna i telefonen. Ditt jobb är att <strong>äga de första sju sekunderna</strong>, inte råka ha dem.</p>
    `,
    theory: `
      <h3>Kärnan: första intryck skapas på 7 sekunder — och ändras sällan</h3>
      <p>Harvard-forskaren Amy Cuddy har upprepat visat att människor bildar ett första intryck inom cirka 7 sekunder. Under den tiden besvarar hjärnan automatiskt två frågor: <em>"Kan jag lita på dig?"</em> (värme) och <em>"Är du kompetent?"</em> (styrka). Båda måste besvaras med "ja" för att du ska kunna sälja något.</p>
      <p>Det obehagliga faktumet: allt du säger <strong>efter</strong> de första 7 sekunderna tolkas genom filtret som sattes i de första 7. Om kunden bestämt sig för att du verkar desperat — kommer ditt bästa argument låta som en efterkonstruktion. Om hen bestämt sig för att du är trovärdig — kan du göra små misstag utan att tappa marken.</p>
      <p>Det 90% missar: de lägger all energi på att förbättra vad de säger. De optimerar 7% av signalen.</p>

      <h3>Problemet: hur genomsnittssäljare tappar första mötet</h3>
      <p>Klassiska tecken:</p>
      <ul>
        <li>Slappt handslag, ögonkontakt bruten direkt, mumlar namnet.</li>
        <li>Öppnar mötet med: <em>"Så, lite om oss — vi grundades 2015, vi har 45 kunder, och…"</em></li>
        <li>Tar fram telefonen när kunden pratar. Kollar klockan.</li>
        <li>Fyller tystnader med skratt och "vad spännande" på allt.</li>
        <li>Låter röstens sista stavelse gå uppåt — talar i frågor även när hen påstår.</li>
      </ul>
      <p>Konsekvensen: kunden noterar (omedvetet) att något inte stämmer. Ger säljaren artigt 45 minuter. Ghostar efteråt.</p>

      <h3>Ramverk 1: Mehrabians 7-38-55</h3>
      <p>Psykologen Albert Mehrabians klassiska studie: hur vi uppfattas i emotionella sammanhang beror på tre saker:</p>
      <ul>
        <li><strong>7%</strong> — vad du faktiskt säger (orden).</li>
        <li><strong>38%</strong> — hur du säger det (röst, tempo, tonläge).</li>
        <li><strong>55%</strong> — ditt kroppsspråk (hållning, ögonkontakt, gester).</li>
      </ul>
      <p><strong>93% av ditt intryck är icke-verbalt.</strong> Jobbar du bara på vad du säger, optimerar du 7%. Det är därför en bok om kroppsspråk slår en bok om säljfraser.</p>
      <p>Obs: Mehrabians tal gäller när ord och kroppsspråk är i konflikt — det är inte ett universellt "93% av kommunikation är icke-verbal"-axiom. Men principen håller: när rösten och kroppen säger en sak och orden säger en annan, litar kunden på kroppen. Varje gång.</p>

      <h3>Ramverk 2: Kroppsspråk som bygger förtroende</h3>
      <p><strong>1. Blickkontakt (60–70%)</strong><br>
      För lite = ointresse eller lögn. För mycket (90%+) = stirrande, aggressivt. 60–70% är sweet spot. Bryt kontakten naturligt när du tänker — inte när du pratar.</p>
      <p><strong>2. Öppen hållning</strong><br>
      Armar längs sidan, axlar nedåt, händer synliga. Korsade armar signalerar defensivitet även om du bara fryser. Lösning: ha kaffekoppen i handen istället.</p>
      <p><strong>3. Handslaget</strong><br>
      Fast, inte krossande. Tre sekunder. En ordentlig vertikal skakning. Fuktiga händer? Torka diskret på byxorna först.</p>
      <p><strong>4. Luta dig lätt framåt (5–10°)</strong><br>
      Signalerar engagemang. Lutar du dig bakåt = ointresserad eller oseriös. Lutar du dig för långt framåt = intensiv, gränsar till aggressivt.</p>
      <p><strong>5. Duchenne-leende</strong><br>
      Franska neurologen Duchennes upptäckt: ett äkta leende involverar ögonen (kråkfötter bildas). Ett fake leende är bara munnen. Människor läser skillnaden på millisekunder — omedvetet men exakt.</p>

      <h3>Ramverk 3: Mirroring — Cialdinis princip i praktiken</h3>
      <p>Robert Cialdinis princip om "liking": vi gillar människor som liknar oss. Mirroring är den snabbaste metoden att omedvetet skapa den känslan.</p>
      <ul>
        <li>Kunden pratar lugnt → matcha lugnt. Börja inte prata snabbt för att du är nervös.</li>
        <li>Kunden lutar sig bakåt → lämna utrymme. Inte buta in.</li>
        <li>Kunden använder ett specifikt ord ("vi kämpar med kostnadskontroll") → återanvänd samma ord. Inte "ekonomi".</li>
      </ul>
      <p>Regel: subtilt. Överdriven mirroring är kusligt. 2–3 sekunders fördröjning räcker.</p>

      <h3>Ramverk 4: Öppningens 5 steg (telefonsäljarens playbook)</h3>
      <p>I telefonsälj har du cirka 10 sekunder innan kunden bestämmer om hen lyssnar vidare. Ännu snävare än fysiskt möte. Rösten är ditt ENDA verktyg.</p>
      <ol>
        <li><strong>Hälsning & namn</strong> — ditt förnamn + efternamn + var du ringer från. Tydligt.</li>
        <li><strong>Intresseväckaren</strong> — en mening, kopplad till kundens värld.</li>
        <li><strong>Aktiverande fråga</strong> — en enkel fråga som sätter kunden i dialog.</li>
        <li><strong>Bryggan till behovsanalys</strong> — övergång till frågefasen.</li>
        <li><strong>Rapport-moment</strong> — använd kundens namn, visa att du lyssnar.</li>
      </ol>

      <h3>Intresseväckaren — formeln som öppnar dörren</h3>
      <p>En stark intresseväckare:</p>
      <ul>
        <li>Kopplar till något kunden bryr sig om (kostnad, trygghet, tid, bekvämlighet).</li>
        <li>Skapar nyfikenhet: <em>"Vad menar de?"</em></li>
        <li>Är kort — en mening, max två.</li>
        <li>Använder "du" eller "ni" — aldrig bara "vi".</li>
      </ul>
      <p><strong>Exempel — telefonsälj:</strong> <em>"Hej Anna, jag ringer för att de flesta vi pratar med faktiskt betalar mer än de behöver — och ofta utan att veta om det."</em></p>
      <p>Kunden undrar: <em>"Vad menar de? Gäller det mig?"</em> — och lyssnar ytterligare 30 sekunder. Det är allt du behöver.</p>

      <h3>Före vs efter — telefonöppningen</h3>
      <p><strong>FÖRE:</strong></p>
      <blockquote>
        <p>"Hej! Jag heter Kalle och ringer från Företag X. Vi erbjuder lösningar för … eh … har du några minuter?"</p>
      </blockquote>
      <p><strong>EFTER:</strong></p>
      <blockquote>
        <p>"Hej Anna, Kalle Ström heter jag — ringer från Jaksen Sälj. Anledningen: de flesta säljchefer jag pratar med betalar för ett CRM-system som deras säljare ändå inte använder. Det stämmer väl att ni kör Hubspot idag?"</p>
      </blockquote>
      <p>Samma säljare. Samma produkt. 10 sekunder. Totalt olika kvalitet på första intryck.</p>

      <h3>Live-scenarier</h3>
      <p><strong>Scenario 1 — du kommer till mötet och kunden är stressad/irriterad:</strong></p>
      <ul>
        <li>❌ FEL: Kör på agendan. Ignorera.</li>
        <li>✅ RÄTT: <em>"Du verkar ha en hektisk dag — är det bättre om vi tar 15 min istället för 30?"</em> Respekt skapar förtroende. De säger ofta "nej, det går bra" och du äger rummet.</li>
      </ul>
      <p><strong>Scenario 2 — telefonsamtal, kunden säger direkt "jag är inte intresserad":</strong></p>
      <ul>
        <li>❌ FEL: "Men hör bara på detta …"</li>
        <li>✅ RÄTT: <em>"Det hade jag antagit — jag har inte ens introducerat varför. Om jag får 30 sekunder så kan du avgöra själv om det är värt att lyssna på."</em> 80% säger okej.</li>
      </ul>
      <p><strong>Scenario 3 — videosamtal, du märker att kunden ser stel ut:</strong></p>
      <ul>
        <li>❌ FEL: Pressa på din agenda.</li>
        <li>✅ RÄTT: <em>"Jag märker att jag pratar mycket — vad är det viktigaste för dig att få ut av den här halvtimmen?"</em> Flyttar bollen, skapar värme.</li>
      </ul>

      <h3>De tre vanligaste första-intrycks-misstagen</h3>
      <ol>
        <li><strong>Öppna med dig själv.</strong> "Vi är Företag X och vi grundades …" — kunden tappar intresset på 3 sekunder.</li>
        <li><strong>Frånvarande ögonkontakt.</strong> Kolla mobilen, titta ner, skift runt i rummet. Säger omedvetet "jag är inte här".</li>
        <li><strong>Röst som går uppåt i slutet.</strong> Gör påståenden till frågor. Signalerar osäkerhet. Öva att avsluta meningar med rösten neutral eller svagt nedåt.</li>
      </ol>

      <h3>Tonläge & tempo — rösten är 38%</h3>
      <ul>
        <li><strong>Tempo</strong> — naturligt och lugnt. Matcha kundens gradvis.</li>
        <li><strong>Tonläge</strong> — varm, trygg röst skapar förtroende. Hög, pressad = stress. Andas ut innan du ringer.</li>
        <li><strong>Leendet hörs</strong> — ler du när du ringer? Det hörs. Kunder reagerar positivt utan att förstå varför.</li>
        <li><strong>Pauser</strong> — var inte rädd för tystnad. En kort paus efter en fråga signalerar att du faktiskt väntar på svaret.</li>
      </ul>

      <h3>Handling: kör det här idag</h3>
      <ol>
        <li><strong>Spela in nästa telefonsamtal</strong> och lyssna tillbaka. Fokus: låter du som någon du skulle vilja prata med?</li>
        <li><strong>Skriv din egen intresseväckare</strong> — en mening, specifik för din bransch. Öva den högt 20 gånger.</li>
        <li><strong>Testa Duchenne-leendet i spegeln.</strong> Lär dig skillnaden. Använd det fysiskt nästa möte.</li>
        <li><strong>Ta fram din telefon</strong> innan mötet. Stäng av den helt. Lägg i väskan. Ögonkontakten blir 100% bättre direkt.</li>
        <li><strong>Öva rösten</strong>: spela in tre meningar där du påstår. Lyssna: går tonen uppåt i slutet? Öva nedåt/neutralt.</li>
      </ol>

      <h3>24-timmarsövningen</h3>
      <p>Imorgon: spela in dig själv säga din öppning — både i telefon och om möjligt på video. Lyssna. Se. Notera tre konkreta saker att förbättra. Använd den förbättrade versionen i nästa verkliga möte.</p>

      <h3>Sammanfattning — fem punkter</h3>
      <ul>
        <li>Första intrycket sätts på 7 sekunder. Allt efteråt tolkas genom det filtret.</li>
        <li>93% av intrycket är icke-verbalt. Optimera röst och kroppsspråk, inte bara orden.</li>
        <li>Öppna med kunden, inte med dig själv. En observation + öppen fråga.</li>
        <li>I telefon: din röst är allt. Le, varm ton, lagom tempo, tystnad efter frågor.</li>
        <li>Spela in dig själv. Det du hör/ser är vad kunden hör/ser.</li>
      </ul>
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

  // ── 3. Tonfall & Psykologisk Påverkan ─────────────────────────────────────
  {
    id: 'tonfall',
    title: 'Tonfall & Psykologisk Påverkan',
    subtitle: 'Hur du säger det är viktigare än vad du säger',
    icon: '🎙️',
    gradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    color: '#7c3aed',
    youtubeId: null, // Byt till riktigt YouTube-ID när Joakims video är inspelad
    teaser: `
      <h3>Konsten att få folk att förstå</h3>
      <p>Orden du använder är viktiga — men <strong>hur</strong> du säger dem är ofta ännu viktigare. Inom försäljning, förhandling och psykologisk påverkan kan rätt tonfall avgöra om motparten öppnar sig eller stänger ner. De mest framgångsrika förhandlarna i världen — från FBI-förhandlare till säljtränare i toppklass — är eniga: tonfall är ett av de mest underskattade verktygen.</p>
      <p>I det här blocket får du de nio strategiska tonfall som gång på gång visat sig mest effektiva i verkliga samtal — plus tio psykologiska påverkans-tekniker som toppförhandlare använder dagligen. Konkreta exempel, direkt tillämpbart, samma kväll.</p>
    `,
    theory: `
      <h3>Det handlar inte om konsten att tala</h3>
      <p>Det handlar inte om konsten att tala. Inte heller om konsten att få folk att lyssna. Utan om <strong>konsten att få folk att förstå</strong>. Det är något helt annat — och det är det som skiljer en medioker säljare från en skicklig.</p>
      <p>Med rätt tonfall kan du bygga förtroende på sekunder, sänka motpartens försvar, framkalla ny information och leda samtalet mot beslut utan att det känns pressande. De bästa växlar dynamiskt mellan 3–4 tonfall i samma samtal. Du behöver inte vara en född skådespelare — du behöver bara vara medveten.</p>

      <h3>Det här är inte nytt — det är 2 500 år gammalt</h3>
      <p>Innan du tänker att allt det här är "moderna säljtrix": låt oss sätta det i sitt sammanhang. I Aten, omkring 400 f.Kr., satt en ful liten man på torget och låtsades veta ingenting. Han frågade de mäktiga bagarna, politikerna och generalerna helt enkla frågor, som om han inte förstod — och fick dem att avslöja sin egen okunnighet. Hans namn var <strong>Sokrates</strong>, och hans metod kallades <em>majevtik</em> (barnmorskekonsten — han "födde fram" tankar hos andra).</p>
      <p>Sokrates "Förvirrade ton" är exakt samma verktyg som Chris Voss lär ut 2 500 år senare. Det fungerar för att mänsklig psykologi inte har förändrats. Vi vill fortfarande rätta den som har fel. Vi vill fortfarande förklara för den som inte förstår. Vi vill fortfarande fylla tystnaden efter en laddad fråga.</p>
      <p><strong>Platon</strong> varnade för de <em>sofister</em> som använde retorik för att vinna debatter oavsett sanning. <strong>Aristoteles</strong> svarade med att systematisera hela fältet i <em>Retoriken</em> — ethos (trovärdighet), pathos (känsla), logos (logik). Varje modernt säljblock du läser är en omformulering av hans arbete.</p>
      <p><strong>Cicero</strong>, Roms mest berömda talare, skrev i <em>De Oratore</em> att "rösten är själens spegel". Han tränade skådespelare och advokater att variera röstläge, tempo och tystnad — samma verktyg vi kallar "tonfall" idag. Han förstod att en välskriven mening, levererad platt, är döfödd.</p>
      <p>Du står på 2 500 års axlar. Sokrates, Platon, Aristoteles, Cicero, Quintilianus, Machiavelli, Carnegie, Cialdini, Voss — alla byggde samma verktygslåda. Du tränar inte ett modernt trick. Du tränar en av mänsklighetens äldsta konster.</p>

      <h3>De nio strategiska tonfallen</h3>
      <p>Varje tonfall har sitt eget syfte. Lär dig känna igen när vilket passar — och träna tills det sitter i ryggmärgen.</p>

      <h3>1. Nyfiken ton (Curiosity tone)</h3>
      <p><strong>Effekt:</strong> Avväpnar, gör dig genuint intresserad och får motparten att fylla i.<br>
      <strong>När använda:</strong> Inledande frågor, mirroring, presumptive statements.</p>
      <ul>
        <li><em>"Går det inte …?"</em></li>
        <li><em>"Jaså, så ni bytte nyligen …?"</em></li>
        <li><em>"Så XYZ är de ni är nöjda med?"</em></li>
      </ul>

      <h3>2. Empatisk / Varm ton (Tactical empathy)</h3>
      <p><strong>Effekt:</strong> Skapar trygghet och förtroende, sänker kundens garden.<br>
      <strong>När använda:</strong> Vid oro, invändningar, känsloladdade svar.</p>
      <ul>
        <li><em>"Det låter som att du vill ha trygghet, och det är helt förståeligt."</em></li>
        <li><em>"Jag kan höra att det här är viktigt för dig."</em></li>
        <li><em>"Jag kan förstå det — du är faktiskt inte den första som säger så. Det börjar bli vanligare har jag märkt."</em></li>
      </ul>

      <h3>3. Utmanande ton (Skeptical / Disbelief)</h3>
      <p><strong>Effekt:</strong> Får motparten att försvara sig och avslöja mer information.<br>
      <strong>När använda:</strong> Vid prisdiskussioner, när du anar att kunden håller tillbaka info.</p>
      <ul>
        <li><em>"Det låter verkligen som att det här inte ger hela bilden …?"</em></li>
        <li><em>"Får ni verkligen billigare än de själva köper in elen för?"</em></li>
      </ul>

      <h3>4. Förvirrad ton (Confused tone)</h3>
      <p><strong>Effekt:</strong> Triggar kundens behov av att förklara, avväpnar din "säljstämpel".<br>
      <strong>När använda:</strong> När kunden är vag och säger "näemen jag vill nog stanna", eller försöker undvika att svara.</p>
      <ul>
        <li><em>"Stanna …? Med … XYZ …. Det rörliga?"</em></li>
        <li><em>"Avvakta …? Du menar …? Tills …?"</em></li>
        <li><em>"Nöjda …? Jag kanske missförstår — vad är det ni är mest nöjda med?"</em></li>
        <li><em>"Inte går att göra något …? Hur menar du då …?"</em></li>
      </ul>
      <p>Den förvirrade tonen är ett av säljarens mest underskattade verktyg. Den sätter kunden i förklarande-läge — och den som förklarar tappar greppet om sina invändningar.</p>
      <p>Det här är, som sagt, Sokrates-metoden. Columbo-detektiven i TV-serien på 70-talet gjorde samma sak: han klädde sig rörigt, glömde saker, kliade sig i huvudet — och fick mördarna att förklara bort sig. <em>"Ursäkta, en sak till innan jag går, jag förstår inte riktigt …"</em> Den svagaste mannen i rummet hade mest kontroll. Det är inte en slump att serien gick i 35 år.</p>

      <h3>5. Skojsam / Lättsam ton (Playful tone)</h3>
      <p><strong>Effekt:</strong> Skapar rapport, gör samtalet roligare och mindre formellt.<br>
      <strong>När använda:</strong> I början av samtal, vid lätta invändningar, i dialog generellt.</p>
      <ul>
        <li><em>"Haha, det låter ju nästan som att ni betalar för grannens el också."</em></li>
        <li><em>"Jag blir nästan avundsjuk på ert avtal — eller kanske inte …"</em></li>
      </ul>

      <h3>6. No-oriented ton (Permission tone)</h3>
      <p><strong>Effekt:</strong> Kunden känner sig tryggare att säga "nej" än "ja" → öppnar dörrar.<br>
      <strong>När använda:</strong> När du vill ha tid, chans att presentera, eller undvika direkt avslag.</p>
      <ul>
        <li><em>"Skulle det vara dumt att bara kika på siffrorna?"</em></li>
        <li><em>"Är det orimligt att bara kolla hur vi kan hjälpa er sänka priset?"</em></li>
      </ul>
      <p>Tekniken kommer från Chris Voss: människor är rädda att bli fångade av ett "ja". Ger du dem en öppning att säga "nej", slappnar de av — och svarar faktiskt ja.</p>

      <h3>7. Autoritativ / Trygg ton (Authority tone)</h3>
      <p><strong>Effekt:</strong> Signalerar expertis, ger kunden trygghet i ditt budskap.<br>
      <strong>När använda:</strong> När du summerar, presenterar lösning, eller avslutar.</p>
      <ul>
        <li><em>"Det här är den mest populära lösningen bland hushåll som vill ha lägst pris över tid."</em></li>
        <li><em>"Vi vet av erfarenhet att det här fungerar."</em></li>
        <li><em>"Så säker är jag på att det här fungerar, så i ärlighetens namn — du får väldigt förmånliga elpriser och väldigt trygga villkor. Det är värt att prova på i alla fall, eller hur?"</em></li>
      </ul>

      <h3>8. Sammanfattande ton (Teacher / Advisor)</h3>
      <p><strong>Effekt:</strong> Binder ihop samtalet, visar att du lyssnat, guidar kunden mot beslut.<br>
      <strong>När använda:</strong> Inför avslut, när du förklarar komplexa val.</p>
      <ul>
        <li><em>"Så om jag förstått rätt vill ni ha trygghet, men utan för hög månadskostnad."</em></li>
        <li><em>"Det betyder i praktiken att det här avtalet passar bäst."</em></li>
      </ul>

      <h3>9. Tystnad som ton (Controlled silence)</h3>
      <p><strong>Effekt:</strong> Tystnaden i sig blir en kraftfull signal — motparten fyller gärna i.<br>
      <strong>När använda:</strong> Efter en challenge, eller när du ställt en viktig fråga.</p>
      <ul>
        <li><em>"Du kanske håller med om att det är onödigt att betala för mycket för en produkt som är densamma?"</em> → tystnad</li>
      </ul>
      <p>Tystnad är svårt att träna eftersom den känns obekväm. Men den som tål tystnaden i 3–5 sekunder efter en laddad fråga vinner nästan alltid nästa informationsbit.</p>
      <p>Cicero visste det redan: han lärde sina elever att <em>silentium eloquens</em> — den vältaliga tystnaden — kan övertyga mer än tusen ord. Moderna förhandlare pratar om "awkward silence" som en vapen. Samma verktyg, ny vokabulär.</p>

      <h3>De tio psykologiska påverkans-teknikerna</h3>
      <p>Psykologisk påverkan handlar inte om manipulation i negativ mening — utan om att förstå hur människor fungerar i kommunikation, beslut och förhandling. Teknikerna är tidlösa, används av toppförhandlare och psykologer, och kan tillämpas etiskt inom försäljning, ledarskap och vardaglig påverkan. Målet är inte att lura — utan att skapa förståelse, öppna samtal och få fram den information som behövs för bra beslut.</p>

      <h3>1. Framing — rama in verkligheten</h3>
      <p><strong>Vad:</strong> Hur du presenterar en situation påverkar hur den upplevs. Samma fakta kan låta billigt eller dyrt beroende på inramningen.</p>
      <p><strong>Exempel:</strong> Istället för <em>"Det kostar 500 kr i månaden"</em> → <em>"För bara 16 kr om dagen får ni full trygghet."</em></p>

      <h3>2. Anchoring — första siffran styr allt</h3>
      <p><strong>Vad:</strong> Första referenspunkten (pris, tid, villkor) formar alla efterföljande bedömningar. Hjärnan jämför mot det första numret den hör.</p>
      <p><strong>Exempel:</strong> Säg först: <em>"Många betalar 90–100 öre per kWh"</em> → presentera sedan ditt pris, t.ex. 60 öre per kWh. Det upplevs billigt — även om 60 öre i absoluta tal inte är billigt.</p>

      <h3>3. Social Proof — flockeffekten</h3>
      <p><strong>Vad:</strong> Människor tenderar att göra som andra gör. Om andra valde det — då är det nog rätt.</p>
      <p><strong>Exempel:</strong></p>
      <ul>
        <li><em>"7 av 10 grannar här har redan valt att byta."</em></li>
        <li><em>"Jag har redan flyttat över massa kunder på ___ (postnr)."</em></li>
      </ul>

      <h3>4. Scarcity — knapphet</h3>
      <p><strong>Vad:</strong> Det som verkar begränsat värderas högre. Hjärnan är programmerad att vilja ha det som kan försvinna.</p>
      <p><strong>Exempel:</strong> <em>"Erbjudandet om trygghetsgarantin/Nöjd-kund-garantin är något jag bara kan skicka med nu"</em> → triggar FOMO och snabbare beslut.</p>
      <p><strong>Etisk varning:</strong> Knapphet måste vara äkta. Fabricerad knapphet brinner din trovärdighet när kunden fattar — och det gör de alltid förr eller senare.</p>

      <h3>5. Reciprocity — ömsesidighet</h3>
      <p><strong>Vad:</strong> När någon får något, känner de ofta ett behov av att ge tillbaka.</p>
      <p><strong>Exempel:</strong> Ge en liten bonus — fri startavgift, personlig analys/handläggning, fri fakturaavgift. Kunden blir mer benägen att säga ja.</p>

      <h3>6. Disbelief / Challenge — mild misstro</h3>
      <p><strong>Vad:</strong> Att uttrycka tvivel eller ifrågasätta på ett mjukt sätt skapar ett behov hos motparten att bevisa eller förklara. En välkänd metod inom förhandling — även FBI:s gisslanförhandlare använder den — för att få fram mer detaljer.</p>
      <p><strong>Varför det fungerar:</strong></p>
      <ul>
        <li>Människor vill korrigera en felaktig bild.</li>
        <li>När deras kompetens, status eller trovärdighet ifrågasätts — även försiktigt — tenderar de att fylla i med mer information för att återställa balansen.</li>
        <li>Om misstron är mild och nyfiken snarare än aggressiv, upplevs det som en öppning att förklara sig — inte en attack.</li>
      </ul>
      <p><strong>Exempel:</strong></p>
      <ul>
        <li><em>"Jag har svårt att tro att ert bolag inte erbjuder bättre villkor än så."</em></li>
        <li><em>"Jag har svårt att tro att ert bolag kan kapa pristopparna under vintern."</em></li>
      </ul>
      <p>Resultat: motparten utvecklar sin berättelse och ofta avslöjas värdefulla detaljer.</p>

      <h3>7. Labeling — sätt namn på känslan</h3>
      <p><strong>Vad:</strong> Att uttrycka motpartens känsla ger dem trygghet och öppnar upp. När känslan sätts ord på tappar den kraft.</p>
      <p><strong>Exempel:</strong></p>
      <ul>
        <li><em>"Det låter som att du är orolig över att bli lurad …"</em> → kunden bekräftar och utvecklar sin oro.</li>
        <li><em>"Du låter tveksam — vad tänker du?"</em></li>
        <li><em>"Det låter som att du är orolig för bindningstiden."</em></li>
      </ul>

      <h3>8. Mirroring — spegling</h3>
      <p><strong>Vad:</strong> Upprepa motpartens ord eller kroppsspråk i mild form för att uppmuntra vidare prat.</p>
      <p><strong>Exempel:</strong></p>
      <ul>
        <li>Kund: <em>"Jag tycker det känns riskabelt."</em> → Du: <em>"Riskabelt?"</em> → kunden utvecklar.</li>
        <li>Kund: <em>"Jag vill ha kvar det jag har."</em> → Du: <em>"Det du har …?"</em> → kunden utvecklar.</li>
      </ul>

      <h3>9. Foot-in-the-door — stegvis tillstånd</h3>
      <p><strong>Vad:</strong> Få motparten att säga ja till något litet först — då ökar chansen att de säger ja till något större.</p>
      <p><strong>Varför det fungerar:</strong> Sänker garden — kunden får känslan av kontroll. Ger dig chansen att leverera ditt budskap utan att de redan bestämt sig. Liknar en "soft close" där man går runt försvarsmekanismer.</p>
      <p><strong>Exempel:</strong></p>
      <ul>
        <li>Börja: <em>"Kan vi boka en snabb 5-minuterskoll?"</em> → leder lättare till <em>"Kan vi ta hela genomgången i veckan?"</em></li>
        <li>Kund: <em>"Jag är inte intresserad."</em> → Du: <em>"Jag förstår — men om jag kan få förklara i alla fall, så kan du avgöra själv om det är relevant."</em> → Kunden säger ofta "okej då".</li>
      </ul>

      <h3>10. Elicitation via False Statement — korrigeringsimpulsen</h3>
      <p><strong>Vad:</strong> Ge ett mindre felaktigt påstående som motparten vill rätta till. Människor har en stark impuls att korrigera felaktig information om sig själva.</p>
      <p><strong>Exempel:</strong></p>
      <ul>
        <li><em>"Så ni betalar väl runt 800 i månaden för det här?"</em> → motparten korrigerar med det faktiska beloppet.</li>
        <li><em>"Kan det stämma att ni ligger och betalar 1,30 kr per kWh?"</em></li>
        <li><em>"Ni har ju ett rörligt idag, eller hur?"</em></li>
      </ul>

      <h3>Börja träna idag</h3>
      <p>Allt detta är värdelöst om du bara läser det. Plocka <strong>tre</strong> att börja med — inte alla nitton. Förslag:</p>
      <ol>
        <li><strong>Förvirrad ton</strong> — när kunden är vag eller avvikande.</li>
        <li><strong>Nyfiken ton + mirroring</strong> — de passar ihop och öppnar varje samtal.</li>
        <li><strong>Kontrollerad tystnad</strong> — tål du 5 sekunder tystnad efter en fråga? Träna det.</li>
      </ol>
      <p>De bästa säljarna växlar dynamiskt mellan 3–4 tonfall i samma samtal. Det är inte skådespeleri — det är medveten anpassning. Kunden läser av det omedvetet och svarar i samma språk. Det är där försäljningen händer.</p>
    `,
    quiz: [
      { q: 'Vad handlar bra tonfall i sälj om enligt blocket?', options: ['Konsten att tala', 'Konsten att få folk att förstå', 'Konsten att prata högt', 'Konsten att använda fina ord'], answer: 1 },
      { q: 'Vad är effekten av den "förvirrade tonen" (Confused tone)?', options: ['Att visa att man är osäker', 'Att trigga kundens behov av att förklara och avväpna din säljstämpel', 'Att få kunden att avsluta samtalet', 'Att byta ämne'], answer: 1 },
      { q: 'När passar en "no-oriented" / permission-ton bäst?', options: ['När du vill stänga affären', 'När du vill ha tid, chans att presentera eller undvika direkt avslag', 'I tekniska genomgångar', 'Bara i fysiska möten'], answer: 1 },
      { q: 'Vad är Framing i psykologisk påverkan?', options: ['Att sätta en bild i ett ramverk', 'Hur du presenterar en situation — samma fakta kan låta billigt eller dyrt beroende på inramningen', 'En typ av avslutsteknik', 'Att skriva kontraktet'], answer: 1 },
      { q: 'Vad är Anchoring-effekten?', options: ['Att ankra kunden i nuläget', 'Att första siffran eller referenspunkten styr alla efterföljande bedömningar', 'Att avsluta med ett pris', 'Att hålla kunden kvar'], answer: 1 },
      { q: 'Vad är Labeling i förhandling?', options: ['Att sätta etiketter på produkter', 'Att uttrycka motpartens känsla i ord — vilket avväpnar och öppnar upp', 'Att kategorisera kunder', 'En sorts CRM-funktion'], answer: 1 },
      { q: 'Vad är Foot-in-the-door-tekniken?', options: ['Att stoppa foten i dörren fysiskt', 'Att få motparten att säga ja till något litet först — vilket ökar chansen för ett större ja senare', 'Att hålla öppen dörr för kunden', 'Att sälja skor'], answer: 1 },
      { q: 'Vad är Elicitation via False Statement?', options: ['Att ljuga för kunden', 'Att ge ett mindre felaktigt påstående som motparten vill rätta till — så de avslöjar rätt information', 'Att överdriva produktens fördelar', 'Att undvika sanningen'], answer: 1 },
      { q: 'Hur många tonfall växlar de bästa säljarna dynamiskt mellan i samma samtal?', options: ['Bara ett', '3–4 tonfall', '10 olika tonfall', 'Ett per kundtyp'], answer: 1 },
      { q: 'Vad är den etiska gränsen för psykologiska påverkanstekniker?', options: ['Det finns ingen gräns', 'Målet är inte att lura — utan att skapa förståelse, öppna samtal och hitta information för bra beslut', 'Bara ljug vitt', 'Använd bara dem du själv skulle acceptera'], answer: 1 },
    ],
    quickVersion: {
      essence: [
        'Hur du säger det > vad du säger. Rätt tonfall öppnar kunden; fel tonfall stänger ner.',
        'De 9 strategiska tonfallen: Nyfiken, Empatisk, Utmanande, Förvirrad, Lekfull, No-oriented, Auktoritativ, Sammanfattande, Tystnad.',
        'De bästa växlar mellan 3–4 tonfall i samma samtal. Det är inlärd medvetenhet — inte talang.',
      ],
      keyTechnique: 'Förvirrad ton. "Stanna …? Du menar …? Tills …?" — sätter kunden i förklara-läge. Avväpnar din säljstämpel och triggar korrigeringsimpulsen.',
      microAction: 'I nästa kundsamtal: när kunden är vag — svara med en förvirrad ton istället för att argumentera. Se vad som händer.',
    },
    roleplays: [
      {
        id: 'rp-forvirrad',
        title: 'Förvirrad ton mot vag kund',
        difficulty: 'Lätt',
        icon: '🤔',
        goal: 'Öva "Förvirrad ton" — få kunden att konkretisera sitt svävande svar.',
        scenario: 'Du ringer Anna, inköpschef på ett medelstort tillverkningsbolag, angående ett nytt CRM-system. Hon svarar direkt att "vi är nöjda med det vi har".',
        customerPersona: 'Du spelar Anna, inköpschef, 48 år. Du är artig men tidspressad. Ni har ett gammalt system som egentligen är sladdrigt, men du har inte orkat ta tag i det — och du vill inte erkänna det för en säljare. Om säljaren pressar på: stäng ner. Om säljaren använder förvirrad ton (typ "nöjda …? Med vilka delar specifikt?") — börja förklara försiktigt, och låt gradvis sanningen komma ut: rapporterna är svåra att ta ut, supporten är trög, ni tänker faktiskt byta men inte just nu.',
        successCriteria: [
          'Säljaren pitchar INTE sin produkt direkt',
          'Säljaren använder minst en förvirrad/nyfiken ton',
          'Du öppnar upp gradvis och nämner minst ett specifikt problem',
        ],
        openingLine: 'Anna, tack för att du tar samtalet. Jag ringer angående CRM-system — några minuter?',
      },
      {
        id: 'rp-labeling',
        title: 'Labeling — sätt namn på känslan',
        difficulty: 'Medel',
        icon: '🏷️',
        goal: 'Öva "Labeling" (Voss) — identifiera och verbalisera kundens känsla istället för att argumentera emot.',
        scenario: 'Du är i ett offertmöte med Kalle, CFO. Ni har precis kommit till priset. Kalle reagerar negativt: "Det där priset är nonsens — vi betalar hälften av era konkurrenter."',
        customerPersona: 'Du spelar Kalle, CFO, 55 år, analytisk, skeptisk till säljare men ärlig. Du är oroad över kvartalsrapporten och pressad från styrelsen att pressa kostnader. Priset är ett symptom för en djupare oro. Om säljaren argumenterar om pris — gräv ner dig. Om säljaren LABEL:ar din känsla ("det låter som att priset i sig inte är problemet — snarare oron att motivera det för styrelsen") — du öppnar upp, bekräftar, och diskuterar hur affären kan paketeras för styrelsegodkännande.',
        successCriteria: [
          'Säljaren försvarar INTE priset direkt',
          'Säljaren sätter ord på din underliggande oro',
          'Ni pratar om motivering/paketering — inte om pris',
        ],
        openingLine: 'Det där priset är nonsens — vi betalar hälften av era konkurrenter.',
      },
      {
        id: 'rp-permission',
        title: 'No-oriented (permission tone)',
        difficulty: 'Lätt',
        icon: '🚪',
        goal: 'Öva att formulera frågor där "nej" är det trygga svaret — och få kunden att öppna dörren.',
        scenario: 'Du ringer en kall prospect — en marknadschef — som precis sa "jag är inte intresserad" på första raden.',
        customerPersona: 'Du spelar Mia, marknadschef, 38 år, stressad, får 10 säljsamtal om dagen. Ditt default är att säga nej fort. Om säljaren försöker pitcha — avsluta samtalet. Om säljaren använder no-oriented-teknik (typ "skulle det vara orimligt att bara få 60 sekunder och så får du avgöra själv?") — du suckar men säger "okej då". Om de då faktiskt levererar värde på 60 sek — blir du nyfiken och bokar uppföljning.',
        successCriteria: [
          'Säljaren använder en "no-oriented" fråga',
          'Säljaren får dig att säga "okej då" / "fortsätt"',
          'Säljaren levererar värde inom 60 sekunder',
        ],
        openingLine: 'Jag är inte intresserad.',
      },
      {
        id: 'rp-tystnad',
        title: 'Kontrollerad tystnad — tål du pausen?',
        difficulty: 'Svår',
        icon: '🤐',
        goal: 'Öva att ställa en laddad fråga och sedan vara TYST — låt kunden fylla pausen.',
        scenario: 'Du har just presenterat en lösning för Peter, IT-chef. Han verkar osäker. Du vill förstå vad han egentligen tänker — utan att pressa.',
        customerPersona: 'Du spelar Peter, IT-chef, 45 år, omtänksam. Du har en verklig invändning (compliance-chefen kommer troligen blockera köpet) men du vill inte verka trög eller rädd. Om säljaren fyller tystnaden efter sin fråga med argument — stäng ner, säg "jag ska tänka". Om säljaren faktiskt är tyst i 5+ sekunder — du börjar obekvämt fylla luften, och sanningen kommer ut: "jo, det är compliance-chefen … han brukar stoppa den här typen av beslut". Då har säljaren guldet.',
        successCriteria: [
          'Säljaren ställer en öppen fråga om tveksamheten',
          'Säljaren tiger i minst 5 sekunder efter frågan',
          'Du avslöjar den verkliga invändningen (compliance-chefen)',
        ],
        openingLine: 'Det där låter intressant. Jag är osäker på några detaljer.',
      },
    ],
    mission: {
      title: 'Veckans uppdrag: Använd förvirrad ton i 3 riktiga samtal',
      weeklyGoal: 3,
      description: 'Använd den förvirrade tonen (Columbo-tekniken) i minst 3 riktiga kundsamtal denna vecka. Notera vad som hände.',
      steps: [
        'Identifiera 3 kommande kundsamtal där du förväntar dig vaga eller svårfångade svar.',
        'I varje samtal — när kunden säger något vagt — svara med en förvirrad ton (t.ex. "Stanna …? Du menar …? Tills …?").',
        'Var tyst efter. Vänta in kundens förklaring.',
        'Efter samtalet: skriv 2 meningar om vad som hände — öppnade kunden upp eller inte?',
      ],
      trigger: 'Nästa gång en kund säger något som "vi är nöjda" / "det räcker som det är" / "vi ska fundera".',
      successMarker: 'Kunden fyller i med mer information än hen tänkt — minst 2 av 3 gånger.',
    },
    reflections: [
      'Vilket av de nio tonfallen kände du mest igen att du redan använder? Vilket känns mest främmande?',
      'Varför är den "förvirrade tonen" så kraftfull trots att den känns emot intuitiv för en säljare?',
      'Vilken psy-ops-teknik (Framing, Anchoring, Labeling, Mirroring, m.fl.) ska du testa inom 48h — och i vilken konkret situation?',
      'När du pratar med kund: hur många sekunder brukar du tåla tystnad efter en viktig fråga? Vad säger det om dig?',
      'Om en kund använde dessa tekniker på dig — skulle du märka det? Varför/varför inte?',
    ],
  },

  // ── 4. Prospektering ──────────────────────────────────────────────────────
  {
    id: 'prospektering',
    title: 'Prospektering',
    subtitle: 'Hitta rätt kunder — inte flest kunder',
    icon: '🎯',
    gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    color: '#0ea5e9',
    youtubeId: null,
    teaser: `
      <h3>Vad är prospektering?</h3>
      <p>Prospektering är processen att identifiera och kvalificera potentiella kunder. Det är säljprocessens fundament — utan en fylld pipeline finns inget att sälja till.</p>
      <p>Men de flesta förstår inte vad som skiljer toppsäljaren från medelmåttan. Det handlar inte om att ringa flest samtal — det handlar om att ringa <strong>rätt samtal, till rätt person, med rätt förberedelse</strong>. Det är den kunskapen som väntar dig i det här blocket.</p>
    `,
    theory: `
      <h3>Kärnan: prospektering är det enda jobbet som alltid måste göras</h3>
      <p>Jeb Blount, författaren till <em>Fanatical Prospecting</em>, formulerade det brutalt tydligt: <em>"The number one reason for failure in sales is an empty pipeline. And the number one reason for an empty pipeline is a failure to prospect consistently."</em></p>
      <p>Så här fungerar säljmatten: om du slutar prospektera idag, havererar din pipeline om 60–90 dagar. Din kalender kan vara full av möten nu, men det är frukten från prospekteringen du gjorde för 2 månader sedan. Säljare som slutar prospektera när det är "bra" skapar berg-och-dal-banor i sina siffror — bra kvartal, hemskt kvartal, bra kvartal, uppsägning.</p>
      <p>Det 90% missar: prospektering är inte något du gör när det är lugnt. Det är något du gör <strong>varje arbetsdag, först, skyddat tid</strong>, oavsett hur pipelinen ser ut. Toppsäljare har en 80/20-regel omvänd: de prospekterar 2 timmar minimum varje dag, alla andra dagar de ringer prospektiv så har de 45 nya möten istället för 8.</p>

      <h3>Problemet: så fallerar genomsnittsäljare i prospektering</h3>
      <p>Typiskt mönster:</p>
      <ul>
        <li>Månadens första vecka: prospekterar hårt, många möten bokade.</li>
        <li>Vecka 2–3: möten landar, demos körs, offerter skickas. Prospektering glöms.</li>
        <li>Månadens slut: panik. "Jag har inga nya affärer i pipelinen!"</li>
        <li>Nästa månad börjar: kraschar med prospektering. Fokuserar bara på aktiva affärer. Hoppas på det bästa.</li>
        <li>Månader senare: kvoten missas. "Det var en konstig period."</li>
      </ul>
      <p>Konsekvensen: inkonsekvent pipeline = inkonsekvent intäkt = karriärkris var 4:e månad. Hela problemet förebyggs av en enda sak — daglig prospektering.</p>

      <h3>Ramverk 1: ICP — Ideal Customer Profile (din kompass)</h3>
      <p>Innan du prospekterar en person måste du veta vem du söker. En ICP är inte en "målgrupp" — det är en porträttering av den exakta typen av kund där:</p>
      <ul>
        <li>Din lösning löser ett akut, specifikt problem.</li>
        <li>De har budget och vilja att lösa det.</li>
        <li>De stänger snabbt.</li>
        <li>De blir nöjda, stannar, betalar bra och refererar.</li>
      </ul>
      <p><strong>ICP-ramverket (7 punkter):</strong></p>
      <ol>
        <li><strong>Bransch:</strong> vilken industri? Inte "B2B" — "SaaS". Inte "SaaS" — "B2B SaaS för HR-team i Norden".</li>
        <li><strong>Storlek:</strong> anställda, omsättning. "20–100 anställda" inte "SME".</li>
        <li><strong>Geografi:</strong> var? "Sverige + Norge" inte "Nordeuropa".</li>
        <li><strong>Roll/titel:</strong> vem fattar beslutet? HR Director, CFO, VP Sales — specifikt.</li>
        <li><strong>Trigger/event:</strong> vad händer i deras liv som gör dig relevant? Ny rekrytering av CEO, expansion, nyligen fått funding, missade kvartalet.</li>
        <li><strong>Smärta:</strong> vilket specifikt problem löser du för dem?</li>
        <li><strong>Framgångsberättelse:</strong> vilken befintlig kund liknar dem?</li>
      </ol>
      <p><strong>Övning nu:</strong> öppna ditt CRM. Sortera dina 10 största affärer 12 månader tillbaka. Vad har dessa gemensamt? Det är din ICP. Allt du prospekterar utanför den ICP:n är slöseri — tills ICP:n är mättad.</p>

      <h3>Ramverk 2: BANT — snabb-kvalificering i samtalet</h3>
      <p>BANT är ett IBM-ramverk från 60-talet som fortfarande är det mest använda kvalificerings-systemet. Fyra frågor som avgör om en prospect är värd din tid:</p>
      <ul>
        <li><strong>B — Budget</strong>: Har de råd? <em>"Har ni budget avsatt för det här i år?"</em></li>
        <li><strong>A — Authority</strong>: Pratar du med rätt person? <em>"Vem mer är involverad i ett sådant beslut?"</em></li>
        <li><strong>N — Need</strong>: Har de ett genuint behov? <em>"Vad händer om ni inte löser det?"</em></li>
        <li><strong>T — Timeline</strong>: När vill de agera? <em>"Om allt passar — när skulle ni vilja ha det på plats?"</em></li>
      </ul>
      <p>Om prospecten inte kvalificerar på minst 3 av 4 — släpp eller sätt långsam follow-up-cadens. Din tid är ditt kapital.</p>
      <p><strong>Modernare alternativ:</strong> MEDDIC (Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion). Mer djupgående, används i enterprise-sälj.</p>

      <h3>Ramverk 3: Tre-kanals-prospekteringen (Blount-modellen)</h3>
      <p>En kanal räcker inte. De bästa säljarna attackerar samma prospect via 3 kanaler parallellt för att bryta igenom bruset.</p>
      <p><strong>Kanal 1: Telefon (underskattat, kraftfullaste)</strong><br>
      En personlig telefonkontakt slår kall e-post 10x i konverteringsfrekvens enligt Gong. 80% av säljare hatar att ringa — vilket betyder att de som gör det har mindre konkurrens.</p>
      <p><strong>Kanal 2: Mejl (skalbart, mätbart)</strong><br>
      Kall e-post fungerar OM den är personlig och kort. Se Block 13 för djupare mejlstrategi.</p>
      <p><strong>Kanal 3: LinkedIn (varmaste ingång)</strong><br>
      Engagera med deras content i 3 dagar, skicka connection, mjuk-meddela efter accept. Se Block 11.</p>
      <p><strong>Cadence-exempel (14 dagar):</strong></p>
      <ul>
        <li>Dag 1: Kall telefon. Röstmeddelande om de inte svarar.</li>
        <li>Dag 1: Mejl direkt efter (referera till röstmeddelandet).</li>
        <li>Dag 2: LinkedIn-engagement på deras post.</li>
        <li>Dag 4: Connection request med personligt meddelande.</li>
        <li>Dag 6: Nytt samtal — annan tid på dygnet.</li>
        <li>Dag 8: Mejl med ny vinkel (case study, statistik).</li>
        <li>Dag 12: LinkedIn-DM med värdebit.</li>
        <li>Dag 14: Break-up-mejl.</li>
      </ul>

      <h3>Ramverk 4: Pipeline-matten — räkna bakåt</h3>
      <p>Du kan inte hoppas på kvoten. Du måste räkna på den.</p>
      <p>Typiskt B2B-exempel:</p>
      <ul>
        <li>Målet: 4 nya affärer per månad</li>
        <li>Stängningsprocent offert→affär: 30% → du behöver 13 offerter</li>
        <li>Möte→offert: 50% → du behöver 26 möten</li>
        <li>Samtal→möte: 20% → du behöver 130 kvalificerade samtal</li>
        <li>130 samtal per månad ≈ <strong>6–7 samtal per arbetsdag</strong></li>
      </ul>
      <p>Det är ditt icke-förhandlingsbara dagsmål. 6 samtal per dag. Varje dag. Gör du det, kommer affärerna. Gör du det inte, blir det dåligt — matematiskt.</p>

      <h3>Förberedelse före samtalet (5 minuter som dubblerar konverteringen)</h3>
      <p>De säljare som ringer mest vinner inte alltid. De som förbereder sig vinner. 5 min research per prospect kan dubblera konverteringsgraden.</p>
      <p><strong>Research-checklista:</strong></p>
      <ul>
        <li>LinkedIn-profilen: vilken titel? Hur länge i rollen? Tidigare arbetsgivare?</li>
        <li>Senaste 2 poster: vad tycker de om? Vad delar de?</li>
        <li>Företagshemsidan: vad säljer de? Vilka är kunderna?</li>
        <li>Branschnyheter: senaste 30 dagarna — hände något relevant?</li>
        <li>Triggers: expansion, nyrekrytering, funding, nyhet i pressen?</li>
      </ul>
      <p>När du ringer kan du öppna: <em>"Anna, jag såg att ni just expanderat till Norge — grattis. Anledningen jag ringer är …"</em> istället för <em>"Hej, är det Anna?"</em></p>

      <h3>Före vs efter — öppningen</h3>
      <p><strong>FÖRE:</strong></p>
      <blockquote>
        <p>"Hej, jag heter Kalle och ringer från Företag X. Vi erbjuder lösningar för säljare. Hade du tid för en kort presentation?"</p>
      </blockquote>
      <p><strong>EFTER:</strong></p>
      <blockquote>
        <p>"Anna, jag såg att ni just anställde två nya Account Executives och expanderar söderut. Grattis. Anledningen jag hör av mig: en av era branschkollegor, Företag Y, brottades med exakt samma scale-up-fas förra året — vi hjälpte dem korta onboardingen från 3 månader till 3 veckor. Är det något som skulle vara värdefullt att diskutera under 15 min?"</p>
      </blockquote>
      <p>Samma säljare. Samma produkt. En ringer kallt. Den andra öppnar med relevans. Konverteringsskillnaden är 5–10x.</p>

      <h3>Grindvakten — din allierade, inte ditt hinder</h3>
      <p>I B2B når du beslutsfattaren ofta via receptionist eller assistent. De flesta säljare försöker lura eller undvika dem. Fel approach.</p>
      <p><strong>Rätt approach — behandla dem som den inre kretsen:</strong></p>
      <ul>
        <li>Presentera dig med för- och efternamn. Professionellt.</li>
        <li>Var kortfattad och tydlig: <em>"Jag behöver prata med er IT-chef om något specifikt kring [system de använder]. Kan du hjälpa mig?"</em></li>
        <li>Be om hjälp, inte om tillgång. <em>"Kan du hjälpa mig …"</em> är genetiskt programmerat att trigga hjälpsamhet.</li>
        <li>Lär dig deras namn. Ring tillbaka. Fråga efter dem vid namn. De blir din allierade.</li>
      </ul>

      <h3>Live-scenarier</h3>
      <p><strong>Scenario 1 — kunden svarar "vi har redan en leverantör":</strong></p>
      <ul>
        <li>❌ FEL: "Okej, tack för din tid." → Släpp.</li>
        <li>✅ RÄTT: "Det hade jag antagit — alla på er nivå har. Jag ringer inte för att byta ut idag, men för att bygga relation inför den dag ert kontrakt löper ut. Vem av er skulle vara rätt att prata med då?"</li>
      </ul>
      <p><strong>Scenario 2 — du får en röstbrevlåda:</strong></p>
      <ul>
        <li>❌ FEL: Ingen röstmeddelande.</li>
        <li>✅ RÄTT: Kort röstmeddelande (15 sek) + namn + tydlig anledning + ditt nummer. "Hej Anna, Kalle heter jag, ringer angående scale-up-fasen ni är i — jag har några idéer specifikt för säljchefer i er situation. Jag mejlar direkt efter så du har informationen. 072-xxx." Mejla sedan direkt.</li>
      </ul>
      <p><strong>Scenario 3 — din pipeline är tom och du är trött:</strong></p>
      <ul>
        <li>❌ FEL: Ta en dag "för återhämtning". Skjut på det imorgon.</li>
        <li>✅ RÄTT: Ring ändå. Dagliga aktiviteter är inte beroende av hur du mår. Systemet är chefen.</li>
      </ul>

      <h3>De tre vanligaste prospekteringsmisstagen</h3>
      <ol>
        <li><strong>Sluta prospektera när pipelinen är full.</strong> Maränghet leder till totalhaveri 60 dagar senare.</li>
        <li><strong>Kvantitet före kvalitet.</strong> 100 samtal till fel person är sämre än 20 samtal till rätt person. Investera i research.</li>
        <li><strong>Skippa förberedelsen.</strong> 5 min research dubblerar konverteringsgraden. Att "spara" de 5 min är dyrt — du tappar bokningar.</li>
      </ol>

      <h3>Handling: kör det här idag</h3>
      <ol>
        <li><strong>Skriv din ICP</strong> — 7 punkterna. Spara i Notion eller Google Doc.</li>
        <li><strong>Bygg en prospektlista på 25 namn</strong> som matchar ICP:n exakt. LinkedIn Sales Navigator är guld.</li>
        <li><strong>Räkna din pipeline-matte</strong> bakåt från kvoten. Hur många samtal per dag?</li>
        <li><strong>Blockera 9:00–11:00</strong> i morgon som "Prospektering — icke-förhandlingsbar". Ring.</li>
        <li><strong>Skriv en öppningsfras</strong> på 30 sekunder med relevans + värde + soft CTA. Öva den högt.</li>
      </ol>

      <h3>24-timmarsövningen</h3>
      <p>Imorgon kl 09:00: ring 10 prospekts från din ICP-lista. Förbered 5 min per person innan. Använd din nya öppningsfras. Notera resultaten. Räkna konverteringen. Imorgon vet du exakt var du står.</p>

      <h3>Sammanfattning — fem punkter</h3>
      <ul>
        <li>Prospektering är det enda säljjobbet som alltid måste göras — varje dag, oavsett pipeline.</li>
        <li>ICP först, prospektering sedan. Fel lista = slösad tid.</li>
        <li>BANT som snabbkvalificering. 3/4 eller släpp.</li>
        <li>Tre-kanals-cadence: telefon + mejl + LinkedIn. Inte en — tre.</li>
        <li>Räkna bakåt från kvoten. Samtal per dag är icke-förhandlingsbart.</li>
      </ul>
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
    youtubeId: null,
    teaser: `
      <h3>Varför behovsanalys är nyckeln</h3>
      <p>De flesta säljare pratar för mycket. De presenterar, förklarar och argumenterar — utan att först förstå vad kunden faktiskt behöver. Resultatet: en presentation som missar målet och en kund som inte känner sig förstådd.</p>
      <p>En stark behovsanalys vänder dynamiken helt. Kunden pratar 70% av tiden. Du lyssnar och ställer de rätta frågorna. Och när du väl presenterar din lösning — passar den perfekt. Det här blocket ger dig de exakta frågorna och teknikerna som skiljer toppsäljare från resten.</p>
    `,
    theory: `
      <h3>Kärnan: den som frågar styr samtalet</h3>
      <p>Det äldsta säljmisstaget i boken: att prata för att övertyga. Säljare tror ofta att ju mer de förklarar, desto mer kommer kunden förstå värdet. Precis tvärtom. Ju mer du pratar, desto mindre säljer du.</p>
      <p>Neil Rackham, grundaren av SPIN Selling, forskade i 12 år på 35 000 säljsamtal. Hans slutsats var brutal: genomsnittssäljare pratar 70% av tiden. Toppsäljaren pratar 30%. Skillnaden är inte en preferens — det är vad som avgör vilka affärer som stängs.</p>
      <p>Sanningen 90% missar: din presentation är ofta bortkastad tid. Den landar inte hos kunden för att du presenterar något de inte bett om. Behovsanalys är inte "något du gör innan du pitchar" — det är <strong>hela säljet</strong>. När behovsanalysen är rätt gjord pitchar kunden lösningen själv.</p>

      <h3>Problemet: så missar 80% av säljare discovery-fasen</h3>
      <p>Typisk scen:</p>
      <ul>
        <li>5 min småprat.</li>
        <li>2 min "berätta lite om er verksamhet".</li>
        <li>2 min om kundens nuvarande lösning.</li>
        <li>30 min presentation av egen produkt. Säljaren pratar.</li>
        <li>5 min "frågor?" — kunden har redan tappat fokus.</li>
      </ul>
      <p>Vad som händer: säljaren pitchar mot en situation hen gissar sig till. Kunden sitter och väntar ut mötet artigt. När säljaren frågar "låter det intressant?" säger kunden ja — för att vara artig. Säljaren åker hem, glad. Kunden ghostar. Affären dör utan att någon förstår varför.</p>
      <p>Verkligheten: säljaren ställde aldrig de rätta frågorna. Gissade på problemet. Pitchade lösning. Hoppades.</p>

      <h3>Ramverk 1: SPIN Selling — Neil Rackhams 12 års forskning</h3>
      <p>SPIN är det mest forskningsbaserade säljramverket som finns. Fyra typer av frågor i bestämd ordning:</p>
      <p><strong>S — Situation</strong><br>
      Fakta om kundens nuläge. <em>Använd sparsamt.</em> Mer än 2–3 situationsfrågor = kunden känner att du frågar för att du inte gjort din research. Gör research innan.</p>
      <ul>
        <li><em>"Hur stor är er säljorganisation idag?"</em></li>
        <li><em>"Hur jobbar ni med uppföljning just nu?"</em></li>
      </ul>
      <p><strong>P — Problem</strong><br>
      Identifiera smärtpunkter. Här börjar det bli intressant. Frågorna öppnar upp vad som faktiskt bekymrar kunden.</p>
      <ul>
        <li><em>"Vad fungerar inte optimalt idag?"</em></li>
        <li><em>"Vad kostar mest tid eller irritation?"</em></li>
        <li><em>"Vad är er största utmaning med X?"</em></li>
      </ul>
      <p><strong>I — Implikation (kraftfullaste kategorin)</strong><br>
      Förstärk konsekvensen av problemet. Rackhams forskning: implikationsfrågor är det enda som korrelerar med stängda affärer i komplex B2B.</p>
      <ul>
        <li><em>"Vad händer om ni inte löser det?"</em></li>
        <li><em>"Hur påverkar det er intäkt / ert team / era kunder?"</em></li>
        <li><em>"Vad tror du det kostar er per månad idag?"</em></li>
        <li><em>"Om det fortsätter ett år till — hur ser det ut då?"</em></li>
      </ul>
      <p><strong>N — Need-payoff (nyttofrågor)</strong><br>
      Låt kunden själv artikulera värdet av lösningen. Den magiska omvändningen: när kunden säger det med sina egna ord blir det sant på ett sätt det aldrig blir när DU säger det.</p>
      <ul>
        <li><em>"Om ni kunde lösa X — vad skulle det innebära?"</em></li>
        <li><em>"Hur viktig är det här för er att åtgärda?"</em></li>
        <li><em>"Om vi löste det — vad är det första som skulle förändras hos er?"</em></li>
      </ul>
      <p>När kunden svarar på nyttofrågor säljer de sig själva. Du behöver sällan pitcha efter det.</p>

      <h3>Ramverk 2: Regeln om 70/30 — dynamiken som vinner</h3>
      <p>I en behovsanalys ska kunden prata <strong>70%</strong> av tiden. Du pratar 30% — och mest i form av frågor och bekräftelser. Det är inte bara produktivt; det är mänskligt tilltalande. Kunden kommer ur mötet och tänker <em>"det där var ett bra samtal"</em> — inte för att du övertygade dem utan för att de kände sig hörda.</p>
      <p>Mät dig själv: spela in ditt nästa kundsamtal (med tillstånd). Räkna sekunder du pratar vs kunden. Sanningen kommer chocka dig.</p>

      <h3>Ramverk 3: Öppna vs stängda frågor</h3>
      <p><strong>Öppna frågor</strong> börjar med: Vad, Hur, Varför, Berätta, Beskriv. De genererar djupa svar och information.<br>
      <strong>Stängda frågor</strong> besvaras med ja/nej. Används för att bekräfta, lås-ned eller avsluta.</p>
      <p>I behovsanalysen: 80% öppna frågor. I avslutet: stängda för att säkra beslut. Att förväxla de två — ställa stängda frågor tidigt eller öppna frågor sent — är en klassisk säljfälla.</p>

      <h3>Ramverk 4: Aktivt lyssnande — fyra signaler</h3>
      <p>Att lyssna är inte att vänta på din tur. Det är att absorbera — och visa att du absorberar:</p>
      <ul>
        <li><strong>Bekräftande ljud</strong>: <em>"Mm", "okej", "förstår", "berätta mer"</em>. Låt kunden veta att du hänger med.</li>
        <li><strong>Sammanfatta</strong>: <em>"Så om jag förstått rätt — ni brottas med X som kostar er Y?"</em> Visar att du lyssnat och ger kunden chans att korrigera.</li>
        <li><strong>Följdfrågor på det precis sagda</strong>: inte generella frågor, utan frågor som bygger på ordet de just använde.</li>
        <li><strong>Inga avbrott</strong>: vänta 2 sekunder efter de tystnat. Ofta kommer den viktigaste informationen i den pausen — om du inte snappar upp stafettpinnen för tidigt.</li>
      </ul>

      <h3>Ramverk 5: Låsningstekniken — bekräfta innan du pitchar</h3>
      <p>Det vanligaste pitch-misstaget: börja presentera lösningen innan kunden faktiskt formulerat behovet. Låsningstekniken löser det.</p>
      <p>När du identifierat 2–3 behov under discovery:</p>
      <blockquote>
        <p><em>"Så om jag förstår dig rätt — det viktigaste för er är att lösa A, och att ni kan få det på plats utan att störa B. Stämmer det?"</em></p>
      </blockquote>
      <p>Kunden säger ja → behovet är <strong>låst</strong>. Det betyder att när du nu pitchar är det inte du som säljer. Det är kundens egna ord som driver motivationen. Att säga "det behöver vi inte" är nu att motsäga sig själv.</p>
      <p><strong>Regel:</strong> lås alltid minst 2 behov innan du presenterar något. Pitchar du mot ett låst behov är sannolikheten att höra "det behöver vi inte" i princip noll.</p>

      <h3>Ramverk 6: Plantering av behov — det omedvetna problemet</h3>
      <p>Ibland vet inte kunden att de har ett problem — förrän du ställer rätt fråga. Det kallas <em>needs-development</em> i SPIN, eller "att plantera ett behov". Det är konsultativ försäljning när det är som bäst.</p>
      <p><strong>Exempel:</strong></p>
      <ul>
        <li>Säljare: <em>"Hur mycket tid per vecka lägger Anna på den manuella rapporteringen?"</em></li>
        <li>Kund: <em>"Hmm … vi vet faktiskt inte exakt. Kanske 4 timmar?"</em></li>
        <li>Säljare: <em>"Och vad kostar Annas tid er organisation ungefär per timme — fullt laddat?"</em></li>
        <li>Kund: <em>"800 kr kanske."</em></li>
        <li>Säljare: <em>"Så rapporteringen kostar er runt 13 000 kr/månad. Är det något ni pratat om?"</em></li>
        <li>Kund: <em>"Nej, egentligen inte. Men … det är ganska mycket pengar …"</em></li>
      </ul>
      <p>Du har inte manipulerat. Du har hjälpt kunden se sin egen situation klart. Behovet fanns redan — du gjorde det synligt.</p>

      <h3>Konkreta följdfrågor som öppnar samtal (bibliotek)</h3>
      <p>Generella frågor ger generella svar. Specifika ger guld:</p>
      <ul>
        <li><em>"Hur ser ni på [ämne] idag — vad fungerar och vad skulle ni vilja förändra?"</em></li>
        <li><em>"Vad är det som gjorde att ni valde [nuvarande lösning]? Vad var avgörande?"</em></li>
        <li><em>"Hur påverkar [problemet] er verksamhet i praktiken — inte teoretiskt?"</em></li>
        <li><em>"Om ni hade fria händer och obegränsad budget — hur skulle ni lösa det?"</em></li>
        <li><em>"Vem i er organisation påverkas mest av det här?"</em></li>
        <li><em>"Vad är viktigast för er — kostnad, enkelhet eller trygghet?"</em></li>
        <li><em>"Om ni inte gör något åt det nu — vad tror du händer om 12 månader?"</em></li>
        <li><em>"Vad är det som skulle göra att ni säger 'ja' till en ny lösning?"</em></li>
      </ul>
      <p>Välj 3 per möte. Fördjupa baserat på svar.</p>

      <h3>Före vs efter — discovery i praktiken</h3>
      <p><strong>FÖRE (reaktiv säljare):</strong></p>
      <blockquote>
        <p>Säljare: "Så vad ni söker är en bättre CRM-lösning?"<br>
        Kund: "Ja, ungefär."<br>
        Säljare: "Perfekt! Då ska jag visa dig vår plattform. Den har AI, dashboards, integrationer…" <em>[15 min senare]</em></p>
      </blockquote>
      <p><strong>EFTER (konsultativ säljare):</strong></p>
      <blockquote>
        <p>Säljare: "När du säger 'bättre CRM' — vad är det som inte fungerar med nuvarande?"<br>
        Kund: "Säljarna uppdaterar aldrig det ordentligt."<br>
        Säljare: "Intressant — hur vet ni då vilka affärer som rör sig framåt?"<br>
        Kund: "Vi vet inte. Vi gissar."<br>
        Säljare: "Och hur påverkar det er forecast?"<br>
        Kund: "Vi missar förra kvartalet med 22%. CFO är rasande."<br>
        Säljare: "Så om CRM:t faktiskt uppdaterades korrekt — vad skulle det betyda för dig?"<br>
        Kund: "Jag skulle kunna sova på nätterna."</p>
      </blockquote>
      <p>Samma kund. Den första säljer en CRM. Den andra säljer CFO:ns förtroende och säljchefens sömn. Vilken stänger?</p>

      <h3>Live-scenarier</h3>
      <p><strong>Scenario 1 — kunden är vag: "Vi vill bli bättre på sälj":</strong></p>
      <ul>
        <li>❌ FEL: "Okej, vad vi kan göra är att…"</li>
        <li>✅ RÄTT: "Vad betyder 'bättre' konkret för er? Fler affärer? Större affärer? Kortare säljcykel?" Tvinga konkretisering.</li>
      </ul>
      <p><strong>Scenario 2 — kunden säger "vi är nöjda med det vi har":</strong></p>
      <ul>
        <li>❌ FEL: Ge upp eller pressa.</li>
        <li>✅ RÄTT: "Det är helt förståeligt. Om du skulle välja en sak som skulle göra det ännu bättre — vad skulle det vara?" Öppnar nyanser.</li>
      </ul>
      <p><strong>Scenario 3 — du har pratat 15 min och inte fått veta nåt:</strong></p>
      <ul>
        <li>❌ FEL: Fortsätt prata.</li>
        <li>✅ RÄTT: Stoppa. "Jag märker att jag pratat mycket — låt mig fråga dig istället: vad är det som egentligen håller dig vaken om natten just nu i den här rollen?"</li>
      </ul>

      <h3>De tre vanligaste discovery-misstagen</h3>
      <ol>
        <li><strong>För många situationsfrågor.</strong> Kunden känner sig som i ett formulär, inte ett samtal. Research innan mötet så du slipper fråga.</li>
        <li><strong>Pitcha på första signal.</strong> Kunden nämner ett problem — säljaren pitchar direkt. Du missade 4 djupare behov genom att prata över dem.</li>
        <li><strong>Inte låsa behoven.</strong> Du hör "A och B" — men bekräftar aldrig. När du pitchar tror du att det är viktigt. Kunden hade redan släppt det. Bekräfta alltid.</li>
      </ol>

      <h3>Handling: kör det här idag</h3>
      <ol>
        <li><strong>Skriv dina 10 bästa öppna frågor</strong> — anpassade till din bransch. Ha dem i CRM för varje möte.</li>
        <li><strong>Öva SPIN-strukturen</strong> på nästa möte. 2 S, 2–3 P, 2–3 I, 1–2 N. Ingen pitch förrän sekvensen är klar.</li>
        <li><strong>Lås alltid 2 behov</strong> innan du presenterar något. Fras: <em>"Så om jag förstår dig rätt …"</em></li>
        <li><strong>Mät ditt pratförhållande.</strong> Spela in ett samtal. Målet: du pratar max 30%.</li>
        <li><strong>Byt "Har ni..."-frågor till "Hur..."-frågor.</strong> Omedelbart djupare svar.</li>
      </ol>

      <h3>24-timmarsövningen</h3>
      <p>Nästa möte: ställ 3 implikationsfrågor innan du säger ett ord om din produkt. <em>"Vad händer om det fortsätter?"</em> <em>"Vad kostar det er?"</em> <em>"Hur påverkar det teamet?"</em> Var tyst efter var och en. Notera vad kunden säger. Den informationen är guld.</p>

      <h3>Sammanfattning — fem punkter</h3>
      <ul>
        <li>Den som frågar styr samtalet. Toppsäljare pratar 30%, genomsnittssäljare 70%.</li>
        <li>SPIN-ordningen: Situation (sparsamt) → Problem → Implikation → Need-payoff. Ingen pitch förrän du är igenom.</li>
        <li>Implikationsfrågor är den enda kategorin som forskningsmässigt korrelerar med stängda affärer i B2B.</li>
        <li>Lås 2–3 behov med kundens egna ord innan presentationen. Då pitchar du mot kundens motivation, inte din egen.</li>
        <li>Plantera dolda behov genom konkret räknande. Inte manipulation — hjälp kunden se sin egen situation.</li>
      </ul>
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
    youtubeId: null,
    teaser: `
      <h3>Det vanligaste misstaget i presentationen</h3>
      <p>De flesta säljare presenterar <em>features</em> — vad produkten kan göra. Kunderna köper <em>outcomes</em> — vad det gör för <strong>dem</strong>. Det är en fundamental skillnad som avgör om kunden köper eller inte.</p>
      <p>Det finns ett enkelt ramverk som omvandlar vilken presentation som helst till en som kunden direkt känner är gjord för just dem. Du lär dig det — och mycket mer — i det här blocket.</p>
    `,
    theory: `
      <h3>Kärnan: du säljer inte en produkt — du säljer en förändring</h3>
      <p>Det mest kostsamma missförståndet i sälj: att presentationen ska handla om din produkt. Den ska handla om <strong>kundens liv när de använder produkten</strong>. Det är en fundamental skillnad.</p>
      <p>Människor köper inte en 10mm-borrmaskin. De köper ett 10mm-hål i väggen. Egentligen köper de inte ens hålet — de köper tavlan som ska hänga där, och känslan i vardagsrummet när besökaren ser tavlan. Borrmaskinen är bara ett medel. Din produkt är också bara ett medel.</p>
      <p>Toppsäljaren presenterar aldrig sin produkt. Hen målar upp den <em>framtida versionen</em> av kunden — där kundens problem är löst, deras dag är lättare, deras chef är imponerad, deras KPI är grön. Därefter visar hen kortfattat hur ni tar dem dit.</p>

      <h3>Problemet: så ser en "normal" presentation ut</h3>
      <p>Typisk genomsnittssäljare presenterar:</p>
      <ul>
        <li>Slide 1: "Om oss" — hur många anställda, var kontoret ligger, grundad år.</li>
        <li>Slide 2–5: logos på kunder de har.</li>
        <li>Slide 6–20: alla features. "Vi har AI. Vi har dashboard. Vi har integrationer. Vi har support. Vi har rapporter."</li>
        <li>Slide 21: "Frågor?"</li>
      </ul>
      <p>Kunden läser den här presentationen i sitt huvud: <em>"Okej, du har gjort det här länge. Du har andra kunder. Du har många grejer. Men … vad betyder det för mig?"</em></p>
      <p>Om du inte besvarar "vad betyder det för mig?" i varje mening kommer kunden tänka det själv — och drar sina egna slutsatser. Ofta fel.</p>

      <h3>Ramverk 1: FAB — bryt vanan att prata features</h3>
      <p>FAB är det enklaste ramverket för att binda ihop produkten med kundens värde. Tre komponenter, och du måste komma till B:</p>
      <ul>
        <li><strong>F — Feature (Egenskap)</strong>: Vad är det? <em>"Vi har 24/7 support."</em></li>
        <li><strong>A — Advantage (Fördel)</strong>: Vad gör det? <em>"Det innebär att problem löses dygnet runt."</em></li>
        <li><strong>B — Benefit (Nytta för kunden)</strong>: Vad betyder det för DEM? <em>"Det betyder att ni aldrig förlorar intäkter på systemstopp — en timme av Q4-kampanjen kan vara värd 80 000 kr för er."</em></li>
      </ul>
      <p>Om du stannar vid F pratar du om dig själv. Om du stannar vid A pratar du om produkten. Bara vid B pratar du om kunden. <strong>Kunden betalar bara för B.</strong></p>
      <p>Bindordet: <em>"vilket betyder för er att …"</em></p>

      <h3>Före vs efter — FAB i praktiken</h3>
      <p><strong>FÖRE:</strong></p>
      <blockquote>
        <p>"Vi har en integration mot Hubspot, Salesforce och Pipedrive. Vi har också AI-drivna insights som analyserar säljsamtal och ger feedback till säljare. Vårt dashboard är anpassningsbart med över 50 datapunkter."</p>
      </blockquote>
      <p><strong>EFTER:</strong></p>
      <blockquote>
        <p>"Ni kör Hubspot idag — vi integrerar direkt, vilket betyder för er att säljarna slipper dubbelarbete och ni får korrekt pipeline-data utan manuellt jobb. Den AI:n ni hörde mig nämna — vad det gör för dig som chef är att du ser vilka säljsamtal som faktiskt flyttar nålen, så du kan coacha på vad som funkar istället för att gissa. För Anna i säljteamet som just börjat innebär det en månads snabbare onboarding."</p>
      </blockquote>
      <p>Samma produkt. Andra presentationen säljs. Första informerar.</p>

      <h3>Ramverk 2: Behov-driven presentation (3-stegs-strukturen)</h3>
      <p>Om du gjort en riktig behovsanalys (Block 5) har du 2–3 låsta behov som kunden själv uttalat. Använd dem som ryggrad i presentationen:</p>
      <ol>
        <li><strong>Ankra till deras egna ord</strong>: <em>"Du sa tidigare att det tar 8 timmar per vecka att sammanställa månadsrapporten — och att Anna klagar på det varje månad."</em></li>
        <li><strong>Presentera lösningen kopplad till JUST det</strong>: <em>"Det är exakt det här är byggt för. Vår rapportmodul drar automatiskt ut data från era system och levererar den rapporten färdig på 3 minuter."</em></li>
        <li><strong>Visa outcome i deras värld</strong>: <em>"Vilket betyder för er att Anna får tillbaka 8h varje vecka — och att rapporten är klar för din VD kl 09:00 måndag morgon utan stress."</em></li>
        <li><strong>Bekräfta</strong>: <em>"Löser det här det problem du beskrev?"</em></li>
      </ol>
      <p>Upprepa per behov. 3 behov = 3 loop. När du är klar är kunden inte "sold" — kunden har <em>själv</em> sagt ja tre gånger till tre av sina egna problem.</p>

      <h3>Ramverk 3: Storytelling — 22x mer minnesvärt</h3>
      <p>Stanfords Jennifer Aaker har forskat fram att berättelser är upp till 22 gånger mer minnesvärda än bara fakta. Du har 10 sekunders kundmöte — de minns storyn. Inte slide 14.</p>
      <p><strong>Storystrukturen (Donald Miller, Pixars modell):</strong></p>
      <ol>
        <li><strong>Karaktären</strong> — en kund precis som dem. Samma bransch, samma roll, samma problem. <em>"En säljchef på ett IT-bolag med 25 säljare."</em></li>
        <li><strong>Problemet</strong> — vad kostade det dem? Kvantifiera. <em>"De tappade affärer i pipelinen eftersom uppföljningarna var sporadiska. CFO beräknade det till 4 MSEK per år i förlorade intäkter."</em></li>
        <li><strong>Guiden</strong> — dig. Inte hjälten — den som visar vägen. <em>"Vi kom in med vår plattform tre veckor senare."</em></li>
        <li><strong>Planen</strong> — vad ni gjorde konkret. <em>"Vi byggde en automatisk cadence, tränade säljarna på 2 dagar, och kopplade in dashboard."</em></li>
        <li><strong>Resultatet</strong> — siffror, inte adjektiv. <em>"90 dagar senare: 34% fler stängda affärer. Förlorade affärer ner 60%."</em></li>
      </ol>
      <p><strong>Regel:</strong> ha 3 färdiga stories i huvudet. Välj den mest relevanta till kundens situation. Aldrig "i allmänhet" — alltid konkret.</p>

      <h3>Ramverk 4: Elevator pitch (30–60 sekunder som säljer dig)</h3>
      <p>Elevator pitchen är inte för hissar. Den är för varje inledning av varje säljsamtal, LinkedIn-profil, nätverksmöte och bordssällskap. Du behöver kunna den i sömnen.</p>
      <p><strong>Formeln:</strong></p>
      <ol>
        <li>Vem hjälper du? (specifik målgrupp)</li>
        <li>Vilket konkret problem löser du?</li>
        <li>Vad är det unika resultatet?</li>
      </ol>
      <p><strong>Före:</strong> <em>"Jag jobbar med säljtjänster för företag."</em> Noll intresse.<br>
      <strong>Efter:</strong> <em>"Vi hjälper B2B-säljchefer att korta sin säljcykel med 40% — genom att automatisera behovsanalysen så att säljarna kan ägna tiden åt affärer istället för formulär."</em></p>
      <p>Testet: kan du säga din elevator pitch utan att tveka, på en öl med någon du just träffat? Om nej — öva tills du kan.</p>

      <h3>Tempot — sälj inte för snabbt</h3>
      <p>Vanligt misstag: nervösa säljare rusar igenom presentationen. Kunden hänger inte med. Hen ler artigt och säger "vi hör av oss". Aldrig hör av sig.</p>
      <p><strong>Bromsa medvetet:</strong></p>
      <ul>
        <li>Pausa 2–3 sekunder efter varje nyckelpunkt.</li>
        <li>Fråga under vägen, inte bara i slutet: <em>"Hänger du med?"</em>, <em>"Är det tydligt?"</em>, <em>"Ser du hur det här skulle fungera hos er?"</em></li>
        <li>Bekräfta förståelse innan du går vidare. Ja-svar bygger momentum.</li>
      </ul>

      <h3>Live-scenarier</h3>
      <p><strong>Scenario 1 — 20-slides-demo och kunden ser på sina anteckningar:</strong></p>
      <ul>
        <li>❌ FEL: Kör på. Hoppas det vänder sig.</li>
        <li>✅ RÄTT: Stanna. <em>"Jag märker att jag går fort — vad skulle vara mest relevant för er just nu? Jag fokuserar dit."</em> Återta kontrollen.</li>
      </ul>
      <p><strong>Scenario 2 — kunden frågar om en specifik feature:</strong></p>
      <ul>
        <li>❌ FEL: Förklara tekniskt hur featuren fungerar.</li>
        <li>✅ RÄTT: <em>"Bra fråga — vad får dig att fråga om just det?"</em> Hitta anledningen. Då kan du presentera featuren i kontext av deras verkliga behov.</li>
      </ul>
      <p><strong>Scenario 3 — kunden avbryter: "Hur mycket kostar det?"</strong></p>
      <ul>
        <li>❌ FEL: Ge priset direkt. Värdet är inte etablerat — numret står nakna utan kontext.</li>
        <li>✅ RÄTT: <em>"Bra fråga — jag vill ge dig ett ärligt svar. Kan vi komma till priset om 5 min? Då vet jag lite mer om hur ni skulle använda det, och jag kan paketera rätt."</em></li>
      </ul>

      <h3>De tre vanligaste presentationsmisstagen</h3>
      <ol>
        <li><strong>Prata features, inte benefits.</strong> Kunden bryr sig inte om din produkts tekniska kapacitet. Hen bryr sig om vad det gör för henne.</li>
        <li><strong>Generisk pitch för varje kund.</strong> Samma 20 slides till alla = relevans = 0. Skräddarsy minst 30% per möte.</li>
        <li><strong>Rusa. Ingen tid för kunden att processa.</strong> En förvirrad kund köper aldrig. Sakta ner medvetet.</li>
      </ol>

      <h3>Presentationens 4-steg innan varje möte (checklista)</h3>
      <ol>
        <li>Vilka 2–3 behov har jag låst från discovery? ✍️</li>
        <li>Vilken FAB-koppling använder jag för varje behov? ✍️</li>
        <li>Vilken story passar just den här kundens situation? ✍️</li>
        <li>Vad är min tydliga CTA i slutet? (aldrig "jag hör av mig") ✍️</li>
      </ol>

      <h3>Handling: kör det här idag</h3>
      <ol>
        <li><strong>Skriv din elevator pitch</strong> med de 3 komponenterna. Säg den högt 5 gånger. Spela in, lyssna.</li>
        <li><strong>Ta 3 av dina features</strong> och översätt dem till Benefits med "vilket betyder för er att …". Skriv ner.</li>
        <li><strong>Bygg 3 stories:</strong> 1 småföretag, 1 mellanstor, 1 stort bolag. Karaktär → problem → lösning → resultat. 90 sekunder vardera.</li>
        <li><strong>Öva:</strong> efter nästa behovsanalys, ankra till kundens egna ord när du presenterar. Använd frasen <em>"ni sa tidigare att …"</em>.</li>
        <li><strong>Ha kalendern öppen</strong> i slutet av varje möte. Boka nästa steg där och då.</li>
      </ol>

      <h3>24-timmarsövningen</h3>
      <p>Idag: ta dina tre mest använda säljpunkter. Skriv dem som F-A-B. Läs upp den gamla (F) och den nya (B) högt bredvid varandra. Du kommer höra skillnaden. Använd den nya i nästa möte. Se hur kunden reagerar — ofta lutar de sig framåt istället för att nicka artigt.</p>

      <h3>Sammanfattning — fem punkter</h3>
      <ul>
        <li>Du säljer inte en produkt. Du säljer en bättre version av kundens liv.</li>
        <li>FAB är livlinan — kom alltid till B. Bindord: "vilket betyder för er att …"</li>
        <li>Presentationen byggs på kundens egna ord från discovery — inte din standard-slide-deck.</li>
        <li>Stories är 22x mer minnesvärda än fakta. Ha 3 färdiga i huvudet.</li>
        <li>Sakta ner. Pausa. Fråga. Förvirrade kunder köper aldrig.</li>
      </ul>
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
    youtubeId: null,
    teaser: `
      <h3>En invändning är ett köpsignal i förklädnad</h3>
      <p>Många säljare fruktar invändningar. Det är fel reaktion. En invändning visar att kunden är engagerad — de är fortfarande i samtalet, de behöver mer övertygelse. En tyst kund som inte invänder är farligare.</p>
      <p>Det här blocket täcker hela invändningsspektrumet — från de reflexmässiga "inte intresserad"-svaren i samtalets första sekunder, till de tuffa avslutsavvisningarna som kräver precision och lugn. Du får konkreta scripts och tekniker för varje scenario.</p>
    `,
    theory: `
      <h3>Inställningen är grundpelaren</h3>
      <p>Alla som lärt sig om inställningens kraft har gjort det genom erfarenheter — ingen föds med det. Att vara engagerad och entusiastisk, och våga visa det, är en av grundpelarna i framgångsrik försäljning. Det smittar av sig — även över en telefonlinje.</p>
      <p>Det kräver fyra saker: tro på dig själv, tro på produkten, tro på företaget — och att ha roligt på jobbet. Utan dessa kan du inte hålla entusiasmen uppe på lång sikt. Ett gott självförtroende ökar din förtroendeindgivelse, och förtroendeindgivelse driver försäljning. Framgång föder framgång.</p>
      <p>Sedan har de flesta av oss en mental spärr — vi intalar oss att något är omöjligt. Om du intalar dig att du inte klarar av något, så blir det sant. Skapa istället en bild av dig själv som en lyckad säljare. Mata hjärnan med positiva ord. Inte förräns du intalat dig att något är möjligt, är det möjligt.</p>
      <p>Självdisciplin är lika viktigt: du får inte låta omgivningen påverka ditt inre. En obehaglig kund ska inte förstöra nästa samtal. <strong>Kontrollera dina känslor — annars kontrollerar de dig.</strong></p>

      <h3>Vad en invändning verkligen är</h3>
      <p>Invändningar är något de flesta säljare avskyrar — delvis för att man inte förstår varför de dyker upp, och framför allt för att man inte vet hur man ska hantera dem. Men invändningar förekommer naturligt i alla samtal.</p>
      <p><strong>En invändning säger inte att kunden ALDRIG vill köpa</strong> — den säger att kunden inte vill köpa just nu, baserat på det underlag de har. "Måste jag ta ett beslut just nu baserat på det här, så blir det ett nej tack." Det är en enorm skillnad mot ett definitivt nej.</p>
      <p>Se det så här: invändningen är egentligen ett <em>"nej tack, men om du berättar mer kan jag faktiskt tänka på att ändra mig."</em></p>
      <p>Två viktiga siffror att hålla i minnet:</p>
      <ul>
        <li><strong>7 av 10 kunder</strong> förstår inte fullt ut varför de ska köpa här och nu — det är ditt jobb att få dem att inse det.</li>
        <li><strong>80% av affärerna</strong> görs på det femte avslutet eller senare.</li>
      </ul>
      <p>Det ger dig all rätt att hålla i samtalet — och all anledning att vara förberedd.</p>

      <h3>De fem typerna av invändningar</h3>
      <p>Det är avgörande att förstå <em>vilken typ</em> av invändning du möter — för svaret ser helt olika ut beroende på det.</p>
      <p><strong>A. Reflexmässig invändning</strong><br>
      Kommer tidigt i samtalet, innan kunden ens vet vad det handlar om. "Nej, jag ska inte ha något." Det är inte ett genomtänkt svar — det är en reflex. Behandla inte detta som en riktig invändning. Om du börjar argumentera mot den förstoras problemet och samtalet stannar upp. Se ett tidigt "nej" nästan som ett "hej" och fortsätt framåt med lugn och entusiasm.</p>
      <p><strong>B. Påhittad invändning</strong><br>
      "Jag tror inte det där kommer funka för oss." <em>Tror?</em> De vet inte riktigt. Undermedvetet går kunden emot för att de är rädda att fatta ett dåligt beslut. Ta inte det första nejet. Ifrågasätt med nyfikenhet: <em>"Vad är det du tror skulle krångla?"</em></p>
      <p><strong>C. Inbillad invändning</strong><br>
      Kunden tror att något hindrar dem — ett hinder som egentligen inte finns. De är osäkra och behöver mer information. Lösning: berätta om hela tjänsten igen. Om du redan gjort det, berätta igen — repetition skapar trygghet. Ifrågasätt vänligt och ta inte det första nejet.</p>
      <p><strong>D. Välgrundad invändning</strong><br>
      Den verkliga orsaken. Det finns tre varianter:</p>
      <ol>
        <li><strong>Känner inget behov</strong> — Ta reda på kundens situation och skapa behovet genom frågeställning. Övertyga om att din lösning passar bättre.</li>
        <li><strong>Sviktande förtroende</strong> — Kunden litar inte på dig, företaget eller produkten. Fråga vilken del de invänder mot och rikta svaret dit. Tryck aldrig hårdare — bygg förtroende istället.</li>
        <li><strong>Otrygghet vid beslutet</strong> — Du pratade för snabbt, oklart, eller gjorde det för komplicerat. Fråga vad som är oklart och förklara igen, tydligare och lugnare.</li>
      </ol>
      <p><strong>E. Köpsignal — ingen invändning!</strong><br>
      Kunden ställer kontrollfrågor om produkten: "Måste jag binda mig?", "Vad kostar det?", "Finns det garanti?" Det är <em>inte</em> invändningar — det är tecken på intresse. En helt ointresserad kund frågar ingenting. Svara rakt och gå sedan på avslutet.</p>

      <h3>Fråga aldrig "varför?"</h3>
      <p>Om du frågar kunden varför de inte ska köpa, tvingar du dem att leta efter fler anledningar att tacka nej. Istället vill du få kunden att berätta vad de behöver för att bli kund.</p>
      <p>Byt ut "varför?" mot frågor som dessa:</p>
      <ul>
        <li><em>"Får jag fråga vad det faller på?"</em></li>
        <li><em>"Hur resonerar du, om jag får fråga?"</em></li>
        <li><em>"Vart klämmer skon?"</em></li>
        <li><em>"Vad är viktigt för dig vid byte av leverantör?"</em></li>
      </ul>
      <p>Den sista frågan är särskilt effektiv — istället för att kunden motiverar sitt nej, börjar de leta fel hos sin nuvarande leverantör. Det är ett helt annat samtal.</p>
      <p>Tala heller aldrig om för kunden att de inte förstår — ingen människa vill känna sig dum. Du kanske har rätt hela vägen, men det handlar inte om vem som har rätt. Det handlar om att sälja. Målet är att bevisa att kunden har fel, men på ett sätt som gör att de <em>behåller sitt goda humör</em>.</p>

      <h3>Var tyst, lyssna — och bygg bryggan</h3>
      <p>En av de viktigaste delarna av invändningshantering är att vara tyst och lyssna. Gör du inte det upplevs du som nonchalant — och folk köper inte av nonchalanta säljare. Signalen du sänder när du avbryter en kund är: <em>"Jag är viktigare än dig."</em> Det fungerar inte om du sedan vill ha deras pengar.</p>
      <p>Var tyst och lyssna klart. Ta ett litet andetag. Leverera sedan ditt svar — som du redan har övat in och vet fungerar.</p>
      <p><strong>Bryggan</strong> är gången från kundens invändning till ditt svar. Struktur:</p>
      <ol>
        <li><strong>Bekräfta och normalisera</strong>: <em>"Absolut, nästan alla säger precis som du gör, att [kundens invändning]..."</em></li>
        <li><strong>Vänd</strong>: <em>"...och det man inte tänker på då är [din förklaring]."</em></li>
        <li><strong>Ny kundnytta</strong>: Lägg till en fördel du inte nämnt tidigare — ett "äss i ärmen".</li>
        <li><strong>Nytt avslut</strong>: Fråga om ordern igen.</li>
      </ol>
      <p>Det du signalerar med normaliseringen är: <em>"Nästan alla säger som du — och ändå köper de."</em> Det är lättare för kunden att ändra sig när alla andra också hade fel från början.</p>
      <p>En variant är att skjuta invändningen åt sidan tillfälligt: <em>"Absolut, men om vi glömmer det för 2 sekunder — vad tyckte du var bra med produkten?"</em></p>

      <h3>LAER-modellen</h3>
      <p>LAER är ett strukturerat ramverk för att hantera invändningar utan att bli defensiv:</p>
      <ul>
        <li><strong>L — Listen (Lyssna)</strong>: Låt kunden tala klart. Avbryt aldrig.</li>
        <li><strong>A — Acknowledge (Bekräfta)</strong>: Visa att du hört och förstått. Börja aldrig med "Men..."</li>
        <li><strong>E — Explore (Utforska)</strong>: Ställ följdfrågor för att förstå den verkliga invändningen. <em>"Berätta mer — vad menar du med för dyrt?"</em></li>
        <li><strong>R — Respond (Svara)</strong>: Adressera den faktiska invändningen med ett genomtänkt svar.</li>
      </ul>

      <h3>100-meters racet — hantera minst fem invändningar</h3>
      <p>Tänk på samtalet som ett 100-meters lopp. Du måste springa hela vägen för att komma i mål. På samma sätt måste du vara beredd att hantera minst fem invändningar i varje samtal — det är norm, inte undantag.</p>
      <p>Slingan ser ut så här:</p>
      <ol>
        <li>Du går på avslut</li>
        <li>Kunden invänder</li>
        <li>Du bygger bryggan</li>
        <li>Du svarar på invändningen</li>
        <li>Du lägger till en ny kundnytta</li>
        <li>Du går på nytt avslut — och upprepar</li>
      </ol>
      <p>Den här slingan fungerar bara när kunden känner sig hörd. En dålig våglängd uppstår när kunden vill bli av med dig för att du är för påträngande eller inte lyssnar. Du som säljare styr alltid samtalet — om inte du gör det, gör kunden det, och kunden styr sällan mot en order.</p>
      <p>Ha alltid ett "nästa steg" i ditt svar. Ett skickligt invändningssvar utan ett nästa steg är värdelöst.</p>

      <h3>Konkreta exempel</h3>
      <p><strong>Exempel 1 — "Du är den sjätte personen som ringer den här veckan!"</strong></p>
      <ol>
        <li>Visa förståelse och relatera: <em>"Jag kan förstå din frustration. Jag kan slå vad om att alla påstod att de hade det bästa priset — och på ett sätt ljug de kanske inte, men de ringde om rörliga eller fasta priser, medan vi har något helt annat..."</em></li>
        <li>Väck intresse med något konkret: <em>"Vi har en ny avtalsform och har hjälpt tusentals kunder med bättre villkor."</em></li>
        <li>Ta tillbaka styrningen: <em>"Har du hört talas om det? Och får jag fråga — vad har du idag?"</em></li>
      </ol>
      <p><strong>Exempel 2 — "Det är för dyrt."</strong></p>
      <ol>
        <li>Bekräfta och normalisera: <em>"Du har helt rätt — det är många som säger likadant. Den här kostar faktiskt mer än konkurrenten, jag hade en kund som sa precis detsamma förra veckan."</em></li>
        <li>Vänd och tillför nytta: <em>"Och det som fick honom att inse varför den är prisvärd är att [förklara vad som är bättre + ny kundnytta som inte nämnts]."</em></li>
        <li>Delaccept och avslut: <em>"Så visst håller du med om att den passar dina behov bättre? Vill du ha den till adress 1 eller 2?"</em></li>
      </ol>

      <h3>Tonalitet — lika barn leker bäst</h3>
      <p>Vi kommunicerar bättre med personer som liknar oss. Anpassa dig efter kunden:</p>
      <ul>
        <li><strong>Energi</strong>: Är kunden energisk — matcha det. Är kunden lugn eller nyvaken — ta det lugnare.</li>
        <li><strong>Tempo</strong>: Prata i samma tempo som kunden. För sakta blir tråkigt, för snabbt låter det rabbel. Använd konstpauser och tempoväxlingar — det gör det intressantare att lyssna.</li>
        <li><strong>Volym</strong>: Prata högt och tydligt. Lite högre än kunden — hög volym signalerar säkerhet, låg volym antyder motsatsen.</li>
        <li><strong>Entusiasm</strong>: Inget smittar till handling så effektivt som entusiasm. Le i telefonen — det hörs. Det är svårare att säga nej till ett flinande fån. Hur ska kunden kunna gilla produkten om inte du gör det?</li>
        <li><strong>Inlevelse</strong>: Ju mer känsla som ligger bakom dina ord, desto lättare fångar du kundens uppmärksamhet. Betona minst ett ord i varje mening. Tänk på HUR du säger det, inte bara VAD du säger.</li>
        <li><strong>Delaccepter</strong>: Stäm av med kunden längs vägen. Ju fler gånger kunden accepterar dina argument under samtalets gång, desto lättare är det att tacka ja i slutet — och du märker tidigt om något inte stämmer.</li>
      </ul>

      <h3>Tidiga invändningar — de reflexmässiga nejen</h3>
      <p>De tidiga invändningarna kommer innan kunden vet vad du erbjuder. De är inte genomtänkta — de är reflexer. Argumentera aldrig direkt mot dem.</p>
      <ul>
        <li><strong>"Inte intresserad"</strong> — Kunden vet inte vad de tackar nej till än. Svara med nyfikenhet: <em>"Det förstår jag — de flesta jag pratar med säger det i första sekunden. Anledningen att jag ringer är [intresseväckare]. Passar det att prata 2 minuter?"</em></li>
        <li><strong>"Har inte tid just nu"</strong> — Bekräfta och ankra: <em>"Absolut, det förstår jag. Det tar bara ett par minuter — och om det inte är relevant för dig lovar jag att inte ta mer av din tid. Passar det nu?"</em></li>
        <li><strong>"Nöjd med det jag har"</strong> — Bygg en bro, utmana inte: <em>"Kul att höra! Det bästa läget att lyssna är faktiskt när man är nöjd — då har man inget att förlora på att ta reda på om det finns ett bättre alternativ. Får jag berätta kort?"</em></li>
        <li><strong>"Skicka information"</strong> — Mjuk avvisning. Svara: <em>"Självklart. Men för att skicka rätt information behöver jag förstå er situation lite — okäj om jag ställer en fråga eller två?"</em></li>
      </ul>

      <h3>Invändningar vid avslut — de tuffaste</h3>
      <p>Sena invändningar — precis när du försöker avsluta — är de svåraste. Det är här de flesta säljare ger upp. Det är precis där toppsäljare vinner affärer.</p>
      <ul>
        <li><strong>"Jag vill tänka på det"</strong> — Fråga vad de behöver tänka på: <em>"Absolut. Är det priset, om det passar er situation, eller är det något annat?"</em> Isolera invändningen — annars tänker de på allt och inget.</li>
        <li><strong>"Jag vill läsa mer / få det skriftligt"</strong> — Fråga vad de vill läsa om: <em>"Självklart. Vad är det du vill veta mer om? Kan jag besvara det nu istället, så sparar du tid?"</em> Ofta söker de bekräftelse, inte papper.</li>
        <li><strong>"Jag måste prata med min partner / chef"</strong> — Engagera dem i processen: <em>"Det är klokt. Vad tror du de kommer att fråga? Jag kan ge dig svaren nu så att du har dem."</em></li>
        <li><strong>"Det känns inte rätt just nu"</strong> — Fråga vad rätt tid innebär: <em>"Det förstår jag. Vad behöver förändras för att tajmingen ska kännas bättre?"</em> Det avslöjar den verkliga invändningen.</li>
      </ul>

      <h3>Pris vs. Värde</h3>
      <p>Prisinvändningar uppstår alltid när värdet inte är tydligt nog. Om kunden säger "det är för dyrt" har du ett presentationsproblem, inte ett prisproblem.</p>
      <p>Svara aldrig med rabatt direkt. Flytta samtalet till värde: <em>"Låt mig visa hur den investeringen ser ut jämfört med vad ni tjänar på det."</em> Och fråga: <em>"Vad kostar det er att inte lösa det här idag?"</em></p>

      <h3>Emotionella vs. rationella invändningar</h3>
      <p>Rationella invändningar (pris, timing, features) är lättare att hantera — de har faktasvar. Emotionella invändningar (rädsla för förändring, förtroendenebrist) kräver mer lyssning och empati. Identifiera vilken typ du möter — svaret ser helt olika ut.</p>

      <h3>Behåll kunden — när nejet verkar definitivt</h3>
      <p>Ibland säger kunden ett tydligt nej vid avslut. Det är inte slutet.</p>
      <ol>
        <li><strong>Acceptera utan att kapitulera</strong>: <em>"Jag respekterar det. Låt mig bara förstå lite bättre..."</em></li>
        <li><strong>Ställ en öppen fråga om nuläget</strong>: Få dem att prata om sin situation — då hittar du öppningar.</li>
        <li><strong>Plantera ett frö</strong>: <em>"Det jag kan säga är att [unik styrka]. Tänk på det. Får jag höra av mig om ett par veckor?"</em></li>
      </ol>
      <p>En kund som lämnar samtalet med ett positivt intryck — trots att de inte köpte — är en potentiell kund nästa månad. En kund som lämnar frustrerad stänger dörren permanent.</p>

      <h3>Zig Ziglar: De fem skälen till att kunder inte köper</h3>
      <p>Säljlegenden Zig Ziglar identifierade fem grundläggande skäl. Alla invändningar kan reduceras till ett av dem:</p>
      <ul>
        <li><strong>1. Inget behov</strong> — Kunden ser inte att de har ett problem. <em>Lösning: Hjälp dem se behovet. "Vad händer om [situation] fortsätter ett år till?"</em></li>
        <li><strong>2. Inga pengar</strong> — Kunden tror att de inte har råd. <em>Lösning: Koppla till ROI. "Vad kostar det er att INTE lösa det här?"</em></li>
        <li><strong>3. Ingen brådska</strong> — Kunden ser inget skäl att agera nu. <em>Lösning: Visa konsekvensen av att vänta.</em></li>
        <li><strong>4. Inget begär</strong> — Kunden vill inte ha det du säljer. <em>Lösning: Gå tillbaka till behovsanalysen och koppla tydligare till vad de bryr sig om.</em></li>
        <li><strong>5. Inget förtroende</strong> — Kunden litar inte på dig, produkten eller företaget. <em>Lösning: Socialbevis, garantier, transparens. Press gör det bara värre.</em></li>
      </ul>
      <p>Nästa gång du möter en invändning: identifiera vilket av de fem det är. Svaret berättar exakt vad du behöver adressera.</p>
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
    youtubeId: null,
    teaser: `
      <h3>Varför säljare misslyckas med avslut</h3>
      <p>Forskning visar att 48% av säljare aldrig ber om affären. De lämnar möten utan ett tydligt nästa steg — och hoppas att kunden tar initiativet. Det är ett kostsamt misstag.</p>
      <p>Avslut handlar inte om manipulation — det handlar om att guida kunden till ett beslut de redan är nära att fatta. Det här blocket lär dig avslutstekniker som faktiskt fungerar, hur du läser köpsignaler, och vad du gör när kunden säger nej.</p>
    `,
    theory: `
      <h3>Kärnan: avslutet är inte en teknik — det är en moralisk handling</h3>
      <p>Zig Ziglar: <em>"Timid salesmen have skinny kids."</em> Ett helt yrke byggt på ett enda motvilligt ord: <strong>ja</strong>. Och ändå visar HubSpot-data att 48% av säljare aldrig ber om affären. De investerar 20 timmar i prospektering, research, möten, demos — och går sedan därifrån med "jag återkommer". Kunden går hem. Livet tar över. Affären dör tyst.</p>
      <p>Sanningen 90% missar: att inte be om affären är inte artigt. Det är egoistiskt. Du prioriterade din egen komfort (slippa ett eventuellt nej) framför kundens behov (att fatta ett beslut och komma vidare). Kunden har redan investerat tid — att lämna dem i limbo är respektlöst.</p>
      <p>Avslut handlar inte om manipulation. Det handlar om att guida kunden till ett beslut de redan är nära att fatta — och som hjälper dem. Om din lösning är rätt för dem är ett tydligt avslut den mest etiska handlingen.</p>

      <h3>Problemet: så förlorar säljare affären i sista sekunden</h3>
      <p>Typisk scen:</p>
      <ul>
        <li>Möte 1: Kunden är positiv. "Det här låter intressant."</li>
        <li>Möte 2: Demo gick bra. Kunden nickar genom alla features. "Vi ska diskutera internt."</li>
        <li>Säljare: "Jag hör av mig om en vecka." → Ingen uppföljning. Ingen deadline. Inget tydligt nästa steg.</li>
        <li>2 veckor senare: kunden svarar inte. Säljaren mejlar "har ni tagit beslut?" — ingen respons.</li>
        <li>6 veckor senare: konkurrenten stängde affären.</li>
      </ul>
      <p>Vad gick fel? Säljaren bad aldrig om affären. De lämnade den öppen för kundens tröghetslagar (som alltid vinner) istället för att driva mot beslut. Kunden blev inte "dum" — säljaren var passiv.</p>

      <h3>Ramverk 1: Köpsignaler — läs termometern innan du avslutar</h3>
      <p>Kunder skickar signaler om att de är nära köp. Det är ditt jobb att läsa dem. Missar du signalerna, missar du fönstret.</p>
      <p><strong>Verbala köpsignaler:</strong></p>
      <ul>
        <li>De byter pronomen: <em>"Hur skulle vi använda det här?"</em> ("vi" = de ser redan sig själva som kunder)</li>
        <li>Detaljfrågor: <em>"Hur lång är leveranstiden?"</em>, <em>"Hur ser supporten ut?"</em>, <em>"Kan vi starta i mars?"</em></li>
        <li>Framtidsscenarier: <em>"När vi har det här implementerat …"</em></li>
        <li>Direkt: <em>"Vad är nästa steg?"</em></li>
        <li>Prisdetaljer: <em>"Vad kostar tillägget för X användare?"</em></li>
      </ul>
      <p><strong>Icke-verbala köpsignaler (video/fysiska möten):</strong></p>
      <ul>
        <li>Lutar sig framåt, nickar mer.</li>
        <li>Börjar anteckna — inte bara lyssna.</li>
        <li>Tonläget blir mer engagerat, snabbare.</li>
        <li>Börjar diskutera med kollegor i rummet.</li>
      </ul>
      <p><strong>Regeln:</strong> när du ser en köpsignal — gå på avslut. Inte "nästa gång", inte "efter fler slides". Nu. Kundens energi är på topp, och momentum försvinner snabbt.</p>

      <h3>Ramverk 2: Sju avslutstekniker — välj rätt till situationen</h3>

      <h3>1. Trial Close — temperaturtestet</h3>
      <p>Innan du ber om affären, testa temperaturen. Ingen risk, bara information.</p>
      <ul>
        <li><em>"Hur låter det här hittills?"</em></li>
        <li><em>"Ser du hur det här skulle lösa det ni diskuterade?"</em></li>
        <li><em>"Finns det något som skulle stå i vägen från er sida?"</em></li>
      </ul>
      <p>Positivt svar = grön flagg, gå på Assumptive. Tveksamt svar = ny invändning dyker upp, adressera innan avslut.</p>

      <h3>2. Assumptive Close — antagandeavslutet</h3>
      <p>Du agerar som om beslutet redan är fattat. Du frågar inte "vill ni köpa?" utan "hur startar vi?".</p>
      <ul>
        <li><em>"Vilken dag passar bäst för uppstart — tisdag eller torsdag?"</em></li>
        <li><em>"Vill ni att vi skickar kontraktet till dig eller direkt till CFO?"</em></li>
        <li><em>"Startar vi med 25 licenser eller direkt på 50?"</em></li>
      </ul>
      <p>Fungerar bäst: när rapport är stark och du läst tydliga köpsignaler. Fungerar illa: när kunden är kall eller tveksam — då känns det pressande.</p>

      <h3>3. Alternative Close — alternativavslutet</h3>
      <p>Ge två positiva val istället för ja/nej. Hjärnan tenderar välja mellan alternativen istället för att bestämma "ja eller nej".</p>
      <ul>
        <li><em>"Ska vi köra på Standard eller Pro från start?"</em></li>
        <li><em>"Månadsbetalning eller hela året i förskott — vilket passar er ekonomi?"</em></li>
      </ul>

      <h3>4. Summary Close — sammanfattningsavslutet</h3>
      <p>Bygg ett berg av ackumulerade ja innan det stora ja:et.</p>
      <blockquote>
        <p><em>"Så för att sammanfatta: ni ville spara 15 timmar per månad på administration — det löser vi. Ni ville komma ur er nuvarande leverantör innan Q3 — vi klarar det. Ni ville ha en partner som följer upp på riktigt — det är vår vardag. Är ni redo att gå vidare?"</em></p>
      </blockquote>

      <h3>5. Urgency Close — äkta tidstrycket</h3>
      <p>Fungerar BARA om urgensen är äkta. Fabricerad urgency förstör ditt rykte permanent.</p>
      <ul>
        <li><em>"Vårt implementeringsteam har kapacitet i Q2 men fyller på sig snabbt — vill ni säkra platsen?"</em> (äkta)</li>
        <li><em>"Det här priset gäller till fredag."</em> (bara om det faktiskt är sant)</li>
        <li><em>"Vi höjer priserna 1 maj — hinner ni bestämma före?"</em> (om det faktiskt händer)</li>
      </ul>

      <h3>6. Ben Franklin Close — för analytiska kunder</h3>
      <p>Benjamin Franklin fattade svåra beslut med en tvådelad lista: för och emot. När en kund tvekar:</p>
      <blockquote>
        <p><em>"Låt oss göra en snabb Ben Franklin. Skriv upp de tre starkaste anledningarna att gå vidare. Sen skriver vi anledningarna att inte göra det. Ser vi klarare då?"</em></p>
      </blockquote>
      <p>Du hjälper ofta kunden själv att övertyga sig — för-listan blir alltid längre.</p>

      <h3>7. Tystnads-avslutet (den svåraste, den mest effektiva)</h3>
      <p>Efter att du ställt frågan: <strong>var tyst</strong>. Helt tyst. Räkna till 20 i huvudet om du måste. Den som bryter tystnaden först förlorar. Säljare som tål tystnaden efter <em>"är ni redo att skriva under?"</em> vinner affären 70% oftare än de som fyller luften med "men om ni behöver mer tid …".</p>

      <h3>Före vs efter — avslut i praktiken</h3>
      <p><strong>FÖRE (den rädde säljaren):</strong></p>
      <blockquote>
        <p>"…jag tror det kan funka bra för er. Kanske ska ni diskutera internt? Jag hör av mig nästa vecka om ni vill."</p>
      </blockquote>
      <p><strong>EFTER (den tränade säljaren):</strong></p>
      <blockquote>
        <p>"Det du just beskrev är exakt det vi löser — att spara 15h/månad och få uppföljning som fungerar. Om inget stoppar er — ska vi säkra att ni är igång före månadsskiftet?"</p>
      </blockquote>
      <p>Samma situation. Samma produkt. Den ena lämnar affären hängande i luften. Den andra stänger den.</p>

      <h3>Live-scenarier</h3>
      <p><strong>Scenario 1 — kunden säger "Jag måste diskutera med min chef":</strong></p>
      <ul>
        <li>❌ FEL: "Okej, hör av dig när ni bestämt."</li>
        <li>✅ RÄTT: "Helt rimligt. Vad ska jag skicka till dig som hjälper det samtalet? En 2-sidors-sammanfattning? Och när tror du ni hinner prata? Onsdag?"</li>
      </ul>
      <p><strong>Scenario 2 — kunden säger "Vi ska fundera":</strong></p>
      <ul>
        <li>❌ FEL: "Ingen stress, hör av dig när det passar."</li>
        <li>✅ RÄTT: "Absolut — vad är det som känns osäkert? Vi kan oftast adressera det direkt."</li>
      </ul>
      <p><strong>Scenario 3 — kunden säger tydligt nej:</strong></p>
      <ul>
        <li>❌ FEL: "Okej, tack för din tid." → Släpp.</li>
        <li>✅ RÄTT: "Ingen stress. Kan jag fråga — är det tajmingen, lösningen, eller nåt annat? Jag vill förstå för att veta hur jag bäst kan hjälpa framöver." → Få sanningen.</li>
      </ul>

      <h3>Hantera "nej" — det är sällan ett nej för alltid</h3>
      <p>Brent Adamson (The Challenger Sale) visar att 53% av B2B-kunder som inte köper från dig idag kommer köpa av någon i samma kategori inom 18 månader. Nej idag betyder ofta: fel tajming, fel prioritet, fel förutsättning.</p>
      <p>När du får ett nej, fråga:</p>
      <ul>
        <li><em>"Vad skulle behöva vara sant för att ni skulle säga ja?"</em></li>
        <li><em>"Är det frågan om att det är fel just nu, eller fel i sig?"</em></li>
        <li><em>"Är det okej om jag hör av mig i april när situationen eventuellt förändrats?"</em></li>
      </ul>
      <p>Notera i CRM: orsak till nej + när att följa upp. Sätt påminnelse. Återkomst i rätt tid konverterar häpnadsväckande ofta.</p>

      <h3>De tre vanligaste avslutsmissarna</h3>
      <ol>
        <li><strong>Be aldrig om affären.</strong> Hoppas att kunden tar initiativet. De gör det aldrig. Någonsin.</li>
        <li><strong>Bryta sin egen tystnad efter frågan.</strong> Du frågar <em>"är ni redo?"</em> och 3 sekunder senare säger du <em>"men det är klart om ni behöver mer tid …"</em>. Du förhandlade precis ner din egen affär.</li>
        <li><strong>Fabricerad urgency.</strong> "Gäller bara idag!" när det inte stämmer. Kunden googlar, fattar, och du är död som trovärdig säljare.</li>
      </ol>

      <h3>Handling: kör det här nu</h3>
      <ol>
        <li><strong>I nästa möte:</strong> be om affären. Uttryckligen. En av teknikerna ovan. Inte "jag tror", utan "ska vi gå vidare?".</li>
        <li><strong>Efter frågan:</strong> var tyst. 10 sekunder minst. Låt kunden svara.</li>
        <li><strong>Om nej:</strong> fråga varför. Be om tillåtelse att höra av sig igen. Logga det i CRM.</li>
        <li><strong>Spela in dig själv</strong> i ett fejkade avslut med en kollega — lyssna. Du kommer höra din egen tvekan.</li>
        <li><strong>Räkna:</strong> för varje möte — bad du om affären? Ja/nej i en anteckning. Efter en vecka ser du mönstret.</li>
      </ol>

      <h3>24-timmarsövningen</h3>
      <p>Imorgon. Nästa möte med en kund där det känns "varmt". Öva i förväg — säg orden högt för dig själv innan: <em>"Om inget stoppar er, ska vi gå vidare?"</em> När momentet kommer: ställ frågan. Stäng munnen. Vänta.</p>
      <p>Om svaret är ja — underbart. Om svaret är nej — du fick reda på något du inte hade annars. Båda är vinst. Att inte fråga är den enda förlust som finns.</p>

      <h3>Sammanfattning — fem punkter</h3>
      <ul>
        <li>48% av säljare ber aldrig om affären. Den ena handlingen skiljer 80:20 från 20:80.</li>
        <li>Läs köpsignaler — "vi"-pronomen, detaljfrågor, framtidstänk. Gå på avslut när de visar sig.</li>
        <li>Välj teknik till situation: Trial → Assumptive → Alternative → Summary → Urgency (äkta).</li>
        <li>Tystnaden efter frågan är din vän. Bryt den aldrig först.</li>
        <li>Nej idag är sällan nej för alltid. Fråga varför, be om att få återkomma, logga det.</li>
      </ul>
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
    youtubeId: null,
    teaser: `
      <h3>Uppföljningens verklighet</h3>
      <p>80% av affärer kräver 5 eller fler uppföljningskontakter. Ändå ger 44% av säljare upp efter ett enda försök. Det är precis där affärer förloras — inte i mötet, utan i efterarbetet.</p>
      <p>Det här blocket ger dig ett konkret system för uppföljning som skapar värde vid varje kontakt — och som kunder faktiskt uppskattar att ta emot.</p>
    `,
    theory: `
      <h3>Uppföljningens verklighet — det dolda slagfältet</h3>
      <p>Affärer förloras sällan i det första mötet. De förloras i tystnaden som följer. Kunden blev imponerad, sa "jag återkommer" — och så tog livet över. En viktig rapport. En semester. En pandemi. Ett rebygge. Nästa veckas eldupprätta. När du ringer tre veckor senare minns de knappt ditt namn.</p>
      <p>Det här är säljarens verkliga slagfält. Inte pitchen. Inte invändningen. Utan disciplinen att stanna kvar i kundens medvetande utan att bli besvärlig.</p>
      <p>Statistik varje säljare bör bära med sig:</p>
      <ul>
        <li><strong>80%</strong> av affärer kräver 5 eller fler uppföljningskontakter innan kunden säger ja (forskning från Marketing Donut).</li>
        <li><strong>44%</strong> av säljare ger upp efter ett enda uppföljningsförsök.</li>
        <li><strong>12%</strong> ger upp efter tre försök.</li>
        <li><strong>Bara 8%</strong> av säljare gör 5+ uppföljningar — och de stänger <strong>80%</strong> av alla affärer.</li>
      </ul>
      <p>Matten är brutal och enkel: om du är bland de 8 procenten som följer upp ordentligt, konkurrerar du mot 8 andra i branschen. Om du är bland de 92 procenten som inte gör det, konkurrerar du mot 92 andra. Välj vilket hav du vill simma i.</p>

      <h3>Varför säljare ger upp — och varför kunder inte svarar</h3>
      <p>Det handlar sällan om lathet. Det är psykologi. Varje obesvarat mejl känns som en minimal-rejection. Efter 3–4 sådana börjar din hjärna skydda ditt ego genom att hitta förklaringar: <em>"De är inte intresserade."</em> <em>"Jag stör dem."</em> <em>"De har säkert hittat någon annan."</em> Det är inte sant — men det är bekvämt att tro på.</p>
      <p>Samtidigt: kunden är inte tyst för att hen ogillar dig. Hen är tyst för att hen har 137 oöppnade mejl, en eldstrid på jobbet och tre saker som just nu är viktigare än ditt avtal. En bra uppföljning erkänner den verkligheten istället för att klaga på den.</p>

      <h3>Regeln: ge ett skäl att höra av sig — inte ett skäl att svara</h3>
      <p>Den klassiska uppföljningen — <em>"Har ni bestämt er?"</em> eller <em>"Ville bara checka av"</em> — är säljarens motsvarighet till att ringa på mitt i natten och fråga om grannen är vaken. Den ger kunden inget skäl att öppna mejlet, inget skäl att svara, och ännu mindre skäl att säga ja.</p>
      <p>Premissen: <strong>varje uppföljning ska innehålla något kunden faktiskt skulle vilja få i sin inkorg — även om de aldrig köpte av dig</strong>. En insikt, en trend i branschen, ett case, en artikel, en fråga som får dem att tänka. Du bygger en relation, inte en skuldkänsla.</p>

      <h3>Uppföljningscadensen — 7-touch-modellen</h3>
      <p>Forskning från Gong och SalesLoft på miljontals sekvenser pekar på samma mönster: de bästa säljarna gör cirka 7 kontakter över 3–4 veckor, varierar kanal (mejl, telefon, LinkedIn, röstmeddelande) och håller varje touch kort och värdebärande. Här är en cadens som fungerar:</p>
      <ul>
        <li><strong>Dag 0 — direkt efter mötet</strong>: Tack-mejl med 3 rader: vad vi kom överens om, nästa steg, en konkret värdebit de bad om eller du lovade.</li>
        <li><strong>Dag 3</strong>: Följdvärde — en artikel, ett case, en statistik som är relevant för exakt det problem vi diskuterade. Inte "kolla vår grymma produkt".</li>
        <li><strong>Dag 7</strong>: Kort telefonuppringning eller röstmeddelande: <em>"Hej, bara en kort tanke jag fick efter vårt samtal — ring tillbaka när du har 3 min, inget stressigt."</em></li>
        <li><strong>Dag 12</strong>: Social touch — kommentera på ett inlägg de gjort på LinkedIn eller skicka en relevant artikel där. Utan agenda.</li>
        <li><strong>Dag 18</strong>: Ny vinkel. Inte samma pitch. Ny fråga: <em>"Har du funderat över X? Jag frågar för att en annan kund i er bransch nämnde det i veckan."</em></li>
        <li><strong>Dag 25</strong>: Ett enkelt mejl: <em>"Är det här fortfarande aktuellt, eller har prioriteterna flyttat sig?"</em> Ger kunden ett enkelt sätt att säga nej utan att känna skuld.</li>
        <li><strong>Dag 32 — "break-up"-mejlet</strong>: Se nedan. Den mest effektiva uppföljningen av alla.</li>
      </ul>
      <p>Matcha cadensens tempo till affärens natur. En snabb SMB-affär tål veckotakt. En komplex enterprise-affär kräver månader. Men <em>strukturen</em> är densamma: varierande touchar, alltid med värde, alltid med respekt för kundens tid.</p>

      <h3>Break-up-mejlet — säljarens hemliga vapen</h3>
      <p>När du följt upp 5–6 gånger utan svar, skriv inte ytterligare en "hej, hur ligger det till". Skriv istället avskedsmejlet. Det är en av de mest konverterande typerna av mejl som finns:</p>
      <blockquote>
        <p>Ämne: Ska jag stänga ditt ärende?</p>
        <p>Hej [namn],</p>
        <p>Jag har inte hört från dig på ett tag och jag vill inte fortsätta följa upp om det inte är aktuellt. Om du hellre vill att jag stänger ditt ärende och lämnar dig i fred, svara bara "stäng" så gör jag det — ingen tjat.</p>
        <p>Om det bara varit stressigt och vi ska återuppta samtalet, säg det också.</p>
        <p>Hälsningar<br>[Du]</p>
      </blockquote>
      <p>Det fungerar av flera skäl: (1) det aktiverar "loss aversion" — tanken på att förlora alternativet värderas högre än chansen att få det; (2) det respekterar kundens autonomi; (3) det bryter monotonin i uppföljningskedjan. Svarsfrekvensen på break-up-mejl ligger typiskt runt 30–50% — vilket är dramatiskt högre än alla föregående uppföljningar.</p>

      <h3>CRM — din andra hjärna</h3>
      <p>Den bästa säljaren minns sällan något. Hen har bara ett system som minns åt henne. CRM (HubSpot, Salesforce, Pipedrive, Lime, Upsales) är inte ett administrativt straff — det är din andra hjärna. Utan CRM:</p>
      <ul>
        <li>Du missar uppföljningar du faktiskt hade tänkt göra.</li>
        <li>Du minns inte vad ni sa för tre veckor sedan — och kunden märker.</li>
        <li>Du kan inte lära dig av dina förlorade affärer, eftersom du inte kan analysera mönstren.</li>
      </ul>
      <p>Regel: varje kontakt loggas, samma dag. Alla fältnoteringar — vad som sades, vad kunden bryr sig om, familjesituation, favoritlag, nästa steg. En säljare som efter 6 månader kan säga <em>"Hur gick det med dotterns rekrytering till handbollsgymnasiet?"</em> bygger en relation som ingen konkurrent kan replikera.</p>

      <h3>Uppföljning efter köp — där de flesta pengarna ligger</h3>
      <p>Den dyraste kunden du någonsin kommer sälja till är den första. Att få en ny kund kostar enligt HubSpots benchmark 5–7 gånger mer än att sälja mer till en befintlig. Säljare som stannar i "jakt-läge" för alltid lämnar enorma intäkter på bordet.</p>
      <ul>
        <li><strong>Upsell</strong> — uppgradera till ett högre paket. Tajma på naturliga triggers: de växer, de skalar, de får nya behov.</li>
        <li><strong>Cross-sell</strong> — sälj ett kompletterande produkt eller tjänst. Kräver att du faktiskt förstår deras verksamhet, inte bara ditt sortiment.</li>
        <li><strong>Referral</strong> — en nöjd kund är din bästa säljare. Fråga, direkt: <em>"Känner du tre personer som skulle ha nytta av det här? Jag skulle uppskatta en introduktion."</em> En referral konverterar 4 gånger snabbare än kall outreach och med 3 gånger högre LTV.</li>
        <li><strong>Reactivation</strong> — gamla kunder som slutade köpa är ofta lättare att vinna tillbaka än att vinna nya. Ha en kvartalsvis reactivation-rutin.</li>
      </ul>

      <h3>Psykologin i att bli "ihågkommen"</h3>
      <p>Det finns ett koncept inom marknadsföring som heter <em>mental availability</em> — hur lätt ditt namn dyker upp när kunden tänker på en lösning. Du vinner inte affären de ögonblick kunden fattar beslutet. Du vinner den under de månaderna du ligger i minnet och väntar på det ögonblicket.</p>
      <p>Jeb Blount skriver i <em>Sales EQ</em>: "Pengar förlorar de säljare som tror att säljet slutar vid nej. Pengar tjänar de säljare som förstår att nej bara betyder 'inte nu'."</p>

      <h3>När det är dags att släppa — och när det inte är det</h3>
      <p>Inte alla prospekts blir kunder. Att släppa dåliga affärer snabbt är lika viktigt som att hänga kvar i bra. Kriterier för när du ska släppa:</p>
      <ul>
        <li>Kunden har inte svarat på 6 månader trots break-up-mejl.</li>
        <li>De har tydligt flyttat till en konkurrent — och är mitt i avtalstid.</li>
        <li>Du har verifierat att du inte har rätt lösning för dem.</li>
      </ul>
      <p>Men — sätt en påminnelse om 6 månader. <em>"Kolla om situationen förändrats."</em> De konkurrentavtal de signerade har en utgång. Den där företagets prioritering från ifjol är inte densamma som i år. Säljaren som dyker upp igen precis när fönstret öppnas igen vinner. Varje gång.</p>
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
    youtubeId: null, // Byt till riktigt YouTube-ID när Joakims video är inspelad
    teaser: `
      <h3>Motivation vs. System</h3>
      <p>Motivation är en känsla. System är en struktur. Framgångsrika säljare förlitar sig inte på att de "känner för att" ringa samtal — de har ett system som levererar oavsett dagsform.</p>
      <p>Det här blocket lär dig hur du sätter mål som faktiskt håller, aktivitetssystem som ger konsekventa resultat, och hur du hanterar de perioder när motivationen sviktar.</p>
    `,
    theory: `
      <h3>Kärnan: motivation är en känsla — system är en struktur</h3>
      <p>Motivation kommer och går. Den kommer efter en bra affär, efter en inspirerande podcast, efter en söndagskväll när du planerar nästa vecka. Den försvinner efter ett jobbigt nej, en dålig måndag, en periodvis trötthet. Att bygga karriär på motivation är att bygga hus på havet.</p>
      <p>James Clear, författaren bakom <em>Atomic Habits</em>, sammanfattade det perfekt: <em>"You do not rise to the level of your goals. You fall to the level of your systems."</em></p>
      <p>Skillnaden: målet är <em>var du vill vara</em>. Systemet är <em>vad du gör varje dag oavsett hur du mår</em>. Toppsäljare har system som levererar 10 samtal, 5 möten och 3 offerter i veckan — oavsett om det är måndag morgon efter dålig sömn eller fredag eftermiddag efter ett nej. Medelmåttan väntar på rätt känsla. Den kommer inte.</p>

      <h3>Problemet: så fungerar inte mål — och så fallerar de flesta säljare</h3>
      <p>Typisk sekvens:</p>
      <ul>
        <li>Januari: säljaren sätter målet "jag ska stänga 2 MSEK i år". Skriver det i en Google Doc. Känner sig peppad.</li>
        <li>Februari: glömmer målet. Fokuserar på dagliga bränder.</li>
        <li>Mars: dålig månad. Märker att hen ligger efter.</li>
        <li>April–juni: jagar kvartalet. Gör det i sista stund.</li>
        <li>Juli: trött, åker på semester, behöver en paus.</li>
        <li>Augusti–december: samma cykel. När året är slut: 1,3 MSEK. 65% av målet.</li>
      </ul>
      <p>Problemet är inte målet — det är att det inte finns något system som driver mot målet. Ett mål utan dagligt system är en önskan.</p>

      <h3>Ramverk 1: Aktivitetsmål vs resultatmål — skilj mellan vad du kontrollerar och inte</h3>
      <p>Det här är kanske det viktigaste konceptet i hela säljyrket:</p>
      <ul>
        <li><strong>Resultatmål</strong>: Intäkt, antal affärer, kvotuppfyllnad. <em>Utanför din direkta kontroll</em>. Beror på kundens beslut, marknadens timing, konkurrensen.</li>
        <li><strong>Aktivitetsmål</strong>: Antal samtal, möten bokade, offerter skickade. <em>Helt inom din kontroll</em>. Du bestämmer ifall du ringer 20 eller 50 samtal idag.</li>
      </ul>
      <p><strong>Regel:</strong> fokusera ditt dagliga fokus på aktivitetsmålen. Resultaten är en matematisk konsekvens.</p>
      <p>Exempel (bakåt-räkna ditt system):</p>
      <ul>
        <li>Din stängningsprocent är 20%.</li>
        <li>Du behöver 4 affärer i månaden.</li>
        <li>→ Du behöver 20 kvalificerade möten.</li>
        <li>→ Du behöver ringa 100 samtal för att boka dem.</li>
        <li>→ Det är 5 samtal per arbetsdag. Icke-förhandlingsbart.</li>
      </ul>
      <p>När du bryter ner kvoten till dagligt aktivitetsmål blir målet hanterligt — inte överväldigande. Du behöver inte "stänga 4 affärer". Du behöver bara ringa 5 samtal idag.</p>

      <h3>Ramverk 2: Atomic Habits — bygg systemet som levererar</h3>
      <p>James Clears fyra lagar för beteendeförändring:</p>
      <ol>
        <li><strong>Gör det uppenbart (Cue)</strong> — trigger som påminner. Post-it på skärmen med "09:00 = Power Hour".</li>
        <li><strong>Gör det attraktivt (Craving)</strong> — koppla till något positivt. "Efter 20 samtal tar jag en riktig kaffe."</li>
        <li><strong>Gör det enkelt (Response)</strong> — sänk friktionen. Ha listan uppklistrad, headset på, CRM öppet innan du sätter dig.</li>
        <li><strong>Gör det belönande (Reward)</strong> — omedelbar feedback. Pricka av varje samtal. Se siffran växa.</li>
      </ol>
      <p>Clears centrala insikt: <em>"Every action you take is a vote for the type of person you wish to become."</em> Varje samtal du ringer är en röst på "jag är en säljare som ringer 10 samtal per dag". Efter 100 dagar är identiteten omformulerad.</p>

      <h3>Ramverk 3: SMART-mål (korrekt använt)</h3>
      <p>Klassikern, men ofta missanvänd. Korrekt SMART:</p>
      <ul>
        <li><strong>S — Specifikt</strong>: "Jag ska boka 5 nya möten per vecka med CFO-nivå" slår "jag ska öka aktiviteten".</li>
        <li><strong>M — Mätbart</strong>: siffror, inte känslor. "Boka 5 möten". Inte "engagera mig mer".</li>
        <li><strong>A — Accepterat/Uppnåbart</strong>: du tror faktiskt att du kan. Inte avskräckande orealistiskt.</li>
        <li><strong>R — Relevant</strong>: kopplar till årsmålet. Inte ett sidospår.</li>
        <li><strong>T — Tidsbundet</strong>: "senast fredag kl 17" — inte "snart".</li>
      </ul>
      <p>SMART-mål fungerar bara om du <strong>recensar dem veckovis</strong>. Ett SMART-mål som sitter i en doc du aldrig öppnar är ingen struktur — det är en lögn du berättar för dig själv i januari.</p>

      <h3>Ramverk 4: Carol Dwecks mindset-modell</h3>
      <p>Carol Dweck, Stanford-psykolog, forskade i 30+ år på vad som skiljer presterare från underpresterare. Hennes slutsats i <em>Mindset</em>: det är inte talang — det är hur du tolkar misslyckanden.</p>
      <ul>
        <li><strong>Fixed mindset</strong>: "Jag är dålig på cold calling." <em>Tolkar förmåga som statisk, medfödd.</em> Undviker utmaning, ger upp vid motgång.</li>
        <li><strong>Growth mindset</strong>: "Jag är inte bra på cold calling <em>ännu</em>." <em>Tolkar förmåga som byggbar.</em> Söker utmaning, lär sig av motgång.</li>
      </ul>
      <p>Det enda ordet <em>"ännu"</em> är en transformation. Börja lägga det efter varje självkritisk tanke. "Jag klarar inte invändningshantering … ännu." "Jag missar avslutet … ännu." Det sätter hjärnan i lärläge istället för försvarsläge.</p>

      <h3>Ramverk 5: Hantera avvisanden som data</h3>
      <p>Avvisanden är oundvikliga i sälj. Att jobba med sälj är att få nej för att leva. Skillnaden mellan dig och toppsäljaren är inte hur många nej ni får — det är hur ni tolkar dem.</p>
      <p><strong>Principer:</strong></p>
      <ul>
        <li><strong>Nej gäller erbjudandet, inte dig.</strong> Kunden säger nej till din produkt just nu — inte till dig som person. Separera de två.</li>
        <li><strong>Sätt mål för antalet nej</strong>: Om din stängningsprocent är 20% och du vill ha 10 ja = du behöver 40 nej. Jaga dem. Varje nej är en rast närmare ett ja.</li>
        <li><strong>Feedback-loop:</strong> efter varje nej, en fråga: "vad lärde jag mig?" Skriv i CRM. Efter 100 nej har du en master-class i invändningar.</li>
      </ul>

      <h3>Leading vs lagging indicators — mät rätt saker</h3>
      <p>Lagging indicator = resultatet (intäkt, stängda affärer). Kommer sent och kan inte påverkas direkt.<br>
      Leading indicator = aktiviteten som driver resultatet (samtal, möten, demos). Kommer tidigt och kan direkt påverkas.</p>
      <p>Om du bara mäter laggers kommer du vara reaktiv. Mäter du leaders kan du justera en vecka innan laggers visar problemet.</p>
      <p>Dashboard för en säljare ska innehålla dagliga leading indicators:</p>
      <ul>
        <li>Antal samtal/dag</li>
        <li>Antal bokade möten/vecka</li>
        <li>Antal demos/vecka</li>
        <li>Antal skickade offerter/vecka</li>
        <li>Pipeline-värde (uppdaterat i CRM)</li>
      </ul>

      <h3>Före vs efter — hur det ser ut i praktiken</h3>
      <p><strong>FÖRE (mål-orienterad säljare):</strong></p>
      <blockquote>
        <p>"Jag ska stänga 2 MSEK i år. Det motsvarar 4 affärer per kvartal. Jag måste jobba hårt." — Efter två veckor är målet glömt. Efter tre månader är hen 30% efter och panikstänger fel affärer.</p>
      </blockquote>
      <p><strong>EFTER (system-orienterad säljare):</strong></p>
      <blockquote>
        <p>"Min målbild: 2 MSEK. Det kräver 16 affärer/år. Min stängningsprocent är 25%, så jag behöver 64 skickade offerter. Det ger 5 offerter/månad. För 5 offerter behöver jag 15 kvalificerade möten. För 15 möten: 60 samtal per månad = 3 per dag. Det är mitt system. Jag ringer 3 samtal varje morgon kl 09–10. Utan undantag." — Efter 12 månader har hen 2,1 MSEK. Utan drama.</p>
      </blockquote>

      <h3>Live-scenarier</h3>
      <p><strong>Scenario 1 — du vaknar omotiverad och vill skippa dagens samtal:</strong></p>
      <ul>
        <li>❌ FEL: "Jag tar det lugnt idag, kommer igen imorgon."</li>
        <li>✅ RÄTT: Systemet är icke-förhandlingsbart. Du gör de 3 samtalen innan du tillåter dig något annat. Motivation kommer efter handling — inte före.</li>
      </ul>
      <p><strong>Scenario 2 — du fick 3 nej i rad:</strong></p>
      <ul>
        <li>❌ FEL: "Uppenbarligen fungerar inte det här idag, jag pausar."</li>
        <li>✅ RÄTT: Fråga: "Vad lärde jag mig?" Skriv 3 bulletpoints. Ring näste. Du behöver nejen — de är del av räkningen.</li>
      </ul>
      <p><strong>Scenario 3 — du överträffat målet tidigt i månaden:</strong></p>
      <ul>
        <li>❌ FEL: "Bra, nu kan jag koppla av resten av månaden."</li>
        <li>✅ RÄTT: Systemet ändras inte. Du fortsätter på samma tempo. Nästa månads pipeline byggs nu.</li>
      </ul>

      <h3>Dagliga & veckovisa ritualer</h3>
      <p><strong>Morgon (5 min)</strong>: dagens 3 viktigaste aktiviteter. Inga "borde-göra", bara "ska-göra".<br>
      <strong>Kväll (5 min)</strong>: reflektion. Vad lärde jag mig? Vad justerar jag imorgon?<br>
      <strong>Söndag (30 min)</strong>: veckoplanering. Pipeline-review. Vad måste hända denna vecka för att systemet håller?<br>
      <strong>Månadens sista dag</strong>: honest review. Hit/missade målet? Varför? Justera systemet — inte bara målet.</p>

      <h3>De tre vanligaste mål-misstagen</h3>
      <ol>
        <li><strong>Skriva målet, inte systemet.</strong> "Jag ska tjäna mer" är en önskan. "Jag ringer 5 samtal varje morgon" är ett system.</li>
        <li><strong>Förlita sig på motivation.</strong> Motivation är en väderleksrapport. System är klimatet.</li>
        <li><strong>Inte recensera veckovis.</strong> Utan veckoreview driver du i blindo. Söndagskvällens 30 min är den dyraste halvtimmen du aldrig tog dig tid för.</li>
      </ol>

      <h3>Handling: kör det här idag</h3>
      <ol>
        <li><strong>Bakåträkna från årsmålet till dagliga aktiviteter.</strong> Vad måste hända varje dag för att resultatet ska landa?</li>
        <li><strong>Ha 3 dagliga aktivitetsmål</strong> som är icke-förhandlingsbara. Inte fler.</li>
        <li><strong>Post-it på skärmen:</strong> "Systemet > känslan". Se den varje dag.</li>
        <li><strong>Sätt söndagsplaneringen i kalendern</strong> — 30 min, varje söndag. Behandla den som ett kundmöte.</li>
        <li><strong>Feedback-loop efter varje nej</strong>: en mening i CRM. "Vad lärde jag mig?"</li>
      </ol>

      <h3>24-timmarsövningen</h3>
      <p>Imorgon: bakåträkna från din nuvarande kvot till dagliga aktiviteter. Hur många samtal per dag? Skriv siffran på en post-it och klistra på skärmen. När du märker att du inte når siffran — ring. Innan du gör något annat. Systemet är chefen, inte känslan.</p>

      <h3>Sammanfattning — fem punkter</h3>
      <ul>
        <li>Du faller till nivån på dina system — inte dina mål.</li>
        <li>Aktivitetsmål är dina. Resultatmål är konsekvenser.</li>
        <li>Bakåträkna från kvoten till dagliga samtal. Det blir icke-förhandlingsbart.</li>
        <li>"Ännu" är det viktigaste ordet i växande mindset. Använd det efter varje självkritisk tanke.</li>
        <li>Söndagsreview 30 min slår hela veckans improvisation.</li>
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


  // ── 9. LinkedIn & Sociala Medier ──────────────────────────────────────────
  {
    id: 'linkedin',
    title: 'LinkedIn & Sociala Medier',
    subtitle: 'Social selling — bygg relationer innan du säljer',
    icon: '💼',
    gradient: 'linear-gradient(135deg, #0077b5, #00a0dc)',
    color: '#0077b5',
    youtubeId: null,
    teaser: `
      <h3>LinkedIn som säljverktyg</h3>
      <p>LinkedIn är idag det kraftfullaste B2B-verktyget som finns — men de flesta använder det fel. De skickar generella meddelanden, spammar med pitch direkt och undrar varför ingen svarar.</p>
      <p>Det här blocket lär dig hur du bygger en profil som attraherar rätt kunder, hur du prospekterar strategiskt, och hur du skriver outreach som faktiskt får svar.</p>
    `,
    theory: `
      <h3>Kärnan: LinkedIn är en säljkanal, inte ett CV-arkiv</h3>
      <p>LinkedIn har 1 miljard användare. Det är världens enda plattform där ditt prospekt — VD, CFO, Head of Sales — frivilligt är aktiv varje vecka med sitt professionella huvud på. Ingen annan kanal ger dig så direkt tillgång till beslutsfattare.</p>
      <p>Det 90% missar: de använder LinkedIn som ett statiskt CV. Fyller i sin titel. Lägger upp ett vitbottenfoto. Loggar in när de söker jobb. Resten av tiden — ingenting.</p>
      <p>Skickliga säljare använder LinkedIn som tre saker på en gång: ett <strong>skyltfönster</strong> (din profil säljer dig 24/7), en <strong>research-databas</strong> (allt du behöver veta om prospects finns där) och en <strong>distributionskanal</strong> (dina ord kan nå 10 000 beslutsfattare gratis).</p>
      <p>LinkedIn själva rapporterar via Social Selling Index (SSI): säljare med högt SSI skapar <strong>45% fler möjligheter</strong> och är <strong>51% mer benägna att nå sina kvoter</strong>. Det är inte marginella skillnader. Det är brutala skillnader.</p>

      <h3>Problemet: så gör 95% av säljare fel på LinkedIn</h3>
      <p>Typiskt misstagsmönster:</p>
      <ul>
        <li>Profilbild från 2017. Banner i default-grått. Headline = jobbtitel.</li>
        <li>Om-sektion: tom. Eller tre mening-CV.</li>
        <li>Skickar connection requests med default-texten. 5% acceptrate.</li>
        <li>Direkt efter accept: pitchar produkten i DM. Blockas.</li>
        <li>Postar aldrig. Kommenterar aldrig. Existerar inte i sitt nätverks medvetande.</li>
      </ul>
      <p>Konsekvensen: LinkedIn "fungerar inte". Det stämmer — så som de använder det. Skillnaden mot den säljare som kör LinkedIn strategiskt är inte marginell. Det är 20:1 i leads genererade.</p>

      <h3>Ramverk 1: Profiloptimering — 5 ytor som säljer åt dig</h3>
      <p>Din profil är inte ett CV. Det är en landningssida för ditt personliga varumärke. Den läses alltid INNAN kunden accepterar ditt förslag till ett samtal. Bygg den som en säljsida:</p>
      <p><strong>Ytan 1: Profilbilden</strong> — professionell, ansikte zoomat, leende, neutral bakgrund. Profiler med foto får 21x fler profilvisningar (LinkedIn-data). Inte en semestermittbild. Inte en logo. Ditt ansikte.</p>
      <p><strong>Ytan 2: Bannern</strong> — gratis reklamyta 1584×396 pixlar. Använd den. Kommunicera vem du hjälper och vilket resultat. Verktyg: Canva, 5 min att skapa. "Hjälper SaaS-företag 10–50 anställda växla från grundar-sälj till säljorganisation."</p>
      <p><strong>Ytan 3: Headlinen</strong> — inte din jobbtitel. En positioneringsmening.</p>
      <ul>
        <li>❌ FÖRE: <em>"Account Executive på Microsoft"</em></li>
        <li>✅ EFTER: <em>"Hjälper medelstora industribolag skära inköpskostnaderna 15% med AI-driven sourcing | Azure | Microsoft Sverige"</em></li>
      </ul>
      <p><strong>Ytan 4: Om-sektionen</strong> — skriv i första person. Struktur:</p>
      <ol>
        <li>Hook (rad 1–2): vem du hjälper, vilket konkret problem du löser.</li>
        <li>Bevis: siffror, case, år i branschen, kunder.</li>
        <li>Metod: vad du gör annorlunda.</li>
        <li>CTA: hur man når dig. "DM:a om ni vill diskutera X."</li>
      </ol>
      <p><strong>Ytan 5: Framhävt-sektionen</strong> — pin dina bästa poster, case studies, en personlig video. Det är din portfolio.</p>

      <h3>Ramverk 2: Content-systemet (Justin Welsh-modellen)</h3>
      <p>Justin Welsh byggde ett soloprenörskap på 10 miljoner USD från ingenting på LinkedIn. Hans system är offentligt och funkar för säljare:</p>
      <p><strong>1–1–1-schemat per vecka:</strong></p>
      <ul>
        <li>1 <strong>text-post</strong> (40–80 ord) med en kontraintuitiv sanning från din vardag.</li>
        <li>1 <strong>story-post</strong> (150–250 ord) som berättar en specifik erfarenhet.</li>
        <li>1 <strong>list-post</strong> (100–150 ord) med ett ramverk eller en checklista.</li>
      </ul>
      <p><strong>Content-pelarna</strong> — välj 3 att återkomma till:</p>
      <ul>
        <li>Din bransch: insikter, trender, förändringar som pågår.</li>
        <li>Ditt yrke: vad du lär dig om sälj, ledarskap, etc.</li>
        <li>Din resa: misstag, genombrott, personliga berättelser (sparsamt).</li>
      </ul>
      <p>Postningstid: måndag–onsdag mellan 07:30 och 09:00 eller 11:30–13:00 ger generellt bäst räckvidd för B2B.</p>

      <h3>Ramverk 3: Outreach — 4-stegs-metoden som får svar</h3>
      <p>Glöm att pitcha produkten i connection request. Glöm direkt DM. Bygg relationen över 4 steg, 10–14 dagar:</p>
      <p><strong>Steg 1: Engagera (dag 1–3)</strong> — kommentera intelligent på 2–3 av deras poster. Inte "Bra post!". En substantiell tanke som tillför värde. De ser ditt namn återkommande.</p>
      <p><strong>Steg 2: Connection request (dag 5)</strong> — med personligt meddelande (max 280 tecken):</p>
      <blockquote>
        <p><em>"Hej [förnamn], dina poster om [specifikt ämne] har gett mig några nya tankar senaste veckan. Connectar gärna — inget sälj, bara värde åt båda hållen."</em></p>
      </blockquote>
      <p><strong>Steg 3: Tack-meddelande (dag 6–7, efter accept)</strong> — ingen pitch:</p>
      <blockquote>
        <p><em>"Tack för att du connectade. Såg att ni [specifik observation om deras företag]. Hur går det med det?"</em></p>
      </blockquote>
      <p><strong>Steg 4: Värdeerbjudande (dag 10–14)</strong> — när dialogen etablerats, föreslå ett samtal med tydligt värde:</p>
      <blockquote>
        <p><em>"[Namn], baserat på det du sa om [deras utmaning] — jag har hjälpt 3 företag i er bransch med exakt det senaste året. 20 minuter nästa vecka för att dela vad jag lärt mig? Ingen demo, bara samtal."</em></p>
      </blockquote>
      <p>Svarsfrekvensen på den här sekvensen är typiskt 30–50%. Mot 2–5% för "spray and pray"-DMs.</p>

      <h3>Före vs efter — outreach i praktiken</h3>
      <p><strong>FÖRE (typisk säljare):</strong></p>
      <blockquote>
        <p>"Hej [Namn]! Jag såg att du arbetar som [Titel] på [Företag]. Jag representerar [Produktnamn] — en ledande lösning för [generisk kategori]. Skulle du vara intresserad av en 30-minuters demo nästa vecka?"</p>
      </blockquote>
      <p>Resultat: blockerad. Eller ignorerad för alltid.</p>
      <p><strong>EFTER (skicklig säljare):</strong></p>
      <blockquote>
        <p>"Hej Anna, läste ditt inlägg om hur ni ställt om säljteamet efter förra årets förändring. Särskilt det du skrev om att strukturera onboarding-processen för nya säljare — vi har brottats med exakt det. Connectar gärna, inget sälj, bara för att det låter som om vi kan lära av varandra."</p>
      </blockquote>
      <p>Resultat: 70%+ accept. Och oftast följer hon upp själv.</p>

      <h3>Live-scenarier: så använder du LinkedIn dagligen</h3>
      <p><strong>Scenario 1 — innan ett kundmöte:</strong> 5 min på kundens profil. Läs senaste 3 posterna. Kolla vilka personer de interagerat med. Vilka kommentarer har de skrivit? Du går in i mötet förberedd på ett sätt 95% av säljare aldrig är.</p>
      <p><strong>Scenario 2 — när du har dött momentum i en affär:</strong> Likar och kommenterar kontaktpersonens senaste post. De ser ditt namn dyka upp i notiser — som påminnelse utan pressen av ett uppföljningsmejl.</p>
      <p><strong>Scenario 3 — ny roll du vill nå:</strong> Kolla vilka som lämnat kommentarer på relevant innehåll senaste månaden. De är din varma lista — de är redan engagerade i ämnet.</p>

      <h3>De tre vanligaste misstagen — undvik</h3>
      <ol>
        <li><strong>Default connection request-texten.</strong> Om du inte personaliserar, kommunicerar du omedelbart "massutskick". Accept-raten halveras.</li>
        <li><strong>Pitch i första DM efter accept.</strong> Du har precis fått förtroende — och bryter det omedelbart. Relationsbygget måste komma före erbjudandet.</li>
        <li><strong>Posta en gång och försvinna i tre månader.</strong> LinkedIns algoritm straffar inkonsekvens. Bättre 3 gånger i veckan i 12 månader än 15 gånger en vecka och tystnad resten av året.</li>
      </ol>

      <h3>SSI — mät det LinkedIn mäter</h3>
      <p>LinkedIns <strong>Social Selling Index</strong> mäter fyra dimensioner på skalan 0–100:</p>
      <ul>
        <li>Etablera ditt professionella varumärke (profil).</li>
        <li>Hitta rätt personer (search och prospektering).</li>
        <li>Engagera med insikter (content och kommentarer).</li>
        <li>Bygga relationer (nätverk och interaktioner).</li>
      </ul>
      <p>Kolla ditt score på <em>linkedin.com/sales/ssi</em>. Sikta på 70+. Uppdateras varje vecka — använd det som ditt LinkedIn-dashboardverktyg.</p>

      <h3>Handling: kör det här i morgon</h3>
      <ol>
        <li><strong>Uppdatera din headline</strong> (10 min) — från jobbtitel till positioneringsmening. Vem hjälper du? Vilket konkret resultat?</li>
        <li><strong>Skriv om Om-sektionen</strong> (20 min) — följ hook → bevis → metod → CTA.</li>
        <li><strong>Kommentera på 5 prospects poster</strong> (15 min) — substantiellt, inte "bra post". Börja bygga synlighet i deras notisflöde.</li>
        <li><strong>Skicka 3 personliga connection requests</strong> till prospects du engagerat med denna vecka.</li>
        <li><strong>Posta en text-post (40–80 ord)</strong> med en insikt från denna vecka.</li>
      </ol>

      <h3>24-timmarsövningen</h3>
      <p>Imorgon kl 07:45: öppna LinkedIn. Skriv EN post. 40–80 ord. En kontraintuitiv sanning från din senaste vecka i sälj. Publicera före 08:30. Kommentera sedan på 5 poster från människor du vill bygga relation med. Ta tiden: max 30 minuter.</p>
      <p>Upprepa dagligen i 30 dagar. Ditt SSI kommer stiga 20+ poäng. Ditt nätverk kommer växa. Och — det viktigaste — prospekts kommer börja interagera med dig innan du ens sökt upp dem.</p>

      <h3>Sammanfattning — fem punkter</h3>
      <ul>
        <li>LinkedIn är en säljkanal, inte ett CV-arkiv.</li>
        <li>Profilen är din säljsida — alla 5 ytor ska säljer åt dig 24/7.</li>
        <li>Posta 3–5 gånger/vecka. Konsistens slår perfektion.</li>
        <li>Outreach i 4 steg över 10–14 dagar. Aldrig pitch i DM 1.</li>
        <li>SSI 70+ är ditt mål. Mät veckovis.</li>
      </ul>
    `,
    quiz: [
      { q: 'Vad innebär Social Selling?', options: ['Att sälja produkter via Instagram', 'Att bygga relationer på sociala medier innan du säljer', 'Att lägga ut rabatter på LinkedIn', 'Att köpa annonser på sociala medier'], answer: 1 },
      { q: 'Hur många fler profilvisningar får en LinkedIn-profil med foto?', options: ['5x', '10x', '21x', '50x'], answer: 2 },
      { q: 'Vad ska din LinkedIn-rubrik (headline) kommunicera?', options: ['Din jobbtitel och ditt företag', 'Vem du hjälper och vilket resultat du skapar', 'Hur länge du jobbat i branschen', 'Din utbildningsbakgrund'], answer: 1 },
      { q: 'Hur ofta bör du posta på LinkedIn för bäst räckvidd?', options: ['En gång i månaden', 'Varje dag', '3–5 gånger per vecka', 'En gång i veckan'], answer: 2 },
      { q: 'Vad ska du INTE göra i din första LinkedIn-outreach?', options: ['Presentera dig kort', 'Referera till något specifikt om personen', 'Pitcha din produkt direkt', 'Nämna en gemensam nämnare'], answer: 2 },
      { q: 'Vad är LinkedIn SSI?', options: ['Ett certifieringsprogram', 'Ett mått på din social selling-aktivitet i fyra dimensioner', 'En betald LinkedIn-funktion', 'En typ av annons'], answer: 1 },
      { q: 'Vilket innehåll skapar mest engagemang på LinkedIn?', options: ['Produktlanseringar och erbjudanden', 'Ärlighet om misstag och insikter från verkligheten', 'Delningar av andras artiklar', 'Jobbannonser'], answer: 1 },
      { q: 'Vad är det viktigaste syftet med Om-sektionen på LinkedIn?', options: ['Lista alla dina arbetsgivare', 'Berätta om dina hobbies', 'Kommunicera vem du hjälper och vilket problem du löser', 'Visa dina utbildningar'], answer: 2 },
      { q: 'Vilket SSI-score bör du sikta på?', options: ['30+', '50+', '70+', '90+'], answer: 2 },
      { q: 'Hur många fler möjligheter skapar säljare med högt SSI jämfört med lågt?', options: ['10% fler', '25% fler', '45% fler', '90% fler'], answer: 2 },
    ],
  },

  // ── 10. Videosamtal & Digital Försäljning ─────────────────────────────────
  {
    id: 'videosamtal',
    title: 'Videosamtal & Digital Försäljning',
    subtitle: 'Sälj lika effektivt på skärm som i rummet',
    icon: '📹',
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#7c3aed',
    youtubeId: null,
    teaser: `
      <h3>Videosamtalet — en ny säljmiljö</h3>
      <p>Teams, Zoom och Google Meet har förändrat hur sälj sker. Men de flesta behandlar ett videosamtal som ett telefonsamtal med kamera — och missar de specifika reglerna som gäller.</p>
      <p>Det här blocket täcker allt från teknisk setup och digital kroppsspråk till hur du strukturerar ett videosamtal för maximal effekt.</p>
    `,
    theory: `
      <h3>Kärnan: videomötet är en annan säljmiljö — inte samma med kamera</h3>
      <p>2026 sker 70%+ av alla B2B-säljprocesser med minst ett videosamtal. För många kontrakt är videomötet det ENDA mötet — du får aldrig sitta i samma rum som beslutsfattaren. Din förmåga att sälja på skärm är inte längre "bra att ha". Det är grundkompetensen.</p>
      <p>Sanningen 90% missar: videosamtalet är inte bara ett fysiskt möte med webbkamera. Det är ett helt eget medium med egna regler. Ljus, ljud, kamerans vinkel, din energinivå, hur du hanterar pauser — allt spelar annorlunda på skärm. Säljare som behandlar Zoom som telefonsamtal med kamera förlorar affärer de hade vunnit fysiskt.</p>
      <p>Och samtidigt: de flesta säljare är <strong>häpnadsväckande dåliga</strong> på det. Dålig belysning, underifrånperspektiv, usligt ljud, frånvarande energi. Vilket betyder: om du tar det på allvar har du omedelbar fördel. Du behöver inte vara perfekt — du behöver bara vara märkbart bättre än de 80% som gör det slappt.</p>

      <h3>Problemet: så ser en typisk dålig säljare ut på video</h3>
      <p>Scen från verkligheten:</p>
      <ul>
        <li>Laptopen på köksbordet. Kameran vinklad uppåt — du ser näsborrarna.</li>
        <li>Taklampan bakom huvudet — silhuetten gör säljaren till en skugga.</li>
        <li>Inbyggd mikrofon. Hörs ekot från rummet. Grannens hund skäller.</li>
        <li>Kamera stängd "för att spara batteri". Bara en svart ruta med en bokstav.</li>
        <li>Ögonen scannar skärmen — aldrig mot kameran. Ingen ögonkontakt. Ingen närvaro.</li>
        <li>Säljaren öppnar: <em>"Kan ni höra mig? Hallå? Kan ni höra mig nu?"</em> → 3 av 10 minuter bortkastade.</li>
      </ul>
      <p>Konsekvensen: kunden upplever dig som amatörmässig innan du sagt ett ord som spelar roll. Din trovärdighet är redan sänkt. Resten av mötet kämpar du i uppförsbacke.</p>

      <h3>Ramverk 1: Tekniska setupen — 6 element som är icke-förhandlingsbara</h3>
      <p>Din setup är ditt första intryck på skärm. Fixa en gång, gynnas i varje möte resten av karriären.</p>
      <p><strong>1. Kamera i ögonhöjd</strong><br>
      En laptop på ett bord ger underifrånperspektiv — mest oattraktiva vinkel för ett ansikte. Höj datorn med böcker eller köp ett laptopstativ (200 kr). Alternativt: extern webbkamera (Logitech Brio, ~2 000 kr) placerad i ögonhöjd. Kamera 10–15 cm högre än dina ögon ger omedelbart en mer auktoritär och närvarande bild.</p>
      <p><strong>2. Belysning — framifrån, inte bakifrån</strong><br>
      Grundregel: ljus på ditt ansikte, aldrig bakom dig. Ett fönster framifrån på dagtid är gratis och bäst. På kvällar: ringlampa (~500–1500 kr) eller två softbox-lampor (~2 000 kr). Ta dig 15 minuter att faktiskt testa ljuset — det du ser i förhandsgranskningen är vad kunden ser.</p>
      <p><strong>3. Ljud — det viktigaste av allt</strong><br>
      Dåligt ljud dödar ett möte snabbare än dålig video. Kunder kan acceptera en suddig bild. De kan inte acceptera eko, mikrofonbrus eller ett ojämnt röstflöde.</p>
      <ul>
        <li>Minimum: bra headset med mikrofon (t.ex. Jabra Evolve2, ~2 500 kr).</li>
        <li>Premium: extern mikrofon (Blue Yeti, Shure MV7, ~2 500–3 500 kr) + hörlurar.</li>
        <li>Tyst rum. Stäng dörrar. Mjuka ytor (gardiner, matta) dämpar eko.</li>
      </ul>
      <p><strong>4. Bakgrunden — välj medvetet</strong><br>
      En välstädad bokhylla signalerar intellekt. En tom vit vägg är neutral men trist. Ett sovrum med osäng i bakgrunden signalerar oseriös. Suddiga bakgrunder är okej men inte lika starka som en verklig, planerad miljö. Investera: en hyra, några böcker, en växt, en personlig pryl som berättar något om dig.</p>
      <p><strong>5. Internetuppkoppling</strong><br>
      Fast Ethernet slår Wi-Fi varje gång. Om du kör viktiga möten — dra en kabel. Testa hastigheten på speedtest.net innan ett stort möte. Minsta godtagbara: 10 Mbps upload. Under det — buffrar video, avbrott i ljud.</p>
      <p><strong>6. Kläder — från midjan upp</strong><br>
      Klä dig som du skulle till ett fysiskt möte. Skjorta eller pullover, inte t-shirt eller huvtröja. Hur du klär dig påverkar hur du känner dig — och kunden känner av energinivån.</p>

      <h3>Ramverk 2: Digital kroppsspråk — tre skillnader från fysiska möten</h3>
      <p><strong>Skillnad 1: Ögonkontakt sker via kameran, inte skärmen</strong><br>
      När du tittar på kundens ansikte på skärmen tittar du i verkligheten nedåt — vilket ser ut som du stirrar ner. För äkta ögonkontakt måste du titta i kamerans lins. Tricks:</p>
      <ul>
        <li>Sätt en liten post-it eller ett klistermärke bredvid kameran som en visuell påminnelse.</li>
        <li>Flytta kundens fönster så nära kameran som möjligt, så ditt perifera seende fångar deras ansikte medan du tittar på linsen.</li>
        <li>Under ditt eget tal: titta i kameran. Under kundens tal: du kan titta på deras ansikte på skärmen.</li>
      </ul>
      <p><strong>Skillnad 2: Energinivån måste vara 20% högre</strong><br>
      Skärmen suger energi. Det som skulle kännas "normalt" i ett rum känns platt på video. Höj tonläget, variera rösten mer, visa tydligare reaktioner. Stor leende. Stor nickning. Tycks löjligt att öva — men syns lagom på skärmen.</p>
      <p><strong>Skillnad 3: Pauser är större</strong><br>
      Video har 0,2–0,5 sekunds fördröjning. Om du börjar prata för snabbt efter kunden talar ni i mun på varandra — båda hör det sekunder senare, mötet blir staccato. Låt kunden andas klart innan du svarar. Räkna till 2 i huvudet efter deras sista ord.</p>

      <h3>Ramverk 3: Struktur för säljmöte på 30 min</h3>
      <p>En tydlig struktur gör skillnaden mellan ett "bra samtal" och en bokad nästa steg:</p>
      <ol>
        <li><strong>0:00–2:00 Småprat + check-in</strong> — Kort. Fråga: <em>"Är det bara vi två, eller är det någon mer med som jag borde hälsa på?"</em> Validera vilka som är med.</li>
        <li><strong>2:00–3:00 Sätt agendan</strong> — <em>"Jag tänkte vi kör så här: 5 min om er situation, 15 min där jag visar hur vi skulle lösa det, 5 min frågor, 5 min nästa steg. Passar det?"</em> Kunden godkänner. Nu har du mandatet.</li>
        <li><strong>3:00–10:00 Discovery</strong> — öppna frågor. Lyssna 80%, prata 20%. Notera exakt vad de säger — ord de använder får du återanvända senare.</li>
        <li><strong>10:00–22:00 Pitch/demo</strong> — koppla exakt till det de just berättat. "Du nämnde X — här är hur vi löser det." Dela skärm strategiskt — inte hela tiden.</li>
        <li><strong>22:00–27:00 Frågor + invändningar</strong> — hanteringen sker här. Var tyst efter dina svar.</li>
        <li><strong>27:00–30:00 Nästa steg</strong> — aldrig avsluta med "vi hör av oss". Boka nästa möte direkt i kalendern under samtalet.</li>
      </ol>

      <h3>Före vs efter — öppningen</h3>
      <p><strong>FÖRE (den amatörmässiga):</strong></p>
      <blockquote>
        <p>"Ja hej! Hör ni mig? Ja, kan ni se mig? Kamera på? Ok. Ja, tack för att ni tar er tid. Är alla redo? Ok. Ja, så jag tänkte berätta lite om oss först och sen kanske ni kan berätta lite om er?"</p>
      </blockquote>
      <p><strong>EFTER (den förberedde):</strong></p>
      <blockquote>
        <p>"Hej Anna, kul att se dig. Jag ser att Kalle också är med — hej Kalle. Jag hoppas att fredagsmötet igår gick bra. Ska vi köra igång? Jag har 30 min blockade för oss — min tanke är att vi lägger första 10 på vad ni kämpar med, sen visar jag vad vi gör, och vi avslutar med konkreta nästa steg. Låter det rimligt?"</p>
      </blockquote>
      <p>Samma mötestid. Den första lät som en genomsnittlig säljare. Den andra lät som en professionell.</p>

      <h3>Live-scenarier</h3>
      <p><strong>Scenario 1 — tekniskt problem mitt i mötet:</strong></p>
      <ul>
        <li>❌ FEL: Panik. Ursäkter i 5 min. "Så typiskt, så här går det alltid …"</li>
        <li>✅ RÄTT: Lugnt. <em>"Tekniken var emot oss — ring på nummer X så fortsätter vi."</em> Du är van. Kunden märker.</li>
      </ul>
      <p><strong>Scenario 2 — kunden stänger av sin kamera:</strong></p>
      <ul>
        <li>❌ FEL: Ignorera. Prata till en svart ruta. Energin kollapsar.</li>
        <li>✅ RÄTT: <em>"Hade nåt tekniskt strul med kameran? Ingen stress — men det blir lättare för mig att läsa av er om jag ser ansikten."</em> Oftast slår de på igen.</li>
      </ul>
      <p><strong>Scenario 3 — de är 3 personer, du känner inte alla:</strong></p>
      <ul>
        <li>❌ FEL: Pitcha in i det blå. Ingen vet varför de är där.</li>
        <li>✅ RÄTT: <em>"Kul att ni är flera — kan alla ta 30 sekunder och säga er roll och vad ni hoppas få ut av mötet?"</em> Nu vet du vem som behöver vad.</li>
      </ul>

      <h3>De tre vanligaste videomisstagen</h3>
      <ol>
        <li><strong>Dåligt ljud.</strong> Bild i 4K räddar inte ett möte där kunden inte hör dig. Investera i bra headset först av allt.</li>
        <li><strong>Titta på skärmen istället för kameran.</strong> Ingen ögonkontakt — ingen relation. Du låter som en presentatör, inte en samtalspartner.</li>
        <li><strong>Prata som på telefon.</strong> Låg energi, få variationer, platta reaktioner. Video kräver 20% mer energi än du tror.</li>
      </ol>

      <h3>Pre-call-checklistan — 5 minuter innan varje möte</h3>
      <ul>
        <li>Kamera i ögonhöjd? Ja/Nej.</li>
        <li>Ljus på ansikte, inte bakom? Ja/Nej.</li>
        <li>Ljudet testat? Headset på? Ja/Nej.</li>
        <li>Bakgrund städad? Ja/Nej.</li>
        <li>Mobilen på "stör ej"? Ja/Nej.</li>
        <li>Mötets agenda i huvudet? Ja/Nej.</li>
        <li>Kunden researchad senaste 5 min? LinkedIn-profilen öppen? Ja/Nej.</li>
        <li>Vatten vid sidan? Ja/Nej.</li>
      </ul>

      <h3>Handling: kör det här idag</h3>
      <ol>
        <li><strong>Fixa setupen.</strong> En timme idag. Höj kameran. Testa ljuset. Köp headset om du inte har ett. Det är investeringen som betalar sig 1000 gånger.</li>
        <li><strong>Spela in dig själv i ett låtsas-möte.</strong> Titta. Du kommer se exakt vad kunden ser. Ofta första gången. Det är smärtsamt och ovärderligt.</li>
        <li><strong>Gör en pre-call-checklista på post-it</strong> och klistra bredvid kameran.</li>
        <li><strong>Nästa möte:</strong> titta i kameran under ditt eget tal. Bara det.</li>
        <li><strong>Boka nästa steg i mötet</strong> — aldrig "vi hör av oss". Kalendern öppen. 30 sek, klart.</li>
      </ol>

      <h3>24-timmarsövningen</h3>
      <p>Idag: 30 min på att göra en korrekt setup. Höj kameran. Testa ljuset. Checka ljudet. Spela in 2 min av dig själv presentera något — spela upp — notera tre saker att förbättra.</p>
      <p>Imorgon: använd setupen i nästa möte. Titta i kameran. Höj energin. Notera skillnaden i hur kunden reagerar. Du kommer märka det inom första 5 minuterna.</p>

      <h3>Sammanfattning — fem punkter</h3>
      <ul>
        <li>Videomötet är ett eget medium, inte ett fysiskt möte med kamera.</li>
        <li>Setup är icke-förhandlingsbart: kamera i ögonhöjd, ljus framifrån, bra headset.</li>
        <li>Titta i kameran, inte på skärmen. Det är din enda väg till ögonkontakt.</li>
        <li>Energin måste vara 20% högre än fysiskt möte — skärmen suger intensitet.</li>
        <li>Boka nästa steg i mötet, aldrig "vi hör av oss".</li>
      </ul>
    `,
    quiz: [
      { q: 'Hur stor andel av B2B-köpprocesser inkluderar idag ett videosamtal?', options: ['30%', '50%', '70%+', '90%'], answer: 2 },
      { q: 'Var ska kameran befinna sig för bäst närvaro?', options: ['Nedanför ansiktet', 'I ögonhöjd', 'Ovanför ansiktet', 'Spelar ingen roll'], answer: 1 },
      { q: 'Varför är ljud viktigare än video i ett säljsamtal?', options: ['Det är det inte — video är viktigast', 'Dåligt ljud dödar ett möte snabbare än dålig video', 'Kunder stänger av videon men lyssnar alltid', 'Ljud är lättare att fixa'], answer: 1 },
      { q: 'Var ska du titta under ett videosamtal?', options: ['På kunden på skärmen', 'I kameran', 'På dina anteckningar', 'Det spelar ingen roll'], answer: 1 },
      { q: 'Vad är det rätta sättet att hantera ett tekniskt problem under ett säljmöte?', options: ['Avbryt mötet och kontakta kunden dagen efter', 'Bli stressad och be om ursäkt upprepade gånger', 'Hantera det lugnt och ha en backup-plan redo', 'Skylla på kundens teknik'], answer: 2 },
      { q: 'Varför bör du sätta en agenda i början av ett videosamtal?', options: ['Det är ett krav för alla möten', 'Det skapar struktur och ger kunden trygghet', 'Det gör mötet längre', 'Det imponerar alltid på kunden'], answer: 1 },
      { q: 'Vilken belysning är bäst för videosamtal?', options: ['Starkt ljus bakom dig', 'Naturligt ljus framifrån', 'Taklampan i rummet', 'Inget extra ljus behövs'], answer: 1 },
      { q: 'När bör du boka nästa steg efter ett videosamtal?', options: ['Via e-post dagen efter', 'I slutet av samtalet — direkt', 'Ge kunden tid att tänka', 'När kunden hör av sig'], answer: 1 },
      { q: 'Hur ska du sitta under ett videosamtal?', options: ['Bekvämt lutad bakåt', 'Upprätt, lätt framåtlutad', 'Spelar ingen roll', 'Stå upp för bäst energi'], answer: 1 },
      { q: 'Varför ska du dela skärm strategiskt och inte hela tiden?', options: ['Det är tekniskt svårt', 'Kameran är din starkaste kanal — skärmdelning tar fokus från dig', 'Kunder vill inte se skärm', 'Det är dålig etikett'], answer: 1 },
    ],
  },

  // ── 11. E-post & Skriftlig Kommunikation ──────────────────────────────────
  {
    id: 'epost',
    title: 'E-post & Skriftlig Kommunikation',
    subtitle: 'Ord som öppnas, läses och svaras på',
    icon: '✉️',
    gradient: 'linear-gradient(135deg, #0891b2, #0e7490)',
    color: '#0891b2',
    youtubeId: null,
    teaser: `
      <h3>Säljmailens verklighet</h3>
      <p>Den genomsnittliga öppningsgraden för cold outreach är under 20%. Det betyder att 80% av din tid på att skriva mail är bortkastade — om du inte vet vad som faktiskt fungerar.</p>
      <p>Det här blocket lär dig formeln bakom säljmail som öppnas, läses och besvaras — från ämnesraden till break-up mailet.</p>
    `,
    theory: `
      <h3>Den skrivna säljarens verklighet</h3>
      <p>Den genomsnittliga beslutsfattaren får 121 mejl per dag, enligt Radicatis årliga e-postrapport. Hon ägnar i snitt 11 sekunder åt varje. Inte läser — <em>scannar</em>. Det är inom de 11 sekunderna du antingen vinner en kontakt eller blir raderad utan att någonsin märkas.</p>
      <p>Den genomsnittliga öppningsraten för kall outreach är runt 21%. Svarsraten 1–5%. Toppsäljare når konsekvent 40–60% öppningsrater och 15–25% svarsrater. Skillnaden är inte tur — det är teknik byggd på tusentals A/B-tester från Gong, HubSpot, Outreach och SalesLoft.</p>
      <p>En säljare som inte skriver skickligt är en säljare som inte prospekterar i stor skala. Idag är skrivkunskap en av säljarens viktigaste tekniska kompetenser — lika viktig som att ringa, demo:a eller förhandla.</p>

      <h3>Ämnesraden — där 80% av affären vinns eller förloras</h3>
      <p>Om ämnesraden inte fångar, är mejlet dött innan första ordet lästs. HubSpot-data visar att ämnesraden ensam avgör 33% av öppningsbeslutet. Några principer:</p>
      <ul>
        <li><strong>Kort</strong> — max 6–8 ord. Mobilen (där 61% av alla mejl läses enligt Litmus) visar bara de första ca 40 tecknen.</li>
        <li><strong>Gemener</strong> — <em>"kort fråga"</em> slår <em>"Kort Fråga"</em>. Gemener signalerar "kollega skriver", versaler signalerar "företag säljer".</li>
        <li><strong>Personlig eller specifik</strong> — nämn företaget, deras kund, ett inlägg de gjort. <em>"Angående Q3-rapporten"</em> slår <em>"Information om vår tjänst"</em>.</li>
        <li><strong>Nyfiken, inte desperat</strong> — <em>"En tanke om [X]"</em> fungerar. <em>"BRÅDSKANDE — missa inte!"</em> fungerar inte.</li>
        <li><strong>Tabu</strong> — stora bokstäver, utropstecken, "GRATIS", "exklusivt erbjudande", emoji (för B2B). Triggers spamfilter och mänskliga filter samtidigt.</li>
      </ul>
      <p>Top-performer-exempel (verkliga data från Lavender och Gong):</p>
      <ul>
        <li><em>"fråga om [deras projekt]"</em></li>
        <li><em>"idé till [Företag]"</em></li>
        <li><em>"såg ditt inlägg om X"</em></li>
        <li><em>"snabb fråga, [förnamn]"</em></li>
      </ul>

      <h3>Första raden — förhandsgranskningen du glömmer</h3>
      <p>Det som få säljare vet: inkorgen visar inte bara ämnesraden utan också de <strong>första 50–80 tecknen av mejlet</strong>. Den "preview"-texten är din andra chans att få öppnandet. Slösa inte bort den på "Hej, hoppas det är bra".</p>
      <p>Starta med något som fångar: en specifik observation om dem, en statistik, en direkt fråga. <em>"Noterade att ni just anställde er första Head of Revenue — grattis."</em> är 83 tecken och syns innan mejlet öppnas.</p>

      <h3>De tre säljstrukturerna: AIDA, PAS, BAB</h3>
      <p>Tre beprövade ramverk som alla gör samma jobb — guidar läsaren från uppmärksamhet till handling. Välj den som passar ditt budskap, inte omvänt.</p>
      <p><strong>AIDA (klassikern — 1898!)</strong></p>
      <ul>
        <li><strong>A — Attention</strong>: specifik öppning om dem. "Såg att ni expanderar till Norge..."</li>
        <li><strong>I — Interest</strong>: koppla till problem de troligtvis har just nu.</li>
        <li><strong>D — Desire</strong>: visa värdet kort. En mening, inte en roman.</li>
        <li><strong>A — Action</strong>: en tydlig, enkel CTA. "Har du 15 min på torsdag?"</li>
      </ul>
      <p><strong>PAS (Problem-Agitate-Solution)</strong></p>
      <ul>
        <li><strong>Problem</strong>: nämn problemet de brottas med.</li>
        <li><strong>Agitate</strong>: förstärk konsekvensen av att inte lösa det.</li>
        <li><strong>Solution</strong>: erbjud lösningen som en väg ut.</li>
      </ul>
      <p>PAS fungerar bäst när smärtan är tydlig och medveten. Passar varm outreach till företag med ett känt problem.</p>
      <p><strong>BAB (Before-After-Bridge)</strong></p>
      <ul>
        <li><strong>Before</strong>: beskriv deras nuvarande situation.</li>
        <li><strong>After</strong>: beskriv det bättre läget de kan befinna sig i.</li>
        <li><strong>Bridge</strong>: förklara kort hur du tar dem dit.</li>
      </ul>
      <p>BAB fungerar bäst när du säljer till någon som anat att något är fel men inte formulerat det.</p>

      <h3>Regeln om 5 meningar</h3>
      <p>Ett kallt säljmejl ska vara <strong>max 5–7 meningar</strong>. Punkt. Om du behöver mer för att förklara din produkt, är produkten för komplicerad — eller din positionering för svag. Respektera mottagarens tid, och de kanske belönar dig med ett svar.</p>
      <p>Ett mejls jobb är inte att sälja. Det är att få nästa mejl, eller ett samtal. Säljet händer där.</p>

      <h3>CTA — kunsten att få ett svar</h3>
      <p>De flesta säljmejl slutar med en svag CTA: <em>"Hör av dig om du är intresserad"</em>. Det är en begäran om att kunden själv ska orka ta beslutet att investera tid. Svarsraten: låg.</p>
      <p>Bättre CTAs är <strong>specifika, enkla och låg-förpliktelse</strong>:</p>
      <ul>
        <li><em>"Har du 15 minuter på torsdag eller fredag?"</em> — två alternativ, enkelt svar.</li>
        <li><em>"Vill du att jag skickar över en kort 2-minutersvideo som visar?"</em> — mikroåtagande.</li>
        <li><em>"Är det här aktuellt för er just nu, eller är vi tidiga?"</em> — öppnar för ett nej som inte sårar.</li>
      </ul>
      <p>Chris Voss' no-oriented questions fungerar briljant i mejl: <em>"Skulle det vara orimligt att kika på siffrorna?"</em> Mottagaren känner sig trygg att säga nej — och säger därför ofta ja.</p>

      <h3>Uppföljningsmejl — det är här 80% av svaren kommer</h3>
      <p>De flesta ger upp efter mejl 1. De som skickar mejl 3, 4 och 5 plockar upp det som de förstnämnda lämnar på bordet. Principer för uppföljningar:</p>
      <ul>
        <li><strong>Korta</strong> — uppföljningen är kortare än originalmejlet, inte längre.</li>
        <li><strong>Nytt värde</strong> — referera kort till förra mejlet, men lägg alltid på något nytt: en artikel, ett case, en ny vinkel.</li>
        <li><strong>Sänk pressen, inte höj den</strong> — <em>"Förstår om tajmingen är fel"</em> slår <em>"Du har fortfarande inte svarat på mitt förra mejl"</em>.</li>
        <li><strong>Varierad kadenz</strong> — dag 0, 3, 7, 14, 21, 30. Blanda gärna med en telefon- eller LinkedIn-touch mellan mejlen.</li>
      </ul>

      <h3>Break-up-mejlet — det mest underskattade mejlet som finns</h3>
      <p>När ingen svarar efter 4–5 försök, skriv inte ytterligare ett "hej, ville bara checka in". Skriv avskedsmejlet. Det konverterar förbluffande bra — ofta 20–40% svarsfrekvens enligt Gong-data.</p>
      <blockquote>
        <p>Ämne: Ska jag stänga ditt ärende?</p>
        <p>Hej [namn],</p>
        <p>Jag har hört av mig några gånger utan svar och jag vill inte fortsätta om det inte är aktuellt. Ska jag stänga ditt ärende och lämna dig i fred?</p>
        <p>Svara bara "stäng" så gör jag det. Om det bara varit stressigt och vi ska återuppta, säg det istället.</p>
        <p>Hälsningar<br>[Du]</p>
      </blockquote>
      <p>Tre psykologiska principer i spel: loss aversion (att "stängas" känns som en förlust), respekt för autonomi (du tvingar inget), och brytning av mönster (plötsligt låter det inte som vanlig uppföljning).</p>

      <h3>Personalisering i skala — utan att låta som en bot</h3>
      <p>2026 är frågan inte OM du personaliserar — utan HUR. AI-genererade mejl som alla börjar med "jag noterade att du skrev om [X]" känns omedelbart falska när mottagaren får 15 per vecka. Äkta personalisering kräver 2–3 minuters research per mejl:</p>
      <ul>
        <li>Läs deras senaste LinkedIn-post — referera till den konkret.</li>
        <li>Kolla deras företags nyheter senaste månaden — koppla till vad som händer.</li>
        <li>Hitta en gemensam nämnare — tidigare arbetsgivare, branschkonferens, en citation i en artikel.</li>
      </ul>
      <p>En handfull skräddarsydda mejl per dag slår 200 AI-genererade. Kvalitet > kvantitet, varje gång.</p>

      <h3>Signatur och formatering — det osynliga som syns</h3>
      <ul>
        <li><strong>Signatur</strong>: namn, titel, företag, telefon. Inga stora bilder, inga citat, ingen "save the planet — don't print this email".</li>
        <li><strong>Utan länkar</strong> i första mejlet — länkar triggar spamfilter och skriker "säljare" till mottagaren.</li>
        <li><strong>Plain text-look</strong> slår formaterad HTML. Mottagaren ska känna att du skrev just till henne, inte att ditt marketingverktyg skickade ett utskick.</li>
        <li><strong>Kort stycken</strong> — 1–2 meningar per stycke. Mobilen gör textväggar oläsbara.</li>
      </ul>

      <h3>Tre mejlfällor att undvika</h3>
      <ol>
        <li><strong>"Checking in"-mejlet</strong> — tom kalori. Säg alltid något med substans.</li>
        <li><strong>"Per mitt förra mejl"-tonen</strong> — skuldbeläggande. Du är inte kundens chef.</li>
        <li><strong>Företagspresentationen</strong> — ingen bryr sig om dig, ditt företag, eller din historia. Alla bryr sig om sig själva. Skriv från deras perspektiv, alltid.</li>
      </ol>
    `,
    quiz: [
      { q: 'Vad är den genomsnittliga svarsraten för cold email?', options: ['10–15%', '1–5%', '20–25%', '30%+'], answer: 1 },
      { q: 'Hur lång bör en ämnesrad vara?', options: ['Max 3 ord', 'Max 6–8 ord', 'Max 15 ord', 'Längd spelar ingen roll'], answer: 1 },
      { q: 'Vad står "A" för i slutet av AIDA-modellen?', options: ['Avslut', 'Attention', 'Action — en tydlig uppmaning till handling', 'Analys'], answer: 2 },
      { q: 'Hur långt bör ett kallt säljmail vara?', options: ['Så detaljerat som möjligt', 'Max 5–7 meningar', 'Minst en hel A4-sida', '2–3 stycken med listor'], answer: 1 },
      { q: 'Vad ska varje uppföljningsmail tillföra?', options: ['Samma budskap som förra mailet', 'Mer press och urgency', 'Ett nytt värde — insikt, case study eller relevant info', 'En rabatt'], answer: 2 },
      { q: 'Vad är ett "break-up mail"?', options: ['Ett mail om att avsluta kontraktet', 'Ett sista mail som säger att du inte hör av dig mer — som paradoxalt genererar svar', 'Ett avskedsmejl till en kund', 'Ett mail med ett sista erbjudande'], answer: 1 },
      { q: 'Vilket ämnesradsformat fungerar bäst?', options: ['STOR BOKSTAV + UTROPSTECKEN', 'Personlig och specifik med tydligt värde', 'Lång och detaljerad', 'Alltid en fråga'], answer: 1 },
      { q: 'På vilket uppföljningsmailnummer kommer de flesta svar?', options: ['Nr 1 — första mailet', 'Nr 2–4', 'Nr 6–8', 'Svar kommer aldrig på uppföljningar'], answer: 1 },
      { q: 'Vad ska det första stycket i ett cold email handla om?', options: ['Din produkt och dess fördelar', 'Ditt företag och historia', 'Något specifikt och relevant om mottagaren', 'Priset på din tjänst'], answer: 2 },
      { q: 'Vilken CTA (call-to-action) fungerar bäst i ett säljmail?', options: ['"Hör av dig om du är intresserad"', '"Klicka här för mer info"', '"Har du 15 min på torsdag?"', '"Vänligen återkom snarast"'], answer: 2 },
    ],
  },

  // ── 12. Förhandling ───────────────────────────────────────────────────────
  {
    id: 'forhandling',
    title: 'Förhandling',
    subtitle: 'Förhandla värde — inte bara pris',
    icon: '🤜',
    gradient: 'linear-gradient(135deg, #b45309, #d97706)',
    color: '#d97706',
    youtubeId: null,
    teaser: `
      <h3>Förhandling är inte krig</h3>
      <p>De flesta associerar förhandling med att en part vinner och en förlorar. Det är fel ramverk — och det är kostsamt. De bästa förhandlarna skapar avtal där båda parter känner sig nöjda och vill samarbeta igen.</p>
      <p>Det här blocket ger dig FBI:s Chris Voss-tekniker, BATNA-principen och hur du aldrig ger en rabatt utan att få något tillbaka.</p>
    `,
    theory: `
      <h3>Förhandling är inte krig — det är arkitektur</h3>
      <p>De flesta ser förhandling som ett nollsummespel: en vinner, en förlorar. Ett tennisbollsspel där varje poäng åt den ena sidan är en förlust för den andra. Det är fel ramverk — och det är kostsamt både för dig och för kunden.</p>
      <p>Världens skickligaste förhandlare tänker istället som arkitekter. De bygger ett avtal som ska stå i åratal. En affär där kunden känner sig lurad må vara stängd idag — men den kostar dig förlängningen, referenserna och upsellen. Verkligt skickligt förhandlare skapar avtal <strong>båda</strong> parter vill ha — och villigt skulle göra om.</p>
      <p>Harvard Negotiation Project (Roger Fisher, William Ury) formulerade detta som <em>"principled negotiation"</em> i klassikern <em>Getting to Yes</em> (1981). Deras fyra principer:</p>
      <ul>
        <li><strong>Separera människan från problemet</strong> — attackera inte personen, attackera utmaningen.</li>
        <li><strong>Fokusera på intressen, inte positioner</strong> — varför vill de ha det? Vad behöver de egentligen?</li>
        <li><strong>Uppfinn lösningar som tjänar båda sidor</strong> — den bästa förhandlaren hittar värde som inte fanns på bordet förut.</li>
        <li><strong>Använd objektiva kriterier</strong> — marknadspris, forskning, jämförbara affärer — inte godtyckligt tyckande.</li>
      </ul>
      <p>Voss nyanserade detta i <em>Never Split the Difference</em> (2016) med tjugo års erfarenhet som FBI:s chefs-gisslanförhandlare: <em>"Compromise is the easy, cowardly way out. Both parties leaving slightly unhappy is not a good deal — it's two bad deals."</em> Det bästa kontraktet är det där båda går därifrån med mer än de trodde var möjligt.</p>

      <h3>BATNA — din verkliga förhandlingsstyrka</h3>
      <p>BATNA = <strong>Best Alternative To a Negotiated Agreement</strong>. Det är vad du gör om den här förhandlingen havererar. Din BATNA är inte dina förhoppningar — det är ditt konkret bästa alternativ.</p>
      <p>BATNA avgör din styrka mer än vad som står på pappret:</p>
      <ul>
        <li><strong>Stark BATNA</strong>: Du har tre andra liknande affärer i pipeline. Du kan gå därifrån idag utan att månadsmålet rör sig. Det ger dig frihet att hålla dina villkor. Kunden känner av det — och ger efter.</li>
        <li><strong>Svag BATNA</strong>: Det här är kvartalets enda chans. Du behöver den. Du vet det. Kunden anar det. Och plötsligt handlar förhandlingen inte längre om värde — den handlar om din desperation.</li>
      </ul>
      <p>Bygg alltid fler alternativ i din pipeline. Det är det enskilt viktigaste du kan göra för dina förhandlingsresultat. En säljare med 10 varma affärer stänger bättre varje enskild än en säljare med 2. Samma säljare. Samma kompetens. Olika pipeline.</p>

      <h3>ZOPA — var affären faktiskt kan landa</h3>
      <p>ZOPA = <strong>Zone Of Possible Agreement</strong> — området mellan säljarens lägsta acceptabla och kundens högsta acceptabla. Existerar ZOPA? Då finns en affär. Existerar den inte? Då är ni i fel förhandling.</p>
      <p>Ditt jobb som förhandlare är att förstå kundens ZOPA-kant — deras högsta acceptabla — utan att avslöja din lägsta. Frågor som <em>"Vad skulle behöva vara sant för att det här skulle fungera för er?"</em> eller <em>"Om budgeten var det enda som stod emellan oss, vad skulle vi behöva landa på?"</em> avslöjar deras kant.</p>

      <h3>Anchoring — ankaret bestämmer slutnumret</h3>
      <p>Daniel Kahneman visade i <em>Thinking, Fast and Slow</em> att hjärnan är radikalt mottaglig för det första talet den hör. Forskning vid Harvard: deltagare tillfrågades gissa befolkningen i Turkiet efter att ha sett ett helt orelaterat tal först. De som såg siffran 5 miljoner gissade lägre än de som såg 65 miljoner. Medvetet visste alla att talet var meningslöst. Omedvetet formade det deras bedömning.</p>
      <p>I en prisförhandling spelar ankarets kraft dig i händerna — om du använder det rätt:</p>
      <ul>
        <li><strong>Du bör ankra först, inte kunden.</strong> Den som nämner ett nummer först sätter referenspunkten som resten av förhandlingen pendlar runt.</li>
        <li><strong>Ankra högt men försvarbart.</strong> För högt utan substans raderar din trovärdighet. För lågt lämnar pengar på bordet för evigt.</li>
        <li><strong>Förklara ditt ankare.</strong> "Vi priserar på X för att vi jobbar med Y andra kunder i er storlek och vi vet att det här levererar Z resultat." Ett ankare med resonemang är oslagbart.</li>
        <li><strong>Om kunden ankrar först lågt</strong> — låt det inte stå oemotsagt. "Det är långt ifrån vad vi jobbar med — det skulle i praktiken betyda [vad de skulle förlora]." Svara på ankaret innan du ger ditt eget.</li>
      </ul>

      <h3>Voss-metoden — taktisk empati som förhandlingsvapen</h3>
      <p>Chris Voss tillbringade 24 år vid FBI som chefförhandlare i bankrån och kidnappningar. Hans metod utvecklades i situationer där personer hade vapen mot sina offers huvuden. Om hans tekniker fungerade där — fungerar de i ett säljrum.</p>
      <p>De fyra kärnteknikerna:</p>
      <p><strong>1. Mirroring (spegling)</strong> — repetera de sista 1–3 orden kunden sa, med höjd ton som en fråga. Kunden utvecklar spontant.</p>
      <ul>
        <li>Kund: <em>"Vi har lite budgetbekymmer just nu."</em></li>
        <li>Du: <em>"Budgetbekymmer …?"</em></li>
        <li>Kund: <em>"Ja, CFO sa att vi måste skära 15% på alla verktygskategorier, men egentligen handlar det mest om..."</em> — och plötsligt har du information du aldrig hade frågat om direkt.</li>
      </ul>
      <p><strong>2. Labeling (etikettering)</strong> — sätt ord på kundens känsla, neutralt och observerande. <em>"Det verkar som att priset är en känslig fråga för er."</em> När känslan namnges tappar den kraft. Motparten bekräftar eller korrigerar — och båda är värdefulla reaktioner.</p>
      <p><strong>3. "Det stämmer" är det verkliga avslutet</strong> — målet är inte att höra "ja", enligt Voss. "Ja" är ofta ett defensiv-ja för att sluta prata om något svårt. Målet är att höra <em>"det stämmer"</em>. Det betyder att motparten känner sig djupt förstådd, och då öppnar de för samarbete. Sammanfatta deras position med så mycket empati att de säger det.</p>
      <p><strong>4. "Nej" är en öppning, inte ett slut.</strong> Voss vänder den klassiska säljvisdomen upp och ned. Människor är rädda att säga "ja" — det känns som en fälla. "Nej" är däremot tryggt. Så fråga frågor där "nej" är det trygga svaret: <em>"Skulle det vara orimligt att kika på siffrorna?"</em> — då säger kunden "nej" och hamnar plötsligt i samarbetsläge.</p>

      <h3>Ge aldrig något utan att ta något tillbaka</h3>
      <p>Den viktigaste förhandlingsregeln för säljare: <strong>varje gång du ger, ta något</strong>. Inte för att vara snål — utan för att lära kunden att varje eftergift har ett värde. Ger du rabatt gratis signalerar du att priset var påhittat från början. Då går nästa förhandling ännu sämre.</p>
      <p>Alternativ till prissänkning (de bästa förhandlarna tar till dessa först):</p>
      <ul>
        <li><strong>Kortare avtalstid</strong> — "Vi kan gå ner på det priset om ni kör på 12 månader istället för 36."</li>
        <li><strong>Snabbare start</strong> — "Om ni tecknar före 31a, håller vi priset."</li>
        <li><strong>Reducerade features</strong> — lägre pris men färre moduler.</li>
        <li><strong>Förskottsbetalning</strong> — billigare om de betalar helåret up-front.</li>
        <li><strong>Referral-avtal</strong> — "Vi kan hjälpa er med X om ni ställer upp på ett case study."</li>
        <li><strong>Större scope</strong> — istället för lägre pris, mer till samma pris.</li>
      </ul>
      <p>Om du måste sänka priset — gör det villkorligt: <em>"Om vi kan stänga det här i veckan, kan jag se vad jag kan göra."</em> Alltid. Utan undantag.</p>

      <h3>"Nibble"-tekniken — och hur du försvarar dig</h3>
      <p>När allt verkar klart lägger kunden ofta in en liten sista begäran: <em>"Förresten, kan ni kasta in X också?"</em> Det kallas <em>nibble</em> — ett sista knaprande efter att huvudrätten är ätit. Fungerar för att du är emotionellt investerad, klockan är sen, och du vill inte riskera affären.</p>
      <p>Motmedel: <strong>alltid motkräv</strong>. <em>"Det går, om ni också..."</em> eller med leende <em>"Du är sluga — det är inte inkluderat, men om vi kan addera en 6-månaders-förlängning löser vi det."</em> Låt aldrig en gratis nibble passera. Annars blir alla framtida förhandlingar ännu svårare.</p>

      <h3>Pris kommer alltid sist — aldrig först</h3>
      <p>En av de största säljarmissarna: att diskutera pris innan värdet är etablerat. Värde är subjektivt. Om kunden hör "250 000 kr" innan hon förstår vad hon får, jämför hon mot sin föreställning av vad det borde kosta — inte mot värdet hon får.</p>
      <p>Alltid: <strong>etablera värde först. Prata pris sist.</strong> Frågor som dyker upp tidigt om pris ska bromsas diplomatiskt: <em>"Bra fråga, jag vill ge dig ett ärligt svar — kan vi ta priset när jag vet lite mer om hur ni vill använda det? Det avgör hur vi paketerar."</em></p>

      <h3>Emotionell reglering — ditt sista försvar</h3>
      <p>Under press aktiveras din amygdala. Din prefrontala cortex — där logik och perspektiv bor — tappar kraft. Du blir reaktiv, inte strategisk. Motparten känner det.</p>
      <p>Voss-teknik: <strong>the late-night FM DJ voice</strong>. Lågmäld. Lugn. Långsam. När du sänker din röst sänks också kundens pressnivå. Motsatsen — en snabb, höjd röst — eskalerar situationen.</p>
      <p>När du känner att du tappar: be om en paus. <em>"Låt mig kolla en sak internt och återkomma i eftermiddag."</em> En paus bryter momentum och låter dig återhämta perspektiv. Aldrig accept eller avslag i upprört tillstånd.</p>

      <h3>Börja här — tre tekniker att bemästra i 30 dagar</h3>
      <ol>
        <li><strong>Mirroring</strong> — nästa tio invändningar du får, repetera bara de sista orden som en fråga. Säg inget annat. Se vad som kommer.</li>
        <li><strong>"Det stämmer"-sammanfattning</strong> — i varje förhandling, försök få kunden att säga "det stämmer" minst en gång innan du föreslår lösning.</li>
        <li><strong>Motkrav vid varje eftergift</strong> — inga gratis rabatter. Aldrig. Bygg vanan.</li>
      </ol>
      <p>Det här är inte trick. Det är skicklighet byggd på 40 år av forskning, tusentals verkliga förhandlingar — och ren psykologi. Använd klokt.</p>
    `,
    quiz: [
      { q: 'Vad är BATNA?', options: ['En förhandlingsteknik för att sänka priset', 'Ditt bästa alternativ om förhandlingen misslyckas', 'En metod för att hantera invändningar', 'En typ av avslutsstrategi'], answer: 1 },
      { q: 'Vad är "anchoring" i en prisförhandling?', options: ['Att hålla fast vid ditt pris', 'Att den som nämner ett nummer först sätter referenspunkten', 'Att be kunden föreslå ett pris', 'Att ge ett lägre pris för att starta förhandlingen'], answer: 1 },
      { q: 'Vad är principled negotiation?', options: ['Att alltid hålla ditt ursprungspris', 'Att förhandla så att båda parter känner sig nöjda', 'Att vinna förhandlingen till varje pris', 'Att undvika förhandling helt'], answer: 1 },
      { q: 'Vad är Chris Voss mest känd för?', options: ['SPIN Selling', 'Taktisk empati och FBI-förhandlingstekniker', 'BATNA-modellen', 'The Challenger Sale'], answer: 1 },
      { q: 'Vad innebär "Labeling" enligt Chris Voss?', options: ['Att märka upp alla dina argument', 'Att verbalt bekräfta kundens känsla — "Det verkar som..."', 'Att lista alla produktens features', 'Att namnge din förhandlingsstrategi'], answer: 1 },
      { q: 'Varför bör du aldrig ge rabatt utan villkor?', options: ['Det är olagligt', 'Det underminerar värdet och signalerar desperation', 'Kunder gillar inte rabatter', 'Det minskar din provision'], answer: 1 },
      { q: 'Vad bör du göra om kunden ankar med ett lågt pris?', options: ['Acceptera och förhandla därifrån', 'Tacka nej direkt', 'Kommentera att det är långt från er nivå innan du ger ditt pris', 'Ge ett ännu lägre pris'], answer: 2 },
      { q: 'Varför är en stark BATNA viktig?', options: ['Den gör att du aldrig behöver kompromissa', 'Den ger dig frihet att hålla dina villkor utan desperation', 'Den garanterar att du vinner förhandlingen', 'Den gör att kunden alltid accepterar ditt pris'], answer: 1 },
      { q: 'Vad är "mirroring" i Voss-modellen?', options: ['Att spegla kundens kroppsspråk', 'Att repetera de sista 1–3 orden kunden sa för att de ska utveckla', 'Att visa kunden en presentation', 'Att matcha kundens tonläge'], answer: 1 },
      { q: 'Vilka alternativ till prissänkning kan du erbjuda?', options: ['Det finns inga alternativ till prissänkning', 'Kortare avtalstid, enklare implementering eller reducerade features', 'Alltid mer service', 'Längre betalningsplan'], answer: 1 },
    ],
  },

  // ── 13. Personligt Varumärke ──────────────────────────────────────────────
  {
    id: 'personligt-varumarke',
    title: 'Personligt Varumärke',
    subtitle: 'Bli känd, gillad och anlitad — i rätt ordning',
    icon: '⭐',
    gradient: 'linear-gradient(135deg, #db2777, #be185d)',
    color: '#db2777',
    youtubeId: null,
    teaser: `
      <h3>Vad är ett personligt varumärke?</h3>
      <p>Ditt personliga varumärke är vad folk säger om dig när du inte är i rummet. I en värld där kunder googlar dig innan de svarar på ditt samtal — är ditt varumärke din dörroppnare.</p>
      <p>Det här blocket lär dig hur du positionerar dig, bygger thought leadership och skapar ett digitalt och analogt varumärke som attraherar rätt kunder till dig.</p>
    `,
    theory: `
      <h3>Ditt varumärke är vad andra säger när du inte är i rummet</h3>
      <p>Jeff Bezos formulerade den mest citerade definitionen: <em>"Your brand is what other people say about you when you're not in the room."</em> Du kontrollerar inte ditt varumärke — du påverkar det. Du kan inte bestämma vad andra tycker, men du kan bestämma vad du konsekvent gör, säger, och levererar. Över tid blir det ryktet.</p>
      <p>I en värld där kunder googlar dig innan de svarar på ditt samtal, är ditt personliga varumärke din dörröppnare. 2026 kollas du upp på LinkedIn, Google, X, eventuell podcast, och i kundens egna nätverk — ofta innan du ens fått veta att affären är aktuell. Det som står där möter kunden innan du gör det.</p>

      <h3>"Known, Liked, Trusted" — och i rätt ordning</h3>
      <p>Marknadsföringsklassikern från Bob Burg: människor köper av de som är <strong>kända, gillade och litade på</strong> — och alltid i den ordningen. Du måste existera innan du kan gillas. Du måste gillas innan du kan litas på. Du måste litas på innan du kan anlitas.</p>
      <ul>
        <li><strong>Känd</strong> — dyker du upp i rätt sammanhang? Finns du i kundens informationsflöde?</li>
        <li><strong>Gillad</strong> — har du en röst folk vill följa? Är du mänsklig, inte robotisk?</li>
        <li><strong>Litad på</strong> — håller du vad du lovar, levererar du värde utan baktanke, är du konsekvent?</li>
      </ul>
      <p>Säljare som hoppar över steg 1 eller 2 och försöker gå direkt på förtroende framstår som desperata. Säljare som bygger alla tre i rätt ordning har kunder som ringer dem istället för tvärtom.</p>

      <h3>Nischa — eller försvinn i bruset</h3>
      <p>Det största misstaget 99% av säljare gör med sitt personliga varumärke: försöka tilltala alla. "Jag hjälper företag att växa." "Jag är säljare — hör av er om ni behöver något." Det är osynlighet klädd i säljtermer.</p>
      <p>Seth Godin skrev i <em>Purple Cow</em> att det som inte är anmärkningsvärt helt enkelt inte kommer att märkas. En "purple cow" är något så specifikt, så annorlunda, att ögat tvingas stanna. Det är vad din positionering måste vara.</p>
      <p>Byggstenarna för stark nisch:</p>
      <ul>
        <li><strong>Vem</strong> — specifik målgrupp. Inte "B2B-företag" utan "SaaS-startups mellan 10–50 anställda som just nått produkt-marknadsmatch".</li>
        <li><strong>Vilket problem</strong> — specifikt pain point. Inte "öka omsättning" utan "strukturera sin första säljprocess utan att anställa en VP Sales".</li>
        <li><strong>Hur du löser det annorlunda</strong> — din metod, ditt perspektiv, din övertygelse som sticker ut.</li>
      </ul>
      <p>Testet: om din positionering kan kopieras av 10 andra säljare med samma titel, är den för bred. Den ska vara så specifik att bara du kan uttala den utan att ljuga.</p>

      <h3>Thought Leadership — bli den experten folk citerar</h3>
      <p>Thought leadership innebär att du konsekvent delar insikter som positionerar dig som auktoritet i din nisch. Det är inte skryt — det är service. Du lär ut det du vet, du tar ställning, du utmanar konventioner med ett tänkande andra inte redan har hört.</p>
      <p>Robert Greene i <em>Mastery</em>: expertis byggs genom tusentals små handlingar av fokus över år. Thought leadership är samma sak — tusentals små poster, kommentarer, artiklar och samtal som över tid bildar en tjock boksida om vad du står för.</p>
      <p>Regler för thought leadership som funkar:</p>
      <ul>
        <li><strong>Skriv om vad du lär dig, inte bara vad du kan.</strong> Den som delar sin resa är mer intressant än den som bara delar sin status.</li>
        <li><strong>Ta ställning.</strong> Neutrala åsikter minns ingen. "Det beror på" är thought leadership-mord. Välj en sida — även om det kostar dig vissa läsare.</li>
        <li><strong>Var konkret, inte svävande.</strong> "Kundfokus är viktigt" är ord-soppa. "Vi ringer varje ny kund dag 3 för att fånga friction innan de glömmer" är användbart.</li>
        <li><strong>Berätta historier.</strong> Människor minns historier, inte bullet points. En konkret affär du vann eller förlorade slår varje ramverk.</li>
        <li><strong>Gör det regelbundet.</strong> En post per vecka i två år slår en viral post en gång.</li>
      </ul>

      <h3>Content-flywheel — systemet som bygger sig självt över tid</h3>
      <p>De mest framgångsrika personliga varumärkena är byggda som flywheels — system som förstärker sig själva. Principen: ett mödosamt skapat "hero-content" (en djup artikel, en podcast, en video) bryts ner i många distributioner (LinkedIn-poster, citat-bilder, kortform, mejl till prenumeranter), som alla pekar tillbaka på det ursprungliga verket.</p>
      <p>Justin Welsh — som byggde ett 10M USD-personligt-varumärke på LinkedIn — kör en enkel cadens: en lång newsletter per vecka (söndag) som bryts ner i 5 LinkedIn-poster (måndag–fredag). Gary Vaynerchuks agentur kör samma principe men med video som kärna — en keynote blir 64 delar content över olika plattformar.</p>
      <p>Nyckel: börja med EN kanal där din målgrupp redan finns. Bli mycket bra där innan du splittrar dig. För de flesta säljare 2026 är den kanalen LinkedIn.</p>

      <h3>Konsistens slår perfektion — varje gång</h3>
      <p>De flesta väntar på att deras innehåll ska vara perfekt. Resultatet: de publicerar aldrig. Två år senare har kollegan som postade lite skruttigt varannan vecka byggt en följarbase på 15 000 personer. Du sitter fortfarande med din halvfärdiga draft.</p>
      <p>Seth Godin, som publicerat ett blogginlägg dagligen i över 20 år (8 000+ inlägg), säger: <em>"Ship your work. The world judges you on what you shipped, not on what you were capable of shipping."</em></p>
      <p>Praktisk regel: sätt en publiceringsrytm du kan hålla även under dåliga veckor. En post per vecka är bättre än sex per vecka följt av tre månaders tystnad.</p>

      <h3>Substantivt varumärke vs. "personlig marknadsföring"</h3>
      <p>Varning: det finns en farlig gren av personligt varumärke som är ren skrävel — curated Instagram-bilder från konferenser, bulletpoint-listor av "10 saker jag lärt mig om ledarskap", self-congratulatory posts. Det byggs på skönhet, inte substans.</p>
      <p>Substantivt varumärke byggs på <strong>verkliga resultat</strong>, <strong>ärlig reflektion</strong> och <strong>pedagogisk generositet</strong>. Du måste ha gjort något på riktigt för att ha något att lära ut. "Fake it till you make it" funkar i början — men håller inte över tid. Kunderna genomskådar det.</p>
      <p>David Ogilvy: <em>"The consumer isn't a moron. She's your wife."</em> Samma gäller personligt varumärke. Publiken ser igenom det snabbt. Bygg på riktigt.</p>

      <h3>Offline-varumärke — det verkliga testet</h3>
      <p>Ditt varumärke byggs inte bara online. Det byggs i varje offline-interaktion: hur du behandlar receptionisten, om du kommer i tid, om du följer upp när du inte måste, hur du pratar om konkurrenter, hur du hanterar ett förlorat ärende.</p>
      <p>Regel: behandla varje människa som om de kommer vara din nästa kund. Ofta blir de det. Säljchefen du nobbade för fyra år sedan är CFO idag på det företaget du just pitchade. Nätverk är det sammanlagda intrycket av varje interaktion — och internet minns allt.</p>

      <h3>Ditt professionella rykte — den långsamt byggda rikedomen</h3>
      <p>Warren Buffett: <em>"It takes 20 years to build a reputation and five minutes to ruin it. If you think about that, you'll do things differently."</em></p>
      <p>Det personliga varumärket byggs genom hundratusentals små handlingar över år. Ett ärligt svar när du kunde ha ljugit. En introduktion du gjorde utan att få något tillbaka. En artikel du publicerade som inte sålde något men hjälpte 500 läsare. En kund du ringde för att säga att din lösning inte passade dem.</p>
      <p>Varje sådan handling lägger en mikrogrammatik till en tjock bok som heter "vem du är". Efter 10 år är den boken din konkurrensfördel ingen kan kopiera.</p>

      <h3>Börja här — 90-dagarsplanen</h3>
      <ol>
        <li><strong>Vecka 1</strong>: Definiera nischen. Skriv dina tre meningar: vem, vilket problem, hur annorlunda.</li>
        <li><strong>Vecka 2</strong>: Uppdatera LinkedIn-profilen (se Block 11). Headline, om-text, framträdande sektion.</li>
        <li><strong>Vecka 3–12</strong>: En post per vecka. Alltid konkret. Alltid ta ställning. Alltid något från din verkliga vardag.</li>
        <li><strong>Månadsvis</strong>: En längre artikel eller video där du samlar veckans poster i ett djupare resonemang.</li>
      </ol>
      <p>Du kommer inte vara känd på 90 dagar. Men du kommer ha börjat — och det är 95% av jobbet som de flesta aldrig gör.</p>
    `,
    quiz: [
      { q: 'Vad är ett personligt varumärke?', options: ['Din logga och dina visitkort', 'Vad folk säger om dig när du inte är i rummet', 'Din LinkedIn-profil', 'Ditt CV'], answer: 1 },
      { q: 'Vad är det vanligaste misstaget i personlig positionering?', options: ['Att vara för specifik', 'Att försöka appellera till alla och därmed ingen', 'Att publicera för ofta', 'Att ha ett för smalt nätverk'], answer: 1 },
      { q: 'Vad är Thought Leadership?', options: ['Att ha en chefsroll', 'Att dela insikter som positionerar dig som auktoritet i din nisch', 'Att ha många följare', 'Att skriva långa artiklar'], answer: 1 },
      { q: 'Vad definierar Jeff Bezos som ditt varumärke?', options: ['Din omsättning och tillväxt', 'Vad andra säger om dig när du inte är i rummet', 'Din produktkvalitet', 'Din marknadsföring'], answer: 1 },
      { q: 'Vad är viktigare — konsistens eller perfektion i innehållsskapande?', options: ['Perfektion — kvalitet är allt', 'Konsistens — en okej post som publiceras slår en perfekt som aldrig skickas', 'Det beror på plattformen', 'De är lika viktiga'], answer: 1 },
      { q: 'Hur bör du kommentera andras LinkedIn-innehåll för att stärka ditt varumärke?', options: ['Kort och artigt: "Bra post!"', 'Med ett eget perspektiv och värde', 'Aldrig — fokusera på ditt eget innehåll', 'Bara om du håller med'], answer: 1 },
      { q: 'Vad innebär att "ta ställning" i thought leadership?', options: ['Att argumentera med alla', 'Att ha och kommunicera ett tydligt perspektiv — neutralitet glöms', 'Att kritisera konkurrenter', 'Att dela politiska åsikter'], answer: 1 },
      { q: 'Varför är offline-beteende en del av ditt varumärke?', options: ['Det är det inte — varumärke är digitalt', 'Hur du behandlar folk i alla lägen bygger det verkliga ryktet', 'Offline-möten är föråldrade', 'Bara i B2C-branscher'], answer: 1 },
      { q: 'Vad är en stark nischpositionering?', options: ['Bred — hjälpa alla typer av kunder', 'Specifik målgrupp + specifikt problem + unik metod', 'Fokus på lägst pris i marknaden', 'Störst möjliga geografisk täckning'], answer: 1 },
      { q: 'Hur länge tar det att bygga ett starkt personligt varumärke?', options: ['Några dagar med rätt innehåll', 'En vecka med viral post', 'Månader av konsistent aktivitet', 'Det går inte att bygga avsiktligt'], answer: 2 },
    ],
  },

  // ── 14. Träning & Hälsa ───────────────────────────────────────────────────
  {
    id: 'traning-halsa',
    title: 'Träning & Hälsa',
    subtitle: 'Din kropp är ditt viktigaste säljverktyg',
    icon: '💪',
    gradient: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: '#16a34a',
    youtubeId: null, // Byt till riktigt YouTube-ID när Joakims video är inspelad
    teaser: `
      <h3>Prestation börjar med kroppen</h3>
      <p>En säljare är en kognitiv atlet. Du fattar beslut, hanterar stress, läser av folk och håller energin uppe — hela dagen, varje dag. Din fysiska kondition avgör din mentala skärpa och emotionella reglering.</p>
      <p>Det här blocket tar upp träningens direkta effekt på säljprestation, sömnens roll, energihantering under arbetsdagen och hur du bygger vanor som håller.</p>
    `,
    theory: `
      <h3>Säljaren är en kognitiv atlet</h3>
      <p>Du fattar hundratals beslut per dag. Hanterar stress i samtal som kan avgöra månadens kvot. Läser av mikrouttryck på zoom. Håller energin uppe genom 11 samtal i rad innan lunch. Lämnar dagen med kropp som producerat mer stresshormoner än en marathonlöpare — och sätter dig sen och skriver uppföljningsmejl tills klockan 21.</p>
      <p>Det här är ett kognitivt krävande yrke. Din fysiska kondition avgör direkt din mentala skärpa, din emotionella reglering, din uthållighet under press, och — i förlängningen — din inkomst. Säljare som försummar kroppen tror att de sparar tid. I själva verket betalar de med intäkter.</p>
      <p>Peter Attia, läkaren bakom <em>Outlive</em>, har en fras som träffar säljaryrket: <em>"The most important thing you can do for your cognitive performance is train your body."</em> Harvard Business Review har publicerat samma slutsats år efter år — toppresterande chefer och säljare är signifikant mer fysiskt aktiva än genomsnittet. Det är ingen slump. Det är kausalt.</p>

      <h3>Träningens direkta effekter på säljprestation</h3>
      <p>Fysisk aktivitet är inte en "wellness-grej" — det är en kognitiv enhancer med effekter som mätbart omvandlas till dina resultat:</p>
      <ul>
        <li><strong>Fokus</strong> — regelbunden träning ökar koncentrationsförmågan med upp till 20% (forskning från John Ratey, Harvard Medical School).</li>
        <li><strong>Minne</strong> — BDNF (Brain-Derived Neurotrophic Factor), kallad "Miracle-Gro för hjärnan", höjs markant av uthållighetsträning. Mer BDNF = bättre minne = du kommer ihåg varför kunden sa nej tre veckor sen.</li>
        <li><strong>Stresshantering</strong> — träning sänker basal kortisolnivå och ökar toleransen för akut stress. Efter 6 månaders regelbunden träning hanterar kroppen pressen i ett svårt samtal fundamentalt annorlunda.</li>
        <li><strong>Energi</strong> — paradoxalt ökar träning energin snarare än att tömma den. Mitokondrier (cellens energifabriker) blir fler och effektivare.</li>
        <li><strong>Sömn</strong> — aktiva människor sover djupare och vaknar mer utvilade.</li>
        <li><strong>Självförtroende</strong> — att konsekvent hålla löften till sig själv bygger mentalt kapital. "Jag tränar även när jag inte vill" blir "jag ringer även när jag inte vill". Samma vana.</li>
      </ul>

      <h3>Vad du egentligen behöver — de tre pelarna</h3>
      <p>Du behöver inte bli bodybuilder. Du behöver inte springa maraton. Peter Attias ramverk i <em>Outlive</em> pekar på tre träningstyper som varje kognitivt krävande yrkesutövare bör ha i sin vecka:</p>
      <ul>
        <li><strong>Zon 2 — uthållighet (3–4h/vecka)</strong>: lugn, ihållande aktivitet där du kan prata men inte sjunga. Promenader i brant terräng, cykling, joggning. Bygger mitokondriell täthet — din bas för all energi.</li>
        <li><strong>Styrka (2–3h/vecka)</strong>: tyngder, kroppsvikt, motståndsträning. Inte för att se ut — för att bevara muskelmassa, insulinkänslighet och beninhet i ålder. Styrka korrelerar starkare med livslängd än nästan vilken annan biomarkör som helst.</li>
        <li><strong>Höghjärtpulsträning — VO2 Max (20–30 min/vecka)</strong>: korta, hårda intervaller (4×4 min). VO2 max är den enskilt starkaste prediktorn för både livslängd och kognitiv funktion senare i livet.</li>
      </ul>
      <p>Det här är grundrecept från longevity-forskningen. Bygg de tre pelarna — resten är finjustering.</p>

      <h3>Sömn — den viktigaste prestationsfaktorn som nästan alla underskattar</h3>
      <p>Matthew Walker, neurovetare vid UC Berkeley och författare till <em>Why We Sleep</em>: efter 17–19 timmars vakenhet presterar du kognitivt som om du vore berusad (0,05‰ promille). De flesta säljare som jobbar tills midnatt och upp 06:00 vandrar runt permanent i det tillståndet — och undrar varför de stänger färre affärer.</p>
      <p>Sömnbrist påverkar allt som säljer:</p>
      <ul>
        <li><strong>Emotionell reglering</strong> — sömnbrist gör amygdalan 60% mer reaktiv. Du tappar tålamod med en invändning du hade klarat av vaken.</li>
        <li><strong>Mönsterigenkänning</strong> — REM-sömn är där hjärnan integrerar dagens lärdomar. Mindre REM = mindre intuition i nästa samtal.</li>
        <li><strong>Sociala signaler</strong> — Walker-laboratoriet visade att sömnbrist gör oss signifikant sämre på att läsa av ansiktsuttryck. Halva säljet försvinner där.</li>
      </ul>
      <p>Sömnprotokoll som faktiskt fungerar:</p>
      <ul>
        <li>Sov 7–9 timmar. Det är inte lathet — det är prestation.</li>
        <li>Konsistent sömnschema — gå upp samma tid varje dag, även lördagar. Biologiska klockan älskar regelbundenhet.</li>
        <li>Undvik skärmar 30–60 min före sömn. Blått ljus förtränger melatonin. Om du måste använda skärm — blue light filter, mörkt läge.</li>
        <li>Svalt, mörkt, tyst sovrum. 17–18°C är sovoptimal temp. Ingen mobil bredvid sängen.</li>
        <li>Ingen koffein efter 14:00. Koffein har halveringstid på 5–6h — en kopp 16:00 stör fortfarande djupsömnen 22:00.</li>
        <li>Ingen alkohol tätt inpå läggdags. Alkohol känns som det får dig att sova, men sabbar REM-fasen och halverar djupsömnskvaliteten.</li>
      </ul>

      <h3>Energihantering — inte tidshantering</h3>
      <p>Tony Schwartz, författaren bakom <em>The Power of Full Engagement</em>, tillsammans med prestationspsykologen Jim Loehr, har visat att det inte är tiden som är din flaskhals — det är <strong>energin</strong>. Du kan ha 10 timmar kvar på arbetsdagen men vara kognitivt tömd efter 2 intensiva samtal.</p>
      <p>Prestation handlar om att förvalta dina energitoppar och dalar medvetet:</p>
      <ul>
        <li><strong>Morgon (06–11)</strong>: din skärpaste kognitiva tid. Lägg de viktigaste säljsamtalen, förhandlingar och kreativt skrivarbete här.</li>
        <li><strong>Efter lunch (13–15)</strong>: naturlig energidip. Lägg administrativa uppgifter, CRM-uppdatering, enkla mejl. Slåss inte mot dippen — planera för den.</li>
        <li><strong>Sen eftermiddag (15–17)</strong>: andra kognitiva topp. Bra för möten, uppföljningar och beslutsfattande som kräver energi igen.</li>
        <li><strong>Kväll</strong>: låg kognitiv tid. Inte rätt stund för stora beslut eller svåra samtal.</li>
      </ul>
      <p>Ta mikropauser var 90:e minut. Ultradian rhythm — din hjärna jobbar i 90-minuters-cykler. Efter 90 minuter djupt fokus behöver du 5–15 minuter återhämtning. En kort promenad, inte scrollning i sociala medier (det är inte paus — det är bara annan kognitiv belastning).</p>

      <h3>Kost och hydrering — blodsockerstabilitet är allt</h3>
      <p>Hjärnan är 73% vatten. Mild dehydrering (1–2% av kroppsvikten) sänker kognitiv prestation med upp till 20%. Drick vatten hela dagen — inte bara när du är törstig (då är du redan uttorkad).</p>
      <p>Ditt blodsocker styr din energi, ditt fokus och din emotionella stabilitet i varje samtal. Undvik sockerrushen som följs av den värsta 14.30-dippen du någonsin haft:</p>
      <ul>
        <li><strong>Protein i varje måltid</strong> — stabiliserar blodsockret och gör att du håller dig mätt.</li>
        <li><strong>Komplexa kolhydrater</strong> — havregryn, sötpotatis, fullkorn — släpper energi långsamt istället för en kort peak.</li>
        <li><strong>Nötter, avokado, olivolja</strong> — hälsosamma fetter är hjärnbränsle.</li>
        <li><strong>Begränsa vit bröd, läsk, godis</strong> under arbetsdagar. De kostar dig mer i energidippar än de ger i snabb energi.</li>
        <li><strong>Periodisk fasta</strong> är intressant för många — 16:8 (16h fasta, 8h ätfönster). Ger mental klarhet på morgonen för några. Men det fungerar inte för alla — experimentera.</li>
      </ul>

      <h3>Stress, andning och återhämtning</h3>
      <p>Säljyrket är stressigt. Kronisk stress är inte bara obehagligt — det eroderar immunförsvar, sömn, matsmältning och beslutskvalitet. Verktyg som fungerar:</p>
      <ul>
        <li><strong>Boxandning</strong> (Navy SEALs-metoden): 4 sek in, 4 håll, 4 ut, 4 håll. 2–3 minuter före ett svårt samtal sänker hjärtfrekvens och aktiverar parasympatiska nervsystemet.</li>
        <li><strong>Fysiologisk suck</strong> (Andrew Huberman): två snabba inandningar följt av en lång utandning. Mest effektiva sättet att snabbt sänka stress — mer effektivt än meditation i akuta ögonblick.</li>
        <li><strong>Kyla</strong> — 2–3 minuter kall dusch på morgonen höjer dopamin med 250% i 2–3 timmar efteråt. Säljare rapporterar mer energi, bättre humör och bättre stresstolerans.</li>
        <li><strong>Bastu</strong> — 20 minuter, 80°C, 3–4 gånger i veckan. Finska studier visar kraftigt sänkt risk för demens, hjärtinfarkt och dödlighet. För säljare: stressinokulering — din kropp lär sig tolerera obehag.</li>
      </ul>

      <h3>Små vanor, enorma effekter</h3>
      <p>Du behöver inte göra allt. Börja med tre saker — det är där 80% av effekten ligger:</p>
      <ol>
        <li><strong>7+ timmars sömn</strong> på konsistent schema — den enskilt största prestationshöjaren.</li>
        <li><strong>3 träningspass per vecka</strong> — 1 styrka, 1 uthållighet, 1 intensivt.</li>
        <li><strong>Drick 2,5 liter vatten om dagen</strong> — enklast av alla och kraftfullare än du tror.</li>
      </ol>
      <p>Gör det här i 12 månader och din säljprestation kommer vara förändrad på ett sätt ingen sälj-kurs kan leverera. Din kropp är ditt viktigaste verktyg. Träna det som sådant.</p>
    `,
    quiz: [
      { q: 'Hur påverkar regelbunden träning koncentrationsförmågan?', options: ['Den minskar den med 10%', 'Den ökar den med upp till 20%', 'Den har ingen effekt', 'Den ökar den med 5%'], answer: 1 },
      { q: 'Vad säger Matthew Walker om sömnbrist?', options: ['7 timmars sömn är onödigt mycket', 'Efter 17–19 timmars vakenhet presterar du kognitivt som om du vore berusad', 'Man vänjer sig vid lite sömn', 'Sömn är viktigast för kreativa yrken'], answer: 1 },
      { q: 'Vad handlar prestation om enligt Tony Schwartz?', options: ['Tidshantering', 'Energihantering', 'Produktivitetssystem', 'Rätt verktyg'], answer: 1 },
      { q: 'Vilken tid på dagen är du generellt skarpast kognitivt?', options: ['Sent på kvällen', 'Direkt efter lunch', 'På morgonen', 'Det varierar slumpmässigt'], answer: 2 },
      { q: 'Hur mycket sänker mild dehydrering den kognitiva prestationen?', options: ['1–2%', '5–10%', 'Upp till 20%', 'Det har ingen effekt'], answer: 2 },
      { q: 'Varför bygger träning självförtroende?', options: ['Man ser bättre ut', 'Att hålla löften till sig själv bygger mentalt kapital', 'Man träffar fler människor', 'Det är en myt'], answer: 1 },
      { q: 'Hur ofta bör du ta en mikropausa för att hålla fokus?', options: ['En gång per dag', 'Var 30:e minut', 'Var 90:e minut', 'Bara när du känner dig trött'], answer: 2 },
      { q: 'Hur många timmars sömn rekommenderas för optimal prestation?', options: ['4–5 timmar', '5–6 timmar', '7–9 timmar', '10+ timmar'], answer: 2 },
      { q: 'Varför är konsistent sömnschema viktigt?', options: ['Det är mest viktigt för barn', 'Det optimerar din biologiska klocka och sömnkvalitet', 'Det gör att du sover kortare', 'Det är viktigt bara om du tränar'], answer: 1 },
      { q: 'Vad bör du prioritera i kosten för jämn energi under säljdagen?', options: ['Socker och snabba kolhydrater för snabb energi', 'Protein och komplexa kolhydrater för stabilt blodsocker', 'Kaffe och energidrycker', 'Fasta tills lunch för mental klarhet'], answer: 1 },
    ],
  },

  // ── 15. Tidshantering & Produktivitet ─────────────────────────────────────
  {
    id: 'tidshantering',
    title: 'Tidshantering & Produktivitet',
    subtitle: 'Gör rätt saker — inte fler saker',
    icon: '⏱️',
    gradient: 'linear-gradient(135deg, #475569, #334155)',
    color: '#64748b',
    youtubeId: null,
    teaser: `
      <h3>Det stora missförståndet om produktivitet</h3>
      <p>Produktivitet handlar inte om att göra fler saker — det handlar om att göra rätt saker. De flesta säljare är fullt sysselsatta hela dagen men lyckas ändå inte nå sina mål. Anledningen: de arbetar hårt på fel saker.</p>
      <p>Det här blocket ger dig 80/20-tänket i sälj, time blocking, och konkreta system för att skydda din tid och maximera varje arbetsdag.</p>
    `,
    theory: `
      <h3>Kärnan: produktivitet är inte att göra mer — det är att göra rätt</h3>
      <p>Sanningen som de flesta säljare vägrar acceptera: du kommer aldrig få mer tid. 24 timmar är det du får. Samma som Jeff Bezos. Samma som din kollega som underpresterar. Samma som toppsäljaren på kontoret.</p>
      <p>Skillnaden är inte hur många timmar — utan vad som händer <em>inuti</em> dem. Topprestanda är inte en fråga om hårdare arbete. Det är en fråga om vilka aktiviteter du väljer och vilken energi du ger dem.</p>
      <p>Det 90% missar: de mäter produktivitet i "vad blev klart?" istället för "vad flyttade nålen?". En dag med 40 mejl besvarade kan vara mindre värdefull än en dag med ett enda riktigt samtal med rätt kund.</p>

      <h3>Problemet: så här förlorar säljare sin dag</h3>
      <p>Typisk dag för en underpresterande säljare:</p>
      <ul>
        <li>08:00 — öppnar mejl. Reagerar på andras prioriteringar i 90 min.</li>
        <li>09:30 — möte som kunde varit ett mejl. 45 min.</li>
        <li>10:15 — "snabb" Slack-fråga. Bryter fokus.</li>
        <li>10:30 — försöker komma igång med prospektering. Slack igen. Mejl igen.</li>
        <li>12:00 — lunch. Känner sig bakom redan.</li>
        <li>13:00 — möte. Meddelanden. Mejl. Mer möte.</li>
        <li>17:00 — dagen är slut. Inga nya samtal. Inga stängda affärer. Noll nål flyttad.</li>
      </ul>
      <p>Det kallas <strong>reaktivt arbete</strong>. Du reagerar hela dagen på andras prioriteringar. Veckor av sådant arbete och kvoten är mörk.</p>
      <p>Konsekvensen: du blir "busy" utan att vara produktiv. Trött utan att ha levererat. Och — efter några månader — slut på motivation, eftersom belöningen aldrig kommer.</p>

      <h3>Ramverk 1: 80/20 för säljare (Pareto)</h3>
      <p>Vilfredo Pareto såg det på sin tomat-skörd 1896 — 80% av tomaterna kom från 20% av plantorna. Richard Koch applicerade det på business 100 år senare. I säljvardagen är regeln brutalt konsekvent:</p>
      <ul>
        <li><strong>20% av dina prospekts</strong> blir 80% av dina affärer.</li>
        <li><strong>20% av dina kunder</strong> genererar 80% av din omsättning.</li>
        <li><strong>20% av dina aktiviteter</strong> ger 80% av dina resultat.</li>
      </ul>
      <p><strong>Övning nu (5 min):</strong> Öppna ditt CRM. Sortera dina 10 största affärer senaste året. Vad har dessa kunder gemensamt? Bransch, storlek, roll du pratade med, var du hittade dem? <em>Det är dina 20%</em>. Resten av din prospektering ska dubblera den profilen.</p>

      <h3>Ramverk 2: Eisenhower-matrisen (prioritering som faktiskt fungerar)</h3>
      <p>President Dwight Eisenhower: <em>"What is important is seldom urgent, and what is urgent is seldom important."</em> Fyra rutor, en metod:</p>
      <ul>
        <li><strong>Viktig + Brådskande</strong> → Gör NU. (Förhandlingsavslut, en kris hos nyckelkund.)</li>
        <li><strong>Viktig + Inte brådskande</strong> → Schemalägg. <em>Det här är där karriären byggs.</em> (Prospektering, nätverksbyggande, kompetensutveckling.)</li>
        <li><strong>Inte viktig + Brådskande</strong> → Delegera eller förkorta. (De flesta mejl, "snabba frågor".)</li>
        <li><strong>Inte viktig + Inte brådskande</strong> → Eliminera. (Scrollning, möten som kunde varit mejl.)</li>
      </ul>
      <p>Nyckelinsikten: de flesta säljare lever i ruta 1 och 3 — kriser och brus — medan ruta 2 (där framgången byggs) glöms bort. Toppresterare spenderar 60%+ i ruta 2.</p>

      <h3>Ramverk 3: Time blocking — din kalender som vapen</h3>
      <p>Time blocking innebär att du behandlar specifika aktiviteter som möten med dig själv. Skyddade, icke förhandlingsbara, i kalendern.</p>
      <p><strong>Säljarens standarddag (time-blockad):</strong></p>
      <ul>
        <li><strong>08:00–09:00</strong> — Deep work: Dagens viktigaste uppgift. Ingen mejl. Ingen telefon.</li>
        <li><strong>09:00–11:00</strong> — <strong>Power Hour</strong>: Prospektering och utgående samtal. Högsta energi + högsta svarsfrekvens.</li>
        <li><strong>11:00–12:00</strong> — Uppföljningsmejl och LinkedIn-meddelanden (batchat).</li>
        <li><strong>12:00–13:00</strong> — Lunch. Skärm av.</li>
        <li><strong>13:00–15:00</strong> — Kundmöten, demos, discovery calls.</li>
        <li><strong>15:00–16:00</strong> — Andra Power Hour: uppföljande samtal och stängning.</li>
        <li><strong>16:00–17:00</strong> — CRM, admin, förberedelser för imorgon.</li>
      </ul>
      <p><strong>Regel:</strong> när någon frågar "har du en snabb stund?" är svaret — <em>"Ja, imorgon kl 11:30 eller torsdag kl 14. Vad passar?"</em> Aldrig "nu". Din kalender äger din dag, inte andras frågor.</p>

      <h3>Ramverk 4: Eat the Frog</h3>
      <p>Mark Twain: <em>"If it's your job to eat a frog, it's best to do it first thing in the morning. And if it's your job to eat two frogs, it's best to eat the biggest one first."</em></p>
      <p>Brian Tracy gjorde det till en bok. Princip:</p>
      <ul>
        <li>Identifiera kvällen innan: vilken är imorgon dags viktigaste, svåraste uppgift?</li>
        <li>Gör den <strong>först</strong>, innan mejl, Slack, sociala medier, nyheter — innan något annat.</li>
        <li>Klockan 09:30 är din största bragd redan avklarad. Resten av dagen känns enklare.</li>
      </ul>
      <p>Psykologin: prokrastinering är inte lathet — det är ångesthantering. Du skjuter på den svåra grejen och den ångesten äter din energi hela dagen. Eat the frog eliminerar den kostnaden.</p>

      <h3>Ramverk 5: Batching & djupt fokus</h3>
      <p>Cal Newport i <em>Deep Work</em>: varje "context switch" (byte från en typ av uppgift till en annan) kostar 15–25 minuter innan hjärnan är fullt fokuserad igen. Om du switchar 20 gånger om dagen förlorar du 5+ timmar i kognitiv uppvärmning.</p>
      <p><strong>Batching-principen:</strong></p>
      <ul>
        <li>Alla uppringningssamtal i ETT block (t.ex. 09:00–11:00).</li>
        <li>Alla mejl i ETT–TVÅ block per dag (t.ex. 11:00 och 16:00).</li>
        <li>All CRM-admin i ETT block i slutet av dagen.</li>
        <li>Aldrig, aldrig, öppna mejl som första handling på morgonen.</li>
      </ul>
      <p>Multitasking är en myt. Vad som händer är snabb switching — och det är dyrare än att köra saker i följd.</p>

      <h3>Före vs efter — hur det ser ut i praktiken</h3>
      <p><strong>FÖRE (reaktiv säljare):</strong></p>
      <blockquote>
        <p>"Åh, ett mejl. Jag svarar snabbt. Ops, en Slack. Svarar. Hallå, ett möte kl 10. Går dit. Tillbaka 10:45. Behöver uppdatera CRM. Öppnar. Ah, ny notis. Hmm, 11:30 redan? Ska nog ringa några kunder. Börjar … telefonen ringer. Kollega. Ok, 12:00. Lunch. Efter lunch … 3 mejl till. Möte 14. Möte 15. 16:00: jag har inte ringt en enda kund idag."</p>
      </blockquote>
      <p><strong>EFTER (time-blockad säljare):</strong></p>
      <blockquote>
        <p>"08:00: frog-time. Skrivit uppföljningsmejl till min största affär. 09:00: Power Hour, telefonen av för andra appar. 12 samtal, 3 möten bokade. 11:00: batchar 20 minuter mejl, avklarat. 13:00: kundmöte, förberett. 15:00: andra Power Hour, 8 samtal, 2 nya affärer framåt. 16:00: CRM, planering imorgon. Hem 17:00 mentalt klar."</p>
      </blockquote>
      <p>Samma säljare. Samma 8 timmar. 10x resultatet. Enda skillnaden: strukturen.</p>

      <h3>Live-scenarier: så skyddar du din tid</h3>
      <p><strong>Scenario 1 — chefen kommer in med en "snabb fråga":</strong></p>
      <ul>
        <li>❌ FEL: "Jo, vad gäller det?" → 20 minuter försvinner.</li>
        <li>✅ RÄTT: "Jag är mitt i ett block just nu — kan jag komma förbi kl 11:30?"</li>
      </ul>
      <p><strong>Scenario 2 — kollega "bara 5 min":</strong></p>
      <ul>
        <li>❌ FEL: "Okej, kör." → 45 min senare …</li>
        <li>✅ RÄTT: "Kan du boka 15 min i min kalender efter lunch? Det är bättre för oss båda."</li>
      </ul>
      <p><strong>Scenario 3 — kund vill ha akut möte:</strong></p>
      <ul>
        <li>❌ FEL: Spränger dina block och kör. Resten av dagen i spillror.</li>
        <li>✅ RÄTT: "Jag kan imorgon 10:00 eller 14:00. Vilket passar?" Skapar urgency som inte är din.</li>
      </ul>

      <h3>De tre vanligaste misstagen — undvik dessa</h3>
      <ol>
        <li><strong>Öppna mejl/Slack på morgonen.</strong> Du börjar dagen med att reagera istället för att agera. Mejlet kan vänta till 11:00. Jag lovar.</li>
        <li><strong>"Bara 5 minuter"-fällan.</strong> En "snabb" sak på fel tidpunkt bryter ett 90-minuters fokus-block. Kostnaden är brutal.</li>
        <li><strong>Ingen kvällsritual.</strong> Om du inte vet imorgon dags viktigaste uppgift innan du somnar, kommer morgonen slösas på att bestämma istället för att agera. 5 min kvällen innan sparar en timme på morgonen.</li>
      </ol>

      <h3>Handling: kör det här i morgon</h3>
      <ol>
        <li><strong>Kvällen innan</strong>: Skriv ner en (1) uppgift — din "frog" — som ska göras först imorgon. Inte 5. En.</li>
        <li><strong>Innan du öppnar något annat</strong>: Gör den uppgiften. 60–90 minuter. Ingen mejl, ingen Slack.</li>
        <li><strong>Time-blocka två Power Hours</strong> i morgondagens kalender: 09:00–11:00 och 15:00–16:00. Sätt dem som "möten med mig själv".</li>
        <li><strong>Mejl-batch:</strong> Öppna mejl max 2 gånger imorgon. 11:00 och 16:00. Stäng fliken däremellan.</li>
        <li><strong>Reflektion kl 17:00</strong>: Tog "frogen" sig? Vilka 2 saker var mest värdefulla? Det blir morgondagens 80/20.</li>
      </ol>

      <h3>24-timmarsövningen</h3>
      <p><strong>Idag innan du somnar</strong>: öppna din kalender för imorgon. Blockera 09:00–11:00 som "Power Hour — prospektering och utgående samtal". Lägg telefonen i flygläge under blocket. Skriv på en post-it: din frog (en uppgift, inte fem). Klistra på skärmen.</p>
      <p>Imorgon klockan 11:00: du vet ifall det funkar. De flesta säljare märker 2–3x fler meningsfulla aktiviteter under samma tid. Gör det 5 dagar i sträck — det blir din standard. Gör det 30 dagar — det blir vem du är som säljare.</p>

      <h3>Sammanfattning — fem punkter att bära med dig</h3>
      <ul>
        <li>Tiden är densamma för alla. Skillnaden är vad som händer inuti dina 8 timmar.</li>
        <li>Reaktivt arbete är motsatsen till produktivt — det känns produktivt, men flyttar inte nålen.</li>
        <li>Identifiera dina 20% aktiviteter. Skydda dem med time blocking.</li>
        <li>Eat the frog varje morgon. Aldrig öppna mejl först.</li>
        <li>Batcha — multitasking kostar 5+ timmar om dagen i kognitiv växlingskostnad.</li>
      </ul>
    `,
    quiz: [
      { q: 'Vad handlar produktivitet egentligen om?', options: ['Att göra fler saker', 'Att göra rätt saker med rätt energi', 'Att jobba fler timmar', 'Att delegera allt'], answer: 1 },
      { q: 'Vad säger Pareto-principen (80/20) om säljkunder?', options: ['Alla kunder är lika viktiga', '20% av kunderna ger 80% av omsättningen', '80% av kunderna kräver 20% av arbetet', 'Det varierar per bransch'], answer: 1 },
      { q: 'Vad är Time Blocking?', options: ['Att blockera störande webbplatser', 'Att schemalägga specifika tidsblock för specifika aktiviteter', 'Att arbeta i 25-minutersintervaller', 'Att ha färre möten'], answer: 1 },
      { q: 'Vad innebär "Eat the Frog"?', options: ['Äta frukost för bättre prestation', 'Göra den svåraste, viktigaste uppgiften först på dagen', 'Ta de svåraste kundsamtalen sist', 'Att jobba under lunchen'], answer: 1 },
      { q: 'Vad är Eisenhower-matrisen?', options: ['En säljmetodik', 'Ett verktyg för att prioritera uppgifter efter vikt och brådskande', 'En metod för att hantera invändningar', 'En kommunikationsmodell'], answer: 1 },
      { q: 'Vad bör du göra med uppgifter som är "Inte viktiga + Brådskande"?', options: ['Gör dem direkt', 'Schemalägg dem', 'Delegera dem', 'Eliminera dem'], answer: 2 },
      { q: 'Varför är multitasking ineffektivt?', options: ['Man gör för lite', 'Hjärnan byter fokus — varje switch kostar kognitiv energi', 'Det fungerar bara för vissa uppgifter', 'Det är mest ett problem för nybörjare'], answer: 1 },
      { q: 'Vilken aktivitet bör en säljare lägga på morgonen (hög energi)?', options: ['E-post och admin', 'CRM-uppdateringar', 'Prospektering och utgående samtal', 'Rapportskrivning'], answer: 2 },
      { q: 'Vad är "batching" i tidshantering?', options: ['Att arbeta i 90-minutersblock', 'Att samla liknande uppgifter och köra dem i sekvens', 'Att delegera uppgifter', 'Att schemalägga möten i grupp'], answer: 1 },
      { q: 'Hur identifierar du dina 20% mest värdefulla aktiviteter?', options: ['Fråga din chef', 'Analysera vilka aktiviteter som genererar mest pipeline och affärer', 'Välj de enklaste uppgifterna', 'Fokusera på det som är roligast'], answer: 1 },
    ],
  },

  // ── 16. Mental Styrka & Resiliens ─────────────────────────────────────────
  {
    id: 'mental-styrka',
    title: 'Mental Styrka & Resiliens',
    subtitle: 'Prestationen du inte ser — det mentala spelet',
    icon: '🧠',
    gradient: 'linear-gradient(135deg, #be123c, #9f1239)',
    color: '#be123c',
    youtubeId: null,
    teaser: `
      <h3>Sälj är ett mentalt yrke</h3>
      <p>Toppsäljare och mediokra säljare har ofta liknande produktkunskap och teknik. Skillnaden är nästan alltid mental — hur de hanterar avvisanden, dåliga perioder, press och osäkerhet.</p>
      <p>Mental styrka är en inlärd kompetens, inte ett personlighetsdrag. Det här blocket ger dig stoicismens verktyg, kognitiv reframing, visualisering och ett system för att bygga resiliens som håller långsiktigt.</p>
    `,
    theory: `
      <h3>Kärnan: sälj är ett yrke där du får nej för att leva</h3>
      <p>Räkna. 100 samtal → 20 intresserade → 10 möten → 3 offerter → 1 affär. Det betyder att under din vardag får du konsekvent mer avslag än de flesta människor upplever i ett helt liv. Nej är ditt kontor. Skrivandet slår i väggen. Det är yrket.</p>
      <p>Sanningen 90% missar: teknik och produktkunskap är ofta lika mellan toppsäljaren och medelmåttan. Det som skiljer är inte vad de kan — det är <strong>vad de tål</strong>. Hur de hanterar det femtionde nejet efter en dålig månad. Hur de stängde en affär timmen efter en obehaglig invändning. Hur de log genom en förhandling där klockan tickade och deras chef såg på.</p>
      <p>Mental styrka är inte en personlighetsdrag. Det är en inlärd kompetens. Alla kan bygga den. Få gör det medvetet.</p>

      <h3>Problemet: så smälter den omätbara säljaren ner</h3>
      <p>Typisk sekvens när en medelmåtta tappar fotfästet:</p>
      <ul>
        <li>Måndag morgon, dålig statistik förra veckan.</li>
        <li>Första samtalet: hård invändning. Hjärnan tolkar: <em>"jag är dålig på det här"</em>.</li>
        <li>Nästa tre samtal: tonen lite flackare, inlevelsen lite svagare — kunder känner av osäkerheten.</li>
        <li>Lunch: scrollar Instagram. Ser kollega som firar stor affär. Magen vänder sig.</li>
        <li>Eftermiddagen: "pausar" i en halvtimme. Pausar mer. Undviker telefon.</li>
        <li>Kl 16: gick hem med 3 samtal gjorda och 0 stängda.</li>
      </ul>
      <p>Veckorna går. Siffrorna sjunker. Självkänslan sjunker med. Det som såg ut som en "dålig period" blev en spiral där det interna berättandet — <em>"jag är inte bra"</em> — skapade den verklighet som bekräftade det.</p>

      <h3>Ramverk 1: Stoicism — den 2000 år gamla säljcoachen</h3>
      <p>Epiktetos, född som slav i Rom 50 e.Kr., skrev i <em>Enchiridion</em>: <em>"Some things are in our control, and others are not."</em> Den enda meningen har räddat fler säljare än alla moderna mindset-böcker tillsammans.</p>
      <p>Distinktionen:</p>
      <ul>
        <li><strong>Inom din kontroll:</strong> dina tankar, dina handlingar, din reaktion, din förberedelse, din arbetsinsats, din ton.</li>
        <li><strong>Utanför din kontroll:</strong> kundens beslut, marknaden, konkurrenten, timingen, vädret, din kollegas framgång.</li>
      </ul>
      <p>Hela säljyrket är strukturerat så att 95% av det som påverkar ditt resultat är utanför din direkta kontroll. Om du kopplar ditt välmående till resultatet bygger du ditt sinne på kvicksand.</p>
      <p>Marcus Aurelius — romersk kejsare, fältherre, filosof — skrev i <em>Meditationer</em>: <em>"You have power over your mind — not outside events. Realize this, and you will find strength."</em> Kejsare, slav, säljare. Samma verktyg.</p>
      <p><strong>Praktisk tillämpning:</strong> efter varje samtal, fråga: <em>"Vad var inom min kontroll?"</em> (min ton, mina frågor, min förberedelse) och <em>"Vad var utanför?"</em> (kundens situation, marknaden just nu, deras budget). Fokusera energi bara på den första kolumnen. Släpp den andra.</p>

      <h3>Ramverk 2: Kognitiv reframing — välj din tolkning medvetet</h3>
      <p>Aaron Beck, grundaren av kognitiv terapi, visade på 1960-talet att det inte är händelsen som skapar känslan — det är <strong>tolkningen</strong> av händelsen. Samma händelse, två tolkningar, två helt olika verkligheter.</p>
      <p>Reframing är medveten omtolkning. Inte naivt positivt tänkande — strategisk omramning av data.</p>
      <p><strong>Före vs efter:</strong></p>
      <ul>
        <li>❌ "Jag fick nej." → ✅ "Jag lärde mig något, kom närmare ett ja, och nu vet jag vilka objektioner den här produkttypen triggar."</li>
        <li>❌ "Det var en jättedålig månad." → ✅ "Jag har nu färsk data på vad som inte fungerar — och kan justera på en gång."</li>
        <li>❌ "Kunden var otrevlig." → ✅ "Det handlade om hens dag, inte mig. Intressant — jag undrar vad som pågår där."</li>
        <li>❌ "Jag är dålig på förhandling." → ✅ "Jag har inte tränat det här specifikt än. Jag tränar det här veckan."</li>
      </ul>
      <p>Byron Katie: <em>"When I argue with reality, I lose. But only 100% of the time."</em> Verkligheten är den. Din tolkning bestämmer vad den är <em>för dig</em>.</p>

      <h3>Ramverk 3: Visualisering — mental repetition</h3>
      <p>Neurovetenskapen är tydlig: hjärnan skiljer knappt på att faktiskt göra något och att livligt föreställa sig göra det. Elitidrottare (Michael Phelps visualiserade varje simtag dagen före OS) och Navy SEALs använder tekniken systematiskt för att reducera prestationsångest.</p>
      <p><strong>För säljare:</strong></p>
      <ol>
        <li>30 sekunder före ett svårt samtal: blunda.</li>
        <li>Visualisera din röst — lugn, varm, säker.</li>
        <li>Föreställ dig kundens tuffa invändning. Hör hur du svarar.</li>
        <li>Se slutet av samtalet: du har bokat mötet, kunden är positiv, du tackar.</li>
        <li>Öppna ögonen. Ring.</li>
      </ol>
      <p>Första gången känns det töntigt. Gör det 30 dagar — du kommer märka skillnaden i hur samtalet faktiskt utvecklas.</p>

      <h3>Ramverk 4: Box breathing (Navy SEALs)</h3>
      <p>När pulsen stiger, amygdalan tar över, prefrontal cortex dämpas — du tänker inte längre strategiskt. Navy SEALs lär sig en teknik för att återta kontroll på 60 sekunder:</p>
      <ul>
        <li>Andas in 4 sekunder.</li>
        <li>Håll 4 sekunder.</li>
        <li>Andas ut 4 sekunder.</li>
        <li>Håll 4 sekunder.</li>
        <li>Upprepa 4 gånger.</li>
      </ul>
      <p>Resultat: puls ner, parasympatiska nervsystemet aktiveras, hjärnan tillgänglig igen. Använd innan ett svårt samtal, efter en hård invändning, när kvartalet hänger på nästa möte.</p>

      <h3>Ramverk 5: 40%-regeln (David Goggins / Navy SEALs)</h3>
      <p>När din hjärna säger "jag är klar, jag orkar inte mer" — är du i själva verket på 40% av din faktiska kapacitet. Hjärnan har en inbyggd skyddsmekanism som drar i handbromsen långt innan du fysiskt/mentalt är tömd.</p>
      <p>Praktisk tillämpning: när du "inte orkar ett samtal till" — ring två till. När "dagen är över" kl 14:30 — kör till 16:00 med fullt fokus. Kapaciteten finns. Du har bara tränat dig själv att stanna vid 40%.</p>

      <h3>Ramverk 6: Flow — det bästa tillståndet du kan försätta dig i</h3>
      <p>Mihaly Csikszentmihalyi (uttalas Cheek-sent-mi-high-ee) — ungersk-amerikansk psykolog — identifierade <em>flow</em> som det tillstånd där du presterar maximalt och tiden försvinner. Villkor för att nå flow:</p>
      <ul>
        <li><strong>Tydligt mål</strong> — du vet exakt vad du försöker uppnå.</li>
        <li><strong>Omedelbar feedback</strong> — du ser direkt om det går åt rätt håll.</li>
        <li><strong>Balans utmaning/kompetens</strong> — tillräckligt svårt för att engagera, tillräckligt nåbart för att inte lamslå.</li>
        <li><strong>Inga avbrott</strong> — djupt fokus utan notifikationer, interruptions.</li>
      </ul>
      <p>När kommer säljare in i flow? När de ringer i 90 minuter utan avbrott med tydligt dagsmål (t.ex. "10 nya möten bokade"). Inte när de multitaskar mellan mejl, CRM och Slack.</p>

      <h3>Live-scenarier</h3>
      <p><strong>Scenario 1 — du får en hård invändning som triggar dig:</strong></p>
      <ul>
        <li>❌ FEL: Reagera defensivt. Försvara. Pressa.</li>
        <li>✅ RÄTT: 3 sekunders tystnad. Box breathing internt. <em>"Berätta mer — vad är det som gör att det känns så?"</em> Du öppnar istället för att stänga.</li>
      </ul>
      <p><strong>Scenario 2 — dålig månad, oro för kvotsamtal på fredag:</strong></p>
      <ul>
        <li>❌ FEL: Spiral av "jag är dålig, jag kommer sparkas, familjen blir besviken".</li>
        <li>✅ RÄTT: Lista: "Vad är inom min kontroll de kommande 4 dagarna?" 3 svar: antal samtal, kvalitet på förberedelse, tonläge. Agera bara på det. Resten släpps.</li>
      </ul>
      <p><strong>Scenario 3 — en toppsäljarkollega firar stor affär, du känner avund:</strong></p>
      <ul>
        <li>❌ FEL: Jämför dig. Känn att du är dålig.</li>
        <li>✅ RÄTT: Reframe: "Bevis att det är möjligt. Vad gör hen annorlunda som jag kan lära?" Avund är information — gå till gym, inte i hål.</li>
      </ul>

      <h3>Dagliga ritualer för säljarens mentala styrka</h3>
      <ul>
        <li><strong>Morgon (5 min):</strong> dagens 3 aktiviteter som är inom din kontroll. Skriv ner dem. Klocka 09:00 är du igång.</li>
        <li><strong>Före varje svårt samtal (30 sek):</strong> visualisering + 4 box breaths.</li>
        <li><strong>Efter varje nej (2 min):</strong> 1 fråga: "Vad lärde jag mig?" Skriv i CRM-noten.</li>
        <li><strong>Kväll (5 min):</strong> reflektion. Vad gick bra? Vad lärde jag mig? Vad släpper jag nu så jag kan sova?</li>
      </ul>

      <h3>De tre vanligaste mentala misstagen</h3>
      <ol>
        <li><strong>Koppla identitet till resultat.</strong> "Jag är en dålig säljare eftersom den här månaden gick dåligt." Du är inte din månad. Du är din process.</li>
        <li><strong>Isolering efter motgång.</strong> Dåliga veckor får folk att dra sig undan. Exakt tvärtom behövs — ring en kollega, en chef, en vän som förstår yrket. Ensamhet förstärker negativt tänkande exponentiellt.</li>
        <li><strong>Låta "dagsformen" styra.</strong> "Idag känner jag inte för att ringa." Ingen topp-säljare väntar på att känna sig redo. De ringer — och formen kommer under tiden.</li>
      </ol>

      <h3>Handling: kör det här idag</h3>
      <ol>
        <li><strong>Morgon:</strong> skriv 3 aktiviteter inom din kontroll idag. Bara inom.</li>
        <li><strong>Före ditt svåraste samtal:</strong> 4 rundor box breathing + 30 sekunders visualisering.</li>
        <li><strong>Efter nästa nej:</strong> fråga högt för dig själv — "vad lärde jag mig?" — och skriv svaret.</li>
        <li><strong>Om du känner spiralen:</strong> reframe en tanke medvetet. Skriv den både som ❌ och ✅.</li>
        <li><strong>Kväll:</strong> 5 min reflektion. Klocka den. Sömnen blir bättre också.</li>
      </ol>

      <h3>24-timmarsövningen</h3>
      <p>Imorgon: öva den mest obehagliga delen av dagen medvetet. Det svåraste samtalet. Den kund du undviker att ringa. Det mejl du skjutit upp. Gör det <strong>först</strong>. Före allt annat. Innan mejl, Slack, kaffe.</p>
      <p>När det är gjort, lägg märke till: resten av dagen känns lättare. Varenda gång. Det är hur du bygger mental styrka — genom att göra det svåra innan du är redo, tills "inte redo" inte längre är ett alternativ.</p>

      <h3>Sammanfattning — fem punkter</h3>
      <ul>
        <li>Sälj är ett yrke där du får nej för att leva. Acceptera — och bygg rustning.</li>
        <li>Stoicismens kontroll-distinktion: fokusera bara på det du kontrollerar. Resten släpps.</li>
        <li>Reframe tolkningar medvetet. Samma händelse, två realiteter — du väljer.</li>
        <li>Visualisering + box breathing + 40%-regeln — konkreta verktyg, bevisade i elitidrott och militär.</li>
        <li>Isolera aldrig efter motgång. Dagsformen är inte en chef — det är en signal.</li>
      </ul>
    `,
    quiz: [
      { q: 'Vad är den huvudsakliga skillnaden mellan toppsäljare och mediokra säljare?', options: ['Produktkunskap', 'Mental styrka och hantering av motgångar', 'Antal år i branschen', 'Utbildningsnivå'], answer: 1 },
      { q: 'Vad fokuserar stoicismen på i säljkontext?', options: ['Att alltid vara positiv', 'Att fokusera energi på det du kontrollerar och acceptera det du inte gör', 'Att undvika alla konflikter', 'Att alltid leverera mer än förväntat'], answer: 1 },
      { q: 'Vad är cognitiv reframing?', options: ['Att ignorera negativa händelser', 'Att medvetet välja hur du tolkar en händelse', 'Att ljuga för sig själv om resultaten', 'En typ av medicinsk terapi'], answer: 1 },
      { q: 'Varför använder elitidrottare visualisering?', options: ['Det är ett superstition', 'Hjärnan kan inte fullt skilja på levande föreställda och verkliga händelser', 'Det är ett modernt trendigt verktyg', 'Det minskar träningsbehovet'], answer: 1 },
      { q: 'Vad är flow-tillståndet?', options: ['Att arbeta snabbt', 'Djup koncentration där utmaning matchar kompetens', 'Att vara stressfri', 'Att arbeta utan pauser'], answer: 1 },
      { q: 'Vad händer när utmaningen är för låg jämfört med kompetensen?', options: ['Flow uppstår', 'Ångest uppstår', 'Tristess uppstår', 'Prestation ökar'], answer: 2 },
      { q: 'Hur omvandlar du negativa upplevelser till lärande?', options: ['Ignorera dem', 'Daglig reflektion: vad gick bra, vad lärde jag mig', 'Prata med en terapeut', 'Fokusera på nästa mål direkt'], answer: 1 },
      { q: 'Vad bör du fira för att bygga resiliens?', options: ['Bara stora affärer', 'Aktiviteter och insatser — inte bara resultat', 'Resultat som överstiger kvoten', 'Ingenting — fira förminskar ambitionen'], answer: 1 },
      { q: 'Vad är stoicismens grundprincip om kontroll?', options: ['Du kan kontrollera allt med tillräcklig vilja', 'Du kontrollerar dina handlingar och tankar — inte yttre resultat', 'Resultat är viktigast att fokusera på', 'Kontroll är en illusion'], answer: 1 },
      { q: 'Vem identifierade flow-tillståndet?', options: ['Viktor Frankl', 'Marcus Aurelius', 'Mihaly Csikszentmihalyi', 'Martin Seligman'], answer: 2 },
    ],
  },

  // ── 17. AI som Säljverktyg ─────────────────────────────────────────────────
  {
    id: 'ai-saljverktyg',
    title: 'AI som Säljverktyg',
    subtitle: 'Förstärk din prestation — utan att tappa det mänskliga',
    icon: '🤖',
    gradient: 'linear-gradient(135deg, #0891b2, #0e7490)',
    color: '#0891b2',
    youtubeId: null, // Byt till riktigt YouTube-ID när Joakims video är inspelad
    teaser: `
      <h3>AI är inte hotet — felanvänd AI är det</h3>
      <p>2026 använder nästan alla säljare AI på något sätt. Skillnaden mellan toppsäljaren och medelmåttan är inte <em>om</em> de använder AI — utan <em>hur</em>. Rätt använd blir AI din research-assistent, din sparringpartner och din copywriter. Felanvänd förstör den din trovärdighet på sekunder.</p>
      <p>Det här blocket ger dig principerna — inte verktygen. Verktygen byts ut. Principerna består.</p>
    `,
    theory: `
      <h3>Säljarens nya verklighet</h3>
      <p>På tre år har AI gått från gimmick till grundförutsättning. En säljare som 2026 fortfarande skriver varje mejl från noll, researchar varje prospekt manuellt och förbereder varje samtal utan hjälp — jobbar inte hårdare, utan långsammare. Du har 40 timmar i veckan. Använder du dem smart?</p>
      <p>Men här är paradoxen: ju mer AI-genererat innehåll som flödar genom LinkedIn-inkorgar och kundmejl, desto mer värdefull blir <strong>äkta mänsklig kontakt</strong>. AI gör ditt förarbete snabbare — men det som faktiskt säljer (förtroende, empati, nyfikenhet) kan AI inte ersätta. Säljaren som förstår båda sidorna vinner.</p>

      <h3>De fyra sätt AI gör dig bättre</h3>
      <ol>
        <li><strong>Research-assistent</strong> — förbered möten på minuter, inte timmar.</li>
        <li><strong>Sparringpartner</strong> — öva invändningar, rollspel och pitchar i privat läge.</li>
        <li><strong>Copywriter</strong> — snabba utkast på mejl, LinkedIn-meddelanden och uppföljningar.</li>
        <li><strong>Analytiker</strong> — sammanfatta samtal, hitta mönster, identifiera nästa steg.</li>
      </ol>
      <p>Fokusera på dessa fyra. Undvik frestelsen att automatisera allt — det första intrycket är för dyrbart för att lämna till en bot.</p>

      <h3>1. AI som research-assistent</h3>
      <p>Innan ett möte med ett företag du inte känner: ge AI namnet, deras bransch, deras roll. Fråga: <em>"Vilka är deras största utmaningar 2026? Vilka trender påverkar deras bransch? Vad pratas det om i deras värld just nu?"</em></p>
      <p>Du får en 80%-bild på 3 minuter. Verifiera kritiska fakta innan du citerar dem, men grundförståelsen ger dig en försprång jämfört med säljaren som googlar manuellt.</p>
      <p><strong>Exempel-prompt:</strong> <em>"Jag har ett möte med en ekonomichef på ett medelstort tillverkningsföretag. Vad är de tre vanligaste smärtpunkterna för deras roll just nu, och vad bör jag undvika att säga?"</em></p>

      <h3>2. AI som sparringpartner — rollspel utan att någon ser</h3>
      <p>Det här är troligen AI:s mest underutnyttjade funktion för säljare. Du kan öva ett svårt samtal, en tuff invändning eller en förhandling — i ett privat, omdömesfritt rum. Ingen ser. Inget ego står på spel.</p>
      <p><strong>Exempel-prompt:</strong> <em>"Du är en skeptisk inköpschef som just fått min offert. Den är 20% dyrare än konkurrenten. Spela den rollen och ställ de invändningar du faktiskt skulle ha. Var hård men realistisk. Ge mig inte rätt förrän jag verkligen övertygar dig."</em></p>
      <p>Kör scenariot 3 gånger. När du möter invändningen på riktigt har du redan sagt svaret fem gånger. Det syns.</p>

      <h3>3. AI som copywriter — utkastet, inte slutversionen</h3>
      <p>AI är bra på 80% av ett mejl. De sista 20% — tonen, specifika observationer, ditt eget uttryck — måste komma från dig. Annars känns det platt och generiskt, och mottagaren märker det direkt.</p>
      <p><strong>Rätt arbetsflöde:</strong></p>
      <ul>
        <li>Be AI om ett utkast med tydliga instruktioner: syfte, målgrupp, ton, längd.</li>
        <li>Redigera: ta bort klichéer, tillför en specifik observation om mottagaren, förkorta.</li>
        <li>Läs högt — låter det som du? Om inte, skriv om.</li>
      </ul>
      <p><strong>Varningstecken att AI skrev mejlet:</strong> ord som "leverage", "in today's dynamic landscape", "I hope this message finds you well", "I wanted to reach out". Ingen skriver så på riktigt. Kunden märker och avfärdar.</p>

      <h3>4. AI som analytiker — efter mötet</h3>
      <p>Efter ett kundsamtal: mata in dina anteckningar eller transkriberingen. Fråga: <em>"Vilka köpsignaler gav kunden? Vilka invändningar kom upp som jag inte svarade bra på? Vad är nästa logiska steg? Skriv en uppföljningsmejl baserat på det som faktiskt sades."</em></p>
      <p>Det omvandlar ett möte till lärdom + uppföljning på minuter istället för att det glöms bort i morgondagens brådska.</p>

      <h3>Konsten att fråga — prompt engineering för säljare</h3>
      <p>Kvaliteten på AI:s svar beror 90% på kvaliteten på din fråga. En vag fråga ger ett vagt svar. Bygg dina prompts på fyra delar:</p>
      <ol>
        <li><strong>Roll</strong> — "Du är en erfaren B2B-säljare med 20 års erfarenhet i tech."</li>
        <li><strong>Uppgift</strong> — "Skriv en uppföljningsmejl efter ett första möte där kunden visade intresse men var orolig för implementeringstiden."</li>
        <li><strong>Kontext</strong> — "Kunden heter Anna, är IT-chef, nämnde att deras förra leverantör misslyckades med leveransen. Vårt pris: 250 000 kr."</li>
        <li><strong>Ramar</strong> — "Max 120 ord. Vänlig men direkt ton. Avsluta med ett konkret nästa steg."</li>
      </ol>
      <p>Jämför med en ren fråga: <em>"Skriv ett uppföljningsmejl."</em> Första varianten ger något användbart. Andra ger slöseri.</p>

      <h3>De tre farliga fällorna</h3>
      <p>AI kan förstöra mer än det bygger om du hamnar i någon av dessa:</p>
      <ol>
        <li><strong>Bot-syndromet</strong> — du klistrar in AI-text oredigerad. Mottagaren känner direkt att det är genererat. Förtroendet dör i sekund ett.</li>
        <li><strong>Hallucinationer</strong> — AI hittar på statistik, citat eller fakta som låter rimliga. Citerar du något som AI hittade på i ett kundmöte — och kunden kollar upp det — är affären död.</li>
        <li><strong>Känslokyla i skala</strong> — AI kan massproducera personaliserade mejl. När alla gör det blir LinkedIn en öken av identisk-klingande meddelanden. Ironiskt nog vinner den som <em>inte</em> använder AI i första kontakten.</li>
      </ol>
      <p><strong>Regel:</strong> verifiera alla fakta innan du citerar dem. Redigera allt innan du skickar det. Personlig kontakt börjar aldrig med en AI-genererad första rad.</p>

      <h3>Etik, GDPR och kunddata</h3>
      <p>Det här är icke-förhandlingsbart — både juridiskt och moraliskt:</p>
      <ul>
        <li><strong>Dela aldrig kundens känsliga data</strong> med en publik AI-tjänst. Pris, strategi, personuppgifter, avtalstext — stannar inom godkända, företagsgranskade verktyg.</li>
        <li><strong>Transkribera aldrig möten utan samtycke</strong>. Svensk lag och GDPR är tydliga. Ett "okej att jag spelar in?" räcker i de flesta fall — men be om det.</li>
        <li><strong>Ljug aldrig om AI:s roll</strong>. Frågar kunden om du använder AI — svara ärligt. "Ja, för research och utkast — men tankarna och orden är mina."</li>
        <li><strong>Fejka aldrig mänsklig kontakt</strong>. En AI-bot som låtsas vara en människa är manipulation. Det är inte längre ett affärsverktyg — det är ett övergrepp på kundens förtroende.</li>
      </ul>

      <h3>EU AI Act — vad du som säljare behöver veta</h3>
      <p>EU AI Act gäller fullt ut från 2026. För säljare finns två praktiska konsekvenser:</p>
      <ul>
        <li><strong>Transparensskyldighet</strong> — om en kund interagerar med en AI (chatbot, AI-agent) måste det vara tydligt. Låtsas-människor är förbjudna.</li>
        <li><strong>Högriskbeslut</strong> — om AI används för att fatta beslut om kreditgivning, anställning eller andra rättsligt bindande beslut om en person, finns strikta dokumentationskrav.</li>
      </ul>
      <p>I den vanliga säljvardagen — research, utkast, sparring — är du på säker mark. Men vet var gränsen går.</p>

      <h3>Den mänskliga fördelen — det AI inte kan göra</h3>
      <p>Desto bättre AI blir på det tekniska, desto mer avgörande blir det mänskliga. AI kan inte:</p>
      <ul>
        <li>Läsa av en tveksam paus i kundens röst och veta att det finns en oläst invändning.</li>
        <li>Skapa genuin tillit genom sårbarhet, humor eller en delad erfarenhet.</li>
        <li>Ta en svår telefonsamtal med en besviken kund och rädda relationen.</li>
        <li>Känna när det är rätt att <em>inte</em> sälja — och istället bygga den långsiktiga relationen.</li>
      </ul>
      <p>Det är här toppsäljaren bor. AI gör grovjobbet. Du gör det som inte går att automatisera.</p>

      <h3>Framtiden: agentic AI och säljarens nya roll</h3>
      <p>2026 är vi inne i en övergång från AI som <em>verktyg du frågar</em> till AI som <em>agenter som utför uppgifter åt dig</em>. Agentic AI kan boka möten, researcha prospekts, skicka uppföljningar och uppdatera CRM — i bakgrunden, medan du gör det mänskliga.</p>
      <p>Det betyder att säljarens jobb förändras: mindre administration, mer kundkontakt. Mindre input-arbete, mer omdömesarbete. Den säljare som välkomnar det — och lär sig regissera sina AI-agenter som en producent — kommer kunna hantera 3x fler relationer än sin AI-ovan kollega.</p>

      <h3>Tre vanor som gör dig AI-kompetent på 30 dagar</h3>
      <ol>
        <li><strong>Dagligt rollspel (10 min)</strong> — öva en invändning eller ett svårt samtal med AI innan du möter det på riktigt.</li>
        <li><strong>Veckans mötesanalys</strong> — ta ett samtal per vecka, mata in anteckningarna, be AI identifiera vad du kunde gjort bättre.</li>
        <li><strong>Prompt-biblioteket</strong> — spara dina bästa prompts i en egen lista. Uppföljningsmejl, research, invändningshantering. Bygg ditt eget system som du kan återanvända.</li>
      </ol>
      <p>Kompetensen byggs på månader, inte dagar. Börja idag.</p>
    `,
    quiz: [
      { q: 'Vad är AI:s roll i modern sälj enligt blocket?', options: ['Ersätta säljaren helt', 'Förstärka säljaren — ta grovjobbet, så människan kan fokusera på det mänskliga', 'Hantera kundsamtal utan säljare', 'Skicka automatiska massmejl'], answer: 1 },
      { q: 'Vilka är de fyra huvudsakliga sätt AI gör en säljare bättre?', options: ['Ersättare, Chef, Coach, Dom', 'Research-assistent, Sparringpartner, Copywriter, Analytiker', 'Receptionist, Ekonom, Marknadsförare, Tekniker', 'Skribent, Designer, Utvecklare, Testare'], answer: 1 },
      { q: 'Vad är det största värdet av AI som sparringpartner?', options: ['Att få rätt svar direkt', 'Att öva svåra samtal och invändningar i ett omdömesfritt privat rum', 'Att slippa öva med kollegor', 'Att AI säger att du har rätt'], answer: 1 },
      { q: 'Vad är "bot-syndromet"?', options: ['När AI får fel svar', 'När man klistrar in oredigerad AI-text och mottagaren märker att det är genererat', 'När AI svarar för långsamt', 'När flera bots pratar med varandra'], answer: 1 },
      { q: 'Vad är en AI-hallucination i säljkontext?', options: ['En kreativ AI-idé', 'När AI hittar på statistik, citat eller fakta som låter rimliga men är felaktiga', 'En typ av prompt', 'Ett namn på en AI-modell'], answer: 1 },
      { q: 'Vilka är de fyra delarna i en bra säljprompt?', options: ['Hälsning, Frasering, Syfte, Tack', 'Roll, Uppgift, Kontext, Ramar', 'Produkt, Pris, Problem, Plan', 'Start, Mitt, Slut, Signatur'], answer: 1 },
      { q: 'Vad bör du ALDRIG göra med en kunds känsliga data?', options: ['Dela den med publika AI-tjänster', 'Skriva ner den i ditt CRM', 'Diskutera den internt', 'Använda den för att förbereda möten'], answer: 0 },
      { q: 'Vad kräver EU AI Act från 2026 gällande AI i kundkontakt?', options: ['Att all AI är svensk', 'Transparens — kunden måste veta när de pratar med en AI, inte en människa', 'Att AI aldrig får användas i sälj', 'Att alla AI-modeller måste vara öppen källkod'], answer: 1 },
      { q: 'Varför blir den mänskliga fördelen viktigare ju bättre AI blir?', options: ['Den blir inte viktigare', 'Äkta mänsklig kontakt, empati och nyfikenhet kan AI inte ersätta — och blir därför mer värdefullt', 'Det är bara en myt från AI-skeptiker', 'För att AI aldrig fungerar i sälj'], answer: 1 },
      { q: 'Vad är agentic AI?', options: ['En AI-agent på kontoret', 'AI som inte bara svarar på frågor utan utför uppgifter åt dig — bokar möten, researchar, följer upp', 'En AI som ersätter säljchefen', 'AI utvecklad specifikt för Sverige'], answer: 1 },
    ],
  },

  // ── 18. Fortsätt Studera — Rekommenderad Läsning ──────────────────────────
  {
    id: 'rekommenderad-lasning',
    title: 'Fortsätt Studera — Rekommenderad Läsning',
    subtitle: 'Böckerna som byggt världens bästa säljare',
    icon: '📚',
    gradient: 'linear-gradient(135deg, #b45309, #92400e)',
    color: '#b45309',
    youtubeId: null, // Byt till riktigt YouTube-ID när Joakims video är inspelad
    teaser: `
      <h3>Din utbildning slutar aldrig</h3>
      <p>Varje toppsäljare jag har mött har en sak gemensam: de läser. Böcker. Konstant. Inte för att det är en trend — utan för att konkurrensfördelen finns i kunskapen alla andra inte orkar skaffa.</p>
      <p>Det här blocket är en kurerad karta över de böcker som faktiskt förändrar hur du säljer, tänker och beter dig — sorterat på tema, utan fluff, utan författare du redan hört 100 gånger i svensk säljpress.</p>
    `,
    theory: `
      <h3>Varför läsa — i en värld av poddar och video?</h3>
      <p>En bok tvingar dig att sakta ner. Att tänka. Att notera. En podd glider förbi — en bok stannar. Warren Buffett läser 5–6 timmar om dagen. Naval Ravikant säger "den verkliga utdelningen i livet kommer från att läsa." Det är ingen slump.</p>
      <p>För en säljare är en bra bok den billigaste coachningen som finns. För 200 kr får du 20+ års tänkande från någon som lyckades. Ingen enskild kurs slår det.</p>

      <h3>Hur du läser en sälj- eller psykologibok</h3>
      <ul>
        <li><strong>Markera aggressivt</strong> — stryk under, fäll hörn, skriv i marginalen. Boken är ett arbetsredskap, inte ett museiföremål.</li>
        <li><strong>Testa en idé per bok</strong> — läsa utan att tillämpa är underhållning. Välj en teknik från boken och testa den i nästa kundsamtal.</li>
        <li><strong>Läs om dina fem favoriter</strong> — en gång räcker sällan. De verkligt bra böckerna läser du om vartannat år.</li>
        <li><strong>Bygg ett eget anteckningssystem</strong> — en enda sida per bok med de tre viktigaste lärdomarna. Efter 50 böcker har du en egen playbook.</li>
      </ul>

      <h3>📕 Sälj & Förhandling — grunden i yrket</h3>
      <ul>
        <li><strong>Chris Voss — <em>Never Split the Difference</em></strong><br>
        FBI:s chefs-gisslanförhandlare skriver den mest användbara förhandlingsbok som finns. Tactical empathy, mirroring, labeling, "det stämmer". Läs den två gånger. Tillämpa första gången efter första kapitlet.</li>

        <li><strong>Neil Rackham — <em>SPIN Selling</em></strong><br>
        Den vetenskapliga grunden för behovsanalys i komplexa affärer. SPIN (Situation, Problem, Implikation, Need-Payoff) är inte en säljteknik — det är ett frågerame-verk som faktiskt forskningsstöds.</li>

        <li><strong>Matthew Dixon &amp; Brent Adamson — <em>The Challenger Sale</em></strong><br>
        CEB:s forskning på tusentals B2B-säljare avslöjade att den bästa säljartypen inte är "relationship builder" — utan "challenger". Läs den om du jobbar i komplex B2B.</li>

        <li><strong>Daniel H. Pink — <em>To Sell is Human</em></strong><br>
        En modern, forskningsbaserad omformulering av vad sälj är. Kortare än klassikerna, mer aktuell. Bra ingång för den som är skeptisk mot traditionell säljlitteratur.</li>

        <li><strong>Oren Klaff — <em>Pitch Anything</em></strong><br>
        Klaffs STRONG-metod utmanar hur du presenterar. Kaxig stil, men insikterna om frame control och status är guld värda för alla som behöver pitcha.</li>

        <li><strong>Jeb Blount — <em>Fanatical Prospecting</em></strong><br>
        Den rakaste, mest praktiska boken om prospektering som finns. Ingen mystik — bara disciplinen att göra det andra undviker. Läses över en helg.</li>
      </ul>

      <h3>🧠 Psykologi & Påverkan — varför människor gör som de gör</h3>
      <ul>
        <li><strong>Robert Cialdini — <em>Influence: The Psychology of Persuasion</em></strong><br>
        Den viktigaste bok som skrivits om påverkan. Cialdinis sex principer (ömsesidighet, commitment, social proof, auktoritet, gillande, knapphet) är ABC:n för varje säljare. Hoppa aldrig över den.</li>

        <li><strong>Robert Cialdini — <em>Pre-Suasion</em></strong><br>
        Uppföljaren. Handlar om det som händer <em>innan</em> själva påverkansmomentet — hur du förbereder sinnet. Minst lika viktig som <em>Influence</em>, men färre har läst den.</li>

        <li><strong>Daniel Kahneman — <em>Thinking, Fast and Slow</em></strong><br>
        Nobelpristagaren som förklarade hur vi faktiskt fattar beslut. System 1 (snabbt, emotionellt) och System 2 (långsamt, logiskt). Varje invändning och varje köp är antingen eller båda. Tung men fundamental.</li>

        <li><strong>Dale Carnegie — <em>How to Win Friends and Influence People</em></strong><br>
        Skriven 1936, fortfarande relevant. Ålderdomliga exempel, tidlösa principer. Läses som en referensbok, inte rakt av.</li>

        <li><strong>Dan Ariely — <em>Predictably Irrational</em></strong><br>
        Beteendeekonomi för den som vill förstå varför kunden väljer den dyrare produkten när det finns en "decoy" bredvid. Perfekt komplement till Kahneman.</li>
      </ul>

      <h3>⚡ Vanor, Disciplin & Produktivitet — hur du orkar</h3>
      <ul>
        <li><strong>James Clear — <em>Atomic Habits</em></strong><br>
        Den mest användbara boken om beteendeförändring som skrivits. Små, systematiska förbättringar slår stora beslut. Om du bara läser en bok på den här listan — börja här.</li>

        <li><strong>Charles Duhigg — <em>The Power of Habit</em></strong><br>
        Forskningen bakom <em>hur</em> vanor bildas. Cue–Routine–Reward. Komplement till Clear — mer berättelse, mindre handbok.</li>

        <li><strong>Cal Newport — <em>Deep Work</em></strong><br>
        I en värld av notifikationer är förmågan till djup koncentration den verkliga superkraften. Säljare som skyddar sina "deep work"-timmar stänger fler affärer. Punkt.</li>

        <li><strong>Cal Newport — <em>So Good They Can't Ignore You</em></strong><br>
        Utmanar "följ din passion" och föreslår istället: bli så bra att de inte kan ignorera dig. Kompetens föregår passion.</li>

        <li><strong>Greg McKeown — <em>Essentialism</em></strong><br>
        Konsten att göra mindre, men bättre. Tonårsfri bok som passar en säljare som lider av "för mycket att göra, för lite som rör sig."</li>
      </ul>

      <h3>🗿 Mindset, Stoicism & Resiliens — det mentala spelet</h3>
      <ul>
        <li><strong>Ryan Holiday — <em>The Obstacle Is the Way</em></strong><br>
        Stoicism applicerad på moderna utmaningar. Hindret är inte i vägen — det ÄR vägen. För säljaren som tar många nej i veckan är den här boken närmast obligatorisk.</li>

        <li><strong>Ryan Holiday — <em>Ego is the Enemy</em></strong><br>
        Det är inte bristande talang som stoppar de flesta — det är egot. Relevant för varje säljare som precis landat en stor affär och börjar tro att han är oövervinnlig.</li>

        <li><strong>Viktor Frankl — <em>Man's Search for Meaning</em></strong><br>
        Psykologen som överlevde Auschwitz och skrev den starkaste bok om mänsklig resiliens som finns. Sätter ett dåligt säljmöte i perspektiv.</li>

        <li><strong>Marcus Aurelius — <em>Meditations</em></strong><br>
        En romersk kejsares privata dagbok. 2000 år senare är det fortfarande den bästa manualen för att styra sin egen inre dialog. Läs 5 minuter per dag.</li>
      </ul>

      <h3>💼 Business & Tänkande i stor skala — för den som vill mer</h3>
      <ul>
        <li><strong>Peter Thiel — <em>Zero to One</em></strong><br>
        För säljaren som arbetar i tech eller SaaS: förstå hur företagen du säljer till faktiskt tänker. Monopol, differentiering, "kontraintuitiva sanningar".</li>

        <li><strong>Ben Horowitz — <em>The Hard Thing About Hard Things</em></strong><br>
        Hur det verkligen är att bygga och leda — utan PR-polish. Hjälper dig förstå vad dina kundchefers-kunder faktiskt går igenom.</li>

        <li><strong>Simon Sinek — <em>Start with Why</em></strong><br>
        Varför människor köper inte vad du gör — utan varför du gör det. Enkelt budskap, kraftfull tillämpning i pitch och branding.</li>
      </ul>

      <h3>Börja här — om du bara läser tre böcker 2026</h3>
      <ol>
        <li><strong>Cialdini — Influence</strong> (grunden i påverkan)</li>
        <li><strong>Voss — Never Split the Difference</strong> (förhandling som fungerar i verkligheten)</li>
        <li><strong>Clear — Atomic Habits</strong> (hur du faktiskt förändrar ditt beteende)</li>
      </ol>
      <p>De tre tillsammans är bättre än de flesta säljkurser för 50 000 kr. Investera 600 kr, 30 timmars läsning och 5 års tillämpning.</p>

      <h3>Ett sista ord om att läsa</h3>
      <p>Många samlar böcker som trofé — olästa, imponerande i hyllan. Det bygger inget. En <em>läst</em> bok där du tillämpade <em>en enda idé</em> slår hundra oupplästa. Välj färre böcker. Tillämpa mer. Läs om de bästa. Det är så du faktiskt bygger en karriär som säljare.</p>
    `,
    quiz: [
      { q: 'Vem skrev "Never Split the Difference"?', options: ['Robert Cialdini', 'Chris Voss', 'James Clear', 'Neil Rackham'], answer: 1 },
      { q: 'Vilken bok handlar om sex principer för påverkan (ömsesidighet, social proof, auktoritet m.fl.)?', options: ['Thinking, Fast and Slow', 'Influence av Robert Cialdini', 'Atomic Habits', 'SPIN Selling'], answer: 1 },
      { q: 'Vad står SPIN för i Neil Rackhams bok?', options: ['Sales, Pitch, Intro, Need', 'Situation, Problem, Implikation, Need-Payoff', 'Strategy, Power, Influence, Negotiation', 'Solution, Product, Intro, Next'], answer: 1 },
      { q: 'Vilken bok är den mest rekommenderade om beteendeförändring och vanor?', options: ['Deep Work', 'Atomic Habits av James Clear', 'The Power of Habit av Duhigg', 'Meditations av Marcus Aurelius'], answer: 1 },
      { q: 'Vad introducerar Daniel Kahneman i "Thinking, Fast and Slow"?', options: ['SPIN-modellen', 'System 1 och System 2 — två sätt hjärnan fattar beslut', 'De sex påverkansprinciperna', 'Challenger-metoden'], answer: 1 },
      { q: 'Vem skrev "The Obstacle Is the Way" — en modern tolkning av stoicism?', options: ['Viktor Frankl', 'Ryan Holiday', 'Cal Newport', 'Simon Sinek'], answer: 1 },
      { q: 'Vad är huvudidén i Cal Newports "Deep Work"?', options: ['Arbeta mer och sova mindre', 'Djup koncentration är en superkraft i en distraherad värld', 'Multitasking är produktivitetens kung', 'Delegera allt arbete'], answer: 1 },
      { q: 'Vilken bok forskar fram att "Challenger" är den mest framgångsrika säljartypen i B2B?', options: ['To Sell is Human', 'The Challenger Sale', 'Fanatical Prospecting', 'Pitch Anything'], answer: 1 },
      { q: 'Vad är det bästa sättet att läsa en sälj- eller psykologibok enligt blocket?', options: ['Läs snabbt för att hinna fler böcker', 'Markera aggressivt, tillämpa en idé per bok, läs om dina favoriter', 'Undvik att skriva i boken — behåll den ny', 'Läs endast sammanfattningar'], answer: 1 },
      { q: 'Vilka tre böcker rekommenderas som bästa startpunkt 2026?', options: ["Meditations, Ego is the Enemy, Man's Search for Meaning", 'Influence, Never Split the Difference, Atomic Habits', 'Zero to One, Deep Work, Essentialism', 'SPIN Selling, To Sell is Human, Pitch Anything'], answer: 1 },
    ],
  },

];

// Merge practice data from blockPractice.js into blocks.
// Inline fields (if a block has its own roleplays etc) take precedence over the merge.
for (const block of blocks) {
  const pd = practiceData[block.id];
  if (!pd) continue;
  if (!block.quickVersion && pd.quickVersion) block.quickVersion = pd.quickVersion;
  if (!block.roleplays   && pd.roleplays)   block.roleplays   = pd.roleplays;
  if (!block.mission     && pd.mission)     block.mission     = pd.mission;
  if (!block.reflections && pd.reflections) block.reflections = pd.reflections;
}

module.exports = blocks;
