/**
 * @module CleanupManager
 * Pure TypeScript module for tracking kitchen cleanup requirements by difficulty tier.
 *
 * Defines which equipment items must be washed between rounds, and provides
 * utilities to check progress toward a clean kitchen.
 */

import type {DifficultyTier} from './DifficultyConfig';

// ---------------------------------------------------------------------------
// Station equipment registry
// ---------------------------------------------------------------------------

/**
 * Maps each station name to the washable equipment items it uses.
 */
export const STATION_EQUIPMENT: Record<string, string[]> = {
  stove: ['frying-pan'],
  grinder: ['grinder-plate', 'hopper'],
  stuffer: ['nozzle'],
};

/** All washable item IDs (flat list, order stable). */
export const ALL_WASHABLE_ITEMS: string[] = Object.values(STATION_EQUIPMENT).flat();

// ---------------------------------------------------------------------------
// Cleanup requirements by difficulty
// ---------------------------------------------------------------------------

/**
 * Returns the list of item IDs the player must wash for the given difficulty tier.
 *
 * - Rare: no cleanup required (cleanup flag is false)
 * - Medium Rare: only 'frying-pan'
 * - Medium: frying-pan + grinder-plate
 * - Medium Well / Well Done: all items
 *
 * Returns an empty array if the tier does not require cleanup.
 */
export function getRequiredCleanup(difficulty: DifficultyTier): string[] {
  if (!difficulty.cleanup) return [];

  switch (difficulty.id) {
    case 'medium-rare':
      return ['frying-pan'];
    case 'medium':
      return ['frying-pan', 'grinder-plate'];
    default:
      // medium-well, well-done: all items
      return ALL_WASHABLE_ITEMS.slice();
  }
}

// ---------------------------------------------------------------------------
// Clean check helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when every required item meets the clean threshold (>= 1.0).
 *
 * @param required - Item IDs that must be clean
 * @param stationCleanliness - Map of item ID → cleanliness level (0 = dirty, 1 = clean)
 */
export function isKitchenClean(
  required: string[],
  stationCleanliness: Record<string, number>,
): boolean {
  if (required.length === 0) return true;
  return required.every(id => (stationCleanliness[id] ?? 0) >= 1.0);
}

/**
 * Returns the fraction of required items that are fully clean (0–1).
 *
 * @param required - Item IDs that must be clean
 * @param stationCleanliness - Map of item ID → cleanliness level (0 = dirty, 1 = clean)
 */
export function getCleanupProgress(
  required: string[],
  stationCleanliness: Record<string, number>,
): number {
  if (required.length === 0) return 1;
  const cleanCount = required.filter(id => (stationCleanliness[id] ?? 0) >= 1.0).length;
  return cleanCount / required.length;
}
