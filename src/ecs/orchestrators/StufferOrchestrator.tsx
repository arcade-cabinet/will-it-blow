/**
 * @module StufferOrchestrator
 * ECS-driven replacement for StufferMechanics.
 *
 * Spawns stuffer machine entities from STUFFER_ARCHETYPE on mount,
 * despawns on unmount. Uses MachineEntitiesRenderer for all ECS entity
 * rendering with automatic input event wiring (crank).
 *
 * Challenge-specific elements (sausage skinned mesh, casing inflation,
 * water bowl, twist flashes) remain as R3F JSX since they are unique to
 * the stuffer challenge and not part of the machine's compositional ECS model.
 *
 * ECS systems handle:
 * - CrankSystem: drag-to-angularVelocity conversion + damping
 * - InputContractSystem: wiring crank -> vibration/power
 * - VibrationSystem: canister/spout vibration when powered
 * - FillDrivenSystem: plunger-disc Y-position driven by fillLevel
 *
 * The orchestrator only:
 * - Manages phase state machine (fill -> stuff -> done)
 * - Reads crank angularVelocity each frame to advance fillLevel
 * - Toggles crank.enabled based on game phase
 * - Manages challenge-specific elements (sausage body, casing, twist detection)
 * - Fires onStuffComplete callback with twist/flair data
 *
 * @see StufferMechanics - the old monolithic component this replaces
 * @see StufferCasing - inflation/pressure color visual
 * @see WaterBowl - casing soaking bowl decoration
 */

import {useFrame} from '@react-three/fiber';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three/webgpu';
import {StufferCasing} from '../../components/kitchen/stuffer/StufferCasing';
import {WaterBowl} from '../../components/kitchen/stuffer/WaterBowl';
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

/** Duration of the twist pulse animation in seconds. */
const TWIST_PULSE_DURATION = 0.25;

/** How many geometry segments per bone (affects smoothness). */
const SEGMENTS_PER_BONE = 4;

/** How much fillLevel (0-1) increases per unit of angular velocity per second. */
const FILL_PER_VELOCITY = 0.04;

/** Minimum angular velocity threshold to register as cranking. */
const VELOCITY_THRESHOLD = 0.1;

/** Nozzle tip position -- sausage extrudes from here along +Z. */
const NOZZLE_TIP: [number, number, number] = [0, 0, 0];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StufferPhase = 'fill' | 'stuff' | 'done';

export interface StufferOrchestratorProps {
  position: [number, number, number];
  counterY: number;
  visible: boolean;
  onStuffComplete?: (result: {twistPoints: number[]; flairPoints: number}) => void;
}

interface TwistFlashData {
  position: [number, number, number];
  startTime: number;
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
// TwistFlash -- brief scale-pulse feedback at a twist point
// ---------------------------------------------------------------------------

function TwistFlash({position, startTime}: TwistFlashData) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({clock}) => {
    if (!meshRef.current) return;
    const elapsed = clock.getElapsedTime() - startTime;
    if (elapsed > TWIST_PULSE_DURATION) {
      meshRef.current.visible = false;
      return;
    }
    const t = elapsed / TWIST_PULSE_DURATION;
    const scale = 1.5 * (1 - t);
    meshRef.current.scale.setScalar(scale);
    meshRef.current.visible = true;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 1 - t;
  });

  return (
    <mesh ref={meshRef} position={position} visible={false}>
      <sphereGeometry args={[SAUSAGE_RADIUS * 2, 8, 8]} />
      <meshBasicMaterial color={0xffcc00} transparent opacity={1} depthWrite={false} />
    </mesh>
  );
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

