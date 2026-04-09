/**
 * @module PhaseFog
 * Per-phase fog density modulator. Smoothly ramps the fogExp2 density
 * based on the current game phase to reinforce the atmosphere:
 *
 * - SELECT_INGREDIENTS: lighter fog (0.014) — clearer view of the fridge
 * - BLOWOUT: dense fog (0.030) — smoke and dust from the explosion
 * - COOKING: slightly denser (0.022) — steam/smoke from the stove
 * - DONE: lighter (0.016) — cold clarity for judgment
 *
 * Density values are driven from phaseMood.json (JSON as single source
 * of truth). The component mutates the scene.fog.density directly inside
 * useFrame — no React re-renders per frame.
 */
import {useFrame, useThree} from '@react-three/fiber';
import {useRef} from 'react';
import type * as THREE from 'three';
import {getPhaseMood} from '../../config/phaseMood';
import {useGameStore} from '../../ecs/hooks';

export function PhaseFog() {
  const gamePhase = useGameStore(s => s.gamePhase);
  const posture = useGameStore(s => s.posture);
  const {scene} = useThree();
  const targetDensity = useRef(0.018);

  useFrame((_state, delta) => {
    const fog = scene.fog as THREE.FogExp2 | null;
    if (!fog || posture !== 'standing') return;

    const mood = getPhaseMood(gamePhase);
    targetDensity.current = mood.fogDensity;

    // Smooth lerp toward target density — frame-rate independent.
    fog.density += (targetDensity.current - fog.density) * delta * 2;
  });

  return null;
}
