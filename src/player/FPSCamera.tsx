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
import {ecsWorld} from '../ecs/kootaWorld';
import {PlayerTrait} from '../ecs/traits';
import {inputManager} from '../input/InputManager';
import {computeHeadBob} from './headBob';
import {useMouseLook} from './useMouseLook';

const EYE_HEIGHT = playerConfig.capsule.eyeHeight;
const FOV = playerConfig.fov;

export const FPSCamera = () => {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  useMouseLook();

  useFrame(state => {
    const cam = cameraRef.current;
    if (!cam) return;

    // Read player position from Koota ECS PlayerTrait (written by PlayerCapsule each frame)
    const playerEntities = ecsWorld.query(PlayerTrait);
    const player = playerEntities.length > 0 ? playerEntities[0].get(PlayerTrait) : null;
    const px = player?.posX ?? 0;
    const py = player?.posY ?? 0;
    const pz = player?.posZ ?? 0;

    // Head bob based on movement speed
    const frame = inputManager.getFrame();
    const speed = Math.sqrt(frame.moveX * frame.moveX + frame.moveZ * frame.moveZ);
    const bobOffset = computeHeadBob(state.clock.elapsedTime, speed);

    cam.position.set(px, py + EYE_HEIGHT + bobOffset, pz);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={FOV}
      near={0.1}
      far={50}
      position={[0, EYE_HEIGHT, 0]}
    />
  );
};
