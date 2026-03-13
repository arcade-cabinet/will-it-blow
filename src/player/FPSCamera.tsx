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
import {Vector3} from 'three';
import playerConfig from '../config/player.json';
import {inputManager} from '../input/InputManager';
import {computeHeadBob} from './headBob';
import {useMouseLook} from './useMouseLook';

const EYE_HEIGHT = playerConfig.capsule.eyeHeight;
const FOV = playerConfig.fov;
const DEFAULT_POSITION = new Vector3(0, EYE_HEIGHT, 0);

export const FPSCamera = () => {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  useMouseLook();

  useFrame(state => {
    const cam = cameraRef.current;
    if (!cam) return;

    // Read player position (from PlayerCapsule's useFrame sync)
    const pos = (window as any).__playerPos ?? DEFAULT_POSITION;

    // Head bob based on movement speed
    const frame = inputManager.getFrame();
    const speed = Math.sqrt(frame.moveX * frame.moveX + frame.moveZ * frame.moveZ);
    const bobOffset = computeHeadBob(state.clock.elapsedTime, speed);

    cam.position.set(pos.x, pos.y + EYE_HEIGHT + bobOffset, pos.z);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={FOV}
      near={0.1}
      far={50}
      position={[DEFAULT_POSITION.x, DEFAULT_POSITION.y, DEFAULT_POSITION.z]}
    />
  );
};
