import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateTokens,
  checkTokenLimit,
  addTokens,
  getSessionUsage,
  resetSession,
} from '../src/core/token_tracker.js';

describe('Token Tracker & Budget Limiter', () => {
  const testSessionId = 'test_session_' + Date.now();

  beforeEach(() => {
    resetSession(testSessionId);
  });

  it('should accurately estimate tokens based on character and word count', () => {
    assert.equal(estimateTokens(''), 0);
    assert.ok(estimateTokens('abcd') >= 1);
    assert.ok(estimateTokens('12345678') >= 2);
    assert.ok(estimateTokens('The quick brown fox jumps over the lazy dog') >= 10);
  });

  it('should initialize a fresh session with zero tokens', () => {
    const usage = getSessionUsage(testSessionId);
    assert.equal(usage.research.used, 0);
    assert.equal(usage.design.used, 0);
    assert.equal(usage.code.used, 0);
  });

  it('should track token accumulation across stages', () => {
    addTokens(testSessionId, 'research', 1200);
    addTokens(testSessionId, 'design', 800);
    addTokens(testSessionId, 'code', 2500);

    const usage = getSessionUsage(testSessionId);
    assert.equal(usage.research.used, 1200);
    assert.equal(usage.design.used, 800);
    assert.equal(usage.code.used, 2500);
  });

  it('should enforce 10,000 token budget limit on stages', () => {
    // Stage under limit
    addTokens(testSessionId, 'research', 5000);
    const check1 = checkTokenLimit(testSessionId, 'research', 2000);
    assert.equal(check1.allowed, true);
    assert.equal(check1.current, 5000);
    assert.equal(check1.max, 10000);

    // Stage exceeding limit
    const check2 = checkTokenLimit(testSessionId, 'research', 6000);
    assert.equal(check2.allowed, false);
    assert.equal(check2.current, 5000);
  });

  it('should reset session usage completely', () => {
    addTokens(testSessionId, 'research', 3000);
    resetSession(testSessionId);
    const usage = getSessionUsage(testSessionId);
    assert.equal(usage.research.used, 0);
    assert.equal(usage.design.used, 0);
    assert.equal(usage.code.used, 0);
  });
});
