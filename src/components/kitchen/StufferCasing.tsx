/**
 * @module StufferCasing
 * Translucent casing tube that connects from the stuffer spout to the sausage
 * output. Inflates as fillLevel increases, shifts color by pressureLevel,
 * and pulses at high pressure.
 *
 * Composed by StufferMechanics.
 */

import {useFrame} from '@react-three/fiber';
import {useMemo, useRef} from 'react';
import * as THREE from 'three/webgpu';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CASING_LENGTH = 1.2;
const CASING_BASE_RADIUS = 0.075; // diameter 0.15
const MAX_INFLATE = 3.5; // max radial scale at full fill
const PULSE_THRESHOLD = 0.7;
const PULSE_SPEED = 8; // Hz
const PULSE_AMP = 0.15; // scale oscillation amplitude

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerpScalar(a[0], b[0], t), lerpScalar(a[1], b[1], t), lerpScalar(a[2], b[2], t)];
}

/**
 * Maps a 0-1 pressure value to an RGB triplet:
 * 0.0 = green, 0.5 = yellow, 1.0 = red.
 */
export function pressureToColor(pressure: number): [number, number, number] {
  const green: [number, number, number] = [0.2, 0.7, 0.15];
  const yellow: [number, number, number] = [0.85, 0.75, 0.1];
  const red: [number, number, number] = [0.9, 0.1, 0.05];
  const clamped = Math.max(0, Math.min(1, pressure));
  if (clamped <= 0.5) return lerpColor(green, yellow, clamped / 0.5);
  return lerpColor(yellow, red, (clamped - 0.5) / 0.5);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StufferCasingProps {
  fillLevel: number; // 0-1, drives inflation
  pressureLevel: number; // 0-1, drives color shift
  blendColor?: string; // tints the casing with ingredient blend
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StufferCasing({fillLevel, pressureLevel, blendColor}: StufferCasingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const capRef = useRef<THREE.Mesh>(null);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame(({clock}) => {
    if (!meshRef.current) return;

    // Inflate radially based on fillLevel
    const inflate = 1 + fillLevel * (MAX_INFLATE - 1);
    let scaleXZ = inflate;

    // High-pressure pulsing
    if (pressureLevel > PULSE_THRESHOLD) {
      const pulseT = (pressureLevel - PULSE_THRESHOLD) / (1 - PULSE_THRESHOLD);
      const pulse = Math.sin(clock.getElapsedTime() * PULSE_SPEED) * PULSE_AMP * pulseT;
      scaleXZ += pulse;
    }

    meshRef.current.scale.set(scaleXZ, 1, scaleXZ);

    // Update color from pressure
    const [r, g, b] = pressureToColor(pressureLevel);
    if (blendColor) {
      // Blend pressure color with ingredient tint (50/50)
      const tint = new THREE.Color(blendColor);
      colorObj.setRGB(
        lerpScalar(r, tint.r, 0.5),
        lerpScalar(g, tint.g, 0.5),
        lerpScalar(b, tint.b, 0.5),
      );
    } else {
      colorObj.setRGB(r, g, b);
    }

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.color.copy(colorObj);

    // End cap matches inflation
    if (capRef.current) {
      capRef.current.scale.setScalar(scaleXZ);
    }
  });

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Casing tube */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[CASING_BASE_RADIUS, CASING_BASE_RADIUS, CASING_LENGTH, 12]} />
        <meshBasicMaterial color={0xffffee} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* End cap */}
      <mesh ref={capRef} position={[0, CASING_LENGTH / 2, 0]}>
        <sphereGeometry args={[CASING_BASE_RADIUS, 8, 8]} />
        <meshBasicMaterial color={0xffffee} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
