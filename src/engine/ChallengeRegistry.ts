/**
 * @module ChallengeRegistry
 * Central registry for challenge configurations, variant selection, and
 * final verdict calculation. Orchestrates the 6-challenge game flow:
 * ingredients -> chopping -> grinding -> stuffing -> cooking -> tasting.
 *
 * Variant selection is deterministic per seed — the same variantSeed
 * always produces the same challenge parameters, ensuring fair replays.
 */

import {config} from '../config';
import type {
  ChoppingVariant,
  CookingVariant,
  GrindingVariant,
  IngredientVariant,
  StuffingVariant,
} from '../config/types';

const INGREDIENT_VARIANTS = config.variants.ingredients;
const CHOPPING_VARIANTS = config.variants.chopping;
const GRINDING_VARIANTS = config.variants.grinding;
const STUFFING_VARIANTS = config.variants.stuffing;
const COOKING_VARIANTS = config.variants.cooking;

/** Identifier for each of the 6 sequential challenge phases. */
export type ChallengeId =
  | 'ingredients'
  | 'chopping'
  | 'grinding'
  | 'stuffing'
  | 'cooking'
  | 'tasting';

/** The fixed sequence of challenges. Index matches `currentChallenge` in the store. */
export const CHALLENGE_ORDER: ChallengeId[] = [
  'ingredients',
  'chopping',
  'grinding',
  'stuffing',
  'cooking',
  'tasting',
];

/** Static configuration for a single challenge (metadata, not gameplay params). */
export interface ChallengeConfig {
  /** Unique challenge identifier */
  id: ChallengeId;
  /** Human-readable name for UI display */
  name: string;
  /** Target name in FurnitureLayout where this challenge takes place */
  station: string;
  /** Camera position offset from the station target when the challenge is active */
  cameraOffset: [number, number, number];
  /** Player-facing description of the challenge objective */
  description: string;
}

const CHALLENGE_CONFIGS: Record<ChallengeId, ChallengeConfig> = {
  ingredients: {
    id: 'ingredients',
    name: 'Ingredient Selection',
    station: 'fridge',
    cameraOffset: [0, 0, 1],
    description: "Choose ingredients that satisfy Mr. Sausage's demands.",
  },
  chopping: {
    id: 'chopping',
    name: 'Chopping',
    station: 'cutting-board',
    cameraOffset: [0, 0.3, 0.6],
    description: 'Chop ingredients with precise timing.',
  },
  grinding: {
    id: 'grinding',
    name: 'Grinding',
    station: 'grinder',
    cameraOffset: [0, 0.3, 0.5],
    description: 'Grind the ingredients at the right speed.',
  },
  stuffing: {
    id: 'stuffing',
    name: 'Stuffing',
    station: 'stuffer',
    cameraOffset: [0, 0.2, 0.8],
    description: 'Stuff the casing without letting pressure burst it.',
  },
  cooking: {
    id: 'cooking',
    name: 'Cooking',
    station: 'stove',
    cameraOffset: [0, 0.5, 0.5],
    description: 'Cook the sausage to the perfect temperature.',
  },
  tasting: {
    id: 'tasting',
    name: 'Tasting',
    station: 'center',
    cameraOffset: [0, 0, 0],
    description: 'Mr. Sausage renders his final verdict.',
  },
};

/**
 * Returns the challenge config for the given id, or throws if invalid.
 *
 * @param id - The challenge identifier to look up
 * @returns The static config for that challenge
 * @throws {Error} If the id does not match any known challenge
 */
export function getChallengeConfig(id: ChallengeId): ChallengeConfig {
  const config = CHALLENGE_CONFIGS[id];
  if (!config) {
    throw new Error(`Invalid challenge id: ${id}`);
  }
  return config;
}

/**
 * Seeded hash function for deterministic variant selection.
 * Uses the Knuth multiplicative hash (golden ratio prime 2654435761)
 * to distribute seeds evenly across the array range.
 *
 * @param seed - The game session seed (typically Date.now() at game start)
 * @param arrayLength - Number of variants to choose from
 * @returns An index in [0, arrayLength) that is deterministic for the given seed
 */
