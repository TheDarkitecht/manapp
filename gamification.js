// gamification.js
// Premium prestations- och progressionssystem för säljutbildningen.
//
// Arkitekturprinciper:
// - Event-sourcing: XP/nivå/skills härleds från befintliga DB-tabeller + user_actions
// - Config-driven: alla regler i denna fil, inte i routes
// - Additive: inget muteras, bara nya rader läggs till
// - Derive state: computeUserStats() räknar ut allt on-demand
// - Decoupled: routes anropar bara logAction() eller computeUserStats()
//
// Kärnprincip: verklig handling > konsumtion. Real-world action ger 5–10x XP.

// ═════════════════════════════════════════════════════════════════════════════
// CONFIG — alla regler på ett ställe
// ═════════════════════════════════════════════════════════════════════════════

// XP per event-typ (från befintliga tabeller)
const XP_RULES = {
  // Konsumtion — låg XP (du ska inte kunna gaming det)
  theory_read:        5,   // per block (första gången), triggras av quiz-pass
  quiz_passed:        15,  // ≥70% på quiz
  quiz_high_score:    10,  // bonus för ≥90%

  // Aktiv träning — medium XP
  roleplay_completed: 25,  // minst 5 utbytes (validerat i DB)
  reflection_saved:   5,   // per reflektion, min 50 tecken (validerat)
  mission_started:    20,  // första gången mission startas för block

  // Real-world action — HÖGT XP (kärnan)
  mission_completed:  100, // mission slutförd med reflektion
  action_logged:      0,   // beror på kategori (se ACTION_CATEGORIES)

  // Mastery
  block_mastered:     150, // alla 4 steg klara för ett block

  // Streaks (daglig action-streak, inte inloggning)
  streak_3:           10,
  streak_7:           30,
  streak_14:          50,
  streak_30:          100,
};

// Action-kategorier för Loggboken — verkliga handlingar användaren loggar
const ACTION_CATEGORIES = [
  {
    id: 'cold_call',
    name: 'Prospekteringssamtal',
    icon: '📞',
    description: 'Utgående samtal till nya prospects',
    xpPerUnit: 2,
    xpMax: 40,         // max XP per logg (10 samtal = full poäng)
    skillDim: 'prospektering',
    needsCount: true,
  },
  {
    id: 'cold_email',
    name: 'Cold email',
    icon: '✉️',
    description: 'Kall utskick till nytt prospect',
    xpPerUnit: 1,
    xpMax: 20,
    skillDim: 'prospektering',
    needsCount: true,
  },
  {
    id: 'linkedin_post',
    name: 'LinkedIn-post',
    icon: '💼',
    description: 'Publicerat inlägg som bygger varumärket',
    xp: 30,
    skillDim: 'pitch',
  },
  {
    id: 'linkedin_dm',
    name: 'LinkedIn-kontakt',
    icon: '🤝',
    description: 'Personligt DM eller kommentar med värde',
    xp: 10,
    xpMax: 50,
    needsCount: true,
    xpPerUnit: 10,
    skillDim: 'prospektering',
  },
  {
    id: 'meeting_held',
    name: 'Kundmöte genomfört',
    icon: '📅',
    description: 'Fysiskt eller digitalt möte',
    xp: 40,
    skillDim: 'pitch',
  },
  {
    id: 'technique_tried',
    name: 'Testat en teknik',
    icon: '🎯',
    description: 'Applicerat en specifik teknik från ett block i verkligt samtal',
    xp: 50,
    skillDim: null, // härleds från block_id om angett
    needsBlock: true,
  },
  {
    id: 'objection_handled',
    name: 'Hanterat invändning',
    icon: '🛡️',
    description: 'Bemött en invändning strukturerat istället för reflexivt',
    xp: 30,
    skillDim: 'invandningar',
  },
  {
    id: 'deal_closed',
    name: 'Affär stängd',
    icon: '💰',
    description: 'Nytt avtal signerat',
    xp: 200,
    skillDim: 'avslut',
  },
  {
    id: 'referral_asked',
    name: 'Bad om referral',
    icon: '🎁',
    description: 'Frågade nöjd kund om introduktion',
    xp: 35,
    skillDim: 'avslut',
  },
  {
    id: 'referral_received',
    name: 'Referral mottagen',
    icon: '🌟',
    description: 'Fick introduktion från befintlig kund',
    xp: 75,
    skillDim: 'avslut',
  },
  {
    id: 'followup_sent',
    name: 'Uppföljning skickad',
    icon: '📨',
    description: 'Aktivt uppföljningsmejl eller samtal',
    xpPerUnit: 3,
    xpMax: 30,
    needsCount: true,
    skillDim: 'avslut',
  },
  {
    id: 'custom',
    name: 'Egen handling',
    icon: '✨',
    description: 'Annan konkret säljhandling',
    xp: 20,
    skillDim: null,
  },
];

