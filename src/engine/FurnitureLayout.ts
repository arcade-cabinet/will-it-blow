/**
 * FurnitureLayout — pure engine module that defines named placement targets
 * computed from room dimensions. No React dependencies.
 *
 * Challenge sequence is data-driven via config/scene/challenge-sequence.json.
 * STATION_TARGET_NAMES derives from the config — adding/removing/reordering
 * challenges is a single JSON change, not a code change.
 */

import {config} from '../config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Physical dimensions of the kitchen room in world units. */
export interface RoomDimensions {
  /** Width (x-axis extent) */
  w: number;
  /** Depth (z-axis extent) */
  d: number;
  /** Height (y-axis extent, floor to ceiling) */
  h: number;
}

/**
 * A named placement target — the single source of truth for where
 * an object lives in the kitchen. Stations, furniture, and decorative
 * props all reference targets by name; nothing uses hardcoded coordinates.
 */
export interface Target {
  /** World-space [x, y, z] position, relative to room center (0,0,0) */
  position: [number, number, number];
  /** Y-axis rotation in radians (0 = facing +z) */
  rotationY: number;
  /** Proximity trigger radius for player interaction. 0 = non-interactive (decorative). */
  triggerRadius: number;
  /** Y position for the floating waypoint marker above the station. Only set for interactive targets. */
  markerY?: number;
}

/**
 * Maps a GLB model filename to a named target.
 * FurnitureLoader iterates FURNITURE_RULES to load and position each piece.
 */
export interface FurnitureRule {
  /** GLB filename (resolved at runtime via getAssetUrl) */
  glb: string;
  /** Name of the target from resolveLayout() to position this GLB at */
  target: string;
  /** If true, the GLB contains animations that FurnitureLoader should play */
  animated?: boolean;
  /** If true, this piece is rendered by an ECS orchestrator — FurnitureLoader skips it. */
  ecsManaged?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base room depth — determines overall scale. */
const BASE_DEPTH = 13;

/**
 * Compute room dimensions from viewport aspect ratio.
 * Width scales with aspect ratio; depth and height are fixed.
 * This ensures the room fills the viewport naturally.
 *
 * Keep total floor area roughly constant (~169 sq units)
 * so gameplay feel is consistent across aspect ratios.
 *
 * @param aspect - viewport width / height (e.g. 16/9 = 1.778)
 */
export function computeRoom(aspect: number): RoomDimensions {
  const area = BASE_DEPTH * BASE_DEPTH;
  const d = Math.sqrt(area / Math.max(aspect, 0.5));
  const w = d * Math.max(aspect, 0.5);
  return {w, d, h: 5.5};
}

/** Fallback: square room for tests and contexts without viewport info. */
export const DEFAULT_ROOM: RoomDimensions = computeRoom(1);

/**
 * Target names for challenge stations, indexed by challenge number.
 * Derived from config/scene/challenge-sequence.json — adding/removing/
 * reordering challenges is a single JSON change.
 */
export const STATION_TARGET_NAMES = config.scene.challengeSequence.stations.map(s => s.stationName);

// resolveLayout() from src/engine/layout/ is the seam-based layout system.
// Use mergeLayoutConfigs() + resolveLayout() with the hierarchical JSON config.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the target for the given challenge index (0-5), or undefined if invalid.
 *
 * @param targets - The full targets map from resolveLayout()
 * @param challengeIndex - Challenge number (0=fridge, 1=cutting-board, 2=grinder, 3=stuffer, 4=stove, 5=dining-table, 6=crt-tv)
 * @returns The station Target, or `undefined` if the index is out of range
 */
export function getStationTarget(
  targets: Record<string, Target>,
  challengeIndex: number,
): Target | undefined {
  const name = STATION_TARGET_NAMES[challengeIndex];
  if (!name) return undefined;
  return targets[name];
}

// ---------------------------------------------------------------------------
// Furniture rules — maps GLB filenames to target names
// ---------------------------------------------------------------------------

/**
 * Complete list of furniture GLB models and their target placements.
 * FurnitureLoader iterates this array to load, position, and optionally
 * animate each piece of kitchen furniture and atmospheric props.
 */
export const FURNITURE_RULES: FurnitureRule[] = [
  // Core kitchen furniture (lightweight replacements)
  {glb: 'workplan.glb', target: 'l-counter'},
  {glb: 'workplan_001.glb', target: 'l-counter-ext'},
  {glb: 'kitchen_cabinet1.glb', target: 'upper-cabinets'},
  {glb: 'kitchen_cabinet2.glb', target: 'upper-cabinets-2'},
  {glb: 'island_counter.glb', target: 'island'},
  {glb: 'table_styloo.glb', target: 'table'},
  {glb: 'trashcan_cylindric.glb', target: 'trash-can'},
  {glb: 'kitchen_oven_large.glb', target: 'oven'},
  {glb: 'washing_machine.glb', target: 'dishwasher'},
  {glb: 'utensil_holder.glb', target: 'utensil-hooks'},
  {glb: 'shelf_small.glb', target: 'spice-rack'},

  // Interactive/animated furniture (kept from original)
  {glb: 'fridge.glb', target: 'fridge', animated: true},
  {glb: 'meat_grinder.glb', target: 'meat_grinder', animated: true, ecsManaged: true},
  {glb: 'mixing_bowl.glb', target: 'mixing-bowl', ecsManaged: true},

  // Atmospheric props (kept from original)
  {glb: 'frying_pan.glb', target: 'frying-pan'},
  {glb: 'cutting_board.glb', target: 'cutting-board'},
  {glb: 'pot.glb', target: 'pot'},
  {glb: 'pot_lid.glb', target: 'pot-lid'},
  {glb: 'bottle.glb', target: 'bottle'},
  {glb: 'glass_big.glb', target: 'glass'},
  {glb: 'plate_big.glb', target: 'plate'},
  {glb: 'knife_holder.glb', target: 'knife-holder'},
  {glb: 'toaster.glb', target: 'toaster'},
  {glb: 'roller.glb', target: 'roller'},
  {glb: 'cutlery_knife.glb', target: 'cutlery-knife'},
  {glb: 'cutlery_cleaver.glb', target: 'cutlery-cleaver'},
  {glb: 'cutlery_ladle.glb', target: 'cutlery-ladle'},
  {glb: 'cutlery_fork.glb', target: 'cutlery-fork'},
  {glb: 'cutlery_spoon.glb', target: 'cutlery-spoon'},
  {glb: 'chair_styloo.glb', target: 'chair-extra'},

  // Right-wall furniture (reuses left-wall GLBs via scene cloning)
  {glb: 'workplan.glb', target: 'r-counter'},
  {glb: 'workplan_001.glb', target: 'r-counter-ext'},
  {glb: 'kitchen_cabinet1.glb', target: 'r-upper-cabinets'},
  {glb: 'kitchen_cabinet2.glb', target: 'r-upper-cabinets-2'},

  // Horror props (NEW — atmospheric horror)
  {glb: 'beartrap_open.glb', target: 'bear-trap'},
  {glb: 'worm.glb', target: 'worm'},
  {glb: 'tapetteamouche.glb', target: 'fly-swatter'},
  {glb: 'can_broken.glb', target: 'broken-can'},
  {glb: 'bandages.glb', target: 'bandages'},
  {glb: 'matchbox.glb', target: 'matchbox'},
  {glb: 'postit.glb', target: 'postit-note'},
  {glb: 'fridgeletter.glb', target: 'fridge-letters'},
  {glb: 'prop_knife.glb', target: 'prop-knife'},
];
