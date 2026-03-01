import {useAnimations, useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {audioEngine} from '../../engine/AudioEngine';
import {getAssetUrl} from '../../engine/assetUrl';
import type {FurnitureRule, RoomDimensions, Target} from '../../engine/FurnitureLayout';
import {DEFAULT_ROOM, FURNITURE_RULES, resolveTargets} from '../../engine/FurnitureLayout';
import {useGameStore} from '../../store/gameStore';

interface FurnitureLoaderProps {
  room?: RoomDimensions;
  fridgeDoorOpen?: boolean;
  grinderCranking?: boolean;
  /** Override position for the mixing bowl (dynamic — follows bowlPosition state). */
  bowlPosition?: [number, number, number] | null;
  /** Whether the bowl should accept dropped ingredients. */
  bowlReceiving?: boolean;
}

function resolveGlbUrl(glb: string): string {
  return getAssetUrl('models', glb);
}

// ---------------------------------------------------------------------------
// Bowl constants for fill cylinder
// ---------------------------------------------------------------------------

const BOWL_SCALE = 0.65;
const BOWL_RADIUS = 0.31 * BOWL_SCALE;
const BOWL_HEIGHT = 0.255 * BOWL_SCALE;
const MAX_FILL_HEIGHT = BOWL_HEIGHT * 0.6;

// ---------------------------------------------------------------------------
// BowlFill — fill cylinder + receiver overlay for the mixing bowl
// ---------------------------------------------------------------------------

function BowlFill({receiving}: {receiving: boolean}) {
  const fillRef = useRef<THREE.Mesh>(null);
  const bowlContents = useGameStore(s => s.bowlContents);
  const blendColor = useGameStore(s => s.blendColor);
  const blendRoughness = useGameStore(s => s.blendRoughness);
  const blendChunkiness = useGameStore(s => s.blendChunkiness);
  const addToBowl = useGameStore(s => s.addToBowl);

  const fillHeight = useMemo(
    () => Math.min(bowlContents.length * 0.025, MAX_FILL_HEIGHT),
    [bowlContents.length],
  );

  const currentFillRef = useRef(0);
  useFrame((_state, delta) => {
    if (!fillRef.current) return;
    currentFillRef.current += (fillHeight - currentFillRef.current) * Math.min(delta * 5, 1);
    const h = currentFillRef.current;
    fillRef.current.scale.y = h > 0.001 ? h / MAX_FILL_HEIGHT : 0;
    fillRef.current.position.y = h / 2 + 0.01;
  });

  const handleReceive = useCallback(
    (objectType: string, objectId: string) => {
      if (objectType === 'ingredient') {
        addToBowl(objectId);
        audioEngine.playMix();
      }
    },
    [addToBowl],
  );

  return (
    <>
      {receiving && (
        <mesh
          position={[0, BOWL_HEIGHT * 0.3, 0]}
          userData={{receiver: true, onReceive: handleReceive}}
        >
          <cylinderGeometry args={[BOWL_RADIUS * 0.85, BOWL_RADIUS * 0.85, 0.04, 16]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}

      {bowlContents.length > 0 && (
        <mesh ref={fillRef} position={[0, 0.01, 0]}>
          <cylinderGeometry args={[BOWL_RADIUS * 0.75, BOWL_RADIUS * 0.55, MAX_FILL_HEIGHT, 16]} />
          <meshStandardMaterial
            color={blendColor}
            roughness={blendRoughness}
            metalness={0.1}
            emissiveIntensity={blendChunkiness * 0.15}
          />
        </mesh>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// FurniturePiece — loads a single GLB and places it at the resolved target
// ---------------------------------------------------------------------------

function FurniturePiece({
  rule,
  target,
  fridgeDoorOpen,
  grinderCranking,
  positionOverride,
  bowlReceiving,
}: {
  rule: FurnitureRule;
  target: Target;
  fridgeDoorOpen: boolean;
  grinderCranking: boolean;
  positionOverride?: [number, number, number] | null;
  bowlReceiving?: boolean;
}) {
  const url = resolveGlbUrl(rule.glb);
  const {scene, animations} = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const {actions} = useAnimations(animations, groupRef);

  const isBowl = rule.glb === 'mixing_bowl.glb';
  const pos = positionOverride ?? target.position;

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
    <group
      ref={groupRef}
      position={pos}
      rotation={[0, target.rotationY, 0]}
      userData={isBowl ? {grabbable: true, objectType: 'bowl', objectId: 'mixing-bowl'} : undefined}
    >
      <primitive object={scene} scale={isBowl ? BOWL_SCALE : undefined} />
      {isBowl && <BowlFill receiving={bowlReceiving ?? false} />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// FurnitureLoader — loads all GLB segments and positions them
// ---------------------------------------------------------------------------

export function FurnitureLoader({
  room = DEFAULT_ROOM,
  fridgeDoorOpen = false,
  grinderCranking = false,
  bowlPosition,
  bowlReceiving = false,
}: FurnitureLoaderProps) {
  const targets = useMemo(() => resolveTargets(room), [room]);

  return (
    <group>
      {FURNITURE_RULES.map(rule => {
        const target = targets[rule.target];
        if (!target) return null;

        const isBowl = rule.glb === 'mixing_bowl.glb';

        // Bowl is conditionally shown based on bowlPosition
        if (isBowl && bowlPosition == null) return null;

        return (
          <FurniturePiece
            key={
              isBowl
                ? `bowl-${bowlPosition?.[0]}-${bowlPosition?.[1]}-${bowlPosition?.[2]}`
                : rule.glb
            }
            rule={rule}
            target={target}
            fridgeDoorOpen={fridgeDoorOpen}
            grinderCranking={grinderCranking}
            positionOverride={isBowl ? bowlPosition : undefined}
            bowlReceiving={isBowl ? bowlReceiving : undefined}
          />
        );
      })}
    </group>
  );
}
