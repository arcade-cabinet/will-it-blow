import type {DifficultyTier} from '../DifficultyConfig';
import {INGREDIENTS} from '../Ingredients';
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
  it('POOL_SIZE matches INGREDIENTS length', () => {
    expect(POOL_SIZE).toBe(INGREDIENTS.length);
    // C(n, 3) combos — actual count verified against INGREDIENTS array length
    expect(POOL_SIZE).toBe(26);
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
    const used = [['Apple', 'Banana', 'Cherry']];
    expect(isComboUsed(['Apple', 'Banana', 'Cherry'], used)).toBe(true);
  });

  it('returns true regardless of input order (sorts internally)', () => {
    const used = [['Apple', 'Banana', 'Cherry']];
    expect(isComboUsed(['Cherry', 'Apple', 'Banana'], used)).toBe(true);
  });

  it('returns false when combo is not in usedCombos', () => {
    const used = [['Apple', 'Banana', 'Cherry']];
    expect(isComboUsed(['Apple', 'Banana', 'Date'], used)).toBe(false);
  });

  it('handles multiple used combos', () => {
    const used = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I'],
    ];
    expect(isComboUsed(['D', 'E', 'F'], used)).toBe(true);
    expect(isComboUsed(['G', 'H', 'I'], used)).toBe(true);
    expect(isComboUsed(['A', 'B', 'D'], used)).toBe(false);
  });

  it('does not match subsets', () => {
    const used = [['A', 'B', 'C']];
    // Only 2 elements — different length, should not match
    expect(isComboUsed(['A', 'B'], used)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAvailableCombos
// ---------------------------------------------------------------------------

describe('getAvailableCombos', () => {
  it('returns all C(26,3) = 2600 combos when nothing is used', () => {
    // C(26,3) = 26*25*24 / (3*2*1) = 2600
    const combos = getAvailableCombos([]);
    expect(combos).toHaveLength(2600);
  });

  it('excludes used combos', () => {
    const firstCombo = getAvailableCombos([])[0];
    const remaining = getAvailableCombos([firstCombo]);
    expect(remaining).toHaveLength(2599);
    expect(remaining.some(c => c.join(',') === firstCombo.join(','))).toBe(false);
  });

  it('returns only sorted combos', () => {
    const combos = getAvailableCombos([]);
    for (const combo of combos.slice(0, 50)) {
      const sorted = [...combo].sort();
      expect(combo).toEqual(sorted);
    }
  });

  it('returns empty array when all combos are used (validates exhaustion logic)', () => {
    // Pass every combo as used — remaining should be empty
    const all = getAvailableCombos([]);
    const remaining = getAvailableCombos(all);
    expect(remaining).toHaveLength(0);
  });

  it('each combo uses valid ingredient names from INGREDIENTS', () => {
    const names = new Set(INGREDIENTS.map(i => i.name));
    const combos = getAvailableCombos([]);
    for (const combo of combos.slice(0, 20)) {
      for (const name of combo) {
        expect(names.has(name)).toBe(true);
      }
    }
  });

  it('each combo has exactly PICKS_PER_ROUND elements', () => {
    const combos = getAvailableCombos([]);
    for (const combo of combos.slice(0, 50)) {
      expect(combo).toHaveLength(PICKS_PER_ROUND);
    }
  });

  it('no duplicate combos in the full list', () => {
    const combos = getAvailableCombos([]);
    const keys = new Set(combos.map(c => c.join('|')));
    expect(keys.size).toBe(combos.length);
  });

  it('removing 10 combos leaves 2590', () => {
    const all = getAvailableCombos([]);
    const used = all.slice(0, 10);
    const remaining = getAvailableCombos(used);
    expect(remaining).toHaveLength(2590);
  });
});

// ---------------------------------------------------------------------------
// calculateTotalRounds
// ---------------------------------------------------------------------------

describe('calculateTotalRounds', () => {
  it('rare → 3 rounds', () => {
    expect(calculateTotalRounds(makeTier('rare'))).toBe(3);
  });

  it('medium-rare → 3 rounds', () => {
    expect(calculateTotalRounds(makeTier('medium-rare'))).toBe(3);
  });

  it('medium → 5 rounds', () => {
    expect(calculateTotalRounds(makeTier('medium'))).toBe(5);
  });

  it('medium-well → 7 rounds', () => {
    expect(calculateTotalRounds(makeTier('medium-well'))).toBe(7);
  });

  it('well-done → 10 rounds', () => {
    expect(calculateTotalRounds(makeTier('well-done'))).toBe(10);
  });

  it('unknown difficulty falls back to 5', () => {
    expect(calculateTotalRounds(makeTier('unknown-tier'))).toBe(5);
  });

  it('total rounds increases with difficulty (rare <= medium <= well-done)', () => {
    const rare = calculateTotalRounds(makeTier('rare'));
    const medium = calculateTotalRounds(makeTier('medium'));
    const wellDone = calculateTotalRounds(makeTier('well-done'));
    expect(rare).toBeLessThanOrEqual(medium);
    expect(medium).toBeLessThanOrEqual(wellDone);
  });
});

// ---------------------------------------------------------------------------
// shouldEscape
// ---------------------------------------------------------------------------

describe('shouldEscape', () => {
  it('returns false when current round is less than total', () => {
    expect(shouldEscape(1, 5)).toBe(false);
    expect(shouldEscape(4, 5)).toBe(false);
    expect(shouldEscape(2, 3)).toBe(false);
  });

  it('returns true when current round equals total', () => {
    expect(shouldEscape(5, 5)).toBe(true);
    expect(shouldEscape(3, 3)).toBe(true);
    expect(shouldEscape(10, 10)).toBe(true);
  });

  it('returns true when current round exceeds total (defensive)', () => {
    expect(shouldEscape(6, 5)).toBe(true);
    expect(shouldEscape(11, 10)).toBe(true);
  });

  it('returns false for round 0 with any positive total', () => {
    expect(shouldEscape(0, 3)).toBe(false);
    expect(shouldEscape(0, 10)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRoundReactionQuip
// ---------------------------------------------------------------------------

describe('getRoundReactionQuip', () => {
  it('returns a string for empty scores', () => {
    expect(typeof getRoundReactionQuip([])).toBe('string');
  });

  it('returns praise-adjacent quip for average >= 90', () => {
    const quip = getRoundReactionQuip([95, 92, 91]);
    expect(quip).toBe('Adequate. BARELY.');
  });

  it('returns improvement quip for average 75-89', () => {
    const quip = getRoundReactionQuip([80, 75, 85]);
    expect(quip).toBe("You're improving. Don't get comfortable.");
  });

  it('returns mediocre quip for average 50-74', () => {
    const quip = getRoundReactionQuip([60, 55, 65]);
    expect(quip).toBe('Mediocre sausage for a mediocre worker.');
  });

  it('returns disgust quip for average below 50', () => {
    const quip = getRoundReactionQuip([20, 30, 40]);
    expect(quip).toBe('Disgusting. Do it again.');
  });

  it('works with a single score', () => {
    expect(typeof getRoundReactionQuip([100])).toBe('string');
    expect(typeof getRoundReactionQuip([0])).toBe('string');
  });
});
