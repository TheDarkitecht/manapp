'use strict';
// Persistence + access-control tests for roleplay_evaluations.
// Uses an ISOLATED temp DB via DB_PATH — production users.db is never touched.
// Run: node --test test/roleplayEvaluationDb.test.js

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const TMP_DB = path.join(os.tmpdir(), `jocke-coach-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = TMP_DB; // MUST be set before requiring database.js

const db = require('../database');

let uAlice, uBob;

before(async () => {
  await db.initDatabase();
  db.createUser('alice', 'alice@test.se', 'pw', 'Alice', 'A', '127.0.0.1');
  db.createUser('bob', 'bob@test.se', 'pw', 'Bob', 'B', '127.0.0.1');
  uAlice = db.findUserByUsername('alice');
  uBob = db.findUserByUsername('bob');
});

after(() => {
  try { fs.unlinkSync(TMP_DB); } catch (_) {}
});

function verdict(score, extra = {}) {
  return Object.assign({
    overall_score: score, session_status: 'evaluated', confidence: 'medium', grounded: true,
    criteria: [{ criterion: 'K1', status: 'met', score: 100, evidence_quote: 'q', evidence_speaker: 'seller' }],
    positives: ['p'], missed_opportunities: ['m'], better_formulations: [{ instead_of: 'a', say: 'b' }],
    priority_improvement: 'pi', next_drill: 'nd', limitations: 'lim', turn_count: 6,
  }, extra);
}

test('saveRoleplayEvaluation returns an id and round-trips JSON fields', () => {
  const id = db.saveRoleplayEvaluation(uAlice.id, 'tonfall', 'rp-forvirrad', verdict(67));
  assert.ok(id > 0, 'returns a positive row id');
  const row = db.getRoleplayEvaluationById(uAlice.id, id);
  assert.ok(row);
  assert.equal(row.overall_score, 67);
  assert.equal(row.grounded, true, 'grounded hydrated as boolean');
  assert.ok(Array.isArray(row.criteria) && row.criteria[0].criterion === 'K1', 'criteria_json parsed');
  assert.ok(Array.isArray(row.better_formulations), 'better_formulations parsed');
});

test('getRoleplayEvaluations is user-scoped and newest-first', () => {
  db.saveRoleplayEvaluation(uAlice.id, 'tonfall', 'rp-labeling', verdict(30));
  db.saveRoleplayEvaluation(uAlice.id, 'tonfall', 'rp-labeling', verdict(60));
  const hist = db.getRoleplayEvaluations(uAlice.id, 'tonfall', 'rp-labeling');
  assert.equal(hist.length, 2);
  assert.ok(hist[0].id > hist[1].id, 'newest first (id desc tiebreak)');
  // Bob sees none of Alice's attempts
  assert.equal(db.getRoleplayEvaluations(uBob.id, 'tonfall', 'rp-labeling').length, 0);
});

test('CROSS-USER ACCESS DENIED: getRoleplayEvaluationById returns null for another user', () => {
  const id = db.saveRoleplayEvaluation(uAlice.id, 'tonfall', 'rp-tystnad', verdict(80));
  assert.ok(db.getRoleplayEvaluationById(uAlice.id, id), 'owner can read');
  assert.equal(db.getRoleplayEvaluationById(uBob.id, id), null, 'other user is denied (null)');
  assert.equal(db.getRoleplayEvaluationById(uAlice.id, 999999), null, 'nonexistent id → null');
});

test('progress across repeated attempts is computable from stored rows', () => {
  const c = require('../coachEvaluation');
  db.saveRoleplayEvaluation(uBob.id, 'prospektering', 'rp-x', verdict(20));
  db.saveRoleplayEvaluation(uBob.id, 'prospektering', 'rp-x', verdict(55));
  const hist = db.getRoleplayEvaluations(uBob.id, 'prospektering', 'rp-x');
  const prog = c.computeProgress(hist);
  assert.equal(prog.attempts, 2);
  assert.equal(prog.best, 55);
  assert.equal(prog.delta, 35);
  assert.equal(prog.trend, 'up');
});

test('insufficient/ungrounded verdicts persist their flags', () => {
  const id = db.saveRoleplayEvaluation(uAlice.id, 'tonfall', 'rp-forvirrad',
    verdict(0, { session_status: 'insufficient', grounded: false }));
  const row = db.getRoleplayEvaluationById(uAlice.id, id);
  assert.equal(row.session_status, 'insufficient');
  assert.equal(row.grounded, false);
});
