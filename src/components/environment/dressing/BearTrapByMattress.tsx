/**
 * BearTrapByMattress — an open bear trap placed next to the mattress
 * in the kitchen corner, a silent threat the player has to step
 * around (T2.B).
 *
 * D.3: No castShadow — small set dressing prop on the floor.
 * receiveShadow kept so it catches shadows from nearby stations.
 */

import {useGLTF} from '@react-three/drei';
import {useMemo} from 'react';
import type * as THREE from 'three';
import {asset} from '../../../utils/assetPath';

const BEARTRAP_URL = asset('/models/beartrap_open.glb');

export function BearTrapByMattress() {
  const {scene} = useGLTF(BEARTRAP_URL) as unknown as {scene: THREE.Object3D};
  const cloned = useMemo(() => scene.clone(true), [scene]);

  return (
    <group name="bear-trap-mattress" position={[2.5, 0.01, 2.5]} rotation={[0, 1.2, 0]}>
      <primitive object={cloned} scale={0.6} receiveShadow />
    </group>
  );
}

useGLTF.preload(BEARTRAP_URL);
