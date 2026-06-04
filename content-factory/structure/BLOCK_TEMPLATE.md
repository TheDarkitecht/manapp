# BLOCK_TEMPLATE — kanonisk struktur för alla block

Varje block i Sales Academy ska följa denna struktur. Inget block är "klart" förrän alla sektioner finns. Använd det här som checklista vid skrivning eller utbyggnad.

## Sektion 0: Metadata (för salesContent.js)

```javascript
{
  id: '<block-id>',                // unik, kebab-case, oförändrad efter publicering
  title: '<Block-titel>',
  subtitle: '<En rad — varför blocket finns>',
  outcomeTitle: '<Lärandemål formulerat som färdighet>',
  tldr: '<3-4 meningar — vad användaren KAN efter blocket>',
  concreteScripts: ['<replik 1>', '<replik 2>'],  // exakta repliker att kopiera
  icon: '<emoji>',
  gradient: '<CSS-gradient>',
  color: '<hex>',
  youtubeId: '<id eller null>',    // sätt när video är inspelad
  ...
}
```

**outcomeTitle**: ska vara aktiv färdighet, inte abstrakt mål.
- ✅ "Få kunder att förstå det du vill när du pratar"
- ❌ "Förstå tonfall"

**tldr**: skrivs så att en användare som läser bara den kan förklara blocket för en kollega på 30 sekunder.

**concreteScripts**: 2-3 ord-för-ord-repliker som är blockets kärna. Det är vad användaren faktiskt kommer kopiera.

## Sektion 1: Teaser (HTML, kort)

```html
<h3>[En kort, slagkraftig rubrik]</h3>
<p>[1-2 stycken som hookar — varför du ska läsa detta block. Ingen pitch om premium, bara kunskaps-värdet.]</p>
```

Mål: nyfikenhet + tydligt löfte. Max 100 ord.

## Sektion 2: Theory (HTML, lång)

Detta är blockets huvudinnehåll. Följande sub-sektioner är obligatoriska:

### 2a. Kärnan — vad blocket egentligen handlar om
1-2 stycken som ramar in begreppet. Inkludera:
- Den kontroversiella eller motintuitiva sanningen blocket bygger på
- Varför detta block existerar (vilken miss det rättar)

### 2b. Varför detta är viktigt 2026
- Marknadens kontext just nu (kunden googlar 60% av köpresan, etc.)
- Den moderna säljaren-utmaningen detta löser

### 2c. Ramverk eller modell
- 2-5 punkts-ramverk (de "X principerna i Y") som bär hela blocket
- Varje punkt 2-5 meningar

### 2d. Konkreta exempel
**Minst 3 specifika scenarier**, inte generaliseringar:
- Exempel 1: ord-för-ord-replik
- Exempel 2: motexempel (vad fungerar inte och varför)
- Exempel 3: nyans (när standard-tekniken bryts)

### 2e. Joakim-case
**Obligatoriskt: en personlig story från Joakims karriär** som gör abstrakta ramverk konkreta. Helst inkluderar siffror (kontraktsstorlek, månader, %), specifika kunder (utan namn), och det misslyckande/lärande som föregick.

Exempel-mönster (från Block 2): "Allt var på plats. Och då kom frågan: 'Har ni ISO-XXX?' Jag svarade lugnt: 'Bra fråga — vad tänker du på då?' Det här tog mig 24 timmar..."

### 2f. Vanliga misstag
3-5 specifika fallgropar med "❌ FEL: ... ✅ RÄTT: ..." -formatering.

### 2g. Den etiska gränsen (där relevant)
För block med kraftfulla tekniker (4 Tonfall, 10 Invändningar, 17 Förhandling): vad är gränsen mellan användning och manipulation?

### 2h. "Lagen om det familjära"-varning (där relevant)
För avancerade block: påminnelse om att igenkänning ≠ kunna. Användaren ska faktiskt träna det de just läste.

### 2i. Sammanfattning — 5 punkter
Bullet-list. 5 rader. Det användaren skulle ta med i mobilkalendern som påminnelser.

## Sektion 3: Quiz (15 frågor)

```javascript
quiz: [
  // 5 EASY — direkt återgivning av begrepp
  { q: '...', options: [...], answer: N, difficulty: 'easy', explanation: '...' },
  // 5 MEDIUM — applicering av ramverk i scenario
  { q: '...', options: [...], answer: N, difficulty: 'medium', explanation: '...' },
  // 5 HARD — synthes / etisk nyans / motbedömning
  { q: '...', options: [...], answer: N, difficulty: 'hard', explanation: '...', source: '...' },
]
```

