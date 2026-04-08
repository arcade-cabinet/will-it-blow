/**
 * CeilingHazards — exposed pipes, dangling wires, and lamps (some lit,
 * some dead) hanging from the basement ceiling (T2.B).
 *
 * Loads each model via useGLTF and places it at its configured position.
 * All models are static set dressing — no physics, no interaction.
 */

import {useGLTF} from '@react-three/drei';
import {useMemo} from 'react';
import type * as THREE from 'three';
import {asset} from '../../../utils/assetPath';
import {CEILING_HAZARD_MODELS} from './ceilingHazardModels';

/** Preload all ceiling hazard GLBs. */
for (const model of CEILING_HAZARD_MODELS) {
  useGLTF.preload(asset(model.path));
}

function CeilingHazardItem({
  path,
  position,
  rotation,
  scale,
}: {
  path: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}) {
  const {scene} = useGLTF(asset(path)) as unknown as {scene: THREE.Object3D};
  const cloned = useMemo(() => scene.clone(true), [scene]);

  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}

export function CeilingHazards() {
  return (
    <group name="ceiling-hazards">
      {CEILING_HAZARD_MODELS.map((m, i) => (
        <CeilingHazardItem
          key={`ceil-${i}-${m.path}`}
          path={m.path}
          position={m.position}
          rotation={m.rotation ?? [0, 0, 0]}
          scale={m.scale ?? 1}
        />
      ))}
    </group>
  );
}
