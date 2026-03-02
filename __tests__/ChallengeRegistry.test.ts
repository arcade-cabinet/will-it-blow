import type {ChallengeId} from '../src/engine/ChallengeRegistry';
import {
  CHALLENGE_ORDER,
  calculateFinalVerdict,
  getChallengeConfig,
  pickVariant,
} from '../src/engine/ChallengeRegistry';

describe('ChallengeRegistry', () => {
  it('CHALLENGE_ORDER has 5 entries in correct sequence', () => {
    expect(CHALLENGE_ORDER).toEqual(['ingredients', 'grinding', 'stuffing', 'cooking', 'tasting']);
    expect(CHALLENGE_ORDER).toHaveLength(5);
  });

  it('getChallengeConfig returns config for each valid id', () => {
    for (const id of CHALLENGE_ORDER) {
      const config = getChallengeConfig(id);
      expect(config.id).toBe(id);
      expect(config.name).toBeTruthy();
      expect(config.station).toBeTruthy();
      expect(config.cameraOffset).toHaveLength(3);
      expect(config.description).toBeTruthy();
    }
  });

  it('getChallengeConfig throws for invalid id', () => {
    expect(() => getChallengeConfig('invalid' as ChallengeId)).toThrow(
      'Invalid challenge id: invalid',
    );
  });

  it('pickVariant returns a variant for ingredients', () => {
    const variant = pickVariant('ingredients', 42);
    expect(variant).not.toBeNull();
    expect(variant).toHaveProperty('criteria');
    expect(variant).toHaveProperty('requiredCount');
    expect(variant).toHaveProperty('mrSausageDemand');
  });

  it('pickVariant is deterministic for the same seed', () => {
    const v1 = pickVariant('ingredients', 123);
    const v2 = pickVariant('ingredients', 123);
    expect(v1).toEqual(v2);

    const g1 = pickVariant('grinding', 123);
    const g2 = pickVariant('grinding', 123);
    expect(g1).toEqual(g2);
  });

  it('pickVariant produces different results for different seeds', () => {
    const results = new Set<string>();
    for (let seed = 0; seed < 10; seed++) {
      const variant = pickVariant('ingredients', seed);
      results.add(JSON.stringify(variant));
    }
    // At least 2 unique variants across 10 seeds
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  it('calculateFinalVerdict returns S rank for average >= 92', () => {
    const verdict = calculateFinalVerdict([95, 92, 93, 98, 100]);
    expect(verdict.rank).toBe('S');
    expect(verdict.title).toBe('THE SAUSAGE KING');
    expect(verdict.averageScore).toBeGreaterThanOrEqual(92);
  });

  it('calculateFinalVerdict returns A rank for average 75-91', () => {
    const verdict = calculateFinalVerdict([80, 85, 75, 90]);
    expect(verdict.rank).toBe('A');
    expect(verdict.title).toBe('Almost Worthy');
    expect(verdict.averageScore).toBeGreaterThanOrEqual(75);
    expect(verdict.averageScore).toBeLessThan(92);
  });

  it('calculateFinalVerdict returns B rank for average 50-74', () => {
    const verdict = calculateFinalVerdict([55, 60, 50, 65]);
    expect(verdict.rank).toBe('B');
    expect(verdict.title).toBe('Mediocre');
    expect(verdict.averageScore).toBeGreaterThanOrEqual(50);
    expect(verdict.averageScore).toBeLessThan(75);
  });

  it('calculateFinalVerdict returns F rank for average < 50', () => {
    const verdict = calculateFinalVerdict([10, 20, 30, 40]);
    expect(verdict.rank).toBe('F');
    expect(verdict.title).toBe('Unacceptable');
    expect(verdict.averageScore).toBeLessThan(50);
  });

  it('calculateFinalVerdict correctly averages scores', () => {
    // [100, 0, 100, 0] averages to 50 → B rank
    const verdict = calculateFinalVerdict([100, 0, 100, 0]);
    expect(verdict.averageScore).toBe(50);
    expect(verdict.rank).toBe('B');
  });

  describe('calculateFinalVerdict with demandBonus', () => {
    it('adds demandBonus to average score', () => {
      // Average of [80, 80, 80, 80] = 80, +15 = 95 → S rank
      const verdict = calculateFinalVerdict([80, 80, 80, 80], 15);
      expect(verdict.averageScore).toBe(95);
      expect(verdict.rank).toBe('S');
    });

    it('negative demandBonus lowers rank', () => {
      // Average of [80, 80, 80, 80] = 80, -35 = 45 → F rank
      const verdict = calculateFinalVerdict([80, 80, 80, 80], -35);
      expect(verdict.averageScore).toBe(45);
      expect(verdict.rank).toBe('F');
    });

    it('clamps score to 0 minimum', () => {
      // Average of [10, 10, 10, 10] = 10, -50 = clamped to 0
      const verdict = calculateFinalVerdict([10, 10, 10, 10], -50);
      expect(verdict.averageScore).toBe(0);
      expect(verdict.rank).toBe('F');
    });

    it('clamps score to 100 maximum', () => {
      // Average of [95, 95, 95, 95] = 95, +30 = clamped to 100
      const verdict = calculateFinalVerdict([95, 95, 95, 95], 30);
      expect(verdict.averageScore).toBe(100);
      expect(verdict.rank).toBe('S');
    });

    it('behaves the same as no bonus when demandBonus is undefined', () => {
      const withoutBonus = calculateFinalVerdict([70, 70, 70, 70]);
      const withUndefined = calculateFinalVerdict([70, 70, 70, 70], undefined);
      expect(withoutBonus).toEqual(withUndefined);
    });

    it('zero demandBonus does not change the score', () => {
      const verdict = calculateFinalVerdict([75, 75, 75, 75], 0);
      expect(verdict.averageScore).toBe(75);
      expect(verdict.rank).toBe('A');
    });
  });
});
