/**
 * @module FurnitureLoader
 * Loads discrete GLB furniture segments and positions them at targets
 * computed by FurnitureLayout.ts.
 *
 * Each piece of furniture is a separate GLB file (fridge.glb, etc.)
 * loaded via drei's `useGLTF` and `useAnimations`.
 * Positions and rotations come from `resolveTargets()` — no hardcoded
 * coordinates in this file.
 *
 * Pieces marked `ecsManaged: true` in FURNITURE_RULES are skipped —
 * they are rendered procedurally by ECS orchestrators instead.
 *
 * Handles furniture-specific animations:
 * - Fridge door open/close (plays GLB animation forward/backward)
 * - Grinder crank loop (plays GLB animation on repeat when active)
 */

import {useAnimations, useGLTF} from '@react-three/drei';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {getAssetUrl} from '../../engine/assetUrl';
import type {FurnitureRule, RoomDimensions, Target} from '../../engine/FurnitureLayout';
import {DEFAULT_ROOM, FURNITURE_RULES, resolveTargets} from '../../engine/FurnitureLayout';

interface FurnitureLoaderProps {
  room?: RoomDimensions;
  fridgeDoorOpen?: boolean;
  grinderCranking?: boolean;
}

function resolveGlbUrl(glb: string): string {
  return getAssetUrl('models', glb);
}

// ---------------------------------------------------------------------------
// FurniturePiece — loads a single GLB and places it at the resolved target
// ---------------------------------------------------------------------------

/**
 * Loads a single GLB furniture model and places it at its resolved target.
 * Applies material fixes (frontside culling, tamed envMap) and handles
 * fridge door and grinder crank animations.
 */
function FurniturePiece({
  rule,
  target,
  fridgeDoorOpen,
  grinderCranking,
}: {
  rule: FurnitureRule;
  target: Target;
  fridgeDoorOpen: boolean;
  grinderCranking: boolean;
}) {
  const url = resolveGlbUrl(rule.glb);
  const {scene, animations} = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const {actions} = useAnimations(animations, groupRef);

  // Apply material fixes once on load (backface culling + tame envMapIntensity)
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.material.side = THREE.FrontSide;
        if (child.material.isMeshStandardMaterial) {
          child.material.envMapIntensity = 0.05;
        }
      }
    });
  }, [scene]);

  // Fridge door animation
  const isFridge = rule.glb === 'fridge.glb';
  useEffect(() => {
    if (!isFridge) return;
    const doorAction =
      actions.FridgeArmatureAction ??
      actions['Armature|Armature|ArmatureAction'] ??
      Object.values(actions).find(a => a != null);
    if (!doorAction) return;

    doorAction.clampWhenFinished = true;
    doorAction.setLoop(THREE.LoopOnce, 1);

    if (fridgeDoorOpen) {
      doorAction.timeScale = 1;
      doorAction.reset().play();
    } else {
      doorAction.timeScale = -1;
      doorAction.paused = false;
    }
  }, [isFridge, fridgeDoorOpen, actions]);

  // Grinder crank animation
  const isGrinder = rule.glb === 'meat_grinder.glb';
  useEffect(() => {
    if (!isGrinder) return;
    const crankAction = actions.CrankPivotAction ?? Object.values(actions).find(a => a != null);
    if (!crankAction) return;

    if (grinderCranking) {
      crankAction.setLoop(THREE.LoopRepeat, Infinity);
      crankAction.reset().play();
    } else {
      crankAction.stop();
    }
  }, [isGrinder, grinderCranking, actions]);

  return (
    <group ref={groupRef} position={target.position} rotation={[0, target.rotationY, 0]}>
      <primitive object={scene} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// FurnitureLoader — loads all GLB segments and positions them
// ---------------------------------------------------------------------------

/**
 * Iterates over FURNITURE_RULES and renders a FurniturePiece for each.
 * Pieces marked `ecsManaged` are skipped (rendered by ECS orchestrators).
 */
export function FurnitureLoader({
  room = DEFAULT_ROOM,
  fridgeDoorOpen = false,
  grinderCranking = false,
}: FurnitureLoaderProps) {
  const targets = useMemo(() => resolveTargets(room), [room]);

  return (
    <group>
      {FURNITURE_RULES.map(rule => {
        // Skip pieces managed by ECS orchestrators (rendered procedurally)
        if (rule.ecsManaged) return null;

        const target = targets[rule.target];
        if (!target) return null;

        return (
          <FurniturePiece
            key={rule.glb}
            rule={rule}
            target={target}
            fridgeDoorOpen={fridgeDoorOpen}
            grinderCranking={grinderCranking}
          />
        );
      })}
    </group>
  );
}
