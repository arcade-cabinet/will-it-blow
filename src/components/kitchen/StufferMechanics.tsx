/**
 * @module StufferMechanics
 * 3D crank-driven sausage extrusion with tap-to-twist link creation.
 *
 * This component renders:
 * - A rotary crank handle that the player drags to extrude sausage
 * - A SkinnedMesh sausage body that extends from the nozzle as stuffLevel rises
 * - Tap-to-twist interaction: tapping the sausage body creates a pinch/twist,
 *   visually constricting a bone and recording the position in the store
 * - Flair detection: twisting while simultaneously cranking awards bonus points
 *
 * Phase state machine: 'idle' -> 'drag' -> 'crank' -> 'done'
 * - idle: waiting for interaction
 * - drag: player is dragging the crank
 * - crank: actively cranking (stuffLevel increasing)
 * - done: extrusion complete
 *
 * @see StuffingChallenge - the 2D overlay that drives pressure/fill via store
 * @see StufferStation - the 3D stuffer body with plunger/casing/burst visuals
 */

import {useFrame} from '@react-three/fiber';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {useGameStore} from '../../store/gameStore';

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

/** Crank rotation speed multiplier: radians of crank per pointer-drag pixel. */
const CRANK_SENSITIVITY = 0.008;

/** How much stuffLevel (0-1) increases per radian of crank rotation. */
const STUFF_PER_RADIAN = 0.04;

/** Nozzle tip position — sausage extrudes from here along +Z. */
const NOZZLE_TIP: [number, number, number] = [0, 0, 0];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StufferPhase = 'idle' | 'drag' | 'crank' | 'done';

export interface StufferMechanicsProps {
  /** World position offset for this component group. */
  position?: [number, number, number];
  /** Called when extrusion is fully complete (stuffLevel reached 1). */
  onStuffComplete?: () => void;
  /** Blend color hex from the store, used to tint the sausage. */
  blendColor?: string;
}

// ---------------------------------------------------------------------------
// Geometry builder — procedural sausage cylinder with skeleton
// ---------------------------------------------------------------------------

interface SausageGeometryResult {
  geometry: THREE.CylinderGeometry;
  skeleton: THREE.Skeleton;
  rootBone: THREE.Bone;
  bones: THREE.Bone[];
}

/**
 * Builds a skinned cylinder geometry with bones along its length.
 * The cylinder is oriented along the Y axis (Three.js convention for
 * CylinderGeometry) and will be rotated to align with Z in the scene.
 */
function buildSausageGeometry(
  numBones: number,
  length: number,
  radius: number,
): SausageGeometryResult {
  const segmentHeight = length / numBones;
  const totalSegments = numBones * SEGMENTS_PER_BONE;

  const geometry = new THREE.CylinderGeometry(radius, radius, length, 8, totalSegments);

  // Build bone chain
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

  // Assign skin weights — each vertex influenced by nearest bone
  const posAttr = geometry.getAttribute('position');
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];

  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i) + length / 2; // shift to 0..length range
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
// TwistFlash — brief scale-pulse feedback at a twist point
// ---------------------------------------------------------------------------

interface TwistFlashProps {
  position: [number, number, number];
  startTime: number;
}

