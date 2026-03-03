/**
 * @module layout/anchors
 * Universal seam-based anchor generation for surfaces and objects.
 *
 * The SAME algorithm generates anchors for:
 * - Surfaces (depth=0): 4 seams → 4 corners + 4 edge midpoints + 1 center = 9 anchors
 * - Objects (depth>0): 6 faces × (4 corners + 4 edge midpoints + 1 center) + 1 body center
 *
 * Naming convention:
 *   Surface: "{surfaceId}:{position}"   e.g. "back-wall:top-left"
 *   Object:  "{objectId}:{face}:{pos}"  e.g. "fridge:top:center", "fridge:center"
 *
 * Surface inward normals (into the room):
 *   floor: [0,+1,0]  ceiling: [0,-1,0]
 *   left-wall: [+1,0,0]  right-wall: [-1,0,0]
 *   back-wall: [0,0,+1]  front-wall: [0,0,-1]
 */

import type {RoomDimensions} from '../FurnitureLayout';
import type {Bounds, SurfaceDef} from './types';

type Vec3 = [number, number, number];

// ---------------------------------------------------------------------------
// 2D anchor positions on a face (u,v fractions)
// ---------------------------------------------------------------------------

/** 9 anchor positions on any rectangular face, expressed as [u, v] fractions */
const FACE_ANCHORS: Record<string, [number, number]> = {
  'top-left': [0, 1],
  'top-right': [1, 1],
  'bottom-left': [0, 0],
  'bottom-right': [1, 0],
  'top-midpoint': [0.5, 1],
  'bottom-midpoint': [0.5, 0],
  'left-midpoint': [0, 0.5],
  'right-midpoint': [1, 0.5],
  center: [0.5, 0.5],
};

// ---------------------------------------------------------------------------
// Surface normals (inward, pointing into the room)
// ---------------------------------------------------------------------------

const SURFACE_NORMALS: Record<string, Vec3> = {
  floor: [0, 1, 0],
  ceiling: [0, -1, 0],
  'back-wall': [0, 0, 1],
  'front-wall': [0, 0, -1],
  'left-wall': [1, 0, 0],
  'right-wall': [-1, 0, 0],
};

/** Get the inward normal for a surface (into the room). */
export function getSurfaceNormal(surfaceId: string): Vec3 {
  const n = SURFACE_NORMALS[surfaceId];
  if (!n) throw new Error(`Unknown surface: "${surfaceId}"`);
  return [...n];
}

/**
 * Get the adhesion offset for an object placed on a surface.
 * This is half the minBounds extent along the surface's inward normal axis.
 */
export function getAdhesionOffset(surfaceId: string, bounds: Bounds): Vec3 {
  const normal = getSurfaceNormal(surfaceId);
  // bounds = [width(x), height(y), depth(z)]
  // Pick the bounds dimension that aligns with the normal's non-zero axis
  const extent =
    Math.abs(normal[0]) * bounds[0] +
    Math.abs(normal[1]) * bounds[1] +
    Math.abs(normal[2]) * bounds[2];
  const halfExtent = extent / 2;
  return [normal[0] * halfExtent, normal[1] * halfExtent, normal[2] * halfExtent];
}

// ---------------------------------------------------------------------------
// Surface → world coordinate mapping
// ---------------------------------------------------------------------------

/**
 * Map a surface-local [u, v] coordinate to world [x, y, z].
 * The surface is a 2D plane at a fixed position in the room.
 */
export function surfaceUVToWorld(
  surfaceId: string,
  u: number,
  v: number,
  room: RoomDimensions,
): Vec3 {
  const halfW = room.w / 2;
  const halfD = room.d / 2;

  switch (surfaceId) {
    case 'floor':
      return [-halfW + u * room.w, 0, -halfD + v * room.d];
    case 'ceiling':
      return [-halfW + u * room.w, room.h, -halfD + v * room.d];
    case 'back-wall':
      return [-halfW + u * room.w, v * room.h, -halfD];
    case 'front-wall':
      return [-halfW + u * room.w, v * room.h, halfD];
    case 'left-wall':
      // u = depth along wall (back→front = z), v = height (y)
      return [-halfW, v * room.h, -halfD + u * room.d];
    case 'right-wall':
      return [halfW, v * room.h, -halfD + u * room.d];
    default:
      throw new Error(`Unknown surface: "${surfaceId}"`);
  }
}

// ---------------------------------------------------------------------------
// Surface anchor generation (depth=0 — flat plane)
// ---------------------------------------------------------------------------

