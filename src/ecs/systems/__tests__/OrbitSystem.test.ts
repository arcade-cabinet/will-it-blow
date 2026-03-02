import type {Entity} from '../../types';
import {updateOrbit} from '../OrbitSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('OrbitSystem', () => {
  it('sets position based on orbit parameters when active', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      orbit: {
        center: [1, 0, 2],
        radiusX: 3,
        radiusZ: 4,
        speedX: 1,
        speedZ: 1,
        active: true,
      },
      three,
    };

    const elapsed = 1.0;
    updateOrbit([entity], elapsed);
    expect(three.position.x).toBeCloseTo(1 + Math.sin(1) * 3);
    expect(three.position.z).toBeCloseTo(2 + Math.cos(1) * 4);
  });

  it('does not update position when inactive', () => {
    const three = makeObject3D()!;
    three.position.x = 10;
    three.position.z = 20;
    const entity: Entity = {
      orbit: {
        center: [0, 0, 0],
        radiusX: 5,
        radiusZ: 5,
        speedX: 1,
        speedZ: 1,
        active: false,
      },
      three,
    };

    updateOrbit([entity], 1.0);
    expect(three.position.x).toBe(10);
    expect(three.position.z).toBe(20);
  });

  it('positions at center + radius when elapsed is 0', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      orbit: {
        center: [5, 0, 5],
        radiusX: 2,
        radiusZ: 3,
        speedX: 1,
        speedZ: 1,
        active: true,
      },
      three,
    };

    updateOrbit([entity], 0);
    // sin(0)=0, cos(0)=1
    expect(three.position.x).toBeCloseTo(5);
    expect(three.position.z).toBeCloseTo(8);
  });

  it('handles different X and Z speeds', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      orbit: {
        center: [0, 0, 0],
        radiusX: 1,
        radiusZ: 1,
        speedX: 2,
        speedZ: 3,
        active: true,
      },
      three,
    };

    updateOrbit([entity], 1.0);
    expect(three.position.x).toBeCloseTo(Math.sin(2));
    expect(three.position.z).toBeCloseTo(Math.cos(3));
  });

  it('handles empty entity list', () => {
    expect(() => updateOrbit([], 1.0)).not.toThrow();
  });
});
