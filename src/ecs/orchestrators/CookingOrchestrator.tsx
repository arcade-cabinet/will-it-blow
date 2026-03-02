/**
 * @module CookingOrchestrator
 * ECS-driven visual driver for the cooking/stove station.
 *
 * Spawns stove machine entities from STOVE_ARCHETYPE on mount,
 * despawns on unmount. Uses MachineEntitiesRenderer for all ECS entity
 * rendering with automatic input event wiring (dial).
 *
 * This orchestrator is VISUAL ONLY — it reads Zustand state set by the
 * 2D CookingChallenge overlay and drives ECS entity animations.
 * It does NOT manage game phases, scoring, strikes, or completion logic.
 *
 * ECS systems handle:
 * - DialSystem: tap processing for heat setting cycle (off/low/medium/high)
 * - InputContractSystem: wiring dial segment -> powerSource level + active
 */

import {useFrame} from '@react-three/fiber';
import {useEffect, useRef} from 'react';
import type * as THREE from 'three/webgpu';
import {fireHaptic} from '../../input/HapticService';
import {useGameStore} from '../../store/gameStore';
import {despawnMachine, spawnMachine} from '../archetypes/spawnMachine';
import {STOVE_ARCHETYPE} from '../archetypes/stoveArchetype';
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
// Constants
// ---------------------------------------------------------------------------

const PAN_Y = 0.12;
const PAN_HEIGHT = 0.06;
const SAUSAGE_RADIUS = 0.07;
const SAUSAGE_HALF_LENGTH = 0.25;

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

export function CookingOrchestrator({position, visible}: CookingOrchestratorProps) {
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

  // ---- Store (read-only) ----
  const challengeProgress = useGameStore(s => s.challengeProgress);
  const challengeHeatLevel = useGameStore(s => s.challengeHeatLevel);

  // Derive cook level from challenge progress (0-100 -> 0-1)
  const cookLevel = challengeProgress / 100;

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

  // ---- Flip animation state ----
  const flipProgressRef = useRef(-1); // -1 = not flipping

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

    // ---- Derive heat level for visuals from store ----
    // Map challengeHeatLevel (0-3) to powerLevel-like value (0, 0.33, 0.66, 1.0)
    const heatPower = challengeHeatLevel / 3;

    // ---- Sausage color driven by store cook level ----
    if (sausageMatRef.current) {
      const targetColor = cookLevelToColor(cookLevel);
      sausageMatRef.current.color.setRGB(targetColor[0], targetColor[1], targetColor[2]);
    }

    // ---- Burner visual (driven by store heat level) ----
    if (burnerMatRef.current) {
      const effectiveLevel = visible ? heatPower : 0;
      const key = closestKey(BURNER_PARAMS_MAP, effectiveLevel);
      const params = BURNER_PARAMS_MAP[key];
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
    if (glistenRef.current && cookLevel > 0) {
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
    if (cookLevel > SMOKE_THRESHOLD) {
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

        {/* Pan handle */}
        <mesh position={[0, 0, 0.65]}>
          <boxGeometry args={[0.06, 0.04, 0.5]} />
          <meshStandardMaterial color={[0.12, 0.12, 0.14]} />
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
