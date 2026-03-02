/**
 * FurnitureLayout — pure engine module that defines named placement targets
 * computed from room dimensions. No React dependencies.
 */

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
  /** Name of the target from resolveTargets() to position this GLB at */
  target: string;
  /** If true, the GLB contains animations that FurnitureLoader should play */
  animated?: boolean;
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
 * Target names for the 5 challenge stations, indexed by challenge number (0-4).
 * Used by getStationTarget() to map currentChallenge to a physical location.
 */
export const STATION_TARGET_NAMES = ['fridge', 'grinder', 'stuffer', 'stove', 'crt-tv'] as const;

// ---------------------------------------------------------------------------
// Target computation
// ---------------------------------------------------------------------------

/**
 * Computes all named targets from room dimensions.
 * All positions use proportional placement (fractions of room width/depth/height)
 * so furniture layout scales correctly for any room size derived from viewport aspect ratio.
 * Heights for counters/tables are absolute (always ~1m) since they must match human scale.
 *
 * @param room - The kitchen room dimensions (all targets scale with these)
 * @returns A map of target name to Target. Includes station targets (interactive),
 *          decorative targets, and atmospheric prop targets.
 */
export function resolveTargets(room: RoomDimensions): Record<string, Target> {
  const halfW = room.w / 2;
  const halfD = room.d / 2;
  const scale = Math.min(room.w, room.d) / 13;

  // Proportional fractions: offset / 13 (based on original 13x13 room)
  // Width fractions (multiply by room.w)
  // Depth fractions (multiply by room.d)

  const grinderPos: [number, number, number] = [
    -halfW + room.w * (1.75 / 13),
    room.h * 0.375,
    -halfD + room.d * (5.86 / 13),
  ];

  return {
    // ---- Station targets (challenge order 0-4) ----

    // 0 — Fridge: left-back corner
    fridge: {
      position: [-halfW + room.w * (1.34 / 13), room.h * 0.325, -halfD + room.d * (1.48 / 13)],
      rotationY: 0,
      triggerRadius: 2.0 * scale,
      markerY: 2.5,
    },

    // 1 — Grinder: left wall, mid-depth
    grinder: {
      position: grinderPos,
      rotationY: 0,
      triggerRadius: 1.5 * scale,
      markerY: 2.8,
    },

    // 2 — Stuffer: right side, front area
    stuffer: {
      position: [halfW - room.w * (4.22 / 13), room.h * 0.487, halfD - room.d * (4.25 / 13)],
      rotationY: Math.PI,
      triggerRadius: 1.5 * scale,
      markerY: 3.5,
    },

    // 3 — Stove: left wall, between fridge and grinder
    stove: {
      position: [-halfW + room.w * (1.52 / 13), room.h * 0.387, -halfD + room.d * (4.27 / 13)],
      rotationY: 0,
      triggerRadius: 1.5 * scale,
      markerY: 2.8,
    },

    // 4 — CRT TV: centered on back wall (z inside room, ~1 unit from wall)
    'crt-tv': {
      position: [0, room.h * 0.455, -halfD + room.d * (1.0 / 13)],
      rotationY: 0,
      triggerRadius: 2.0 * scale,
      markerY: 3.5,
    },

    // ---- Interactive objects ----

    'mixing-bowl': {
      // 1.34 + 1.5 = 2.84 → 2.84/13
      position: [-halfW + room.w * (2.84 / 13), 1.0, -halfD + room.d * (1.48 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    // ---- Decorative targets ----

    'l-counter': {
      position: [-halfW + room.w * (1.0 / 13), 0, -halfD + room.d * (3.0 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    'upper-cabinets': {
      position: [-halfW + room.w * (1.0 / 13), room.h * 0.65, -halfD + room.d * (3.0 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    island: {
      position: [0, 0, 0],
      rotationY: 0,
      triggerRadius: 0,
    },

    table: {
      position: [halfW - room.w * (2.5 / 13), 0, halfD - room.d * (2.5 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    'trash-can': {
      position: [halfW - room.w * (1.0 / 13), 0, -halfD + room.d * (1.0 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    oven: {
      position: [-halfW + room.w * (1.5 / 13), 0, -halfD + room.d * (4.5 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    dishwasher: {
      position: [-halfW + room.w * (1.5 / 13), 0, -halfD + room.d * (6.0 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    'spice-rack': {
      position: [-halfW + room.w * (0.5 / 13), room.h * 0.5, -halfD + room.d * (5.0 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    'utensil-hooks': {
      position: [-halfW + room.w * (0.5 / 13), room.h * 0.55, -halfD + room.d * (3.5 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    'trap-door': {
      position: [0, room.h, 0],
      rotationY: 0,
      triggerRadius: 0,
    },

    // meat_grinder GLB sits at the grinder station position
    meat_grinder: {
      position: grinderPos,
      rotationY: 0,
      triggerRadius: 0,
    },

    // Grinder output: slightly in front of grinder (toward +Z), on counter surface
    // Horizontal offsets are proportional; vertical offset stays absolute (machine-relative)
    'grinder-output': {
      position: [
        grinderPos[0] + room.w * (0.6 / 13),
        grinderPos[1] - 0.2,
        grinderPos[2] + room.d * (0.5 / 13),
      ],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Grinder receiver: invisible mesh at hopper opening for bowl drop detection
    // Vertical offsets stay absolute (machine-relative)
    'grinder-receiver': {
      position: [grinderPos[0], grinderPos[1] + 0.7 + 0.5 + 0.05, grinderPos[2]],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Stuffer output: slightly in front of stuffer, on the table
    // Horizontal offsets are proportional; vertical offset stays absolute
    'stuffer-output': {
      position: [
        halfW - room.w * (4.22 / 13) + room.w * (0.5 / 13),
        room.h * 0.487 - 0.3,
        halfD - room.d * (4.25 / 13) + room.d * (0.5 / 13),
      ],
      rotationY: 0,
      triggerRadius: 0,
    },

    // ---- Atmospheric props ----

    // Frying pan resting near the stove
    'frying-pan': {
      position: [-halfW + room.w * (2.0 / 13), 1.05, -halfD + room.d * (4.8 / 13)],
      rotationY: 0.3,
      triggerRadius: 0,
    },

    // Cutting board on the island (center-relative, fraction of halfW/halfD)
    'cutting-board': {
      position: [halfW * (0.4 / 6.5), 1.05, -halfD * (0.3 / 6.5)],
      rotationY: -0.2,
      triggerRadius: 0,
    },

    // Pot on the counter near stove
    pot: {
      position: [-halfW + room.w * (2.5 / 13), 1.05, -halfD + room.d * (3.5 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Pot lid next to the pot
    'pot-lid': {
      position: [-halfW + room.w * (3.0 / 13), 1.05, -halfD + room.d * (3.3 / 13)],
      rotationY: 0.5,
      triggerRadius: 0,
    },

    // Bottle on the island (ominous unlabeled bottle — center-relative)
    bottle: {
      position: [-halfW * (0.5 / 6.5), 1.05, halfD * (0.5 / 6.5)],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Glass on the table
    glass: {
      position: [halfW - room.w * (2.8 / 13), 0.95, halfD - room.d * (2.2 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Plate on the table
    plate: {
      position: [halfW - room.w * (2.2 / 13), 0.95, halfD - room.d * (2.8 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Knife holder on counter
    'knife-holder': {
      position: [-halfW + room.w * (1.2 / 13), 1.05, -halfD + room.d * (5.5 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Toaster on counter
    toaster: {
      position: [-halfW + room.w * (1.8 / 13), 1.05, -halfD + room.d * (6.8 / 13)],
      rotationY: 0.1,
      triggerRadius: 0,
    },

    // Rolling pin on island (center-relative)
    roller: {
      position: [halfW * (0.8 / 6.5), 1.08, halfD * (0.1 / 6.5)],
      rotationY: 0.7,
      triggerRadius: 0,
    },

    // Cutlery scattered on island for horror atmosphere (center-relative)
    'cutlery-knife': {
      position: [halfW * (0.2 / 6.5), 1.06, -halfD * (0.6 / 6.5)],
      rotationY: 1.2,
      triggerRadius: 0,
    },

    'cutlery-cleaver': {
      position: [-halfW * (0.3 / 6.5), 1.06, halfD * (0.2 / 6.5)],
      rotationY: -0.8,
      triggerRadius: 0,
    },

    'cutlery-ladle': {
      position: [-halfW + room.w * (1.5 / 13), 1.06, -halfD + room.d * (4.0 / 13)],
      rotationY: 0.4,
      triggerRadius: 0,
    },

    'cutlery-fork': {
      position: [halfW - room.w * (2.5 / 13), 0.96, halfD - room.d * (2.5 / 13)],
      rotationY: 0.3,
      triggerRadius: 0,
    },

    'cutlery-spoon': {
      position: [halfW - room.w * (2.0 / 13), 0.96, halfD - room.d * (3.0 / 13)],
      rotationY: -0.2,
      triggerRadius: 0,
    },

    // Extra chair pushed aside (someone left in a hurry)
    'chair-extra': {
      position: [halfW - room.w * (4.0 / 13), 0, halfD - room.d * (1.5 / 13)],
      rotationY: -0.6,
      triggerRadius: 0,
    },

    // ---- New furniture replacement targets ----

    'l-counter-ext': {
      position: [-halfW + room.w * (1.0 / 13), 0, -halfD + room.d * (5.0 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    'upper-cabinets-2': {
      position: [-halfW + room.w * (1.0 / 13), room.h * 0.65, -halfD + room.d * (5.0 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    // ---- Horror props ----

    'bear-trap': {
      position: [halfW - room.w * (1.5 / 13), 0, halfD - room.d * (1.0 / 13)],
      rotationY: 0.8,
      triggerRadius: 0,
    },

    worm: {
      position: [-halfW + room.w * (2.5 / 13), 1.08, -halfD + room.d * (2.0 / 13)],
      rotationY: 2.1,
      triggerRadius: 0,
    },

    'fly-swatter': {
      position: [halfW - room.w * (0.3 / 13), room.h * 0.45, -halfD + room.d * (2.5 / 13)],
      rotationY: Math.PI / 2,
      triggerRadius: 0,
    },

    'broken-can': {
      position: [halfW - room.w * (3.0 / 13), 0, -halfD + room.d * (0.5 / 13)],
      rotationY: 1.5,
      triggerRadius: 0,
    },

    bandages: {
      position: [-halfW + room.w * (3.5 / 13), 1.06, -halfD + room.d * (4.5 / 13)],
      rotationY: 0.3,
      triggerRadius: 0,
    },

    matchbox: {
      position: [-halfW + room.w * (2.0 / 13), 1.06, -halfD + room.d * (4.2 / 13)],
      rotationY: -0.4,
      triggerRadius: 0,
    },

    'postit-note': {
      position: [-halfW + room.w * (1.5 / 13), room.h * 0.35, -halfD + room.d * (1.2 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    'fridge-letters': {
      position: [-halfW + room.w * (1.5 / 13), room.h * 0.3, -halfD + room.d * (1.6 / 13)],
      rotationY: 0,
      triggerRadius: 0,
    },

    'prop-knife': {
      position: [halfW * (0.6 / 6.5), 1.07, -halfD * (0.1 / 6.5)],
      rotationY: 2.4,
      triggerRadius: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the target for the given challenge index (0-4), or undefined if invalid.
 *
 * @param targets - The full targets map from resolveTargets()
 * @param challengeIndex - Challenge number (0=fridge, 1=grinder, 2=stuffer, 3=stove, 4=crt-tv)
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
  {glb: 'meat_grinder.glb', target: 'meat_grinder', animated: true},
  {glb: 'mixing_bowl.glb', target: 'mixing-bowl'},

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
