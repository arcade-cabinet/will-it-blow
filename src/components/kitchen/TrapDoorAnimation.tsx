import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useRef, useState} from 'react';
import type * as THREE from 'three';
import {TrapDoorMount} from './TrapDoorMount';

interface TrapDoorAnimationProps {
  position?: [number, number, number];
}

export function TrapDoorAnimation({position = [0, 3, 0]}: TrapDoorAnimationProps) {
  const hingeGroupRef = useRef<THREE.Group>(null);

  // Hardcoded to open for now so we can see it
  const phase = 'done';
  const HINGE_OPEN_ANGLE = Math.PI * 0.5;

  useFrame((_, delta) => {
    if (hingeGroupRef.current) {
      hingeGroupRef.current.rotation.z = -HINGE_OPEN_ANGLE;
    }
  });

  return (
    <group position={position}>
      {/* Hinge group wraps the TrapDoorMount so rotation pivots from one edge */}
      <group ref={hingeGroupRef} position={[0, 0, -0.5]}>
        <group position={[0, 0, 0.5]}>
          <TrapDoorMount position={[0, 0, 0]} />
        </group>
      </group>
    </group>
  );
}