/**
 * Generate 9 anchors for a room surface (4 corners + 4 edge midpoints + 1 center).
 * Same algorithm as object face anchors, but depth=0.
 */
export function generateSurfaceAnchors(
  surface: SurfaceDef,
  room: RoomDimensions,
): Record<string, Vec3> {
  const anchors: Record<string, Vec3> = {};
  for (const [posName, [u, v]] of Object.entries(FACE_ANCHORS)) {
    anchors[`${surface.id}:${posName}`] = surfaceUVToWorld(surface.id, u, v, room);
  }
  return anchors;
}

// ---------------------------------------------------------------------------
// Object anchor generation (depth>0 — 3D bounding box)
// ---------------------------------------------------------------------------

/**
 * 6 named faces of a bounding box and their local-space definitions.
 * Each face is defined by: normal direction, and which two local axes
 * span the face (u-axis, v-axis), plus the face center offset.
 */
interface FaceDef {
  /** Offset from body center to face center, in half-extents */
  offset: [number, number, number];
  /** Local axis for u coordinate: 0=x, 1=y, 2=z */
  uAxis: number;
  uSign: number;
  /** Local axis for v coordinate */
  vAxis: number;
  vSign: number;
  /** Half-extent indices for u and v */
  uExtent: number;
  vExtent: number;
}

const OBJECT_FACES: Record<string, FaceDef> = {
  top: {offset: [0, 1, 0], uAxis: 0, uSign: 1, vAxis: 2, vSign: 1, uExtent: 0, vExtent: 2},
  bottom: {offset: [0, -1, 0], uAxis: 0, uSign: 1, vAxis: 2, vSign: -1, uExtent: 0, vExtent: 2},
  front: {offset: [0, 0, 1], uAxis: 0, uSign: 1, vAxis: 1, vSign: 1, uExtent: 0, vExtent: 1},
  back: {offset: [0, 0, -1], uAxis: 0, uSign: -1, vAxis: 1, vSign: 1, uExtent: 0, vExtent: 1},
  left: {offset: [-1, 0, 0], uAxis: 2, uSign: 1, vAxis: 1, vSign: 1, uExtent: 2, vExtent: 1},
  right: {offset: [1, 0, 0], uAxis: 2, uSign: -1, vAxis: 1, vSign: 1, uExtent: 2, vExtent: 1},
};

/**
 * Generate comprehensive anchors for a placed 3D object.
 *
 * For each of the 6 faces: 9 anchors (4 corners + 4 edge midpoints + 1 center).
 * Plus 1 body center. Total: up to 55 anchors (many shared at corners/edges).
 *
 * Anchors are named: "{objectId}:{face}:{position}" and "{objectId}:center".
 */
export function generateObjectAnchors(
  objectId: string,
  worldPosition: Vec3,
  bounds: Bounds,
  rotationY: number,
): Record<string, Vec3> {
  const [bw, bh, bd] = bounds;
  const halfExtents: Vec3 = [bw / 2, bh / 2, bd / 2];
  const [wx, wy, wz] = worldPosition;

  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);

  /** Rotate a local offset by rotationY around Y axis, then add world position */
  const toWorld = (lx: number, ly: number, lz: number): Vec3 => [
    wx + lx * cos - lz * sin,
    wy + ly,
    wz + lx * sin + lz * cos,
  ];

  const anchors: Record<string, Vec3> = {};

  // Body center
  anchors[`${objectId}:center`] = [wx, wy, wz];

  // Generate anchors for each face
  for (const [faceName, face] of Object.entries(OBJECT_FACES)) {
    // Face center in local space
    const fcx = face.offset[0] * halfExtents[0];
    const fcy = face.offset[1] * halfExtents[1];
    const fcz = face.offset[2] * halfExtents[2];

    const uHalf = halfExtents[face.uExtent];
    const vHalf = halfExtents[face.vExtent];

    // Generate 9 anchors on this face
    for (const [posName, [uFrac, vFrac]] of Object.entries(FACE_ANCHORS)) {
      // Convert [0,1] fraction to [-1,+1] range
      const uLocal = (uFrac * 2 - 1) * face.uSign * uHalf;
      const vLocal = (vFrac * 2 - 1) * face.vSign * vHalf;

      // Build local position: face center + u offset + v offset
      const local: Vec3 = [fcx, fcy, fcz];
      local[face.uAxis] += uLocal;
      local[face.vAxis] += vLocal;

      anchors[`${objectId}:${faceName}:${posName}`] = toWorld(local[0], local[1], local[2]);
    }
  }

  return anchors;
}
