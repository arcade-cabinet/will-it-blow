/**
 * FPSCamera — First-person camera at eye height above the player capsule.
 *
 * Reads player position each frame and positions camera at eye height.
 * Look direction driven by useMouseLook (pointer lock + mouse delta).
 * Head bob when moving for immersion.
 *
 * Ported from grovekeeper, adapted for will-it-blow.
 */

import {PerspectiveCamera} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type {PerspectiveCamera as PerspectiveCameraImpl} from 'three';
import playerConfig from '../config/player.json';
import {useGameStore} from '../ecs/hooks';
import {ecsWorld} from '../ecs/kootaWorld';
import {PlayerTrait} from '../ecs/traits';
import {inputManager} from '../input/InputManager';
import {computeHeadBob} from './headBob';
import {useMouseLook} from './useMouseLook';

const FOV = playerConfig.fov;

/** Eye height per posture — matches FirstPersonControls from the R3F POC */
const POSTURE_HEIGHTS: Record<string, number> = {
  prone: 0.5,
  sitting: 1.0,
  standing: 1.6,
};

export const FPSCamera = () => {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const posture = useGameStore(s => s.posture);
  useMouseLook();

  // Current eye height based on posture — smoothly interpolates
  const targetHeight = POSTURE_HEIGHTS[posture] ?? 1.6;
  const currentHeightRef = useRef(targetHeight);

  useFrame((state, delta) => {
    const cam = cameraRef.current;
    if (!cam) return;

    // Smoothly transition height when posture changes (prone → sitting → standing)
    currentHeightRef.current += (targetHeight - currentHeightRef.current) * delta * 5.0;

    // Read player position from Koota ECS
    const playerEntities = ecsWorld.query(PlayerTrait);
    const player = playerEntities.length > 0 ? playerEntities[0].get(PlayerTrait) : null;
    const px = player?.posX ?? 0;
    const py = player?.posY ?? 0;
    const pz = player?.posZ ?? 0;

    // Head bob only when standing and moving
    const frame = inputManager.getFrame();
    const speed = Math.sqrt(frame.moveX * frame.moveX + frame.moveZ * frame.moveZ);
    const bobOffset = posture === 'standing' ? computeHeadBob(state.clock.elapsedTime, speed) : 0;

    cam.position.set(px, py + currentHeightRef.current + bobOffset, pz);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={FOV}
      near={0.1}
      far={50}
      position={[0, POSTURE_HEIGHTS.prone, 0]}
      rotation={[Math.PI / 2 - 0.1, 0, 0]}
    />
  );
};
