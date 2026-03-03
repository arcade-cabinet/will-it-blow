import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {rotating} from '../world';

export function updateRotation(entities: Entity[], delta: number): void {
  for (const e of entities) {
    const {rotation, three} = e;
    if (!rotation || !three || !rotation.active) continue;
    three.rotation[rotation.axis] += rotation.speed * delta;
  }
}

export function RotationSystem() {
  useFrame((_state, delta) => {
    updateRotation(rotating.entities, delta);
  });
  return null;
}
