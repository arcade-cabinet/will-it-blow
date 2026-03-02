import type {Entity} from '../../types';
import {updateFillDriven} from '../FillDrivenSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('FillDrivenSystem', () => {
  it('positions at maxY when fillLevel is 0', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      fillDriven: {minY: 1, maxY: 5, fillLevel: 0},
      three,
    };

    updateFillDriven([entity]);
    // minY + (1 - 0) * (maxY - minY) = 1 + 4 = 5
    expect(three.position.y).toBe(5);
  });

  it('positions at minY when fillLevel is 1', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      fillDriven: {minY: 1, maxY: 5, fillLevel: 1},
      three,
    };

    updateFillDriven([entity]);
    // minY + (1 - 1) * (maxY - minY) = 1 + 0 = 1
    expect(three.position.y).toBe(1);
  });

  it('interpolates at fillLevel 0.5', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      fillDriven: {minY: 0, maxY: 10, fillLevel: 0.5},
      three,
    };

    updateFillDriven([entity]);
    // 0 + (1 - 0.5) * (10 - 0) = 5
    expect(three.position.y).toBe(5);
  });

  it('handles negative Y range', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      fillDriven: {minY: -5, maxY: -1, fillLevel: 0.25},
      three,
    };

    updateFillDriven([entity]);
    // -5 + (1 - 0.25) * (-1 - (-5)) = -5 + 0.75 * 4 = -2
    expect(three.position.y).toBe(-2);
  });

  it('handles empty entity list', () => {
    expect(() => updateFillDriven([])).not.toThrow();
  });
});
