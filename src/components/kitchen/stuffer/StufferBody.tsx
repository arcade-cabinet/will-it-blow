/**
 * @module StufferBody
 * Visual-only sub-component: the vertical metal stuffer canister with plunger,
 * handle, meat fill cylinder, and horizontal spout.
 *
 * Composed by StufferMechanics.
 */

import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type * as THREE from 'three/webgpu';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BODY_HEIGHT = 1.0;
const BODY_RADIUS = 0.25; // diameter 0.5
const PLUNGER_HEIGHT = 0.15;
const HANDLE_HEIGHT = 0.5;
const HANDLE_RADIUS = 0.03;
const KNOB_RADIUS = 0.06;

/** How far inside the canister the plunger can descend (top to bottom). */
const PLUNGER_TRAVEL = BODY_HEIGHT - PLUNGER_HEIGHT;

/** Spout extends horizontally from the canister toward the nozzle. */
const SPOUT_LENGTH = 0.4;
const SPOUT_RADIUS = 0.06;

/** Vibration amplitude when cranking. */
const VIBRATION_AMP = 0.003;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StufferBodyProps {
  fillLevel: number; // 0-1, drives plunger descent and meat fill
  isCranking: boolean; // subtle vibration
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StufferBody({fillLevel, isCranking}: StufferBodyProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Plunger descends as fillLevel increases (starts at top, ends at bottom)
  const plungerY = BODY_HEIGHT / 2 - fillLevel * PLUNGER_TRAVEL;

  // Meat fill: visible portion below the plunger, shrinks as fillLevel rises
  const meatHeight = Math.max(0.01, (1 - fillLevel) * (BODY_HEIGHT - PLUNGER_HEIGHT));
  const meatY = -BODY_HEIGHT / 2 + meatHeight / 2;

  // Subtle vibration when cranking
  useFrame(({clock}) => {
    if (!groupRef.current) return;
    if (isCranking) {
      const t = clock.getElapsedTime() * 30;
      groupRef.current.position.x = Math.sin(t) * VIBRATION_AMP;
      groupRef.current.position.z = Math.cos(t * 1.3) * VIBRATION_AMP;
    } else {
      groupRef.current.position.x = 0;
      groupRef.current.position.z = 0;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Canister body */}
      <mesh>
        <cylinderGeometry args={[BODY_RADIUS, BODY_RADIUS, BODY_HEIGHT, 16]} />
        <meshBasicMaterial color={0x999999} />
      </mesh>

      {/* Plunger disc */}
      <mesh position={[0, plungerY, 0]}>
        <cylinderGeometry args={[BODY_RADIUS * 0.95, BODY_RADIUS * 0.95, PLUNGER_HEIGHT, 16]} />
        <meshBasicMaterial color={0x777777} />
      </mesh>

      {/* Plunger handle shaft */}
      <mesh position={[0, plungerY + PLUNGER_HEIGHT / 2 + HANDLE_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[HANDLE_RADIUS, HANDLE_RADIUS, HANDLE_HEIGHT, 8]} />
        <meshBasicMaterial color={0x666666} />
      </mesh>

      {/* Plunger handle knob */}
      <mesh position={[0, plungerY + PLUNGER_HEIGHT / 2 + HANDLE_HEIGHT + KNOB_RADIUS, 0]}>
        <sphereGeometry args={[KNOB_RADIUS, 8, 8]} />
        <meshBasicMaterial color={0x555555} />
      </mesh>

      {/* Meat fill inside canister */}
      <mesh position={[0, meatY, 0]}>
        <cylinderGeometry args={[BODY_RADIUS * 0.9, BODY_RADIUS * 0.9, meatHeight, 16]} />
        <meshBasicMaterial color={0xcc4444} />
      </mesh>

      {/* Horizontal spout */}
      <mesh
        position={[0, -BODY_HEIGHT / 2 + SPOUT_RADIUS, BODY_RADIUS + SPOUT_LENGTH / 2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[SPOUT_RADIUS, SPOUT_RADIUS * 0.8, SPOUT_LENGTH, 8]} />
        <meshBasicMaterial color={0x888888} />
      </mesh>
    </group>
  );
}
