import {
  DEFAULT_ROOM,
  FURNITURE_RULES,
  getStationTarget,
  resolveTargets,
  STATION_TARGET_NAMES,
} from '../FurnitureLayout';

describe('FurnitureLayout', () => {
  describe('DEFAULT_ROOM', () => {
    it('has correct dimensions', () => {
      expect(DEFAULT_ROOM).toEqual({w: 13, d: 13, h: 5.5});
    });
  });

  describe('STATION_TARGET_NAMES', () => {
    it('has 5 station names in challenge order', () => {
      expect(STATION_TARGET_NAMES).toEqual(['fridge', 'grinder', 'stuffer', 'stove', 'crt-tv']);
      expect(STATION_TARGET_NAMES).toHaveLength(5);
    });
  });

  describe('resolveTargets', () => {
    const targets = resolveTargets(DEFAULT_ROOM);

    it('returns named targets with position, rotationY, and triggerRadius', () => {
      for (const key of Object.keys(targets)) {
        const t = targets[key];
        expect(t.position).toHaveLength(3);
        expect(typeof t.rotationY).toBe('number');
        expect(typeof t.triggerRadius).toBe('number');
      }
    });

    it('all 5 station targets exist with triggerRadius > 0 and markerY', () => {
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

    it('trap-door is at ceiling height', () => {
      expect(targets['trap-door'].position[1]).toBe(DEFAULT_ROOM.h);
    });

    it('positions are computed from room dimensions', () => {
      const small = resolveTargets({w: 8, d: 8, h: 4});
      const large = resolveTargets({w: 20, d: 20, h: 8});

      // Fridge x should be more negative in a wider room
      expect(large.fridge.position[0]).toBeLessThan(small.fridge.position[0]);

      // Trap-door y should scale with room height
      expect(small['trap-door'].position[1]).toBe(4);
      expect(large['trap-door'].position[1]).toBe(8);

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
  });

  describe('getStationTarget', () => {
    const targets = resolveTargets(DEFAULT_ROOM);

    it('returns correct target for indices 0-4', () => {
      for (let i = 0; i < 5; i++) {
        const t = getStationTarget(targets, i);
        expect(t).toBeDefined();
        expect(t).toBe(targets[STATION_TARGET_NAMES[i]]);
      }
    });

    it('returns undefined for invalid indices', () => {
      expect(getStationTarget(targets, -1)).toBeUndefined();
      expect(getStationTarget(targets, 5)).toBeUndefined();
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

    it('every target name maps to a valid target from resolveTargets', () => {
      const targets = resolveTargets(DEFAULT_ROOM);
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
  });
});
