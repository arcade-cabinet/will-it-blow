import {useFrame} from '@react-three/fiber';
import type {RapierRigidBody} from '@react-three/rapier';
import {BallCollider, CylinderCollider, RigidBody} from '@react-three/rapier';
import {useEffect, useRef} from 'react';
import {Platform} from 'react-native';
import * as THREE from 'three/webgpu';

interface StufferStationProps {
  position: [number, number, number];
  fillLevel: number; // 0-100
  pressureLevel: number; // 0-100
  isPressing: boolean; // Whether player is pressing
  hasBurst: boolean; // Trigger burst animation
}

const STUFFER_BASE_Y = 0;

// Geometry constants
const BODY_HEIGHT = 1.0;
const BODY_DIAMETER = 0.5;
const PLUNGER_HEIGHT = 0.15;
const HANDLE_HEIGHT = 0.5;
const CASING_BASE_LENGTH = 1.2;
const CASING_BASE_DIAMETER = 0.15;

// Burst particle settings
const BURST_PARTICLE_COUNT = 16;

// Pre-compute burst particle sizes (deterministic)
const BURST_PARTICLE_SIZES = Array.from(
  {length: BURST_PARTICLE_COUNT},
  (_, i) => 0.03 + ((i * 0.005) % 0.04),
);

// Pre-compute burst particle initial velocities (deterministic, same as original)
const BURST_VELOCITIES = Array.from({length: BURST_PARTICLE_COUNT}, (_, i) => ({
  x: (Math.sin(i * 1.7) - 0.5) * 6,
  y: Math.abs(Math.cos(i * 2.3)) * 4 + 1,
  z: (Math.cos(i * 1.3) - 0.5) * 6,
}));

const isWeb = Platform.OS === 'web';

/** Linearly interpolate between two [r,g,b] tuples. */
function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Map pressureLevel (0-100) to a green->yellow->red color as [r,g,b]. */
export function pressureToColor(pressure: number): [number, number, number] {
  const green: [number, number, number] = [0.2, 0.7, 0.15];
  const yellow: [number, number, number] = [0.85, 0.75, 0.1];
  const red: [number, number, number] = [0.9, 0.1, 0.05];

  if (pressure <= 50) {
    return lerpColor(green, yellow, pressure / 50);
  }
  return lerpColor(yellow, red, (pressure - 50) / 50);
}

// ---------------------------------------------------------------------------
// BurstParticlePhysics — Rapier dynamic rigid body burst particle (web only)
// ---------------------------------------------------------------------------

interface BurstParticlePhysicsProps {
  index: number;
  size: number;
  originX: number;
  originY: number;
  active: boolean;
  fadeScale: number;
}

function BurstParticlePhysics({
  index,
  size,
  originX,
  originY,
  active,
  fadeScale,
}: BurstParticlePhysicsProps) {
  const rbRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const launchedRef = useRef(false);

  // When active transitions to true, reset position and apply impulse
  useEffect(() => {
    if (active && rbRef.current && !launchedRef.current) {
      launchedRef.current = true;
      const rb = rbRef.current;
      // Position at burst origin with slight scatter
      rb.setTranslation(
        {
          x: originX + Math.sin(index * 1.7) * 0.15,
          y: originY + Math.cos(index * 2.3) * 0.1,
          z: Math.sin(index * 1.3) * 0.15,
        },
        true,
      );
      rb.setLinvel({x: 0, y: 0, z: 0}, true);
      rb.setAngvel({x: 0, y: 0, z: 0}, true);
      // Apply initial velocity as impulse (mass ~= 1 for small sphere)
      const vel = BURST_VELOCITIES[index];
      rb.setLinvel({x: vel.x, y: vel.y, z: vel.z}, true);
    }
    if (!active) {
      launchedRef.current = false;
      // Move particle far away when inactive
      if (rbRef.current) {
        rbRef.current.setTranslation({x: 0, y: -100, z: 0}, true);
        rbRef.current.setLinvel({x: 0, y: 0, z: 0}, true);
        rbRef.current.setAngvel({x: 0, y: 0, z: 0}, true);
      }
    }
  }, [active, index, originX, originY]);

  // Fade-out scale animation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(active ? fadeScale * (size / 0.03) : 0);
    }
  });

  return (
    <RigidBody
      ref={rbRef}
      type="dynamic"
      position={[0, -100, 0]}
      colliders={false}
      restitution={0.5}
      friction={0.3}
      linearDamping={0.1}
    >
      <BallCollider args={[size]} />
      <mesh ref={meshRef} scale={0}>
        <sphereGeometry args={[0.03, 4, 4]} />
        <meshBasicMaterial color={[0.8, 0.08, 0.03]} />
      </mesh>
    </RigidBody>
  );
}

