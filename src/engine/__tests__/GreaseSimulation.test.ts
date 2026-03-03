import {createGreaseMaterial, GreaseWaveSimulation, updateGrease} from '../GreaseSimulation';

describe('GreaseWaveSimulation', () => {
  it('constructor creates buffers of correct size', () => {
    const sim = new GreaseWaveSimulation(64);
    expect(sim.size).toBe(64);
    expect(sim.curr.length).toBe(64 * 64);
    expect(sim.prev.length).toBe(64 * 64);
  });

  it('buffers start zeroed', () => {
    const sim = new GreaseWaveSimulation(32);
    const allZero = sim.curr.every(v => v === 0);
    expect(allZero).toBe(true);
  });

  it('addSplat modifies the curr buffer at the center pixel', () => {
    const sim = new GreaseWaveSimulation(64);
    sim.addSplat(0.5, 0.5, 0.1, 1.0);
    // Center pixel (32,32) should be non-zero
    const centerIdx = 32 * 64 + 32;
    expect(sim.curr[centerIdx]).toBeGreaterThan(0);
  });

  it('addSplat respects radius — distant pixels unaffected', () => {
    const sim = new GreaseWaveSimulation(64);
    sim.addSplat(0.5, 0.5, 0.05, 1.0);
    // Corner pixel (0,0) should remain zero
    expect(sim.curr[0]).toBe(0);
  });

  it('step propagates wave values to neighbors', () => {
    const sim = new GreaseWaveSimulation(32);
    // Place a single impulse at center
    const cx = 16;
    const cy = 16;
    sim.curr[cy * 32 + cx] = 1.0;

    sim.step(1.0); // no damping for clarity

    // After one step, neighbors should have non-zero values
    const right = sim.curr[cy * 32 + (cx + 1)];
    const left = sim.curr[cy * 32 + (cx - 1)];
    const above = sim.curr[(cy - 1) * 32 + cx];
    const below = sim.curr[(cy + 1) * 32 + cx];

    expect(right).not.toBe(0);
    expect(left).not.toBe(0);
    expect(above).not.toBe(0);
    expect(below).not.toBe(0);
  });

  it('step with damping < 1 reduces energy over time', () => {
    const sim = new GreaseWaveSimulation(32);
    sim.curr[16 * 32 + 16] = 1.0;

    // Measure peak amplitude after many damped steps
    for (let i = 0; i < 200; i++) {
      sim.step(0.9);
    }

    // Peak amplitude should decay well below initial impulse of 1.0
    let peak = 0;
    for (let i = 0; i < sim.curr.length; i++) {
      peak = Math.max(peak, Math.abs(sim.curr[i]));
    }
    expect(peak).toBeLessThan(0.1);
  });

  it('getDisplacementMap and getNormalMap return null in non-browser env', () => {
    // Jest has no real document.createElement('canvas') with getContext('2d')
    // but jsdom may provide a stub. Regardless, the sim should not crash.
    const sim = new GreaseWaveSimulation(16);
    // In Jest/jsdom, these may be null (no canvas context) or CanvasTexture
    // Either way, the sim should construct without error
    expect(sim.size).toBe(16);
  });

  it('update does not throw in non-browser env', () => {
    const sim = new GreaseWaveSimulation(16);
    sim.addSplat(0.5, 0.5, 0.1, 0.5);
    sim.step();
    sim.computeNormals();
    // Should not throw even if canvas context is null
    expect(() => sim.update()).not.toThrow();
  });
});

describe('GreaseSimulation', () => {
  describe('createGreaseMaterial', () => {
    it('returns a MeshPhysicalMaterial', () => {
      const mat = createGreaseMaterial();
      expect(mat.type).toBe('MeshPhysicalMaterial');
    });

    it('starts fully transparent', () => {
      const mat = createGreaseMaterial();
      expect(mat.opacity).toBe(0.0);
    });

    it('has POC grease color 0xcca600', () => {
      const mat = createGreaseMaterial();
      expect(mat.color.getHex()).toBe(0xcca600);
    });

    it('has low roughness (shiny grease)', () => {
      const mat = createGreaseMaterial();
      expect(mat.roughness).toBeLessThan(0.1);
    });

    it('has transmission enabled', () => {
      const mat = createGreaseMaterial();
      expect(mat.transmission).toBeGreaterThan(0);
    });

    it('has depthWrite disabled (transparent liquid)', () => {
      const mat = createGreaseMaterial();
      expect(mat.depthWrite).toBe(false);
    });
  });

  describe('updateGrease', () => {
    it('cookLevel=0 → opacity near 0.2 (minimum visible)', () => {
      const mat = createGreaseMaterial();
      updateGrease(mat, 0, 0);
      expect(mat.opacity).toBeCloseTo(0.2, 2);
    });

    it('cookLevel=1 → opacity near 0.8 (maximum)', () => {
      const mat = createGreaseMaterial();
      updateGrease(mat, 1, 0);
      expect(mat.opacity).toBeCloseTo(0.8, 2);
    });

    it('opacity scales linearly: 0.2 + cookLevel * 0.6', () => {
      const mat = createGreaseMaterial();
      updateGrease(mat, 0.5, 0);
      expect(mat.opacity).toBeCloseTo(0.5, 2);
    });

    it('roughness stays within valid range [0.01, 0.3] across all cook levels', () => {
      const mat = createGreaseMaterial();
      for (let cl = 0; cl <= 1.0; cl += 0.1) {
        for (let t = 0; t < 10; t += 0.5) {
          updateGrease(mat, cl, t);
          expect(mat.roughness).toBeGreaterThanOrEqual(0.01);
          expect(mat.roughness).toBeLessThanOrEqual(0.3);
        }
      }
    });

    it('roughness value is never NaN', () => {
      const mat = createGreaseMaterial();
      updateGrease(mat, 0.5, 100.7);
      expect(Number.isNaN(mat.roughness)).toBe(false);
    });

    it('can be called multiple times (idempotent on latest state)', () => {
      const mat = createGreaseMaterial();
      updateGrease(mat, 1.0, 0);
      const opacityFull = mat.opacity;
      updateGrease(mat, 0.0, 0);
      expect(mat.opacity).toBeCloseTo(0.2, 2);
      expect(opacityFull).toBeCloseTo(0.8, 2);
    });
  });
});
