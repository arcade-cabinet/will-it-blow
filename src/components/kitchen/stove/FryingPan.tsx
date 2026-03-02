/**
 * @module FryingPan
 * Visual sub-component: the frying pan body and handle.
 * Pan tips during flip animation (controlled via group ref).
 *
 * Findable part for Phase 2 hidden object (Medium — first item to find).
 */

import {forwardRef} from 'react';
import type * as THREE from 'three/webgpu';

const PAN_RADIUS = 0.4;
const PAN_HEIGHT = 0.06;

export interface FryingPanProps {
  onPanClick?: () => void;
  onHandleClick?: () => void;
}

export const FryingPan = forwardRef<THREE.Group, FryingPanProps>(function FryingPan(
  {onPanClick, onHandleClick},
  ref,
) {
  return (
    <group ref={ref}>
      {/* Pan body */}
      <mesh onClick={onPanClick}>
        <cylinderGeometry args={[PAN_RADIUS, PAN_RADIUS, PAN_HEIGHT, 24]} />
        <meshStandardMaterial color={[0.2, 0.2, 0.22]} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Pan handle */}
      <mesh position={[0, 0, PAN_RADIUS + 0.25]} onClick={onHandleClick}>
        <boxGeometry args={[0.06, 0.04, 0.5]} />
        <meshStandardMaterial color={[0.12, 0.12, 0.14]} />
      </mesh>
    </group>
  );
});
