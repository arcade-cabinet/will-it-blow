/**
 * WallTrophies — horror masks, weapons, graffiti, and fishing hooks
 * mounted on the basement kitchen walls (T2.B).
 *
 * Loads each model via useGLTF and places it at its configured position.
 * All models are static set dressing — no physics, no interaction.
 *
 * D.3: No castShadow — wall trophies are set dressing, not worth
 * the shadow map cost.
 */

import {useGLTF} from '@react-three/drei';
import {useMemo} from 'react';
import type * as THREE from 'three';
import {asset} from '../../../utils/assetPath';
import {WALL_TROPHY_MODELS} from './wallTrophyModels';

/** Preload all wall trophy GLBs so they stream in during load screen. */
for (const model of WALL_TROPHY_MODELS) {
  useGLTF.preload(asset(model.path));
}

function WallTrophyItem({
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

export function WallTrophies() {
  return (
    <group name="wall-trophies">
      {WALL_TROPHY_MODELS.map((m, i) => (
        <WallTrophyItem
          key={`wall-${i}-${m.path}`}
          path={m.path}
          position={m.position}
          rotation={m.rotation ?? [0, 0, 0]}
          scale={m.scale ?? 1}
        />
      ))}
    </group>
  );
}
