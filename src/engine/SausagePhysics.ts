/**
 * @module SausagePhysics
 * Pure scoring functions for sausage quality evaluation.
 * All functions are deterministic (no side effects, no store access).
 */
import ingredientsConfig from '../config/ingredients.json';
import scoringConfig from '../config/scoring.json';

interface IngredientStats {
  tasteMod: number;
  textureMod: number;
  blowPower: number;
  tags: string[];
}

function getIngredientStats(id: string): IngredientStats {
  const ing = ingredientsConfig.ingredients.find(i => i.id === id);
  return ing ?? {tasteMod: 0, textureMod: 0, blowPower: 0, tags: []};
}

/** Calculate blow ruffalos (pressure score) from hold duration and ingredients. */
export function calculateBlowRuffalos(holdDuration: number, ingredientIds: string[]): number {
  const totalBlowPower = ingredientIds.reduce(
    (sum, id) => sum + getIngredientStats(id).blowPower,
    0,
  );
  const basePressure = Math.min(holdDuration * 10, 100);
  const modifier = totalBlowPower * scoringConfig.weights.blowPowerMultiplier;
  return Math.min(100, Math.max(0, basePressure + modifier));
}

/** Probabilistic burst check based on ingredient blow power. */
export function checkBurst(ingredientIds: string[]): boolean {
  const totalBlowPower = ingredientIds.reduce(
    (sum, id) => sum + getIngredientStats(id).blowPower,
    0,
  );
  const burstProbability = Math.min(0.9, totalBlowPower * 0.05);
  return Math.random() < burstProbability;
}

/** Calculate taste rating from ingredient taste/texture mods. */
export function calculateTasteRating(ingredientIds: string[], burstOccurred: boolean): number {
  const stats = ingredientIds.map(getIngredientStats);
  const tasteSum = stats.reduce((s, i) => s + i.tasteMod, 0);
  const textureSum = stats.reduce((s, i) => s + i.textureMod, 0);

  const tasteScore = tasteSum * scoringConfig.weights.tasteMultiplier;
  const textureScore = textureSum * scoringConfig.weights.textureMultiplier;
  const burstPenalty = burstOccurred ? 20 : 0;

  return Math.min(100, Math.max(0, tasteScore + textureScore - burstPenalty));
}

/** Calculate final combined score. */
export function calculateFinalScore(
  taste: number,
  blow: number,
  burst: number,
  bonus: number,
): number {
  const raw = taste * 0.4 + blow * 0.3 + burst * 0.2 + bonus;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/** Map a 0-100 score to a rank title. */
export function getTitleTier(score: number): string {
  const v = scoringConfig.verdicts;
  const t = scoringConfig.rankThresholds;
  if (score >= t.S) return v.S;
  if (score >= t.A) return v.A;
  if (score >= t.B) return v.B;
  return v.F;
}
