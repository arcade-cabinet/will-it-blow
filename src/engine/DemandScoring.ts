/**
 * @module DemandScoring
 * Compares player decisions against Mr. Sausage's hidden demands to compute
 * demand bonuses that adjust the final verdict score.
 *
 * Scoring formula:
 * 1. Base flavor (avgTaste * 10) + base texture (avgTexture * 5)
 * 2. +25 per desired tag hit, -30 per hated tag hit
 * 3. +40 for matching cook preference, -10 for mismatch
 * 4. +blowPower * 10 for explosive bonus
 * 5. Clamped to [0, 100]
 */
import {getIngredientById} from './Ingredients';

/** Target cook levels for each doneness preference. */
export const COOK_TARGETS = {
  rare: 0.15,
  medium: 0.45,
  'well-done': 0.75,
  charred: 0.95,
};

/**
 * Maps a continuous cook level to a discrete doneness label.
 * @param cookLevel - Normalized cook progress from 0.0 (raw) to 1.0 (charred).
 * @returns The doneness label: 'rare' (<0.25), 'medium' (<0.6), 'well-done' (<0.85), or 'charred'.
 */
export function getCookPreference(cookLevel: number): 'rare' | 'medium' | 'well-done' | 'charred' {
  if (cookLevel < 0.25) return 'rare';
  if (cookLevel < 0.6) return 'medium';
  if (cookLevel < 0.85) return 'well-done';
  return 'charred';
}

/**
 * Calculates the demand bonus by comparing the player's ingredient choices and
 * cooking result against Mr. Sausage's hidden preferences.
 *
 * @param demands - Mr. Sausage's desired/hated tags and cook preference for this round.
 * @param selectedIngredientIds - IDs of the ingredients the player chose.
 * @param finalCookLevel - Normalized cook level (0.0-1.0) when the player finished cooking.
 * @returns An object with `totalScore` (0-100) and a human-readable `breakdown` string.
 *
 * @example
 * ```ts
 * const result = calculateDemandBonus(
 *   { desiredTags: ['spicy', 'meat'], hatedTags: ['sweet'], cookPreference: 'medium' },
 *   ['bacon', 'jalapeno', 'pork'],
 *   0.5,
 * );
 * console.log(result.totalScore); // e.g. 78
 * ```
 */
export function calculateDemandBonus(
  demands: {desiredTags: string[]; hatedTags: string[]; cookPreference: string},
  selectedIngredientIds: string[],
  finalCookLevel: number,
) {
  if (!selectedIngredientIds || selectedIngredientIds.length === 0)
    return {totalScore: 0, breakdown: 'No ingredients selected.'};

  const ingredients = selectedIngredientIds
    .map(id => getIngredientById(id))
    .filter(i => i !== undefined) as any[];

  if (ingredients.length === 0) return {totalScore: 0, breakdown: 'No valid ingredients'};

  let score = 0;
  let breakdown = '';

  // 1. Evaluate Ingredient Match (Taste & Texture Base - Averaged)
  const avgTaste = ingredients.reduce((sum, i) => sum + i.tasteMod, 0) / ingredients.length;
  const avgTexture = ingredients.reduce((sum, i) => sum + i.textureMod, 0) / ingredients.length;

  score += avgTaste * 10;
  score += avgTexture * 5;
  breakdown += `Base Flavor: ${Math.round(avgTaste * 10)}\nBase Texture: ${Math.round(avgTexture * 5)}\n`;

  // 2. Check Mr. Sausage's Tags (Accumulated across all ingredients)
  const allTags = ingredients.flatMap(i => i.tags);
  const hitDesired = demands.desiredTags.filter(tag => allTags.includes(tag));
  const hitHated = demands.hatedTags.filter(tag => allTags.includes(tag));

  if (hitDesired.length > 0) {
    score += hitDesired.length * 25;
    breakdown += `Hit Desired Tags (${hitDesired.join(', ')}): +${hitDesired.length * 25}\n`;
  }

  if (hitHated.length > 0) {
    score -= hitHated.length * 30;
    breakdown += `Hit Hated Tags (${hitHated.join(', ')}): -${hitHated.length * 30}\n`;
  }

  // 3. Check Cook Preference
  const actualCook = getCookPreference(finalCookLevel);
  if (actualCook === demands.cookPreference) {
    score += 40;
    breakdown += `Perfect Cook (${actualCook}): +40\n`;
  } else {
    // Partial penalty
    score -= 10;
    breakdown += `Wrong Cook (Wanted ${demands.cookPreference}, got ${actualCook}): -10\n`;
  }

  // 4. "Will It Blow?" Power (Bonus for exploding the casing)
  const blowPowers = ingredients.map(i => i.blowPower);
  const maxBlowPower = blowPowers.length === 0 ? 0 : Math.max(...blowPowers);
  score += maxBlowPower * 10;
  breakdown += `Explosive Power Bonus: +${maxBlowPower * 10}\n`;

  // Cap score at 100 max, 0 min
  const totalScore = Math.max(0, Math.min(100, score));

  return {
    totalScore,
    breakdown,
  };
}
