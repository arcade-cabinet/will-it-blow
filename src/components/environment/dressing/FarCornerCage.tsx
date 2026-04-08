/**
 * FarCornerCage — a horror cage placed in the far corner of the kitchen,
 * barely visible in the gloom, suggesting something was kept here (T2.B).
 */

import {useGLTF} from '@react-three/drei';
import {useMemo} from 'react';
import type * as THREE from 'three';
import {asset} from '../../../utils/assetPath';

const CAGE_URL = asset('/models/horror_cage_mx_1.glb');

export function FarCornerCage() {
  const {scene} = useGLTF(CAGE_URL) as unknown as {scene: THREE.Object3D};
  const cloned = useMemo(() => scene.clone(true), [scene]);

  return (
    <group name="far-corner-cage" position={[-3.0, 0, 2.5]} rotation={[0, 0.4, 0]}>
      <primitive object={cloned} scale={0.9} castShadow receiveShadow />
      {/* Dim amber point light inside the cage for mood */}
      <pointLight position={[0, 0.5, 0]} intensity={0.5} distance={1.5} color="#aa6600" />
    </group>
  );
}

useGLTF.preload(CAGE_URL);
