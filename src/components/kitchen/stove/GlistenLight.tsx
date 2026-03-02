/**
 * @module GlistenLight
 * Orbiting point light that creates grease specular highlights during cooking.
 */

import {forwardRef} from 'react';
import type * as THREE from 'three/webgpu';

export interface GlistenLightProps {
  panY: number;
  visible?: boolean;
}

export const GlistenLight = forwardRef<THREE.PointLight, GlistenLightProps>(function GlistenLight(
  {panY, visible = false},
  ref,
) {
  return (
    <pointLight
      ref={ref}
      position={[-2, panY + 6, -2]}
      intensity={150}
      distance={50}
      color={0xffffff}
      visible={visible}
    />
  );
});
