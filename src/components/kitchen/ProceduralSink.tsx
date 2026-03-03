/**
 * @module ProceduralSink
 * Procedural sink station built entirely from Three.js geometry — no GLBs.
 *
 * Geometry:
 * - Basin: LatheGeometry (bowl shape), chrome PBR material
 * - Faucet: three CylinderGeometry segments (vertical riser, elbow, horizontal spout)
 * - Hot tap handle (red torus) + Cold tap handle (blue torus)
 * - Back splash: BoxGeometry wall piece
 *
 * Interactivity:
 * - Hot/cold taps toggle on click (45° X-axis rotation animation)
 * - Water stream when at least one tap is on: translucent blue particle column
 * - Splash particle burst at basin impact
 *
 * Wash mechanic:
 * - When `onItemWashed` prop is provided, items dropped on the sink (via GrabSystem)
 *   are washed over 3 seconds with visible soap bubble particles.
 */

import {useFrame} from '@react-three/fiber';
import {useCallback, useMemo, useRef, useState} from 'react';
import * as THREE from 'three/webgpu';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHROME_METALNESS = 0.9;
const CHROME_ROUGHNESS = 0.1;
const CHROME_COLOR = '#aaaaaa';
const BASIN_RADIUS_TOP = 0.28;
const BASIN_RADIUS_BOTTOM = 0.16;
const BASIN_HEIGHT = 0.22;
const SPLASH_DURATION = 0.4; // seconds per splash burst
const WASH_DURATION = 3.0; // seconds to wash one item

// ---------------------------------------------------------------------------
// Lathe profile — bowl cross-section in the XY plane (radius, y)
// ---------------------------------------------------------------------------

const BASIN_PROFILE: Array<[number, number]> = [
  [BASIN_RADIUS_BOTTOM, 0],
  [BASIN_RADIUS_BOTTOM + 0.02, BASIN_HEIGHT * 0.25],
  [BASIN_RADIUS_TOP - 0.02, BASIN_HEIGHT * 0.75],
  [BASIN_RADIUS_TOP, BASIN_HEIGHT],
  [BASIN_RADIUS_TOP + 0.02, BASIN_HEIGHT + 0.01], // rim lip
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Chrome PBR material — shared across all chrome surfaces. */
function ChromeMaterial() {
  return (
    <meshStandardMaterial
      color={CHROME_COLOR}
      metalness={CHROME_METALNESS}
      roughness={CHROME_ROUGHNESS}
    />
  );
}

interface TapHandleProps {
  position: [number, number, number];
  color: string;
  on: boolean;
  onClick: () => void;
}

/** Torus-shaped tap handle with click interaction and open/closed rotation. */
function TapHandle({position, color, on, onClick}: TapHandleProps) {
  const targetRot = on ? -Math.PI / 4 : 0;
  const rotRef = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    rotRef.current += (targetRot - rotRef.current) * Math.min(1, delta * 8);
    meshRef.current.rotation.x = rotRef.current;
  });

  return (
    <mesh ref={meshRef} position={position} onClick={onClick}>
      <torusGeometry args={[0.045, 0.014, 8, 24]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
    </mesh>
  );
}

interface WaterStreamProps {
  spoutPosition: [number, number, number];
  basinY: number;
  active: boolean;
}

