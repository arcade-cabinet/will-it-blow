import {useFrame} from '@react-three/fiber';
import {useMemo, useRef} from 'react';
import * as THREE from 'three';

interface GrinderStationProps {
  grindProgress: number; // 0-100
  crankAngle: number; // Current rotation angle in radians
  isSplattering: boolean; // Trigger splatter visual
}

// Grinder sits on a counter near the back wall, aligned with the grinder waypoint
const GRINDER_POS: [number, number, number] = [0, 0, -5];
const COUNTER_HEIGHT = 0.9;
const GRINDER_BASE_Y = COUNTER_HEIGHT;

// Geometry constants
const BODY_HEIGHT = 0.7;
const HOPPER_HEIGHT = 0.5;
const CRANK_ARM_LENGTH = 0.5;

// Particle counts
const MEAT_CHUNK_COUNT = 6;
const OUTPUT_PARTICLE_MAX = 12;
const SPLATTER_PARTICLE_COUNT = 10;

// Splatter duration in seconds
const SPLATTER_DURATION = 0.8;

// Pre-compute meat chunk layout (deterministic for consistent rendering)
const MEAT_CHUNK_LAYOUT = Array.from({length: MEAT_CHUNK_COUNT}, (_, i) => {
  const angle = (i / MEAT_CHUNK_COUNT) * Math.PI * 2;
  const radius = 0.14 + i * 0.013; // Deterministic spread instead of random
  const yOffset = (i * 0.03) % 0.2;
  const size = 0.08 + i * 0.01; // Slight size variation, deterministic
  return {
    x: Math.cos(angle) * radius,
    y: GRINDER_BASE_Y + BODY_HEIGHT + HOPPER_HEIGHT * 0.3 + yOffset,
    z: Math.sin(angle) * radius,
    size,
  };
});

// Pre-compute output particle layout
const OUTPUT_PARTICLE_LAYOUT = Array.from({length: OUTPUT_PARTICLE_MAX}, (_, i) => ({
  x: ((i % 3) - 1) * 0.05,
  y: GRINDER_BASE_Y + BODY_HEIGHT * 0.2 - i * 0.04,
  z: 0.55 + (i % 4) * 0.025,
}));

// Pre-compute splatter particle sizes
const SPLATTER_SIZES = Array.from({length: SPLATTER_PARTICLE_COUNT}, (_, i) => 0.05 + i * 0.008);

