import {INGREDIENTS, type Ingredient} from './Ingredients';

/**
 * Parse a hex color string (#RRGGBB) into [r, g, b] (0-255).
 * Returns neutral gray [128, 128, 128] for invalid input.
 */
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) {
    return [128, 128, 128];
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Convert [r, g, b] (0-255) back to #RRGGBB hex string.
 */
function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)].map(c => c.toString(16).padStart(2, '0').toUpperCase()).join('')
  );
}

/**
 * Average an array of hex color strings into a single hex color.
 * Returns '#808080' (neutral gray) for empty input.
 */
export function averageColors(hexColors: string[]): string {
  if (hexColors.length === 0) return '#808080';

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;

  for (const hex of hexColors) {
    const [r, g, b] = parseHex(hex);
    rSum += r;
    gSum += g;
    bSum += b;
  }

  const n = hexColors.length;
  return toHex(rSum / n, gSum / n, bSum / n);
}

export interface BlendProperties {
  color: string;
  roughness: number;
  chunkiness: number;
  shininess: number;
}

const DEFAULTS: BlendProperties = {
  color: '#808080',
  roughness: 0.7,
  chunkiness: 0,
  shininess: 0.1,
};

/**
 * Compute visual blend properties from a list of ingredient names.
 *
 * - color: average of ingredient hex colors
 * - roughness: inverse of average textureMod (0-5 mapped to 1.0-0.3)
 * - chunkiness: standard deviation of textureMod values, normalized to 0-1
 * - shininess: based on average tasteMod (fatty/rich = shinier)
 */
export function computeBlendProperties(ingredientNames: string[]): BlendProperties {
  if (ingredientNames.length === 0) return {...DEFAULTS};

  const found: Ingredient[] = [];
  for (const name of ingredientNames) {
    const ing = INGREDIENTS.find(i => i.name === name);
    if (ing) found.push(ing);
  }

  if (found.length === 0) return {...DEFAULTS};

  const color = averageColors(found.map(i => i.decomposition.groundColor));

  const avgTexture = found.reduce((sum, i) => sum + i.textureMod, 0) / found.length;
  const avgFat = found.reduce((sum, i) => sum + i.decomposition.fatRatio, 0) / found.length;
  // textureMod 0 (rough) -> roughness ~1.0, textureMod 5 (smooth) -> roughness ~0.3
  // Higher fat = lower roughness (shinier)
  const roughness = 1.0 - avgTexture * 0.14 - avgFat * 0.15;

  // Standard deviation of textureMod, normalized so max possible (~2.5) maps to 1.0
  const textureVariance =
    found.reduce((sum, i) => sum + (i.textureMod - avgTexture) ** 2, 0) / found.length;
  const textureStdDev = Math.sqrt(textureVariance);
  const chunkiness = Math.min(1, textureStdDev / 2.5);

  const avgTaste = found.reduce((sum, i) => sum + i.tasteMod, 0) / found.length;
  // tasteMod -1..5 -> shininess 0.05..0.5
  const shininess = 0.05 + ((avgTaste + 1) / 6) * 0.45;

  return {color, roughness, chunkiness, shininess};
}
