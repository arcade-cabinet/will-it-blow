import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {plungers} from '../world';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const SPRING_RATE = 5.0;

export function updatePlungers(entities: Entity[], delta: number): void {
  for (const e of entities) {
    const {plunger, three} = e;
    if (!plunger || !three) continue;

    if (plunger.isDragging) {
      if (plunger.enabled) {
        plunger.displacement = clamp(
          plunger.displacement + plunger.dragDelta * plunger.sensitivity,
          0,
          1,
        );
        three.position[plunger.axis] = lerp(
          plunger.minWorld,
          plunger.maxWorld,
          plunger.displacement,
        );
      }
      plunger.dragDelta = 0; // Always consume to prevent stale delta on re-enable
    } else if (plunger.springBack) {
      plunger.displacement = Math.max(0, plunger.displacement * (1 - SPRING_RATE * delta));
      three.position[plunger.axis] = lerp(plunger.minWorld, plunger.maxWorld, plunger.displacement);
    }
  }
}

export function PlungerSystem() {
  useFrame((_state, delta) => {
    updatePlungers([...plungers], delta);
  });
  return null;
}
