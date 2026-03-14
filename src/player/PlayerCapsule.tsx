/**
 * PlayerCapsule — Physics body for the player in the kitchen.
 *
 * Dynamic RigidBody with CapsuleCollider. WASD velocity applied
 * camera-relative each frame via usePhysicsMovement. Jump via useJump.
 * Syncs position back to Koota ECS for FPSCamera to read.
 *
 * Ported from grovekeeper, adapted for will-it-blow kitchen dimensions.
 */

import {useFrame} from '@react-three/fiber';
import type {RapierRigidBody} from '@react-three/rapier';
import {CapsuleCollider, RigidBody} from '@react-three/rapier';
import {useRef} from 'react';
import playerConfig from '../config/player.json';
import {useJump} from './useJump';
import {usePhysicsMovement} from './usePhysicsMovement';

const cfg = playerConfig.capsule;

export const CAPSULE_HEIGHT = cfg.height;
export const CAPSULE_RADIUS = cfg.radius;
export const CAPSULE_HALF_HEIGHT = (CAPSULE_HEIGHT - 2 * CAPSULE_RADIUS) / 2;
export const SPAWN_POSITION: [number, number, number] = cfg.spawnPosition as [
  number,
  number,
  number,
];

export interface PlayerCapsuleProps {
  moveDirection?: {x: number; z: number};
}

export const PlayerCapsule = ({moveDirection = {x: 0, z: 0}}: PlayerCapsuleProps) => {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  usePhysicsMovement(rigidBodyRef, moveDirection);
  useJump(rigidBodyRef);

  // Sync Rapier body position to a ref that FPSCamera reads.
  // TODO: When Koota replaces Zustand, sync to PlayerTrait instead.
  useFrame(() => {
    const body = rigidBodyRef.current;
    if (!body) return;
    const t = body.translation();
    // Store on window for FPSCamera to read (temporary until Koota wiring)
    (window as any).__playerPos = {x: t.x, y: t.y, z: t.z};
  });

  return (
    <RigidBody ref={rigidBodyRef} type="dynamic" lockRotations position={SPAWN_POSITION}>
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
    </RigidBody>
  );
};
