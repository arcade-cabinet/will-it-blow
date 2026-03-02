import type {Entity} from '../../types';
import {updateCranks} from '../CrankSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('CrankSystem', () => {
  it('applies dragDelta * sensitivity as angularVelocity when dragging', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      crank: {
        angle: 0,
        angularVelocity: 0,
        sensitivity: 2.0,
        damping: 0.5,
        dragDelta: 0.1,
        isDragging: true,
        enabled: true,
      },
      three,
    };

    updateCranks([entity], 0.016);
    expect(entity.crank!.angularVelocity).toBeCloseTo(0.2); // 0.1 * 2.0
    expect(entity.crank!.angle).toBeCloseTo(0.2 * 0.016);
    expect(entity.crank!.dragDelta).toBe(0);
    expect(three.rotation.y).toBeCloseTo(0.2 * 0.016);
  });

  it('decays angularVelocity when not dragging', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      crank: {
        angle: 1.0,
        angularVelocity: 5.0,
        sensitivity: 1.0,
        damping: 0.5,
        dragDelta: 0,
        isDragging: false,
        enabled: true,
      },
      three,
    };

    const delta = 0.016;
    updateCranks([entity], delta);

    const expectedVelocity = 5.0 * (1 - 0.5 * delta);
    const expectedAngle = 1.0 + expectedVelocity * delta;
    expect(entity.crank!.angularVelocity).toBeCloseTo(expectedVelocity);
    expect(entity.crank!.angle).toBeCloseTo(expectedAngle);
    expect(three.rotation.y).toBeCloseTo(expectedAngle);
  });

  it('still updates rotation when dragging but disabled (decay path)', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      crank: {
        angle: 0,
        angularVelocity: 2.0,
        sensitivity: 1.0,
        damping: 0.5,
        dragDelta: 0.5,
        isDragging: true,
        enabled: false,
      },
      three,
    };

    const delta = 0.016;
    updateCranks([entity], delta);

    // disabled → falls through to else branch (decay)
    const expectedVelocity = 2.0 * (1 - 0.5 * delta);
    const expectedAngle = expectedVelocity * delta;
    expect(entity.crank!.angularVelocity).toBeCloseTo(expectedVelocity);
    expect(entity.crank!.angle).toBeCloseTo(expectedAngle);
    expect(three.rotation.y).toBeCloseTo(expectedAngle);
  });

  it('accumulates angle across multiple frames', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      crank: {
        angle: 0,
        angularVelocity: 0,
        sensitivity: 1.0,
        damping: 0.0,
        dragDelta: 1.0,
        isDragging: true,
        enabled: true,
      },
      three,
    };

    updateCranks([entity], 1.0);
    // angularVelocity = 1.0 * 1.0 = 1.0, angle = 0 + 1.0 * 1.0 = 1.0
    expect(entity.crank!.angle).toBeCloseTo(1.0);

    entity.crank!.dragDelta = 1.0;
    updateCranks([entity], 1.0);
    // angularVelocity = 1.0 * 1.0 = 1.0, angle = 1.0 + 1.0 * 1.0 = 2.0
    expect(entity.crank!.angle).toBeCloseTo(2.0);
    expect(three.rotation.y).toBeCloseTo(2.0);
  });

  it('handles empty entity list', () => {
    expect(() => updateCranks([], 0.016)).not.toThrow();
  });
});
