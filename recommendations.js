// recommendations.js
// Adaptiv pedagogisk rekommendationsmotor.
//
// Tar användarens learningState + salesBlocks och returnerar 2–3 personliga kort.
// Principer som tillämpas:
// - Zone of Proximal Development (Vygotsky): utmaning precis ovanför nuvarande nivå
// - Spaced retrieval (Ebbinghaus): återaktivera gamla koncept
// - Mastery Learning (Bloom): fyll luckor innan nästa nivå
// - Feedback loops (Ericsson): bygg på faktisk prestation
//
// Icke-stör-principer:
// - Max 3 kort i taget
// - Prioritering: mest värde först, dismissible per användarsession
// - Positiv framing alltid ("dags att utmana", inte "du missade")

const DAYS = (n) => n * 24 * 60 * 60 * 1000;
const now = () => Date.now();

function daysSince(isoDate) {
  if (!isoDate) return Infinity;
  const t = new Date(isoDate).getTime();
  if (isNaN(t)) return Infinity;
  return Math.floor((now() - t) / DAYS(1));
}

function isBlockMastered(state, blockId) {
  const prog = state.progressByBlock[blockId];
  const theoryDone     = !!(prog && prog.completed);
  const roleplayDone   = !!(state.roleplaysByBlock[blockId] && state.roleplaysByBlock[blockId].length);
  const mission        = state.missionByBlock[blockId];
  const missionDone    = !!(mission && mission.completed_at);
  const reflectionDone = !!(state.reflectionsByBlock[blockId] && state.reflectionsByBlock[blockId].length);
  return theoryDone && roleplayDone && missionDone && reflectionDone;
}

function blockStepsDone(state, blockId) {
  const prog = state.progressByBlock[blockId];
  return [
    !!(prog && prog.completed),
    !!(state.roleplaysByBlock[blockId] && state.roleplaysByBlock[blockId].length),
    !!(state.missionByBlock[blockId] && state.missionByBlock[blockId].completed_at),
    !!(state.reflectionsByBlock[blockId] && state.reflectionsByBlock[blockId].length),
  ].filter(Boolean).length;
}

/**
 * Generera rekommendationer baserat på användarens learning state.
 * @param {object} state - getUserLearningState-output
 * @param {Array} blocks - salesBlocks
 * @param {Array} freeBlockIds - block som är gratis (access-grundat filter)
 * @param {string} userRole - 'free' | 'premium' | 'admin'
 * @returns {Array} prioriterade kort (max 3)
 */
