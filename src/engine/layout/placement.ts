/**
 * @module layout/placement
 * Resolves surface-relative PlacementDefs to world-space positions
 * with automatic adhesion offset.
 *
 * Adhesion: When an object is placed "on" a surface, its center is
 * offset along the surface's inward normal by half the minBounds
 * extent in that direction. A fridge on `left-wall` with
 * `minBounds: [0.8, 2.0, 0.8]` → center offset +x by 0.4.
 * The fridge's back panel sits flush against the wall.
 *
 * Coordinate modes:
 * 1. Array `[u, v]`: surface-local UV fractions
 * 2. Object `{ x, y?, z? }`: per-axis anchor interpolation (world coords)
 */

import type {RoomDimensions} from '../FurnitureLayout';
import {getAdhesionOffset, surfaceUVToWorld} from './anchors';
import type {PlacementCoord, PlacementDef, SurfaceDef} from './types';

type Vec3 = [number, number, number];

/**
 * Resolve a single PlacementCoord.
 * - number: returned as-is
 * - { from, to, t }: lerp between two anchor positions on the requested axis
 */
function resolveCoord(
  coord: PlacementCoord,
  axis: 'x' | 'y' | 'z',
  anchors: Record<string, Vec3>,
): number {
  if (typeof coord === 'number') return coord;

  const fromAnchor = anchors[coord.from];
  const toAnchor = anchors[coord.to];
  if (!fromAnchor) throw new Error(`Unknown anchor: "${coord.from}"`);
  if (!toAnchor) throw new Error(`Unknown anchor: "${coord.to}"`);

  const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  return fromAnchor[idx] + (toAnchor[idx] - fromAnchor[idx]) * coord.t;
}

/**
 * Resolve a PlacementDef to a world-space [x, y, z] position.
 *
 * 1. Resolve surface UV → point on surface plane
 * 2. Apply adhesion offset (half minBounds along inward normal)
 */
export function resolvePlacement(
  placement: PlacementDef,
  surfaces: Record<string, SurfaceDef>,
  anchors: Record<string, Vec3>,
  room: RoomDimensions,
): Vec3 {
  const surface = surfaces[placement.on];
  if (!surface) {
    throw new Error(`Unknown surface: "${placement.on}"`);
  }

  const {at} = placement;

  // Step 1: Resolve UV to surface point
  let surfacePoint: Vec3;
  if (Array.isArray(at)) {
    surfacePoint = resolveArrayForm(at, surface, anchors, room);
  } else {
    surfacePoint = resolveObjectForm(at, surface, anchors, room);
  }

  // Step 2: Apply adhesion offset from minBounds
  const adhesion = getAdhesionOffset(placement.on, placement.minBounds);
  return [
    surfacePoint[0] + adhesion[0],
    surfacePoint[1] + adhesion[1],
    surfacePoint[2] + adhesion[2],
  ];
}

/**
 * Resolve [coord1, coord2] → surface point.
 * Both-numbers → direct UV. Interpolation objects → world coord overrides.
 */
function resolveArrayForm(
  at: [PlacementCoord, PlacementCoord],
  surface: SurfaceDef,
  anchors: Record<string, Vec3>,
  room: RoomDimensions,
): Vec3 {
  const [c1, c2] = at;

  // Simple case: both numbers → direct UV mapping
  if (typeof c1 === 'number' && typeof c2 === 'number') {
    return surfaceUVToWorld(surface.id, c1, c2, room);
  }

  // Start with UV for numeric parts
  const result = surfaceUVToWorld(
    surface.id,
    typeof c1 === 'number' ? c1 : 0.5,
    typeof c2 === 'number' ? c2 : 0.5,
    room,
  );

  // Override axes from interpolation
  if (surface.axis === 'xy') {
    if (typeof c1 !== 'number') {
      // c1 controls the "along-wall" axis
      if (surface.id === 'left-wall' || surface.id === 'right-wall') {
        result[2] = resolveCoord(c1, 'z', anchors);
      } else {
        result[0] = resolveCoord(c1, 'x', anchors);
      }
    }
    if (typeof c2 !== 'number') {
      result[1] = resolveCoord(c2, 'y', anchors);
    }
  } else {
    // Floor/ceiling: c1=x, c2=z
    if (typeof c1 !== 'number') result[0] = resolveCoord(c1, 'x', anchors);
    if (typeof c2 !== 'number') result[2] = resolveCoord(c2, 'z', anchors);
  }

  return result;
}

/**
 * Resolve { x, y?, z? } → surface point.
 * Each axis is independently resolved via anchor interpolation (world coords).
 * Missing axes get surface defaults.
 */
function resolveObjectForm(
  at: {x: PlacementCoord; y?: PlacementCoord; z?: PlacementCoord},
  surface: SurfaceDef,
  anchors: Record<string, Vec3>,
  room: RoomDimensions,
): Vec3 {
  const halfW = room.w / 2;
  const halfD = room.d / 2;

  const x = at.x !== undefined ? resolveCoord(at.x, 'x', anchors) : undefined;
  const y = at.y !== undefined ? resolveCoord(at.y, 'y', anchors) : undefined;
  const z = at.z !== undefined ? resolveCoord(at.z, 'z', anchors) : undefined;

  // Surface defaults for missing axes
  const defaultX = surface.id.includes('left') ? -halfW : surface.id.includes('right') ? halfW : 0;
  const defaultY = surface.id === 'floor' ? 0 : surface.id === 'ceiling' ? room.h : room.h / 2;
  const defaultZ = surface.id === 'back-wall' ? -halfD : surface.id === 'front-wall' ? halfD : 0;

  return [x ?? defaultX, y ?? defaultY, z ?? defaultZ];
}
