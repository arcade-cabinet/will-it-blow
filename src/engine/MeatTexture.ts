import {CanvasTexture, Color, MeshPhysicalMaterial, RepeatWrapping} from 'three/webgpu';

export interface MeatTextureResult {
  map: CanvasTexture;
  bumpMap: CanvasTexture;
}

/**
 * Procedurally generate a meat texture on a 512×512 canvas.
 *
 * Ported from the POC sausage_factory.html `generateMeatTexture` function
 * (lines 119-129). Draws a base fill, muscle fiber specks, fat specks, then
 * applies a 1px blur pass. Returns both a color map and a bump map backed by
 * the same canvas with RepeatWrapping.
 *
 * @param colorHex - CSS hex color for the base meat color (e.g. '#c0392b')
 * @param fatRatio - 0-1 value controlling how many fat specks are drawn
 */
export function generateMeatTexture(colorHex: string, fatRatio: number): MeatTextureResult {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D canvas context');
  }

  // Base fill
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 512, 512);

  type SpeckRadius = {min: number; max: number};

  const drawSpecks = (count: number, sr: SpeckRadius, cols: string[], alpha: number): void => {
    ctx.globalAlpha = alpha;
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = cols[Math.floor(Math.random() * cols.length)];
      ctx.beginPath();
      ctx.arc(
        Math.random() * 512,
        Math.random() * 512,
        Math.random() * sr.max + sr.min,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  };

  // Muscle fiber specks
  drawSpecks(1000, {min: 1, max: 4}, ['#8a2b2b', '#6b1b1b', '#a83c3c'], 0.7);

  // Fat specks
  drawSpecks(Math.floor(3000 * fatRatio), {min: 1, max: 3}, ['#fcf2f2', '#fcebeb', '#e8caca'], 0.9);

  // Blur pass
  ctx.globalAlpha = 1.0;
  ctx.filter = 'blur(1px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';

  const map = new CanvasTexture(canvas);
  map.wrapS = RepeatWrapping;
  map.wrapT = RepeatWrapping;

  const bumpMap = new CanvasTexture(canvas);
  bumpMap.wrapS = RepeatWrapping;
  bumpMap.wrapT = RepeatWrapping;

  return {map, bumpMap};
}

/**
 * Create a MeshPhysicalMaterial with the POC meat material settings.
 *
 * Color is white so the texture map provides all color information.
 * Ported from POC sausage_factory.html line 130.
 */
export function createMeatMaterial(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.6,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
  });
}

/**
 * Update the visual appearance of a meat material based on cook level.
 *
 * Ported from POC sausage_factory.html lines 518-521.
 *
 * Color lerp:
 *   - cookLevel 0 → 0.7 : white (#ffffff) → golden brown (#8B5A2B)
 *   - cookLevel 0.7 → 1 : golden brown (#8B5A2B) → charred (#2a150b)
 *
 * @param material  - The MeshPhysicalMaterial to mutate
 * @param cookLevel - 0 (raw) to 1 (fully charred)
 */
export function updateCookingAppearance(material: MeshPhysicalMaterial, cookLevel: number): void {
  const tC = new Color();

  if (cookLevel < 0.7) {
    tC.lerpColors(new Color(0xffffff), new Color(0x8b5a2b), cookLevel / 0.7);
  } else {
    tC.lerpColors(new Color(0x8b5a2b), new Color(0x2a150b), (cookLevel - 0.7) / 0.3);
  }

  material.color.copy(tC);
  material.roughness = Math.min(1.0, 0.4 + cookLevel * 0.8);
  material.bumpScale = 0.05 + cookLevel * 0.25;
  material.clearcoat = 0.8 * Math.max(0, 1 - cookLevel * 1.2);
}