**Förklaring per fråga**: 2-4 meningar (varför rätt svar, var i theory det ligger, varför vanliga felval är vanliga).

**Source** (valfritt, främst hard): "Voss 2016, kap 5" eller "Joakims operativa erfarenhet" eller "Cialdini 1984".

## Sektion 4: Quick version

```javascript
quickVersion: {
  essence: [
    '<3-punkts-sammanfattning av blockets kärna>',
    '<...>',
    '<...>',
  ],
  keyTechnique: '<Den enskilt viktigaste tekniken — kopierbar replik om möjligt>',
  microAction: '<Görbart inom 10 minuter, inget förberedelse, mätbart>',
}
```

**microAction-test**: kan användaren göra det här på sin mobil i kassakön på Coop? Då är det rätt format.

## Sektion 5: Roleplays (4 st, en per svårighetsnivå)

```javascript
roleplays: [
  // 1. BEGINNER (Lätt)
  {
    id: 'rp-<block-id>-<scenario>-easy',
    title: '...',
    difficulty: 'Lätt',
    icon: '...',
    goal: '...',                    // vad ska säljaren göra konkret
    scenario: '...',                // 2-4 meningars setup
    customerPersona: '...',         // 5-8 meningar — kundens situation, mood, vad triggar dem att öppna upp/stänga ner
    successCriteria: ['...', '...', '...'],  // 3 mätbara kriterier
    failureSignals: ['...', '...'], // NYTT: vad indikerar att säljaren tappar
    coachRubric: {                  // NYTT: för riktig coaching
      pass: '...',
      needsWork: '...',
      fail: '...',
    },
    expectedDuration: '3-5 min',    // NYTT
    followUpDrill: '...',           // NYTT: mikro-drill om man fail:ade
    openingLine: '...',             // exakta första raden från kund
  },
  // 2. INTERMEDIATE (Medel) — samma struktur, snäppet svårare
  // 3. HARD (Svår) — pressade scenarier, multipla invändningar
  // 4. ANGRY/SKEPTICAL — kunden är arg, tidspressad eller fördomsfull mot säljare
]
```

**Krav**: minst en av roleplaysen ska ha en "angry/skeptical" customer som kräver de-eskalering innan säljet kan börja.

## Sektion 6: Mission (veckouppdrag i fält)

```javascript
mission: {
  title: '<Veckans uppdrag: ...>',
  weeklyGoal: <antal — t.ex. 5>,
  description: '<vad — 2-3 meningar>',
  steps: [
    '<konkret steg 1>',
    '<konkret steg 2>',
    '<konkret steg 3>',
    '<reflektionssteg>',
  ],
  trigger: '<När i fältet detta utlöses>',
  successMarker: '<Hur du vet att veckan var lyckad>',
}
```

**weeklyGoal**: alltid mätbart antal (5 samtal, 3 inspelningar, 1 uppgiftsinlämning).
**trigger**: ord-för-ord vad som ska få användaren att starta — inte "när du har tid".

## Sektion 7: Reflections (5 prompts)

```javascript
reflections: [
  '<Reflektion om blockets kärna — vad var nytt eller utmanade>',
  '<Reflektion om egen praktik — var har du tillämpat / inte tillämpat>',
  '<Reflektion om en konkret incident — minne eller observation>',
  '<Reflektion om framtidssyn — vad ska göras annorlunda>',
  '<Reflektion om commitment — vad lovar du dig själv>',
]
```

5 prompts, en per kategori. Användaren ska kunna skriva en mening till en sida per prompt.

## Sektion 8: Video scripts (3-8 st per block)

Per block, manus för 3-8 mikrovideos á 3-8 minuter.

Varje script följer Harvard DPI-681-format:
- **Hook** (10-20 sek) — slagkraftig öppning, helst en personlig öppning eller en kontroversiell observation
- **Core teaching** (1-3 min) — det viktigaste konceptet, klart formulerat
- **Real example** (60-90 sek) — Joakim-case eller specifikt scenario
- **Practical instruction** (30-60 sek) — gör så här
- **"Do this now" ending** (10-20 sek) — tydlig handling före nästa video eller mejl

Format: ord-för-ord-manus med pauser markerade som *[paus]*. Skrivs som talspråk, inte skriftspråk.

## Sektion 9: Övningar (utöver roleplays)

För varje block, åtminstone:

### 9a. Skriftliga övningar (2-3 st)
- Kort skrivuppgift — 1-2 stycken som svar på en konkret prompt.

