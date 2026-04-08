/**
 * FPSCamera — First-person camera at eye height above the player capsule.
 *
 * Reads player position each frame from the module-level `playerPosition`
 * singleton (written by `PlayerCapsule` earlier in the same frame) and
 * positions the camera at eye height above the capsule's base (feet).
 * Look direction is driven by `useMouseLook` (pointer lock + mouse delta).
 * Head bob is applied when the player is actually walking (standing posture
 * + non-zero input speed).
 *
 * `playerPosition.y` is the Rapier body *center* (half the capsule height
 * above the feet), so we subtract that half-height to get the feet position
 * and then add `EYE_HEIGHT` to land the camera at a sensible eye line. This
 * matters when the player is stood on a prop like the mattress: naively
 * adding `EYE_HEIGHT` to the center would push the eye 0.9m higher than
 * expected — straight into the ceiling.
 *
 * Ported from grovekeeper, adapted for will-it-blow.
 */

import {PerspectiveCamera} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type {PerspectiveCamera as PerspectiveCameraImpl} from 'three';
import playerConfig from '../config/player.json';
import {useGameStore} from '../ecs/hooks';
import {inputManager} from '../input/InputManager';
import {computeHeadBob} from './headBob';
import {CAPSULE_HEIGHT} from './PlayerCapsule';
import {playerPosition} from './playerPosition';
import {useMouseLook} from './useMouseLook';

const EYE_HEIGHT = playerConfig.capsule.eyeHeight;
const FOV = playerConfig.fov;
/** Offset from body center to eye: eye height above feet − half the capsule height. */
const EYE_OFFSET_FROM_CENTER = EYE_HEIGHT - CAPSULE_HEIGHT / 2;

export const FPSCamera = () => {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const posture = useGameStore(s => s.posture);
  useMouseLook();

  useFrame(state => {
    const cam = cameraRef.current;
    if (!cam) return;

    // Head bob only when actually walking on two feet — matches the original
    // POC behavior and prevents an unrealistic bob while prone/sitting.
    let bobOffset = 0;
    if (posture === 'standing') {
      const frame = inputManager.getFrame();
      const speed = Math.sqrt(frame.moveX * frame.moveX + frame.moveZ * frame.moveZ);
      bobOffset = computeHeadBob(state.clock.elapsedTime, speed);
    }

    cam.position.set(
      playerPosition.x,
      playerPosition.y + EYE_OFFSET_FROM_CENTER + bobOffset,
      playerPosition.z,
    );
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={FOV}
      near={0.1}
      far={50}
      position={[playerPosition.x, playerPosition.y + EYE_OFFSET_FROM_CENTER, playerPosition.z]}
    />
  );
};
