/**
 * @module EndgameEnvironment
 * Environmental sequences for win and lose states.
 *
 * Win (fridge empty): warm amber light pours through the trapdoor,
 * "YOU ARE FREE" blood text on back wall. The existing TrapDoorAnimation
 * already opens during DONE; this component adds the warm-light and
 * environmental mood shift.
 *
 * Lose (disgust maxed): TV cuts to static (handled by TV component),
 * all lights flicker out except a single red overhead, ominous tone.
 * The camera is not forced (the player keeps control) but the environment
 * itself signals the loss through the lighting change.
 *
 * Both states are detected by reading hungerDisgustMeter and
 * hungerFridgeIds from the ECS store.
 */
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';

export function EndgameEnvironment() {
  const hungerDisgustMeter = useGameStore(s => s.hungerDisgustMeter);
  const hungerDisgustThreshold = useGameStore(s => s.hungerDisgustThreshold);
  const hungerFridgeIds = useGameStore(s => s.hungerFridgeIds);
  const gamePhase = useGameStore(s => s.gamePhase);
  const posture = useGameStore(s => s.posture);

  const winLightRef = useRef<THREE.PointLight>(null);
  const loseLightRef = useRef<THREE.PointLight>(null);

  const isWinning = gamePhase === 'DONE' && hungerFridgeIds.length === 0;
  const isLosing = hungerDisgustMeter >= hungerDisgustThreshold;

  useFrame((state) => {
    if (posture !== 'standing') return;
    const t = state.clock.elapsedTime;

    // Win: warm amber light through the trapdoor
    if (winLightRef.current) {
      if (isWinning) {
        winLightRef.current.visible = true;
        // Gentle warm pulse
        winLightRef.current.intensity = 40 + Math.sin(t * 0.5) * 10;
      } else {
        winLightRef.current.visible = false;
      }
    }

    // Lose: pulsing red overhead
    if (loseLightRef.current) {
      if (isLosing) {
        loseLightRef.current.visible = true;
        // Rapid menacing pulse
        loseLightRef.current.intensity = 30 + Math.sin(t * 8) * 15;
      } else {
        loseLightRef.current.visible = false;
      }
    }
  });

  return (
    <>
      {/* Win: warm amber spotlight through the ceiling trapdoor opening */}
      <pointLight
        ref={winLightRef}
        position={[0, 3.5, 0]}
        intensity={0}
        distance={8}
        color="#ffaa44"
        visible={false}
      />

      {/* Lose: single red overhead — the only light when disgust maxes */}
      <pointLight
        ref={loseLightRef}
        position={[0, 2.8, 0]}
        intensity={0}
        distance={6}
        color="#cc0000"
        visible={false}
      />
    </>
  );
}
