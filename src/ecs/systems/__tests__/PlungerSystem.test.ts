import type {Entity} from '../../types';
import {updatePlungers} from '../PlungerSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('PlungerSystem', () => {
  it('increases displacement on drag and updates position', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      plunger: {
        displacement: 0,
        axis: 'y',
        minWorld: 0,
        maxWorld: 5,
        sensitivity: 1.0,
        dragDelta: 0.3,
        isDragging: true,
        springBack: false,
        enabled: true,
      },
      three,
    };

    updatePlungers([entity], 0.016);
    expect(entity.plunger!.displacement).toBeCloseTo(0.3);
    // lerp(0, 5, 0.3) = 1.5
    expect(three.position.y).toBeCloseTo(1.5);
    expect(entity.plunger!.dragDelta).toBe(0);
  });

  it('clamps displacement between 0 and 1', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      plunger: {
        displacement: 0.9,
        axis: 'y',
        minWorld: 0,
        maxWorld: 10,
        sensitivity: 1.0,
        dragDelta: 0.5,
        isDragging: true,
        springBack: false,
        enabled: true,
      },
      three,
    };

    updatePlungers([entity], 0.016);
    expect(entity.plunger!.displacement).toBe(1);
    expect(three.position.y).toBeCloseTo(10);
  });

  it('clamps displacement at 0 for negative drag', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      plunger: {
        displacement: 0.1,
        axis: 'x',
        minWorld: -2,
        maxWorld: 2,
        sensitivity: 1.0,
        dragDelta: -0.5,
        isDragging: true,
        springBack: false,
        enabled: true,
      },
      three,
    };

    updatePlungers([entity], 0.016);
    expect(entity.plunger!.displacement).toBe(0);
    // lerp(-2, 2, 0) = -2
    expect(three.position.x).toBeCloseTo(-2);
  });

  it('springs back toward 0 when not dragging and springBack is true', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      plunger: {
        displacement: 0.8,
        axis: 'y',
        minWorld: 0,
        maxWorld: 10,
        sensitivity: 1.0,
        dragDelta: 0,
        isDragging: false,
        springBack: true,
        enabled: true,
      },
      three,
    };

    const delta = 0.1;
    updatePlungers([entity], delta);
    // displacement = 0.8 * (1 - 5.0 * 0.1) = 0.8 * 0.5 = 0.4
    expect(entity.plunger!.displacement).toBeCloseTo(0.4);
    // lerp(0, 10, 0.4) = 4
    expect(three.position.y).toBeCloseTo(4);
  });

  it('does not spring back when springBack is false and not dragging', () => {
    const three = makeObject3D()!;
    three.position.y = 5;
    const entity: Entity = {
      plunger: {
        displacement: 0.5,
        axis: 'y',
        minWorld: 0,
        maxWorld: 10,
        sensitivity: 1.0,
        dragDelta: 0,
        isDragging: false,
        springBack: false,
        enabled: true,
      },
      three,
    };

    updatePlungers([entity], 0.1);
    // Neither dragging nor springing: displacement stays the same
    expect(entity.plunger!.displacement).toBe(0.5);
    expect(three.position.y).toBe(5); // unchanged
  });

  it('does nothing when disabled', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      plunger: {
        displacement: 0.5,
        axis: 'y',
        minWorld: 0,
        maxWorld: 10,
        sensitivity: 1.0,
        dragDelta: 0.3,
        isDragging: true,
        springBack: false,
        enabled: false,
      },
      three,
    };

    updatePlungers([entity], 0.016);
    expect(entity.plunger!.displacement).toBe(0.5);
    expect(entity.plunger!.dragDelta).toBe(0.3); // not consumed
  });

  it('handles empty entity list', () => {
    expect(() => updatePlungers([], 0.016)).not.toThrow();
  });

  it('works on the z axis', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      plunger: {
        displacement: 0,
        axis: 'z',
        minWorld: -1,
        maxWorld: 1,
        sensitivity: 2.0,
        dragDelta: 0.25,
        isDragging: true,
        springBack: false,
        enabled: true,
      },
      three,
    };

    updatePlungers([entity], 0.016);
    // displacement = 0 + 0.25 * 2.0 = 0.5
    expect(entity.plunger!.displacement).toBeCloseTo(0.5);
    // lerp(-1, 1, 0.5) = 0
    expect(three.position.z).toBeCloseTo(0);
  });
});
