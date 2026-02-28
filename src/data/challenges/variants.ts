export type IngredientCriteria = {tags: string[]; description: string};

export interface IngredientVariant {
  criteria: IngredientCriteria;
  requiredCount: number;
  mrSausageDemand: string;
}

export interface GrindingVariant {
  targetSpeed: number;
  tolerance: number;
  targetProgress: number;
  timerSeconds: number;
}

export interface StuffingVariant {
  fillRate: number;
  pressureRate: number;
  pressureDecay: number;
  burstThreshold: number;
  timerSeconds: number;
}

export interface CookingVariant {
  targetTemp: number;
  tempTolerance: number;
  holdSeconds: number;
  heatRate: number;
  timerSeconds: number;
}

export const INGREDIENT_VARIANTS: IngredientVariant[] = [
  {
    criteria: {tags: ['sweet'], description: 'sweet'},
    requiredCount: 3,
    mrSausageDemand: 'I want something SWEET...',
  },
  {
    criteria: {tags: ['savory'], description: 'savory'},
    requiredCount: 3,
    mrSausageDemand: 'I want something SAVORY...',
  },
  {
    criteria: {tags: ['spicy'], description: 'spicy'},
    requiredCount: 3,
    mrSausageDemand: 'Bring me heat. SPICY...',
  },
  {
    criteria: {tags: ['fancy'], description: 'fancy'},
    requiredCount: 3,
    mrSausageDemand: 'Only the finest ingredients...',
  },
  {
    criteria: {tags: ['comfort'], description: 'comfort food'},
    requiredCount: 4,
    mrSausageDemand: 'Comfort food...',
  },
  {
    criteria: {tags: ['meat'], description: 'meat'},
    requiredCount: 3,
    mrSausageDemand: 'MEAT. Nothing but MEAT...',
  },
  {
    criteria: {tags: ['sweet'], description: 'sweet'},
    requiredCount: 4,
    mrSausageDemand: 'Something sweet...',
  },
];

export const GRINDING_VARIANTS: GrindingVariant[] = [
  {targetSpeed: 3.0, tolerance: 1.5, targetProgress: 100, timerSeconds: 30},
  {targetSpeed: 4.0, tolerance: 1.0, targetProgress: 100, timerSeconds: 25},
  {targetSpeed: 2.5, tolerance: 2.0, targetProgress: 100, timerSeconds: 35},
];

export const STUFFING_VARIANTS: StuffingVariant[] = [
  {
    fillRate: 8,
    pressureRate: 12,
    pressureDecay: 6,
    burstThreshold: 90,
    timerSeconds: 30,
  },
  {
    fillRate: 10,
    pressureRate: 15,
    pressureDecay: 5,
    burstThreshold: 85,
    timerSeconds: 25,
  },
  {
    fillRate: 6,
    pressureRate: 10,
    pressureDecay: 8,
    burstThreshold: 90,
    timerSeconds: 35,
  },
];

export const COOKING_VARIANTS: CookingVariant[] = [
  {
    targetTemp: 160,
    tempTolerance: 10,
    holdSeconds: 5,
    heatRate: 15,
    timerSeconds: 30,
  },
  {
    targetTemp: 170,
    tempTolerance: 8,
    holdSeconds: 4,
    heatRate: 20,
    timerSeconds: 25,
  },
  {
    targetTemp: 155,
    tempTolerance: 12,
    holdSeconds: 6,
    heatRate: 12,
    timerSeconds: 35,
  },
];
