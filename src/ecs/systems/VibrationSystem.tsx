import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {vibrating} from '../world';

const AXIS_INDEX = {x: 0, y: 1, z: 2} as const;

export function updateVibration(entities: Entity[], elapsed: number): void {
  for (const e of entities) {
    const {vibration, three, transform} = e;
    if (!vibration || !three) continue;

    if (vibration.active) {
      for (const axis of vibration.axes) {
        const idx = AXIS_INDEX[axis];
        const base = transform ? transform.position[idx] : 0;
        three.position[axis] = base + Math.sin(elapsed * vibration.frequency) * vibration.amplitude;
      }
    } else if (transform) {
      for (const axis of vibration.axes) {
        const idx = AXIS_INDEX[axis];
        three.position[axis] = transform.position[idx];
      }
    }
  }
}

export function VibrationSystem() {
  useFrame(({clock}) => {
    updateVibration([...vibrating], clock.getElapsedTime());
  });
  return null;
}
