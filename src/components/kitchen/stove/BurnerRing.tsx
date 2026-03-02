/**
 * @module BurnerRing
 * Visual sub-component: the torus-shaped gas burner ring.
 * Color shifts from dark to orange/red based on heat setting.
 *
 * Findable part for Phase 2 hidden object (Well Done).
 */

import {forwardRef} from 'react';
import type * as THREE from 'three/webgpu';

export interface BurnerRingProps {
  position?: [number, number, number];
}

export const BurnerRing = forwardRef<THREE.MeshBasicMaterial, BurnerRingProps>(function BurnerRing(
  {position = [0, 0.06, 0]},
  ref,
) {
  return (
    <mesh position={position}>
      <torusGeometry args={[0.35, 0.03, 12, 24]} />
      <meshBasicMaterial ref={ref} color={[0.15, 0.05, 0.02]} />
    </mesh>
  );
});
