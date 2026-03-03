import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type {PointLight} from 'three';
import type {Entity} from '../types';
import {flickerLights} from '../world';

export function updateFlicker(entities: Entity[], elapsed: number): void {
  for (const e of entities) {
    const {flicker, three} = e;
    if (!flicker || !three || !flicker.active) continue;

    const light = three as unknown as PointLight;

    // Trigger a new flicker burst
    if (elapsed > flicker.nextAt && !flicker.flickering) {
      flicker.flickering = true;
      flicker.endAt = elapsed + flicker.duration;
      flicker.nextAt =
        elapsed + flicker.intervalMin + Math.random() * (flicker.intervalMax - flicker.intervalMin);
    }

    // Apply intensity during burst
    if (flicker.flickering && elapsed < flicker.endAt) {
      light.intensity = Math.sin(elapsed * 60) > 0 ? flicker.dimIntensity : flicker.baseIntensity;
    } else if (flicker.flickering) {
      // End burst — restore base intensity
      light.intensity = flicker.baseIntensity;
      flicker.flickering = false;
    }
  }
}

export function FlickerSystem() {
  const startRef = useRef(-1);

  useFrame(({clock}) => {
    const t = clock.getElapsedTime();
    if (startRef.current < 0) startRef.current = t;
    updateFlicker([...flickerLights], t - startRef.current);
  });

  return null;
}