function generateRecommendations(state, blocks, freeBlockIds, userRole) {
  const isPremium = userRole === 'premium' || userRole === 'admin';
  const accessible = b => freeBlockIds.includes(b.id) || isPremium;
  const cards = [];

  // ────── 1. "Kom igång" — helt ny användare (priority 0) ──────
  if (state.totalBlocksCompleted === 0 && state.totalRoleplays === 0 && state.totalReflections === 0) {
    const firstBlock = blocks[0];
    cards.push({
      type: 'start',
      priority: 0,
      icon: '🎯',
      tag: 'Kom igång',
      title: 'Börja din resa här',
      description: `${firstBlock.title} är gratis. Det här är grundfilosofin som resten bygger på — läs den först.`,
      cta: 'Öppna Block 1',
      url: `/learn/${firstBlock.id}`,
      dismissKey: 'rec-start',
    });
    return cards; // Ingen annan rekommendation för ny användare — håll det rent
  }

  // ────── 2. "Återaktivera" — inaktiv 7+ dagar (priority 1) ──────
  const inactiveDays = daysSince(state.lastActivity);
  if (inactiveDays >= 7 && inactiveDays < 9999) {
    // Hitta "var de var senast" — senaste blocket med aktivitet
    const recentBlockId = findMostRecentBlock(state);
    const recentBlock = recentBlockId ? blocks.find(b => b.id === recentBlockId) : null;
    if (recentBlock) {
      cards.push({
        type: 'reactivate',
        priority: 1,
        icon: '👋',
        tag: 'Välkommen tillbaka',
        title: `Det var ${inactiveDays} dagar sen — enkelt att komma tillbaka`,
        description: `Du var mitt i ${recentBlock.title}. Ta 10 min idag — så är momentum tillbaka.`,
        cta: 'Fortsätt där du var',
        url: `/learn/${recentBlock.id}`,
        dismissKey: `rec-reactivate-${inactiveDays}`,
      });
    }
  }

  // ────── 3. "Stäng cirkeln" — pågående mission 3+ dagar gammal (priority 2) ──────
  const openMissions = Object.values(state.missionByBlock)
    .filter(m => !m.completed_at && m.started_at)
    .filter(m => daysSince(m.started_at) >= 3)
    .sort((a, b) => new Date(a.started_at) - new Date(b.started_at));
  if (openMissions.length > 0) {
    const m = openMissions[0];
    const block = blocks.find(b => b.id === m.block_id);
    if (block && accessible(block)) {
      const days = daysSince(m.started_at);
      cards.push({
        type: 'closeLoop',
        priority: 2,
        icon: '🎯',
        tag: 'Stäng cirkeln',
        title: `Uppdraget "${block.title}" har pågått ${days} dagar`,
        description: 'Gör en kort reflektion och markera det slutfört — även om du inte hann allt. Lärandet låses in i reflektionen.',
        cta: 'Öppna uppdraget',
        url: `/learn/${block.id}/uppdrag`,
        dismissKey: `rec-closeloop-${block.id}`,
      });
    }
  }

  // ────── 4. "Fortsätt" — block med 1–3 steg klara (priority 3) ──────
  const inProgressBlocks = blocks
    .filter(accessible)
    .map(b => ({ block: b, stepsDone: blockStepsDone(state, b.id) }))
    .filter(({ stepsDone }) => stepsDone >= 1 && stepsDone <= 3)
    .sort((a, b) => b.stepsDone - a.stepsDone); // mest progress först

  if (inProgressBlocks.length > 0 && !hasCardType(cards, 'reactivate')) {
    const { block, stepsDone } = inProgressBlocks[0];
    cards.push({
      type: 'continue',
      priority: 3,
      icon: '▶️',
      tag: 'Fortsätt',
      title: `${block.title} — ${stepsDone}/4 steg klara`,
      description: 'Du är mitt i det här blocket. Slutför resan — alla 4 steg ger djupare lärande än 2.',
      cta: 'Fortsätt',
      url: `/learn/${block.id}`,
      dismissKey: `rec-continue-${block.id}`,
    });
  }

  // ────── 5. "Fyll luckan" — quiz <70% (priority 4) ──────
  // Mastery learning: innan man går vidare bör kunskap säkras.
  const lowScoreBlocks = Object.values(state.progressByBlock)
    .filter(p => p.quiz_score !== null && p.quiz_total > 0)
    .filter(p => (p.quiz_score / p.quiz_total) < 0.7)
    .map(p => ({ prog: p, block: blocks.find(b => b.id === p.block_id) }))
    .filter(x => x.block && accessible(x.block))
    .sort((a, b) => (a.prog.quiz_score / a.prog.quiz_total) - (b.prog.quiz_score / b.prog.quiz_total));

  if (lowScoreBlocks.length > 0 && cards.length < 3) {
    const { prog, block } = lowScoreBlocks[0];
    const pct = Math.round((prog.quiz_score / prog.quiz_total) * 100);
    cards.push({
      type: 'gap',
      priority: 4,
      icon: '🎯',
      tag: 'Fyll luckan',
      title: `Repetera ${block.title}`,
      description: `Ditt senaste prov: ${prog.quiz_score}/${prog.quiz_total} (${pct}%). Under 70% betyder att nyckel­koncept inte satt än — läs om och kör provet igen.`,
      cta: 'Repetera blocket',
      url: `/learn/${block.id}`,
      dismissKey: `rec-gap-${block.id}`,
    });
  }

  // ────── 6. "Spaced retrieval" — avklarat block 30+ dagar sen (priority 5) ──────
  // Ebbinghaus: hjärnan glömmer 80% på en vecka utan återaktivering.
  const oldCompleted = Object.values(state.progressByBlock)
    .filter(p => p.completed && p.completed_at)
    .filter(p => daysSince(p.completed_at) >= 30)
    .map(p => ({ prog: p, block: blocks.find(b => b.id === p.block_id) }))
    .filter(x => x.block && accessible(x.block))
    .sort((a, b) => daysSince(b.prog.completed_at) - daysSince(a.prog.completed_at));

  if (oldCompleted.length > 0 && cards.length < 3 && !hasCardType(cards, 'gap')) {
    const { prog, block } = oldCompleted[0];
    const days = daysSince(prog.completed_at);
    cards.push({
      type: 'recall',
      priority: 5,
      icon: '🔁',
      tag: 'Dags att repetera',
      title: `${block.title} — ${days} dagar sen`,
      description: 'Ebbinghaus: hjärnan glömmer snabbt utan återaktivering. Kör quizet igen (3 min) — det låser in kunskapen på lång sikt.',
      cta: 'Kör quizet igen',
      url: `/learn/${block.id}`,
      dismissKey: `rec-recall-${block.id}`,
    });
  }

  // ────── 7. "Nästa utmaning" — naturliga nästa block (priority 6) ──────
  // Zone of Proximal Development — block de inte börjat men är redo för.
  if (cards.length < 3) {
    const unstarted = blocks
      .filter(accessible)
      .find(b => blockStepsDone(state, b.id) === 0 && !state.progressByBlock[b.id]);
    if (unstarted) {
      cards.push({
        type: 'next',
        priority: 6,
        icon: '🚀',
        tag: 'Nästa utmaning',
        title: unstarted.title,
        description: unstarted.subtitle,
        cta: 'Börja',
        url: `/learn/${unstarted.id}`,
        dismissKey: `rec-next-${unstarted.id}`,
      });
    }
  }

  // ────── 8. "Fira" — bemästrat block senaste 48h (priority 7) ──────
  const recentlyMastered = Object.keys(state.progressByBlock)
    .filter(blockId => isBlockMastered(state, blockId))
    .map(blockId => {
      const reflections = state.reflectionsByBlock[blockId] || [];
      const latestRefl = reflections[0] ? new Date(reflections[0].created_at).getTime() : 0;
      return { blockId, latestRefl };
    })
    .filter(x => x.latestRefl > 0 && (now() - x.latestRefl) < DAYS(2))
    .sort((a, b) => b.latestRefl - a.latestRefl);

  if (recentlyMastered.length > 0 && cards.length < 3) {
    const { blockId } = recentlyMastered[0];
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      cards.push({
        type: 'celebrate',
        priority: 7,
        icon: '🏆',
        tag: 'Grattis',
        title: `Du bemästrade ${block.title}`,
        description: 'Du körde alla 4 steg: teori, övning, uppdrag, reflektion. Det är så här 20% presterar. Fortsätt.',
        cta: 'Välj nästa block',
        url: '/learn',
        dismissKey: `rec-celebrate-${block.id}`,
      });
    }
  }

  // Sortera efter priority (lägst först) och returnera max 3
  return cards.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

