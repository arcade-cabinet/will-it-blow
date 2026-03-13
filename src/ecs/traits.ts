/**
 * @module ecs/traits
 * Koota ECS trait definitions for Will It Blow?
 * Each trait represents a component of game state that can be attached to entities.
 *
 * Note: Koota does not support arrays in trait schemas. Array data is stored
 * as JSON strings and must be parsed/serialized via helpers.
 */
import {trait} from 'koota';

// --- Station Traits ---

/** Identifies an entity as a station with a name and active state. */
export const StationTrait = trait({
  name: '' as string,
  active: false as boolean,
  posX: 0 as number,
  posY: 0 as number,
  posZ: 0 as number,
});

/** Sausage entity: tracks the sausage being assembled through the pipeline. */
export const SausageTrait = trait({
  /** JSON-encoded string[] of ingredient IDs. */
  ingredientIdsJson: '[]' as string,
  groundLevel: 0 as number,
  stuffLevel: 0 as number,
  cookLevel: 0 as number,
  casingTied: false as boolean,
  burstOccurred: false as boolean,
});

/** Grinder state: plunger displacement and grind progress. */
export const GrinderTrait = trait({
  plungerDisplacement: 0 as number,
  grindProgress: 0 as number,
  speed: 0 as number,
  active: false as boolean,
});

/** Stuffer state: crank angle and fill level. */
export const StufferTrait = trait({
  crankAngle: 0 as number,
  fillLevel: 0 as number,
  casingAttached: false as boolean,
  active: false as boolean,
});

/** Stove state: heat level and cook progress. */
export const StoveTrait = trait({
  heatLevel: 0 as number,
  cookProgress: 0 as number,
  panPlaced: false as boolean,
  active: false as boolean,
});

/** Chopper state: chop count and completion. */
export const ChopperTrait = trait({
  chopCount: 0 as number,
  requiredChops: 5 as number,
  active: false as boolean,
});

/** Blowout state: pressure and burst tracking. */
export const BlowoutTrait = trait({
  pressure: 0 as number,
  holdDuration: 0 as number,
  burstOccurred: false as boolean,
  active: false as boolean,
});

/** Ingredient data attached to ingredient entities. */
export const IngredientTrait = trait({
  id: '' as string,
  name: '' as string,
  category: 'food' as string,
  tasteMod: 0 as number,
  textureMod: 0 as number,
  blowPower: 0 as number,
  /** JSON-encoded string[] of tags. */
  tagsJson: '[]' as string,
  selected: false as boolean,
});

/** Demand requirements from Mr. Sausage for the current round. */
export const DemandTrait = trait({
  /** JSON-encoded string[] of desired tags. */
  desiredTagsJson: '[]' as string,
  /** JSON-encoded string[] of hated tags. */
  hatedTagsJson: '[]' as string,
  cookPreference: 'medium' as string,
});

/** Score tracking for the current round. */
export const ScoreTrait = trait({
  tasteScore: 0 as number,
  textureScore: 0 as number,
  tagBonus: 0 as number,
  cookBonus: 0 as number,
  blowBonus: 0 as number,
  totalScore: 0 as number,
  rank: '' as string,
});

/** Round tracking across the game session. */
export const RoundTrait = trait({
  currentRound: 1 as number,
  totalRounds: 3 as number,
  /** JSON-encoded number[] of per-round scores. */
  roundScoresJson: '[]' as string,
  /** JSON-encoded string[][] of used combos. */
  usedCombosJson: '[]' as string,
});

/** Player entity state. */
export const PlayerTrait = trait({
  difficulty: 'medium' as string,
  strikes: 0 as number,
  maxStrikes: 3 as number,
});

// --- Tag Traits (no data, just markers) ---

/** Phase tag: marks the current game phase on a singleton entity. */
export const PhaseTag = trait({
  phase: 'SELECT_INGREDIENTS' as string,
});

// --- JSON helpers ---

/** Parse a JSON-encoded array field. Returns empty array on parse error. */
export function parseJsonArray<T>(json: string): T[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/** Serialize an array to JSON for trait storage. */
export function toJsonArray<T>(arr: T[]): string {
  return JSON.stringify(arr);
}
