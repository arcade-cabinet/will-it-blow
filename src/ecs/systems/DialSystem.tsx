import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {dials} from '../world';

export function updateDials(entities: Entity[]): void {
  for (const e of entities) {
    const {dial} = e;
    if (!dial || !dial.pendingTap || !dial.enabled) continue;

    dial.currentIndex = dial.wraps
      ? (dial.currentIndex + 1) % dial.segments.length
      : Math.min(dial.currentIndex + 1, dial.segments.length - 1);
    dial.pendingTap = false;
  }
}

export function DialSystem() {
  useFrame(() => {
    updateDials([...dials]);
  });
  return null;
}
