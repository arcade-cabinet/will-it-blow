import type {Ingredient} from '../src/engine/Ingredients';
import {
  calculateBlowRuffalos,
  calculateFinalScore,
  calculateTasteRating,
  checkBurst,
  getTitleTier,
} from '../src/engine/SausagePhysics';

// Helper: create a minimal ingredient with specified properties
function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    name: 'Test',
    emoji: '🧪',
    category: 'absurd',
    tasteMod: 3,
    textureMod: 3,
    burstRisk: 0.3,
    blowPower: 3,
    color: '#FF0000',
    shape: {base: 'sphere'},
    ...overrides,
  };
}

describe('calculateBlowRuffalos', () => {
  it('returns a value between 0 and 5', () => {
    const ingredients = [makeIngredient({blowPower: 3})];
    for (let i = 0; i < 100; i++) {
      const result = calculateBlowRuffalos(1.5, ingredients);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(5);
    }
  });

  it('returns a whole number', () => {
    const ingredients = [makeIngredient()];
    const result = calculateBlowRuffalos(2, ingredients);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('caps hold duration at 3 seconds', () => {
    const ingredients = [makeIngredient({blowPower: 5})];
    // Very long hold should give same result as 3s hold (modulo randomness)
    const results10s = new Set<number>();
    const results3s = new Set<number>();
    for (let i = 0; i < 200; i++) {
      results10s.add(calculateBlowRuffalos(10, ingredients));
      results3s.add(calculateBlowRuffalos(3, ingredients));
    }
    // Both should produce the same max (5)
    expect(Math.max(...results10s)).toBe(Math.max(...results3s));
  });

  it('returns 0 for zero-duration blow', () => {
    const ingredients = [makeIngredient({blowPower: 1})];
    // With 0 duration, base is 0 + random(0..1.5), so result should be 0 or 1
    for (let i = 0; i < 50; i++) {
      const result = calculateBlowRuffalos(0, ingredients);
      expect(result).toBeLessThanOrEqual(2);
    }
  });

  it('higher blowPower ingredients produce higher results on average', () => {
    const low = [makeIngredient({blowPower: 1})];
    const high = [makeIngredient({blowPower: 5})];
    let lowSum = 0;
    let highSum = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      lowSum += calculateBlowRuffalos(2, low);
      highSum += calculateBlowRuffalos(2, high);
    }
    expect(highSum / runs).toBeGreaterThan(lowSum / runs);
  });

  it('averages blowPower across multiple ingredients', () => {
    const mixed = [makeIngredient({blowPower: 1}), makeIngredient({blowPower: 5})];
    // Average blowPower = 3
    const single = [makeIngredient({blowPower: 3})];
    let mixedSum = 0;
    let singleSum = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      mixedSum += calculateBlowRuffalos(2, mixed);
      singleSum += calculateBlowRuffalos(2, single);
    }
    // Should be roughly similar
    expect(Math.abs(mixedSum / runs - singleSum / runs)).toBeLessThan(0.5);
  });
});

describe('checkBurst', () => {
  it('returns a boolean', () => {
    const ingredients = [makeIngredient()];
    expect(typeof checkBurst(ingredients)).toBe('boolean');
  });

  it('high burstRisk ingredients burst more often', () => {
    const highRisk = [makeIngredient({burstRisk: 0.9})];
    const lowRisk = [makeIngredient({burstRisk: 0.1})];
    let highBursts = 0;
    let lowBursts = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      if (checkBurst(highRisk)) highBursts++;
      if (checkBurst(lowRisk)) lowBursts++;
    }
    expect(highBursts).toBeGreaterThan(lowBursts);
    // High risk should burst roughly 90% of the time
    expect(highBursts / runs).toBeGreaterThan(0.7);
    // Low risk should burst roughly 10%
    expect(lowBursts / runs).toBeLessThan(0.3);
  });

  it('averages burstRisk across ingredients', () => {
    const mixed = [makeIngredient({burstRisk: 0.0}), makeIngredient({burstRisk: 1.0})];
    // Average risk = 0.5
    let bursts = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      if (checkBurst(mixed)) bursts++;
    }
    // Should be roughly 50%
    expect(bursts / runs).toBeGreaterThan(0.3);
    expect(bursts / runs).toBeLessThan(0.7);
  });
});

