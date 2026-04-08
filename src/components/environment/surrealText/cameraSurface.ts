/**
 * @module cameraSurface
 * Camera-aware surface picker for the SurrealText system (T0.D).
 *
 * Given the player's camera direction, determines which wall surface
 * the player is currently looking at. This lets the SurrealText system
 * mount messages on the surface the player can actually see, rather
 * than hard-coding positions per phase.
 *
 * The basement room is an axis-aligned box with four walls, a ceiling,
 * and a floor. We classify the camera's forward vector into one of six
 * named surfaces by finding the dominant axis component:
 *
 *   -Z → 'wall-N' (north, back wall)
 *   +Z → 'wall-S' (south, front wall / door wall)
 *   -X → 'wall-W' (west, TV wall)
 *   +X → 'wall-E' (east, stove wall)
 *   +Y → 'ceiling'
 *   -Y → 'floor'
 */

/** Named surfaces matching the room geometry. */
export type SurfaceName = 'wall-N' | 'wall-S' | 'wall-W' | 'wall-E' | 'ceiling' | 'floor';

/**
 * Classify a camera forward direction vector into the closest named
 * surface. The vector does NOT need to be normalized — we compare
 * absolute magnitudes of the x/y/z components.
 *
 * @param forwardX — camera forward X component
 * @param forwardY — camera forward Y component
 * @param forwardZ — camera forward Z component
 */
export function classifySurface(forwardX: number, forwardY: number, forwardZ: number): SurfaceName {
  const ax = Math.abs(forwardX);
  const ay = Math.abs(forwardY);
  const az = Math.abs(forwardZ);

  if (ay >= ax && ay >= az) {
    return forwardY > 0 ? 'ceiling' : 'floor';
  }
  if (ax >= az) {
    return forwardX > 0 ? 'wall-E' : 'wall-W';
  }
  return forwardZ > 0 ? 'wall-S' : 'wall-N';
}

/**
 * World-space position + rotation for each named surface.
 * These match the existing PHASE_SURFACE values in SurrealText.tsx
 * so messages placed by surface name land on the correct walls.
 */
export interface SurfacePlacement {
  readonly position: [number, number, number];
  readonly rotation: [number, number, number];
}

export const SURFACE_PLACEMENTS: Record<SurfaceName, SurfacePlacement> = {
  'wall-N': {position: [0, 1.5, -3.8], rotation: [0, 0, 0]},
  'wall-S': {position: [0, 1.5, 3.8], rotation: [0, Math.PI, 0]},
  'wall-W': {position: [-2.9, 1.5, 0], rotation: [0, Math.PI / 2, 0]},
  'wall-E': {position: [2.9, 1.5, 0], rotation: [0, -Math.PI / 2, 0]},
  ceiling: {position: [0, 2.99, 0], rotation: [Math.PI / 2, 0, 0]},
  floor: {position: [0, 0.01, 0], rotation: [-Math.PI / 2, 0, 0]},
};