/** Vertical translucent particle column from spout to basin + splash at impact. */
function WaterStream({spoutPosition, basinY, active}: WaterStreamProps) {
  const streamRef = useRef<THREE.Mesh>(null);
  const splashRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const splashTimer = useRef(0);

  useFrame((_state, delta) => {
    if (!active) return;
    timeRef.current += delta;
    splashTimer.current += delta;

    if (streamRef.current) {
      // Gentle wave on the stream
      streamRef.current.scale.x = 0.9 + Math.sin(timeRef.current * 12) * 0.1;
      streamRef.current.scale.z = streamRef.current.scale.x;
    }

    if (splashRef.current) {
      // Cycle splash scale
      const cycle = (splashTimer.current % SPLASH_DURATION) / SPLASH_DURATION;
      const s = Math.sin(cycle * Math.PI);
      splashRef.current.scale.setScalar(s * 0.08 + 0.01);
    }
  });

  if (!active) return null;

  const streamHeight = spoutPosition[1] - basinY;
  const streamY = basinY + streamHeight / 2;

  return (
    <group>
      {/* Water column */}
      <mesh ref={streamRef} position={[spoutPosition[0], streamY, spoutPosition[2]]}>
        <cylinderGeometry args={[0.012, 0.012, streamHeight, 8]} />
        <meshStandardMaterial
          color="#66aaff"
          transparent
          opacity={0.55}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      {/* Splash disc at basin floor */}
      <mesh
        ref={splashRef}
        position={[spoutPosition[0], basinY + 0.01, spoutPosition[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.01, 0.08, 16]} />
        <meshStandardMaterial
          color="#88ccff"
          transparent
          opacity={0.5}
          roughness={0.0}
          metalness={0.0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

interface SoapBubblesProps {
  position: [number, number, number];
  active: boolean;
}

/** Simple rising soap bubble particles when an item is being washed. */
function SoapBubbles({position, active}: SoapBubblesProps) {
  const count = 8;
  const bubbleRefs = useRef<(THREE.Mesh | null)[]>([]);
  const phases = useMemo(
    () => Array.from({length: count}, (_, i) => (i / count) * Math.PI * 2),
    [],
  );
  const timeRef = useRef(0);

  useFrame((_state, delta) => {
    if (!active) return;
    timeRef.current += delta;

    bubbleRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const t = (timeRef.current * 0.5 + phases[i] / (Math.PI * 2)) % 1;
      const r = 0.1 + Math.sin(phases[i]) * 0.05;
      mesh.position.set(
        position[0] + Math.cos(phases[i]) * r,
        position[1] + t * BASIN_HEIGHT * 2,
        position[2] + Math.sin(phases[i]) * r,
      );
      mesh.scale.setScalar(0.015 + Math.sin(t * Math.PI) * 0.01);
    });
  });

  if (!active) return null;

  return (
    <group>
      {phases.map((_, i) => (
        <mesh
          key={i}
          ref={el => {
            bubbleRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            color="#cceeff"
            transparent
            opacity={0.4}
            roughness={0.0}
            metalness={0.0}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// ProceduralSink — main export
// ---------------------------------------------------------------------------

export interface ProceduralSinkProps {
  /** World-space position of the sink (bottom-center of the basin rim). */
  position?: [number, number, number];
  /** Called with the item ID when a wash cycle completes (after WASH_DURATION). */
  onItemWashed?: (itemId: string) => void;
}

/**
 * Procedural kitchen sink with interactive taps, water stream, and soap bubbles.
 *
 * Positioned at [-4, 0.85, 2] by default (left-wall counter area).
 * Hot tap on the left (red), cold tap on the right (blue).
 */
export function ProceduralSink({position = [-4, 0.85, 2], onItemWashed}: ProceduralSinkProps) {
  const [hotOn, setHotOn] = useState(false);
  const [coldOn, setColdOn] = useState(false);
  const waterOn = hotOn || coldOn;

  // Wash timer for items placed in sink
  const washTimerRef = useRef(0);
  const washingItemRef = useRef<string | null>(null);

  useFrame((_state, delta) => {
    if (!waterOn || !washingItemRef.current) return;
    washTimerRef.current += delta;
    if (washTimerRef.current >= WASH_DURATION) {
      const id = washingItemRef.current;
      washingItemRef.current = null;
      washTimerRef.current = 0;
      onItemWashed?.(id);
    }
  });

  const handleHotTap = useCallback(() => setHotOn(v => !v), []);
  const handleColdTap = useCallback(() => setColdOn(v => !v), []);

  // Basin lathe points
  const lathePoints = useMemo(() => BASIN_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), []);

  const [px, py, pz] = position;

  // Spout world position (end of horizontal arm)
  const spoutY = py + 0.55;
  const spoutZ = pz - 0.12;

  return (
    <group position={position}>
      {/* ---- Back splash ---- */}
      <mesh position={[0, BASIN_HEIGHT / 2 + 0.25, -0.16]}>
        <boxGeometry args={[0.7, 0.5, 0.03]} />
        <ChromeMaterial />
      </mesh>

      {/* ---- Basin (LatheGeometry bowl) ---- */}
      <mesh position={[0, 0, 0]}>
        <latheGeometry args={[lathePoints, 32]} />
        <ChromeMaterial />
      </mesh>

      {/* Basin interior (slightly smaller, dark) */}
      <mesh position={[0, 0.01, 0]} rotation={[Math.PI, 0, 0]}>
        <latheGeometry
          args={[lathePoints.map(p => new THREE.Vector2(p.x * 0.95, p.y * 0.97)), 32]}
        />
        <meshStandardMaterial
          color="#555566"
          metalness={0.4}
          roughness={0.6}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ---- Faucet — vertical riser ---- */}
      <mesh position={[0, BASIN_HEIGHT + 0.15, -0.1]}>
        <cylinderGeometry args={[0.022, 0.022, 0.3, 10]} />
        <ChromeMaterial />
      </mesh>

      {/* Faucet — elbow bend (visual approximation with a tilted cylinder) */}
      <mesh position={[0, BASIN_HEIGHT + 0.3, -0.12]} rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.06, 10]} />
        <ChromeMaterial />
      </mesh>

      {/* Faucet — horizontal spout */}
      <mesh position={[0, BASIN_HEIGHT + 0.3, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.14, 10]} />
        <ChromeMaterial />
      </mesh>

      {/* Spout tip cap */}
      <mesh position={[0, BASIN_HEIGHT + 0.3, 0.04]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <ChromeMaterial />
      </mesh>

      {/* ---- Hot tap (left, red) ---- */}
      <TapHandle
        position={[-0.2, BASIN_HEIGHT + 0.08, -0.12]}
        color="#cc2222"
        on={hotOn}
        onClick={handleHotTap}
      />

      {/* ---- Cold tap (right, blue) ---- */}
      <TapHandle
        position={[0.2, BASIN_HEIGHT + 0.08, -0.12]}
        color="#2244cc"
        on={coldOn}
        onClick={handleColdTap}
      />

      {/* ---- Water stream ---- */}
      <WaterStream spoutPosition={[px, spoutY, spoutZ]} basinY={py + 0.02} active={waterOn} />

      {/* ---- Soap bubbles (when item is washing) ---- */}
      <SoapBubbles
        position={[0, BASIN_HEIGHT * 0.5, 0]}
        active={waterOn && washingItemRef.current !== null}
      />
    </group>
  );
}
