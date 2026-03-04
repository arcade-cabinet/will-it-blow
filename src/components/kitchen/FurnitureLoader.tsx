/**
 * @module FurnitureLoader
 * Loads discrete GLB furniture segments and positions them at targets
 * computed by FurnitureLayout.ts.
 *
 * Each piece of furniture is a separate GLB file (fridge.glb, etc.)
 * loaded via drei's `useGLTF` and `useAnimations`.
 * Positions and rotations come from `resolveLayout()` — no hardcoded
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
import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {config} from '../../config';
import {getAssetUrl} from '../../engine/assetUrl';
import type {FurnitureRule, RoomDimensions, Target} from '../../engine/FurnitureLayout';
import {DEFAULT_ROOM, FURNITURE_RULES} from '../../engine/FurnitureLayout';
import {mergeLayoutConfigs, resolveLayout} from '../../engine/layout';
import {traverseMeshes} from '../../engine/threeUtils';
import {useGameStore} from '../../store/gameStore';

/** Seconds the player must be within proximity before the fridge auto-opens. */
const FRIDGE_AUTO_OPEN_DELAY = 3.0;
/** World-space distance from fridge center within which auto-open triggers. */
const FRIDGE_PROXIMITY_RADIUS = 2.5;
/** Spring-back speed per second when releasing the fridge handle below snap threshold. */
const FRIDGE_SPRING_BACK_SPEED = 2.0;

