/**
 * @module DemandScoring
 * Pure function module for calculating demand-based scoring bonuses.
 *
 * Mr. Sausage has hidden demands (preferred form, desired/hated ingredients,
 * cook preference). This module compares those demands against the player's
 * actual decisions and produces a point breakdown that adjusts the final score.
 *
 * All functions are pure — no store dependencies, only type imports.
 */

import type {MrSausageDemands, PlayerDecisions} from '../store/gameStore';

/** Maps cook preference labels to target cook level values (0-1 scale). */
export const COOK_TARGETS: Record<string, number> = {
  rare: 0.15,
  medium: 0.45,
  'well-done': 0.75,
  charred: 0.95,
};

/** Tolerance window for cook level matching — within this delta is a match. */
const COOK_TOLERANCE = 0.15;

/** Breakdown of how the player's decisions matched Mr. Sausage's demands. */
export interface DemandBreakdown {
  /** Whether the sausage form (coil/link) matched the demand. */
  formMatch: {matched: boolean; points: number; wanted: string; got: string | null};
  /** Whether the cook level was within tolerance of the preferred level. */
  cookMatch: {matched: boolean; points: number; wanted: string; actual: number};
  /** Which desired ingredients were hit, which hated ones were included. */
  ingredientMatch: {desiredHits: string[]; hatedHits: string[]; points: number};
  /** Sum of all flair bonuses earned during the game. */
  flairBonus: number;
  /** Total demand bonus (sum of all category points). */
  totalDemandBonus: number;
}

/**
 * Calculates the demand-based scoring bonus by comparing the player's
 * decisions against Mr. Sausage's hidden demands.
 *
 * @param demands - Mr. Sausage's secret demands for this session
 * @param decisions - The player's tracked decisions across all stages
 * @returns A breakdown of all demand matching results and the total bonus
 */
export function calculateDemandBonus(
  demands: MrSausageDemands,
  decisions: PlayerDecisions,
): DemandBreakdown {
  // --- Form match ---
  const formMatched = decisions.chosenForm === demands.preferredForm;
  const formPoints = formMatched ? 15 : -10;
  const formMatch = {
    matched: formMatched,
    points: formPoints,
    wanted: demands.preferredForm,
    got: decisions.chosenForm,
  };

  // --- Cook match ---
  const target = COOK_TARGETS[demands.cookPreference] ?? 0.45;
  const delta = Math.abs(decisions.finalCookLevel - target);
  const cookMatched = delta < COOK_TOLERANCE;
  const cookPoints = cookMatched ? 10 : -5;
  const cookMatch = {
    matched: cookMatched,
    points: cookPoints,
    wanted: demands.cookPreference,
    actual: decisions.finalCookLevel,
  };

  // --- Ingredient match ---
  const selectedLower = decisions.selectedIngredients.map(s => s.toLowerCase());

  const desiredHits = demands.desiredIngredients.filter(desired =>
    selectedLower.includes(desired.toLowerCase()),
  );
  const hatedHits = demands.hatedIngredients.filter(hated =>
    selectedLower.includes(hated.toLowerCase()),
  );

  const ingredientPoints = desiredHits.length * 8 + hatedHits.length * -12;
  const ingredientMatch = {
    desiredHits,
    hatedHits,
    points: ingredientPoints,
  };

  // --- Flair bonus ---
  const flairBonus = decisions.flairPoints.reduce((sum, fp) => sum + fp.points, 0);

  // --- Total ---
  const totalDemandBonus = formPoints + cookPoints + ingredientPoints + flairBonus;

  return {
    formMatch,
    cookMatch,
    ingredientMatch,
    flairBonus,
    totalDemandBonus,
  };
}
