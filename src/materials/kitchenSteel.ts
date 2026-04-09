/**
 * @module materials/kitchenSteel
 * Shared stainless-steel material for kitchen station components.
 *
 * WHY: The Grinder, Stuffer, and Stove each created their own `metalMat`
 * with slightly different metalness/roughness/color values. This module
 * normalizes them to a single "operating-theatre stainless steel" look
 * that matches the SAW hospital aesthetic (design pillar #6).
 *
 * Material params are tuned for cold fluorescent lighting with high
 * metalness (0.85) and moderate roughness (0.35) — reads as brushed
 * stainless under the green-white FlickeringFluorescent tubes.
 *
 * Usage:
 *   import { useKitchenSteelMaterial } from '../../materials/kitchenSteel';
 *   const metalMat = useKitchenSteelMaterial();
 *   <Box material={metalMat} />
 *
 * Each call returns a stable memoized instance that shares textures.
 */
import {useTexture} from '@react-three/drei';
import {useMemo} from 'react';
import * as THREE from 'three';
import {asset} from '../utils/assetPath';

/** Canonical kitchen steel material values. */
export const KITCHEN_STEEL = {
  color: '#999',
  metalness: 0.85,
  roughness: 0.35,
} as const;

/**
 * React hook that creates a MeshStandardMaterial with concrete textures
 * and the canonical kitchen steel PBR values. Memoized per component
 * mount — safe to call in any station component.
 */
export function useKitchenSteelMaterial(): THREE.MeshStandardMaterial {
  const [colorMap, normalMap, roughnessMap] = useTexture([
    asset('/textures/concrete_color.jpg'),
    asset('/textures/concrete_normal.jpg'),
    asset('/textures/concrete_roughness.jpg'),
  ]);

  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: colorMap,
        normalMap: normalMap,
        roughnessMap: roughnessMap,
        color: KITCHEN_STEEL.color,
        metalness: KITCHEN_STEEL.metalness,
        roughness: KITCHEN_STEEL.roughness,
      }),
    [colorMap, normalMap, roughnessMap],
  );
}