/**
 * Subtil coach-hint för ett specifikt block.
 * Visas som en liten rad överst i blocket om relevant — INTE som popup.
 * Returnerar null om inget meningsfullt att säga.
 */
function generateBlockCoachHint(state, blockId, block) {
  const prog = state.progressByBlock[blockId];

  // Kommit tillbaka efter låg quizpoäng?
  if (prog && prog.quiz_score !== null && prog.quiz_total > 0) {
    const pct = Math.round((prog.quiz_score / prog.quiz_total) * 100);
    if (pct < 70) {
      return {
        icon: '💡',
        message: `Förra gången klarade du ${prog.quiz_score}/${prog.quiz_total} (${pct}%) på provet. Fokusera på teorin innan du kör om — du har det där.`,
        tone: 'nudge',
      };
    }
    if (pct >= 90 && daysSince(prog.completed_at) >= 30) {
      return {
        icon: '🔁',
        message: `Du klarade blocket starkt (${pct}%) för ${daysSince(prog.completed_at)} dagar sen. Bra tajming att repetera — och låsa in det långsiktigt.`,
        tone: 'celebrate',
      };
    }
  }

  // Lång tid sen besök?
  const roleplays = state.roleplaysByBlock[blockId] || [];
  const reflections = state.reflectionsByBlock[blockId] || [];
  const mission = state.missionByBlock[blockId];
  const hasAnyActivity = prog || roleplays.length || reflections.length || mission;

  if (hasAnyActivity) {
    const lastTouches = [
      prog && prog.completed_at,
      roleplays[0] && roleplays[0].completed_at,
      reflections[0] && reflections[0].created_at,
      mission && (mission.completed_at || mission.started_at),
    ].filter(Boolean).map(t => new Date(t).getTime()).filter(n => !isNaN(n));
    if (lastTouches.length > 0) {
      const days = daysSince(new Date(Math.max(...lastTouches)).toISOString());
      if (days >= 21) {
        return {
          icon: '👋',
          message: `Det var ${days} dagar sen du var här. Ta 5 min — återaktivera det du redan lärt.`,
          tone: 'welcome',
        };
      }
    }
  }

  // Öppen mission i det här blocket?
  if (mission && mission.started_at && !mission.completed_at) {
    const days = daysSince(mission.started_at);
    if (days >= 5) {
      return {
        icon: '🎯',
        message: `Ditt uppdrag här har pågått ${days} dagar. Stäng cirkeln med en kort reflektion — även ofärdigt är lärande.`,
        tone: 'nudge',
      };
    }
  }

  return null;
}

