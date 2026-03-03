/**
 * @module layout/resolveRail
 * Resolves a RailDef into world-space geometry.
 *
 * A rail is an invisible line segment between two landmarks.
 * Resolution computes direction, length, child rotation (from facing),
 * and perpendicular vector for offset items.
 */

import {resolveLandmarkRef} from './landmarks';
import type {Landmark, RailDef, ResolvedRail} from './types';

/**
 * Resolve a rail definition into world-space geometry.
 */
export function resolveRail(def: RailDef, landmarks: Record<string, Landmark>): ResolvedRail {
  const worldFrom = resolveLandmarkRef(def.from, landmarks);
  const worldTo = resolveLandmarkRef(def.to, landmarks);

  const dx = worldTo[0] - worldFrom[0];
  const dy = worldTo[1] - worldFrom[1];
  const dz = worldTo[2] - worldFrom[2];
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (length < 0.001) {
    throw new Error(`Rail "${def.id}" has zero length (from and to are the same point)`);
  }

  const direction: [number, number, number] = [dx / length, dy / length, dz / length];

  // Perpendicular in XZ plane (90° clockwise rotation of direction projected to XZ)
  const perpendicular: [number, number, number] = [direction[2], 0, -direction[0]];

  // Child rotation from facing
  let childRotationY: number;
  if (typeof def.facing === 'number') {
    childRotationY = def.facing;
  } else {
    // 'forward' = aligned with rail direction
    const baseAngle = Math.atan2(direction[0], direction[2]);
    switch (def.facing) {
      case 'forward':
        childRotationY = baseAngle;
        break;
      case 'inward':
        // Face toward center (0,0,0) — use midpoint of rail
        {
          const midX = (worldFrom[0] + worldTo[0]) / 2;
          const midZ = (worldFrom[2] + worldTo[2]) / 2;
          childRotationY = Math.atan2(-midX, -midZ);
        }
        break;
      case 'outward':
        // Face away from center
        {
          const midX = (worldFrom[0] + worldTo[0]) / 2;
          const midZ = (worldFrom[2] + worldTo[2]) / 2;
          childRotationY = Math.atan2(midX, midZ);
        }
        break;
      default:
        childRotationY = 0;
    }
  }

  return {
    id: def.id,
    worldFrom,
    worldTo,
    direction,
    length,
    childRotationY,
    perpendicular,
    perpendicularOffset: def.perpendicularOffset ?? 0,
  };
}
