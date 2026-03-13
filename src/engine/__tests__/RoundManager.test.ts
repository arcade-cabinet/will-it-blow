import type {DifficultyTier} from '../DifficultyConfig';
import {INGREDIENT_MODELS} from '../Ingredients';
import {
  calculateTotalRounds,
  getAvailableCombos,
  getRoundReactionQuip,
  isComboUsed,
  PICKS_PER_ROUND,
  POOL_SIZE,
  shouldEscape,
} from '../RoundManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTier(id: string): DifficultyTier {
  return {
    id,
    name: id,
    color: '#fff',
    hints: 2,
    timePressure: 1,
    maxStrikes: 3,
    permadeath: false,
    hiddenObjects: 'none',
    cleanup: false,
    assembly: false,
    enemyChance: 0,
  };
}

// ---------------------------------------------------------------------------
// Pool constants
// ---------------------------------------------------------------------------

describe('pool constants', () => {
  it('POOL_SIZE matches INGREDIENT_MODELS length', () => {
    expect(POOL_SIZE).toBe(INGREDIENT_MODELS.length);
    expect(POOL_SIZE).toBe(20);
  });

  it('PICKS_PER_ROUND is 3', () => {
    expect(PICKS_PER_ROUND).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// isComboUsed
// ---------------------------------------------------------------------------

describe('isComboUsed', () => {
  it('returns false when usedCombos is empty', () => {
    expect(isComboUsed(['A', 'B', 'C'], [])).toBe(false);
  });

  it('returns true for an exact match', () => {
    const used = [['banana', 'bacon', 'meds']];
    expect(isComboUsed(['banana', 'bacon', 'meds'], used)).toBe(true);
  });

  it('returns true regardless of input order (sorts internally)', () => {
    const used = [['banana', 'bacon', 'meds']];
    expect(isComboUsed(['meds', 'banana', 'bacon'], used)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getAvailableCombos
// ---------------------------------------------------------------------------

describe('getAvailableCombos', () => {
  it('returns all C(20,3) = 1140 combos when nothing is used', () => {
    // C(20,3) = 20*19*18 / (3*2*1) = 1140
    const combos = getAvailableCombos([]);
    expect(combos).toHaveLength(1140);
  });

  it('excludes used combos', () => {
    const firstCombo = getAvailableCombos([])[0];
    const remaining = getAvailableCombos([firstCombo]);
    expect(remaining).toHaveLength(1139);
  });

  it('each combo uses valid ingredient IDs from INGREDIENT_MODELS', () => {
    const ids = new Set(INGREDIENT_MODELS.map(i => i.id));
    const combos = getAvailableCombos([]);
    for (const combo of combos.slice(0, 20)) {
      for (const id of combo) {
        expect(ids.has(id)).toBe(true);
      }
    }
  });

  it('removing 10 combos leaves 1130', () => {
    const all = getAvailableCombos([]);
    const used = all.slice(0, 10);
    const remaining = getAvailableCombos(used);
    expect(remaining).toHaveLength(1130);
  });
});

// ---------------------------------------------------------------------------
// calculateTotalRounds
// ---------------------------------------------------------------------------

describe('calculateTotalRounds', () => {
  it('rare → 3 rounds', () => {
    expect(calculateTotalRounds(makeTier('rare'))).toBe(3);
  });

  it('well-done → 10 rounds', () => {
    expect(calculateTotalRounds(makeTier('well-done'))).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// shouldEscape
// ---------------------------------------------------------------------------

describe('shouldEscape', () => {
  it('returns false when current round is less than total', () => {
    expect(shouldEscape(1, 5)).toBe(false);
  });

  it('returns true when current round equals total', () => {
    expect(shouldEscape(5, 5)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRoundReactionQuip
// ---------------------------------------------------------------------------

describe('getRoundReactionQuip', () => {
  it('returns praise-adjacent quip for average >= 90', () => {
    const quip = getRoundReactionQuip([95, 92, 91]);
    expect(quip).toBe('Adequate. BARELY.');
  });

  it('returns disgust quip for average below 50', () => {
    const quip = getRoundReactionQuip([20, 30, 40]);
    expect(quip).toBe('Disgusting. Do it again.');
  });
});
