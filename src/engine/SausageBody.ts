/**
 * @module SausageBody
 *
 * Ported from sausage_factory.html (POC lines 252-306, 533-558).
 *
 * Pure Three.js module — no Rapier / physics engine dependency.
 * The R3F component that uses this module owns the Rapier rigid bodies.
 *
 * Exports:
 *  - SausageCurve          — spiral coil curve (radius 0.5 → 3.3)
 *  - SausageParams         — geometry configuration interface
 *  - BoneAnchor            — per-bone state interface
 *  - buildSausageGeometry  — builds SkinnedMesh geometry + anchor list
 *  - computeSpringImpulse  — spring-damper impulse vector
 *  - applyCookingShrinkage — cooking deformation of an anchor target position
 */

import * as THREE from 'three/webgpu';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SausageParams {
  /** Number of spiral turns. Default: 4 */
  loops: number;
  /** Tube radius (POC: params.thick). Default: 0.5 */
  thickness: number;
  /** Tube path subdivisions (POC: pSeg). Default: 300 */
  pathSegments: number;
  /** Tube radial subdivisions (POC: rSeg). Default: 32 */
  radialSegments: number;
}

export interface BoneAnchor {
  /** Normalised curve parameter [0, 1] */
  t: number;
  /** Current spring target position (modified by cooking). */
  base: THREE.Vector3;
  /** Original rest position on the spiral curve. */
  tgt: THREE.Vector3;
  /** Whether this bone has been extruded out of the nozzle yet. */
  extruded: boolean;
}

// ---------------------------------------------------------------------------
// SausageCurve  (POC lines 256-261)
// ---------------------------------------------------------------------------

/**
 * Archimedean-like spiral curve used for the sausage coil shape.
 *
 * Radius grows linearly from 0.5 (t=0) to 3.3 (t=1) over `loops` full turns.
 * The curve lies in the XZ plane (y = 0).
 */
export class SausageCurve extends THREE.Curve<THREE.Vector3> {
  readonly loops: number;

  constructor(loops: number = 4) {
    super();
    this.loops = loops;
  }

  getPoint(t: number, target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const maxTh = this.loops * Math.PI * 2;
    const th = t * maxTh;
    const r = 0.5 + (th / maxTh) * 2.8; // radius 0.5 → 3.3
    return target.set(r * Math.cos(th), 0, r * Math.sin(th));
  }
}

// ---------------------------------------------------------------------------
// buildSausageGeometry  (POC lines 263-306)
// ---------------------------------------------------------------------------

export interface SausageGeometryResult {
  geometry: THREE.BufferGeometry;
  numBones: number;
  anchors: BoneAnchor[];
}

/**
 * Creates the skinned-mesh geometry for the sausage coil.
 *
 * Bones are NOT created here — they are created by the R3F component that owns
 * the Rapier world.  This function only returns the geometry (with skinIndex /
 * skinWeight attributes) and the anchor list so the component knows where to
 * place each bone.
 *
 * @param params - Geometry configuration (loops, thickness, segments).
 * @returns BufferGeometry, numBones count, and per-bone BoneAnchor array.
 */