export const StufferOrchestrator = ({
  position,
  counterY: _counterY,
  visible,
  onStuffComplete,
}: StufferOrchestratorProps) => {
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

  // ---- Store ----
  const blendColor = useGameStore(s => s.blendColor);
  const recordTwist = useGameStore(s => s.recordTwist);
  const recordFlairTwist = useGameStore(s => s.recordFlairTwist);
  const recordFormChoice = useGameStore(s => s.recordFormChoice);
  const recordFlairPoint = useGameStore(s => s.recordFlairPoint);

  // ---- Phase state machine ----
  const [gamePhase, setGamePhase] = useState<StufferPhase>('fill');
  const gamePhaseRef = useRef<StufferPhase>('fill');
  gamePhaseRef.current = gamePhase;

  // ---- Mutable refs (avoid stale closure in useFrame) ----
  const fillLevelRef = useRef(0);
  const isCrankingRef = useRef(false);
  const twistPointsRef = useRef<number[]>([]);
  const flairPointsRef = useRef(0);
  const twistFlashesRef = useRef<TwistFlashData[]>([]);
  const clockRef = useRef(0);

  // ---- Enable/disable ECS input primitives based on game phase ----
  useEffect(() => {
    for (const entity of entitiesRef.current) {
      if (entity.crank) {
        entity.crank.enabled = gamePhase === 'stuff';
      }
    }
  }, [gamePhase]);

  // ---- Twist handler (tap on sausage hitbox) ----
  const handleTwistTap = useCallback(
    (e: {stopPropagation: () => void; point?: {z: number}}) => {
      e.stopPropagation();

      // Only allow twists during stuff phase
      if (gamePhaseRef.current !== 'stuff') return;
      if (fillLevelRef.current <= 0) return;

      // Calculate normalized position based on tap location
      let normalizedPos = fillLevelRef.current;
      if (e.point) {
        const localZ = e.point.z - NOZZLE_TIP[2];
        normalizedPos = Math.max(0.05, Math.min(0.95, localZ / SAUSAGE_LENGTH));
      }

      // Record the twist in store
      recordTwist(normalizedPos);

      // Track locally for visual feedback
      twistPointsRef.current = [...twistPointsRef.current, normalizedPos];

      // Add a twist flash
      twistFlashesRef.current = [
        ...twistFlashesRef.current,
        {
          position: [NOZZLE_TIP[0], NOZZLE_TIP[1], NOZZLE_TIP[2] + normalizedPos * SAUSAGE_LENGTH],
          startTime: clockRef.current,
        },
      ];

      // Flair: simultaneous crank + twist
      if (isCrankingRef.current) {
        recordFlairTwist();
        recordFlairPoint('simultaneous-crank-twist', 5);
        flairPointsRef.current += 5;
      }
    },
    [recordTwist, recordFlairTwist, recordFlairPoint],
  );

  // ---- useFrame: read ECS state + advance fill level ----
  useFrame(({clock}, delta) => {
    if (!visible) return;

    clockRef.current = clock.getElapsedTime();

    const phase = gamePhaseRef.current;

    // Auto-transition from fill to stuff phase (stuffer starts immediately)
    if (phase === 'fill') {
      setGamePhase('stuff');
      gamePhaseRef.current = 'stuff';
      return;
    }

    // --- Read ECS crank state ---
    const crankEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'crank-handle');
    const discEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'plunger-disc');

    if (crankEntity?.crank && discEntity?.fillDriven && phase === 'stuff') {
      const velocity = Math.abs(crankEntity.crank.angularVelocity);
      isCrankingRef.current = velocity > VELOCITY_THRESHOLD;

      // Advance fill level based on crank velocity
      if (velocity > VELOCITY_THRESHOLD) {
        const newLevel = Math.min(1, fillLevelRef.current + velocity * FILL_PER_VELOCITY * delta);
        fillLevelRef.current = newLevel;
        discEntity.fillDriven.fillLevel = newLevel;
      }

      // Check for completion
      if (fillLevelRef.current >= 1.0 && phase === 'stuff') {
        setGamePhase('done');
        gamePhaseRef.current = 'done';
        recordFormChoice();
        onStuffComplete?.({
          twistPoints: twistPointsRef.current,
          flairPoints: flairPointsRef.current,
        });
      }
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
      <StufferCasing
        fillLevel={fillLevelRef.current}
        pressureLevel={fillLevelRef.current}
        blendColor={blendColor}
      />

      {/* Sausage body (skinned mesh) */}
      <SausageLinksBody
        extrusionProgress={fillLevelRef.current}
        twistPositions={twistPointsRef.current}
        blendColor={blendColor}
      />

      {/* Twist hitbox -- invisible mesh along the sausage extrusion path */}
      <mesh
        position={[NOZZLE_TIP[0], NOZZLE_TIP[1], NOZZLE_TIP[2] + SAUSAGE_LENGTH / 2]}
        onClick={handleTwistTap}
        visible={false}
      >
        <boxGeometry args={[SAUSAGE_RADIUS * 4, SAUSAGE_RADIUS * 4, SAUSAGE_LENGTH]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Twist flash effects */}
      {twistFlashesRef.current.map((flash, i) => (
        <TwistFlash
          key={`twist-flash-${i}-${flash.startTime}`}
          position={flash.position as [number, number, number]}
          startTime={flash.startTime}
        />
      ))}
    </group>
  );
};
