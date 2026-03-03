/**
 * @module CookingOrchestrator
 * ECS-driven GAME DRIVER for the cooking/stove station.
 *
 * Spawns stove machine entities from STOVE_ARCHETYPE on mount,
 * despawns on unmount. Uses MachineEntitiesRenderer for all ECS entity
 * rendering with automatic input event wiring (dial).
 *
 * This orchestrator OWNS all game logic for the cooking challenge:
 * - Phase state machine (idle -> dialogue -> active -> success -> complete)
 * - Temperature physics driven by ECS dial power level
 * - Hold timer (maintain target zone to succeed)
 * - Overheat detection and strike tracking
 * - Timer countdown with audio cues
 * - Final scoring and challenge completion
 * - Mr. Sausage reaction updates
 * - Cooking audio (sizzle loop + one-shot hits)
 *
 * ECS systems handle:
 * - DialSystem: tap processing for heat setting cycle (off/low/medium/high)
 * - InputContractSystem: wiring dial segment -> powerSource level + active
 */

import {useFrame} from '@react-three/fiber';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {config} from '../../config';
import type {CookingVariant} from '../../config/types';
import {audioEngine} from '../../engine/AudioEngine';
import {pickVariant} from '../../engine/ChallengeRegistry';
import {fireHaptic} from '../../input/HapticService';
import {useGameStore} from '../../store/gameStore';
import {buildMachineArchetype} from '../archetypes/buildMachineArchetype';
import {despawnMachine, spawnMachine} from '../archetypes/spawnMachine';
import {MachineEntitiesRenderer} from '../renderers/ECSScene';
import type {Entity} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeatSetting = 'off' | 'low' | 'medium' | 'high';

interface CookingOrchestratorProps {
  position: [number, number, number];
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Constants (from config)
// ---------------------------------------------------------------------------

const {
  panY: PAN_Y,
  panHeight: PAN_HEIGHT,
  sausageRadius: SAUSAGE_RADIUS,
  sausageHalfLength: SAUSAGE_HALF_LENGTH,
  burnerParams: BURNER_PARAMS_MAP,
  burnThreshold: BURN_THRESHOLD,
  smokeThreshold: SMOKE_THRESHOLD,
  steamCount: STEAM_COUNT,
  smokeCount: SMOKE_COUNT,
  flipDuration: FLIP_DURATION,
  coolingRate: COOLING_RATE,
  roomTemp: ROOM_TEMP,
  scorePenaltyPerOverheat: SCORE_PENALTY_PER_OVERHEAT,
  scoreBonusNoOverheat: SCORE_BONUS_NO_OVERHEAT,
  completeDelaySec: COMPLETE_DELAY_SEC,
  sizzleThrottleMs: SIZZLE_THROTTLE_MS,
  maxFlips: MAX_FLIPS,
  flipFlairPoints: FLIP_FLAIR_POINTS,
  flipHoldTimerPenalty: FLIP_HOLD_TIMER_PENALTY,
} = config.gameplay.cooking;

const COLOR_RAW = config.gameplay.cooking.colorRaw as [number, number, number];
const COLOR_COOKED = config.gameplay.cooking.colorCooked as [number, number, number];
const COLOR_CHARRED = config.gameplay.cooking.colorCharred as [number, number, number];
const COLOR_BURNT = config.gameplay.cooking.colorBurnt as [number, number, number];

/** Orchestrator phase — tracks internal game state progression */
type OrchestratorPhase = 'idle' | 'dialogue' | 'active' | 'success' | 'complete';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const ct = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * ct, a[1] + (b[1] - a[1]) * ct, a[2] + (b[2] - a[2]) * ct];
}

/** Map cook level (0-1+) to sausage RGB color */
export function cookLevelToColor(cookLevel: number): [number, number, number] {
  if (cookLevel <= 0.35) {
    return lerp3(COLOR_RAW, COLOR_COOKED, cookLevel / 0.35);
  }
  if (cookLevel <= 0.85) {
    return lerp3(COLOR_COOKED, COLOR_CHARRED, (cookLevel - 0.35) / 0.5);
  }
  if (cookLevel <= BURN_THRESHOLD) {
    return lerp3(COLOR_CHARRED, COLOR_BURNT, (cookLevel - 0.85) / 0.15);
  }
  return COLOR_BURNT;
}

