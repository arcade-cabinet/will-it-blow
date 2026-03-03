/**
 * @module GrinderOrchestrator
 * ECS-driven GAME DRIVER for the grinder station.
 *
 * Spawns grinder machine entities from GRINDER_ARCHETYPE on mount,
 * despawns on unmount. Uses MachineEntitiesRenderer for all ECS entity
 * rendering with automatic input event wiring (toggle, plunger).
 *
 * This orchestrator OWNS the game loop — phases, scoring, speed zone
 * detection, strikes, timer countdown, and completion. The 2D HUD
 * only reads from the store; it never drives game logic.
 *
 * ECS systems handle:
 * - VibrationSystem: housing vibration when powered
 * - RotationSystem: faceplate spin when powered
 * - ToggleSystem: switch on/off processing
 * - PlungerSystem: drag-to-displacement conversion + spring-back
 * - InputContractSystem: wiring switch -> vibration/rotation/power
 */

import {useFrame} from '@react-three/fiber';
import {damp3} from 'maath/easing';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {config} from '../../config';
import type {GrindingVariant} from '../../config/types';
import {audioEngine} from '../../engine/AudioEngine';
import {pickVariant} from '../../engine/ChallengeRegistry';
import {INGREDIENTS} from '../../engine/Ingredients';
import {createMeatMaterial} from '../../engine/MeatTexture';
import {fireHaptic} from '../../input/HapticService';
import {useGameStore} from '../../store/gameStore';
import {buildMachineArchetype} from '../archetypes/buildMachineArchetype';
import {despawnMachine, spawnMachine} from '../archetypes/spawnMachine';
import {MachineEntitiesRenderer} from '../renderers/ECSScene';
import type {Entity} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrchestratorPhase = 'idle' | 'dialogue' | 'active' | 'success' | 'complete';

interface GrinderOrchestratorProps {
  position: [number, number, number];
  visible: boolean;
}

interface ChunkData {
  id: number;
  targetPos: THREE.Vector3;
}

interface ParticleData {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
}

// ---------------------------------------------------------------------------
// Constants (from config)
// ---------------------------------------------------------------------------

const {
  maxParticles: MAX_G_PARTS,
  emaAlpha: EMA_ALPHA,
  slowTimerMultiplier: SLOW_TIMER_MULTIPLIER,
  scorePenaltyPerStrike: SCORE_PENALTY_PER_STRIKE,
  dialogueDurationMs: DIALOGUE_DURATION_MS,
  successDelayMs: SUCCESS_DELAY_MS,
  chunkCount,
  chunkBowlAngleDivisor,
  chunkBowlRadiusBase,
  chunkBowlRadiusStep,
  particleGravity: PARTICLE_GRAVITY,
  velocityDecay: VELOCITY_DECAY,
  hapticProgressInterval: HAPTIC_PROGRESS_INTERVAL,
  hopperChunkCount: HOPPER_CHUNK_COUNT,
  hopperTopY: HOPPER_TOP_Y,
  hopperBottomY: HOPPER_BOTTOM_Y,
  hopperSpreadX: HOPPER_SPREAD_X,
  hopperSpreadZ: HOPPER_SPREAD_Z,
  hopperChunkScale: HOPPER_CHUNK_SCALE,
} = config.gameplay.grinding;

const CHUNK_BOWL_OFFSETS = Array.from({length: chunkCount}, (_, i) => {
  const angle = (i / chunkBowlAngleDivisor) * Math.PI * 6;
  const r = chunkBowlRadiusBase + (i % 5) * chunkBowlRadiusStep;
  return {
    x: Math.cos(angle) * r,
    yExtra: (i % 3) * 0.4,
    z: Math.sin(angle) * r,
  };
});

function makeParticleGeo() {
  return new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6).rotateX(Math.PI / 2);
}

// ---------------------------------------------------------------------------
// GrinderOrchestrator
// ---------------------------------------------------------------------------