function TwistFlash({position, startTime}: TwistFlashProps) {
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
// SausageLinksBody — skinned mesh sausage with twist pinches
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

    // Show/hide bones based on extrusion progress
    const visibleBones = Math.floor(extrusionProgress * NUM_BONES);

    for (let i = 1; i <= NUM_BONES; i++) {
      const bone = bones[i];
      if (i <= visibleBones) {
        // Check if this bone is near a twist position
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
        // Hide bones beyond current extrusion by collapsing them
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
// StufferMechanics — main component
// ---------------------------------------------------------------------------

export function StufferMechanics({
  position = [0, 0, 0],
  onStuffComplete,
  blendColor: blendColorProp,
}: StufferMechanicsProps) {
  // ---- Store ----
  const storeBlendColor = useGameStore(s => s.blendColor);
  const recordTwist = useGameStore(s => s.recordTwist);
  const recordFlairTwist = useGameStore(s => s.recordFlairTwist);
  const recordFormChoice = useGameStore(s => s.recordFormChoice);
  const recordFlairPoint = useGameStore(s => s.recordFlairPoint);

  const blendColor = blendColorProp ?? storeBlendColor;

  // ---- Phase state ----
  const phaseRef = useRef<StufferPhase>('idle');
  const stuffLevelRef = useRef(0);
  const isCrankingRef = useRef(false);
  const crankAngleRef = useRef(0);
  const lastPointerYRef = useRef(0);

  // ---- Twist tracking (local for visuals) ----
  const twistPositionsRef = useRef<number[]>([]);
  const twistFlashesRef = useRef<TwistFlashProps[]>([]);
  const clockRef = useRef(0);

  // Track flash count for key stability
  const flashCountRef = useRef(0);

  // Sync phase to 'crank' when stuffLevel > 0 and <= 1
  useFrame(({clock}) => {
    clockRef.current = clock.getElapsedTime();
  });

  // ---- Crank pointer handlers ----
  const handleCrankPointerDown = useCallback(
    (e: {stopPropagation: () => void; point?: {y: number}}) => {
      e.stopPropagation();
      if (phaseRef.current === 'done') return;
      phaseRef.current = 'drag';
      isCrankingRef.current = true;
      lastPointerYRef.current = e.point?.y ?? 0;
    },
    [],
  );

  const handleCrankPointerMove = useCallback(
    (e: {stopPropagation: () => void; point?: {y: number}}) => {
      if (phaseRef.current !== 'drag' || !isCrankingRef.current) return;
      e.stopPropagation();

      const currentY = e.point?.y ?? 0;
      const delta = (currentY - lastPointerYRef.current) * CRANK_SENSITIVITY * 100;
      lastPointerYRef.current = currentY;

      crankAngleRef.current += Math.abs(delta);
      const newLevel = Math.min(1, stuffLevelRef.current + Math.abs(delta) * STUFF_PER_RADIAN);

      if (newLevel > stuffLevelRef.current) {
        stuffLevelRef.current = newLevel;
        phaseRef.current = 'crank';
      }

      // Check for completion
      if (stuffLevelRef.current >= 1 && phaseRef.current !== 'done') {
        phaseRef.current = 'done';
        recordFormChoice();
        onStuffComplete?.();
      }
    },
    [onStuffComplete, recordFormChoice],
  );

  const handleCrankPointerUp = useCallback(() => {
    isCrankingRef.current = false;
    if (phaseRef.current === 'drag') {
      phaseRef.current = stuffLevelRef.current > 0 ? 'crank' : 'idle';
    }
  }, []);

  // ---- Twist handler (tap on sausage hitbox) ----
  const handleTwistTap = useCallback(
    (e: {stopPropagation: () => void; point?: {z: number}}) => {
      e.stopPropagation();

      // Only allow twists during crank phase
      if (phaseRef.current !== 'crank' && phaseRef.current !== 'drag') return;
      if (stuffLevelRef.current <= 0) return;

      // Calculate normalized position based on where they tapped,
      // or fall back to current stuff level
      let normalizedPos = stuffLevelRef.current;
      if (e.point) {
        // Map the Z coordinate of the tap to a 0-1 position along the sausage
        const localZ = e.point.z - NOZZLE_TIP[2];
        normalizedPos = Math.max(0.05, Math.min(0.95, localZ / SAUSAGE_LENGTH));
      }

      // Record the twist in the store
      recordTwist(normalizedPos);

      // Track locally for visual feedback
      twistPositionsRef.current = [...twistPositionsRef.current, normalizedPos];

      // Add a twist flash
      twistFlashesRef.current = [
        ...twistFlashesRef.current,
        {
          position: [NOZZLE_TIP[0], NOZZLE_TIP[1], NOZZLE_TIP[2] + normalizedPos * SAUSAGE_LENGTH],
          startTime: clockRef.current,
        },
      ];
      flashCountRef.current += 1;

      // Flair: simultaneous crank + twist
      if (isCrankingRef.current) {
        recordFlairTwist();
        recordFlairPoint('simultaneous-crank-twist', 5);
      }
    },
    [recordTwist, recordFlairTwist, recordFlairPoint],
  );

  // ---- Completion side-effect: record form choice ----
  const completedRef = useRef(false);
  useEffect(() => {
    // Guard for double-calls
    return () => {
      completedRef.current = false;
    };
  }, []);

  return (
    <group position={position}>
      {/* Crank handle — draggable sphere */}
      <mesh
        position={[0.4, 0.3, 0]}
        onPointerDown={handleCrankPointerDown}
        onPointerMove={handleCrankPointerMove}
        onPointerUp={handleCrankPointerUp}
        onPointerLeave={handleCrankPointerUp}
      >
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color={0x888888} />
      </mesh>

      {/* Crank arm visual */}
      <mesh position={[0.2, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
        <meshBasicMaterial color={0x666666} />
      </mesh>

      {/* Nozzle tip marker */}
      <mesh position={NOZZLE_TIP}>
        <cylinderGeometry args={[0.05, 0.04, 0.15, 8]} />
        <meshBasicMaterial color={0x555555} />
      </mesh>

      {/* Sausage body (skinned mesh) */}
      <SausageLinksBody
        extrusionProgress={stuffLevelRef.current}
        twistPositions={twistPositionsRef.current}
        blendColor={blendColor}
      />

      {/* Twist hitbox — invisible mesh along the sausage extrusion path.
          Only accepts pointer events (click/tap) during crank phase. */}
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
}
