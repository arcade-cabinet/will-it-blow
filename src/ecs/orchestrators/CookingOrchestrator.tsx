/**
 * @module CookingOrchestrator
 * ECS-driven replacement for CookingMechanics.
 *
 * Spawns stove machine entities from STOVE_ARCHETYPE on mount,
 * despawns on unmount. Uses MachineEntitiesRenderer for all ECS entity
 * rendering with automatic input event wiring (dial).
 *
 * Challenge-specific elements (sausage body, steam/smoke particles,
 * flip animation, glisten light) remain as R3F JSX since they are
 * unique to the cooking challenge and not part of the machine's
 * compositional ECS model.
 *
 * ECS systems handle:
 * - DialSystem: tap processing for heat setting cycle (off/low/medium/high)
 * - InputContractSystem: wiring dial segment -> powerSource level + active
 *
 * The orchestrator only:
 * - Toggles enabled flags on input primitives based on game phase
 * - Reads powerSource outputs (powerLevel, active)
 * - Manages challenge-specific elements (sausage, particles, burner color)
 * - Fires onCookComplete callback to Zustand store
 */

import {useFrame} from '@react-three/fiber';
import {useCallback, useEffect, useRef, useState} from 'react';
import type * as THREE from 'three/webgpu';
import {useGameStore} from '../../store/gameStore';
import {despawnMachine, spawnMachine} from '../archetypes/spawnMachine';
import {STOVE_ARCHETYPE} from '../archetypes/stoveArchetype';
import {MachineEntitiesRenderer} from '../renderers/ECSScene';
import type {Entity} from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CookingPhase = 'place' | 'dial' | 'cooking' | 'overcooked' | 'done';

export type HeatSetting = 'off' | 'low' | 'medium' | 'high';

