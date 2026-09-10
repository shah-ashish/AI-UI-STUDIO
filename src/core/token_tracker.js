/**
 * In-memory session token tracker with stage limits.
 * - Research Stage: Max 10,000 tokens
 * - Design Plan Stage: Max 10,000 tokens
 */

const MAX_RESEARCH_TOKENS = 10000;
const MAX_DESIGN_TOKENS = 10000;

// Map of sessionId -> { researchTokens, designTokens, history: [] }
const sessions = new Map();

/**
 * Estimates token count from text (~4 characters per token or word heuristic).
 * 
 * @param {string} text 
 * @returns {number}
 */
export function estimateTokens(text = '') {
  if (!text) return 0;
  // Standard approximation for multilingual and code tokens
  const charEstimate = Math.ceil(text.length / 3.8);
  const wordCount = text.trim().split(/\s+/).length;
  const wordEstimate = Math.ceil(wordCount * 1.3);
  return Math.max(charEstimate, wordEstimate);
}

/**
 * Gets or initializes session data.
 */
export function getSession(sessionId = 'default') {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      researchTokens: 0,
      designTokens: 0,
      codeTokens: 0,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
  }
  const session = sessions.get(sessionId);
  session.lastActive = Date.now();
  return session;
}

/**
 * Checks if adding tokens would exceed stage limit.
 * 
 * @param {string} sessionId 
 * @param {'research' | 'design'} stage 
 * @param {number} estimatedNewTokens 
 * @returns {{ allowed: boolean, current: number, max: number, projected: number }}
 */
export function checkTokenLimit(sessionId, stage, estimatedNewTokens = 0) {
  const session = getSession(sessionId);
  const max = stage === 'research' ? MAX_RESEARCH_TOKENS : MAX_DESIGN_TOKENS;
  const current = stage === 'research' ? session.researchTokens : session.designTokens;
  const projected = current + estimatedNewTokens;

  return {
    allowed: projected <= max,
    current,
    max,
    projected,
    remaining: Math.max(0, max - current),
  };
}

/**
 * Records token consumption for a session stage.
 * 
 * @param {string} sessionId 
 * @param {'research' | 'design' | 'code'} stage 
 * @param {number} tokenCount 
 */
export function addTokens(sessionId, stage, tokenCount) {
  const session = getSession(sessionId);
  if (stage === 'research') {
    session.researchTokens += tokenCount;
  } else if (stage === 'design') {
    session.designTokens += tokenCount;
  } else if (stage === 'code') {
    session.codeTokens += tokenCount;
  }
  return session;
}

/**
 * Returns clean summary stats for the frontend HUD.
 */
export function getSessionUsage(sessionId) {
  const session = getSession(sessionId);
  return {
    sessionId,
    research: {
      used: session.researchTokens,
      max: MAX_RESEARCH_TOKENS,
      percentage: Math.min(100, Math.round((session.researchTokens / MAX_RESEARCH_TOKENS) * 100)),
      remaining: Math.max(0, MAX_RESEARCH_TOKENS - session.researchTokens),
    },
    design: {
      used: session.designTokens,
      max: MAX_DESIGN_TOKENS,
      percentage: Math.min(100, Math.round((session.designTokens / MAX_DESIGN_TOKENS) * 100)),
      remaining: Math.max(0, MAX_DESIGN_TOKENS - session.designTokens),
    },
    code: {
      used: session.codeTokens,
    },
  };
}

/**
 * Resets token counts for a session.
 */
export function resetSession(sessionId) {
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
  }
  return getSession(sessionId);
}

export default {
  estimateTokens,
  getSession,
  checkTokenLimit,
  addTokens,
  getSessionUsage,
  resetSession,
  MAX_RESEARCH_TOKENS,
  MAX_DESIGN_TOKENS,
};
