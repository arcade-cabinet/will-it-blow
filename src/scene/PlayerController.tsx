/**
 * @module PlayerController
 * First-person player — Bullet capsule + camera at eye height.
 *
 * Phase 1: Static camera at spawn position (no touch controls yet)
 * Phase 2: Gesture-based look (right side drag)
 * Phase 3: Gesture-based movement (left side virtual joystick)
 */

import type {DiscreteDynamicWorld} from 'react-native-filament';
import {Camera, useCylinderShape, useRigidBody} from 'react-native-filament';
import playerConfig from '../config/player.json';

const EYE_HEIGHT = playerConfig.capsule.eyeHeight;
const SPAWN = playerConfig.capsule.spawnPosition as [number, number, number];

interface PlayerControllerProps {
  world: DiscreteDynamicWorld;
}

export function PlayerController({world}: PlayerControllerProps) {
  // Player physics body — cylinder approximating a capsule
  const halfH = playerConfig.capsule.height / 2;
  const halfR = playerConfig.capsule.radius;
  const capsuleShape = useCylinderShape({half: [halfR, halfH, halfR]});

  useRigidBody(
    capsuleShape
      ? {
          id: 'player',
          mass: 70,
          shape: capsuleShape,
          world,
          origin: SPAWN,
          damping: [0.95, 0.95],
        }
      : undefined,
  );

  // Camera at ground + eye height, looking into kitchen center
  const eyePos: [number, number, number] = [SPAWN[0], EYE_HEIGHT, SPAWN[2]];
  const lookAt: [number, number, number] = [0, 1.2, -1];

  return <Camera cameraPosition={eyePos} cameraTarget={lookAt} near={0.1} far={50} />;
}
