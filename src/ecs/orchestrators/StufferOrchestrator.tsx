/**
 * @module StufferOrchestrator
 * ECS-driven visual driver for the stuffer station.
 *
 * Spawns stuffer machine entities from STUFFER_ARCHETYPE on mount,
 * despawns on unmount. Uses MachineEntitiesRenderer for all ECS entity
 * rendering with automatic input event wiring (crank).
 *
 * This orchestrator is VISUAL ONLY — it reads Zustand state set by the
 * 2D StuffingChallenge overlay and drives ECS entity animations.
 * It does NOT manage game phases, scoring, or completion logic.
 *
 * ECS systems handle:
 * - CrankSystem: drag-to-angularVelocity conversion + damping
 * - InputContractSystem: wiring crank -> vibration/power
 * - VibrationSystem: canister/spout vibration when powered
 * - FillDrivenSystem: plunger-disc Y-position driven by fillLevel
 */

import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {StufferCasing} from '../../components/kitchen/stuffer/StufferCasing';
import {WaterBowl} from '../../components/kitchen/stuffer/WaterBowl';
import {fireHaptic} from '../../input/HapticService';
import {useGameStore} from '../../store/gameStore';
import {despawnMachine, spawnMachine} from '../archetypes/spawnMachine';
import {STUFFER_ARCHETYPE} from '../archetypes/stufferArchetype';
import {MachineEntitiesRenderer} from '../renderers/ECSScene';
import type {Entity} from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of bones in the sausage skeleton (determines link resolution). */
const NUM_BONES = 12;

/** Total sausage length along the Z axis when fully extruded. */
const SAUSAGE_LENGTH = 2.4;

/** Base radius of the sausage cylinder. */
const SAUSAGE_RADIUS = 0.08;

/** Scale applied to bones at twist/pinch points (creates visual constriction). */
const PINCH_SCALE = 0.3;

/** How many geometry segments per bone (affects smoothness). */
const SEGMENTS_PER_BONE = 4;

/** Nozzle tip position -- sausage extrudes from here along +Z. */
const NOZZLE_TIP: [number, number, number] = [0, 0, 0];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StufferOrchestratorProps {
  position: [number, number, number];
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Geometry builder -- procedural sausage cylinder with skeleton
// ---------------------------------------------------------------------------

interface SausageGeometryResult {
  geometry: THREE.CylinderGeometry;
  skeleton: THREE.Skeleton;
  rootBone: THREE.Bone;
  bones: THREE.Bone[];
}

function buildSausageGeometry(
  numBones: number,
  length: number,
  radius: number,
): SausageGeometryResult {
  const segmentHeight = length / numBones;
  const totalSegments = numBones * SEGMENTS_PER_BONE;

  const geometry = new THREE.CylinderGeometry(radius, radius, length, 8, totalSegments);

  const rootBone = new THREE.Bone();
  rootBone.position.set(0, -length / 2, 0);
  const bones: THREE.Bone[] = [rootBone];

  for (let i = 1; i <= numBones; i++) {
    const bone = new THREE.Bone();
    bone.position.set(0, segmentHeight, 0);
    bones[i - 1].add(bone);
    bones.push(bone);
  }

  const skeleton = new THREE.Skeleton(bones);

  const posAttr = geometry.getAttribute('position');
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];

  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i) + length / 2;
    const boneFloat = (y / length) * numBones;
    const boneIdx = Math.min(Math.floor(boneFloat), numBones - 1);
    const nextIdx = Math.min(boneIdx + 1, numBones);
    const blend = boneFloat - boneIdx;

    skinIndices.push(boneIdx, nextIdx, 0, 0);
    skinWeights.push(1 - blend, blend, 0, 0);
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  return {geometry, skeleton, rootBone, bones};
}

// ---------------------------------------------------------------------------
// SausageLinksBody -- skinned mesh sausage with twist pinches
// ---------------------------------------------------------------------------

interface SausageLinksBodyProps {
  extrusionProgress: number;
  twistPositions: number[];
  blendColor: string;
}