export const GrinderOrchestrator = ({position, visible}: GrinderOrchestratorProps) => {
  // ---- ECS entity lifecycle ----
  const entitiesRef = useRef<Entity[]>([]);

  useEffect(() => {
    const entities = spawnMachine(buildMachineArchetype(config.machines.grinder));
    entitiesRef.current = entities;
    return () => {
      despawnMachine(entities);
      entitiesRef.current = [];
    };
  }, []);

  // ---- Store selectors ----
  const challengeProgress = useGameStore(s => s.challengeProgress);
  const setChallengeProgress = useGameStore(s => s.setChallengeProgress);
  const setChallengeTimeRemaining = useGameStore(s => s.setChallengeTimeRemaining);
  const setChallengeSpeedZone = useGameStore(s => s.setChallengeSpeedZone);
  const setChallengePhase = useGameStore(s => s.setChallengePhase);
  const addStrike = useGameStore(s => s.addStrike);
  const completeChallenge = useGameStore(s => s.completeChallenge);
  const setMrSausageReaction = useGameStore(s => s.setMrSausageReaction);
  const variantSeed = useGameStore(s => s.variantSeed);
  const challengeTriggered = useGameStore(s => s.challengeTriggered);
  const gameStatus = useGameStore(s => s.gameStatus);
  const strikes = useGameStore(s => s.strikes);

  // ---- Refs for game loop (avoid stale closures) ----
  const phaseRef = useRef<OrchestratorPhase>('idle');
  const variantRef = useRef<GrindingVariant | null>(null);
  const progressRef = useRef(0);
  const timerRef = useRef(0);
  const smoothedVelocityRef = useRef(0);
  const splatCooldownRef = useRef(false);
  const strikesRef = useRef(strikes);
  const lastBeepSecondRef = useRef(-1);
  const dialogueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  // Keep strikes ref in sync
  strikesRef.current = strikes;

  // Ref for store selector read inside useFrame (avoid stale closure)
  const challengeProgressRef = useRef(challengeProgress);
  challengeProgressRef.current = challengeProgress;

  // ---- Variant selection on mount when visible ----
  useEffect(() => {
    if (!visible || !challengeTriggered) return;
    const v = pickVariant('grinding', variantSeed) as GrindingVariant;
    variantRef.current = v;
    timerRef.current = v.timerSeconds;
    progressRef.current = 0;
    smoothedVelocityRef.current = 0;
    completedRef.current = false;
    lastBeepSecondRef.current = -1;

    // Transition to dialogue phase
    phaseRef.current = 'dialogue';
    setChallengePhase('dialogue');

    // After dialogue timeout, transition to active
    dialogueTimerRef.current = setTimeout(() => {
      if (phaseRef.current === 'dialogue') {
        phaseRef.current = 'active';
        setChallengePhase('active');
        audioEngine.startGrinder();
        audioEngine.playPour();
      }
    }, DIALOGUE_DURATION_MS);

    return () => {
      if (dialogueTimerRef.current) clearTimeout(dialogueTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      audioEngine.stopGrinder();
    };
  }, [visible, challengeTriggered, variantSeed, setChallengePhase]);

  // ---- Watch for defeat ----
  useEffect(() => {
    if (gameStatus === 'defeat' && phaseRef.current === 'active') {
      phaseRef.current = 'complete';
      setChallengePhase('complete');
      audioEngine.stopGrinder();
    }
  }, [gameStatus, setChallengePhase]);

  // ---- chunk data (decorative only) ----
  const chunks = useMemo<ChunkData[]>(
    () =>
      Array.from({length: chunkCount}, (_, i) => ({
        id: i,
        targetPos: new THREE.Vector3(
          CHUNK_BOWL_OFFSETS[i].x,
          CHUNK_BOWL_OFFSETS[i].yExtra,
          CHUNK_BOWL_OFFSETS[i].z,
        ),
      })),
    [],
  );

  // ---- mesh refs ----
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);
  const chunkRefs = useRef<(THREE.Mesh | null)[]>(Array.from({length: chunkCount}, () => null));
  const prevProgressRef = useRef(0);
  const hapticAccumRef = useRef(0);

  // Particle data
  const particleDataRef = useRef<ParticleData[]>(
    Array.from({length: MAX_G_PARTS}, () => ({
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(),
    })),
  );
  const dummyRef = useRef(new THREE.Object3D());

  // ---- materials ----
  const meatMat = useMemo(() => createMeatMaterial(), []);

  // ---- ingredient-based chunk colors ----
  const bowlContents = useGameStore(s => s.bowlContents);
  const chunkColors = useMemo(() => {
    if (bowlContents.length === 0) return null;
    const colors: string[] = [];
    for (const name of bowlContents) {
      const ing = INGREDIENTS.find(i => i.name === name);
      if (ing) colors.push(ing.decomposition.chunkColor);
    }
    return colors.length > 0 ? colors : null;
  }, [bowlContents]);

  const chunkMats = useMemo(() => {
    if (!chunkColors) return null;
    return Array.from({length: chunkCount}, (_, i) => {
      const hex = chunkColors[i % chunkColors.length];
      return new THREE.MeshStandardMaterial({color: hex, roughness: 0.7, metalness: 0.1});
    });
  }, [chunkColors]);

  // ---- hopper chunk layout (ingredient chunks inside tray that descend with progress) ----
  const hopperInitialPositions = useMemo(() => {
    return Array.from({length: HOPPER_CHUNK_COUNT}, (_, i) => {
      const angle = (i / HOPPER_CHUNK_COUNT) * Math.PI * 2;
      const r = 0.4 + (i % 3) * 0.3;
      return new THREE.Vector3(
        Math.cos(angle) * r * HOPPER_SPREAD_X * 0.5,
        HOPPER_TOP_Y - (i % 4) * 0.15,
        0.5 + Math.sin(angle) * r * HOPPER_SPREAD_Z * 0.5,
      );
    });
  }, []);

  const hopperRefs = useRef<(THREE.Mesh | null)[]>(
    Array.from({length: HOPPER_CHUNK_COUNT}, () => null),
  );

  const hopperMats = useMemo(() => {
    if (!chunkColors) return null;
    return Array.from({length: HOPPER_CHUNK_COUNT}, (_, i) => {
      const hex = chunkColors[i % chunkColors.length];
      return new THREE.MeshStandardMaterial({color: hex, roughness: 0.8, metalness: 0.05});
    });
  }, [chunkColors]);

  // ---- geometry ----
  const chunkGeo = useMemo(() => new THREE.DodecahedronGeometry(0.5, 1), []);
  const hopperChunkGeo = useMemo(() => new THREE.DodecahedronGeometry(HOPPER_CHUNK_SCALE, 1), []);
  const particleGeo = useMemo(() => makeParticleGeo(), []);

  // ---- Enable/disable ECS input primitives + haptic feedback ----
  useEffect(() => {
    if (visible) fireHaptic('toggle_click');
    for (const entity of entitiesRef.current) {
      if (entity.toggle) {
        entity.toggle.enabled = visible;
        entity.toggle.isOn = visible;
      }
      if (entity.plunger) {
        entity.plunger.enabled = visible;
      }
    }
  }, [visible]);

  // ---- useFrame: GAME LOOP + particle physics + chunk damp + visuals ----
  useFrame((_, delta) => {
    if (!visible) return;
    const dt = Math.min(delta, 0.05); // Cap delta to avoid huge jumps

    // --- Read ECS state ---
    const switchEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'switch-body');
    const isGrinderOn = switchEntity?.toggle?.isOn ?? false;

    // --- Read crank angular velocity from ECS ---
    const crankEntity = entitiesRef.current.find(e => e.crank);
    const velocity = crankEntity?.crank?.angularVelocity ?? 0;

    // === GAME LOOP (only when phase is 'active' and grinder is on) ===
    if (phaseRef.current === 'active' && variantRef.current && !completedRef.current) {
      const v = variantRef.current;

      // EMA smoothing on velocity
      smoothedVelocityRef.current =
        EMA_ALPHA * velocity + (1 - EMA_ALPHA) * smoothedVelocityRef.current;
      const smoothedVelocity = smoothedVelocityRef.current;

      // Speed zone detection
      const minSpeed = v.targetSpeed - v.tolerance;
      const maxSpeed = v.targetSpeed + v.tolerance;
      let zone: 'slow' | 'good' | 'fast';
      if (smoothedVelocity > maxSpeed) {
        zone = 'fast';
      } else if (smoothedVelocity < minSpeed) {
        zone = 'slow';
      } else {
        zone = 'good';
      }
      setChallengeSpeedZone(zone);

      // Only process grinding when switch is ON
      if (isGrinderOn) {
        // Progress tracking (only in 'good' zone)
        if (zone === 'good') {
          const progressDelta = dt * (smoothedVelocity / v.targetSpeed) * 8;
          progressRef.current = Math.min(100, progressRef.current + progressDelta);
          setChallengeProgress(progressRef.current);

          // Check for success
          if (progressRef.current >= v.targetProgress) {
            phaseRef.current = 'success';
            setChallengePhase('success');
            setMrSausageReaction('excitement');
            audioEngine.stopGrinder();

            // After success delay, compute score and complete
            successTimerRef.current = setTimeout(() => {
              if (completedRef.current) return;
              completedRef.current = true;
              phaseRef.current = 'complete';
              setChallengePhase('complete');
              const score = Math.max(
                0,
                Math.round(100 - strikesRef.current * SCORE_PENALTY_PER_STRIKE),
              );
              completeChallenge(score);
            }, SUCCESS_DELAY_MS);
            return;
          }

          setMrSausageReaction('nod');
        }

        // Strike on 'fast' zone
        if (zone === 'fast' && !splatCooldownRef.current) {
          splatCooldownRef.current = true;
          addStrike();
          setMrSausageReaction('flinch');
          setTimeout(() => {
            splatCooldownRef.current = false;
          }, 800);
        }

        // Mr. Sausage reaction for 'slow' zone
        if (zone === 'slow') {
          setMrSausageReaction('nervous');
        }
      }

      // Timer countdown (runs regardless of switch state, faster when slow)
      const timerDelta = zone === 'slow' ? dt * SLOW_TIMER_MULTIPLIER : dt;
      timerRef.current = Math.max(0, timerRef.current - timerDelta);
      setChallengeTimeRemaining(timerRef.current);

      // Countdown beep for last 5 seconds
      const currentSecond = Math.ceil(timerRef.current);
      if (currentSecond <= 5 && currentSecond > 0 && currentSecond !== lastBeepSecondRef.current) {
        lastBeepSecondRef.current = currentSecond;
        audioEngine.playCountdownBeep(currentSecond === 1);
      }

      // Timer expired — compute score and complete
      if (timerRef.current <= 0 && !completedRef.current) {
        completedRef.current = true;
        phaseRef.current = 'complete';
        setChallengePhase('complete');
        audioEngine.stopGrinder();
        const score = Math.max(
          0,
          Math.round(
            (progressRef.current / 100) * 100 - strikesRef.current * SCORE_PENALTY_PER_STRIKE,
          ),
        );
        completeChallenge(score);
      }

      // Velocity decay when not actively cranking
      smoothedVelocityRef.current *= VELOCITY_DECAY;
    }

    // --- Progress-driven particle spawning (visual) ---
    const progress = challengeProgressRef.current / 100; // 0-1
    const progressDelta = progress - prevProgressRef.current;

    if (progressDelta > 0) {
      // Haptic feedback throttled to every 5% progress (0.05 in 0-1 scale)
      hapticAccumRef.current += progressDelta;
      if (hapticAccumRef.current >= HAPTIC_PROGRESS_INTERVAL) {
        hapticAccumRef.current = 0;
        fireHaptic('rotary_feedback');
      }
      // Spawn particles proportional to progress increase
      const pData = particleDataRef.current;
      const numToSpawn = Math.min(3, Math.ceil(progressDelta * 30));
      for (let i = 0; i < numToSpawn; i++) {
        const p = pData.find(d => !d.active);
        if (p) {
          p.active = true;
          const ang = Math.random() * Math.PI * 2;
          const r = Math.random() * 0.8;
          p.pos.set(r * Math.cos(ang), 2.5, 2.1);
          p.vel.set((Math.random() - 0.5) * 1, -2 - Math.random() * 2, 1 + Math.random() * 2);
          p.rot.set(0, 0, 0);
        }
      }
    }
    prevProgressRef.current = progress;

    // --- Switch notch visual animation ---
    const notchEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'switch-notch');
    if (notchEntity?.three) {
      const targetZ = isGrinderOn ? Math.PI / 4 : 0;
      notchEntity.three.rotation.z +=
        (targetZ - notchEntity.three.rotation.z) * Math.min(1, dt * 10);
    }

    // --- Chunk position damp (decorative) ---
    for (let i = 0; i < chunkCount; i++) {
      const mesh = chunkRefs.current[i];
      if (!mesh) continue;
      const chunk = chunks[i];
      mesh.visible = true;
      damp3(mesh.position, chunk.targetPos.toArray(), 0.12, dt);
    }

    // --- Hopper chunk descent (ingredient chunks in tray descend with progress) ---
    for (let i = 0; i < HOPPER_CHUNK_COUNT; i++) {
      const mesh = hopperRefs.current[i];
      if (!mesh) continue;

      // Each chunk disappears at a staggered progress threshold
      const disappearAt = (i + 1) / HOPPER_CHUNK_COUNT;
      if (progress >= disappearAt) {
        mesh.visible = false;
        continue;
      }

      mesh.visible = phaseRef.current === 'active' || phaseRef.current === 'success';
      // Descend Y from initial to hopperBottomY proportional to progress
      const initial = hopperInitialPositions[i];
      const descent = progress * (HOPPER_TOP_Y - HOPPER_BOTTOM_Y);
      mesh.position.set(initial.x, initial.y - descent, initial.z);
    }

    // --- Particle physics ---
    const pData = particleDataRef.current;
    const pMesh = particleMeshRef.current;
    const dummy = dummyRef.current;
    let needsUpdate = false;

    if (pMesh) {
      const groundY = 0.5 + progress * 1.5;
      for (let i = 0; i < MAX_G_PARTS; i++) {
        const p = pData[i];
        if (p.active) {
          p.vel.y -= PARTICLE_GRAVITY * dt;
          p.pos.addScaledVector(p.vel, dt);
          p.rot.x += dt;
          if (p.pos.y < groundY) {
            p.active = false;
          }
          dummy.position.copy(p.pos);
          dummy.rotation.copy(p.rot);
        } else {
          dummy.position.set(0, 999, 0);
        }
        dummy.updateMatrix();
        pMesh.setMatrixAt(i, dummy.matrix);
        needsUpdate = true;
      }
      if (needsUpdate) pMesh.instanceMatrix.needsUpdate = true;
    }
  });

  if (!visible) return null;

  return (
    <group position={position}>
      {/* ECS machine entities — rendered with automatic input event wiring */}
      <MachineEntitiesRenderer entities={entitiesRef.current} />

      {/* Meat chunks — decorative, no click interaction */}
      <group position={[-5, 0, 2]}>
        {chunks.map((chunk, i) => (
          <mesh
            key={chunk.id}
            ref={el => {
              chunkRefs.current[i] = el;
            }}
            position={chunk.targetPos.toArray()}
            castShadow
          >
            <primitive object={chunkGeo} attach="geometry" />
            <primitive object={chunkMats ? chunkMats[i] : meatMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Hopper chunks — ingredient pieces inside the tray that descend with progress */}
      <group>
        {hopperInitialPositions.map((pos, i) => (
          <mesh
            key={`hopper-${i}`}
            ref={el => {
              hopperRefs.current[i] = el;
            }}
            position={pos.toArray()}
            visible={false}
          >
            <primitive object={hopperChunkGeo} attach="geometry" />
            <primitive object={hopperMats ? hopperMats[i] : meatMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Ground meat particles */}
      <instancedMesh ref={particleMeshRef} args={[particleGeo, meatMat, MAX_G_PARTS]}>
        <primitive object={particleGeo} attach="geometry" />
        <primitive object={meatMat} attach="material" />
      </instancedMesh>
    </group>
  );
};