/** Find the closest key in a map to a given value */
function closestKey(map: Record<string, unknown>, value: number): number {
  const keys = Object.keys(map).map(Number);
  let closest = keys[0];
  let minDist = Math.abs(value - closest);
  for (const k of keys) {
    const dist = Math.abs(value - k);
    if (dist < minDist) {
      closest = k;
      minDist = dist;
    }
  }
  return closest;
}

// ---------------------------------------------------------------------------
// CookingOrchestrator
// ---------------------------------------------------------------------------

export function CookingOrchestrator({position, visible}: CookingOrchestratorProps) {
  // ---- ECS entity lifecycle ----
  const entitiesRef = useRef<Entity[]>([]);

  useEffect(() => {
    const entities = spawnMachine(buildMachineArchetype(config.machines.stove));
    entitiesRef.current = entities;
    return () => {
      despawnMachine(entities);
      entitiesRef.current = [];
    };
  }, []);

  // ---- Store selectors ----
  const challengeProgress = useGameStore(s => s.challengeProgress);
  const challengeHeatLevel = useGameStore(s => s.challengeHeatLevel);
  const variantSeed = useGameStore(s => s.variantSeed);
  const challengeTriggered = useGameStore(s => s.challengeTriggered);
  const gameStatus = useGameStore(s => s.gameStatus);

  // Store actions
  const setChallengeProgress = useGameStore(s => s.setChallengeProgress);
  const setChallengeTemperature = useGameStore(s => s.setChallengeTemperature);
  const setChallengeHeatLevel = useGameStore(s => s.setChallengeHeatLevel);
  const setChallengeTimeRemaining = useGameStore(s => s.setChallengeTimeRemaining);
  const setChallengePhase = useGameStore(s => s.setChallengePhase);
  const addStrike = useGameStore(s => s.addStrike);
  const completeChallenge = useGameStore(s => s.completeChallenge);
  const setMrSausageReaction = useGameStore(s => s.setMrSausageReaction);
  const recordFlairPoint = useGameStore(s => s.recordFlairPoint);

  // Derive cook level from challenge progress (0-100 -> 0-1)
  const cookLevel = challengeProgress / 100;

  // ---- Refs for store selectors read inside useFrame (avoid stale closures) ----
  const challengeHeatLevelRef = useRef(challengeHeatLevel);
  challengeHeatLevelRef.current = challengeHeatLevel;
  const cookLevelRef = useRef(cookLevel);
  cookLevelRef.current = cookLevel;

  // ---- Game logic refs (avoid stale closures in useFrame) ----
  const phaseRef = useRef<OrchestratorPhase>('idle');
  const variantRef = useRef<CookingVariant | null>(null);
  const tempRef = useRef(ROOM_TEMP);
  const holdTimerRef = useRef(0);
  const timerRef = useRef(30);
  const overheatCountRef = useRef(0);
  const isOverheatedRef = useRef(false);
  const successDelayRef = useRef(0);
  const lastSizzleTimeRef = useRef(0);
  const lastBeepSecondRef = useRef(-1);

  // ---- Mutable refs ----
  const timeRef = useRef(0);

  // ---- 3D refs ----
  const panGroupRef = useRef<THREE.Group>(null);
  const sausageGroupRef = useRef<THREE.Group>(null);
  const sausageMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const burnerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const glistenRef = useRef<THREE.PointLight>(null);

  // ---- Steam particles ----
  const steamRefs = useRef<(THREE.Mesh | null)[]>(Array.from({length: STEAM_COUNT}, () => null));
  const steamState = useRef(
    Array.from({length: STEAM_COUNT}, () => ({
      x: 0,
      y: 0,
      z: 0,
      vy: 0,
      life: 0,
      maxLife: 0.5,
      active: false,
    })),
  );
  const steamTimerRef = useRef(0);

  // ---- Smoke particles ----
  const smokeRefs = useRef<(THREE.Mesh | null)[]>(Array.from({length: SMOKE_COUNT}, () => null));
  const smokeState = useRef(
    Array.from({length: SMOKE_COUNT}, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1.2,
      active: false,
    })),
  );
  const smokeTimerRef = useRef(0);

  // ---- Pan handle materials (normal + hover highlight) ----
  const panHandleHoverMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.25, 0.25, 0.3),
        emissive: new THREE.Color(0.05, 0.05, 0.1),
      }),
    [],
  );
  let panHandleMat: THREE.MeshStandardMaterial | null = null;

  // ---- Flip animation state ----
  const flipProgressRef = useRef(-1); // -1 = not flipping
  const flipCountRef = useRef(0);

  /** Trigger a pan flip — called by pan handle click handler */
  const triggerFlip = () => {
    // Guard: only during active phase, not already flipping, under max flips
    if (phaseRef.current !== 'active' || flipProgressRef.current >= 0) return;
    if (flipCountRef.current >= MAX_FLIPS) return;

    flipCountRef.current += 1;
    flipProgressRef.current = 0; // start flip animation

    fireHaptic('toggle_click');

    // Check if temperature is in the target zone
    const v = variantRef.current;
    if (v) {
      const inZone = Math.abs(tempRef.current - v.targetTemp) <= v.tempTolerance;
      if (inZone) {
        recordFlairPoint('pan-flip', FLIP_FLAIR_POINTS);
        setMrSausageReaction('excitement');
      } else {
        // Penalty: reduce hold timer progress
        holdTimerRef.current = Math.max(0, holdTimerRef.current - FLIP_HOLD_TIMER_PENALTY);
        setMrSausageReaction('nervous');
      }
    }
  };

  // ---- Enable/disable ECS input primitives based on visibility ----
  useEffect(() => {
    for (const entity of entitiesRef.current) {
      if (entity.dial) {
        entity.dial.enabled = visible;
      }
    }
  }, [visible]);

  // ---- Haptic on heat level changes ----
  const prevHeatLevelRef = useRef(challengeHeatLevel);
  useEffect(() => {
    if (challengeHeatLevel !== prevHeatLevelRef.current) {
      fireHaptic('dial_click');
      prevHeatLevelRef.current = challengeHeatLevel;
    }
  }, [challengeHeatLevel]);

  // ---- Variant selection on mount ----
  useEffect(() => {
    const v = pickVariant('cooking', variantSeed) as CookingVariant;
    variantRef.current = v;
    timerRef.current = v.timerSeconds;
    flipCountRef.current = 0;
  }, [variantSeed]);

  // ---- Phase: idle -> dialogue when visible + triggered ----
  useEffect(() => {
    if (visible && challengeTriggered && phaseRef.current === 'idle') {
      phaseRef.current = 'dialogue';
      setChallengePhase('dialogue');
    }
  }, [visible, challengeTriggered, setChallengePhase]);

  // ---- Phase: dialogue -> active (the HUD/DialogueOverlay calls setChallengePhase('active')) ----
  // We watch the store's challengePhase to detect the transition
  const storeChallengePhase = useGameStore(s => s.challengePhase);
  useEffect(() => {
    if (storeChallengePhase === 'active' && phaseRef.current === 'dialogue') {
      phaseRef.current = 'active';
      audioEngine.startCookingSizzle();
    }
  }, [storeChallengePhase]);

  // ---- Watch for defeat ----
  useEffect(() => {
    if (gameStatus === 'defeat' && phaseRef.current === 'active') {
      phaseRef.current = 'complete';
      setChallengePhase('complete');
      audioEngine.stopCookingSizzle();
    }
  }, [gameStatus, setChallengePhase]);

  // ---- Cleanup audio on unmount ----
  useEffect(() => {
    return () => {
      audioEngine.stopCookingSizzle();
    };
  }, []);

  // ------------------------------------------------------------------
  // Frame loop
  // ------------------------------------------------------------------

  useFrame((_, delta) => {
    if (!visible) return;

    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;

    // ---- Read ECS state ----
    const powerEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'power-source');
    const powerLevel = powerEntity?.powerSource?.powerLevel ?? 0;
    const isActive = powerEntity?.powerSource?.active ?? false;

    // ==================================================================
    // GAME LOGIC — temperature physics, hold timer, scoring
    // ==================================================================

    const v = variantRef.current;
    const phase = phaseRef.current;

    if (phase === 'active' && v) {
      // ---- Write ECS power level to store for HUD ----
      // powerLevel is 0, 0.33, 0.66, or 1.0 from DialSystem
      // Store heatLevel is 0-3 scale
      setChallengeHeatLevel(powerLevel * 3);

      // ---- Temperature physics ----
      const tempChange = (powerLevel * v.heatRate - COOLING_RATE) * dt;
      tempRef.current = Math.max(ROOM_TEMP, Math.min(280, tempRef.current + tempChange));
      setChallengeTemperature(tempRef.current);

      // ---- Hold timer logic ----
      const inZone = Math.abs(tempRef.current - v.targetTemp) <= v.tempTolerance;
      if (inZone) {
        holdTimerRef.current = Math.min(v.holdSeconds, holdTimerRef.current + dt);
      } else {
        holdTimerRef.current = Math.max(0, holdTimerRef.current - dt * 0.5);
      }
      const holdProgress = (holdTimerRef.current / v.holdSeconds) * 100;
      setChallengeProgress(holdProgress);

      // ---- Overheat detection ----
      const overheatThreshold = v.targetTemp + v.tempTolerance * 2;
      if (tempRef.current > overheatThreshold && !isOverheatedRef.current) {
        isOverheatedRef.current = true;
        overheatCountRef.current += 1;
        addStrike();
        setMrSausageReaction('flinch');
      }
      if (tempRef.current <= overheatThreshold && isOverheatedRef.current) {
        isOverheatedRef.current = false;
      }

      // ---- Mr. Sausage reactions ----
      if (!isOverheatedRef.current) {
        if (inZone) {
          setMrSausageReaction('nod');
        } else if (tempRef.current > v.targetTemp + v.tempTolerance) {
          setMrSausageReaction('nervous');
        } else {
          setMrSausageReaction('idle');
        }
      }

      // ---- Sizzle audio one-shot hits (throttled) ----
      if (powerLevel > 0.1) {
        const now = Date.now();
        if (now - lastSizzleTimeRef.current > SIZZLE_THROTTLE_MS) {
          audioEngine.playSizzleHit();
          lastSizzleTimeRef.current = now;
        }
      }

      // ---- Check hold timer completion ----
      if (holdTimerRef.current >= v.holdSeconds) {
        phaseRef.current = 'success';
        setChallengePhase('success');
        setMrSausageReaction('excitement');
        successDelayRef.current = 0;
        audioEngine.stopCookingSizzle();
        // Score will be calculated after success delay
      }

      // ---- Timer countdown ----
      timerRef.current = Math.max(0, timerRef.current - dt);
      setChallengeTimeRemaining(timerRef.current);

      // Countdown beep for last 5 seconds
      const currentSecond = Math.ceil(timerRef.current);
      if (currentSecond <= 5 && currentSecond > 0 && currentSecond !== lastBeepSecondRef.current) {
        lastBeepSecondRef.current = currentSecond;
        audioEngine.playCountdownBeep(currentSecond === 1);
      }

      // Timer expired — score based on partial hold progress
      // Guard: only fire if we haven't already transitioned (e.g., success in same frame)
      if (timerRef.current <= 0 && phaseRef.current === 'active') {
        phaseRef.current = 'complete';
        setChallengePhase('complete');
        audioEngine.stopCookingSizzle();
        const holdPct = holdTimerRef.current / v.holdSeconds;
        const score = Math.max(
          0,
          Math.round(holdPct * 100 - overheatCountRef.current * SCORE_PENALTY_PER_OVERHEAT),
        );
        completeChallenge(score);
      }
    }

    // ---- Success phase: wait for delay then score and complete ----
    if (phase === 'success' && v) {
      successDelayRef.current += dt;
      if (successDelayRef.current >= COMPLETE_DELAY_SEC) {
        phaseRef.current = 'complete';
        setChallengePhase('complete');

        let score = 100;
        score -= overheatCountRef.current * SCORE_PENALTY_PER_OVERHEAT;
        if (overheatCountRef.current === 0) {
          score += SCORE_BONUS_NO_OVERHEAT;
        }
        score = Math.max(0, Math.min(100, Math.round(score)));
        completeChallenge(score);
      }
    }

    // ==================================================================
    // VISUALS — all existing visual code below, now driven by store
    // ==================================================================

    // ---- Derive heat level for visuals from store (via ref to avoid stale closure) ----
    // Map challengeHeatLevel (0-3) to powerLevel-like value (0, 0.33, 0.66, 1.0)
    const heatPower = challengeHeatLevelRef.current / 3;

    // ---- Sausage color driven by store cook level (via ref to avoid stale closure) ----
    if (sausageMatRef.current) {
      const targetColor = cookLevelToColor(cookLevelRef.current);
      sausageMatRef.current.color.setRGB(targetColor[0], targetColor[1], targetColor[2]);
    }

    // ---- Burner visual (driven by store heat level) ----
    if (burnerMatRef.current) {
      const effectiveLevel = visible ? heatPower : 0;
      const key = closestKey(BURNER_PARAMS_MAP, effectiveLevel);
      const params = BURNER_PARAMS_MAP[String(key)];
      let [r, g, b] = params.color;
      // Flicker when heat is on
      if (effectiveLevel > 0) {
        const flicker = Math.sin(timeRef.current * 20) * 0.05;
        r = Math.min(1, r + flicker);
      }
      burnerMatRef.current.color.setRGB(r, g, b);
    }

    // ---- Flip animation ----
    if (flipProgressRef.current >= 0 && sausageGroupRef.current) {
      flipProgressRef.current += dt / FLIP_DURATION;
      if (flipProgressRef.current >= 1) {
        flipProgressRef.current = -1;
        sausageGroupRef.current.rotation.x = 0;
      } else {
        sausageGroupRef.current.rotation.x = flipProgressRef.current * Math.PI;
      }
    }

    // ---- Pan tip during flip ----
    if (panGroupRef.current) {
      if (flipProgressRef.current >= 0 && flipProgressRef.current < 1) {
        const tipAmount = Math.sin(flipProgressRef.current * Math.PI) * 0.3;
        panGroupRef.current.rotation.z = tipAmount;
      } else {
        panGroupRef.current.rotation.z = 0;
      }
    }

    // ---- Glisten light orbit ----
    if (glistenRef.current && cookLevelRef.current > 0) {
      glistenRef.current.position.x = -2 + Math.sin(timeRef.current * 0.5) * 2;
      glistenRef.current.position.z = -2 + Math.cos(timeRef.current * 0.7) * 1.5;
    }

    // ---- Steam particles (scale with heat) ----
    if (isActive && powerLevel > 0) {
      steamTimerRef.current += dt;
      const heatMultiplier = powerLevel >= 0.9 ? 3 : powerLevel >= 0.5 ? 2 : 1;
      const spawnInterval = 0.12 / heatMultiplier;

      if (steamTimerRef.current >= spawnInterval) {
        steamTimerRef.current = 0;
        for (let i = 0; i < STEAM_COUNT; i++) {
          const s = steamState.current[i];
          if (!s.active) {
            s.active = true;
            s.x = (Math.random() - 0.5) * 0.4 * 1.2;
            s.y = PAN_Y + PAN_HEIGHT;
            s.z = (Math.random() - 0.5) * 0.4 * 1.2;
            s.vy = 0.5 + Math.random() * 0.5;
            s.life = 0;
            s.maxLife = 0.3 + Math.random() * 0.3;
            break;
          }
        }
      }
    }

    // Update steam
    for (let i = 0; i < STEAM_COUNT; i++) {
      const s = steamState.current[i];
      const mesh = steamRefs.current[i];
      if (!mesh) continue;
      if (s.active) {
        s.life += dt;
        s.y += s.vy * dt;
        const fade = Math.max(0, 1.0 - s.life / s.maxLife);
        mesh.position.set(s.x, s.y, s.z);
        mesh.scale.setScalar(fade);
        mesh.visible = true;
        if (s.life >= s.maxLife) {
          s.active = false;
          mesh.visible = false;
        }
      } else {
        mesh.visible = false;
      }
    }

    // ---- Smoke particles (dark, when cookLevel > 0.85) ----
    if (cookLevelRef.current > SMOKE_THRESHOLD) {
      smokeTimerRef.current += dt;
      const smokeInterval = 0.1;
      if (smokeTimerRef.current >= smokeInterval) {
        smokeTimerRef.current = 0;
        for (let i = 0; i < SMOKE_COUNT; i++) {
          const s = smokeState.current[i];
          if (!s.active) {
            s.active = true;
            s.x = (Math.random() - 0.5) * 0.2;
            s.y = PAN_Y + 0.15;
            s.z = (Math.random() - 0.5) * 0.2;
            s.vx = (Math.random() - 0.5) * 0.1;
            s.vy = 0.3 + Math.random() * 0.3;
            s.vz = (Math.random() - 0.5) * 0.1;
            s.life = 0;
            s.maxLife = 1.0 + Math.random() * 0.5;
            break;
          }
        }
      }
    }

    // Update smoke
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const s = smokeState.current[i];
      const mesh = smokeRefs.current[i];
      if (!mesh) continue;
      if (s.active) {
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        const lifeNorm = s.life / s.maxLife;
        const expandScale = 1.0 + lifeNorm * 2.0;
        mesh.position.set(s.x, s.y, s.z);
        mesh.scale.setScalar(expandScale);
        mesh.visible = true;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = Math.max(0, (1 - lifeNorm) * 0.5);
        if (s.life >= s.maxLife) {
          s.active = false;
          mesh.visible = false;
        }
      } else {
        mesh.visible = false;
      }
    }
  });

  // ------------------------------------------------------------------
  // JSX
  // ------------------------------------------------------------------

  if (!visible) return null;

  return (
    <group position={position}>
      {/* ECS machine entities — rendered with automatic input event wiring */}
      <MachineEntitiesRenderer entities={entitiesRef.current} />

      {/* Burner ring override — heat-responsive color (uses ref, not ECS material) */}
      <mesh position={[0, 0.06, 0]}>
        <torusGeometry args={[0.35, 0.03, 12, 24]} />
        <meshBasicMaterial ref={burnerMatRef} color={[0.15, 0.05, 0.02]} />
      </mesh>

      {/* Frying Pan Group (tips during flip) — always visible when station active */}
      <group ref={panGroupRef} position={[0, PAN_Y, 0]}>
        {/* Pan body */}
        <mesh>
          <cylinderGeometry args={[0.4, 0.4, PAN_HEIGHT, 24]} />
          <meshStandardMaterial color={[0.2, 0.2, 0.22]} metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Pan handle — click to trigger flip */}
        <mesh
          position={[0, 0, 0.65]}
          onClick={triggerFlip}
          onPointerOver={e => {
            e.stopPropagation();
            (e.object as THREE.Mesh).material = panHandleHoverMat;
          }}
          onPointerOut={e => {
            e.stopPropagation();
            if (panHandleMat) (e.object as THREE.Mesh).material = panHandleMat;
          }}
        >
          <boxGeometry args={[0.06, 0.04, 0.5]} />
          <meshStandardMaterial
            ref={el => {
              panHandleMat = el;
            }}
            color={[0.12, 0.12, 0.14]}
          />
        </mesh>

        {/* Sausage group (flip rotation target) */}
        <group ref={sausageGroupRef} position={[0, PAN_HEIGHT / 2 + SAUSAGE_RADIUS, 0]}>
          {/* Sausage body */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry
              args={[SAUSAGE_RADIUS, SAUSAGE_RADIUS, SAUSAGE_HALF_LENGTH * 2, 12]}
            />
            <meshStandardMaterial ref={sausageMatRef} color={COLOR_RAW} roughness={0.4} />
          </mesh>
          {/* End caps */}
          <mesh position={[-SAUSAGE_HALF_LENGTH, 0, 0]}>
            <sphereGeometry args={[SAUSAGE_RADIUS, 8, 8]} />
            <meshStandardMaterial color={COLOR_RAW} roughness={0.4} />
          </mesh>
          <mesh position={[SAUSAGE_HALF_LENGTH, 0, 0]}>
            <sphereGeometry args={[SAUSAGE_RADIUS, 8, 8]} />
            <meshStandardMaterial color={COLOR_RAW} roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* Glisten light — orbiting point light for grease specular */}
      <pointLight
        ref={glistenRef}
        position={[-2, PAN_Y + 6, -2]}
        intensity={150}
        distance={50}
        color={0xffffff}
        visible={cookLevel > 0}
      />

      {/* ---- Steam particles ---- */}
      {Array.from({length: STEAM_COUNT}, (_, i) => (
        <mesh
          key={`steam_${i}`}
          ref={el => {
            steamRefs.current[i] = el;
          }}
          position={[0, PAN_Y, 0]}
          visible={false}
        >
          <sphereGeometry args={[0.015, 4, 4]} />
          <meshBasicMaterial color={[0.9, 0.9, 0.95]} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* ---- Smoke particles ---- */}
      {Array.from({length: SMOKE_COUNT}, (_, i) => (
        <mesh
          key={`smoke_${i}`}
          ref={el => {
            smokeRefs.current[i] = el;
          }}
          position={[0, PAN_Y + 0.3, 0]}
          visible={false}
        >
          <sphereGeometry args={[0.04, 4, 4]} />
          <meshBasicMaterial color={[0.25, 0.22, 0.2]} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}
