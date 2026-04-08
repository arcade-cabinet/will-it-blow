/**
 * Tests for fidelity tuning configuration.
 *
 * These pin the POC-faithful values we agreed on. If a future
 * performance pass wants to add adaptive quality tiers, it must add
 * new presets (e.g., FIDELITY_MOBILE) rather than weakening these.
 */

import {describe, expect, it} from 'vitest';
import {FIDELITY} from '../fidelityConfig';

describe('FidelityConfig — structural sanity', () => {
  it('exports a FIDELITY object with all required fields', () => {
    expect(FIDELITY).toBeDefined();
    expect(FIDELITY.grinderMaxParticles).toBeGreaterThan(0);
    expect(FIDELITY.grinderSpawnPerFrame).toBeGreaterThan(0);
    expect(FIDELITY.grinderMeatChunks).toBeGreaterThan(0);
    expect(FIDELITY.stoveFboSize).toBeGreaterThan(0);
    expect(FIDELITY.stoveSplatInstances).toBeGreaterThan(0);
    expect(FIDELITY.stoveDisplacementScale).toBeGreaterThan(0);
    expect(FIDELITY.blowoutParticleCount).toBeGreaterThan(0);
    expect(FIDELITY.blowoutSplatterCount).toBeGreaterThan(0);
  });

  it('FBO size is a power of two', () => {
    const s = FIDELITY.stoveFboSize;
    expect(s & (s - 1)).toBe(0);
  });

  it('grinder spawn per frame is less than max particles', () => {
    expect(FIDELITY.grinderSpawnPerFrame).toBeLessThan(FIDELITY.grinderMaxParticles);
  });

  it('blowout splatter count is less than particle count', () => {
    expect(FIDELITY.blowoutSplatterCount).toBeLessThan(FIDELITY.blowoutParticleCount);
  });
});

describe('FidelityConfig — POC-faithful values', () => {
  it('grinder has 300 max particles (POC spec)', () => {
    expect(FIDELITY.grinderMaxParticles).toBe(300);
  });

  it('grinder spawns 5 per frame (POC spec)', () => {
    expect(FIDELITY.grinderSpawnPerFrame).toBe(5);
  });

  it('grinder has 20 meat chunks (POC spec, was 5)', () => {
    expect(FIDELITY.grinderMeatChunks).toBe(20);
  });

  it('stove FBO is 512x512 (POC spec, was 256)', () => {
    expect(FIDELITY.stoveFboSize).toBe(512);
  });

  it('stove has 1000 splat instances (POC spec, was 100)', () => {
    expect(FIDELITY.stoveSplatInstances).toBe(1000);
  });

  it('stove displacement scale is 1.5 (POC spec, was 0.2)', () => {
    expect(FIDELITY.stoveDisplacementScale).toBe(1.5);
  });

  it('blowout has 1000 particles (POC spec, was 80)', () => {
    expect(FIDELITY.blowoutParticleCount).toBe(1000);
  });

  it('blowout has 50 splatter stains (POC spec, was 12)', () => {
    expect(FIDELITY.blowoutSplatterCount).toBe(50);
  });
});
