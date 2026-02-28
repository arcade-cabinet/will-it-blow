import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type * as THREE from 'three/webgpu';

interface StoveStationProps {
  temperature: number; // Current temp (room temp ~70 to max ~250)
  heatLevel: number; // 0-1 (burner intensity)
}

// Stove position near back wall
const STOVE_POS: [number, number, number] = [0, 0, -6.5];
const FLOOR_Y = 0;

// Stove geometry constants
const STOVE_WIDTH = 1.8;
const STOVE_HEIGHT = 0.9;
const STOVE_DEPTH = 1.2;
const PAN_RADIUS = 0.4;
const PAN_HEIGHT = 0.06;
const PAN_Y = FLOOR_Y + STOVE_HEIGHT + 0.06 + PAN_HEIGHT / 2;

// Thermometer constants
const THERMO_HEIGHT = 0.8;
const THERMO_X = STOVE_WIDTH / 2 + 0.3;
const THERMO_BASE_Y = FLOOR_Y + STOVE_HEIGHT * 0.2;

// Temperature color thresholds
const COLOR_PINK: [number, number, number] = [1.0, 0.714, 0.757];
const COLOR_BROWN: [number, number, number] = [0.545, 0.271, 0.075];
const COLOR_BLACK: [number, number, number] = [0.1, 0.1, 0.1];

// Notional target for color computation
const NOTIONAL_TARGET = 160;
const NOTIONAL_TOLERANCE = 10;

// Particle counts
const SIZZLE_PARTICLE_COUNT = 12;
const SMOKE_PARTICLE_COUNT = 10;

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Compute sausage color based on temperature relative to a target zone.
 *  Returns [r, g, b] tuple.
 */
export function sausageColor(temp: number): [number, number, number] {
  const lowThreshold = NOTIONAL_TARGET - 20;
  const perfectLow = NOTIONAL_TARGET - NOTIONAL_TOLERANCE;
  const perfectHigh = NOTIONAL_TARGET + NOTIONAL_TOLERANCE;
  const highThreshold = NOTIONAL_TARGET + 20;

  if (temp <= lowThreshold) {
    return COLOR_PINK;
  }
  if (temp <= perfectLow) {
    const t = (temp - lowThreshold) / (perfectLow - lowThreshold);
    return lerp3(COLOR_PINK, COLOR_BROWN, t);
  }
  if (temp <= perfectHigh) {
    return COLOR_BROWN;
  }
  if (temp <= highThreshold) {
    const t = (temp - perfectHigh) / (highThreshold - perfectHigh);
    return lerp3(COLOR_BROWN, COLOR_BLACK, t);
  }
  return COLOR_BLACK;
}

