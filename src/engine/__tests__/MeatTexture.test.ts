import {createMeatMaterial, updateCookingAppearance} from '../MeatTexture';

describe('MeatTexture', () => {
  describe('createMeatMaterial', () => {
    it('returns a MeshPhysicalMaterial with correct initial properties', () => {
      const mat = createMeatMaterial();
      expect(mat.type).toBe('MeshPhysicalMaterial');
      expect(mat.roughness).toBeCloseTo(0.6, 5);
      expect(mat.clearcoat).toBeCloseTo(0.8, 5);
      expect(mat.clearcoatRoughness).toBeCloseTo(0.1, 5);
      // color white -> r=g=b=1
      expect(mat.color.r).toBeCloseTo(1, 5);
      expect(mat.color.g).toBeCloseTo(1, 5);
      expect(mat.color.b).toBeCloseTo(1, 5);
    });
  });

  describe('updateCookingAppearance', () => {
    it('cookLevel=0: raw state — white color, low roughness, full clearcoat', () => {
      const mat = createMeatMaterial();
      updateCookingAppearance(mat, 0);

      // Color should be white (#ffffff)
      expect(mat.color.getHexString()).toBe('ffffff');

      expect(mat.roughness).toBeCloseTo(0.4, 5);
      expect(mat.bumpScale).toBeCloseTo(0.05, 5);
      expect(mat.clearcoat).toBeCloseTo(0.8, 5);
    });

    it('cookLevel=0.5: mid-cook — partial golden brown, mid roughness', () => {
      const mat = createMeatMaterial();
      updateCookingAppearance(mat, 0.5);

      // Color interpolated ~halfway between white and #8B5A2B
      expect(mat.color.getHexString()).toBe('b6a196');

      expect(mat.roughness).toBeCloseTo(0.8, 5);
      expect(mat.bumpScale).toBeCloseTo(0.175, 5);
      expect(mat.clearcoat).toBeCloseTo(0.32, 5);
    });

    it('cookLevel=0.7: boundary — fully golden brown (#8b5a2b)', () => {
      const mat = createMeatMaterial();
      updateCookingAppearance(mat, 0.7);

      // At cookLevel=0.7, lerp t=1 from white to golden brown
      expect(mat.color.getHexString()).toBe('8b5a2b');

      expect(mat.roughness).toBeCloseTo(0.96, 5);
      expect(mat.bumpScale).toBeCloseTo(0.225, 5);
      expect(mat.clearcoat).toBeCloseTo(0.128, 5);
    });

    it('cookLevel=1.0: fully charred — #2a150b, max roughness, zero clearcoat', () => {
      const mat = createMeatMaterial();
      updateCookingAppearance(mat, 1.0);

      // At cookLevel=1.0, lerp t=1 from golden brown to charred
      expect(mat.color.getHexString()).toBe('2a150b');

      expect(mat.roughness).toBeCloseTo(1.0, 5);
      expect(mat.bumpScale).toBeCloseTo(0.3, 5);
      expect(mat.clearcoat).toBeCloseTo(0, 5);
    });

    it('roughness is clamped to 1.0 and never exceeds it', () => {
      const mat = createMeatMaterial();
      // roughness = min(1, 0.4 + cookLevel*0.8); exceeds 1 at cookLevel=0.75
      updateCookingAppearance(mat, 0.75);
      expect(mat.roughness).toBeLessThanOrEqual(1.0);

      updateCookingAppearance(mat, 1.0);
      expect(mat.roughness).toBeLessThanOrEqual(1.0);
    });

    it('clearcoat is never negative', () => {
      const mat = createMeatMaterial();
      // clearcoat hits 0 when cookLevel >= 1/1.2 ≈ 0.833
      updateCookingAppearance(mat, 0.9);
      expect(mat.clearcoat).toBeGreaterThanOrEqual(0);

      updateCookingAppearance(mat, 1.0);
      expect(mat.clearcoat).toBeGreaterThanOrEqual(0);
    });

    it('can be called multiple times and always reflects the latest cookLevel', () => {
      const mat = createMeatMaterial();
      updateCookingAppearance(mat, 1.0);
      expect(mat.color.getHexString()).toBe('2a150b');

      updateCookingAppearance(mat, 0);
      expect(mat.color.getHexString()).toBe('ffffff');
    });
  });
});
