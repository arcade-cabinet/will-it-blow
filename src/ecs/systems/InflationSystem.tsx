import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {inflatable} from '../world';

export function computeInflationScale(
  fillLevel: number,
  maxScale: number,
  pulseThreshold: number,
  pulseSpeed: number,
  pulseAmplitude: number,
  elapsed: number,
): number {
  let scale = 1 + fillLevel * (maxScale - 1);
  if (fillLevel > pulseThreshold) {
    const denom = 1 - pulseThreshold;
    const normalizedExcess = denom > 0 ? (fillLevel - pulseThreshold) / denom : 0;
    scale += Math.sin(elapsed * pulseSpeed) * pulseAmplitude * normalizedExcess;
  }
  return scale;
}

export function updateInflation(entities: Entity[], elapsed: number): void {
  for (const e of entities) {
    const {inflation, three} = e;
    if (!inflation || !three) continue;

    const s = computeInflationScale(
      inflation.fillLevel,
      inflation.maxScale,
      inflation.pulseThreshold,
      inflation.pulseSpeed,
      inflation.pulseAmplitude,
      elapsed,
    );
    three.scale.x = s;
    three.scale.z = s;
  }
}

export function InflationSystem() {
  useFrame(({clock}) => {
    updateInflation([...inflatable], clock.getElapsedTime());
  });
  return null;
}
