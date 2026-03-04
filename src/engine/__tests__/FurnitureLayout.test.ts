import {config} from '../../config';
import type {RoomDimensions} from '../FurnitureLayout';
import {
  computeRoom,
  DEFAULT_ROOM,
  FURNITURE_RULES,
  getStationTarget,
  STATION_TARGET_NAMES,
} from '../FurnitureLayout';
import {mergeLayoutConfigs, resolveLayout} from '../layout';

/** Helper — wraps resolveLayout() for tests */
function resolve(room: RoomDimensions = DEFAULT_ROOM) {
  return resolveLayout(
    mergeLayoutConfigs(config.layout.room, config.layout.rails, config.layout.placements),
    room,
  ).targets;
}

describe('FurnitureLayout', () => {
  describe('computeRoom', () => {
    it('computeRoom(1) matches DEFAULT_ROOM', () => {
      expect(DEFAULT_ROOM).toEqual(computeRoom(1));
    });

    it('computeRoom scales width with aspect ratio', () => {
      const wide = computeRoom(16 / 9);
      const narrow = computeRoom(1);
      expect(wide.w).toBeGreaterThan(narrow.w);
      expect(wide.d).toBeLessThan(narrow.d);
      expect(wide.h).toBe(narrow.h);
      // Floor area should be roughly similar
      const areaWide = wide.w * wide.d;
      const areaNarrow = narrow.w * narrow.d;
      expect(Math.abs(areaWide - areaNarrow)).toBeLessThan(1);
    });
  });

  describe('DEFAULT_ROOM', () => {
    it('has correct dimensions', () => {
      expect(DEFAULT_ROOM).toEqual({w: 13, d: 13, h: 5.5});
    });
  });

  describe('STATION_TARGET_NAMES', () => {
    it('has 7 station names in challenge order', () => {
      expect(STATION_TARGET_NAMES).toEqual([
        'fridge',
        'cutting-board',
        'grinder',
        'stuffer',
        'stove',
        'dining-table',
        'crt-tv',
      ]);
      expect(STATION_TARGET_NAMES).toHaveLength(7);
    });
  });

  describe('resolveLayout', () => {
    const targets = resolve(DEFAULT_ROOM);

    it('returns named targets with position, rotationY, and triggerRadius', () => {
      for (const key of Object.keys(targets)) {
        const t = targets[key];
        expect(t.position).toHaveLength(3);
        expect(typeof t.rotationY).toBe('number');
        expect(typeof t.triggerRadius).toBe('number');
      }
    });

    it('all 7 station targets exist with triggerRadius > 0 and markerY', () => {
      for (const name of STATION_TARGET_NAMES) {
        const t = targets[name];
        expect(t).toBeDefined();
        expect(t.triggerRadius).toBeGreaterThan(0);
        expect(t.markerY).toBeDefined();
        expect(typeof t.markerY).toBe('number');
      }
    });

    it('decorative targets exist', () => {
      const decorative = [
        'l-counter',
        'upper-cabinets',
        'island',
        'table',
        'trash-can',
        'oven',
        'dishwasher',
        'spice-rack',
        'utensil-hooks',
        'trap-door',
      ];
      for (const name of decorative) {
        expect(targets[name]).toBeDefined();
      }
    });

    it('trap-door is near ceiling height (adhesion offset)', () => {
      // trap-door minBounds height = 0.1, ceiling adhesion = -0.05
      expect(targets['trap-door'].position[1]).toBeCloseTo(DEFAULT_ROOM.h, 0);
    });

    it('positions are computed from room dimensions', () => {
      const small = resolve({w: 8, d: 8, h: 4});
      const large = resolve({w: 20, d: 20, h: 8});

      // Fridge x should be more negative in a wider room
      expect(large.fridge.position[0]).toBeLessThan(small.fridge.position[0]);

      // Trap-door y should scale with room height (close, not exact due to adhesion)
      expect(small['trap-door'].position[1]).toBeCloseTo(4, 0);
      expect(large['trap-door'].position[1]).toBeCloseTo(8, 0);

      // Station y values should scale with height
      expect(large.fridge.position[1]).toBeGreaterThan(small.fridge.position[1]);
    });

    it('all positions have finite numeric components', () => {
      for (const key of Object.keys(targets)) {
        const [x, y, z] = targets[key].position;
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
        expect(Number.isFinite(z)).toBe(true);
      }
    });

    it('all positions scale proportionally with room size', () => {
      const small = resolve(computeRoom(1));
      const wide = resolve(computeRoom(2));
      // Fridge should be further from center in wider room
      expect(Math.abs(wide.fridge.position[0])).toBeGreaterThan(Math.abs(small.fridge.position[0]));
      // Island stays at center
      expect(wide.island.position[0]).toBe(0);
      expect(wide.island.position[2]).toBe(0);
    });
  });

  describe('getStationTarget', () => {
    const targets = resolve(DEFAULT_ROOM);

    it('returns correct target for indices 0-6', () => {
      for (let i = 0; i < 7; i++) {
        const t = getStationTarget(targets, i);
        expect(t).toBeDefined();
        expect(t).toBe(targets[STATION_TARGET_NAMES[i]]);
      }
    });

    it('returns undefined for invalid indices', () => {
      expect(getStationTarget(targets, -1)).toBeUndefined();
      expect(getStationTarget(targets, 7)).toBeUndefined();
      expect(getStationTarget(targets, 100)).toBeUndefined();
    });
  });

  describe('FURNITURE_RULES', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(FURNITURE_RULES)).toBe(true);
      expect(FURNITURE_RULES.length).toBeGreaterThan(0);
    });

    it('each rule has glb and target strings', () => {
      for (const rule of FURNITURE_RULES) {
        expect(typeof rule.glb).toBe('string');
        expect(rule.glb.length).toBeGreaterThan(0);
        expect(typeof rule.target).toBe('string');
        expect(rule.target.length).toBeGreaterThan(0);
      }
    });

    it('every target name maps to a valid resolved target', () => {
      const targets = resolve(DEFAULT_ROOM);
      for (const rule of FURNITURE_RULES) {
        expect(targets[rule.target]).toBeDefined();
      }
    });

    it('animated rules have animated: true', () => {
      const animated = FURNITURE_RULES.filter(r => r.animated);
      expect(animated.length).toBeGreaterThanOrEqual(2);
      for (const rule of animated) {
        expect(rule.animated).toBe(true);
      }
    });

    const BLOATED = [
      'l_counter.glb',
      'oven_range.glb',
      'upper_cabinets.glb',
      'utensil_hooks.glb',
      'island.glb',
      'dishwasher.glb',
      'trash_can.glb',
      'table_chairs.glb',
      'spice_rack.glb',
      'sausage.glb',
    ];

    it('should not reference any bloated GLBs', () => {
      for (const rule of FURNITURE_RULES) {
        expect(BLOATED).not.toContain(rule.glb);
      }
    });

    it('should have horror prop targets', () => {
      const targets = resolve(DEFAULT_ROOM);
      expect(targets['bear-trap']).toBeDefined();
      expect(targets.worm).toBeDefined();
      expect(targets['fly-swatter']).toBeDefined();
    });

    it('every rule target must exist in resolved layout', () => {
      const targets = resolve(DEFAULT_ROOM);
      for (const rule of FURNITURE_RULES) {
        expect(targets[rule.target]).toBeDefined();
      }
    });
  });
});
