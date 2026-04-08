/**
 * FloorDebris — barrels, boxes, planks, scattered cutlery, broken glass,
 * and assorted detritus on the basement kitchen floor (T2.B).
 *
 * Loads each model via useGLTF and places it at its configured position.
 * All models are static set dressing — no physics, no interaction.
 */

import {useGLTF} from '@react-three/drei';
import {useMemo} from 'react';
import type * as THREE from 'three';
import {asset} from '../../../utils/assetPath';
import {FLOOR_DEBRIS_MODELS} from './floorDebrisModels';

/** Preload all floor debris GLBs. */
for (const model of FLOOR_DEBRIS_MODELS) {
  useGLTF.preload(asset(model.path));
}

function FloorDebrisItem({
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

  return (
    <primitive
      object={cloned}
      position={position}
      rotation={rotation}
      scale={scale}
      receiveShadow
    />
  );
}

export function FloorDebris() {
  return (
    <group name="floor-debris">
      {FLOOR_DEBRIS_MODELS.map((m, i) => (
        <FloorDebrisItem
          key={`floor-${i}-${m.path}`}
          path={m.path}
          position={m.position}
          rotation={m.rotation ?? [0, 0, 0]}
          scale={m.scale ?? 1}
        />
      ))}
    </group>
  );
}
