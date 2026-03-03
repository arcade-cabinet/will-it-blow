/**
 * @module layout/landmarks
 * Generates addressable reference points from room geometry.
 *
 * ~18 landmarks auto-generated from room dimensions:
 * - 4 corners × 2 levels (floor, ceiling) = 8
 * - 4 wall midpoints × 2 levels = 8
 * - center × 2 levels = 2
 *
 * Intermediate heights (counter, shelf, upper-cabinet) are no longer
 * hardcoded — use surface anchors + LandmarkRef offsets instead.
 */

import type {RoomDimensions} from '../FurnitureLayout';
import type {Landmark, LandmarkRef} from './types';

const LEVELS: Array<{name: string; y: (room: RoomDimensions) => number}> = [
  {name: 'floor', y: () => 0},
  {name: 'ceiling', y: room => room.h},
];

interface CornerDef {
  name: string;
  x: (hw: number) => number;
  z: (hd: number) => number;
}

const CORNERS: CornerDef[] = [
  {name: 'back-left', x: hw => -hw, z: hd => -hd},
  {name: 'back-right', x: hw => hw, z: hd => -hd},
  {name: 'front-left', x: hw => -hw, z: hd => hd},
  {name: 'front-right', x: hw => hw, z: hd => hd},
];

interface MidpointDef {
  name: string;
  x: (hw: number) => number;
  z: (hd: number) => number;
}

const MIDPOINTS: MidpointDef[] = [
  {name: 'back', x: () => 0, z: hd => -hd},
  {name: 'front', x: () => 0, z: hd => hd},
  {name: 'left', x: hw => -hw, z: () => 0},
  {name: 'right', x: hw => hw, z: () => 0},
];

/**
 * Generate all standard landmarks from room dimensions.
 */
export function generateLandmarks(room: RoomDimensions): Record<string, Landmark> {
  const hw = room.w / 2;
  const hd = room.d / 2;
  const landmarks: Record<string, Landmark> = {};

  // Corners × levels
  for (const corner of CORNERS) {
    for (const level of LEVELS) {
      const id = `${corner.name}:${level.name}`;
      landmarks[id] = {
        position: [corner.x(hw), level.y(room), corner.z(hd)],
        label: id,
      };
    }
  }

  // Wall midpoints × levels
  for (const mid of MIDPOINTS) {
    for (const level of LEVELS) {
      const id = `${mid.name}:${level.name}`;
      landmarks[id] = {
        position: [mid.x(hw), level.y(room), mid.z(hd)],
        label: id,
      };
    }
  }

  // Center × levels
  for (const level of LEVELS) {
    const id = `center:${level.name}`;
    landmarks[id] = {
      position: [0, level.y(room), 0],
      label: id,
    };
  }

  return landmarks;
}

/**
 * Resolve a LandmarkRef to a world position.
 * - String: lookup by ID
 * - Object: lookup base landmark + apply offset
 */
export function resolveLandmarkRef(
  ref: LandmarkRef,
  landmarks: Record<string, Landmark>,
): [number, number, number] {
  if (typeof ref === 'string') {
    const lm = landmarks[ref];
    if (!lm) throw new Error(`Unknown landmark: "${ref}"`);
    return [...lm.position];
  }

  const base = landmarks[ref.landmark];
  if (!base) throw new Error(`Unknown landmark: "${ref.landmark}"`);
  return [
    base.position[0] + ref.offset[0],
    base.position[1] + ref.offset[1],
    base.position[2] + ref.offset[2],
  ];
}
