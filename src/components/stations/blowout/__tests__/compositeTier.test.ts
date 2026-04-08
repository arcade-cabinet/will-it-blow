/**
 * @module compositeTier.test
 * Contract tests for the composite-tier scoring function.
 *
 * Pins the tier thresholds and point values BEFORE the BlowoutStation
 * consumer is updated to use them. If a future tuning pass changes the
 * thresholds, these tests must be updated to match — they're the
 * source of truth for game balance.
 */
import {describe, expect, it} from 'vitest';
import type {CompositeMix} from '../../../../engine/IngredientComposition';
import {blowPotential, getCompositeTier} from '../compositeTier';

/** Factory for test mixes — fill in only what matters, zero everything else. */
function makeMix(overrides: Partial<CompositeMix> = {}): CompositeMix {
  return {
    color: '#444444',
    shine: 0,
    density: 0,
    moisture: 0,
    fat: 0,
    particleScale: 0.5,
    decompositionWeights: {chunks: 0, paste: 0, powder: 0, shards: 0, liquid: 0},
    sources: [],
    ...overrides,
  };
}

describe('blowPotential', () => {
  it('returns 0 for an empty mix', () => {
    expect(blowPotential(makeMix())).toBe(0);
  });

  it('weights density highest (0.5)', () => {
    const densityOnly = blowPotential(makeMix({density: 1}));
    const fatOnly = blowPotential(makeMix({fat: 1}));
    const moistureOnly = blowPotential(makeMix({moisture: 1}));
    expect(densityOnly).toBeGreaterThan(fatOnly);
    expect(fatOnly).toBeGreaterThan(moistureOnly);
  });

  it('clamps at 1 for maxed-out mix', () => {
    expect(blowPotential(makeMix({density: 1, fat: 1, moisture: 1}))).toBe(1);
  });
});

describe('getCompositeTier', () => {
  it('returns "massive" for high-quality mix', () => {
    const result = getCompositeTier(makeMix({density: 0.9, fat: 0.8, moisture: 0.7}));
    expect(result.tier).toBe('massive');
    expect(result.points).toBe(15);
    expect(result.reaction).toBe('excitement');
  });

  it('returns "clean" for mid-quality mix', () => {
    const result = getCompositeTier(makeMix({density: 0.6, fat: 0.4, moisture: 0.3}));
    expect(result.tier).toBe('clean');
    expect(result.points).toBe(10);
    expect(result.reaction).toBe('nod');
  });

  it('returns "weak" for low-quality mix', () => {
    const result = getCompositeTier(makeMix({density: 0.3, fat: 0.1, moisture: 0.1}));
    expect(result.tier).toBe('weak');
    expect(result.points).toBe(3);
    expect(result.reaction).toBe('disgust');
  });

  it('returns "dud" for empty/trash mix', () => {
    const result = getCompositeTier(makeMix({density: 0.05, fat: 0.05, moisture: 0.05}));
    expect(result.tier).toBe('dud');
    expect(result.points).toBe(0);
    expect(result.reaction).toBe('laugh');
  });

  it('power is always positive', () => {
    for (const d of [0, 0.3, 0.6, 1]) {
      const {power} = getCompositeTier(makeMix({density: d, fat: d, moisture: d}));
      expect(power).toBeGreaterThan(0);
    }
  });

  it('power increases with tier quality', () => {
    const dud = getCompositeTier(makeMix({density: 0}));
    const weak = getCompositeTier(makeMix({density: 0.3, fat: 0.1}));
    const clean = getCompositeTier(makeMix({density: 0.6, fat: 0.4, moisture: 0.3}));
    const massive = getCompositeTier(makeMix({density: 0.9, fat: 0.8, moisture: 0.7}));
    expect(massive.power).toBeGreaterThan(clean.power);
    expect(clean.power).toBeGreaterThan(weak.power);
    expect(weak.power).toBeGreaterThan(dud.power);
  });

  it('label matches tier name', () => {
    expect(getCompositeTier(makeMix({density: 1, fat: 1, moisture: 1})).label).toBe(
      'MASSIVE EXPLOSION',
    );
    expect(getCompositeTier(makeMix()).label).toBe('DUD');
  });
});
