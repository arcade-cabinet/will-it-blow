/**
 * @module PhaseLighting
 * Per-phase lighting mood modulator. Adds subtle color temperature
 * shifts based on the current game phase to reinforce the horror
 * atmosphere without replacing the base FlickeringFluorescent setup.
 *
 * Phase moods:
 * - SELECT_INGREDIENTS: slightly warmer (amber tint, +intensity)
 * - CHOPPING/GRINDING: neutral, slight red undertone
 * - COOKING: amber warmth (stove glow carries over)
 * - BLOWOUT: brief white flash on explosion
 * - DONE: cold blue tint (judgment)
 *
 * The component adds a single tinted fill light that modulates
 * per-phase. The base horror fluorescents stay constant.
 */
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';

/** Phase -> color temperature + intensity target. */
const PHASE_MOOD: Record<string, {color: string; intensity: number}> = {
  SELECT_INGREDIENTS: {color: '#e8c878', intensity: 8},
  CHOPPING: {color: '#d8a898', intensity: 6},
  FILL_GRINDER: {color: '#c8b8a8', intensity: 5},
  GRINDING: {color: '#c8a8a8', intensity: 7},
  MOVE_BOWL: {color: '#c8c8c8', intensity: 4},
  ATTACH_CASING: {color: '#c8c8c8', intensity: 4},
  STUFFING: {color: '#c8b8b8', intensity: 5},
  TIE_CASING: {color: '#c8b8b8', intensity: 5},
  BLOWOUT: {color: '#ffffff', intensity: 15},
  MOVE_SAUSAGE: {color: '#c8c8c8', intensity: 4},
  MOVE_PAN: {color: '#d8b888', intensity: 6},
  COOKING: {color: '#e8a868', intensity: 10},
  DONE: {color: '#8888cc', intensity: 8},
};

const DEFAULT_MOOD = {color: '#c8c8c8', intensity: 4};

export function PhaseLighting() {
  const gamePhase = useGameStore(s => s.gamePhase);
  const posture = useGameStore(s => s.posture);
  const lightRef = useRef<THREE.PointLight>(null);
  const targetColor = useRef(new THREE.Color('#c8c8c8'));
  const targetIntensity = useRef(4);

  useFrame((_state, delta) => {
    if (!lightRef.current || posture !== 'standing') {
      if (lightRef.current) lightRef.current.intensity = 0;
      return;
    }

    const mood = PHASE_MOOD[gamePhase] ?? DEFAULT_MOOD;
    targetColor.current.set(mood.color);
    targetIntensity.current = mood.intensity;

    // Smooth lerp toward target
    lightRef.current.color.lerp(targetColor.current, delta * 3);
    lightRef.current.intensity +=
      (targetIntensity.current - lightRef.current.intensity) * delta * 3;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 2.2, 0]}
      intensity={0}
      distance={8}
      color="#c8c8c8"
    />
  );
}
