/**
 * @module CookingMechanics
 * 3D cooking mechanics for the frying pan station.
 *
 * Manages the interactive cooking loop: player-controlled heat via dial
 * clicks (low/medium/high/off cycle), burn detection (cookLevel > 1.0 =
 * instant defeat), pan-flip flair gesture for bonus points, and a grease
 * glisten orbiting point light.
 *
 * Phase state machine:
 * - 'place'     — drag pan to front burner
 * - 'dial'      — click dial to ignite
 * - 'cooking'   — player controls heat, can flip sausage, remove pan when done
 * - 'overcooked' — burn state, instant game over
 * - 'done'      — pan removed, cook level recorded
 *
 * Visual feedback:
 * - Burner color/intensity scales with heat setting
 * - Sausage color transitions pink -> brown -> black based on cookLevel
 * - Steam/smoke particles scale with heat and cookLevel
 * - Orbiting glisten light creates grease specular highlights during cooking
 * - Pan flip animation with sparkle burst on clean flips
 */

import {useFrame} from '@react-three/fiber';
import {useCallback, useRef} from 'react';
import type * as THREE from 'three/webgpu';
import {useGameStore} from '../../store/gameStore';
import {BurnerRing} from './stove/BurnerRing';
import {FryingPan} from './stove/FryingPan';
import {GlistenLight} from './stove/GlistenLight';
import {StoveDial} from './stove/StoveDial';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CookingPhase = 'place' | 'dial' | 'cooking' | 'overcooked' | 'done';

export type HeatSetting = 'off' | 'low' | 'medium' | 'high';

