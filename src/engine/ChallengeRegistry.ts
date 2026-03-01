import type {
  CookingVariant,
  GrindingVariant,
  IngredientVariant,
  StuffingVariant,
} from '../data/challenges/variants';
import {
  COOKING_VARIANTS,
  GRINDING_VARIANTS,
  INGREDIENT_VARIANTS,
  STUFFING_VARIANTS,
} from '../data/challenges/variants';

export type ChallengeId = 'ingredients' | 'grinding' | 'stuffing' | 'cooking' | 'tasting';

export const CHALLENGE_ORDER: ChallengeId[] = [
  'ingredients',
  'grinding',
  'stuffing',
  'cooking',
  'tasting',
];

export interface ChallengeConfig {
  id: ChallengeId;
  name: string;
  station: string;
  cameraOffset: [number, number, number];
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

/** Returns the challenge config for the given id, or throws if invalid. */
export function getChallengeConfig(id: ChallengeId): ChallengeConfig {
  const config = CHALLENGE_CONFIGS[id];
  if (!config) {
    throw new Error(`Invalid challenge id: ${id}`);
  }
  return config;
}

/** Seeded hash function for deterministic variant selection. */
function seededIndex(seed: number, arrayLength: number): number {
  return Math.abs(((seed * 2654435761) >>> 0) % arrayLength);
}

/** Picks a deterministic variant for the given challenge and seed. */
export function pickVariant(
  challengeId: ChallengeId,
  seed: number,
): IngredientVariant | GrindingVariant | StuffingVariant | CookingVariant | null {
  switch (challengeId) {
    case 'ingredients':
      return INGREDIENT_VARIANTS[seededIndex(seed, INGREDIENT_VARIANTS.length)];
    case 'grinding':
      return GRINDING_VARIANTS[seededIndex(seed + 1, GRINDING_VARIANTS.length)];
    case 'stuffing':
      return STUFFING_VARIANTS[seededIndex(seed + 2, STUFFING_VARIANTS.length)];
    case 'cooking':
      return COOKING_VARIANTS[seededIndex(seed + 3, COOKING_VARIANTS.length)];
    case 'tasting':
      return null;
    default:
      return null;
  }
}

export interface Verdict {
  rank: 'S' | 'A' | 'B' | 'F';
  title: string;
  averageScore: number;
  message: string;
}

/** Averages challenge scores and returns a final verdict. */
export function calculateFinalVerdict(challengeScores: number[]): Verdict {
  if (challengeScores.length === 0) {
    return {rank: 'F', averageScore: 0, title: 'FAILED', message: 'No challenges completed.'};
  }
  const bad = challengeScores.find(s => !Number.isFinite(s));
  if (bad !== undefined) {
    throw new Error(`calculateFinalVerdict received non-finite score: ${bad}`);
  }
  const averageScore = challengeScores.reduce((sum, s) => sum + s, 0) / challengeScores.length;

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
