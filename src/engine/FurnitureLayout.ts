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
      position: [-halfW + 1.75, room.h * 0.375, -halfD + 5.86],
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
      position: [-halfW + 1.75, room.h * 0.375, -halfD + 5.86],
      rotationY: 0,
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
  {glb: 'l_counter.glb', target: 'l-counter'},
  {glb: 'upper_cabinets.glb', target: 'upper-cabinets'},
  {glb: 'island.glb', target: 'island'},
  {glb: 'table_chairs.glb', target: 'table'},
  {glb: 'trash_can.glb', target: 'trash-can'},
  {glb: 'fridge.glb', target: 'fridge', animated: true},
  {glb: 'oven_range.glb', target: 'oven'},
  {glb: 'dishwasher.glb', target: 'dishwasher'},
  {glb: 'meat_grinder.glb', target: 'meat_grinder', animated: true},
  {glb: 'spice_rack.glb', target: 'spice-rack'},
  {glb: 'utensil_hooks.glb', target: 'utensil-hooks'},
  {glb: 'trap_door.glb', target: 'trap-door'},
];
