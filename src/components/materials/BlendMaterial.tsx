import {useMemo} from 'react';

interface BlendMaterialProps {
  color: string;
  roughness: number;
  chunkiness: number;
  fillLevel: number;
}

/**
 * Parse a hex color (#RRGGBB) and darken it by a factor.
 * Returns a new hex string with each channel multiplied by `factor` (0-1).
 */
function darkenHex(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return `#${[clamp(r), clamp(g), clamp(b)].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A PBR material for ground meat blend visualization.
 *
 * Uses meshStandardMaterial with properties derived from ingredient stats:
 * - color: averaged from ingredient hex colors, darkened by chunkiness
 * - roughness: inverse of texture smoothness
 * - chunkiness: darkens base color to simulate uneven surface shadows
 * - fillLevel: controls opacity (0 = invisible, 1 = fully opaque)
 */
export function BlendMaterial({color, roughness, chunkiness, fillLevel}: BlendMaterialProps) {
  // Higher chunkiness = slightly darker base color to simulate uneven surface shadows
  const darkenedColor = useMemo(() => darkenHex(color, 1 - chunkiness * 0.15), [color, chunkiness]);

  return (
    <meshStandardMaterial
      color={darkenedColor}
      roughness={roughness}
      metalness={0.1}
      opacity={fillLevel}
      transparent={fillLevel < 1}
    />
  );
}
