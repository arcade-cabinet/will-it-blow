/**
 * FurnitureLayout — pure engine module that defines named placement targets
 * computed from room dimensions. No React dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoomDimensions {
  w: number;
  d: number;
  h: number;
}

export interface Target {
  position: [number, number, number];
  rotationY: number;
  triggerRadius: number;
  markerY?: number;
}

export interface FurnitureRule {
  glb: string;
  target: string;
  animated?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_ROOM: RoomDimensions = {w: 13, d: 13, h: 5.5};

export const STATION_TARGET_NAMES = ['fridge', 'grinder', 'stuffer', 'stove', 'crt-tv'] as const;

// ---------------------------------------------------------------------------
// Target computation
// ---------------------------------------------------------------------------

/**
 * Computes all named targets from room dimensions.
 * Positions are relative to room center (0, 0, 0).
 *
 * Reference positions (for DEFAULT_ROOM 13x13x5.5):
 *   Fridge:  [-5.16, 1.79, -5.02]
 *   Grinder: [-4.75, 2.06, -0.64]
 *   Stuffer: [ 2.28, 2.68,  2.25]
 *   Stove:   [-4.98, 2.13, -2.23]
 *   CRT TV:  [ 0,    2.50, -5.50] (1 unit inside back wall)
 */
export function resolveTargets(room: RoomDimensions): Record<string, Target> {
  const halfW = room.w / 2;
  const halfD = room.d / 2;

  const grinderPos: [number, number, number] = [-halfW + 1.75, room.h * 0.375, -halfD + 5.86];

  return {
    // ---- Station targets (challenge order 0-4) ----

    // 0 — Fridge: left-back corner
    fridge: {
      position: [-halfW + 1.34, room.h * 0.325, -halfD + 1.48],
      rotationY: 0,
      triggerRadius: 2.0,
      markerY: 2.5,
    },

    // 1 — Grinder: left wall, mid-depth
    grinder: {
      position: grinderPos,
      rotationY: 0,
      triggerRadius: 1.5,
      markerY: 2.8,
    },

    // 2 — Stuffer: right side, front area
    stuffer: {
      position: [halfW - 4.22, room.h * 0.487, halfD - 4.25],
      rotationY: Math.PI,
      triggerRadius: 1.5,
      markerY: 3.5,
    },

    // 3 — Stove: left wall, between fridge and grinder
    stove: {
      position: [-halfW + 1.52, room.h * 0.387, -halfD + 4.27],
      rotationY: 0,
      triggerRadius: 1.5,
      markerY: 2.8,
    },

    // 4 — CRT TV: centered on back wall (z inside room, ~1 unit from wall)
    'crt-tv': {
      position: [0, room.h * 0.455, -halfD + 1.0],
      rotationY: 0,
      triggerRadius: 2.0,
      markerY: 3.5,
    },

    // ---- Interactive objects ----

    'mixing-bowl': {
      position: [-halfW + 1.34 + 1.5, 1.0, -halfD + 1.48],
      rotationY: 0,
      triggerRadius: 0,
    },

    // ---- Decorative targets ----

    'l-counter': {
      position: [-halfW + 1.0, 0, -halfD + 3.0],
      rotationY: 0,
      triggerRadius: 0,
    },

    'upper-cabinets': {
      position: [-halfW + 1.0, room.h * 0.65, -halfD + 3.0],
      rotationY: 0,
      triggerRadius: 0,
    },

    island: {
      position: [0, 0, 0],
      rotationY: 0,
      triggerRadius: 0,
    },

    table: {
      position: [halfW - 2.5, 0, halfD - 2.5],
      rotationY: 0,
      triggerRadius: 0,
    },

    'trash-can': {
      position: [halfW - 1.0, 0, -halfD + 1.0],
      rotationY: 0,
      triggerRadius: 0,
    },

    oven: {
      position: [-halfW + 1.5, 0, -halfD + 4.5],
      rotationY: 0,
      triggerRadius: 0,
    },

    dishwasher: {
      position: [-halfW + 1.5, 0, -halfD + 6.0],
      rotationY: 0,
      triggerRadius: 0,
    },

    'spice-rack': {
      position: [-halfW + 0.5, room.h * 0.5, -halfD + 5.0],
      rotationY: 0,
      triggerRadius: 0,
    },

    'utensil-hooks': {
      position: [-halfW + 0.5, room.h * 0.55, -halfD + 3.5],
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

    // ---- Atmospheric props ----

    // Frying pan resting near the stove
    'frying-pan': {
      position: [-halfW + 2.0, 1.05, -halfD + 4.8],
      rotationY: 0.3,
      triggerRadius: 0,
    },

    // Cutting board on the island
    'cutting-board': {
      position: [0.4, 1.05, -0.3],
      rotationY: -0.2,
      triggerRadius: 0,
    },

    // Pot on the counter near stove
    pot: {
      position: [-halfW + 2.5, 1.05, -halfD + 3.5],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Pot lid next to the pot
    'pot-lid': {
      position: [-halfW + 3.0, 1.05, -halfD + 3.3],
      rotationY: 0.5,
      triggerRadius: 0,
    },

    // Bottle on the island (ominous unlabeled bottle)
    bottle: {
      position: [-0.5, 1.05, 0.5],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Glass on the table
    glass: {
      position: [halfW - 2.8, 0.95, halfD - 2.2],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Plate on the table
    plate: {
      position: [halfW - 2.2, 0.95, halfD - 2.8],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Knife holder on counter
    'knife-holder': {
      position: [-halfW + 1.2, 1.05, -halfD + 5.5],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Toaster on counter
    toaster: {
      position: [-halfW + 1.8, 1.05, -halfD + 6.8],
      rotationY: 0.1,
      triggerRadius: 0,
    },

    // Rolling pin on island
    roller: {
      position: [0.8, 1.08, 0.1],
      rotationY: 0.7,
      triggerRadius: 0,
    },

    // Cutlery scattered on island for horror atmosphere
    'cutlery-knife': {
      position: [0.2, 1.06, -0.6],
      rotationY: 1.2,
      triggerRadius: 0,
    },

    'cutlery-cleaver': {
      position: [-0.3, 1.06, 0.2],
      rotationY: -0.8,
      triggerRadius: 0,
    },

    'cutlery-ladle': {
      position: [-halfW + 1.5, 1.06, -halfD + 4.0],
      rotationY: 0.4,
      triggerRadius: 0,
    },

    'cutlery-fork': {
      position: [halfW - 2.5, 0.96, halfD - 2.5],
      rotationY: 0.3,
      triggerRadius: 0,
    },

    'cutlery-spoon': {
      position: [halfW - 2.0, 0.96, halfD - 3.0],
      rotationY: -0.2,
      triggerRadius: 0,
    },

    // Extra chair pushed aside (someone left in a hurry)
    'chair-extra': {
      position: [halfW - 4.0, 0, halfD - 1.5],
      rotationY: -0.6,
      triggerRadius: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the target for the given challenge index (0-4), or undefined if invalid. */
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

export const FURNITURE_RULES: FurnitureRule[] = [
  // Core kitchen furniture
  {glb: 'l_counter.glb', target: 'l-counter'},
  {glb: 'upper_cabinets.glb', target: 'upper-cabinets'},
  {glb: 'island.glb', target: 'island'},
  {glb: 'table_chairs.glb', target: 'table'},
  {glb: 'trash_can.glb', target: 'trash-can'},
  {glb: 'fridge.glb', target: 'fridge', animated: true},
  {glb: 'oven_range.glb', target: 'oven'},
  {glb: 'dishwasher.glb', target: 'dishwasher'},
  {glb: 'meat_grinder.glb', target: 'meat_grinder', animated: true},
  {glb: 'mixing_bowl.glb', target: 'mixing-bowl'},
  {glb: 'spice_rack.glb', target: 'spice-rack'},
  {glb: 'utensil_hooks.glb', target: 'utensil-hooks'},
  // trap_door is room structure (ceiling panel), rendered in KitchenEnvironment — not furniture

  // Atmospheric props — scattered around to set the horror mood
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
  {glb: 'chair.glb', target: 'chair-extra'},
];
