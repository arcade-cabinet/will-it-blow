import type {RoomDimensions} from '../../FurnitureLayout';
import {DEFAULT_ROOM} from '../../FurnitureLayout';
import {generateSurfaceAnchors} from '../anchors';
import {resolvePlacement} from '../placement';
import type {PlacementDef, SurfaceDef} from '../types';

const room = DEFAULT_ROOM;
const halfW = room.w / 2;
const _halfD = room.d / 2;

/** Build standard room surfaces */
function buildSurfaces(): Record<string, SurfaceDef> {
  return {
    floor: {id: 'floor', axis: 'xz', alignment: 'horizontal', depth: 0},
    ceiling: {id: 'ceiling', axis: 'xz', alignment: 'horizontal', depth: 0},
    'back-wall': {id: 'back-wall', axis: 'xy', alignment: 'vertical', depth: 0},
    'front-wall': {id: 'front-wall', axis: 'xy', alignment: 'vertical', depth: 0},
    'left-wall': {id: 'left-wall', axis: 'xy', alignment: 'vertical', depth: 0},
    'right-wall': {id: 'right-wall', axis: 'xy', alignment: 'vertical', depth: 0},
  };
}

/** Build surface anchors for use in anchor-interpolation tests */
function buildAnchors(surfaces: Record<string, SurfaceDef>, r: RoomDimensions = room) {
  const anchors: Record<string, [number, number, number]> = {};
  for (const surface of Object.values(surfaces)) {
    Object.assign(anchors, generateSurfaceAnchors(surface, r));
  }
  return anchors;
}

describe('resolvePlacement (array form — UV fractions)', () => {
  const surfaces = buildSurfaces();
  const anchors = buildAnchors(surfaces);

  it('places object at floor center with adhesion offset', () => {
    const placement: PlacementDef = {
      on: 'floor',
      at: [0.5, 0.5],
      minBounds: [1, 0.5, 1],
    };
    const pos = resolvePlacement(placement, surfaces, anchors, room);
    // Floor center = (0, 0, 0), adhesion = (0, +0.25, 0) (half height)
    expect(pos[0]).toBeCloseTo(0);
    expect(pos[1]).toBeCloseTo(0.25);
    expect(pos[2]).toBeCloseTo(0);
  });

  it('places object on left-wall with +x adhesion', () => {
    const placement: PlacementDef = {
      on: 'left-wall',
      at: [0.5, 0.5],
      minBounds: [0.8, 2.0, 0.8],
    };
    const pos = resolvePlacement(placement, surfaces, anchors, room);
    // Left-wall at x=-halfW, adhesion +x by 0.4
    expect(pos[0]).toBeCloseTo(-halfW + 0.4);
    expect(pos[1]).toBeCloseTo(room.h * 0.5);
    expect(pos[2]).toBeCloseTo(0);
  });

  it('places object on ceiling with -y adhesion (hanging)', () => {
    const placement: PlacementDef = {
      on: 'ceiling',
      at: [0.5, 0.5],
      minBounds: [1.8, 0.1, 1.8],
    };
    const pos = resolvePlacement(placement, surfaces, anchors, room);
    // Ceiling normal is (0,-1,0), so adhesion pushes down
    expect(pos[1]).toBeCloseTo(room.h - 0.05);
  });

  it('UV (0, 0) on back-wall is bottom-left corner', () => {
    const placement: PlacementDef = {
      on: 'back-wall',
      at: [0, 0],
      minBounds: [0.01, 0.01, 0.01],
    };
    const pos = resolvePlacement(placement, surfaces, anchors, room);
    expect(pos[0]).toBeCloseTo(-halfW, 0);
    expect(pos[1]).toBeCloseTo(0, 0);
  });

  it('throws for unknown surface', () => {
    const placement: PlacementDef = {
      on: 'roof',
      at: [0.5, 0.5],
      minBounds: [1, 1, 1],
    };
    expect(() => resolvePlacement(placement, surfaces, anchors, room)).toThrow('Unknown surface');
  });
});

describe('resolvePlacement (object form — anchor interpolation)', () => {
  const surfaces = buildSurfaces();
  const anchors = buildAnchors(surfaces);

  it('interpolates between two ceiling anchors', () => {
    const placement: PlacementDef = {
      on: 'ceiling',
      at: {
        x: {from: 'ceiling:center', to: 'ceiling:left-midpoint', t: 0.5},
        z: {from: 'ceiling:center', to: 'ceiling:bottom-midpoint', t: 0.5},
      },
      minBounds: [1.4, 0.5, 0.5],
    };
    const pos = resolvePlacement(placement, surfaces, anchors, room);
    // x: midpoint between center (0) and left-midpoint (-halfW) at t=0.5 → -halfW/2
    expect(pos[0]).toBeCloseTo(-halfW / 2, 0);
    // adhesion: ceiling pushes down by 0.25
    expect(pos[1]).toBeCloseTo(room.h - 0.25, 1);
  });
});

describe('resolvePlacement — adhesion correctness', () => {
  const surfaces = buildSurfaces();
  const anchors = buildAnchors(surfaces);

  it('fridge adhesion: back flush against left-wall', () => {
    // Fridge: minBounds [0.8, 2.0, 0.8] on left-wall
    // Left-wall normal is [+1, 0, 0]
    // Adhesion = +1 * 0.8/2 = +0.4 in x
    const placement: PlacementDef = {
      on: 'left-wall',
      at: [0.1, 0.325],
      minBounds: [0.8, 2.0, 0.8],
    };
    const pos = resolvePlacement(placement, surfaces, anchors, room);
    // x should be wall position + adhesion offset
    const wallX = -halfW; // left wall
    expect(pos[0]).toBeCloseTo(wallX + 0.4, 1);
  });

  it('right-wall adhesion pushes object inward (-x)', () => {
    const placement: PlacementDef = {
      on: 'right-wall',
      at: [0.5, 0.5],
      minBounds: [0.6, 0.4, 0.2],
    };
    const pos = resolvePlacement(placement, surfaces, anchors, room);
    // Right-wall normal is [-1,0,0], bounds[0]=0.6, adhesion = -0.3
    expect(pos[0]).toBeCloseTo(halfW - 0.3);
  });
});

describe('resolvePlacement — different room sizes', () => {
  const surfaces = buildSurfaces();

  it('positions scale with room dimensions', () => {
    const small: RoomDimensions = {w: 8, d: 8, h: 4};
    const large: RoomDimensions = {w: 20, d: 20, h: 8};

    const placement: PlacementDef = {
      on: 'floor',
      at: [0.5, 0.5],
      minBounds: [1, 1, 1],
    };

    const smallAnchors = buildAnchors(surfaces, small);
    const largeAnchors = buildAnchors(surfaces, large);

    const posSmall = resolvePlacement(placement, surfaces, smallAnchors, small);
    const posLarge = resolvePlacement(placement, surfaces, largeAnchors, large);

    // Both should be at center (x=0, z=0)
    expect(posSmall[0]).toBeCloseTo(0);
    expect(posLarge[0]).toBeCloseTo(0);
    // Adhesion is the same (bounds-based, not room-based)
    expect(posSmall[1]).toBeCloseTo(posLarge[1]);
  });
});
