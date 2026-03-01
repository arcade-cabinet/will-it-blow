/**
 * @module variants
 * Challenge variant data for all four active challenges (ingredients, grinding,
 * stuffing, cooking). Tasting has no variant — it always plays the same way.
 *
 * Each challenge has an array of variants. A deterministic seeded hash in
 * ChallengeRegistry picks one variant per game session, giving replay variety
 * without randomness during a single playthrough.
 */

/** Tag-based matching criteria for the ingredient selection challenge. */
export type IngredientCriteria = {tags: string[]; description: string};

/**
 * Variant config for the ingredient selection challenge.
 * Defines what Mr. Sausage demands and how many correct picks are needed.
 */
export interface IngredientVariant {
  /** Tag criteria that "correct" ingredients must match */
  criteria: IngredientCriteria;
  /** Number of matching ingredients the player must select */
  requiredCount: number;
  /** Mr. Sausage's demand dialogue shown on the CRT TV */
  mrSausageDemand: string;
}

/**
 * Variant config for the grinding challenge.
 * Player must crank the grinder at the target speed within tolerance.
 */
export interface GrindingVariant {
  /** Target crank speed the player should maintain (units/sec) */
  targetSpeed: number;
  /** Acceptable deviation from targetSpeed before scoring penalizes */
  tolerance: number;
  /** Progress value needed to complete the grind (0-100 scale) */
  targetProgress: number;
  /** Time limit in seconds before the challenge auto-fails */
  timerSeconds: number;
}

/**
 * Variant config for the stuffing challenge.
 * Player presses to fill the casing while managing pressure to avoid a burst.
 */
export interface StuffingVariant {
  /** How fast the casing fills per press (% per tick) */
  fillRate: number;
  /** How fast pressure builds per press (% per tick) */
  pressureRate: number;
  /** How fast pressure decays when not pressing (% per tick) */
  pressureDecay: number;
  /** Pressure level (%) at which the casing bursts — game over */
  burstThreshold: number;
  /** Time limit in seconds */
  timerSeconds: number;
}

/**
 * Variant config for the cooking challenge.
 * Player adjusts heat to reach and hold a target temperature.
 */
export interface CookingVariant {
  /** Target temperature in degrees that must be reached and held */
  targetTemp: number;
  /** Acceptable deviation from targetTemp (degrees) */
  tempTolerance: number;
  /** Seconds the temperature must stay in the target zone to succeed */
  holdSeconds: number;
  /** Rate of temperature change per heat-level unit per tick */
  heatRate: number;
  /** Time limit in seconds */
  timerSeconds: number;
}

/**
 * 7 ingredient variants with different tag demands and required counts.
 * Some demands (e.g., 'comfort' requiring 4) are harder because fewer
 * ingredients in the pool match that tag.
 */
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

/**
 * 3 grinding variants ranging from easy (slow target, wide tolerance, long timer)
 * to hard (fast target, tight tolerance, short timer).
 */
export const GRINDING_VARIANTS: GrindingVariant[] = [
  {targetSpeed: 3.0, tolerance: 1.5, targetProgress: 100, timerSeconds: 30},
  {targetSpeed: 4.0, tolerance: 1.0, targetProgress: 100, timerSeconds: 25},
  {targetSpeed: 2.5, tolerance: 2.0, targetProgress: 100, timerSeconds: 35},
];

/**
 * 3 stuffing variants. The tension is between fillRate (how fast you fill)
 * and pressureRate/burstThreshold (how easily it explodes). Variant [1] is
 * the hardest: fast fill but pressure builds quickly with a lower burst cap.
 */
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

/**
 * 3 cooking variants. Higher targetTemp + tighter tolerance + shorter hold
 * = harder. Variant [2] is the most forgiving (low temp, wide tolerance,
 * long hold window, slow heat rate).
 */
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
