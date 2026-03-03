/**
 * @module CabinetBurst
 * R3F component that animates a cabinet door bursting open when an enemy spawns.
 *
 * When `active` becomes true:
 * - Door swings open rapidly (0 → 110° on Y axis over 0.3s, ease-out)
 * - 20 dust particles emit outward with gravity
 * - Camera shakes ±0.05 for 0.15s then restores
 * - Calls `onBurstComplete()` after 0.3s
 *
 * When `active` becomes false, door closes smoothly over 1s.
 *
 * The door pivots around its hinge edge. `doorHinge` is the world-space hinge
 * position; the door box is offset so it rotates around that edge.
 *
 * Rising/falling edge detection lives entirely in useFrame (no useEffect),
 * so all mutable values are read from stable refs — no stale closures.
 */

import {useFrame, useThree} from '@react-three/fiber';
import {useRef} from 'react';
import * as THREE from 'three/webgpu';

// Door geometry constants
const DOOR_W = 0.4;
const DOOR_H = 0.6;
const DOOR_D = 0.02;

// Burst animation timing
const BURST_DURATION = 0.3;
const CLOSE_DURATION = 1.0;
const BURST_ANGLE = (110 * Math.PI) / 180;
const SHAKE_DURATION = 0.15;
const SHAKE_MAGNITUDE = 0.05;

// Particle constants
const PARTICLE_COUNT = 20;
const PARTICLE_LIFETIME = 1.0;
const GRAVITY = -4.0;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number; // counts down from PARTICLE_LIFETIME to 0
  ref: React.RefObject<THREE.Mesh | null>;
}

export interface CabinetBurstProps {
  cabinetId: string;
  position: [number, number, number];
  doorHinge: [number, number, number];
  active: boolean;
  onBurstComplete: () => void;
}

/**
 * Single cabinet burst component. Renders a door that swings open on burst.
 * Door geometry is offset so it rotates around the hinge edge.
 */
export function CabinetBurst({
  cabinetId: _cabinetId,
  position,
  doorHinge,
  active,
  onBurstComplete,
}: CabinetBurstProps) {
  const {camera} = useThree();

  // --- Door hinge group ref (rotated on Y to swing open/closed) ---
  const hingeRef = useRef<THREE.Group>(null);

  // --- All mutable animation state lives here, read each frame ---
  const animState = useRef({
    currentAngle: 0,
    burstCompleted: false,
    burstElapsed: 0,
    bursting: false,
    shakeElapsed: 0,
    shaking: false,
    cameraOrigin: new THREE.Vector3(),
    prevActive: false,
  });

  // --- Particles ---
  const particlesRef = useRef<Particle[]>([]);

  // Pre-allocate particle mesh refs once
  const particleMeshRefs = useRef<Array<React.RefObject<THREE.Mesh | null>>>(
    Array.from({length: PARTICLE_COUNT}, () => ({current: null})),
  );

  // Keep callback ref stable so useFrame closure sees the latest version
  const onBurstCompleteRef = useRef(onBurstComplete);
  onBurstCompleteRef.current = onBurstComplete;

  // Hinge world offset relative to cabinet position (derived each render, stable enough)
  const hingeOffset: [number, number, number] = [
    doorHinge[0] - position[0],
    doorHinge[1] - position[1],
    doorHinge[2] - position[2],
  ];

  const doorLocalX = DOOR_W / 2;

  // -------------------------------------------------------------------------
  // Per-frame: rising/falling edge detection + animation update
  // All variables accessed via refs — no stale closure risk.
  // -------------------------------------------------------------------------
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // cap frame spike
    const s = animState.current;

    // --- Rising edge: active just became true ---
    if (active && !s.prevActive) {
      s.bursting = true;
      s.burstElapsed = 0;
      s.burstCompleted = false;
      s.shaking = true;
      s.shakeElapsed = 0;
      s.cameraOrigin.copy(camera.position);

      // Spawn dust particles at hinge world position
      const ox = position[0] + hingeOffset[0];
      const oy = position[1] + hingeOffset[1];
      const oz = position[2] + hingeOffset[2];
      const origin = new THREE.Vector3(ox, oy, oz);
      const newParticles: Particle[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() * Math.PI) / 2;
        const speed = 0.8 + Math.random() * 1.5;
        newParticles.push({
          position: origin
            .clone()
            .add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
              ),
            ),
          velocity: new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.cos(phi) * speed * 0.5 + 0.5,
            Math.sin(phi) * Math.sin(theta) * speed,
          ),
          life: PARTICLE_LIFETIME,
          ref: particleMeshRefs.current[i],
        });
      }
      particlesRef.current = newParticles;
    }

    // --- Falling edge: active just became false ---
    if (!active && s.prevActive) {
      s.bursting = false;
      s.burstCompleted = false;
    }

    s.prevActive = active;

    // --- Door angle ---
    if (s.bursting) {
      s.burstElapsed += dt;
      const t = Math.min(s.burstElapsed / BURST_DURATION, 1);
      const ease = 1 - (1 - t) * (1 - t); // ease-out quad
      s.currentAngle = ease * BURST_ANGLE;
      if (t >= 1 && !s.burstCompleted) {
        s.burstCompleted = true;
        onBurstCompleteRef.current();
      }
    } else {
      // Smooth close
      const closeRate = dt / CLOSE_DURATION;
      s.currentAngle = s.currentAngle * (1 - closeRate * 3);
      if (Math.abs(s.currentAngle) < 0.001) {
        s.currentAngle = 0;
      }
    }

    if (hingeRef.current) {
      hingeRef.current.rotation.y = s.currentAngle;
    }

    // --- Camera shake ---
    if (s.shaking) {
      s.shakeElapsed += dt;
      if (s.shakeElapsed < SHAKE_DURATION) {
        const intensity = SHAKE_MAGNITUDE * (1 - s.shakeElapsed / SHAKE_DURATION);
        camera.position.set(
          s.cameraOrigin.x + (Math.random() - 0.5) * 2 * intensity,
          s.cameraOrigin.y + (Math.random() - 0.5) * 2 * intensity,
          s.cameraOrigin.z + (Math.random() - 0.5) * 2 * intensity,
        );
      } else {
        camera.position.copy(s.cameraOrigin);
        s.shaking = false;
      }
    }

    // --- Particle update ---
    const particles = particlesRef.current;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.life <= 0) {
        if (p.ref.current) {
          p.ref.current.visible = false;
        }
        continue;
      }
      p.life -= dt;
      p.velocity.y += GRAVITY * dt;
      p.position.addScaledVector(p.velocity, dt);
      if (p.ref.current) {
        p.ref.current.position.copy(p.position);
        p.ref.current.visible = true;
        const opacity = Math.max(0, p.life / PARTICLE_LIFETIME);
        const mat = p.ref.current.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = opacity;
        }
      }
    }
  });

  return (
    <group position={position}>
      {/* Hinge pivot group offset to hinge edge, rotates door on Y */}
      <group position={hingeOffset}>
        <group ref={hingeRef}>
          {/* Door mesh: offset +doorLocalX so left edge is at hinge */}
          <mesh position={[doorLocalX, 0, 0]}>
            <boxGeometry args={[DOOR_W, DOOR_H, DOOR_D]} />
            <meshStandardMaterial color="#4a3728" roughness={0.8} metalness={0.1} />
          </mesh>
        </group>
      </group>

      {/* Dust particles — pre-allocated, hidden until burst */}
      {particleMeshRefs.current.map((ref, i) => (
        <mesh key={`particle-${i}`} ref={ref} visible={false}>
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshBasicMaterial color="#a08060" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
