import {DEFAULT_ROOM} from '../../FurnitureLayout';
import {
  generateObjectAnchors,
  generateSurfaceAnchors,
  getAdhesionOffset,
  getSurfaceNormal,
  surfaceUVToWorld,
} from '../anchors';

const room = DEFAULT_ROOM; // {w: 13, d: 13, h: 5.5}
const halfW = room.w / 2;
const halfD = room.d / 2;

describe('getSurfaceNormal', () => {
  it('returns inward normals for all 6 surfaces', () => {
    expect(getSurfaceNormal('floor')).toEqual([0, 1, 0]);
    expect(getSurfaceNormal('ceiling')).toEqual([0, -1, 0]);
    expect(getSurfaceNormal('left-wall')).toEqual([1, 0, 0]);
    expect(getSurfaceNormal('right-wall')).toEqual([-1, 0, 0]);
    expect(getSurfaceNormal('back-wall')).toEqual([0, 0, 1]);
    expect(getSurfaceNormal('front-wall')).toEqual([0, 0, -1]);
  });

  it('throws for unknown surface', () => {
    expect(() => getSurfaceNormal('roof')).toThrow('Unknown surface');
  });
});

describe('getAdhesionOffset', () => {
  it('offsets along the normal axis by half the bounds extent', () => {
    // Fridge on left-wall: normal [+1,0,0], bounds [0.8, 2.0, 0.8]
    // Adhesion = +1 * 0.8/2 = [0.4, 0, 0]
    const offset = getAdhesionOffset('left-wall', [0.8, 2.0, 0.8]);
    expect(offset[0]).toBeCloseTo(0.4);
    expect(offset[1]).toBeCloseTo(0);
    expect(offset[2]).toBeCloseTo(0);
  });

  it('offsets upward for floor placement', () => {
    // Object on floor: normal [0,+1,0], bounds [1, 0.5, 1]
    const offset = getAdhesionOffset('floor', [1, 0.5, 1]);
    expect(offset).toEqual([0, 0.25, 0]);
  });

  it('offsets inward for back-wall placement', () => {
    const offset = getAdhesionOffset('back-wall', [1, 1, 0.6]);
    // Normal [0,0,+1], depth=0.6, half=0.3
    expect(offset[2]).toBeCloseTo(0.3);
  });
});

describe('surfaceUVToWorld', () => {
  it('maps floor (0,0) to back-left corner at y=0', () => {
    const pos = surfaceUVToWorld('floor', 0, 0, room);
    expect(pos[0]).toBeCloseTo(-halfW);
    expect(pos[1]).toBeCloseTo(0);
    expect(pos[2]).toBeCloseTo(-halfD);
  });

  it('maps floor (1,1) to front-right corner', () => {
    const pos = surfaceUVToWorld('floor', 1, 1, room);
    expect(pos[0]).toBeCloseTo(halfW);
    expect(pos[2]).toBeCloseTo(halfD);
  });

  it('maps ceiling (0.5, 0.5) to center at room height', () => {
    const pos = surfaceUVToWorld('ceiling', 0.5, 0.5, room);
    expect(pos[0]).toBeCloseTo(0);
    expect(pos[1]).toBeCloseTo(room.h);
    expect(pos[2]).toBeCloseTo(0);
  });

  it('maps left-wall u=0 to back edge, u=1 to front edge', () => {
    const back = surfaceUVToWorld('left-wall', 0, 0, room);
    const front = surfaceUVToWorld('left-wall', 1, 0, room);
    expect(back[0]).toBeCloseTo(-halfW);
    expect(back[2]).toBeCloseTo(-halfD);
    expect(front[2]).toBeCloseTo(halfD);
  });

  it('throws for unknown surface', () => {
    expect(() => surfaceUVToWorld('balcony', 0, 0, room)).toThrow();
  });
});

describe('generateSurfaceAnchors', () => {
  it('generates 9 anchors per surface', () => {
    const surface = {id: 'floor', axis: 'xz' as const, alignment: 'horizontal' as const, depth: 0};
    const anchors = generateSurfaceAnchors(surface, room);
    expect(Object.keys(anchors)).toHaveLength(9);
  });

  it('anchor names follow "{surface}:{position}" convention', () => {
    const surface = {
      id: 'back-wall',
      axis: 'xy' as const,
      alignment: 'vertical' as const,
      depth: 0,
    };
    const anchors = generateSurfaceAnchors(surface, room);
    expect(anchors['back-wall:center']).toBeDefined();
    expect(anchors['back-wall:top-left']).toBeDefined();
    expect(anchors['back-wall:bottom-right']).toBeDefined();
    expect(anchors['back-wall:top-midpoint']).toBeDefined();
  });

  it('floor center is at (0, 0, 0)', () => {
    const surface = {id: 'floor', axis: 'xz' as const, alignment: 'horizontal' as const, depth: 0};
    const anchors = generateSurfaceAnchors(surface, room);
    expect(anchors['floor:center'][0]).toBeCloseTo(0);
    expect(anchors['floor:center'][1]).toBeCloseTo(0);
    expect(anchors['floor:center'][2]).toBeCloseTo(0);
  });

  it('ceiling center y equals room height', () => {
    const surface = {
      id: 'ceiling',
      axis: 'xz' as const,
      alignment: 'horizontal' as const,
      depth: 0,
    };
    const anchors = generateSurfaceAnchors(surface, room);
    expect(anchors['ceiling:center'][1]).toBeCloseTo(room.h);
  });
});

describe('generateObjectAnchors', () => {
  it('generates 55 anchors (6 faces × 9 + 1 body center)', () => {
    const anchors = generateObjectAnchors('test-obj', [0, 0, 0], [1, 1, 1], 0);
    expect(Object.keys(anchors)).toHaveLength(55);
  });

  it('body center matches world position', () => {
    const anchors = generateObjectAnchors('box', [3, 2, -1], [1, 1, 1], 0);
    expect(anchors['box:center']).toEqual([3, 2, -1]);
  });

  it('top face center is offset by half height', () => {
    const anchors = generateObjectAnchors('box', [0, 0, 0], [2, 4, 2], 0);
    // Top face center should be at y = halfHeight = 2
    expect(anchors['box:top:center'][1]).toBeCloseTo(2);
  });

  it('respects rotation around Y axis', () => {
    // 90° rotation: x→z, z→-x
    const anchors = generateObjectAnchors('box', [0, 0, 0], [2, 1, 4], Math.PI / 2);
    // Front face at z=+depth/2=2, but rotated 90° → should be at x≈-2
    const frontCenter = anchors['box:front:center'];
    expect(frontCenter[0]).toBeCloseTo(-2, 0);
    expect(frontCenter[2]).toBeCloseTo(0, 0);
  });

  it('anchor names follow "{objectId}:{face}:{position}" convention', () => {
    const anchors = generateObjectAnchors('fridge', [0, 0, 0], [1, 2, 1], 0);
    expect(anchors['fridge:top:center']).toBeDefined();
    expect(anchors['fridge:bottom:top-left']).toBeDefined();
    expect(anchors['fridge:left:right-midpoint']).toBeDefined();
    expect(anchors['fridge:center']).toBeDefined();
  });
});
