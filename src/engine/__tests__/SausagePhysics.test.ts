import {describe, expect, it} from '@jest/globals';
import {
  calculateBlowRuffalos,
  calculateFinalScore,
  calculateTasteRating,
  getTitleTier,
} from '../SausagePhysics';

describe('SausagePhysics', () => {
  describe('calculateBlowRuffalos', () => {
    it('returns 0 for zero hold duration and no ingredients', () => {
      expect(calculateBlowRuffalos(0, [])).toBe(0);
    });

    it('increases with hold duration', () => {
      const short = calculateBlowRuffalos(1, ['banana']);
      const long = calculateBlowRuffalos(5, ['banana']);
      expect(long).toBeGreaterThan(short);
    });

    it('increases with high blow power ingredients', () => {
      const low = calculateBlowRuffalos(3, ['banana']); // blowPower 1
      const high = calculateBlowRuffalos(3, ['pepper']); // blowPower 4
      expect(high).toBeGreaterThan(low);
    });

    it('clamps to 0-100', () => {
      const result = calculateBlowRuffalos(20, ['pepper', 'arcade', 'ps1']);
      expect(result).toBeLessThanOrEqual(100);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateTasteRating', () => {
    it('returns a score based on ingredient taste/texture mods', () => {
      const result = calculateTasteRating(['steak', 'bacon', 'burger'], false);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('penalizes burst', () => {
      const noBurst = calculateTasteRating(['steak'], false);
      const burst = calculateTasteRating(['steak'], true);
      expect(burst).toBeLessThan(noBurst);
    });

    it('returns 0 for unknown ingredients', () => {
      const result = calculateTasteRating(['nonexistent'], false);
      expect(result).toBe(0);
    });
  });

  describe('calculateFinalScore', () => {
    it('combines taste, blow, burst, and bonus', () => {
      const result = calculateFinalScore(80, 70, 60, 10);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('clamps to 0-100', () => {
      expect(calculateFinalScore(100, 100, 100, 100)).toBeLessThanOrEqual(100);
      expect(calculateFinalScore(0, 0, 0, -100)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTitleTier', () => {
    it('returns S tier for >= 92', () => {
      expect(getTitleTier(92)).toBe('THE SAUSAGE KING');
      expect(getTitleTier(100)).toBe('THE SAUSAGE KING');
    });

    it('returns A tier for >= 75', () => {
      expect(getTitleTier(75)).toBe('Almost Worthy');
      expect(getTitleTier(91)).toBe('Almost Worthy');
    });

    it('returns B tier for >= 50', () => {
      expect(getTitleTier(50)).toBe('Mediocre');
    });

    it('returns F tier for < 50', () => {
      expect(getTitleTier(49)).toBe('Unacceptable');
      expect(getTitleTier(0)).toBe('Unacceptable');
    });
  });
});