### 9b. Tonality drill (1 st, 30-60 sek)
- En mikroövning där användaren läser en specifik replik i 3 olika tonfall + skriver vad effekten skulle vara.

### 9c. Objection drill (1 st, 1-2 min)
- En invändning som dyker upp i blockets fas + 3 svar att välja mellan + ord-för-ord-rätt-svar.

### 9d. Field assignment (1 st, kopplat till mission)
- Konkret göra-uppgift utanför plattformen.

### 9e. Reflection prompts (5 st, från Sektion 7)

## Sektion 10: Inlämningsuppgift (där relevant)

För 10-12 av 23 blocken finns en inlämningsuppgift kopplad till certifiering:

```javascript
submission: {
  type: 'text' | 'audio' | 'document' | 'link',
  title: '<vad ska lämnas in>',
  description: '<konkret vad användaren skapar>',
  rubric: { ... },                  // se COACHING_RUBRICS.md
  level: 'bronze' | 'silver' | 'gold',  // vilken cert-nivå denna uppgift kvalificerar för
  estimatedTime: '<minuter>',
}
```

Inte alla block har inlämning — bara de operativt mätbara.

## Sektion 11: Social-asset-extraktion

Per block, paket av:

- **10 TikTok/Reels-hooks** — 1-rader som öppnar en 30-90 sek video
- **5 LinkedIn-posts** — 5-12 rader, en stark POV per post
- **5 captions** — 1-3 rader för IG/FB
- **5 carousel-ideer** — 5-7-slides struktur
- **3 mejlnewsletter-ideer** — 1 rad rubrik + 2 rader sammanfattning

Detta är råmaterial för Joakims content-distribution. Kan auto-genereras från theory + Joakim-case via prompt-bibliotek.

## Redaktionell guideline (Joaki-rösten)

### Kärnvärden i texten
- **Direkt** — säg det, motivera det, vidare. Inga utfyllnader.
- **Operatör** — "jag har gjort det här", inte "forskning visar".
- **Anti-sycophancy** — säg vad som inte fungerar, inte bara vad som fungerar.
- **Personlig autenticitet** — Joakim har en biografi (17-årig tågstädare, 22+ år i sälj, 200+ MSEK, 1000+ tränade säljare). Använd den när det är relevant.
- **Etisk grund** — varje mäktig teknik kommer med påminnelse om gränsen mellan sälj och manipulation.

### Tonläge
- **Ödmjuk men auktoritär** — "Det jag har sett funkar" inte "Sätt det här i praktik så vinner du".
- **Konversationell** — kursen är skriven som om Joakim sitter mittemot dig, inte som en lärobok.
- **Utan emojis i brödtext** (emojis OK i UI: ikoner, gamification-badges).
- **Utan superlativer som "alltid", "aldrig", "världens bästa"** — gränsa upp.
- **Källor när sannings-claim** — "CEB/Gartner-forskning visar..." eller "i min erfarenhet på 22 år...".

### Format-konventioner
- HTML i `theory`-fält. Använd `<h3>` för rubriker, `<strong>` för betoning, `<em>` för replik-citat, `<ul>/<ol>` för listor, `<blockquote>` för Joaki-kärncitat.
- Replik-exempel ska vara på egen rad i `<em>` eller blockquote.
- Sektioner separeras med `<h3>`-rubriker, max 1 nivå djupt.
- Stycken är 2-5 meningar. Inga jätte-block-textmurar.

## Checklista — block är "klart" när:

- [ ] Metadata (id, title, subtitle, outcomeTitle, tldr, concreteScripts, icon, color)
- [ ] Teaser (1-2 stycken)
- [ ] Theory med alla 9 sub-sektioner (kärnan, varför 2026, ramverk, exempel, Joakim-case, vanliga misstag, etisk gräns där relevant, lagen-om-familjära där relevant, sammanfattning)
- [ ] 15 quiz-frågor (5+5+5) med förklaringar och difficulty-tag
- [ ] quickVersion (essence, keyTechnique, microAction)
- [ ] 4 roleplays (en per svårighetsnivå inkl. angry/skeptical) med rubric
- [ ] Mission med konkret weeklyGoal
- [ ] 5 reflection prompts
- [ ] 3-8 video scripts
- [ ] Skriftlig övning, tonality drill, objection drill
- [ ] Submission assignment (om blocket har en)
- [ ] Social-asset-paket (10 TikTok + 5 LinkedIn + 5 captions + 5 carousels + 3 mejl)
- [ ] Källor i theory där forsknings-claim finns
- [ ] Redaktionell granskning mot Joaki-rösten

När alla är ✅: blocket är på operatörsstandard.
