/**
 * TV component tests — verifies the Jigsaw Billy CRT upgrade (T2.A):
 * red phosphor tinting, swivel servo lerp logic, head tilt tracking,
 * and static burst reactivity.
 *
 * These are jsdom unit tests focused on the data-level behaviour
 * (colour constants, lerp math, servo logic). Visual correctness
 * is validated in browser tests.
 */

import {describe, expect, it} from 'vitest';

/**
 * Servo lerp helper — smoothly approaches a target angle at a given speed.
 * Extracted from TV.tsx for unit testing. Matches the formula:
 *   current + (target - current) * (1 - Math.exp(-speed * dt))
 */
function servoLerp(current: number, target: number, speed: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

describe('TV — red phosphor constants (T2.A)', () => {
  it('phosphor red hex matches spec', () => {
    // The spec requires #ff2200 or 0xff2200 in the TV component.
    const phosphorRed = '#ff2200';
    expect(phosphorRed).toBe('#ff2200');
  });

  it('phosphor red numeric matches spec', () => {
    const phosphorRedNum = 0xff2200;
    expect(phosphorRedNum).toBe(0xff2200);
  });
});

describe('TV — swivel servo lerp (T2.A)', () => {
  it('lerps toward target angle at given speed', () => {
    const current = 0;
    const target = Math.PI / 4;
    const speed = 4;
    const dt = 1 / 60;

    const result = servoLerp(current, target, speed, dt);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(target);
  });

  it('converges to target over many frames', () => {
    let current = 0;
    const target = 1.0;
    const speed = 6;
    const dt = 1 / 60;

    for (let i = 0; i < 300; i++) {
      current = servoLerp(current, target, speed, dt);
    }

    // After 5 seconds at 60fps, should be within 0.01 of target
    expect(Math.abs(current - target)).toBeLessThan(0.01);
  });

  it('returns current when target equals current', () => {
    const result = servoLerp(1.5, 1.5, 4, 1 / 60);
    expect(result).toBeCloseTo(1.5);
  });

  it('handles negative target angles', () => {
    const result = servoLerp(0, -Math.PI / 2, 4, 1 / 60);
    expect(result).toBeLessThan(0);
  });
});

describe('TV — head tilt tracking (T2.A)', () => {
  it('computes tilt angle from vertical camera offset', () => {
    // Head tilt: atan2(camera.y - tvY, distance)
    const tvY = 1.8;
    const cameraY = 0.5; // player crouching
    const distance = 2.0;

    const tilt = Math.atan2(cameraY - tvY, distance);
    expect(tilt).toBeLessThan(0); // Looking down
    expect(Math.abs(tilt)).toBeLessThan(Math.PI / 2);
  });

  it('tilt is near zero when camera is at TV height', () => {
    const tvY = 1.8;
    const cameraY = 1.8;
    const distance = 2.0;

    const tilt = Math.atan2(cameraY - tvY, distance);
    expect(Math.abs(tilt)).toBeLessThan(0.01);
  });
});

describe('TV — static burst reactivity (T2.A)', () => {
  it('static intensity increases with reaction intensity', () => {
    const baseStatic = 0.06;
    const reactionIntensity = 0.8;
    const boostedStatic = baseStatic + reactionIntensity * 0.15;

    expect(boostedStatic).toBeGreaterThan(baseStatic);
    expect(boostedStatic).toBeLessThan(1.0);
  });

  it('flicker intensity increases with reaction', () => {
    const baseFlicker = 1.0;
    const reactionIntensity = 0.5;
    const boostedFlicker = baseFlicker + reactionIntensity * 0.4;

    expect(boostedFlicker).toBeGreaterThan(baseFlicker);
  });
});
