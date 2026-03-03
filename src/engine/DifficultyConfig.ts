/**
 * @module DifficultyConfig
 * Type-safe difficulty tier definitions loaded from JSON config.
 *
 * Five tiers from "Rare" (easy) to "Well Done" (brutal). Each tier controls
 * hint count, time pressure multiplier, max strikes, permadeath, hidden
 * objects, cleanup/assembly requirements, and enemy encounter chance.
 */

import difficultyData from '../config/difficulty.json';

/** A single difficulty tier definition. */
export interface DifficultyTier {
  /** Unique tier identifier (e.g. "medium", "well-done"). */
  id: string;
  /** Display name (e.g. "Medium Rare"). */
  name: string;
  /** Hex color used for UI tinting. */
  color: string;
  /** Number of hint tokens granted at game start. */
  hints: number;
  /** Multiplier applied to challenge timers (lower = more time). */
  timePressure: number;
  /** Maximum strikes before defeat. */
  maxStrikes: number;
  /** If true, defeat ends the entire run (no retry). */
  permadeath: boolean;
  /** Level of hidden object spawns: "none" | "basic" | "full" | "extreme". */
  hiddenObjects: string;
  /** Whether the player must clean up between stations. */
  cleanup: boolean;
  /** Whether the player must assemble equipment before use. */
  assembly: boolean;
  /** Probability (0-1) of enemy encounter per station transition. */
  enemyChance: number;
}

/** All difficulty tiers, typed from the JSON config. */
export const DIFFICULTY_TIERS: readonly DifficultyTier[] = difficultyData.tiers as DifficultyTier[];

/** The default difficulty tier ID used when none is selected. */
export const DEFAULT_DIFFICULTY = 'medium';

/**
 * Load a specific difficulty tier by ID.
 * Falls back to the default ("medium") tier if the ID is not found.
 */
export function loadDifficultyTier(id: string): DifficultyTier {
  const tier = DIFFICULTY_TIERS.find(t => t.id === id);
  if (tier) return tier;
  const fallback = DIFFICULTY_TIERS.find(t => t.id === DEFAULT_DIFFICULTY);
  if (fallback) return fallback;
  // Should never happen — config always has "medium"
  throw new Error(`Difficulty tier "${id}" not found and default "${DEFAULT_DIFFICULTY}" missing`);
}
