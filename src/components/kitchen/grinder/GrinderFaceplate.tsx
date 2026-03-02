/**
 * @module GrinderFaceplate
 * Visual sub-component: the spinning faceplate disc on the front of the extruder.
 * Rotates when the grinder is running.
 *
 * Findable part for Phase 2 hidden object (Medium Well+).
 */

import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type * as THREE from 'three/webgpu';

export interface GrinderFaceplateProps {
  counterY: number;
  isOn: boolean;
}

export function GrinderFaceplate({counterY: cY, isOn}: GrinderFaceplateProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current && isOn) {
      ref.current.rotation.y += delta * 5;
    }
  });

  return (
    <mesh ref={ref} position={[0, cY + 2.5, 2.0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[1.05, 1.05, 0.2, 32]} />
      <meshStandardMaterial color={0x444444} roughness={0.7} metalness={0.8} />
    </mesh>
  );
}
