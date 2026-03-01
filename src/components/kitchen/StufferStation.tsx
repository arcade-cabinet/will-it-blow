import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import * as THREE from 'three/webgpu';

interface StufferStationProps {
  position?: [number, number, number];
  fillLevel: number; // 0-100
  pressureLevel: number; // 0-100
  isPressing: boolean; // Whether player is pressing
  hasBurst: boolean; // Trigger burst animation
}

// Stuffer sits on the right counter/island (GLB Cube), surface at y=2.68
const DEFAULT_STUFFER_POS: [number, number, number] = [2.28, 2.68, 2.25];
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

export const StufferStation = ({
  position = DEFAULT_STUFFER_POS,
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

  // Burst animation state
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

  // Refs for burst particle meshes
  const burstRefs = useRef<(THREE.Mesh | null)[]>(
    Array.from({length: BURST_PARTICLE_COUNT}, () => null),
  );

  // Derived values for casing inflation
  const inflationFactor = 1 + (fillLevel / 100) * 2.5; // Up to 3.5x diameter

  // Meat fill scale
  const meatScale = Math.max(0.05, 1.0 - fillLevel / 100);
  const meatVisible = meatScale > 0.06;

  useFrame((_, delta) => {
    timeRef.current += delta;

    // --- Plunger movement: moves down as fill increases ---
    const plungerTravel = BODY_HEIGHT * 0.8;
    const plungerTopY = STUFFER_BASE_Y + BODY_HEIGHT - PLUNGER_HEIGHT / 2;
    const plungerTargetY = plungerTopY - (fillLevel / 100) * plungerTravel;

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

    // --- Burst animation ---
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
      const burstOriginX = BODY_DIAMETER / 2 + 0.3 + CASING_BASE_LENGTH / 2;
      const burstOriginY = STUFFER_BASE_Y + BODY_HEIGHT * 0.25;
      for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
        bs.positions[i] = [
          burstOriginX + Math.sin(i * 1.7) * 0.15,
          burstOriginY + Math.cos(i * 2.3) * 0.1,
          Math.sin(i * 1.3) * 0.15,
        ];
        bs.velocities[i] = [
          (Math.sin(i * 1.7) - 0.5) * 6,
          Math.abs(Math.cos(i * 2.3)) * 4 + 1,
          (Math.cos(i * 1.3) - 0.5) * 6,
        ];
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

  return (
    <group position={position}>
      {/* Counter surface provided by GLB Cube (right island) — no procedural counter needed */}

      {/* --- Stuffer Body (vertical cylinder - main tube) --- */}
      <mesh ref={bodyRef} position={[0, STUFFER_BASE_Y + BODY_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[BODY_DIAMETER / 2, BODY_DIAMETER / 2, BODY_HEIGHT, 16]} />
        <meshBasicMaterial color={[0.5, 0.5, 0.55]} />
      </mesh>

      {/* --- Plunger (moves down with fill, animated in useFrame) --- */}
      <mesh ref={plungerRef} position={[0, STUFFER_BASE_Y + BODY_HEIGHT - PLUNGER_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[BODY_DIAMETER * 0.45, BODY_DIAMETER * 0.45, PLUNGER_HEIGHT, 16]} />
        <meshBasicMaterial color={[0.6, 0.6, 0.65]} />
      </mesh>

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

      {/* --- Burst Particles (animated in useFrame) --- */}
      {BURST_PARTICLE_SIZES.map((size, i) => (
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