// ---------------------------------------------------------------------------
// StufferStation
// ---------------------------------------------------------------------------

export const StufferStation = ({
  position,
  fillLevel,
  pressureLevel,
  isPressing,
  hasBurst,
}: StufferStationProps) => {
  const timeRef = useRef(0);

  // Refs for animated meshes
  const bodyRef = useRef<THREE.Mesh>(null);
  const plungerRef = useRef<THREE.Mesh>(null);
  const handleRef = useRef<THREE.Mesh>(null);
  const handleKnobRef = useRef<THREE.Mesh>(null);
  const meatFillRef = useRef<THREE.Mesh>(null);
  const casingRef = useRef<THREE.Mesh>(null);
  const casingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const casingEndRef = useRef<THREE.Mesh>(null);
  const casingEndMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Kinematic plunger rigid body ref (web only)
  const plungerRbRef = useRef<RapierRigidBody>(null);

  // Burst state for native manual animation
  const burstStateRef = useRef({
    active: false,
    time: 0,
    velocities: Array.from(
      {length: BURST_PARTICLE_COUNT},
      () => [0, 0, 0] as [number, number, number],
    ),
    positions: Array.from(
      {length: BURST_PARTICLE_COUNT},
      () => [0, 0, 0] as [number, number, number],
    ),
  });
  const prevBurstRef = useRef(false);

  // Burst state for Rapier physics (web)
  const burstActiveRef = useRef(false);
  const burstTimeRef = useRef(0);
  const prevBurstWebRef = useRef(false);

  // Refs for native burst particle meshes
  const burstRefs = useRef<(THREE.Mesh | null)[]>(
    Array.from({length: BURST_PARTICLE_COUNT}, () => null),
  );

  // Derived values for casing inflation
  const inflationFactor = 1 + (fillLevel / 100) * 2.5; // Up to 3.5x diameter

  // Meat fill scale
  const meatScale = Math.max(0.05, 1.0 - fillLevel / 100);
  const meatVisible = meatScale > 0.06;

  // Burst origin for Rapier particles
  const burstOriginX = BODY_DIAMETER / 2 + 0.3 + CASING_BASE_LENGTH / 2;
  const burstOriginY = STUFFER_BASE_Y + BODY_HEIGHT * 0.25;

  useFrame((_, delta) => {
    timeRef.current += delta;

    // --- Plunger movement: moves down as fill increases ---
    const plungerTravel = BODY_HEIGHT * 0.8;
    const plungerTopY = STUFFER_BASE_Y + BODY_HEIGHT - PLUNGER_HEIGHT / 2;
    const plungerTargetY = plungerTopY - (fillLevel / 100) * plungerTravel;

    if (isWeb && plungerRbRef.current) {
      // Drive kinematic plunger via Rapier
      const jiggle = isPressing ? Math.sin(timeRef.current * 30) * 0.008 : 0;
      plungerRbRef.current.setNextKinematicTranslation({x: jiggle, y: plungerTargetY, z: 0});
    } else {
      // Native: move meshes directly
      if (plungerRef.current) {
        plungerRef.current.position.y = plungerTargetY;
      }
      if (handleRef.current) {
        handleRef.current.position.y = plungerTargetY + PLUNGER_HEIGHT / 2 + HANDLE_HEIGHT / 2;
      }
      if (handleKnobRef.current) {
        handleKnobRef.current.position.y = plungerTargetY + PLUNGER_HEIGHT / 2 + HANDLE_HEIGHT;
      }

      // Plunger jiggle when pressing
      if (isPressing) {
        const jiggle = Math.sin(timeRef.current * 30) * 0.008;
        if (plungerRef.current) plungerRef.current.position.x = jiggle;
        if (handleRef.current) handleRef.current.position.x = jiggle;
        if (handleKnobRef.current) handleKnobRef.current.position.x = jiggle;
      } else {
        if (plungerRef.current) plungerRef.current.position.x = 0;
        if (handleRef.current) handleRef.current.position.x = 0;
        if (handleKnobRef.current) handleKnobRef.current.position.x = 0;
      }
    }

    // Handle/knob follow plunger position on web too (visual only, not physics)
    if (isWeb) {
      if (handleRef.current) {
        const jiggle = isPressing ? Math.sin(timeRef.current * 30) * 0.008 : 0;
        handleRef.current.position.x = jiggle;
        handleRef.current.position.y = plungerTargetY + PLUNGER_HEIGHT / 2 + HANDLE_HEIGHT / 2;
      }
      if (handleKnobRef.current) {
        const jiggle = isPressing ? Math.sin(timeRef.current * 30) * 0.008 : 0;
        handleKnobRef.current.position.x = jiggle;
        handleKnobRef.current.position.y = plungerTargetY + PLUNGER_HEIGHT / 2 + HANDLE_HEIGHT;
      }
    }

    // --- Meat fill decreases as fill goes up ---
    if (meatFillRef.current) {
      meatFillRef.current.scale.y = meatScale;
      meatFillRef.current.position.y = STUFFER_BASE_Y + BODY_HEIGHT * 0.45 * meatScale;
      meatFillRef.current.visible = meatVisible;
    }

    // --- Casing inflation and pressure color ---
    const casingColor = pressureToColor(pressureLevel);
    const threeColor = new THREE.Color(casingColor[0], casingColor[1], casingColor[2]);

    let currentInflation = inflationFactor;

    // Casing pulsing when pressure is high
    if (pressureLevel > 70) {
      const pulseIntensity = ((pressureLevel - 70) / 30) * 0.08;
      const pulse = 1 + Math.sin(timeRef.current * 15) * pulseIntensity;
      currentInflation = inflationFactor * pulse;
    }

    if (casingRef.current) {
      casingRef.current.scale.x = currentInflation;
      casingRef.current.scale.z = currentInflation;
      casingRef.current.scale.y = 1; // Length stays constant (horizontal)
    }
    if (casingMatRef.current) {
      casingMatRef.current.color.copy(threeColor);
    }
    if (casingEndRef.current) {
      casingEndRef.current.scale.set(currentInflation, currentInflation, currentInflation);
    }
    if (casingEndMatRef.current) {
      casingEndMatRef.current.color.copy(threeColor);
    }

    // --- Burst: web uses Rapier, native uses manual animation ---
    if (isWeb) {
      // Track burst timing for fade-out scale
      if (hasBurst && !prevBurstWebRef.current) {
        burstActiveRef.current = true;
        burstTimeRef.current = 0;

        // Hide casing during burst
        if (casingRef.current) {
          casingRef.current.scale.x = 0.01;
          casingRef.current.scale.z = 0.01;
        }
        if (casingEndRef.current) {
          casingEndRef.current.visible = false;
        }
      }
      prevBurstWebRef.current = hasBurst;

      if (burstActiveRef.current) {
        burstTimeRef.current += delta;
        if (burstTimeRef.current > 1.0) {
          burstActiveRef.current = false;
          // Restore casing visibility
          if (casingEndRef.current) {
            casingEndRef.current.visible = true;
          }
        }
      }
    } else {
      // --- Native: manual burst animation ---
      const bs = burstStateRef.current;

      // Detect rising edge of hasBurst
      if (hasBurst && !prevBurstRef.current) {
        bs.active = true;
        bs.time = 0;

        // Hide casing temporarily during burst
        if (casingRef.current) {
          casingRef.current.scale.x = 0.01;
          casingRef.current.scale.z = 0.01;
        }
        if (casingEndRef.current) {
          casingEndRef.current.visible = false;
        }

        // Launch particles from casing position
        for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
          bs.positions[i] = [
            burstOriginX + Math.sin(i * 1.7) * 0.15,
            burstOriginY + Math.cos(i * 2.3) * 0.1,
            Math.sin(i * 1.3) * 0.15,
          ];
          bs.velocities[i] = [BURST_VELOCITIES[i].x, BURST_VELOCITIES[i].y, BURST_VELOCITIES[i].z];
        }
      }
      prevBurstRef.current = hasBurst;

      if (bs.active) {
        bs.time += delta;
        const fadeScale = Math.max(0, 1.0 - bs.time / 1.0);

        for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
          const mesh = burstRefs.current[i];
          if (!mesh) continue;

          // Update positions
          bs.positions[i][0] += bs.velocities[i][0] * delta;
          bs.positions[i][1] += bs.velocities[i][1] * delta;
          bs.positions[i][2] += bs.velocities[i][2] * delta;

          // Apply gravity
          bs.velocities[i][1] -= 9.8 * delta;

          mesh.position.set(bs.positions[i][0], bs.positions[i][1], bs.positions[i][2]);
          mesh.scale.setScalar(fadeScale);
          mesh.visible = true;
        }

        if (bs.time > 1.0) {
          bs.active = false;
          for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
            const mesh = burstRefs.current[i];
            if (mesh) mesh.visible = false;
          }
          // Restore casing visibility
          if (casingEndRef.current) {
            casingEndRef.current.visible = true;
          }
        }
      } else {
        // Ensure particles are hidden when not bursting
        for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
          const mesh = burstRefs.current[i];
          if (mesh) mesh.visible = false;
        }
      }
    }

    // --- Subtle body vibration when pressing ---
    if (bodyRef.current) {
      if (isPressing && fillLevel > 0 && fillLevel < 100) {
        const vibration = Math.sin(timeRef.current * 35) * 0.004;
        bodyRef.current.position.x = vibration;
      } else {
        bodyRef.current.position.x = 0;
      }
    }
  });

  // Compute fade scale for Rapier burst particles
  const burstFadeScale = burstActiveRef.current ? Math.max(0, 1.0 - burstTimeRef.current / 1.0) : 0;

  // --- Stuffer body mesh ---
  const bodyMesh = (
    <mesh ref={bodyRef} position={isWeb ? undefined : [0, STUFFER_BASE_Y + BODY_HEIGHT / 2, 0]}>
      <cylinderGeometry args={[BODY_DIAMETER / 2, BODY_DIAMETER / 2, BODY_HEIGHT, 16]} />
      <meshBasicMaterial color={[0.5, 0.5, 0.55]} />
    </mesh>
  );

  // --- Plunger assembly (plunger disc + handle + knob) ---
  const plungerMesh = (
    <mesh
      ref={plungerRef}
      position={isWeb ? undefined : [0, STUFFER_BASE_Y + BODY_HEIGHT - PLUNGER_HEIGHT / 2, 0]}
    >
      <cylinderGeometry args={[BODY_DIAMETER * 0.45, BODY_DIAMETER * 0.45, PLUNGER_HEIGHT, 16]} />
      <meshBasicMaterial color={[0.6, 0.6, 0.65]} />
    </mesh>
  );

  return (
    <group position={position}>
      {/* --- Stuffer Body (vertical cylinder - main tube) --- */}
      {isWeb ? (
        <RigidBody
          type="fixed"
          position={[0, STUFFER_BASE_Y + BODY_HEIGHT / 2, 0]}
          colliders={false}
        >
          <CylinderCollider args={[BODY_HEIGHT / 2, BODY_DIAMETER / 2]} />
          {bodyMesh}
        </RigidBody>
      ) : (
        bodyMesh
      )}

      {/* --- Plunger (moves down with fill) --- */}
      {isWeb ? (
        <RigidBody
          ref={plungerRbRef}
          type="kinematicPosition"
          position={[0, STUFFER_BASE_Y + BODY_HEIGHT - PLUNGER_HEIGHT / 2, 0]}
          colliders={false}
        >
          <CylinderCollider args={[PLUNGER_HEIGHT / 2, BODY_DIAMETER * 0.45]} />
          {plungerMesh}
        </RigidBody>
      ) : (
        plungerMesh
      )}

      {/* --- Plunger Handle (thin cylinder on top of plunger) --- */}
      <mesh ref={handleRef} position={[0, STUFFER_BASE_Y + BODY_HEIGHT + HANDLE_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, HANDLE_HEIGHT, 8]} />
        <meshBasicMaterial color={[0.55, 0.55, 0.6]} />
      </mesh>

      {/* --- Handle Knob (sphere at top of handle) --- */}
      <mesh ref={handleKnobRef} position={[0, STUFFER_BASE_Y + BODY_HEIGHT + HANDLE_HEIGHT, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color={[0.7, 0.2, 0.2]} />
      </mesh>

      {/* --- Spout (horizontal cylinder connecting body to casing) --- */}
      <mesh
        position={[BODY_DIAMETER / 2 + 0.15, STUFFER_BASE_Y + BODY_HEIGHT * 0.25, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
        <meshBasicMaterial color={[0.45, 0.45, 0.5]} />
      </mesh>

      {/* --- Casing (horizontal cylinder, inflates with fill, color from pressure) --- */}
      <mesh
        ref={casingRef}
        position={[
          BODY_DIAMETER / 2 + 0.3 + CASING_BASE_LENGTH / 2,
          STUFFER_BASE_Y + BODY_HEIGHT * 0.25,
          0,
        ]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry
          args={[CASING_BASE_DIAMETER / 2, CASING_BASE_DIAMETER / 2, CASING_BASE_LENGTH, 16]}
        />
        <meshBasicMaterial ref={casingMatRef} color={[0.2, 0.7, 0.15]} transparent opacity={0.85} />
      </mesh>

      {/* --- Casing End Cap (sphere at end of casing) --- */}
      <mesh
        ref={casingEndRef}
        position={[
          BODY_DIAMETER / 2 + 0.3 + CASING_BASE_LENGTH,
          STUFFER_BASE_Y + BODY_HEIGHT * 0.25,
          0,
        ]}
      >
        <sphereGeometry args={[CASING_BASE_DIAMETER / 2, 8, 8]} />
        <meshBasicMaterial
          ref={casingEndMatRef}
          color={[0.2, 0.7, 0.15]}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* --- Meat Fill Inside Body --- */}
      <mesh ref={meatFillRef} position={[0, STUFFER_BASE_Y + BODY_HEIGHT * 0.45, 0]}>
        <cylinderGeometry
          args={[BODY_DIAMETER * 0.425, BODY_DIAMETER * 0.425, BODY_HEIGHT * 0.9, 16]}
        />
        <meshBasicMaterial color={[0.55, 0.12, 0.08]} />
      </mesh>

      {/* --- Burst Particles --- */}
      {isWeb
        ? BURST_PARTICLE_SIZES.map((size, i) => (
            <BurstParticlePhysics
              key={`burstParticle_${i}`}
              index={i}
              size={size}
              originX={burstOriginX}
              originY={burstOriginY}
              active={burstActiveRef.current}
              fadeScale={burstFadeScale}
            />
          ))
        : BURST_PARTICLE_SIZES.map((size, i) => (
            <mesh
              key={`burstParticle_${i}`}
              ref={el => {
                burstRefs.current[i] = el;
              }}
              position={[
                BODY_DIAMETER / 2 + 0.3 + CASING_BASE_LENGTH / 2,
                STUFFER_BASE_Y + BODY_HEIGHT * 0.25,
                0,
              ]}
              visible={false}
              scale={size / 0.03}
            >
              <sphereGeometry args={[0.03, 4, 4]} />
              <meshBasicMaterial color={[0.8, 0.08, 0.03]} />
            </mesh>
          ))}
    </group>
  );
};
