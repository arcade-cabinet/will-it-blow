/**
 * @module GrinderPlunger
 * Visual sub-component: the draggable plunger assembly — shaft, guard, handle,
 * and invisible drag hitbox.
 *
 * Findable part for Phase 2 hidden object (Medium Well+).
 */

import {forwardRef} from 'react';
import type * as THREE from 'three/webgpu';

export interface GrinderPlungerProps {
  counterY: number;
  onPointerDown?: (e: THREE.Event) => void;
}

export const GrinderPlunger = forwardRef<THREE.Group, GrinderPlungerProps>(function GrinderPlunger(
  {counterY: cY, onPointerDown},
  ref,
) {
  return (
    <group ref={ref} position={[3, cY + 5.6, 0.5]}>
      {/* Shaft */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 3]} />
        <meshStandardMaterial color={0xffffff} roughness={0.6} metalness={0.0} />
      </mesh>
      {/* Guard */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.2]} />
        <meshStandardMaterial color={0xffffff} roughness={0.6} metalness={0.0} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, 3.8, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 1.5]} />
        <meshStandardMaterial color={0xffffff} roughness={0.6} metalness={0.0} />
      </mesh>
      {/* Invisible hitbox for drag start */}
      <mesh position={[0, 2.5, 0]} onPointerDown={onPointerDown}>
        <cylinderGeometry args={[1.5, 1.5, 5]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
});