interface FurnitureLoaderProps {
  room?: RoomDimensions;
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
  room,
  grinderCranking,
}: {
  rule: FurnitureRule;
  target: Target;
  room: RoomDimensions;
  grinderCranking: boolean;
}) {
  const url = resolveGlbUrl(rule.glb);
  const {scene: originalScene, animations} = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  // Deep-clone the scene so multiple FurniturePieces can reuse the same GLB
  // (e.g. workplan.glb on both left and right walls). Three.js Object3D can
  // only have one parent — without cloning, the second <primitive> steals
  // the scene graph from the first.
  const scene = useMemo(() => originalScene.clone(true), [originalScene]);

  const {actions} = useAnimations(animations, groupRef);

  // Apply material fixes + cull GLB artifact meshes that extend past room walls.
  // Some Blender-exported GLBs contain helper/collision meshes (named CubeXXX) with
  // huge local offsets. When <primitive object={scene}/> renders ALL sub-meshes,
  // these giant black meshes occlude the camera view. We hide any mesh whose
  // world-space bounding box extends far past the room envelope.
  useEffect(() => {
    // Compute transforms within the GLB hierarchy so mesh.matrixWorld is valid
    scene.updateMatrixWorld(true);

    // Placement transform matching <group position={pos} rotation={[0, rotY, 0]}>
    const placementMat = new THREE.Matrix4().makeRotationY(target.rotationY);
    placementMat.setPosition(target.position[0], target.position[1], target.position[2]);

    // Room boundary limits — 2m margin to avoid clipping legitimate wall-flush furniture
    const CULL_MARGIN = 2.0;
    const limX = room.w / 2 + CULL_MARGIN;
    const limZ = room.d / 2 + CULL_MARGIN;
    const limY = room.h + CULL_MARGIN;

    traverseMeshes(scene, mesh => {
      const mat = mesh.material;
      if (Array.isArray(mat)) return;
      mat.side = THREE.FrontSide;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.envMapIntensity = 0.05;
      }

      // Cull artifact meshes outside room envelope
      if (mesh.geometry) {
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        if (bb) {
          const worldBB = bb.clone().applyMatrix4(placementMat.clone().multiply(mesh.matrixWorld));
          const outOfBounds =
            worldBB.max.x > limX ||
            worldBB.min.x < -limX ||
            worldBB.max.z > limZ ||
            worldBB.min.z < -limZ ||
            worldBB.max.y > limY ||
            worldBB.min.y < -CULL_MARGIN;
          mesh.visible = !outOfBounds;
        }
      }
    });
  }, [scene, target.position, target.rotationY, room]);

  // Fridge door animation — driven by store fridgeDoorProgress (0-1)
  const isFridge = rule.glb === 'fridge.glb';
  const fridgeDoorProgress = useGameStore(s => s.fridgeDoorProgress);
  const setFridgeDoorProgress = useGameStore(s => s.setFridgeDoorProgress);
  const playerPosition = useGameStore(s => s.playerPosition);
  const doorActionRef = useRef<THREE.AnimationAction | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartProgressRef = useRef(0);
  const springBackRef = useRef(false);
  const proximityTimerRef = useRef(0);
  const handleHoveredRef = useRef(false);

  useEffect(() => {
    if (!isFridge) return;
    const doorAction =
      actions.FridgeArmatureAction ??
      actions['Armature|Armature|ArmatureAction'] ??
      Object.values(actions).find(a => a != null);
    if (!doorAction) return;

    doorAction.clampWhenFinished = true;
    doorAction.setLoop(THREE.LoopOnce, 1);
    doorAction.play();
    doorAction.paused = true;
    doorActionRef.current = doorAction;
  }, [isFridge, actions]);

  // Sync animation time to door progress + spring-back + auto-open proximity
  useFrame((_state, delta) => {
    const action = doorActionRef.current;
    if (!action || !isFridge) return;
    const clip = action.getClip();

    // Spring-back: if released below snap threshold, animate back to 0
    if (springBackRef.current && fridgeDoorProgress > 0 && fridgeDoorProgress < 1) {
      const newProgress = Math.max(0, fridgeDoorProgress - FRIDGE_SPRING_BACK_SPEED * delta);
      setFridgeDoorProgress(newProgress);
      if (newProgress <= 0) springBackRef.current = false;
    }

    // Auto-open proximity: if player is near fridge for FRIDGE_AUTO_OPEN_DELAY seconds
    if (fridgeDoorProgress < 1 && !isDraggingRef.current) {
      const dx = playerPosition[0] - target.position[0];
      const dz = playerPosition[2] - target.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < FRIDGE_PROXIMITY_RADIUS) {
        proximityTimerRef.current += delta;
        if (proximityTimerRef.current >= FRIDGE_AUTO_OPEN_DELAY) {
          setFridgeDoorProgress(1);
          proximityTimerRef.current = 0;
        }
      } else {
        proximityTimerRef.current = 0;
      }
    }

    action.time = fridgeDoorProgress * clip.duration;
  });

  // Pointer drag handlers for fridge door
  const onFridgePointerDown = (e: any) => {
    if (!isFridge || fridgeDoorProgress >= 1) return;
    e.stopPropagation();
    isDraggingRef.current = true;
    springBackRef.current = false;
    dragStartYRef.current = e.clientY ?? e.nativeEvent?.clientY ?? 0;
    dragStartProgressRef.current = fridgeDoorProgress;
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  };
  const onFridgePointerMove = (e: any) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    const clientY = e.clientY ?? e.nativeEvent?.clientY ?? 0;
    const deltaY = dragStartYRef.current - clientY; // drag up = positive
    const dragSensitivity = 0.005; // pixels to progress
    const newProgress = dragStartProgressRef.current + deltaY * dragSensitivity;
    setFridgeDoorProgress(newProgress);
  };
  const onFridgePointerUp = (e: any) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    // If below snap threshold, spring back to closed
    if (fridgeDoorProgress < 0.7) {
      springBackRef.current = true;
    }
  };
  const onHandlePointerOver = () => {
    handleHoveredRef.current = true;
    if (typeof document !== 'undefined') document.body.style.cursor = 'grab';
  };
  const onHandlePointerOut = () => {
    handleHoveredRef.current = false;
    if (typeof document !== 'undefined') document.body.style.cursor = 'default';
  };

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
    <group
      ref={groupRef}
      name={rule.target}
      position={target.position}
      rotation={[0, target.rotationY, 0]}
    >
      <primitive object={scene} />
      {/* Fridge door handle — visible metallic bar for pull gesture */}
      {isFridge && fridgeDoorProgress < 1 && (
        <mesh
          position={[0.45, 0.8, 0.75]}
          onPointerDown={onFridgePointerDown}
          onPointerMove={onFridgePointerMove}
          onPointerUp={onFridgePointerUp}
          onPointerOver={onHandlePointerOver}
          onPointerOut={onHandlePointerOut}
        >
          <boxGeometry args={[0.04, 0.3, 0.04]} />
          <meshStandardMaterial color="#888888" roughness={0.3} metalness={0.8} />
        </mesh>
      )}
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
  grinderCranking = false,
}: FurnitureLoaderProps) {
  const targets = useMemo(() => {
    const layoutConfig = mergeLayoutConfigs(
      config.layout.room,
      config.layout.rails,
      config.layout.placements,
    );
    return resolveLayout(layoutConfig, room).targets;
  }, [room]);

  return (
    <group>
      {FURNITURE_RULES.map(rule => {
        // Skip pieces managed by ECS orchestrators (rendered procedurally)
        if (rule.ecsManaged) return null;

        const target = targets[rule.target];
        if (!target) return null;

        return (
          <FurniturePiece
            key={rule.target}
            rule={rule}
            target={target}
            room={room}
            grinderCranking={grinderCranking}
          />
        );
      })}
    </group>
  );
}
