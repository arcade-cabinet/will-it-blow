/**
 * @module TrapDoorAnimation
 * Ceiling trapdoor that opens at key moments:
 *  1. Intro -- when the player first wakes up in the basement
 *  2. Round end -- DONE phase triggers the presentation climax
 *     (design pillar #4) where the plate on rope descends
 *
 * The trapdoor hinges on one edge and swings open via lerp in useFrame.
 */
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';
import {TrapDoorMount} from './TrapDoorMount';

interface TrapDoorAnimationProps {
  position?: [number, number, number];
}

export function TrapDoorAnimation({position = [0, 3, 0]}: TrapDoorAnimationProps) {
  const hingeGroupRef = useRef<THREE.Group>(null);

  const gamePhase = useGameStore(state => state.gamePhase);
  const introActive = useGameStore(state => state.introActive);

  // Open conditions:
  // 1. Intro is active (player dropped through)
  // 2. DONE phase reached (round-end presentation or final exit)
  const isOpen = introActive || gamePhase === 'DONE';

  const HINGE_OPEN_ANGLE = Math.PI * 0.5;

  useFrame((_, delta) => {
    if (hingeGroupRef.current) {
      const targetAngle = isOpen ? -HINGE_OPEN_ANGLE : 0;
      hingeGroupRef.current.rotation.z +=
        (targetAngle - hingeGroupRef.current.rotation.z) * delta * 2.0;
    }
  });

  return (
    <group position={position}>
      {/* Light pouring in when open */}
      {isOpen && (
        <spotLight
          position={[0, 5, 0]}
          angle={Math.PI / 6}
          penumbra={0.5}
          intensity={100}
          color="#fff"
          castShadow
        />
      )}

      {/* Hinge group wraps the TrapDoorMount so rotation pivots from one edge */}
      <group ref={hingeGroupRef} position={[0, 0, -0.5]}>
        <group position={[0, 0, 0.5]}>
          <TrapDoorMount position={[0, 0, 0]} />
        </group>
      </group>
    </group>
  );
}
