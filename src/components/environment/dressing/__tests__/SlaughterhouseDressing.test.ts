/**
 * SlaughterhouseDressing tests — verifies the set dressing module exports
 * and sub-component structure (T2.B).
 *
 * These are jsdom unit tests focused on module structure and configuration.
 * Visual correctness is validated in browser tests.
 */

import {describe, expect, it} from 'vitest';

// We test module structure by importing the barrel and verifying exports.
// The actual R3F components require a Canvas context, so we only test
// the configuration data and module wiring here.

describe('SlaughterhouseDressing — module structure (T2.B)', () => {
  it('exports WALL_TROPHY_MODELS config', async () => {
    const mod = await import('../wallTrophyModels');
    expect(mod.WALL_TROPHY_MODELS).toBeDefined();
    expect(Array.isArray(mod.WALL_TROPHY_MODELS)).toBe(true);
    expect(mod.WALL_TROPHY_MODELS.length).toBeGreaterThan(0);
  });

  it('exports CEILING_HAZARD_MODELS config', async () => {
    const mod = await import('../ceilingHazardModels');
    expect(mod.CEILING_HAZARD_MODELS).toBeDefined();
    expect(Array.isArray(mod.CEILING_HAZARD_MODELS)).toBe(true);
    expect(mod.CEILING_HAZARD_MODELS.length).toBeGreaterThan(0);
  });

  it('exports FLOOR_DEBRIS_MODELS config', async () => {
    const mod = await import('../floorDebrisModels');
    expect(mod.FLOOR_DEBRIS_MODELS).toBeDefined();
    expect(Array.isArray(mod.FLOOR_DEBRIS_MODELS)).toBe(true);
    expect(mod.FLOOR_DEBRIS_MODELS.length).toBeGreaterThan(0);
  });

  it('each wall trophy model entry has required fields', async () => {
    const mod = await import('../wallTrophyModels');
    for (const m of mod.WALL_TROPHY_MODELS) {
      expect(m.path).toBeDefined();
      expect(typeof m.path).toBe('string');
      expect(m.position).toBeDefined();
      expect(m.position).toHaveLength(3);
    }
  });

  it('each ceiling hazard model entry has required fields', async () => {
    const mod = await import('../ceilingHazardModels');
    for (const m of mod.CEILING_HAZARD_MODELS) {
      expect(m.path).toBeDefined();
      expect(typeof m.path).toBe('string');
      expect(m.position).toBeDefined();
      expect(m.position).toHaveLength(3);
    }
  });

  it('each floor debris model entry has required fields', async () => {
    const mod = await import('../floorDebrisModels');
    for (const m of mod.FLOOR_DEBRIS_MODELS) {
      expect(m.path).toBeDefined();
      expect(typeof m.path).toBe('string');
      expect(m.position).toBeDefined();
      expect(m.position).toHaveLength(3);
    }
  });

  it('no duplicate model paths across all config arrays', async () => {
    const wall = await import('../wallTrophyModels');
    const ceiling = await import('../ceilingHazardModels');
    const floor = await import('../floorDebrisModels');

    const allPaths = [
      ...wall.WALL_TROPHY_MODELS.map(m => m.path),
      ...ceiling.CEILING_HAZARD_MODELS.map(m => m.path),
      ...floor.FLOOR_DEBRIS_MODELS.map(m => m.path),
    ];
    const uniquePaths = new Set(allPaths);
    expect(uniquePaths.size).toBe(allPaths.length);
  });
});
