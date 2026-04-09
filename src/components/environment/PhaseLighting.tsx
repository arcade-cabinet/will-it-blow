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
import {getPhaseMood} from '../../config/phaseMood';
import {useGameStore} from '../../ecs/hooks';

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

    const mood = getPhaseMood(gamePhase);
    targetColor.current.set(mood.color);
    targetIntensity.current = mood.intensity;

    // Smooth lerp toward target
    lightRef.current.color.lerp(targetColor.current, delta * 3);
    lightRef.current.intensity +=
      (targetIntensity.current - lightRef.current.intensity) * delta * 3;
  });

  return (
    <pointLight ref={lightRef} position={[0, 2.2, 0]} intensity={0} distance={8} color="#c8c8c8" />
  );
}
