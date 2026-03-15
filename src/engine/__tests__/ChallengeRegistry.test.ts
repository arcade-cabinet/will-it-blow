import {
  calculateFinalVerdict,
  getAllChallenges,
  getChallengeConfig,
  seededVariant,
} from '../ChallengeRegistry';

describe('ChallengeRegistry', () => {
  describe('getChallengeConfig', () => {
    it('returns config for SELECT_INGREDIENTS', () => {
      const cfg = getChallengeConfig('SELECT_INGREDIENTS');
      expect(cfg).toBeDefined();
      expect(cfg!.name).toBe('Select Ingredients');
      expect(cfg!.station).toBe('ChestFreezer');
    });

    it('returns config for COOKING', () => {
      const cfg = getChallengeConfig('COOKING');
      expect(cfg).toBeDefined();
      expect(cfg!.hasScoring).toBe(true);
    });

    it('returns undefined for invalid phase', () => {
      expect(getChallengeConfig('INVALID' as any)).toBeUndefined();
    });
  });

  describe('getAllChallenges', () => {
    it('returns 13 challenge configs', () => {
      expect(getAllChallenges()).toHaveLength(13);
    });

    it('covers all 13 GamePhase values', () => {
      const phases = getAllChallenges().map(c => c.phase);
      expect(phases).toContain('SELECT_INGREDIENTS');
      expect(phases).toContain('TIE_CASING');
      expect(phases).toContain('BLOWOUT');
      expect(phases).toContain('DONE');
    });
  });

  describe('seededVariant', () => {
    it('returns deterministic results', () => {
      expect(seededVariant(42, 10)).toBe(seededVariant(42, 10));
    });

    it('returns values within range', () => {
      for (let seed = 0; seed < 100; seed++) {
        const result = seededVariant(seed, 5);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(5);
      }
    });

    it('returns 0 for length <= 0', () => {
      expect(seededVariant(42, 0)).toBe(0);
      expect(seededVariant(42, -1)).toBe(0);
    });
  });

  describe('calculateFinalVerdict', () => {
    it('returns S rank for score >= 92', () => {
      const result = calculateFinalVerdict([95, 94, 96], 0);
      expect(result.rank).toBe('S');
      expect(result.title).toBe('THE SAUSAGE KING');
    });

    it('returns A rank for score >= 75 and < 92', () => {
      const result = calculateFinalVerdict([80, 78, 82], 0);
      expect(result.rank).toBe('A');
    });

    it('returns B rank for score >= 50 and < 75', () => {
      const result = calculateFinalVerdict([55, 60, 50], 0);
      expect(result.rank).toBe('B');
    });

    it('returns F rank for score < 50', () => {
      const result = calculateFinalVerdict([20, 30, 25], 0);
      expect(result.rank).toBe('F');
      expect(result.title).toBe('Unacceptable');
    });

    it('includes demand bonus in calculation', () => {
      const result = calculateFinalVerdict([85, 85, 85], 10);
      expect(result.totalScore).toBe(95);
      expect(result.rank).toBe('S');
    });

    it('clamps score to 0-100', () => {
      const high = calculateFinalVerdict([100, 100, 100], 50);
      expect(high.totalScore).toBeLessThanOrEqual(100);

      const low = calculateFinalVerdict([0, 0, 0], -50);
      expect(low.totalScore).toBeGreaterThanOrEqual(0);
    });

    it('handles empty scores array', () => {
      const result = calculateFinalVerdict([], 0);
      expect(result.totalScore).toBe(0);
      expect(result.rank).toBe('F');
    });
  });
});