interface CookingOrchestratorProps {
  position: [number, number, number];
  counterY: number;
  visible: boolean;
  onCookComplete?: (cookLevel: number) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAN_Y = 0.12;
const PAN_HEIGHT = 0.06;
const SAUSAGE_RADIUS = 0.07;
const SAUSAGE_HALF_LENGTH = 0.25;

/** Heat rates per power level (cook level units per second) */
const HEAT_RATE_MAP: Record<number, number> = {
  0: 0, // off
  0.33: 0.03, // low
  0.66: 0.06, // medium
  1.0: 0.12, // high
};

/** Burner visual parameters per power level */
const BURNER_PARAMS_MAP: Record<number, {color: [number, number, number]; emissive: number}> = {
  0: {color: [0.15, 0.05, 0.02], emissive: 0},
  0.33: {color: [0.8, 0.35, 0.05], emissive: 0.3},
  0.66: {color: [1.0, 0.5, 0.05], emissive: 1.0},
  1.0: {color: [1.0, 0.2, 0.1], emissive: 2.0},
};

/** Sausage color keyframes based on cook level */
const COLOR_RAW: [number, number, number] = [1.0, 0.714, 0.757];
const COLOR_COOKED: [number, number, number] = [0.545, 0.271, 0.075];
const COLOR_CHARRED: [number, number, number] = [0.15, 0.1, 0.08];
const COLOR_BURNT: [number, number, number] = [0.067, 0.067, 0.067];

const BURN_THRESHOLD = 1.0;
const SMOKE_THRESHOLD = 0.85;

/** Steam / smoke particle counts */
const STEAM_COUNT = 10;
const SMOKE_COUNT = 8;

/** Flip animation duration in seconds */
const FLIP_DURATION = 0.5;
/** Clean flip swipe speed range (pixels per second) */
const FLIP_SPEED_MIN = 200;
const FLIP_SPEED_MAX = 1200;
/** Flair points for consecutive clean flips (diminishing) */
const FLAIR_POINTS = [3, 2, 1, 1, 1, 1, 1, 1, 1, 1];

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
function closestKey(map: Record<number, unknown>, value: number): number {
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

export function CookingOrchestrator({
  position,
  counterY: _counterY,
  visible,
  onCookComplete,
}: CookingOrchestratorProps) {
  // ---- ECS entity lifecycle ----
  const entitiesRef = useRef<Entity[]>([]);

  useEffect(() => {
    const entities = spawnMachine(STOVE_ARCHETYPE);
    entitiesRef.current = entities;
    return () => {
      despawnMachine(entities);
      entitiesRef.current = [];
    };
  }, []);

  // ---- Store actions ----
  const addStrike = useGameStore(s => s.addStrike);
  const setMrSausageReaction = useGameStore(s => s.setMrSausageReaction);
  const recordCookLevel = useGameStore(s => s.recordCookLevel);
  const recordFlairPoint = useGameStore(s => s.recordFlairPoint);

  // ---- Local phase state ----
  const [gamePhase, setGamePhase] = useState<CookingPhase>('place');
  const phaseRef = useRef<CookingPhase>('place');
  phaseRef.current = gamePhase;

  // ---- Mutable refs (avoid stale closure in useFrame) ----
  const cookLevelRef = useRef(0);
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

  // ---- Flip animation state ----
  const flipProgressRef = useRef(-1); // -1 = not flipping
  const flipCountRef = useRef(0);
  const pointerStartRef = useRef<{y: number; time: number} | null>(null);

  // ---- Pan placement flag ----
  const panPlacedRef = useRef(false);

  // ---- Enable/disable ECS input primitives based on game phase ----
  useEffect(() => {
    const isActive = gamePhase === 'dial' || gamePhase === 'cooking';
    for (const entity of entitiesRef.current) {
      if (entity.dial) {
        entity.dial.enabled = isActive;
      }
    }
  }, [gamePhase]);

  // ------------------------------------------------------------------
  // Interactions
  // ------------------------------------------------------------------

  /** Click the pan to place it on the burner (place phase) */
  const handlePanClick = useCallback(() => {
    if (phaseRef.current !== 'place') return;
    panPlacedRef.current = true;
    setGamePhase('dial');
  }, []);

  /** Click the pan handle during cooking to remove pan and finish */
  const handlePanHandleClick = useCallback(() => {
    if (phaseRef.current !== 'cooking') return;
    setGamePhase('done');
    recordCookLevel(cookLevelRef.current);
    onCookComplete?.(cookLevelRef.current);
  }, [onCookComplete, recordCookLevel]);

  /** Pointer down on pan for flip gesture tracking */
  const handlePanPointerDown = useCallback((e: THREE.Event) => {
    if (phaseRef.current !== 'cooking') return;
    if (flipProgressRef.current >= 0) return;
    const event = e as unknown as {clientY?: number};
    pointerStartRef.current = {
      y: event.clientY ?? 0,
      time: performance.now(),
    };
  }, []);

  /** Pointer up on pan — detect swipe-up for flip */
  const handlePanPointerUp = useCallback(
    (e: THREE.Event) => {
      if (phaseRef.current !== 'cooking') return;
      if (!pointerStartRef.current) return;
      if (flipProgressRef.current >= 0) return;

      const event = e as unknown as {clientY?: number};
      const endY = event.clientY ?? 0;
      const dy = pointerStartRef.current.y - endY;
      const dtMs = performance.now() - pointerStartRef.current.time;
      pointerStartRef.current = null;

      if (dy < 30) return;

      const speed = (dy / dtMs) * 1000;
      flipProgressRef.current = 0;

      if (speed >= FLIP_SPEED_MIN && speed <= FLIP_SPEED_MAX) {
        const points = FLAIR_POINTS[Math.min(flipCountRef.current, FLAIR_POINTS.length - 1)];
        recordFlairPoint('pan-flip', points);
      }
      flipCountRef.current += 1;
    },
    [recordFlairPoint],
  );

  // ------------------------------------------------------------------
  // Frame loop
  // ------------------------------------------------------------------

  useFrame((_, delta) => {
    if (!visible) return;

    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;
    const phase = phaseRef.current;

    // ---- Read ECS state ----
    const powerEntity = entitiesRef.current.find(e => e.machineSlot?.slotName === 'power-source');
    const powerLevel = powerEntity?.powerSource?.powerLevel ?? 0;
    const isActive = powerEntity?.powerSource?.active ?? false;

    // ---- Detect first dial click -> transition from 'dial' to 'cooking' ----
    if (phase === 'dial' && isActive) {
      setGamePhase('cooking');
      phaseRef.current = 'cooking';
    }

    // ---- Cook level advancement ----
    if (phase === 'cooking' && isActive) {
      const key = closestKey(HEAT_RATE_MAP, powerLevel);
      const rate = HEAT_RATE_MAP[key];
      cookLevelRef.current += rate * dt;

      // ---- BURN CHECK ----
      if (cookLevelRef.current > BURN_THRESHOLD) {
        setGamePhase('overcooked');
        phaseRef.current = 'overcooked';
        addStrike();
        addStrike();
        addStrike();
        setMrSausageReaction('disgust');
      }
    }

    // ---- Sausage color ----
    if (sausageMatRef.current) {
      const cl = cookLevelRef.current;
      const targetColor = phase === 'overcooked' ? COLOR_BURNT : cookLevelToColor(cl);
      sausageMatRef.current.color.setRGB(targetColor[0], targetColor[1], targetColor[2]);
    }

    // ---- Burner visual (reads powerLevel from ECS) ----
    if (burnerMatRef.current) {
      const effectiveLevel = phase === 'cooking' || phase === 'dial' ? powerLevel : 0;
      const key = closestKey(BURNER_PARAMS_MAP, effectiveLevel);
      const params = BURNER_PARAMS_MAP[key];
      let [r, g, b] = params.color;
      // Flicker when heat is on
      if (phase === 'cooking' && effectiveLevel > 0) {
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
    if (glistenRef.current && (phase === 'cooking' || phase === 'done')) {
      glistenRef.current.position.x = -2 + Math.sin(timeRef.current * 0.5) * 2;
      glistenRef.current.position.z = -2 + Math.cos(timeRef.current * 0.7) * 1.5;
    }

    // ---- Steam particles (scale with heat) ----
    if (phase === 'cooking' && isActive && powerLevel > 0) {
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
    if (phase === 'cooking' && cookLevelRef.current > SMOKE_THRESHOLD) {
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

      {/* Frying Pan Group (tips during flip) */}
      <group ref={panGroupRef} position={[0, PAN_Y, 0]}>
        {/* Pan body */}
        <mesh onClick={handlePanClick}>
          <cylinderGeometry args={[0.4, 0.4, PAN_HEIGHT, 24]} />
          <meshStandardMaterial color={[0.2, 0.2, 0.22]} metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Pan handle */}
        <mesh position={[0, 0, 0.65]} onClick={handlePanHandleClick}>
          <boxGeometry args={[0.06, 0.04, 0.5]} />
          <meshStandardMaterial color={[0.12, 0.12, 0.14]} />
        </mesh>

        {/* Sausage group (flip rotation target) */}
        <group
          ref={sausageGroupRef}
          position={[0, PAN_HEIGHT / 2 + SAUSAGE_RADIUS, 0]}
          onPointerDown={handlePanPointerDown}
          onPointerUp={handlePanPointerUp}
        >
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
        visible={gamePhase === 'cooking' || gamePhase === 'done'}
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
