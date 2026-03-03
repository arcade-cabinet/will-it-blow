import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {particles} from '../world';

const GRAVITY = 15;

export function updateParticles(entities: Entity[], delta: number): void {
  for (const e of entities) {
    const {particle, three} = e;
    if (!particle || !three) continue;

    if (particle.active) {
      three.position.x += particle.velocity[0] * delta;
      three.position.y += particle.velocity[1] * delta;
      three.position.z += particle.velocity[2] * delta;

      particle.velocity[1] -= GRAVITY * delta;
      particle.life += delta;

      if (particle.life >= particle.maxLife) {
        particle.active = false;
        three.visible = false;
      }
    } else {
      three.visible = false;
    }
  }
}

export function ParticlePhysicsSystem() {
  useFrame((_state, delta) => {
    updateParticles([...particles], delta);
  });
  return null;
}
