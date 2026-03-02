import type {Entity} from '../../types';
import {updateVibration} from '../VibrationSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('VibrationSystem', () => {
  it('offsets position by sin(elapsed * freq) * amplitude when active', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      vibration: {frequency: 2, amplitude: 0.5, active: true, axes: ['x']},
      transform: {position: [1, 2, 3], rotation: [0, 0, 0], scale: [1, 1, 1]},
      three,
    };

    updateVibration([entity], 1.0);
    expect(three.position.x).toBeCloseTo(1 + Math.sin(2) * 0.5);
    expect(three.position.y).toBe(0); // untouched
  });

  it('vibrates on multiple axes', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      vibration: {frequency: 3, amplitude: 0.2, active: true, axes: ['x', 'y']},
      transform: {position: [0, 5, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
      three,
    };

    updateVibration([entity], 0.5);
    const offset = Math.sin(0.5 * 3) * 0.2;
    expect(three.position.x).toBeCloseTo(0 + offset);
    expect(three.position.y).toBeCloseTo(5 + offset);
  });

  it('resets position when inactive and transform is present', () => {
    const three = makeObject3D()!;
    three.position.x = 99;
    three.position.z = 99;
    const entity: Entity = {
      vibration: {frequency: 2, amplitude: 0.5, active: false, axes: ['x', 'z']},
      transform: {position: [1, 2, 3], rotation: [0, 0, 0], scale: [1, 1, 1]},
      three,
    };

    updateVibration([entity], 1.0);
    expect(three.position.x).toBe(1);
    expect(three.position.z).toBe(3);
  });

  it('uses base 0 when transform is missing and active', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      vibration: {frequency: 1, amplitude: 1, active: true, axes: ['y']},
      three,
    };

    updateVibration([entity], Math.PI / 2);
    expect(three.position.y).toBeCloseTo(Math.sin(Math.PI / 2));
  });

  it('handles empty entity list', () => {
    expect(() => updateVibration([], 1.0)).not.toThrow();
  });

  it('handles zero frequency', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      vibration: {frequency: 0, amplitude: 0.5, active: true, axes: ['x']},
      transform: {position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
      three,
    };

    updateVibration([entity], 1.0);
    // sin(0) = 0, so position should be base
    expect(three.position.x).toBe(1);
  });
});
