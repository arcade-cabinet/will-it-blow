/**
 * @module RoundManager
 * Pure functions for multi-round gameplay loop management.
 *
 * No React, no store imports — all logic is deterministic and testable
 * in isolation. Consumers (store actions, UI components) call these
 * functions and write results back to Zustand themselves.
 *
 * The full ingredient pool has 26 items; each round picks 3.
 * Total unique combos = C(26,3) = 2600, but the fridge only shows 12
 * at a time, so in practice the playable combo space per session is
 * C(12,3) = 220.
 */

import type {DifficultyTier} from './DifficultyConfig';
import {INGREDIENT_MODELS} from './Ingredients';

/** Total ingredients in the full pool (26 — Ingredients.ts header says 25 but 26 are defined). */
const POOL_SIZE = INGREDIENT_MODELS.length;

/** Number of ingredients the player selects per round. */
const PICKS_PER_ROUND = 3;

/**
 * Generate all C(n, k) combinations of indices [0..n-1].
 * Returns each combo as a sorted array of ingredient names.
 *
 * @param names - The full list of ingredient names to combine
 * @param k - Number of items to pick per combo
 */
function generateAllCombos(names: string[], k: number): string[][] {
  const combos: string[][] = [];
  const n = names.length;

  function backtrack(start: number, current: string[]) {
    if (current.length === k) {
      combos.push([...current].sort());
      return;
    }
    for (let i = start; i < n; i++) {
      current.push(names[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return combos;
}

/** All C(25,3) = 2300 unique sorted combos from the full ingredient pool. */
const ALL_COMBOS: string[][] = generateAllCombos(
  INGREDIENT_MODELS.map((i: any) => i.id),
  PICKS_PER_ROUND,
);

/**
 * Check whether a given sorted combo has already been used.
 * Comparison is done on sorted arrays so order does not matter.
 *
 * @param combo - The candidate combo (will be sorted internally)
 * @param usedCombos - Previously used combos (each already sorted)
 * @returns true if the combo is in usedCombos
 */
export function isComboUsed(combo: string[], usedCombos: string[][]): boolean {
  const sorted = [...combo].sort();
  return usedCombos.some(
    used => used.length === sorted.length && used.every((name, i) => name === sorted[i]),
  );
}

/**
 * Return all valid combos that have not yet been used this session.
 * Source pool is the full C(25,3) = 2300 combos, not just the 12-item
 * fridge pool — the fridge pool is re-rolled each round from whatever
 * combos remain available.
 *
 * @param usedCombos - Sorted combos already played this session
 * @returns Remaining unused combos (may be empty if all exhausted)
 */
export function getAvailableCombos(usedCombos: string[][]): string[][] {
  return ALL_COMBOS.filter(combo => !isComboUsed(combo, usedCombos));
}

/**
 * Determine the total number of rounds for this game session based on
 * difficulty. More forgiving difficulties get fewer rounds (shorter game);
 * brutal difficulties extend the loop to increase ingredient variation
 * pressure.
 *
 * Scaling:
 *  - rare        → 3 rounds
 *  - medium-rare → 3 rounds
 *  - medium      → 5 rounds
 *  - medium-well → 7 rounds
 *  - well-done   → 10 rounds
 *
 * @param difficulty - The active difficulty tier
 * @returns Total rounds for the session
 */
export function calculateTotalRounds(difficulty: DifficultyTier): number {
  switch (difficulty.id) {
    case 'rare':
      return 3;
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
 * Determine whether the player has completed all required rounds and
 * should trigger the escape sequence.
 *
 * @param currentRound - 1-indexed current round number (after completing it)
 * @param totalRounds - Total rounds required for this session
 * @returns true when currentRound >= totalRounds (all rounds done)
 */
export function shouldEscape(currentRound: number, totalRounds: number): boolean {
  return currentRound >= totalRounds;
}

/**
 * Generate a reaction quip from Mr. Sausage based on average round score.
 * Used by RoundTransition to show performance feedback between rounds.
 *
 * @param scores - Array of challenge scores (0-100) from the completed round
 * @returns A Mr. Sausage quip string
 */
export function getRoundReactionQuip(scores: number[]): string {
  if (scores.length === 0) return 'Hmm.';
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avg >= 90) return 'Adequate. BARELY.';
  if (avg >= 75) return "You're improving. Don't get comfortable.";
  if (avg >= 50) return 'Mediocre sausage for a mediocre worker.';
  return 'Disgusting. Do it again.';
}

// Export pool size for tests
export {POOL_SIZE, PICKS_PER_ROUND};