function SausageLinksBody({extrusionProgress, twistPositions, blendColor}: SausageLinksBodyProps) {
  const meshRef = useRef<THREE.SkinnedMesh>(null);

  const {geometry, skeleton, rootBone, bones} = useMemo(
    () => buildSausageGeometry(NUM_BONES, SAUSAGE_LENGTH, SAUSAGE_RADIUS),
    [],
  );

  useFrame(() => {
    if (!meshRef.current) return;

    const visibleBones = Math.floor(extrusionProgress * NUM_BONES);

    for (let i = 1; i <= NUM_BONES; i++) {
      const bone = bones[i];
      if (i <= visibleBones) {
        const boneNormalized = i / NUM_BONES;
        let isPinched = false;
        for (const tp of twistPositions) {
          if (Math.abs(boneNormalized - tp) < 1 / NUM_BONES) {
            isPinched = true;
            break;
          }
        }
        bone.scale.setScalar(isPinched ? PINCH_SCALE : 1.0);
      } else {
        bone.scale.setScalar(0.001);
      }
    }
  });

  const color = useMemo(() => new THREE.Color(blendColor), [blendColor]);

  return (
    <group
      position={[NOZZLE_TIP[0], NOZZLE_TIP[1], NOZZLE_TIP[2] + SAUSAGE_LENGTH / 2]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <primitive object={rootBone} />
      <skinnedMesh ref={meshRef} geometry={geometry} skeleton={skeleton} frustumCulled={false}>
        <meshBasicMaterial color={color} />
      </skinnedMesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// StufferOrchestrator
// ---------------------------------------------------------------------------

export const StufferOrchestrator = ({position, visible}: StufferOrchestratorProps) => {
  // ---- ECS entity lifecycle ----
  const entitiesRef = useRef<Entity[]>([]);

  useEffect(() => {
    const entities = spawnMachine(STUFFER_ARCHETYPE);
    entitiesRef.current = entities;
    return () => {
      despawnMachine(entities);
      entitiesRef.current = [];
    };
  }, []);

  // ---- Store (read-only) ----
  const blendColor = useGameStore(s => s.blendColor);
  const challengeProgress = useGameStore(s => s.challengeProgress);
  const twistPoints = useGameStore(s => s.playerDecisions.twistPoints);

  // Derive fill level from challenge progress (0-100 -> 0-1)
  const fillLevel = challengeProgress / 100;

  // ---- Enable/disable ECS input primitives + haptic feedback ----
  useEffect(() => {
    for (const entity of entitiesRef.current) {
      if (entity.crank) {
        entity.crank.enabled = visible;
      }
    }
  }, [visible]);

  // Haptic on twist points changes
  const prevTwistCountRef = useRef(twistPoints.length);
  useEffect(() => {
    if (twistPoints.length > prevTwistCountRef.current) {
      fireHaptic('button_press');
    }
    prevTwistCountRef.current = twistPoints.length;
  }, [twistPoints.length]);

  // ---- useFrame: sync ECS fillDriven with store-driven fillLevel ----
  useFrame(() => {
    if (!visible) return;

    // Sync fillDriven entity with store-driven fillLevel
    const discEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'plunger-disc');
    if (discEntity?.fillDriven) {
      discEntity.fillDriven.fillLevel = fillLevel;
    }
  });

  if (!visible) return null;

  return (
    <group position={position}>
      {/* ECS machine entities -- rendered with automatic input event wiring */}
      <MachineEntitiesRenderer entities={entitiesRef.current} />

      {/* Water bowl: casing soaking bowl, offset to left/front */}
      <WaterBowl position={[-0.5, -0.5, 0.3]} />

      {/* Casing tube: inflates based on fill/pressure, shifts color */}
      <StufferCasing fillLevel={fillLevel} pressureLevel={fillLevel} blendColor={blendColor} />

      {/* Sausage body (skinned mesh) */}
      <SausageLinksBody
        extrusionProgress={fillLevel}
        twistPositions={twistPoints}
        blendColor={blendColor}
      />
    </group>
  );
};