export const StoveStation = ({temperature, heatLevel}: StoveStationProps) => {
  const timeRef = useRef(0);

  // Refs for animated meshes/materials
  const burnerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const sausageRef = useRef<THREE.Mesh>(null);
  const sausageCapLRef = useRef<THREE.Mesh>(null);
  const sausageCapRRef = useRef<THREE.Mesh>(null);
  const sausageMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const thermoFillRef = useRef<THREE.Mesh>(null);
  const thermoFillMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const panRef = useRef<THREE.Mesh>(null);

  // Sizzle particle refs and state
  const sizzleRefs = useRef<(THREE.Mesh | null)[]>(
    Array.from({length: SIZZLE_PARTICLE_COUNT}, () => null),
  );
  const sizzleState = useRef(
    Array.from({length: SIZZLE_PARTICLE_COUNT}, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.5,
      active: false,
    })),
  );
  const sizzleTimerRef = useRef(0);

  // Smoke particle refs and state
  const smokeRefs = useRef<(THREE.Mesh | null)[]>(
    Array.from({length: SMOKE_PARTICLE_COUNT}, () => null),
  );
  const smokeState = useRef(
    Array.from({length: SMOKE_PARTICLE_COUNT}, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1.0,
      active: false,
    })),
  );
  const smokeTimerRef = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // Clamp delta to prevent huge jumps
    timeRef.current += dt;
    const heat = heatLevel;
    const temp = temperature;

    // --- Burner color: dark red when off, bright orange when full heat ---
    if (burnerMatRef.current) {
      const offR = 0.3,
        offG = 0.05,
        offB = 0.02;
      const onR = 1.0,
        onG = 0.5,
        onB = 0.05;
      let r = offR + (onR - offR) * heat;
      const g = offG + (onG - offG) * heat;
      const b = offB + (onB - offB) * heat;

      // Flicker when heat is on
      if (heat > 0.1) {
        const flicker = Math.sin(timeRef.current * 20) * 0.05 * heat;
        r = Math.min(1, r + flicker);
      }
      burnerMatRef.current.color.setRGB(r, g, b);
    }

    // --- Sausage color based on temperature ---
    if (sausageMatRef.current) {
      const [r, g, b] = sausageColor(temp);
      sausageMatRef.current.color.setRGB(r, g, b);
    }

    // --- Sausage wobble when hot ---
    const sausageBaseY = PAN_Y + PAN_HEIGHT / 2 + 0.07;
    if (heat > 0.3 && sausageRef.current) {
      const wobble = Math.sin(timeRef.current * 25) * 0.003 * heat;
      const y = sausageBaseY + wobble;
      sausageRef.current.position.y = y;
      if (sausageCapLRef.current) sausageCapLRef.current.position.y = y;
      if (sausageCapRRef.current) sausageCapRRef.current.position.y = y;
    }

    // --- Thermometer fill based on temperature ---
    if (thermoFillRef.current) {
      const tempNorm = Math.max(0, Math.min(1, (temp - 70) / 180));
      const fillScale = Math.max(0.02, tempNorm);
      thermoFillRef.current.scale.y = fillScale;
      thermoFillRef.current.position.y = THERMO_BASE_Y + THERMO_HEIGHT * 0.45 * fillScale;
    }

    // --- Thermometer color: blue (cold) -> green (target) -> red (hot) ---
    if (thermoFillMatRef.current) {
      if (temp < NOTIONAL_TARGET - NOTIONAL_TOLERANCE) {
        const coldT = Math.min(1, (temp - 70) / (NOTIONAL_TARGET - NOTIONAL_TOLERANCE - 70));
        const r = 0.1 + (0.1 - 0.1) * coldT;
        const g = 0.3 + (0.7 - 0.3) * coldT;
        const b = 0.8 + (0.2 - 0.8) * coldT;
        thermoFillMatRef.current.color.setRGB(r, g, b);
      } else if (temp <= NOTIONAL_TARGET + NOTIONAL_TOLERANCE) {
        thermoFillMatRef.current.color.setRGB(0.1, 0.8, 0.2);
      } else {
        const hotT = Math.min(1, (temp - NOTIONAL_TARGET - NOTIONAL_TOLERANCE) / 40);
        const r = 0.1 + (0.9 - 0.1) * hotT;
        const g = 0.7 + (0.1 - 0.7) * hotT;
        const b = 0.2 + (0.05 - 0.2) * hotT;
        thermoFillMatRef.current.color.setRGB(r, g, b);
      }
    }

    // --- Heat haze shimmer near pan ---
    if (panRef.current) {
      if (heat > 0.5) {
        const hazeWobble = Math.sin(timeRef.current * 12) * 0.002 * heat;
        panRef.current.position.x = hazeWobble;
      } else {
        panRef.current.position.x = 0;
      }
    }

    // --- Sizzle particles when heat > 0.3 ---
    if (heat > 0.3) {
      sizzleTimerRef.current += dt;
      const spawnInterval = 0.08 / heat;

      if (sizzleTimerRef.current >= spawnInterval) {
        sizzleTimerRef.current = 0;
        for (let i = 0; i < SIZZLE_PARTICLE_COUNT; i++) {
          const s = sizzleState.current[i];
          if (!s.active) {
            s.active = true;
            s.x = (Math.random() - 0.5) * PAN_RADIUS * 1.4;
            s.y = PAN_Y + PAN_HEIGHT / 2;
            s.z = (Math.random() - 0.5) * PAN_RADIUS * 1.4;
            s.vx = (Math.random() - 0.5) * 0.4;
            s.vy = Math.random() * 1.5 + 0.5;
            s.vz = (Math.random() - 0.5) * 0.4;
            s.life = 0;
            s.maxLife = 0.2 + Math.random() * 0.3;
            break;
          }
        }
      }
    }

    // Update sizzle particles
    for (let i = 0; i < SIZZLE_PARTICLE_COUNT; i++) {
      const s = sizzleState.current[i];
      const mesh = sizzleRefs.current[i];
      if (!mesh) continue;

      if (s.active) {
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        s.vy -= 3.0 * dt; // gravity

        const fadeScale = Math.max(0, 1.0 - s.life / s.maxLife);
        mesh.position.set(s.x, s.y, s.z);
        mesh.scale.setScalar(fadeScale);
        mesh.visible = true;

        if (s.life >= s.maxLife) {
          s.active = false;
          mesh.visible = false;
        }
      } else {
        mesh.visible = false;
      }
    }

    // --- Smoke particles when temperature is above target zone ---
    const isOverheating = temp > NOTIONAL_TARGET + NOTIONAL_TOLERANCE;
    if (isOverheating) {
      smokeTimerRef.current += dt;
      const smokeRate = 0.15 - Math.min(0.1, (temp - NOTIONAL_TARGET - NOTIONAL_TOLERANCE) / 200);

      if (smokeTimerRef.current >= smokeRate) {
        smokeTimerRef.current = 0;
        for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
          const s = smokeState.current[i];
          if (!s.active) {
            s.active = true;
            s.x = (Math.random() - 0.5) * 0.2;
            s.y = PAN_Y + 0.15;
            s.z = (Math.random() - 0.5) * 0.2;
            s.vx = (Math.random() - 0.5) * 0.12;
            s.vy = Math.random() * 0.5 + 0.3;
            s.vz = (Math.random() - 0.5) * 0.12;
            s.life = 0;
            s.maxLife = 1.0 + Math.random() * 0.6;
            break;
          }
        }
      }
    }

    // Update smoke particles
    for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
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
        const fadeAlpha = Math.max(0, 1.0 - lifeNorm);

        mesh.position.set(s.x, s.y, s.z);
        mesh.scale.setScalar(expandScale);
        mesh.visible = true;

        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat) mat.opacity = fadeAlpha * 0.4;

        if (s.life >= s.maxLife) {
          s.active = false;
          mesh.visible = false;
        }
      } else {
        mesh.visible = false;
      }
    }
  });

  const sausageBaseY = PAN_Y + PAN_HEIGHT / 2 + 0.07;

  return (
    <group position={STOVE_POS}>
      {/* --- Stove Body --- */}
      <mesh position={[0, FLOOR_Y + STOVE_HEIGHT / 2, 0]}>
        <boxGeometry args={[STOVE_WIDTH, STOVE_HEIGHT, STOVE_DEPTH]} />
        <meshBasicMaterial color={[0.15, 0.15, 0.17]} />
      </mesh>

      {/* --- Stove Top Surface (slightly lighter) --- */}
      <mesh position={[0, FLOOR_Y + STOVE_HEIGHT + 0.02, 0]}>
        <boxGeometry args={[STOVE_WIDTH + 0.05, 0.04, STOVE_DEPTH + 0.05]} />
        <meshBasicMaterial color={[0.2, 0.2, 0.22]} />
      </mesh>

      {/* --- Burner Ring (torus) --- */}
      <mesh position={[0, FLOOR_Y + STOVE_HEIGHT + 0.06, 0]}>
        <torusGeometry args={[0.35, 0.03, 12, 24]} />
        <meshBasicMaterial ref={burnerMatRef} color={[0.3, 0.05, 0.02]} />
      </mesh>

      {/* --- Frying Pan --- */}
      <mesh ref={panRef} position={[0, PAN_Y, 0]}>
        <cylinderGeometry args={[PAN_RADIUS, PAN_RADIUS, PAN_HEIGHT, 24]} />
        <meshBasicMaterial color={[0.2, 0.2, 0.22]} />
      </mesh>

      {/* --- Pan Handle --- */}
      <mesh position={[0, PAN_Y, PAN_RADIUS + 0.25]}>
        <boxGeometry args={[0.06, 0.04, 0.5]} />
        <meshBasicMaterial color={[0.12, 0.12, 0.14]} />
      </mesh>

      {/* --- Sausage in Pan (horizontal cylinder) --- */}
      <mesh ref={sausageRef} position={[0, sausageBaseY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 12]} />
        <meshBasicMaterial ref={sausageMatRef} color={COLOR_PINK} />
      </mesh>

      {/* --- Sausage End Caps (spheres) --- */}
      <mesh ref={sausageCapLRef} position={[-0.25, sausageBaseY, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color={COLOR_PINK} />
      </mesh>
      <mesh ref={sausageCapRRef} position={[0.25, sausageBaseY, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color={COLOR_PINK} />
      </mesh>

      {/* --- Thermometer Tube (outer) --- */}
      <mesh position={[THERMO_X, THERMO_BASE_Y + THERMO_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, THERMO_HEIGHT, 12]} />
        <meshBasicMaterial color={[0.3, 0.3, 0.32]} />
      </mesh>

      {/* --- Thermometer Fill (inner, scales with temperature) --- */}
      <mesh ref={thermoFillRef} position={[THERMO_X, THERMO_BASE_Y + THERMO_HEIGHT * 0.45, 0]}>
        <cylinderGeometry args={[0.025, 0.025, THERMO_HEIGHT * 0.9, 12]} />
        <meshBasicMaterial ref={thermoFillMatRef} color={[0.8, 0.1, 0.05]} />
      </mesh>

      {/* --- Thermometer Bulb (bottom sphere) --- */}
      <mesh position={[THERMO_X, THERMO_BASE_Y, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={[0.8, 0.1, 0.05]} />
      </mesh>

      {/* --- Sizzle Particles --- */}
      {Array.from({length: SIZZLE_PARTICLE_COUNT}, (_, i) => (
        <mesh
          key={`sizzle_${i}`}
          ref={el => {
            sizzleRefs.current[i] = el;
          }}
          position={[0, PAN_Y, 0]}
          visible={false}
        >
          <sphereGeometry args={[0.01 + (i % 3) * 0.005, 4, 4]} />
          <meshBasicMaterial color={[1.0, 0.85, 0.3]} />
        </mesh>
      ))}

      {/* --- Smoke Particles --- */}
      {Array.from({length: SMOKE_PARTICLE_COUNT}, (_, i) => (
        <mesh
          key={`smoke_${i}`}
          ref={el => {
            smokeRefs.current[i] = el;
          }}
          position={[0, PAN_Y + 0.3, 0]}
          visible={false}
        >
          <sphereGeometry args={[0.04 + (i % 3) * 0.015, 4, 4]} />
          <meshBasicMaterial color={[0.6, 0.6, 0.6]} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
};