function seededIndex(seed: number, arrayLength: number): number {
  return Math.abs(((seed * 2654435761) >>> 0) % arrayLength);
}

/**
 * Picks a deterministic variant for the given challenge and seed.
 * Each challenge type offsets the seed by its index (0-4) so the same
 * base seed produces different variants for different challenges.
 *
 * @param challengeId - Which challenge to pick a variant for
 * @param seed - The game session's variant seed
 * @returns The selected variant config, or `null` for tasting (which has no variants)
 */
export function pickVariant(
  challengeId: ChallengeId,
  seed: number,
): IngredientVariant | ChoppingVariant | GrindingVariant | StuffingVariant | CookingVariant | null {
  switch (challengeId) {
    case 'ingredients':
      return INGREDIENT_VARIANTS[seededIndex(seed, INGREDIENT_VARIANTS.length)];
    case 'chopping':
      return CHOPPING_VARIANTS[seededIndex(seed + 1, CHOPPING_VARIANTS.length)];
    case 'grinding':
      return GRINDING_VARIANTS[seededIndex(seed + 2, GRINDING_VARIANTS.length)];
    case 'stuffing':
      return STUFFING_VARIANTS[seededIndex(seed + 3, STUFFING_VARIANTS.length)];
    case 'cooking':
      return COOKING_VARIANTS[seededIndex(seed + 4, COOKING_VARIANTS.length)];
    case 'tasting':
      return null;
    default:
      return null;
  }
}

/**
 * The final game verdict displayed on the results screen.
 * Only S-rank (>= 92) is a true victory — all others are degrees of failure.
 */
export interface Verdict {
  /** Letter grade: S (victory), A/B/F (defeat) */
  rank: 'S' | 'A' | 'B' | 'F';
  /** Title displayed to the player (e.g., "THE SAUSAGE KING") */
  title: string;
  /** Mean of all challenge scores (0-100) */
  averageScore: number;
  /** Mr. Sausage's verdict dialogue */
  message: string;
}

/**
 * Averages challenge scores and returns a final verdict.
 * If a demandBonus is provided, it is added to the average before ranking.
 *
 * Rank thresholds:
 * - S (>= 92): "THE SAUSAGE KING" — the only true victory
 * - A (>= 75): "Almost Worthy" — defeat, but close
 * - B (>= 50): "Mediocre" — defeat
 * - F (< 50):  "Unacceptable" — "You are the sausage now"
 *
 * @param challengeScores - Array of scores (0-100) from each completed challenge
 * @param demandBonus - Optional bonus/penalty from demand matching (added to average, clamped 0-100)
 * @returns Verdict with rank, title, average score, and Mr. Sausage's message
 * @throws {Error} If any score is non-finite (NaN, Infinity)
 */
export function calculateFinalVerdict(challengeScores: number[], demandBonus?: number): Verdict {
  if (challengeScores.length === 0) {
    return {rank: 'F', averageScore: 0, title: 'FAILED', message: 'No challenges completed.'};
  }
  const bad = challengeScores.find(s => !Number.isFinite(s));
  if (bad !== undefined) {
    throw new Error(`calculateFinalVerdict received non-finite score: ${bad}`);
  }
  const rawAverage = challengeScores.reduce((sum, s) => sum + s, 0) / challengeScores.length;
  const averageScore =
    demandBonus !== undefined ? Math.max(0, Math.min(100, rawAverage + demandBonus)) : rawAverage;

  if (averageScore >= 92) {
    return {
      rank: 'S',
      title: 'THE SAUSAGE KING',
      averageScore,
      message: 'Perfection. You have earned my respect.',
    };
  }
  if (averageScore >= 75) {
    return {
      rank: 'A',
      title: 'Almost Worthy',
      averageScore,
      message: 'Close. So painfully close.',
    };
  }
  if (averageScore >= 50) {
    return {
      rank: 'B',
      title: 'Mediocre',
      averageScore,
      message: "I've eaten gas station sausages with more soul.",
    };
  }
  return {
    rank: 'F',
    title: 'Unacceptable',
    averageScore,
    message: 'You are the sausage now.',
  };
}
