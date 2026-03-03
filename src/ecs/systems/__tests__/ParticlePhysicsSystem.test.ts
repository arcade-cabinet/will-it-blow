import type {Entity} from '../../types';
import {updateParticles} from '../ParticlePhysicsSystem';

function makeObject3D() {
  return {
    position: {x: 0, y: 0, z: 0},
    rotation: {x: 0, y: 0, z: 0},
    scale: {x: 1, y: 1, z: 1},
    visible: true,
  } as unknown as Entity['three'];
}

describe('ParticlePhysicsSystem', () => {
  it('advances position by velocity * delta when active', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      particle: {active: true, velocity: [1, 2, 3], life: 0, maxLife: 5},
      three,
    };

    updateParticles([entity], 0.1);
    expect(three.position.x).toBeCloseTo(0.1);
    expect(three.position.y).toBeCloseTo(0.2);
    expect(three.position.z).toBeCloseTo(0.3);
  });

  it('applies gravity to velocity.y', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      particle: {active: true, velocity: [0, 10, 0], life: 0, maxLife: 5},
      three,
    };

    updateParticles([entity], 1.0);
    // velocity[1] was 10, after: 10 - 15*1 = -5
    expect(entity.particle!.velocity[1]).toBe(-5);
  });

  it('advances life by delta', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      particle: {active: true, velocity: [0, 0, 0], life: 0.5, maxLife: 5},
      three,
    };

    updateParticles([entity], 0.25);
    expect(entity.particle!.life).toBeCloseTo(0.75);
  });

  it('deactivates and hides particle when life exceeds maxLife', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      particle: {active: true, velocity: [0, 0, 0], life: 0.9, maxLife: 1.0},
      three,
    };

    updateParticles([entity], 0.2);
    expect(entity.particle!.active).toBe(false);
    expect(three.visible).toBe(false);
  });

  it('hides inactive particles', () => {
    const three = makeObject3D()!;
    three.visible = true;
    const entity: Entity = {
      particle: {active: false, velocity: [1, 1, 1], life: 0, maxLife: 5},
      three,
    };

    updateParticles([entity], 0.1);
    expect(three.visible).toBe(false);
    // Position should not change
    expect(three.position.x).toBe(0);
  });

  it('handles empty entity list', () => {
    expect(() => updateParticles([], 0.016)).not.toThrow();
  });

  it('accumulates across multiple frames', () => {
    const three = makeObject3D()!;
    const entity: Entity = {
      particle: {active: true, velocity: [10, 0, 0], life: 0, maxLife: 5},
      three,
    };

    updateParticles([entity], 0.1);
    updateParticles([entity], 0.1);
    expect(three.position.x).toBeCloseTo(2.0);
  });
});