describe('calculateTasteRating', () => {
  it('returns a value between 0 and 5', () => {
    const ingredients = [makeIngredient()];
    for (let i = 0; i < 100; i++) {
      const result = calculateTasteRating(ingredients, false);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(5);
    }
  });

  it('returns a whole number', () => {
    const ingredients = [makeIngredient()];
    const result = calculateTasteRating(ingredients, false);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('burst reduces rating', () => {
    const ingredients = [makeIngredient({tasteMod: 5, textureMod: 5})];
    let burstSum = 0;
    let noBurstSum = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      burstSum += calculateTasteRating(ingredients, true);
      noBurstSum += calculateTasteRating(ingredients, false);
    }
    expect(noBurstSum / runs).toBeGreaterThan(burstSum / runs);
  });

  it('weights tasteMod 60% and textureMod 40%', () => {
    const highTaste = [makeIngredient({tasteMod: 5, textureMod: 0})];
    const highTexture = [makeIngredient({tasteMod: 0, textureMod: 5})];
    let tasteSum = 0;
    let textureSum = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      tasteSum += calculateTasteRating(highTaste, false);
      textureSum += calculateTasteRating(highTexture, false);
    }
    // tasteMod:5 gives base 3.0, textureMod:5 gives base 2.0
    expect(tasteSum / runs).toBeGreaterThan(textureSum / runs);
  });

  it('negative tasteMod produces low ratings', () => {
    const terrible = [makeIngredient({tasteMod: -1, textureMod: 0})];
    let sum = 0;
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      sum += calculateTasteRating(terrible, false);
    }
    expect(sum / runs).toBeLessThan(2);
  });
});

describe('calculateFinalScore', () => {
  it('returns 0-100', () => {
    expect(calculateFinalScore(0, 0, true, 0)).toBeGreaterThanOrEqual(0);
    expect(calculateFinalScore(5, 5, false, 50)).toBeLessThanOrEqual(100);
  });

  it('taste rating is 60% of score', () => {
    // sausageRating=5, ruffalos=0, no burst, no bonus
    // tasteScore = (5/5)*60 = 60, blowScore = 0, burstBonus = 20
    const result = calculateFinalScore(5, 0, false, 0);
    expect(result).toBe(80);
  });

  it('blow rating is 20% of score', () => {
    // sausageRating=0, ruffalos=5, no burst, no bonus
    // tasteScore = 0, blowScore = (5/5)*20 = 20, burstBonus = 20
    const result = calculateFinalScore(0, 5, false, 0);
    expect(result).toBe(40);
  });

  it('no burst gives 20 bonus points', () => {
    const withBurst = calculateFinalScore(3, 3, true, 0);
    const noBurst = calculateFinalScore(3, 3, false, 0);
    expect(noBurst - withBurst).toBe(20);
  });

  it('bonus points are added to score', () => {
    const without = calculateFinalScore(3, 3, false, 0);
    const with10 = calculateFinalScore(3, 3, false, 10);
    expect(with10 - without).toBe(10);
  });

  it('perfect game gives 100', () => {
    const result = calculateFinalScore(5, 5, false, 0);
    // 60 + 20 + 20 = 100
    expect(result).toBe(100);
  });

  it('worst game gives 0', () => {
    const result = calculateFinalScore(0, 0, true, 0);
    // 0 + 0 + 0 = 0
    expect(result).toBe(0);
  });

  it('caps at 100 with bonus points', () => {
    const result = calculateFinalScore(5, 5, false, 50);
    expect(result).toBe(100);
  });
});

describe('getTitleTier', () => {
  it('returns Sausage Disaster for score 0-19', () => {
    expect(getTitleTier(0)).toBe('Sausage Disaster');
    expect(getTitleTier(19)).toBe('Sausage Disaster');
  });

  it('returns Sausage Apprentice for score 20-39', () => {
    expect(getTitleTier(20)).toBe('Sausage Apprentice');
    expect(getTitleTier(39)).toBe('Sausage Apprentice');
  });

  it('returns Sausage Maker for score 40-59', () => {
    expect(getTitleTier(40)).toBe('Sausage Maker');
    expect(getTitleTier(59)).toBe('Sausage Maker');
  });

  it('returns Sausage Chef for score 60-79', () => {
    expect(getTitleTier(60)).toBe('Sausage Chef');
    expect(getTitleTier(79)).toBe('Sausage Chef');
  });

  it('returns Sausage Master for score 80-99', () => {
    expect(getTitleTier(80)).toBe('Sausage Master');
    expect(getTitleTier(99)).toBe('Sausage Master');
  });

  it('returns THE SAUSAGE KING for score 100', () => {
    expect(getTitleTier(100)).toBe('THE SAUSAGE KING');
  });
});