// Nivå-system
const LEVELS = [
  {
    id: 1,
    name: 'Rookie',
    minXp: 0,
    signalizes: 'Du har börjat. Grunden läggs — teori, övningar, första riktiga handlingar.',
  },
  {
    id: 2,
    name: 'Operator',
    minXp: 300,
    signalizes: 'Du kör processen cleant. Inte längre bara läsa om den — du tillämpar på riktigt.',
  },
  {
    id: 3,
    name: 'Closer',
    minXp: 900,
    signalizes: 'Du stänger affärer med struktur, inte tur. Discovery, invändningar, avslut — säljprocessen är din.',
  },
  {
    id: 4,
    name: 'Elite',
    minXp: 2000,
    signalizes: 'Du kombinerar teknik, disciplin och psykologi. Du är bland de 10% som hela tiden tillämpar.',
  },
  {
    id: 5,
    name: 'Apex',
    minXp: 4000,
    signalizes: 'Toppen. Du är en av de 5% som kontinuerligt tränar, tillämpar och utvecklas. Säljhantverk på mästerskapsnivå.',
  },
];

// Skill-dimensioner (för radar-diagrammet)
// Varje block bidrar till en eller flera dimensioner
const SKILL_DIMENSIONS = [
  {
    id: 'prospektering',
    name: 'Prospektering',
    icon: '🎯',
    blocks: ['prospektering', 'linkedin', 'epost'],
  },
  {
    id: 'pitch',
    name: 'Pitch & Första intryck',
    icon: '🎤',
    blocks: ['forsta-intrycket', 'tonfall', 'presentation', 'videosamtal'],
  },
  {
    id: 'behovsanalys',
    name: 'Behovsanalys',
    icon: '🔍',
    blocks: ['behovsanalys'],
  },
  {
    id: 'invandningar',
    name: 'Invändningar',
    icon: '🛡️',
    blocks: ['invandningar'],
  },
  {
    id: 'avslut',
    name: 'Avslut & Uppföljning',
    icon: '✅',
    blocks: ['avslut', 'uppfoljning', 'forhandling'],
  },
  {
    id: 'mental',
    name: 'Mental Styrka',
    icon: '🧠',
    blocks: ['inledning', 'mal-motivation', 'mental-styrka', 'traning-halsa', 'tidshantering', 'personligt-varumarke', 'ai-saljverktyg', 'rekommenderad-lasning'],
  },
];

// Dagliga challenges (roterar)
const DAILY_CHALLENGE_POOL = [
  { id: 'technique',  text: 'Testa 1 specifik teknik från ett block i ett riktigt samtal', category: 'technique_tried', xp: 50 },
  { id: 'prospect',   text: 'Ring minst 5 nya prospekterings-samtal idag', category: 'cold_call', minCount: 5, xp: 40 },
  { id: 'linkedin',   text: 'Publicera 1 substantiell LinkedIn-post', category: 'linkedin_post', xp: 30 },
  { id: 'linkedin_c', text: 'Skriv 3 substantiella kommentarer på andras LinkedIn-poster', category: 'linkedin_dm', minCount: 3, xp: 30 },
  { id: 'spin',       text: 'Ställ minst 3 implikationsfrågor i nästa kundmöte', category: 'technique_tried', xp: 40 },
  { id: 'followup',   text: 'Skicka 3 kvalitativa uppföljningsmejl', category: 'followup_sent', minCount: 3, xp: 30 },
  { id: 'breakup',    text: 'Skicka ett "break-up"-mejl till en ghostande affär', category: 'followup_sent', xp: 25 },
  { id: 'referral',   text: 'Be om 1 referral från en nöjd kund', category: 'referral_asked', xp: 35 },
  { id: 'close',      text: 'Be om affären uttryckligen i nästa varma möte', category: 'technique_tried', xp: 45 },
  { id: 'reflect',    text: 'Gör en reflektion i ett block du inte rört på 7 dagar', category: 'reflection', xp: 20 },
];

