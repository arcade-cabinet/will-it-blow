/**
 * @module StufferOrchestrator
 * ECS-driven GAME DRIVER for the stuffer station.
 *
 * Owns the full game loop: phase state machine, fill/pressure physics,
 * burst detection, timer countdown, scoring, and completion.
 * Reads crank input from ECS entities and writes challenge state to Zustand
 * so the 2D HUD can display gauges/timer/status.
 *
 * Spawns stuffer machine entities from STUFFER_ARCHETYPE on mount,
 * despawns on unmount. Uses MachineEntitiesRenderer for all ECS entity
 * rendering with automatic input event wiring (crank).
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
import {config} from '../../config';
import type {StuffingVariant} from '../../config/types';
import {audioEngine} from '../../engine/AudioEngine';
import {pickVariant} from '../../engine/ChallengeRegistry';
import {fireHaptic} from '../../input/HapticService';
import {useGameStore} from '../../store/gameStore';
import {buildMachineArchetype} from '../archetypes/buildMachineArchetype';
import {despawnMachine, spawnMachine} from '../archetypes/spawnMachine';
import {MachineEntitiesRenderer} from '../renderers/ECSScene';
import type {Entity} from '../types';

// ---------------------------------------------------------------------------
// Constants (from config)
// ---------------------------------------------------------------------------

const {
  numBones: NUM_BONES,
  sausageLength: SAUSAGE_LENGTH,
  sausageRadius: SAUSAGE_RADIUS,
  pinchScale: PINCH_SCALE,
  segmentsPerBone: SEGMENTS_PER_BONE,
  nozzleTip: NOZZLE_TIP,
  scorePenaltyPerBurst: SCORE_PENALTY_PER_BURST,
  fillDropOnBurst: FILL_DROP_ON_BURST,
  completeDelayMs: COMPLETE_DELAY_MS,
  crankDragThreshold: CRANK_DRAG_THRESHOLD,
  burstCooldownMs: BURST_COOLDOWN_MS,
} = config.gameplay.stuffing;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrchestratorPhase = 'idle' | 'dialogue' | 'active' | 'success' | 'complete';

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

  // Refs to avoid stale closures in useFrame
  const extrusionRef = useRef(extrusionProgress);
  extrusionRef.current = extrusionProgress;
  const twistRef = useRef(twistPositions);
  twistRef.current = twistPositions;

  const {geometry, skeleton, rootBone, bones} = useMemo(
    () => buildSausageGeometry(NUM_BONES, SAUSAGE_LENGTH, SAUSAGE_RADIUS),
    [],
  );

  useFrame(() => {
    if (!meshRef.current) return;

    const visibleBones = Math.floor(extrusionRef.current * NUM_BONES);

    for (let i = 1; i <= NUM_BONES; i++) {
      const bone = bones[i];
      if (i <= visibleBones) {
        const boneNormalized = i / NUM_BONES;
        let isPinched = false;
        for (const tp of twistRef.current) {
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
    const entities = spawnMachine(buildMachineArchetype(config.machines.stuffer));
    entitiesRef.current = entities;
    return () => {
      despawnMachine(entities);
      entitiesRef.current = [];
    };
  }, []);

  // ---- Store selectors ----
  const blendColor = useGameStore(s => s.blendColor);
  const twistPoints = useGameStore(s => s.playerDecisions.twistPoints);
  const variantSeed = useGameStore(s => s.variantSeed);
  const challengeTriggered = useGameStore(s => s.challengeTriggered);
  const gameStatus = useGameStore(s => s.gameStatus);

  // ---- Store actions ----
  const setChallengeProgress = useGameStore(s => s.setChallengeProgress);
  const setChallengePressure = useGameStore(s => s.setChallengePressure);
  const setChallengeTimeRemaining = useGameStore(s => s.setChallengeTimeRemaining);
  const setChallengePhase = useGameStore(s => s.setChallengePhase);
  const addStrike = useGameStore(s => s.addStrike);
  const completeChallenge = useGameStore(s => s.completeChallenge);
  const setMrSausageReaction = useGameStore(s => s.setMrSausageReaction);

  // ---- Phase state machine ----
  const phaseRef = useRef<OrchestratorPhase>('idle');

  // ---- Game loop refs (avoid stale closures in useFrame) ----
  const fillRef = useRef(0);
  const pressureRef = useRef(0);
  const timerRef = useRef(0);
  const burstCountRef = useRef(0);
  const burstCooldownRef = useRef(false);
  const lastBeepSecondRef = useRef(-1);
  const variantRef = useRef<StuffingVariant | null>(null);
  const squelchThrottleRef = useRef(0);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Variant selection on activation ----
  useEffect(() => {
    if (visible && challengeTriggered && phaseRef.current === 'idle') {
      const v = pickVariant('stuffing', variantSeed) as StuffingVariant;
      variantRef.current = v;
      fillRef.current = 0;
      pressureRef.current = 0;
      timerRef.current = v.timerSeconds;
      burstCountRef.current = 0;
      burstCooldownRef.current = false;
      lastBeepSecondRef.current = -1;
      squelchThrottleRef.current = 0;

      phaseRef.current = 'dialogue';
      setChallengePhase('dialogue');
      setChallengeProgress(0);
      setChallengePressure(0);
      setChallengeTimeRemaining(v.timerSeconds);
    }
  }, [
    visible,
    challengeTriggered,
    setChallengePhase,
    setChallengeProgress,
    setChallengePressure,
    setChallengeTimeRemaining,
    variantSeed,
  ]);

  // ---- Dialogue -> Active transition ----
  // The HUD fires setChallengePhase('active') when dialogue completes.
  // We watch for that transition to start the game loop.
  const storeChallengePhase = useGameStore(s => s.challengePhase);
  useEffect(() => {
    if (storeChallengePhase === 'active' && phaseRef.current === 'dialogue') {
      phaseRef.current = 'active';
      audioEngine.playPour();
      setMrSausageReaction('idle');
    }
  }, [storeChallengePhase, setMrSausageReaction]);

  // ---- Watch for defeat ----
  useEffect(() => {
    if (gameStatus === 'defeat' && phaseRef.current !== 'complete') {
      phaseRef.current = 'complete';
      setChallengePhase('complete');
      audioEngine.stopPressure();
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    }
  }, [gameStatus, setChallengePhase]);

  // ---- Audio + timer cleanup on unmount ----
  useEffect(() => {
    return () => {
      audioEngine.stopPressure();
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

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

  // ---- useFrame: game loop + ECS sync ----
  useFrame((_, delta) => {
    if (!visible) return;

    const v = variantRef.current;
    const phase = phaseRef.current;

    // Always sync fillDriven entity for plunger disc position
    const fillLevel = fillRef.current / 100;
    const discEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'plunger-disc');
    if (discEntity?.fillDriven) {
      discEntity.fillDriven.fillLevel = fillLevel;
    }

    // Only run game logic when active
    if (phase !== 'active' || !v) return;

    // Cap delta to prevent spiral-of-death on tab-away
    const dt = Math.min(delta, 0.1);

    // ---- Read crank input from ECS ----
    const crankEntity = entitiesRef.current.find(e => e.crank);
    const isDragging = (crankEntity?.crank?.angularVelocity ?? 0) > CRANK_DRAG_THRESHOLD;

    // ---- Fill + Pressure physics ----
    if (isDragging) {
      fillRef.current = Math.min(100, fillRef.current + v.fillRate * dt);
      pressureRef.current = Math.min(100, pressureRef.current + v.pressureRate * dt);

      // Throttled squelch audio
      squelchThrottleRef.current -= dt;
      if (squelchThrottleRef.current <= 0) {
        audioEngine.playStuffingSquelch();
        squelchThrottleRef.current = 0.4;
      }
    } else {
      pressureRef.current = Math.max(0, pressureRef.current - v.pressureDecay * dt);
    }

    // ---- Burst detection ----
    if (pressureRef.current > v.burstThreshold && !burstCooldownRef.current) {
      burstCooldownRef.current = true;
      addStrike();
      burstCountRef.current += 1;
      pressureRef.current = 0;
      fillRef.current = Math.max(0, fillRef.current - FILL_DROP_ON_BURST);
      setMrSausageReaction('flinch');
      audioEngine.playBurst();
      setTimeout(() => {
        burstCooldownRef.current = false;
      }, BURST_COOLDOWN_MS);
    }

    // ---- Pressure audio ----
    if (pressureRef.current > 10) {
      audioEngine.updatePressure(pressureRef.current);
    } else {
      audioEngine.stopPressure();
    }

    // ---- Store updates ----
    setChallengeProgress(fillRef.current);
    setChallengePressure(pressureRef.current);
    setChallengeTimeRemaining(timerRef.current);

    // ---- Mr. Sausage reactions ----
    if (!burstCooldownRef.current) {
      if (isDragging && pressureRef.current > 70) {
        setMrSausageReaction('nervous');
      } else if (isDragging) {
        setMrSausageReaction('nod');
      } else {
        setMrSausageReaction('idle');
      }
    }

    // ---- Fill complete -> success ----
    if (fillRef.current >= 100) {
      phaseRef.current = 'success';
      setChallengePhase('success');
      setMrSausageReaction('excitement');
      audioEngine.stopPressure();

      // Score: 100 minus burst penalties
      const score = Math.max(0, Math.round(100 - burstCountRef.current * SCORE_PENALTY_PER_BURST));
      successTimerRef.current = setTimeout(() => {
        phaseRef.current = 'complete';
        setChallengePhase('complete');
        completeChallenge(score);
      }, COMPLETE_DELAY_MS);
      return;
    }

    // ---- Timer countdown ----
    timerRef.current = Math.max(0, timerRef.current - dt);

    // Countdown beep for last 5 seconds
    const currentSecond = Math.ceil(timerRef.current);
    if (currentSecond <= 5 && currentSecond > 0 && currentSecond !== lastBeepSecondRef.current) {
      lastBeepSecondRef.current = currentSecond;
      audioEngine.playCountdownBeep(currentSecond === 1);
    }

    // Timer expired -> partial score based on fill level
    if (timerRef.current <= 0) {
      phaseRef.current = 'complete';
      setChallengePhase('complete');
      audioEngine.stopPressure();
      const score = Math.max(
        0,
        Math.round((fillRef.current / 100) * 100 - burstCountRef.current * SCORE_PENALTY_PER_BURST),
      );
      completeChallenge(score);
    }
  });

  if (!visible) return null;

  // Derive display values from refs (updated each frame via store)
  const fillLevel = fillRef.current / 100;

  return (
    <group position={position}>
      {/* ECS machine entities -- rendered with automatic input event wiring */}
      <MachineEntitiesRenderer entities={entitiesRef.current} />

      {/* Water bowl: casing soaking bowl, offset to left/front */}
      <WaterBowl position={config.gameplay.stuffing.visual.waterBowlPosition} />

      {/* Casing tube: inflates based on fill/pressure, shifts color */}
      <StufferCasing
        fillLevel={fillLevel}
        pressureLevel={pressureRef.current / 100}
        blendColor={blendColor}
      />

      {/* Sausage body (skinned mesh) */}
      <SausageLinksBody
        extrusionProgress={fillLevel}
        twistPositions={twistPoints}
        blendColor={blendColor}
      />
    </group>
  );
};
