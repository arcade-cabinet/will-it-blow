/**
 * @module SausagePhysics
 * Pure scoring functions for each phase of sausage production.
 * All functions are side-effect free and return integer scores.
 * Randomness is intentional — simulates the unpredictability of sausage-making.
 */

import type {Ingredient} from './Ingredients';

/**
 * Calculates the "Blow Ruffalos" score — how much explosive energy the
 * sausage builds up when blown into the casing.
 *
 * The score is driven by hold duration (capped at 3 seconds) scaled by
 * the average blowPower of the chosen ingredients, with slight randomness.
 *
 * @param holdDurationSec - How long the player held the blow action (seconds)
 * @param ingredients - The ingredients selected for this sausage
 * @returns Integer score 0-5 (higher = more explosive power)
 *
 * @example
 * // High blow-power ingredients + long hold = max ruffalos
 * calculateBlowRuffalos(3.0, [waterIngredient]) // likely 5
 * // Empty ingredients always returns 0
 * calculateBlowRuffalos(3.0, []) // 0
 */
export function calculateBlowRuffalos(holdDurationSec: number, ingredients: Ingredient[]): number {
  if (ingredients.length === 0) return 0;
  const avgBlow = ingredients.reduce((a, i) => a + i.blowPower, 0) / ingredients.length;
  const dur = Math.min(holdDurationSec, 3);
  const pow = Math.min((dur / 3) * avgBlow + Math.random() * 1.5, 5);
  return Math.round(Math.max(0, Math.min(5, pow)));
}

/**
 * Determines whether the sausage casing bursts during cooking.
 *
 * Each ingredient has a `burstRisk` (0-1 probability). The average
 * risk across all ingredients is used as the probability threshold
 * for a random burst check. High-risk ingredients like Water (0.9)
 * or A Shoe (0.8) make bursting almost inevitable.
 *
 * @param ingredients - The ingredients in the sausage
 * @returns `true` if the casing burst (bad outcome), `false` if it held
 */
export function checkBurst(ingredients: Ingredient[]): boolean {
  if (ingredients.length === 0) return false;
  const avgRisk = ingredients.reduce((a, i) => a + i.burstRisk, 0) / ingredients.length;
  return Math.random() < avgRisk;
}

/**
 * Calculates the taste rating for the finished sausage.
 *
 * Formula: 60% tasteMod average + 40% textureMod average, with a -0.5
 * penalty if the casing burst and random jitter of +/-0.75.
 * Absurd ingredients (tasteMod 0) drag the average down hard.
 *
 * @param ingredients - The ingredients used in the sausage
 * @param hasBurst - Whether the casing burst during cooking (applies penalty)
 * @returns Integer score 0-5 where 5 is gourmet perfection
 */
export function calculateTasteRating(ingredients: Ingredient[], hasBurst: boolean): number {
  if (ingredients.length === 0) return 0;
  const avgTaste = ingredients.reduce((a, i) => a + i.tasteMod, 0) / ingredients.length;
  const avgTexture = ingredients.reduce((a, i) => a + i.textureMod, 0) / ingredients.length;
  let base = avgTaste * 0.6 + avgTexture * 0.4;
  if (hasBurst) base -= 0.5;
  base += (Math.random() - 0.5) * 1.5;
  return Math.round(Math.max(0, Math.min(5, base)));
}

/**
 * Computes the overall final score from all sausage-making outcomes.
 *
 * Scoring breakdown:
 * - Taste:    sausageRating / 5 * 60  (max 60 points)
 * - Blow:     ruffalos / 5 * 20       (max 20 points)
 * - No-burst: +20 points if casing didn't burst, 0 otherwise
 * - Bonus:    additional points from challenge performance
 *
 * @param sausageRating - Taste rating from calculateTasteRating (0-5)
 * @param ruffalos - Blow score from calculateBlowRuffalos (0-5)
 * @param hasBurst - Whether the casing burst (forfeits 20 burst-bonus points)
 * @param bonusPoints - Extra points from challenge-specific performance
 * @returns Final score clamped to 0-100
 */
export function calculateFinalScore(
  sausageRating: number,
  ruffalos: number,
  hasBurst: boolean,
  bonusPoints: number,
): number {
  const tasteScore = (sausageRating / 5) * 60;
  const blowScore = (ruffalos / 5) * 20;
  const burstBonus = hasBurst ? 0 : 20;
  return Math.min(Math.round(tasteScore + blowScore + burstBonus + bonusPoints), 100);
}

/**
 * Maps a final score (0-100) to a title tier string.
 *
 * Tiers (each spans 20 points):
 * - 0-19:   "Sausage Disaster"
 * - 20-39:  "Sausage Apprentice"
 * - 40-59:  "Sausage Maker"
 * - 60-79:  "Sausage Chef"
 * - 80-99:  "Sausage Master"
 * - 100:    "THE SAUSAGE KING"
 *
 * @param score - Final score from calculateFinalScore (0-100)
 * @returns Human-readable title tier string
 */
export function getTitleTier(score: number): string {
  const tiers = [
    'Sausage Disaster',
    'Sausage Apprentice',
    'Sausage Maker',
    'Sausage Chef',
    'Sausage Master',
    'THE SAUSAGE KING',
  ];
  return tiers[Math.min(Math.floor(score / 20), 5)];
}
