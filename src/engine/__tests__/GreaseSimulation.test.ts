import {createGreaseMaterial, updateGrease} from '../GreaseSimulation';

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