export const GrinderStation = ({grindProgress, crankAngle, isSplattering}: GrinderStationProps) => {
  const bodyRef = useRef<THREE.Mesh>(null);
  const crankArmRef = useRef<THREE.Mesh>(null);
  const knobRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Splatter animation state
  const splatterStateRef = useRef({
    active: false,
    time: 0,
    velocities: Array.from(
      {length: SPLATTER_PARTICLE_COUNT},
      () => [0, 0, 0] as [number, number, number],
    ),
    positions: Array.from(
      {length: SPLATTER_PARTICLE_COUNT},
      () => [0, 0, 0] as [number, number, number],
    ),
  });
  const prevSplatteringRef = useRef(false);

  // Refs for splatter particle meshes
  const splatterRefs = useRef<(THREE.Mesh | null)[]>(
    Array.from({length: SPLATTER_PARTICLE_COUNT}, () => null),
  );

  // Crank pivot point (right side of grinder body)
  const crankPivotX = 0.3;
  const crankPivotY = GRINDER_BASE_Y + BODY_HEIGHT * 0.5;
  const armRadius = CRANK_ARM_LENGTH / 2;

  // Meat chunk scale based on grind progress
  const chunkScale = Math.max(0, 1.0 - grindProgress / 100);
  const chunksVisible = chunkScale > 0.05;

  // Output particle visibility: proportional to progress
  const visibleOutputCount = Math.floor((grindProgress / 100) * OUTPUT_PARTICLE_MAX);

  // Memoize geometries to prevent re-creation each render
  const _geometries = useMemo(
    () => ({
      counter: new THREE.BoxGeometry(2.5, COUNTER_HEIGHT, 1.2),
      body: new THREE.CylinderGeometry(0.3, 0.3, BODY_HEIGHT, 16),
      hopper: new THREE.CylinderGeometry(0.35, 0.15, HOPPER_HEIGHT, 12),
      spout: new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8),
      crankArm: new THREE.CylinderGeometry(0.03, 0.03, CRANK_ARM_LENGTH, 8),
      knob: new THREE.SphereGeometry(0.06, 8, 8),
      meatChunk: new THREE.SphereGeometry(0.04, 6, 6), // Base radius, scaled per chunk
      outputParticle: new THREE.SphereGeometry(0.03, 4, 4),
      splatterParticle: new THREE.SphereGeometry(0.03, 4, 4),
    }),
    [],
  );

  useFrame((_, delta) => {
    timeRef.current += delta;

    // --- Crank arm rotation ---
    if (crankArmRef.current) {
      crankArmRef.current.position.x = crankPivotX + Math.cos(crankAngle) * armRadius;
      crankArmRef.current.position.y = crankPivotY + Math.sin(crankAngle) * armRadius;
      crankArmRef.current.rotation.z = crankAngle + Math.PI / 2;
    }

    // --- Crank knob at end of arm ---
    if (knobRef.current) {
      knobRef.current.position.x = crankPivotX + Math.cos(crankAngle) * CRANK_ARM_LENGTH;
      knobRef.current.position.y = crankPivotY + Math.sin(crankAngle) * CRANK_ARM_LENGTH;
    }

    // --- Grinder body vibration ---
    if (bodyRef.current) {
      if (grindProgress > 0 && grindProgress < 100) {
        const vibration = Math.sin(timeRef.current * 40) * 0.003;
        bodyRef.current.position.x = vibration;
      } else {
        bodyRef.current.position.x = 0;
      }
    }

    // --- Splatter animation ---
    const ss = splatterStateRef.current;

    // Detect rising edge of isSplattering
    if (isSplattering && !prevSplatteringRef.current) {
      ss.active = true;
      ss.time = 0;
      for (let i = 0; i < SPLATTER_PARTICLE_COUNT; i++) {
        ss.positions[i] = [0, GRINDER_BASE_Y + BODY_HEIGHT, 0];
        ss.velocities[i] = [
          Math.sin(i * 1.7) * 0.5 * 4, // Pseudo-random spread
          Math.abs(Math.cos(i * 2.3)) * 3 + 1,
          Math.cos(i * 1.3) * 0.5 * 4,
        ];
      }
    }
    prevSplatteringRef.current = isSplattering;

    if (ss.active) {
      ss.time += delta;
      const fadeScale = Math.max(0, 1.0 - ss.time / SPLATTER_DURATION);

      for (let i = 0; i < SPLATTER_PARTICLE_COUNT; i++) {
        const mesh = splatterRefs.current[i];
        if (!mesh) continue;

        // Update positions
        ss.positions[i][0] += ss.velocities[i][0] * delta;
        ss.positions[i][1] += ss.velocities[i][1] * delta;
        ss.positions[i][2] += ss.velocities[i][2] * delta;

        // Apply gravity
        ss.velocities[i][1] -= 9.8 * delta;

        mesh.position.set(ss.positions[i][0], ss.positions[i][1], ss.positions[i][2]);
        mesh.scale.setScalar(fadeScale);
        mesh.visible = true;
      }

      if (ss.time > SPLATTER_DURATION) {
        ss.active = false;
        for (let i = 0; i < SPLATTER_PARTICLE_COUNT; i++) {
          const mesh = splatterRefs.current[i];
          if (mesh) mesh.visible = false;
        }
      }
    } else {
      // Ensure hidden when not splattering
      for (let i = 0; i < SPLATTER_PARTICLE_COUNT; i++) {
        const mesh = splatterRefs.current[i];
        if (mesh) mesh.visible = false;
      }
    }
  });

  return (
    <group position={GRINDER_POS}>
      {/* --- Counter / Table --- */}
      <mesh position={[0, COUNTER_HEIGHT / 2, 0]}>
        <boxGeometry args={[2.5, COUNTER_HEIGHT, 1.2]} />
        <meshBasicMaterial color={[0.25, 0.18, 0.12]} />
      </mesh>

      {/* --- Grinder Body (main cylinder) --- */}
      <mesh ref={bodyRef} position={[0, GRINDER_BASE_Y + BODY_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.3, 0.3, BODY_HEIGHT, 16]} />
        <meshBasicMaterial color={[0.5, 0.5, 0.55]} />
      </mesh>

      {/* --- Hopper (wider top, narrower bottom — funnel shape) --- */}
      <mesh position={[0, GRINDER_BASE_Y + BODY_HEIGHT + HOPPER_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.35, 0.15, HOPPER_HEIGHT, 12]} />
        <meshBasicMaterial color={[0.55, 0.55, 0.6]} transparent opacity={0.85} />
      </mesh>

      {/* --- Spout (horizontal cylinder for meat output) --- */}
      <mesh
        position={[0, GRINDER_BASE_Y + BODY_HEIGHT * 0.35, 0.45]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
        <meshBasicMaterial color={[0.45, 0.45, 0.5]} />
      </mesh>

      {/* --- Crank Arm (animated in useFrame) --- */}
      <mesh
        ref={crankArmRef}
        position={[crankPivotX + armRadius, crankPivotY, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.03, 0.03, CRANK_ARM_LENGTH, 8]} />
        <meshBasicMaterial color={[0.6, 0.6, 0.65]} />
      </mesh>

      {/* --- Crank Knob (animated in useFrame) --- */}
      <mesh ref={knobRef} position={[crankPivotX + CRANK_ARM_LENGTH, crankPivotY, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={[0.7, 0.2, 0.2]} />
      </mesh>

      {/* --- Meat Chunks in Hopper --- */}
      {chunksVisible &&
        MEAT_CHUNK_LAYOUT.map((chunk, i) => (
          <mesh
            key={`meatChunk_${i}`}
            position={[chunk.x, chunk.y, chunk.z]}
            scale={[
              chunkScale * (chunk.size / 0.04),
              chunkScale * (chunk.size / 0.04),
              chunkScale * (chunk.size / 0.04),
            ]}
          >
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshBasicMaterial color={[0.6, 0.15, 0.1]} />
          </mesh>
        ))}

      {/* --- Ground Meat Output Particles --- */}
      {OUTPUT_PARTICLE_LAYOUT.map((p, i) => (
        <mesh key={`groundMeat_${i}`} position={[p.x, p.y, p.z]} visible={i < visibleOutputCount}>
          <sphereGeometry args={[0.03, 4, 4]} />
          <meshBasicMaterial color={[0.5, 0.12, 0.08]} />
        </mesh>
      ))}

      {/* --- Splatter Particles (animated in useFrame) --- */}
      {SPLATTER_SIZES.map((size, i) => (
        <mesh
          key={`splatter_${i}`}
          ref={el => {
            splatterRefs.current[i] = el;
          }}
          position={[0, GRINDER_BASE_Y + BODY_HEIGHT * 0.5, 0]}
          visible={false}
          scale={size / 0.03}
        >
          <sphereGeometry args={[0.03, 4, 4]} />
          <meshBasicMaterial color={[0.8, 0.05, 0.02]} />
        </mesh>
      ))}
    </group>
  );
};
