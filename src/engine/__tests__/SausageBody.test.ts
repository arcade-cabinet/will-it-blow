import * as THREE from 'three/webgpu';
import {
  applyCookingShrinkage,
  type BoneAnchor,
  buildSausageGeometry,
  buildSausageLinksGeometry,
  computeSpringImpulse,
  SausageCurve,
  SausageLinksCurve,
  type SausageLinksParams,
  type SausageParams,
} from '../SausageBody';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_PARAMS: SausageParams = {
  loops: 4,
  thickness: 0.5,
  pathSegments: 300,
  radialSegments: 32,
};

// ---------------------------------------------------------------------------
// SausageCurve
// ---------------------------------------------------------------------------

describe('SausageCurve', () => {
  const curve = new SausageCurve(4);

  it('getPoint at t=0 starts at radius 0.5 along the +x axis', () => {
    const p = curve.getPoint(0);
    // th=0 → cos(0)=1, sin(0)=0, r=0.5
    expect(p.x).toBeCloseTo(0.5, 5);
    expect(p.y).toBeCloseTo(0, 5);
    expect(p.z).toBeCloseTo(0, 5);
  });

  it('getPoint at t=1 ends at radius 3.3', () => {
    const p = curve.getPoint(1);
    // th = 4*2π, cos(8π)=1, sin(8π)=0, r = 0.5+2.8 = 3.3
    const r = Math.sqrt(p.x * p.x + p.z * p.z);
    expect(r).toBeCloseTo(3.3, 4);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('getPoint at t=0.5 is at mid radius (~1.9) and halfway around', () => {
    const p = curve.getPoint(0.5);
    // halfway through loops=4 → th = 4π, r = 0.5 + 1.4 = 1.9
    const r = Math.sqrt(p.x * p.x + p.z * p.z);
    expect(r).toBeCloseTo(1.9, 4);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('curve lies entirely in the XZ plane (y=0 for all t)', () => {
    for (let i = 0; i <= 10; i++) {
      const p = curve.getPoint(i / 10);
      expect(p.y).toBeCloseTo(0, 10);
    }
  });

  it('uses the supplied target vector and returns it', () => {
    const target = new THREE.Vector3(99, 99, 99);
    const result = curve.getPoint(0, target);
    expect(result).toBe(target);
    expect(target.x).toBeCloseTo(0.5, 5);
  });

  it('respects the loops parameter — more loops means more angular travel', () => {
    const c2 = new SausageCurve(2);
    const c4 = new SausageCurve(4);
    // At t=0.25 the angular position differs based on loops:
    //   loops=2 → th = 0.25*4π  = π   → cos(π)=-1,   r=1.2  → x = -1.2
    //   loops=4 → th = 0.25*8π  = 2π  → cos(2π)=+1,  r=1.2  → x = +1.2
    // Same radius (r = 0.5 + t*2.8 = 1.2 for t=0.25 regardless of loops),
    // but the angular position around the coil is different.
    const p2 = c2.getPoint(0.25);
    const p4 = c4.getPoint(0.25);
    expect(p2.x).toBeCloseTo(-1.2, 4); // cos(π)  = -1 → x = -1.2
    expect(p4.x).toBeCloseTo(1.2, 4); // cos(2π) = +1 → x = +1.2
  });
});

// ---------------------------------------------------------------------------
// buildSausageGeometry
// ---------------------------------------------------------------------------

describe('buildSausageGeometry', () => {
  const result = buildSausageGeometry(DEFAULT_PARAMS);
  const {geometry, numBones, anchors} = result;

  it('numBones equals loops * 10', () => {
    expect(numBones).toBe(DEFAULT_PARAMS.loops * 10); // 40
  });

  it('anchors array has numBones entries', () => {
    expect(anchors).toHaveLength(numBones);
  });

  it('returns a BufferGeometry with position, uv, skinIndex, skinWeight attributes', () => {
    expect(geometry.getAttribute('position')).toBeDefined();
    expect(geometry.getAttribute('uv')).toBeDefined();
    expect(geometry.getAttribute('skinIndex')).toBeDefined();
    expect(geometry.getAttribute('skinWeight')).toBeDefined();
  });

  it('vertex count matches (pathSegments+1) * (radialSegments+1)', () => {
    const {pathSegments: pSeg, radialSegments: rSeg} = DEFAULT_PARAMS;
    const expectedVertices = (pSeg + 1) * (rSeg + 1);
    const posAttr = geometry.getAttribute('position');
    expect(posAttr.count).toBe(expectedVertices);
  });

  it('index count matches pathSegments * radialSegments * 6 triangles', () => {
    const {pathSegments: pSeg, radialSegments: rSeg} = DEFAULT_PARAMS;
    const expectedIndices = pSeg * rSeg * 6;
    expect(geometry.getIndex()!.count).toBe(expectedIndices);
  });

  it('skinWeight rows sum to 1 (normalised) for all vertices', () => {
    const swAttr = geometry.getAttribute('skinWeight') as THREE.Float32BufferAttribute;
    for (let i = 0; i < swAttr.count; i++) {
      const sum = swAttr.getX(i) + swAttr.getY(i) + swAttr.getZ(i) + swAttr.getW(i);
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it('anchor t values span [0, 1]', () => {
    expect(anchors[0].t).toBeCloseTo(0, 5);
    expect(anchors[anchors.length - 1].t).toBeCloseTo(1, 5);
  });

  it('anchors start with extruded = false', () => {
    for (const a of anchors) {
      expect(a.extruded).toBe(false);
    }
  });

  it('anchor base and tgt are equal on creation (deep copy, not same ref)', () => {
    for (const a of anchors) {
      expect(a.base.equals(a.tgt)).toBe(true);
      expect(a.base).not.toBe(a.tgt); // different object references
    }
  });

  it('works with loops=2 and produces correct numBones', () => {
    const r = buildSausageGeometry({loops: 2, thickness: 0.3, pathSegments: 50, radialSegments: 8});
    expect(r.numBones).toBe(20);
    expect(r.anchors).toHaveLength(20);
  });
});

// ---------------------------------------------------------------------------
// SausageLinksCurve
// ---------------------------------------------------------------------------

describe('SausageLinksCurve', () => {
  const numLinks = 5;
  const linkLength = 0.8;
  const curve = new SausageLinksCurve(numLinks, linkLength);
  const totalLength = numLinks * linkLength; // 4.0

  it('getPoint(0) returns (0, 0, -totalLength/2)', () => {
    const p = curve.getPoint(0);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(0, 5);
    expect(p.z).toBeCloseTo(-totalLength / 2, 5);
  });

  it('getPoint(1) returns (0, 0, +totalLength/2)', () => {
    const p = curve.getPoint(1);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(0, 5);
    expect(p.z).toBeCloseTo(totalLength / 2, 5);
  });

  it('getPoint(0.5) returns (0, 0, 0)', () => {
    const p = curve.getPoint(0.5);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(0, 5);
    expect(p.z).toBeCloseTo(0, 5);
  });

  it('uses the supplied target vector and returns it', () => {
    const target = new THREE.Vector3(99, 99, 99);
    const result = curve.getPoint(0, target);
    expect(result).toBe(target);
    expect(target.z).toBeCloseTo(-totalLength / 2, 5);
  });
});

// ---------------------------------------------------------------------------
// buildSausageLinksGeometry
// ---------------------------------------------------------------------------

describe('buildSausageLinksGeometry', () => {
  const LINKS_PARAMS: SausageLinksParams = {
    numLinks: 5,
    thickness: 0.4,
    linkLength: 0.8,
    pathSegments: 100,
    radialSegments: 16,
  };
  const result = buildSausageLinksGeometry(LINKS_PARAMS);
  const {geometry, numBones, anchors} = result;

  it('numBones equals numLinks', () => {
    expect(numBones).toBe(LINKS_PARAMS.numLinks);
  });

  it('vertex count matches (pathSegments+1) * (radialSegments+1)', () => {
    const expectedVertices = (LINKS_PARAMS.pathSegments + 1) * (LINKS_PARAMS.radialSegments + 1);
    const posAttr = geometry.getAttribute('position');
    expect(posAttr.count).toBe(expectedVertices);
  });

  it('geometry has skinIndex and skinWeight attributes', () => {
    expect(geometry.getAttribute('skinIndex')).toBeDefined();
    expect(geometry.getAttribute('skinWeight')).toBeDefined();
  });

  it('anchors array has numBones entries', () => {
    expect(anchors).toHaveLength(numBones);
  });

  it('anchor t values are centered in each link', () => {
    for (let i = 0; i < LINKS_PARAMS.numLinks; i++) {
      const expectedT = (i + 0.5) / LINKS_PARAMS.numLinks;
      expect(anchors[i].t).toBeCloseTo(expectedT, 5);
    }
  });

  it('anchors start with extruded = false', () => {
    for (const a of anchors) {
      expect(a.extruded).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// computeSpringImpulse
// ---------------------------------------------------------------------------

describe('computeSpringImpulse', () => {
  const ZERO_VEL = {x: 0, y: 0, z: 0};

  it('returns zero impulse when body is exactly at the target', () => {
    const target = new THREE.Vector3(3, 1, -2);
    const bodyPos = {x: 3, y: 1, z: -2};
    const imp = computeSpringImpulse(target, bodyPos, ZERO_VEL, 1 / 60);
    expect(imp.x).toBeCloseTo(0, 10);
    expect(imp.y).toBeCloseTo(0, 10);
    expect(imp.z).toBeCloseTo(0, 10);
  });

  it('impulse points toward target when body is offset in +x', () => {
    const target = new THREE.Vector3(0, 0, 0);
    const bodyPos = {x: 5, y: 0, z: 0}; // body is too far right
    const imp = computeSpringImpulse(target, bodyPos, ZERO_VEL, 1 / 60);
    // x impulse should be negative (spring pulls left toward 0)
    expect(imp.x).toBeLessThan(0);
    expect(imp.y).toBeCloseTo(0, 5);
    expect(imp.z).toBeCloseTo(0, 5);
  });

  it('impulse magnitude scales with displacement', () => {
    const target = new THREE.Vector3(0, 0, 0);
    const close = computeSpringImpulse(target, {x: 1, y: 0, z: 0}, ZERO_VEL, 1);
    const far = computeSpringImpulse(target, {x: 4, y: 0, z: 0}, ZERO_VEL, 1);
    expect(Math.abs(far.x)).toBeGreaterThan(Math.abs(close.x));
  });

  it('velocity damping reduces impulse when moving toward target', () => {
    const target = new THREE.Vector3(0, 0, 0);
    // Body at x=5, but already moving toward target at vx=-10
    const velToward = {x: -10, y: 0, z: 0};
    const velStill = {x: 0, y: 0, z: 0};
    const impMoving = computeSpringImpulse(target, {x: 5, y: 0, z: 0}, velToward, 1);
    const impStill = computeSpringImpulse(target, {x: 5, y: 0, z: 0}, velStill, 1);
    // Moving already has negative velocity, damping term reduces (adds) impulse magnitude
    // |impMoving.x| < |impStill.x| because damping opposes the motion in the wrong direction here
    // Actually: moving has vel -10, spring wants -ve, damping -(-10)*10 = +100 (opposes approach)
    // impMoving = (-5*80 - (-10)*10) * 1 = -400 + 100 = -300
    // impStill  = (-5*80 - 0*10)    * 1 = -400
    expect(Math.abs(impMoving.x)).toBeLessThan(Math.abs(impStill.x));
  });

  it('scales linearly with delta', () => {
    const target = new THREE.Vector3(1, 0, 0);
    const bodyPos = {x: 0, y: 0, z: 0};
    const imp1 = computeSpringImpulse(target, bodyPos, ZERO_VEL, 1 / 60);
    const imp2 = computeSpringImpulse(target, bodyPos, ZERO_VEL, 2 / 60);
    expect(imp2.x).toBeCloseTo(imp1.x * 2, 5);
  });

  it('uses custom springK and damping', () => {
    const target = new THREE.Vector3(1, 0, 0);
    const bodyPos = {x: 0, y: 0, z: 0};
    const impDefault = computeSpringImpulse(target, bodyPos, ZERO_VEL, 1);
    const impStiff = computeSpringImpulse(target, bodyPos, ZERO_VEL, 1, 160);
    expect(Math.abs(impStiff.x)).toBeGreaterThan(Math.abs(impDefault.x));
  });
});

// ---------------------------------------------------------------------------
// applyCookingShrinkage
// ---------------------------------------------------------------------------

function makeAnchor(x: number, y: number, z: number): BoneAnchor {
  return {
    t: 0.5,
    base: new THREE.Vector3(x, y, z),
    tgt: new THREE.Vector3(x, y, z),
    extruded: false,
  };
}

describe('applyCookingShrinkage', () => {
  it('cookLevel=0 does not change the y coordinate', () => {
    const anchor = makeAnchor(2, 1, 0);
    const result = applyCookingShrinkage(anchor, 0, 0, 0, false);
    // sY = 1, d2 = 0 (anchor.tgt.x === p.x, anchor.tgt.z === p.z)
    // p.y = 1 * 1 + 0 = 1
    expect(result.y).toBeCloseTo(1, 5);
  });

  it('cookLevel=1 shrinks y by 25%', () => {
    const anchor = makeAnchor(0, 4, 0);
    // d2 = 0 because p starts equal to tgt, so edge-curl term = 0
    const result = applyCookingShrinkage(anchor, 1, 0, 0, false);
    // sY = 1 - 1*0.25 = 0.75; p.y = 4 * 0.75 = 3.0
    expect(result.y).toBeCloseTo(3.0, 5);
  });

  it('isCooking adds sizzle displacement to x and z', () => {
    const anchor = makeAnchor(0, 0, 0);
    const result = applyCookingShrinkage(anchor, 1, 0, 0, true);
    // sin(0*15+0)*0.02 = 0; cos(0*18+0)*0.02 = 0.02
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.z).toBeCloseTo(0.02, 5);
  });

  it('isCooking=false produces no sizzle', () => {
    const anchor = makeAnchor(1, 0, 1);
    const result = applyCookingShrinkage(anchor, 0.5, 1.0, 2, false);
    const resultWithSizzle = applyCookingShrinkage(makeAnchor(1, 0, 1), 0.5, 1.0, 2, true);
    // Coordinates should differ when sizzle is on
    expect(resultWithSizzle.x).not.toBeCloseTo(result.x, 5);
  });

  it('mutates anchor.base in-place and returns it', () => {
    const anchor = makeAnchor(1, 2, 3);
    const original = anchor.base;
    const returned = applyCookingShrinkage(anchor, 0.5, 0, 0, false);
    expect(returned).toBe(original);
    expect(anchor.base).toBe(original);
  });

  it('sizzle displacement varies per bone index', () => {
    const a0 = makeAnchor(0, 0, 0);
    const a5 = makeAnchor(0, 0, 0);
    const r0 = applyCookingShrinkage(a0, 1, 1, 0, true);
    const r5 = applyCookingShrinkage(a5, 1, 1, 5, true);
    // Different indices → different sin/cos phase → different x or z
    const differ = Math.abs(r0.x - r5.x) > 1e-6 || Math.abs(r0.z - r5.z) > 1e-6;
    expect(differ).toBe(true);
  });
});
