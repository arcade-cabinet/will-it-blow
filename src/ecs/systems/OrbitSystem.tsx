import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {orbiting} from '../world';

export function updateOrbit(entities: Entity[], elapsed: number): void {
  for (const e of entities) {
    const {orbit, three} = e;
    if (!orbit || !three || !orbit.active) continue;
    three.position.x = orbit.center[0] + Math.sin(elapsed * orbit.speedX) * orbit.radiusX;
    three.position.z = orbit.center[2] + Math.cos(elapsed * orbit.speedZ) * orbit.radiusZ;
  }
}

export function OrbitSystem() {
  useFrame(({clock}) => {
    updateOrbit([...orbiting], clock.getElapsedTime());
  });
  return null;
}