/**
 * "Nästa rekommenderade block" efter slutfört block.
 * Används på reflektion-sidan när journey är 4/4.
 */
function suggestNextBlock(state, blocks, currentBlockId, freeBlockIds, userRole) {
  const isPremium = userRole === 'premium' || userRole === 'admin';
  const accessible = b => freeBlockIds.includes(b.id) || isPremium;
  const currentIdx = blocks.findIndex(b => b.id === currentBlockId);

  // Prioritet 1: lucka — block med lågt quizresultat
  const gap = Object.values(state.progressByBlock)
    .filter(p => p.block_id !== currentBlockId)
    .filter(p => p.quiz_score !== null && p.quiz_total > 0)
    .filter(p => (p.quiz_score / p.quiz_total) < 0.7)
    .map(p => ({ prog: p, block: blocks.find(b => b.id === p.block_id) }))
    .filter(x => x.block && accessible(x.block))
    .sort((a, b) => (a.prog.quiz_score / a.prog.quiz_total) - (b.prog.quiz_score / b.prog.quiz_total))[0];
  if (gap) {
    return {
      block: gap.block,
      reason: `Du hade ${gap.prog.quiz_score}/${gap.prog.quiz_total} på det här blocket — bra ögonblick att förstärka.`,
    };
  }

  // Prioritet 2: naturligt nästa i ordning
  for (let i = currentIdx + 1; i < blocks.length; i++) {
    if (!accessible(blocks[i])) continue;
    if (blockStepsDone(state, blocks[i].id) === 0) {
      return {
        block: blocks[i],
        reason: 'Naturliga nästa steget i säljresan.',
      };
    }
  }

  // Prioritet 3: gammalt block som behöver repetition
  const old = Object.values(state.progressByBlock)
    .filter(p => p.block_id !== currentBlockId && p.completed)
    .filter(p => daysSince(p.completed_at) >= 30)
    .map(p => ({ prog: p, block: blocks.find(b => b.id === p.block_id) }))
    .filter(x => x.block && accessible(x.block))
    .sort((a, b) => daysSince(b.prog.completed_at) - daysSince(a.prog.completed_at))[0];
  if (old) {
    return {
      block: old.block,
      reason: `Repetition — du körde detta för ${daysSince(old.prog.completed_at)} dagar sen.`,
    };
  }

  // Fallback: första ej påbörjade blocket
  const firstUnstarted = blocks.filter(accessible).find(b => blockStepsDone(state, b.id) === 0);
  if (firstUnstarted) {
    return { block: firstUnstarted, reason: 'Nästa utmaning.' };
  }

  return null;
}

// ── Utility ──

function findMostRecentBlock(state) {
  const candidates = [];
  Object.values(state.progressByBlock).forEach(p => {
    if (p.completed_at) candidates.push({ blockId: p.block_id, ts: new Date(p.completed_at).getTime() });
  });
  Object.values(state.missionByBlock).forEach(m => {
    const ts = new Date(m.completed_at || m.started_at).getTime();
    if (!isNaN(ts)) candidates.push({ blockId: m.block_id, ts });
  });
  Object.values(state.roleplaysByBlock).forEach(arr => {
    arr.forEach(r => {
      const ts = new Date(r.completed_at).getTime();
      if (!isNaN(ts)) candidates.push({ blockId: r.block_id, ts });
    });
  });
  Object.values(state.reflectionsByBlock).forEach(arr => {
    arr.forEach(r => {
      const ts = new Date(r.created_at).getTime();
      if (!isNaN(ts)) candidates.push({ blockId: r.block_id, ts });
    });
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.ts - a.ts);
  return candidates[0].blockId;
}

function hasCardType(cards, type) {
  return cards.some(c => c.type === type);
}

module.exports = {
  generateRecommendations,
  generateBlockCoachHint,
  suggestNextBlock,
};
