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
import {useEffect, useRef} from 'react';
import playerConfig from '../config/player.json';
import {useGameStore} from '../ecs/hooks';
import {playerPosition} from './playerPosition';
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

  const setPlayerPosition = useGameStore(s => s.setPlayerPosition);

  // Dev-only teleport hook — exposed on window so playtests and the debug
  // bridge can reposition the player without simulating WASD input. No-op
  // in production builds (tree-shaken by the `import.meta.env.DEV` guard).
  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    window.__WIB_TELEPORT__ = (x: number, y: number, z: number) => {
      const body = rigidBodyRef.current;
      if (!body) return;
      body.setTranslation({x, y, z}, true);
      body.setLinvel({x: 0, y: 0, z: 0}, true);
      body.setAngvel({x: 0, y: 0, z: 0}, true);
    };
    return () => {
      delete window.__WIB_TELEPORT__;
    };
  }, []);

  // Sync Rapier body position to Koota ECS PlayerTrait + shared per-frame
  // singleton (consumed by FPSCamera in the same tick). The ECS write feeds
  // React-subscribed consumers; the singleton mutation is a zero-allocation
  // hot-path hand-off that avoids the React store entirely.
  useFrame(() => {
    const body = rigidBodyRef.current;
    if (!body) return;
    const t = body.translation();
    setPlayerPosition(t.x, t.y, t.z);
    playerPosition.set(t.x, t.y, t.z);
  });

  return (
    <RigidBody ref={rigidBodyRef} type="dynamic" lockRotations position={SPAWN_POSITION}>
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
    </RigidBody>
  );
};
