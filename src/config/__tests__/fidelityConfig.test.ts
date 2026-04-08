/**
 * Tests for fidelity tuning configuration (T2.C).
 *
 * Verifies that particle counts and FBO sizes have sane bounds
 * and that the mobile/desktop presets are internally consistent.
 */

import {describe, expect, it} from 'vitest';
import {FIDELITY} from '../fidelityConfig';

describe('FidelityConfig — preset bounds (T2.C)', () => {
  it('exports a FIDELITY object with required fields', () => {
    expect(FIDELITY).toBeDefined();
    expect(FIDELITY.grinderMaxParticles).toBeGreaterThan(0);
    expect(FIDELITY.grinderSpawnPerFrame).toBeGreaterThan(0);
    expect(FIDELITY.stoveFboSize).toBeGreaterThan(0);
    expect(FIDELITY.stoveSplatInstances).toBeGreaterThan(0);
    expect(FIDELITY.blowoutParticleCount).toBeGreaterThan(0);
    expect(FIDELITY.blowoutSplatterCount).toBeGreaterThan(0);
  });

  it('FBO size is a power of two', () => {
    const s = FIDELITY.stoveFboSize;
    expect(s & (s - 1)).toBe(0); // power-of-two check
  });

  it('grinder spawn per frame is less than max particles', () => {
    expect(FIDELITY.grinderSpawnPerFrame).toBeLessThan(FIDELITY.grinderMaxParticles);
  });

  it('blowout splatter count is less than particle count', () => {
    expect(FIDELITY.blowoutSplatterCount).toBeLessThan(FIDELITY.blowoutParticleCount);
  });
});

describe('FidelityConfig — preset values are reasonable', () => {
  it('grinder particles capped at 200 for mobile performance', () => {
    expect(FIDELITY.grinderMaxParticles).toBeLessThanOrEqual(200);
  });

  it('stove FBO size is at most 256 for mobile GPU', () => {
    expect(FIDELITY.stoveFboSize).toBeLessThanOrEqual(256);
  });

  it('blowout particles capped at 64 for mobile performance', () => {
    expect(FIDELITY.blowoutParticleCount).toBeLessThanOrEqual(64);
  });
});
