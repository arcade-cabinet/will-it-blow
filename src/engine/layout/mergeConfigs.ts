/**
 * @module layout/mergeConfigs
 * Merges the hierarchical config files (room → rails → placements)
 * into a single LayoutConfig for the runtime resolver.
 */

import type {LayoutConfig, PlacementsConfig, RailsConfig, RoomConfig} from './types';

/**
 * Merge the three-level config hierarchy into a flat LayoutConfig
 * that resolveLayout() can consume.
 *
 * The hierarchy:
 * - room.json (Level 0): surfaces with alignment, depth, fill, seams
 * - rails.json (Level 1): inherits room, adds customLandmarks + containers
 * - placements.json (Level 2): inherits rails, adds all object placements
 */
export function mergeLayoutConfigs(
  room: RoomConfig,
  rails: RailsConfig,
  placements: PlacementsConfig,
): LayoutConfig {
  return {
    surfaces: room.surfaces,
    customLandmarks: rails.customLandmarks,
    containers: rails.containers,
    placements: placements.placements,
  };
}
