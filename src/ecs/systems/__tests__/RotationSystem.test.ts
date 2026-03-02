import type {Entity} from '../../types';
import {updateRotation} from '../RotationSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('RotationSystem', () => {
  it('increments rotation on the specified axis when active', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      rotation: {axis: 'y', speed: 2.0, active: true},
      three,
    };

    updateRotation([entity], 0.016);
    expect(three.rotation.y).toBeCloseTo(2.0 * 0.016);
  });

  it('accumulates rotation across multiple frames', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      rotation: {axis: 'x', speed: 1.0, active: true},
      three,
    };

    updateRotation([entity], 0.5);
    updateRotation([entity], 0.5);
    expect(three.rotation.x).toBeCloseTo(1.0);
  });

  it('does not change rotation when inactive', () => {
    const three = makeObject3D()!;
    three.rotation.z = 1.5;
    const entity: Entity = {
      rotation: {axis: 'z', speed: 5.0, active: false},
      three,
    };

    updateRotation([entity], 0.016);
    expect(three.rotation.z).toBe(1.5);
  });

  it('handles empty entity list', () => {
    expect(() => updateRotation([], 0.016)).not.toThrow();
  });

  it('rotates on z axis', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      rotation: {axis: 'z', speed: -3.0, active: true},
      three,
    };

    updateRotation([entity], 0.1);
    expect(three.rotation.z).toBeCloseTo(-0.3);
  });
});
