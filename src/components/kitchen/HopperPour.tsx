/**
 * @module HopperPour
 * Funnel-shaped hopper above the grinder input with a particle-stream pour
 * animation when the mixing bowl arrives at the grinder station.
 *
 * Visibility: only renders when bowlPosition === 'grinder'.
 * The hopper fill level rises as the pour progresses.
 * Colored particle stream uses blendColor from the Zustand store.
 *
 * All animation uses useFrame — no polling timers.
 */

import {useFrame} from '@react-three/fiber';
import {useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {useGameStore} from '../../store/gameStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hopper lathe profile — wide top tapering to narrow bottom spout */
const HOPPER_POINTS = [
  new THREE.Vector2(0.0, 0.0),
  new THREE.Vector2(1.2, 0.0),
  new THREE.Vector2(1.4, 0.4),
  new THREE.Vector2(1.4, 1.6),
  new THREE.Vector2(0.5, 2.4),
];

/** Number of falling particles in the stream */
const PARTICLE_COUNT = 10;

/** Gravity acceleration for particles (world-units / s²) */
const GRAVITY = 9.8;

/** Height at which particles spawn above the hopper rim */
const SPAWN_HEIGHT = 3.2;

/** Fill animation speed (fraction per second) */
const FILL_SPEED = 0.35;

// ---------------------------------------------------------------------------
// HopperParticle — a single sphere falling from bowl mouth into hopper
// ---------------------------------------------------------------------------

interface ParticleState {
  /** Current y position (world-local) */
  y: number;
  /** Initial y (for reset) */
  startY: number;
  /** Stagger offset so particles don't all start at the same time */
  phase: number;
  /** Whether this particle is currently active */
  active: boolean;
}

// ---------------------------------------------------------------------------
// HopperPour
// ---------------------------------------------------------------------------

/**
 * Renders the hopper funnel, fill level, and particle pour stream.
 * Mounts at a fixed local offset above the grinder input slot.
 * Parent is responsible for world-space positioning.
 */
export interface HopperPourProps {
  /** World-space position above the grinder input slot */
  position?: [number, number, number];
}

export const HopperPour = ({position = [0, 5.8, 0.5]}: HopperPourProps) => {
  const bowlPosition = useGameStore(s => s.bowlPosition);
  const blendColor = useGameStore(s => s.blendColor);

  const isPouring = bowlPosition === 'grinder';

  // Refs for mutable per-frame state
  const fillRef = useRef<THREE.Mesh>(null);
  const fillLevel = useRef(0); // 0 = empty, 1 = full
  const particleRefs = useRef<(THREE.Mesh | null)[]>([]);
  const particleStates = useRef<ParticleState[]>([]);

  // Geometry (created once)
  const hopperGeo = useMemo(() => {
    const geo = new THREE.LatheGeometry(HOPPER_POINTS, 24);
    return geo;
  }, []);

  // Fill indicator geometry — small cylinder that scales up as fill rises
  const fillGeo = useMemo(() => new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16), []);

  // Particle geometry — small sphere shared across instances
  const particleGeo = useMemo(() => new THREE.SphereGeometry(0.06, 6, 6), []);

  // Materials (blendColor drives particle + fill color)
  const hopperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#777777',
        roughness: 0.4,
        metalness: 0.7,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const meatColor = useMemo(() => new THREE.Color(blendColor), [blendColor]);

  const particleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: meatColor,
        roughness: 0.65,
      }),
    [meatColor],
  );

  const fillMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: meatColor,
        roughness: 0.65,
      }),
    [meatColor],
  );

  // Initialise particle states once
  useMemo(() => {
    particleStates.current = Array.from({length: PARTICLE_COUNT}, (_, i) => ({
      y: SPAWN_HEIGHT - (i / PARTICLE_COUNT) * SPAWN_HEIGHT,
      startY: SPAWN_HEIGHT,
      phase: i / PARTICLE_COUNT,
      active: false,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!isPouring) {
      // Reset fill level when bowl leaves
      fillLevel.current = 0;
      if (fillRef.current) {
        fillRef.current.scale.y = 0.001;
      }
      // Hide all particles
      for (const ref of particleRefs.current) {
        if (ref) ref.visible = false;
      }
      return;
    }

    // Advance fill level
    fillLevel.current = Math.min(1, fillLevel.current + FILL_SPEED * delta);
    if (fillRef.current) {
      const s = fillLevel.current;
      fillRef.current.scale.y = Math.max(0.001, s);
      // Move fill mesh up as it grows
      fillRef.current.position.y = 0.25 * s;
    }

    // Animate particles — simple falling loop
    const states = particleStates.current;
    const refs = particleRefs.current;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const state = states[i];
      const mesh = refs[i];
      if (!mesh) continue;

      // Particles active once fill is underway
      mesh.visible = fillLevel.current < 0.95;

      // Advance y downward using gravity
      state.y -= GRAVITY * delta * (0.5 + state.phase * 0.5);

      // Reset when particle drops below hopper bottom (~y = -0.5)
      if (state.y < -0.5) {
        // Stagger reset by phase fraction
        state.y = SPAWN_HEIGHT - state.phase * 0.4;
      }

      mesh.position.y = state.y;
      // Slight x/z wobble using phase offset
      mesh.position.x = Math.sin((state.y + state.phase * Math.PI * 2) * 2) * 0.08;
    }
  });

  if (!isPouring) return null;

  return (
    <group position={position}>
      {/* Hopper funnel */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <primitive object={hopperGeo} attach="geometry" />
        <primitive object={hopperMat} attach="material" />
      </mesh>

      {/* Fill level indicator inside hopper bottom */}
      <mesh ref={fillRef} position={[0, 0.001, 0]} scale={[1, 0.001, 1]}>
        <primitive object={fillGeo} attach="geometry" />
        <primitive object={fillMat} attach="material" />
      </mesh>

      {/* Particle stream — spheres falling from bowl mouth into hopper */}
      {Array.from({length: PARTICLE_COUNT}, (_, i) => (
        <mesh
          key={i}
          ref={el => {
            particleRefs.current[i] = el;
          }}
          position={[0, SPAWN_HEIGHT - (i / PARTICLE_COUNT) * SPAWN_HEIGHT, 0]}
          visible={false}
        >
          <primitive object={particleGeo} attach="geometry" />
          <primitive object={particleMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
};
