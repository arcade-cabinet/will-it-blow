/**
 * Tests for the scoring config accessor — typed lookup functions
 * for scoring parameters, rank thresholds, and verdicts.
 */

import {getRankOrder, getRankThreshold, getScoringConfig, getVerdict} from '../scoring';

describe('scoring accessor — getScoringConfig', () => {
  it('returns the full scoring config', () => {
    const cfg = getScoringConfig();
    expect(cfg).toBeDefined();
    expect(cfg.rankThresholds).toBeDefined();
    expect(cfg.weights).toBeDefined();
    expect(cfg.scoreRange).toBeDefined();
    expect(cfg.verdicts).toBeDefined();
  });

  it('has expected weight fields', () => {
    const cfg = getScoringConfig();
    expect(typeof cfg.weights.tasteMultiplier).toBe('number');
    expect(typeof cfg.weights.textureMultiplier).toBe('number');
    expect(typeof cfg.weights.desiredTagBonus).toBe('number');
    expect(typeof cfg.weights.hatedTagPenalty).toBe('number');
    expect(typeof cfg.weights.cookMatchBonus).toBe('number');
  });

  it('score range is 0-100', () => {
    const cfg = getScoringConfig();
    expect(cfg.scoreRange.min).toBe(0);
    expect(cfg.scoreRange.max).toBe(100);
  });
});

describe('scoring accessor — getRankThreshold', () => {
  it('returns threshold for S rank', () => {
    const threshold = getRankThreshold('S');
    expect(threshold).toBeDefined();
    expect(threshold).toBeGreaterThan(0);
  });

  it('returns threshold for A rank', () => {
    expect(getRankThreshold('A')).toBeDefined();
  });

  it('returns threshold for B rank', () => {
    expect(getRankThreshold('B')).toBeDefined();
  });

  it('returns undefined for unknown rank', () => {
    expect(getRankThreshold('Z')).toBeUndefined();
  });

  it('thresholds are in descending order: S > A > B', () => {
    const s = getRankThreshold('S')!;
    const a = getRankThreshold('A')!;
    const b = getRankThreshold('B')!;
    expect(s).toBeGreaterThan(a);
    expect(a).toBeGreaterThan(b);
  });
});

describe('scoring accessor — getVerdict', () => {
  it('returns verdict for S rank', () => {
    expect(getVerdict('S')).toBe('THE SAUSAGE KING');
  });

  it('returns verdict for F rank', () => {
    expect(getVerdict('F')).toBe('Unacceptable');
  });

  it('returns undefined for unknown rank', () => {
    expect(getVerdict('Z')).toBeUndefined();
  });
});

describe('scoring accessor — getRankOrder', () => {
  it('returns ranks in descending threshold order', () => {
    const order = getRankOrder();
    expect(order[0]).toBe('S');
    expect(order.length).toBeGreaterThanOrEqual(3);
  });
});
