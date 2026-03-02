/**
 * @module GrinderBody
 * Visual sub-component: the motor block, extruder cylinder, and chute/hopper.
 * These three parts vibrate together when the grinder is running.
 *
 * Findable part for Phase 2 hidden object (Medium Well+).
 */

import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type * as THREE from 'three/webgpu';

export interface GrinderBodyProps {
  counterY: number;
  isOn: boolean;
}

export function GrinderBody({counterY: cY, isOn}: GrinderBodyProps) {
  const motorRef = useRef<THREE.Mesh>(null);
  const extruderRef = useRef<THREE.Mesh>(null);
  const chuteRef = useRef<THREE.Mesh>(null);

  useFrame(({clock}) => {
    if (isOn) {
      const v = Math.sin(clock.getElapsedTime() * 50) * 0.02;
      if (motorRef.current) motorRef.current.position.x = v;
      if (extruderRef.current) extruderRef.current.position.x = v;
      if (chuteRef.current) chuteRef.current.position.x = v;
    } else {
      if (motorRef.current) motorRef.current.position.x = 0;
      if (extruderRef.current) extruderRef.current.position.x = 0;
      if (chuteRef.current) chuteRef.current.position.x = 0;
    }
  });

  return (
    <>
      {/* Motor block */}
      <mesh ref={motorRef} position={[0, cY + 2.25, -2]} castShadow>
        <boxGeometry args={[4, 4.5, 5]} />
        <meshStandardMaterial color={0xe0e0e0} roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Extruder cylinder */}
      <mesh ref={extruderRef} position={[0, cY + 2.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.0, 1.0, 4, 32]} />
        <meshStandardMaterial color={0xe0e0e0} roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Chute/hopper */}
      <mesh ref={chuteRef} position={[0, cY + 4.5, 0.5]} castShadow>
        <cylinderGeometry args={[1.2, 0.8, 2.5, 32]} />
        <meshStandardMaterial color={0xe0e0e0} roughness={0.3} metalness={0.9} />
      </mesh>
    </>
  );
}
