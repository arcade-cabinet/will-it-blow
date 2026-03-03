/**
 * @module CabinetDrawer
 * Interactive cabinet doors and drawers with spring animations.
 *
 * At Medium+ difficulty, equipment parts are hidden inside cabinets/drawers.
 * Clicking opens/closes them with a spring animation, revealing contents.
 * Open/closed state is persisted in the Zustand store so the scene stays
 * consistent between frame renders.
 *
 * Cabinets: rotate 0 → -PI/2 on the Y axis (swing open).
 * Drawers: translate 0 → depthOpen on the Z axis (slide out).
 *
 * SFX uses audioEngine wrapped in try/catch — safe to call even when
 * the audio engine is unavailable (native/test environments).
 */

import {useFrame} from '@react-three/fiber';
import {useCallback, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {audioEngine} from '../../engine/AudioEngine';
import {useGameStore} from '../../store/gameStore';

// ---------------------------------------------------------------------------
// Spring constants
// ---------------------------------------------------------------------------

/** Spring stiffness for open/close animation. Higher = snappier. */
const SPRING_STIFFNESS = 18;
/** Spring damping — prevents oscillation overshoot. */
const SPRING_DAMPING = 6;

/**
 * Simple critically-overdamped spring step.
 * Returns the next value toward `target` given current `value` and `velocity`.
 *
 * @param value - Current value
 * @param velocity - Current velocity (mutated in place via returned pair)
 * @param target - Target value
 * @param delta - Frame delta time in seconds
 * @returns [nextValue, nextVelocity]
 */
function springStep(
  value: number,
  velocity: number,
  target: number,
  delta: number,
): [number, number] {
  const force = (target - value) * SPRING_STIFFNESS - velocity * SPRING_DAMPING;
  const nextVel = velocity + force * delta;
  const nextVal = value + nextVel * delta;
  return [nextVal, nextVel];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CabinetDrawerProps {
  /** Unique ID, used as the key in store.openCabinets / store.openDrawers */
  id: string;
  /** 'cabinet' rotates on Y; 'drawer' slides on Z */
  type: 'cabinet' | 'drawer';
  /** World position */
  position: [number, number, number];
  /** Y-axis rotation of the closed state (radians) */
  rotation?: [number, number, number];
  /** [width, height, depth] in world units */
  size?: [number, number, number];
  /** Children rendered inside the cabinet (revealed when open) */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// CabinetDrawer
// ---------------------------------------------------------------------------

/**
 * R3F component for an interactive cabinet door or drawer.
 *
 * Reads open/closed state from the Zustand store and writes back via
 * toggleCabinet / toggleDrawer on click. Spring-animates toward the
 * open/closed target each frame.
 */
export function CabinetDrawer({
  id,
  type,
  position,
  rotation = [0, 0, 0],
  size = [0.6, 0.8, 0.04],
  children,
}: CabinetDrawerProps) {
  const openCabinets = useGameStore(s => s.openCabinets);
  const openDrawers = useGameStore(s => s.openDrawers);
  const toggleCabinet = useGameStore(s => s.toggleCabinet);
  const toggleDrawer = useGameStore(s => s.toggleDrawer);

  const isOpen = type === 'cabinet' ? openCabinets.includes(id) : openDrawers.includes(id);

  // Spring state stored in refs (not React state) — read every frame
  const valueRef = useRef(0);
  const velocityRef = useRef(0);
  const hoveredRef = useRef(false);

  // Refs to animatable objects
  const doorGroupRef = useRef<THREE.Group>(null);
  const contentsGroupRef = useRef<THREE.Group>(null);

  // Target angle/offset based on open state
  // Cabinet: open = -PI/2 rotation on Y (door swings out)
  // Drawer: open = size[2] * 1.5 slide on Z (slide out)
  const target = isOpen ? (type === 'cabinet' ? -Math.PI / 2 : size[2] * 1.5) : 0;

  useFrame((_state, delta) => {
    const [nextVal, nextVel] = springStep(valueRef.current, velocityRef.current, target, delta);
    valueRef.current = nextVal;
    velocityRef.current = nextVel;

    if (doorGroupRef.current) {
      if (type === 'cabinet') {
        doorGroupRef.current.rotation.y = nextVal;
      } else {
        doorGroupRef.current.position.z = nextVal;
      }
    }

    // Contents become visible when door is more than half open
    if (contentsGroupRef.current) {
      const openFraction =
        type === 'cabinet' ? Math.abs(nextVal) / (Math.PI / 2) : nextVal / (size[2] * 1.5);
      contentsGroupRef.current.visible = openFraction > 0.5;
    }
  });

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      if (type === 'cabinet') {
        toggleCabinet(id);
        try {
          // playSample is a no-op stub until cabinet SFX are implemented
          audioEngine.playSample(isOpen ? 'cabinet_close' : 'cabinet_creak');
        } catch {
          // Audio engine unavailable — silent fallback
        }
      } else {
        toggleDrawer(id);
        try {
          audioEngine.playSample(isOpen ? 'drawer_close' : 'drawer_open');
        } catch {
          // Audio engine unavailable — silent fallback
        }
      }
    },
    [id, type, isOpen, toggleCabinet, toggleDrawer],
  );

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();
    hoveredRef.current = true;
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'pointer';
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    hoveredRef.current = false;
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'default';
    }
  }, []);

  const [w, h, d] = size;

  // Hinge pivot is at the left edge of the door (x = -w/2)
  // We wrap the door in a group at the hinge position, then offset
  // the door mesh so it appears to rotate from its left edge.
  return (
    <group position={position} rotation={new THREE.Euler(...rotation)}>
      {/* Hinge pivot group — rotates for cabinet, translates for drawer */}
      <group ref={doorGroupRef}>
        {/* Door / drawer face panel — offset so left edge is at origin */}
        <mesh
          position={type === 'cabinet' ? [w / 2, 0, 0] : [0, 0, 0]}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={hoveredRef.current ? '#8a7a6a' : '#7a6a5a'}
            roughness={0.8}
            metalness={0.05}
          />
        </mesh>

        {/* Door handle — small horizontal bar */}
        <mesh
          position={
            type === 'cabinet' ? [w - 0.08, 0, d / 2 + 0.015] : [0.05, -h * 0.15, d / 2 + 0.015]
          }
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={[0.12, 0.025, 0.025]} />
          <meshStandardMaterial color="#c0a080" roughness={0.3} metalness={0.6} />
        </mesh>
      </group>

      {/* Contents group — hidden until door is half-open */}
      <group ref={contentsGroupRef} visible={false}>
        {children}
      </group>
    </group>
  );
}
