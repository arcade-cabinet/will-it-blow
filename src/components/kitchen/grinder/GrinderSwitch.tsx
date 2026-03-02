/**
 * @module GrinderSwitch
 * Visual sub-component: the side-mounted on/off toggle switch with animated notch.
 *
 * Findable part for Phase 2 hidden object (Well Done).
 */

import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type * as THREE from 'three/webgpu';

export interface GrinderSwitchProps {
  counterY: number;
  isOn: boolean;
  onClick?: () => void;
}

export function GrinderSwitch({counterY: cY, isOn, onClick}: GrinderSwitchProps) {
  const notchRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!notchRef.current) return;
    const targetZ = isOn ? Math.PI / 4 : 0;
    notchRef.current.rotation.z +=
      (targetZ - notchRef.current.rotation.z) * Math.min(1, delta * 10);
  });

  return (
    <>
      {/* Switch body */}
      <mesh position={[2.1, cY + 3, -2]} rotation={[0, 0, Math.PI / 2]} onClick={onClick}>
        <cylinderGeometry args={[0.6, 0.6, 0.5, 16]} />
        <meshStandardMaterial color={0xe0e0e0} roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Switch notch (rotates 45° when on) */}
      <mesh ref={notchRef} position={[2.35, cY + 3, -2]}>
        <boxGeometry args={[0.1, 1.0, 0.1]} />
        <meshStandardMaterial color={0x444444} roughness={0.7} metalness={0.8} />
      </mesh>
    </>
  );
}
