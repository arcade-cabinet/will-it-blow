/**
 * @module StoveDial
 * Visual sub-component: the ignition knob that cycles heat settings
 * (off → low → medium → high → off).
 *
 * Findable part for Phase 2 hidden object (Medium Well+).
 */

import {forwardRef} from 'react';
import type * as THREE from 'three/webgpu';

export interface StoveDialProps {
  position?: [number, number, number];
  onClick?: () => void;
}

export const StoveDial = forwardRef<THREE.Mesh, StoveDialProps>(function StoveDial(
  {position = [0.5, 0.1, 0], onClick},
  ref,
) {
  return (
    <mesh ref={ref} position={position} onClick={onClick}>
      <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
      <meshStandardMaterial color={[0.8, 0.2, 0.2]} />
    </mesh>
  );
});
