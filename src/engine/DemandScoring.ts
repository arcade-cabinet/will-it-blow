import {getIngredientById} from './Ingredients';

// How cooked a sausage is based on the final cookLevel (0.0 to 1.0)
export function getCookPreference(cookLevel: number): 'rare' | 'medium' | 'well-done' | 'charred' {
  if (cookLevel < 0.25) return 'rare';
  if (cookLevel < 0.6) return 'medium';
  if (cookLevel < 0.85) return 'well-done';
  return 'charred';
}

export function calculateDemandBonus(
  demands: {desiredTags: string[]; hatedTags: string[]; cookPreference: string},
  selectedIngredientId: string,
  finalCookLevel: number,
) {
  const ingredient = getIngredientById(selectedIngredientId);
  if (!ingredient) return {totalScore: 0, breakdown: 'No ingredient selected.'};

  let score = 0;
  let breakdown = '';

  // 1. Evaluate Ingredient Match (Taste & Texture Base)
  score += ingredient.tasteMod * 10;
  score += ingredient.textureMod * 5;
  breakdown += `Base Flavor: ${ingredient.tasteMod * 10}\nBase Texture: ${ingredient.textureMod * 5}\n`;

  // 2. Check Mr. Sausage's Tags
  const hitDesired = demands.desiredTags.filter(tag => ingredient.tags.includes(tag));
  const hitHated = demands.hatedTags.filter(tag => ingredient.tags.includes(tag));

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
  // Higher blow power is riskier but yields more points if it succeeds
  score += ingredient.blowPower * 10;
  breakdown += `Explosive Power Bonus: +${ingredient.blowPower * 10}\n`;

  // Cap score at 100 max, 0 min
  const totalScore = Math.max(0, Math.min(100, score));

  return {
    totalScore,
    breakdown,
  };
}
