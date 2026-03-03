/**
 * @module TrapDoorAnimation
 * Victory escape sequence — plays when all rounds are completed with an S-rank average.
 *
 * Triggered when `gameStatus === 'victory'` and all rounds are complete.
 * Sequence:
 *  1. Mr. Sausage delivers his final line via DialogueOverlay
 *  2. Trap door hinge rotates open (animate rotation on the ceiling panel group)
 *  3. SpotLight floods in from above (intensity 0 → 5 over 2s)
 *  4. Camera tilts up and drifts toward the opening
 *  5. Fade to white
 *  6. "THE SAUSAGE KING ESCAPES" victory text
 *
 * The hinge rotation animates a <group> wrapping the TrapDoorMount mesh.
 * The camera drift uses useFrame to nudge camera.position.y and rotation.x.
 * The white flash is a React Native <Animated.View> overlay (2D layer).
 */

import {useFrame, useThree} from '@react-three/fiber';
import {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import type * as THREE from 'three/webgpu';
import {useGameStore} from '../../store/gameStore';
import {TrapDoorMount} from './TrapDoorMount';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** World position of the trap door in the ceiling. */
const TRAPDOOR_POSITION: [number, number, number] = [0, 3.2, 0];

/** Duration of spotlight intensity ramp (seconds). */
const LIGHT_RAMP_DURATION = 2.0;

/** Duration of camera rise animation (seconds). */
const CAMERA_RISE_DURATION = 4.0;

/** Camera tilt target (radians upward). */
const CAMERA_TILT_TARGET = -Math.PI * 0.45;

/** Camera Y position to drift toward (ceiling level). */
const CAMERA_RISE_TARGET = 3.0;

/** Hinge open angle in radians (90 degrees). */
const HINGE_OPEN_ANGLE = Math.PI * 0.5;

// ---------------------------------------------------------------------------
// 3D sub-component: door hinge + spotlight
// ---------------------------------------------------------------------------

interface TrapDoorScene3DProps {
  phase: EscapePhase;
  onDoorOpen: () => void;
}

type EscapePhase = 'idle' | 'opening' | 'rising' | 'done';

function TrapDoorScene3D({phase, onDoorOpen}: TrapDoorScene3DProps) {
  const {camera} = useThree();
  const hingeGroupRef = useRef<THREE.Group>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const elapsed = useRef(0);
  const doorOpenFired = useRef(false);

  useFrame((_, delta) => {
    if (phase === 'idle') return;

    elapsed.current += delta;

    // --- Door hinge rotation ---
    if (hingeGroupRef.current && (phase === 'opening' || phase === 'rising' || phase === 'done')) {
      const hingeT = Math.min(1, elapsed.current / 1.5);
      const eased = 1 - (1 - hingeT) * (1 - hingeT); // ease-out quad
      hingeGroupRef.current.rotation.z = -HINGE_OPEN_ANGLE * eased;

      if (hingeT >= 1 && !doorOpenFired.current) {
        doorOpenFired.current = true;
        onDoorOpen();
      }
    }

    // --- Spotlight ramp ---
    if (spotLightRef.current && (phase === 'rising' || phase === 'done')) {
      const lightT = Math.min(1, (elapsed.current - 1.5) / LIGHT_RAMP_DURATION);
      spotLightRef.current.intensity = lightT * 5;
    }

    // --- Camera drift upward and tilt ---
    if (phase === 'rising') {
      const riseT = Math.min(1, (elapsed.current - 1.5) / CAMERA_RISE_DURATION);
      const eased = riseT * riseT * (3 - 2 * riseT); // smoothstep

      camera.position.y = 1.6 + (CAMERA_RISE_TARGET - 1.6) * eased;
      camera.rotation.x = CAMERA_TILT_TARGET * eased;
    }
  });

  return (
    <>
      {/* Hinge group wraps the TrapDoorMount so rotation pivots from one edge */}
      <group ref={hingeGroupRef} position={TRAPDOOR_POSITION}>
        <TrapDoorMount position={[0, 0, 0]} />
      </group>

      {/* Spotlight pours through the open trap door from above */}
      <spotLight
        ref={spotLightRef}
        position={[TRAPDOOR_POSITION[0], TRAPDOOR_POSITION[1] + 2, TRAPDOOR_POSITION[2]]}
        target-position={[0, 0, 0]}
        intensity={0}
        angle={Math.PI * 0.3}
        penumbra={0.4}
        color="#fffff0"
        castShadow={false}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// 2D overlay: white flash + victory text
// ---------------------------------------------------------------------------

interface EscapeOverlayProps {
  phase: EscapePhase;
}

function EscapeOverlay({phase}: EscapeOverlayProps) {
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (phase !== 'rising') return;

    // After 3s of rising, start white flash
    const flashTimer = setTimeout(() => {
      setShowText(true);
      Animated.sequence([
        Animated.timing(flashOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 3000);

    return () => clearTimeout(flashTimer);
  }, [phase, flashOpacity, textOpacity]);

  if (phase === 'idle' || phase === 'opening') return null;

  return (
    <Animated.View style={[styles.flashOverlay, {opacity: flashOpacity}]} pointerEvents="none">
      <View style={styles.flashFill} />
      {showText && (
        <Animated.View style={[styles.textContainer, {opacity: textOpacity}]}>
          <Text style={styles.victoryText}>THE SAUSAGE KING</Text>
          <Text style={styles.victoryText}>ESCAPES</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * TrapDoorAnimation — mounts the animated trap door + escape overlay.
 * Renders nothing until gameStatus === 'victory' and all rounds complete.
 */
export function TrapDoorAnimation() {
  const gameStatus = useGameStore(s => s.gameStatus);
  const currentRound = useGameStore(s => s.currentRound);
  const totalRounds = useGameStore(s => s.totalRounds);

  const [phase, setPhase] = useState<EscapePhase>('idle');

  const allRoundsComplete = currentRound >= totalRounds;
  const shouldActivate = gameStatus === 'victory' && allRoundsComplete;

  useEffect(() => {
    if (!shouldActivate || phase !== 'idle') return;

    // Brief delay for Mr. Sausage's final dialogue to finish before door opens
    const openTimer = setTimeout(() => {
      setPhase('opening');
    }, 2000);

    return () => clearTimeout(openTimer);
  }, [shouldActivate, phase]);

  const handleDoorOpen = () => {
    setPhase('rising');
  };

  if (!shouldActivate) return null;

  return (
    <>
      <TrapDoorScene3D phase={phase} onDoorOpen={handleDoorOpen} />
      <EscapeOverlay phase={phase} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fffff8',
  },
  textContainer: {
    alignItems: 'center',
  },
  victoryText: {
    fontFamily: 'Bangers',
    fontSize: 64,
    color: '#1a0000',
    letterSpacing: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(200, 0, 0, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 20,
  },
});
