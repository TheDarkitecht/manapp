'use strict';

/**
 * roleplayTurnAuth.js — HMAC authentication for Jocke roleplay customer turns.
 *
 * The roleplay chat endpoint is stateless (it never persists the conversation), so the
 * evaluator would otherwise have to trust a client-supplied transcript. A learner could then
 * forge customer (assistant) turns — e.g. fabricate the customer conceding the real objection —
 * to farm a perfect score. To prevent that, every AI-authored customer turn is HMAC-signed
 * server-side when it is produced; at evaluation time only turns with a valid signature are
 * accepted. Seller (user) turns are the learner's own words and need no signature.
 *
 * Mirrors the existing certificate-signing HMAC pattern in server.js.
 */
const crypto = require('crypto');

function turnKey() {
  return process.env.SESSION_SECRET || process.env.CERT_SECRET || 'dev-fallback';
}

function signRoleplayTurn(userId, blockId, roleplayId, content) {
  return crypto.createHmac('sha256', turnKey())
    .update(`${userId}.${blockId}.${roleplayId}.${content}`)
    .digest('hex')
    .slice(0, 24);
}

function verifyRoleplayTurn(userId, blockId, roleplayId, content, sig) {
  if (!sig || typeof sig !== 'string') return false;
  const expected = signRoleplayTurn(userId, blockId, roleplayId, content);
  if (sig.length !== expected.length) return false;
  let diff = 0; // constant-time-ish compare
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// Keep seller (user) turns; keep customer (assistant) turns only if their signature verifies.
function authenticateTranscript(userId, blockId, roleplayId, messages) {
  if (!Array.isArray(messages)) return [];
  return messages.filter(m => {
    if (!m || typeof m !== 'object') return false;
    if (m.role === 'assistant') return verifyRoleplayTurn(userId, blockId, roleplayId, m.content, m.sig);
    return true;
  });
}

module.exports = { signRoleplayTurn, verifyRoleplayTurn, authenticateTranscript };