interface CookingMechanicsProps {
  /** World position of the cooking station */
  position: [number, number, number];
  /** Called when the player finishes cooking (pan removed or overcooked) */
  onCookComplete: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAN_RADIUS = 0.4;
const PAN_HEIGHT = 0.06;
const PAN_Y = 0.12;
const SAUSAGE_RADIUS = 0.07;
const SAUSAGE_HALF_LENGTH = 0.25;

/** Heat rates per setting (cook level units per second) */
const HEAT_RATES: Record<HeatSetting, number> = {
  off: 0,
  low: 0.03,
  medium: 0.06,
  high: 0.12,
};

/** Heat setting cycle order */
const HEAT_CYCLE: HeatSetting[] = ['low', 'medium', 'high', 'off'];

/** Burner visual parameters per heat setting */
const BURNER_PARAMS: Record<HeatSetting, {color: [number, number, number]; emissive: number}> = {
  off: {color: [0.15, 0.05, 0.02], emissive: 0},
  low: {color: [0.8, 0.35, 0.05], emissive: 0.3},
  medium: {color: [1.0, 0.5, 0.05], emissive: 1.0},
  high: {color: [1.0, 0.2, 0.1], emissive: 2.0},
};

/** Sausage color keyframes based on cook level */
const COLOR_RAW: [number, number, number] = [1.0, 0.714, 0.757];
const COLOR_COOKED: [number, number, number] = [0.545, 0.271, 0.075];
const COLOR_CHARRED: [number, number, number] = [0.15, 0.1, 0.08];
const COLOR_BURNT: [number, number, number] = [0.067, 0.067, 0.067]; // 0x111111

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CookingMechanics({position, onCookComplete}: CookingMechanicsProps) {
  // ---- Store actions ----
  const addStrike = useGameStore(s => s.addStrike);
  const setMrSausageReaction = useGameStore(s => s.setMrSausageReaction);
  const recordCookLevel = useGameStore(s => s.recordCookLevel);
  const recordFlairPoint = useGameStore(s => s.recordFlairPoint);

  // ---- Refs for frame loop (avoid stale closures) ----
  const phaseRef = useRef<CookingPhase>('place');
  const heatSettingRef = useRef<HeatSetting>('off');
  const cookLevelRef = useRef(0);
  const timeRef = useRef(0);

  // ---- 3D refs ----
  const panGroupRef = useRef<THREE.Group>(null);
  const sausageGroupRef = useRef<THREE.Group>(null);
  const sausageMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const burnerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const dialRef = useRef<THREE.Mesh>(null);
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

  // ---- Pan placement flag (simplified: auto-placed for now) ----
  const panPlacedRef = useRef(false);

  // ------------------------------------------------------------------
  // Interactions
  // ------------------------------------------------------------------

  /** Click the pan to place it on the burner (place phase) */
  const handlePanClick = useCallback(() => {
    if (phaseRef.current !== 'place') return;
    panPlacedRef.current = true;
    phaseRef.current = 'dial';
  }, []);

  /** Click dial to start cooking or cycle heat */
  const handleDialClick = useCallback(() => {
    if (phaseRef.current === 'dial') {
      // First dial click starts cooking at low heat
      heatSettingRef.current = 'low';
      phaseRef.current = 'cooking';
      return;
    }
    if (phaseRef.current === 'cooking') {
      // Cycle heat: low -> medium -> high -> off -> low
      const current = heatSettingRef.current;
      const idx = HEAT_CYCLE.indexOf(current);
      const next = HEAT_CYCLE[(idx + 1) % HEAT_CYCLE.length];
      heatSettingRef.current = next;
    }
  }, []);

  /** Click the pan handle during cooking to remove pan and finish */
  const handlePanHandleClick = useCallback(() => {
    if (phaseRef.current !== 'cooking') return;
    phaseRef.current = 'done';
    recordCookLevel(cookLevelRef.current);
    onCookComplete();
  }, [onCookComplete, recordCookLevel]);

  /** Pointer down on pan for flip gesture tracking */
  const handlePanPointerDown = useCallback((e: THREE.Event) => {
    if (phaseRef.current !== 'cooking') return;
    if (flipProgressRef.current >= 0) return; // Already flipping
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
      if (flipProgressRef.current >= 0) return; // Already flipping

      const event = e as unknown as {clientY?: number};
      const endY = event.clientY ?? 0;
      const dy = pointerStartRef.current.y - endY; // Positive = swipe up
      const dtMs = performance.now() - pointerStartRef.current.time;
      pointerStartRef.current = null;

      if (dy < 30) return; // Not enough upward motion

      const speed = (dy / dtMs) * 1000; // px/s

      // Start flip animation
      flipProgressRef.current = 0;

      // Check if flip is "clean"
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
    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;
    const phase = phaseRef.current;
    const heat = heatSettingRef.current;

    // ---- Cook level advancement ----
    if (phase === 'cooking') {
      const rate = HEAT_RATES[heat];
      cookLevelRef.current += rate * dt;

      // ---- BURN CHECK ----
      if (cookLevelRef.current > BURN_THRESHOLD) {
        phaseRef.current = 'overcooked';
        // Instant defeat: 3 strikes
        addStrike();
        addStrike();
        addStrike();
        setMrSausageReaction('angry');
      }
    }

    // ---- Sausage color ----
    if (sausageMatRef.current) {
      const cl = cookLevelRef.current;
      const targetColor = phase === 'overcooked' ? COLOR_BURNT : cookLevelToColor(cl);
      sausageMatRef.current.color.setRGB(targetColor[0], targetColor[1], targetColor[2]);
    }

    // ---- Burner visual ----
    if (burnerMatRef.current) {
      const params = BURNER_PARAMS[phase === 'cooking' ? heat : 'off'];
      let [r, g, b] = params.color;
      // Flicker when heat is on
      if (phase === 'cooking' && heat !== 'off') {
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
        // Tip the pan slightly during flip
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
    if (phase === 'cooking' && heat !== 'off') {
      steamTimerRef.current += dt;
      const heatMultiplier = heat === 'high' ? 3 : heat === 'medium' ? 2 : 1;
      const spawnInterval = 0.12 / heatMultiplier;

      if (steamTimerRef.current >= spawnInterval) {
        steamTimerRef.current = 0;
        for (let i = 0; i < STEAM_COUNT; i++) {
          const s = steamState.current[i];
          if (!s.active) {
            s.active = true;
            s.x = (Math.random() - 0.5) * PAN_RADIUS * 1.2;
            s.y = PAN_Y + PAN_HEIGHT;
            s.z = (Math.random() - 0.5) * PAN_RADIUS * 1.2;
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

  return (
    <group position={position}>
      {/* Burner ring — heat-responsive color */}
      <BurnerRing ref={burnerMatRef} />

      {/* Frying Pan Group (tips during flip) */}
      <group ref={panGroupRef} position={[0, PAN_Y, 0]}>
        <FryingPan onPanClick={handlePanClick} onHandleClick={handlePanHandleClick} />

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

      {/* Dial — click to start/cycle heat */}
      <StoveDial ref={dialRef} onClick={handleDialClick} />

      {/* Glisten light — orbiting point light for grease specular */}
      <GlistenLight
        ref={glistenRef}
        panY={PAN_Y}
        visible={phaseRef.current === 'cooking' || phaseRef.current === 'done'}
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
