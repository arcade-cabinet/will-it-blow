/**
 * WallShelf — a small shelf on the wall loaded with kitchen clutter:
 * toaster, utensil holder, knife holder, cutting board (T2.B).
 *
 * Groups multiple models onto a single shelf_small.glb base.
 *
 * D.3: No castShadow on individual shelf items — set dressing.
 * The shelf base receives shadows so station shadows fall on it.
 */

import {useGLTF} from '@react-three/drei';
import {useMemo} from 'react';
import type * as THREE from 'three';
import {asset} from '../../../utils/assetPath';

const SHELF_URL = asset('/models/shelf_small.glb');
const TOASTER_URL = asset('/models/toaster.glb');
const UTENSIL_HOLDER_URL = asset('/models/utensil_holder.glb');
const KNIFE_HOLDER_URL = asset('/models/knife_holder.glb');
const CUTTING_BOARD_URL = asset('/models/cutting_board.glb');

export function WallShelf() {
  const shelf = useGLTF(SHELF_URL) as unknown as {scene: THREE.Object3D};
  const toaster = useGLTF(TOASTER_URL) as unknown as {scene: THREE.Object3D};
  const utensilHolder = useGLTF(UTENSIL_HOLDER_URL) as unknown as {scene: THREE.Object3D};
  const knifeHolder = useGLTF(KNIFE_HOLDER_URL) as unknown as {scene: THREE.Object3D};
  const cuttingBoard = useGLTF(CUTTING_BOARD_URL) as unknown as {scene: THREE.Object3D};

  const shelfClone = useMemo(() => shelf.scene.clone(true), [shelf.scene]);
  const toasterClone = useMemo(() => toaster.scene.clone(true), [toaster.scene]);
  const utensilClone = useMemo(() => utensilHolder.scene.clone(true), [utensilHolder.scene]);
  const knifeClone = useMemo(() => knifeHolder.scene.clone(true), [knifeHolder.scene]);
  const boardClone = useMemo(() => cuttingBoard.scene.clone(true), [cuttingBoard.scene]);

  return (
    <group name="wall-shelf" position={[3.35, 1.4, -0.5]} rotation={[0, -Math.PI / 2, 0]}>
      <primitive object={shelfClone} scale={0.8} receiveShadow />
      {/* Items sitting on the shelf */}
      <primitive object={toasterClone} position={[-0.2, 0.15, 0]} scale={0.5} />
      <primitive object={utensilClone} position={[0.15, 0.15, 0]} scale={0.5} />
      <primitive object={knifeClone} position={[0.35, 0.15, 0]} scale={0.4} />
      <primitive
        object={boardClone}
        position={[-0.35, 0.1, 0.05]}
        rotation={[0.1, 0, 0.8]}
        scale={0.5}
      />
    </group>
  );
}

useGLTF.preload(SHELF_URL);
useGLTF.preload(TOASTER_URL);
useGLTF.preload(UTENSIL_HOLDER_URL);
useGLTF.preload(KNIFE_HOLDER_URL);
useGLTF.preload(CUTTING_BOARD_URL);
