import {config} from '../../../config';
import type {RoomDimensions} from '../../FurnitureLayout';
import {computeRoom, DEFAULT_ROOM, STATION_TARGET_NAMES} from '../../FurnitureLayout';
import {mergeLayoutConfigs} from '../mergeConfigs';
import {resolveLayout} from '../resolveLayout';

/** Resolve the full production layout */
function resolve(room: RoomDimensions = DEFAULT_ROOM) {
  return resolveLayout(
    mergeLayoutConfigs(config.layout.room, config.layout.rails, config.layout.placements),
    room,
  );
}

describe('resolveLayout (full round-trip)', () => {
  const result = resolve();
  const {targets, anchors, landmarks, railItems} = result;

  it('produces a non-empty targets map', () => {
    expect(Object.keys(targets).length).toBeGreaterThan(30);
  });

  it('all 6 station targets exist with triggerRadius > 0', () => {
    for (const name of STATION_TARGET_NAMES) {
      expect(targets[name]).toBeDefined();
      expect(targets[name].triggerRadius).toBeGreaterThan(0);
    }
  });

  it('station targets have markerY set', () => {
    for (const name of STATION_TARGET_NAMES) {
      expect(targets[name].markerY).toBeDefined();
      expect(typeof targets[name].markerY).toBe('number');
    }
  });

  it('all target positions are finite numbers', () => {
    for (const [_name, target] of Object.entries(targets)) {
      const [x, y, z] = target.position;
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(Number.isFinite(z)).toBe(true);
      expect(Number.isFinite(target.rotationY)).toBe(true);
    }
  });

  it('generates surface anchors for all 6 room surfaces', () => {
    const ROOM_SURFACES = [
      'floor',
      'ceiling',
      'back-wall',
      'front-wall',
      'left-wall',
      'right-wall',
    ];
    for (const surf of ROOM_SURFACES) {
      expect(anchors[`${surf}:center`]).toBeDefined();
      expect(anchors[`${surf}:top-left`]).toBeDefined();
      expect(anchors[`${surf}:bottom-right`]).toBeDefined();
    }
    // 6 surfaces × 9 anchors each
    const surfaceAnchorKeys = Object.keys(anchors).filter(k => {
      const [prefix] = k.split(':');
      return ROOM_SURFACES.includes(prefix);
    });
    expect(surfaceAnchorKeys.length).toBe(54);
  });

  it('generates landmark entries', () => {
    // 18 base landmarks (corners+midpoints+center × floor/ceiling)
    // + surface anchors injected as landmarks
    expect(Object.keys(landmarks).length).toBeGreaterThan(18);
    expect(landmarks['center:floor']).toBeDefined();
    expect(landmarks['back-left:floor']).toBeDefined();
  });

  it('resolves rail items from containers', () => {
    expect(railItems.length).toBeGreaterThan(0);
    // l-counter and l-counter-ext from the counter row
    const counterItems = railItems.filter(
      item => item.targetName === 'l-counter' || item.targetName === 'l-counter-ext',
    );
    expect(counterItems).toHaveLength(2);
  });

  it('island target is at floor center', () => {
    const island = targets.island;
    // Island is at [0.5, 0.5] on floor — center of room + adhesion
    expect(island.position[0]).toBeCloseTo(0, 0);
    expect(island.position[2]).toBeCloseTo(0, 0);
  });

  it('trap-door is near ceiling height', () => {
    const trapDoor = targets['trap-door'];
    // Ceiling placement with very thin bounds — should be near room height
    expect(trapDoor.position[1]).toBeCloseTo(DEFAULT_ROOM.h, 0);
  });

  it('fridge is on the left side of the room', () => {
    const fridge = targets.fridge;
    expect(fridge.position[0]).toBeLessThan(0);
  });

  it('crt-tv is on the back wall', () => {
    const tv = targets['crt-tv'];
    // Back wall is at z = -halfD, adhesion pushes inward (+z)
    expect(tv.position[2]).toBeLessThan(0);
  });
});

describe('resolveLayout — responsive room scaling', () => {
  it('wider room moves left-wall objects further left', () => {
    const narrow = resolve(computeRoom(1));
    const wide = resolve(computeRoom(2));
    // Fridge is on left-wall — should be more negative x in wider room
    expect(wide.targets.fridge.position[0]).toBeLessThan(narrow.targets.fridge.position[0]);
  });

  it('taller room moves ceiling objects higher', () => {
    const short = resolve({w: 13, d: 13, h: 4});
    const tall = resolve({w: 13, d: 13, h: 8});
    expect(tall.targets['trap-door'].position[1]).toBeGreaterThan(
      short.targets['trap-door'].position[1],
    );
  });

  it('anchor count is consistent across room sizes', () => {
    const r1 = resolve(computeRoom(1));
    const r2 = resolve(computeRoom(2));
    // Same config → same number of anchors
    expect(Object.keys(r1.anchors).length).toBe(Object.keys(r2.anchors).length);
  });
});

describe('mergeLayoutConfigs', () => {
  it('merges room + rails + placements into flat LayoutConfig', () => {
    const merged = mergeLayoutConfigs(
      config.layout.room,
      config.layout.rails,
      config.layout.placements,
    );
    expect(Object.keys(merged.surfaces)).toHaveLength(6);
    expect(merged.containers.length).toBeGreaterThan(0);
    expect(Object.keys(merged.placements).length).toBeGreaterThan(30);
    // customLandmarks is optional — may be undefined when rails use surface anchor refs directly
  });
});
