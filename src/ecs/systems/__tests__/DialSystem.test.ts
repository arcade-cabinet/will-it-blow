import type {Entity} from '../../types';
import {updateDials} from '../DialSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('DialSystem', () => {
  it('advances currentIndex on pendingTap when enabled', () => {
    const entity: Entity = {
      dial: {
        segments: ['off', 'low', 'medium', 'high'],
        currentIndex: 0,
        wraps: false,
        pendingTap: true,
        enabled: true,
      },
      three: makeObject3D(),
    };

    updateDials([entity]);
    expect(entity.dial!.currentIndex).toBe(1);
    expect(entity.dial!.pendingTap).toBe(false);
  });

  it('wraps around when wraps is true', () => {
    const entity: Entity = {
      dial: {
        segments: ['off', 'low', 'high'],
        currentIndex: 2,
        wraps: true,
        pendingTap: true,
        enabled: true,
      },
      three: makeObject3D(),
    };

    updateDials([entity]);
    expect(entity.dial!.currentIndex).toBe(0);
  });

  it('clamps at last index when wraps is false', () => {
    const entity: Entity = {
      dial: {
        segments: ['off', 'low', 'high'],
        currentIndex: 2,
        wraps: false,
        pendingTap: true,
        enabled: true,
      },
      three: makeObject3D(),
    };

    updateDials([entity]);
    expect(entity.dial!.currentIndex).toBe(2);
  });

  it('does nothing when pendingTap is false', () => {
    const entity: Entity = {
      dial: {
        segments: ['a', 'b', 'c'],
        currentIndex: 1,
        wraps: true,
        pendingTap: false,
        enabled: true,
      },
      three: makeObject3D(),
    };

    updateDials([entity]);
    expect(entity.dial!.currentIndex).toBe(1);
  });

  it('does nothing when disabled', () => {
    const entity: Entity = {
      dial: {
        segments: ['a', 'b', 'c'],
        currentIndex: 0,
        wraps: true,
        pendingTap: true,
        enabled: false,
      },
      three: makeObject3D(),
    };

    updateDials([entity]);
    expect(entity.dial!.currentIndex).toBe(0);
    expect(entity.dial!.pendingTap).toBe(true);
  });

  it('handles empty entity list', () => {
    expect(() => updateDials([])).not.toThrow();
  });

  it('advances multiple entities independently', () => {
    const e1: Entity = {
      dial: {
        segments: ['a', 'b', 'c'],
        currentIndex: 0,
        wraps: false,
        pendingTap: true,
        enabled: true,
      },
      three: makeObject3D(),
    };
    const e2: Entity = {
      dial: {
        segments: ['x', 'y'],
        currentIndex: 1,
        wraps: true,
        pendingTap: true,
        enabled: true,
      },
      three: makeObject3D(),
    };

    updateDials([e1, e2]);
    expect(e1.dial!.currentIndex).toBe(1);
    expect(e2.dial!.currentIndex).toBe(0); // wraps: 1 → 0
  });
});