// ═════════════════════════════════════════════════════════════════════════════
// PURE FUNCTIONS — beräkningar
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Beräkna XP för en action-logg baserat på kategori och antal.
 */
function computeActionXp(category, count = 1) {
  const cat = ACTION_CATEGORIES.find(c => c.id === category);
  if (!cat) return 0;
  if (cat.xp) return cat.xp;
  if (cat.xpPerUnit) {
    const total = cat.xpPerUnit * Math.max(1, count);
    return cat.xpMax ? Math.min(total, cat.xpMax) : total;
  }
  return 0;
}

/**
 * Hitta nivå för ett givet XP-tal.
 */
function getLevelForXp(xp) {
  const sorted = [...LEVELS].sort((a, b) => b.minXp - a.minXp);
  return sorted.find(l => xp >= l.minXp) || LEVELS[0];
}

/**
 * Beräkna progress mot nästa nivå.
 */
function getLevelProgress(xp) {
  const current = getLevelForXp(xp);
  const nextIdx = LEVELS.findIndex(l => l.id === current.id) + 1;
  const next = LEVELS[nextIdx] || null;
  if (!next) {
    return { current, next: null, progress: 1, xpToNext: 0 };
  }
  const span = next.minXp - current.minXp;
  const gained = xp - current.minXp;
  return {
    current,
    next,
    progress: Math.min(1, gained / span),
    xpToNext: next.minXp - xp,
  };
}

/**
 * Givet en array av aktivitetsdatum (ISO-strings, ej nödvändigtvis unika),
 * räkna ut den aktuella streaken (antal dagar i rad fram till idag, inklusive).
 */
