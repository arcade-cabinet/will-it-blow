import {averageColors, computeBlendProperties} from '../BlendCalculator';

describe('BlendCalculator', () => {
  describe('averageColors', () => {
    it('returns the same color for a single input', () => {
      expect(averageColors(['#FF0000'])).toBe('#FF0000');
      expect(averageColors(['#00FF00'])).toBe('#00FF00');
      expect(averageColors(['#D4A017'])).toBe('#D4A017');
    });

    it('averages two colors', () => {
      // Red + Blue = (255+0)/2, (0+0)/2, (0+255)/2 = 128, 0, 128
      expect(averageColors(['#FF0000', '#0000FF'])).toBe('#800080');
    });

    it('averages three colors', () => {
      // Red + Green + Blue = (255+0+0)/3, (0+255+0)/3, (0+0+255)/3 = 85, 85, 85
      expect(averageColors(['#FF0000', '#00FF00', '#0000FF'])).toBe('#555555');
    });

    it('returns neutral gray for empty input', () => {
      expect(averageColors([])).toBe('#808080');
    });

    it('handles white and black', () => {
      expect(averageColors(['#FFFFFF', '#000000'])).toBe('#808080');
    });
  });

  describe('computeBlendProperties', () => {
    it('returns defaults for empty input', () => {
      const result = computeBlendProperties([]);
      expect(result).toEqual({
        color: '#808080',
        roughness: 0.7,
        chunkiness: 0,
        shininess: 0.1,
      });
    });

    it('returns defaults for unrecognized ingredient names', () => {
      const result = computeBlendProperties(['Nonexistent Thing']);
      expect(result).toEqual({
        color: '#808080',
        roughness: 0.7,
        chunkiness: 0,
        shininess: 0.1,
      });
    });

    it('computes properties for a single ingredient', () => {
      // Big Mac: tasteMod=3, textureMod=3, color='#D4A017'
      const result = computeBlendProperties(['Big Mac']);
      expect(result.color).toBe('#D4A017');
      // textureMod 3 -> roughness = 1.0 - 3 * 0.14 = 0.58
      expect(result.roughness).toBeCloseTo(0.58, 2);
      // single ingredient -> no variance -> chunkiness 0
      expect(result.chunkiness).toBe(0);
      // tasteMod 3 -> shininess = 0.05 + (4/6) * 0.45 = 0.35
      expect(result.shininess).toBeCloseTo(0.35, 2);
    });

    it('computes properties for multiple ingredients', () => {
      // Water: textureMod=0, tasteMod=0, color='#4FC3F7'
      // Beef Wellington: textureMod=5, tasteMod=5, color='#8D6E63'
      const result = computeBlendProperties(['Water', 'Beef Wellington']);

      // Average of #4FC3F7 and #8D6E63
      expect(result.color).not.toBe('#808080');

      // avgTexture = (0+5)/2 = 2.5, roughness = 1.0 - 2.5*0.14 = 0.65
      expect(result.roughness).toBeCloseTo(0.65, 2);

      // variance = ((0-2.5)^2 + (5-2.5)^2)/2 = 6.25, stddev = 2.5
      // chunkiness = min(1, 2.5/2.5) = 1.0
      expect(result.chunkiness).toBeCloseTo(1.0, 2);

      // avgTaste = (0+5)/2 = 2.5, shininess = 0.05 + (3.5/6)*0.45 = 0.3125
      expect(result.shininess).toBeCloseTo(0.3125, 2);
    });

    it('produces low chunkiness for similar textures', () => {
      // Big Mac (textureMod=3), Chicken Soup (textureMod=3), Pad Thai (textureMod=3)
      const result = computeBlendProperties(['Big Mac', 'Chicken Soup', 'Pad Thai']);
      expect(result.chunkiness).toBe(0);
    });

    it('produces high shininess for high-tasteMod ingredients', () => {
      // Lobster (tasteMod=5), Beef Wellington (tasteMod=5), Sushi Party Tray (tasteMod=5)
      const result = computeBlendProperties(['Lobster', 'Beef Wellington', 'Sushi Party Tray']);
      // avgTaste = 5, shininess = 0.05 + (6/6)*0.45 = 0.5
      expect(result.shininess).toBeCloseTo(0.5, 2);
    });

    it('produces low shininess for low-tasteMod ingredients', () => {
      // Water (tasteMod=0), Air (tasteMod=0), Dirt (tasteMod=0)
      const result = computeBlendProperties(['Water', 'Air', 'Dirt']);
      // avgTaste = 0, shininess = 0.05 + (1/6)*0.45 = 0.125
      expect(result.shininess).toBeCloseTo(0.125, 2);
    });

    it('roughness is high for rough ingredients, low for smooth', () => {
      // Water (textureMod=0) -> roughness ~1.0
      const rough = computeBlendProperties(['Water']);
      expect(rough.roughness).toBeCloseTo(1.0, 2);

      // Beef Wellington (textureMod=5) -> roughness = 1.0 - 5*0.14 = 0.3
      const smooth = computeBlendProperties(['Beef Wellington']);
      expect(smooth.roughness).toBeCloseTo(0.3, 2);

      expect(rough.roughness).toBeGreaterThan(smooth.roughness);
    });
  });
});
