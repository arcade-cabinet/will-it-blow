interface BlendMaterialProps {
  color: string;
  roughness: number;
  chunkiness: number;
  fillLevel: number;
}

/**
 * A PBR material for ground meat blend visualization.
 *
 * Uses meshStandardMaterial with properties derived from ingredient stats:
 * - color: averaged from ingredient hex colors
 * - roughness: inverse of texture smoothness
 * - chunkiness: drives normalScale intensity (varied textures = bumpier surface)
 * - fillLevel: controls opacity (0 = invisible, 1 = fully opaque)
 */
export function BlendMaterial({color, roughness, chunkiness, fillLevel}: BlendMaterialProps) {
  // chunkiness 0-1 drives normal map intensity feel via emissive darkening
  // Higher chunkiness = slightly darker emissive to simulate uneven surface shadows
  const emissiveIntensity = chunkiness * 0.15;

  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={0.1}
      opacity={fillLevel}
      transparent={fillLevel < 1}
      emissive="#000000"
      emissiveIntensity={emissiveIntensity}
    />
  );
}