function computeStreak(activityDates) {
  if (!activityDates || !activityDates.length) return { current: 0, longest: 0 };

  // Normalisera till unika YYYY-MM-DD
  const uniqueDays = new Set();
  activityDates.forEach(d => {
    if (!d) return;
    const date = new Date(d);
    if (isNaN(date)) return;
    uniqueDays.add(date.toISOString().slice(0, 10));
  });

  const sortedDays = [...uniqueDays].sort();
  if (!sortedDays.length) return { current: 0, longest: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  // Nuvarande streak: hur många dagar i rad fram till idag (eller igår)
  let current = 0;
  if (uniqueDays.has(today) || uniqueDays.has(yesterday)) {
    let cursor = uniqueDays.has(today) ? new Date() : (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })();
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (uniqueDays.has(key)) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Längsta streak någonsin
  let longest = 0;
  let run = 0;
  let prev = null;
  sortedDays.forEach(d => {
    if (!prev) {
      run = 1;
    } else {
      const prevDate = new Date(prev);
      prevDate.setDate(prevDate.getDate() + 1);
      const expected = prevDate.toISOString().slice(0, 10);
      run = (d === expected) ? run + 1 : 1;
    }
    if (run > longest) longest = run;
    prev = d;
  });

  return { current, longest };
}

/**
 * Aggregera XP från alla event-källor och räkna ut komplett user stats.
 *
 * Förväntar data-objekt med:
 * - progress: Array av block_progress-rader (quiz_score, quiz_total, completed, completed_at, block_id)
 * - reflections: Array av user_reflections (block_id, created_at, response_length)
 * - roleplays: Array av user_roleplays (block_id, completed_at, turn_count)
 * - missions: Array av user_missions (block_id, started_at, completed_at, reflection)
 * - actions: Array av user_actions (category, count, created_at, block_id)
 * - blocks: Array av alla block från salesContent
 */
function computeUserStats(data) {
  const { progress = [], reflections = [], roleplays = [], missions = [], actions = [], blocks = [] } = data;

  let xp = 0;
  const xpByEvent = {};
  const add = (event, amount) => {
    if (!amount) return;
    xp += amount;
    xpByEvent[event] = (xpByEvent[event] || 0) + amount;
  };

  // Aktivitets-datum för streak-beräkning
  const activityDates = [];
  const blocksWithTheory = new Set();

  // ── Quiz / theory ──
  progress.forEach(p => {
    if (p.completed) {
      add('quiz_passed', XP_RULES.quiz_passed);
      // "theory_read" triggras samtidigt som quiz passerar
      if (!blocksWithTheory.has(p.block_id)) {
        add('theory_read', XP_RULES.theory_read);
        blocksWithTheory.add(p.block_id);
      }
      if (p.quiz_score && p.quiz_total && (p.quiz_score / p.quiz_total) >= 0.9) {
        add('quiz_high_score', XP_RULES.quiz_high_score);
      }
      if (p.completed_at) activityDates.push(p.completed_at);
    }
  });

  // ── Rollspel ──
  roleplays.forEach(r => {
    if ((r.turn_count || 0) >= 5) {
      add('roleplay_completed', XP_RULES.roleplay_completed);
    }
    if (r.completed_at) activityDates.push(r.completed_at);
  });

  // ── Reflektioner ──
  reflections.forEach(r => {
    const len = (r.response || '').length;
    if (len >= 50) {
      add('reflection_saved', XP_RULES.reflection_saved);
    }
    if (r.created_at) activityDates.push(r.created_at);
  });

  // ── Missions ──
  const missionsByBlock = {};
  missions.forEach(m => {
    missionsByBlock[m.block_id] = m;
    if (m.started_at) {
      add('mission_started', XP_RULES.mission_started);
      activityDates.push(m.started_at);
    }
    if (m.completed_at) {
      add('mission_completed', XP_RULES.mission_completed);
      activityDates.push(m.completed_at);
    }
  });

  // ── Block mastery-bonus ──
  const progByBlock = {};
  progress.forEach(p => { progByBlock[p.block_id] = p; });
  const roleplayBlocks = new Set(roleplays.map(r => r.block_id));
  const reflectionBlocks = new Set(reflections.map(r => r.block_id));
  const masteredBlockIds = new Set();

  blocks.forEach(b => {
    const theoryDone   = !!(progByBlock[b.id] && progByBlock[b.id].completed);
    const roleplayDone = roleplayBlocks.has(b.id);
    const missionDone  = !!(missionsByBlock[b.id] && missionsByBlock[b.id].completed_at);
    const reflDone     = reflectionBlocks.has(b.id);
    if (theoryDone && roleplayDone && missionDone && reflDone) {
      add('block_mastered', XP_RULES.block_mastered);
      masteredBlockIds.add(b.id);
    }
  });

  // ── Loggade actions ──
  actions.forEach(a => {
    const earned = computeActionXp(a.category, a.count || 1);
    if (earned) {
      add('action_logged', earned);
    }
    if (a.created_at) activityDates.push(a.created_at);
  });

  // ── Streak + bonus ──
  const streak = computeStreak(activityDates);
  if (streak.current >= 30) add('streak_30', XP_RULES.streak_30);
  else if (streak.current >= 14) add('streak_14', XP_RULES.streak_14);
  else if (streak.current >= 7) add('streak_7', XP_RULES.streak_7);
  else if (streak.current >= 3) add('streak_3', XP_RULES.streak_3);

  // ── Nivå + progress ──
  const level = getLevelProgress(xp);

  // ── Skill radar ──
  // För varje dimension: räkna andel av ingående block som är bemästrade (0–1)
  const radar = SKILL_DIMENSIONS.map(dim => {
    const relevantBlocks = dim.blocks.filter(bid => blocks.some(b => b.id === bid));
    if (!relevantBlocks.length) return { ...dim, score: 0, mastered: 0, total: 0 };
    const mastered = relevantBlocks.filter(bid => masteredBlockIds.has(bid)).length;
    // Partial credit för theory_done och roleplay_done
    let partial = 0;
    relevantBlocks.forEach(bid => {
      if (masteredBlockIds.has(bid)) return;
      const p = progByBlock[bid];
      let frac = 0;
      if (p && p.completed) frac += 0.25;
      if (roleplayBlocks.has(bid)) frac += 0.25;
      if (missionsByBlock[bid] && missionsByBlock[bid].completed_at) frac += 0.25;
      if (reflectionBlocks.has(bid)) frac += 0.25;
      partial += frac;
    });
    const score = (mastered + partial) / relevantBlocks.length;
    return { id: dim.id, name: dim.name, icon: dim.icon, score, mastered, total: relevantBlocks.length };
  });

  // ── Aggregates för dashboard ──
  const totalActionsLogged = actions.length;
  const totalActionsThisWeek = actions.filter(a => {
    if (!a.created_at) return false;
    return (Date.now() - new Date(a.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return {
    xp,
    xpByEvent,
    level,
    streak,
    radar,
    masteredBlockIds: Array.from(masteredBlockIds),
    totalActionsLogged,
    totalActionsThisWeek,
    totalRoleplays: roleplays.length,
    totalReflections: reflections.length,
    totalBlocksMastered: masteredBlockIds.size,
  };
}

/**
 * Generera dagens challenge baserat på användarens historia.
 * Välj något de inte gjort på senaste 7 dagar.
 */
function selectDailyChallenge(data, dateISO) {
  const { actions = [] } = data;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCategories = new Set(
    actions
      .filter(a => new Date(a.created_at).getTime() > sevenDaysAgo)
      .map(a => a.category)
  );

  // Prioritera challenges i kategorier användaren inte varit aktiv i på länge
  const candidates = DAILY_CHALLENGE_POOL.map(c => ({
    ...c,
    isNovel: !recentCategories.has(c.category),
  }));

  const novel = candidates.filter(c => c.isNovel);
  const pool = novel.length >= 3 ? novel : candidates;

  // Deterministiskt baserat på datum så samma användare får samma challenge samma dag
  const seed = dateISO ? dateISO.split('').reduce((s, c) => s + c.charCodeAt(0), 0) : 0;
  return pool[seed % pool.length];
}

/**
 * Kontrollera om en challenge är uppfylld baserat på loggade actions idag.
 */
function isChallengeCompleted(challenge, todaysActions) {
  if (!challenge) return false;
  const matching = todaysActions.filter(a => a.category === challenge.category);
  if (challenge.minCount) {
    const total = matching.reduce((sum, a) => sum + (a.count || 1), 0);
    return total >= challenge.minCount;
  }
  return matching.length > 0;
}

/**
 * Level-up-meddelande.
 */
function getLevelUpMessage(level) {
  if (!level) return null;
  return {
    title: `Ny nivå: ${level.name}`,
    body: level.signalizes,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PREFERENCES — läs/skriv JSON
// ═════════════════════════════════════════════════════════════════════════════

const DEFAULT_PREFERENCES = {
  gamification_enabled: true,
  last_seen_level: 1,
  level_up_dismissed: {},  // { levelId: timestamp }
  email_retention: true,   // opt-in för veckovis digest + re-engagement
  last_digest_sent_at: null,
  last_reengagement_sent_at: null,
};

function parsePreferences(jsonString) {
  try {
    const parsed = JSON.parse(jsonString || '{}');
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch (_) {
    return { ...DEFAULT_PREFERENCES };
  }
}

function serializePreferences(prefs) {
  return JSON.stringify({ ...DEFAULT_PREFERENCES, ...prefs });
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Config
  XP_RULES,
  ACTION_CATEGORIES,
  LEVELS,
  SKILL_DIMENSIONS,
  DAILY_CHALLENGE_POOL,
  DEFAULT_PREFERENCES,

  // Pure functions
  computeActionXp,
  getLevelForXp,
  getLevelProgress,
  computeStreak,
  computeUserStats,
  selectDailyChallenge,
  isChallengeCompleted,
  getLevelUpMessage,
  parsePreferences,
  serializePreferences,
};
