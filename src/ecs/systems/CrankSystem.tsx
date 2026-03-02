import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {cranks} from '../world';

export function updateCranks(entities: Entity[], delta: number): void {
  for (const e of entities) {
    const {crank, three} = e;
    if (!crank || !three) continue;

    if (crank.isDragging) {
      if (crank.enabled) {
        crank.angularVelocity = crank.dragDelta * crank.sensitivity;
        crank.angle += crank.angularVelocity * delta;
      }
      crank.dragDelta = 0; // Always consume to prevent stale delta on re-enable
    } else {
      crank.angularVelocity *= 1 - crank.damping * delta;
      crank.angle += crank.angularVelocity * delta;
    }
    three.rotation.y = crank.angle;
  }
}

export function CrankSystem() {
  useFrame((_state, delta) => {
    updateCranks([...cranks], delta);
  });
  return null;
}