export function buildSausageGeometry(params: SausageParams): SausageGeometryResult {
  const {loops, thickness, pathSegments: pSeg, radialSegments: rSeg} = params;

  const curve = new SausageCurve(loops);
  const numBones = loops * 10;

  // Build anchor list (POC lines 277-280)
  const anchors: BoneAnchor[] = [];
  for (let i = 0; i < numBones; i++) {
    const t = i / (numBones - 1);
    const p = curve.getPointAt(t);
    anchors.push({
      t,
      base: p.clone(),
      tgt: p.clone(),
      extruded: false,
    });
  }

  // Frenet frames for tube orientation (POC line 283)
  const frames = curve.computeFrenetFrames(pSeg, false);

  const verts: number[] = [];
  const uvs: number[] = [];
  const inds: number[] = [];
  const sInds: number[] = []; // skinIndex (4 per vertex)
  const sWts: number[] = []; // skinWeight (4 per vertex)

  // Build tube vertices (POC lines 284-295)
  for (let i = 0; i <= pSeg; i++) {
    const t = i / pSeg;
    const p = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    // Bone weight interpolation
    const bF = t * (numBones - 1);
    let b0 = Math.floor(bF);
    let b1 = Math.ceil(bF);
    const w1 = bF - b0;
    const w0 = 1 - w1;
    if (b0 >= numBones) b0 = numBones - 1;
    if (b1 >= numBones) b1 = numBones - 1;

    // Tapered ends: if within 2% of either end, taper radius to near zero (POC line 290)
    let cR = thickness;
    const dE = Math.min(t, 1 - t);
    if (dE < 0.02) {
      cR *= 0.01 + 0.99 * Math.sin((dE / 0.02) * (Math.PI / 2));
    }

    for (let j = 0; j <= rSeg; j++) {
      const th = (j / rSeg) * Math.PI * 2;
      const cosT = Math.cos(th);
      const sinT = Math.sin(th);

      verts.push(
        p.x + cR * (cosT * N.x + sinT * B.x),
        p.y + cR * (cosT * N.y + sinT * B.y),
        p.z + cR * (cosT * N.z + sinT * B.z),
      );
      uvs.push(j / rSeg, t * (pSeg / 10));
      sInds.push(b0, b1, 0, 0);
      sWts.push(w0, w1, 0, 0);
    }
  }

  // Triangle indices (POC lines 296-299)
  for (let i = 0; i < pSeg; i++) {
    for (let j = 0; j < rSeg; j++) {
      const a = i * (rSeg + 1) + (j + 1);
      const b = i * (rSeg + 1) + j;
      const c = (i + 1) * (rSeg + 1) + j;
      const d = (i + 1) * (rSeg + 1) + (j + 1);
      inds.push(a, d, b, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sInds, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sWts, 4));
  geo.setIndex(inds);
  geo.computeVertexNormals();

  return {geometry: geo, numBones, anchors};
}

// ---------------------------------------------------------------------------
// computeSpringImpulse  (POC lines 553-558)
// ---------------------------------------------------------------------------

/**
 * Computes the impulse to apply to a Rapier rigid body to spring it towards
 * a target position.  The formula is a simple spring-damper:
 *
 *   impulse = ((target - pos) * springK - vel * damping) * delta
 *
 * @param target   - Desired world position.
 * @param bodyPos  - Current body translation from Rapier.
 * @param bodyVel  - Current body linear velocity from Rapier.
 * @param delta    - Frame delta time (seconds).
 * @param springK  - Spring stiffness constant. Default: 80.
 * @param damping  - Velocity damping constant. Default: 10.
 * @returns Impulse vector `{ x, y, z }` ready to pass to `body.applyImpulse`.
 */
export function computeSpringImpulse(
  target: THREE.Vector3,
  bodyPos: {x: number; y: number; z: number},
  bodyVel: {x: number; y: number; z: number},
  delta: number,
  springK: number = 80,
  damping: number = 10,
): {x: number; y: number; z: number} {
  return {
    x: ((target.x - bodyPos.x) * springK - bodyVel.x * damping) * delta,
    y: ((target.y - bodyPos.y) * springK - bodyVel.y * damping) * delta,
    z: ((target.z - bodyPos.z) * springK - bodyVel.z * damping) * delta,
  };
}

// ---------------------------------------------------------------------------
// applyCookingShrinkage  (POC lines 549-552)
// ---------------------------------------------------------------------------

/**
 * Applies cooking deformation to an anchor's `base` position in-place.
 *
 * Effects:
 * - Y-axis shrinkage:  sY = 1 - cookLevel * 0.25  (25% at full cook)
 * - Edge-curl:         horizontal distance from tgt * 0.12, squared, scaled
 * - Sizzle vibration:  ±0.02 sine noise when `isCooking` is true
 *
 * Call this every frame for each bone after cookLevel > 0.  The function
 * mutates `anchor.base` and returns it for convenience.
 *
 * @param anchor     - The BoneAnchor to deform (reads `.tgt`, writes `.base`).
 * @param cookLevel  - Cooking progress [0, 1].  0 = no effect.
 * @param time       - Elapsed time in seconds (for sizzle animation).
 * @param index      - Bone index (offsets the sizzle phase per bone).
 * @param isCooking  - Whether the stove is actively heating right now.
 * @returns The mutated `anchor.base` vector.
 */
export function applyCookingShrinkage(
  anchor: BoneAnchor,
  cookLevel: number,
  time: number,
  index: number,
  isCooking: boolean,
): THREE.Vector3 {
  const p = anchor.tgt.clone();

  const sY = 1 - cookLevel * 0.25;
  const dx = p.x - anchor.tgt.x;
  const dz = p.z - anchor.tgt.z;
  const d2 = Math.sqrt(dx * dx + dz * dz);

  p.y = p.y * sY + (d2 * 0.12) ** 2 * cookLevel * 0.6;

  if (isCooking) {
    p.x += Math.sin(time * 15 + index) * 0.02;
    p.z += Math.cos(time * 18 + index) * 0.02;
  }

  anchor.base.copy(p);
  return anchor.base;
}
