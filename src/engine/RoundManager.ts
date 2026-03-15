/**
 * @module RoundManager
 * Manages the multi-round gameplay loop with C(12,3) ingredient combination
 * tracking to ensure variety across rounds. Provides combo deduplication,
 * difficulty-to-rounds mapping, escape conditions, and reaction quips.
 */
import type {DifficultyTier} from './DifficultyConfig';
import {INGREDIENT_MODELS} from './Ingredients';

/** Total ingredients in the full pool (20 defined). */
export const POOL_SIZE = INGREDIENT_MODELS.length;

/** Number of ingredients the player selects per round. */
export const PICKS_PER_ROUND = 3;

/**
 * Generate all C(n, k) combinations of indices [0..n-1].
 */
function generateAllCombos(ids: string[], k: number): string[][] {
  const combos: string[][] = [];
  const n = ids.length;

  function backtrack(start: number, current: string[]) {
    if (current.length === k) {
      combos.push([...current].sort());
      return;
    }
    for (let i = start; i < n; i++) {
      current.push(ids[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return combos;
}

const ALL_COMBOS: string[][] = generateAllCombos(
  INGREDIENT_MODELS.map(i => i.id),
  PICKS_PER_ROUND,
);

/**
 * Checks whether a given ingredient combo has already been used this session.
 * @param combo - Array of ingredient IDs (will be sorted internally).
 * @param usedCombos - Previously used combos from the store.
 * @returns `true` if an identical sorted combo exists in `usedCombos`.
 */
export function isComboUsed(combo: string[], usedCombos: string[][]): boolean {
  const sorted = [...combo].sort();
  return usedCombos.some(used => {
    const sortedUsed = [...used].sort();
    return sortedUsed.length === sorted.length && sortedUsed.every((id, i) => id === sorted[i]);
  });
}

/**
 * Returns all valid ingredient combos that have not yet been used this session.
 * @param usedCombos - Previously used combos from the store.
 * @returns Remaining unused combos from the full C(n, PICKS_PER_ROUND) pool.
 */
export function getAvailableCombos(usedCombos: string[][]): string[][] {
  return ALL_COMBOS.filter(combo => !isComboUsed(combo, usedCombos));
}

/**
 * Deterministically picks the next combo to display in the fridge.
 * Returns the first unused combo, or rolls over to the first combo if all are exhausted.
 * @param usedCombos - Previously used combos from the store.
 * @returns The next ingredient ID combo for the player to see.
 */
export function getNextCombo(usedCombos: string[][]): string[] {
  const available = getAvailableCombos(usedCombos);
  if (available.length === 0) return ALL_COMBOS[0]; // Roll over if somehow exhausted
  return available[0];
}

/**
 * Maps a difficulty tier to the number of rounds the player must survive.
 * @param tier - The selected difficulty tier.
 * @returns Total rounds: rare/medium-rare=3, medium=5, medium-well=7, well-done=10.
 */
export function calculateTotalRounds(tier: DifficultyTier): number {
  switch (tier.id) {
    case 'rare':
    case 'medium-rare':
      return 3;
    case 'medium':
      return 5;
    case 'medium-well':
      return 7;
    case 'well-done':
      return 10;
    default:
      return 5;
  }
}

/**
 * Checks whether the player has completed enough rounds to trigger the escape sequence.
 * @param currentRound - The round the player just finished (1-indexed).
 * @param totalRounds - Total rounds required for this difficulty.
 * @returns `true` if the player has earned escape.
 */
export function shouldEscape(currentRound: number, totalRounds: number): boolean {
  return currentRound >= totalRounds && currentRound > 0;
}

/**
 * Returns a personalized Mr. Sausage quip based on the player's average score history.
 * @param scores - Array of per-round scores (0-100).
 * @returns A taunting string for the round transition screen.
 */
export function getRoundReactionQuip(scores: number[]): string {
  if (scores.length === 0) return 'Get to work.';
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avg >= 90) return 'Adequate. BARELY.';
  if (avg >= 75) return "You're improving. Don't get comfortable.";
  if (avg >= 50) return 'Mediocre sausage for a mediocre worker.';
  return 'Disgusting. Do it again.';
}
