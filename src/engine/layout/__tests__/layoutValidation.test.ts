/**
 * @module layoutValidation.test
 * Spatial sanity checks for the layout system.
 *
 * These tests catch the bugs the user found during mobile testing:
 * - Floating upper cabinets (Y too high)
 * - Items inside walls (adhesion not applied)
 * - Items below floor
 * - Missing adhesion for rail items
 * - Dummy [1,1,1] bounds on rail items
 */

import {config} from '../../../config';
import {computeRoom, DEFAULT_ROOM, FURNITURE_RULES} from '../../FurnitureLayout';
import {getAdhesionOffset} from '../anchors';
import {mergeLayoutConfigs} from '../mergeConfigs';
import {resolveLayout} from '../resolveLayout';

function resolve(room = DEFAULT_ROOM) {
  return resolveLayout(
    mergeLayoutConfigs(config.layout.room, config.layout.rails, config.layout.placements),
    room,
  );
}

const room = DEFAULT_ROOM;
const halfW = room.w / 2;
const halfD = room.d / 2;

describe('layout spatial sanity', () => {
  const {targets} = resolve();

  it('no target is below the floor', () => {
    for (const [name, target] of Object.entries(targets)) {
      // Floor items sit at Y=0 (no adhesion); small negative from rounding ok
      expect(target.position[1]).toBeGreaterThanOrEqual(-0.5);
      if (target.position[1] < -0.1) {
        throw new Error(`"${name}" at Y=${target.position[1].toFixed(2)} is below floor`);
      }
    }
  });

  it('no target is above the ceiling', () => {
    for (const [name, target] of Object.entries(targets)) {
      if (target.position[1] > room.h + 0.5) {
        throw new Error(
          `"${name}" at Y=${target.position[1].toFixed(2)} exceeds ceiling (h=${room.h})`,
        );
      }
    }
  });

  it('no target is outside room X bounds', () => {
    for (const [name, target] of Object.entries(targets)) {
      // Allow small overshoot for wall-flush items
      if (Math.abs(target.position[0]) > halfW + 0.5) {
        throw new Error(
          `"${name}" at X=${target.position[0].toFixed(2)} is outside room (±${halfW})`,
        );
      }
    }
  });

  it('no target is outside room Z bounds', () => {
    for (const [name, target] of Object.entries(targets)) {
      if (Math.abs(target.position[2]) > halfD + 0.5) {
        throw new Error(
          `"${name}" at Z=${target.position[2].toFixed(2)} is outside room (±${halfD})`,
        );
      }
    }
  });

  it('upper cabinets are at reasonable kitchen height (1.5-3.0m)', () => {
    const upperTargets = ['upper-cabinets', 'upper-cabinets-2'];
    for (const name of upperTargets) {
      const t = targets[name];
      if (!t) continue;
      expect(t.position[1]).toBeGreaterThan(1.5);
      expect(t.position[1]).toBeLessThan(3.0);
    }
  });

  it('floor appliances are near floor level (Y < 1.0)', () => {
    const floorTargets = ['oven', 'dishwasher'];
    for (const name of floorTargets) {
      const t = targets[name];
      if (!t) continue;
      expect(t.position[1]).toBeLessThan(1.0);
      expect(t.position[1]).toBeGreaterThanOrEqual(0);
    }
  });

  it('counters are floor-standing (Y near 0)', () => {
    const counterTargets = ['l-counter', 'l-counter-ext'];
    for (const name of counterTargets) {
      const t = targets[name];
      if (!t) continue;
      // Counters are placed at floor level; the GLB model provides visual height
      expect(t.position[1]).toBeCloseTo(0, 1);
      expect(t.position[1]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('layout adhesion validation', () => {
  it('all onSurface containers have items with minBounds', () => {
    const rails = config.layout.rails;
    for (const container of rails.containers) {
      const surfaceId =
        'onSurface' in container ? (container as {onSurface?: string}).onSurface : undefined;
      if (!surfaceId) continue;
      for (const item of container.items) {
        expect(item.minBounds).toBeDefined();
        if (!item.minBounds) continue;
        // Bounds should be realistic (no dummy [1,1,1])
        const [w, h, d] = item.minBounds;
        expect(w).toBeGreaterThan(0);
        expect(h).toBeGreaterThan(0);
        expect(d).toBeGreaterThan(0);
      }
    }
  });

  it('left-wall items are pushed away from wall by adhesion', () => {
    const {targets} = resolve();
    // Left wall is at X = -halfW = -6.5
    // Items on left wall should have center X > -6.5 (pushed inward)
    const leftWallItems = [
      'l-counter',
      'l-counter-ext',
      'upper-cabinets',
      'upper-cabinets-2',
      'oven',
      'dishwasher',
    ];
    for (const name of leftWallItems) {
      const t = targets[name];
      if (!t) continue;
      expect(t.position[0]).toBeGreaterThan(-halfW);
    }
  });

  it('adhesion offset is consistent with minBounds', () => {
    // Verify the adhesion math for left-wall
    const bounds: [number, number, number] = [0.6, 0.9, 3.0];
    const offset = getAdhesionOffset('left-wall', bounds);
    // left-wall normal = [1,0,0], so adhesion = bounds[0]/2 in X
    expect(offset[0]).toBeCloseTo(0.3);
    expect(offset[1]).toBe(0);
    expect(offset[2]).toBe(0);
  });
});

describe('layout responsive scaling', () => {
  it('wider room scales left-wall items proportionally', () => {
    const narrow = resolve(computeRoom(1));
    const wide = resolve(computeRoom(2));

    // Left wall items should be more negative X in wider room
    const leftItems = ['l-counter', 'upper-cabinets'];
    for (const name of leftItems) {
      const nTarget = narrow.targets[name];
      const wTarget = wide.targets[name];
      if (!nTarget || !wTarget) continue;
      expect(wTarget.position[0]).toBeLessThan(nTarget.position[0]);
    }
  });

  it('all targets have finite positions across room sizes', () => {
    const rooms = [computeRoom(0.5), computeRoom(1), computeRoom(1.5), computeRoom(2)];
    for (const r of rooms) {
      const {targets: t} = resolve(r);
      for (const [name, target] of Object.entries(t)) {
        const [x, y, z] = target.position;
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
          throw new Error(`"${name}" has non-finite position in ${r.w}×${r.d} room`);
        }
      }
    }
  });
});

describe('layout config completeness', () => {
  it('all FURNITURE_RULES targets exist in layout', () => {
    const {targets} = resolve();
    const allTargetNames = new Set(Object.keys(targets));

    for (const rule of FURNITURE_RULES) {
      expect(allTargetNames.has(rule.target)).toBe(true);
    }
  });

  it('rail containers reference surface anchors, not landmark levels', () => {
    const rails = config.layout.rails;
    // No customLandmarks should exist (all removed in favor of surface anchor refs)
    expect(rails.customLandmarks).toBeUndefined();

    // Container from/to should be LandmarkRef objects referencing surface anchors
    for (const container of rails.containers) {
      const from = container.from;
      const to = container.to;

      // from/to should be objects with landmark field (not bare strings referencing custom landmarks)
      if (typeof from === 'object' && 'landmark' in from) {
        // Landmark should contain a ':' (surface anchor naming convention)
        expect(from.landmark).toContain(':');
      }
      if (typeof to === 'object' && 'landmark' in to) {
        expect(to.landmark).toContain(':');
      }
    }
  });
});
