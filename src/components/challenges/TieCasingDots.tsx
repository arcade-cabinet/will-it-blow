/**
 * @module TieCasingDots
 * Diegetic tie-casing interaction — replaces the old HTML TieGesture overlay.
 *
 * When gamePhase === 'TIE_CASING', two pulsing red emissive spheres appear
 * at the head and tail of the sausage casing. The player taps each via
 * raycasted pointer events on real 3D meshes. When both are tied, the
 * component calls setCasingTied(true) and advances to BLOWOUT.
 *
 * Zero HTML. Zero overlays. Fully diegetic per pillar 7.
 */
import type {ThreeEvent} from '@react-three/fiber';
import {useFrame} from '@react-three/fiber';
import {useCallback, useEffect, useRef, useState} from 'react';
import type * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';
import {requestHandGesture} from '../camera/handGestureStore';

/** Position of the sausage during TIE_CASING — matches Sausage.tsx stuffer offset. */
const SAUSAGE_CENTER: [number, number, number] = [-2.8, 0.65, 2];

/** Offsets from center for head and tail dots along the Z axis. */
const HEAD_OFFSET = 1.2;
const TAIL_OFFSET = -1.2;

const DOT_RADIUS = 0.12;
const PULSE_SPEED = 3.0;
const PULSE_MIN = 0.4;
const PULSE_MAX = 2.5;

/** A single pulsing dot that responds to pointer clicks. */
function TieDot({
  position,
  tied,
  onTie,
}: {
  position: [number, number, number];
  tied: boolean;
  onTie: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(state => {
    if (!matRef.current || tied) return;
    const t = state.clock.elapsedTime;
    const pulse = PULSE_MIN + (Math.sin(t * PULSE_SPEED) * 0.5 + 0.5) * (PULSE_MAX - PULSE_MIN);
    matRef.current.emissiveIntensity = pulse;
  });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!tied) {
        onTie();
      }
    },
    [tied, onTie],
  );

  return (
    <mesh ref={meshRef} position={position} onClick={handleClick} visible={!tied}>
      <sphereGeometry args={[DOT_RADIUS, 16, 16]} />
      <meshStandardMaterial
        ref={matRef}
        color={tied ? '#4CAF50' : '#FF1744'}
        emissive={tied ? '#4CAF50' : '#FF1744'}
        emissiveIntensity={tied ? 0.2 : PULSE_MIN}
        transparent
        opacity={tied ? 0.3 : 0.9}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Diegetic tie-casing dots. Mount inside the R3F Canvas during TIE_CASING.
 * When both dots are tapped, advances game phase to BLOWOUT.
 */
export function TieCasingDots() {
  const setCasingTied = useGameStore(s => s.setCasingTied);
  const setGamePhase = useGameStore(s => s.setGamePhase);

  const [leftTied, setLeftTied] = useState(false);
  const [rightTied, setRightTied] = useState(false);
  const completedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up the phase-advance timeout on unmount to prevent
  // stale state updates if the component is torn down early.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleLeftTie = useCallback(() => {
    if (leftTied || completedRef.current) return;
    requestHandGesture('tap_left');
    setLeftTied(true);
  }, [leftTied]);

  const handleRightTie = useCallback(() => {
    if (rightTied || completedRef.current) return;
    requestHandGesture('tap_right');
    setRightTied(true);
  }, [rightTied]);

  // Check completion — advance to BLOWOUT when both are tied
  useFrame(() => {
    if (leftTied && rightTied && !completedRef.current) {
      completedRef.current = true;
      setCasingTied(true);
      // Small delay to let the visual settle before phase change
      timerRef.current = setTimeout(() => {
        setGamePhase('BLOWOUT');
      }, 400);
    }
  });

  const headPos: [number, number, number] = [
    SAUSAGE_CENTER[0],
    SAUSAGE_CENTER[1],
    SAUSAGE_CENTER[2] + HEAD_OFFSET,
  ];
  const tailPos: [number, number, number] = [
    SAUSAGE_CENTER[0],
    SAUSAGE_CENTER[1],
    SAUSAGE_CENTER[2] + TAIL_OFFSET,
  ];

  return (
    <group>
      <TieDot position={headPos} tied={leftTied} onTie={handleLeftTie} />
      <TieDot position={tailPos} tied={rightTied} onTie={handleRightTie} />
    </group>
  );
}
