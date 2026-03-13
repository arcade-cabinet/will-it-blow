import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type * as THREE from 'three';
import {useGameStore} from '../../store/gameStore';
import {TrapDoorMount} from './TrapDoorMount';

interface TrapDoorAnimationProps {
  position?: [number, number, number];
}

export function TrapDoorAnimation({position = [0, 3, 0]}: TrapDoorAnimationProps) {
  const hingeGroupRef = useRef<THREE.Group>(null);

  const currentRound = useGameStore(state => state.currentRound);
  const totalRounds = useGameStore(state => state.totalRounds);
  const gamePhase = useGameStore(state => state.gamePhase);

  // Trapdoor opens when the player has completed the required number of rounds
  const isOpen = currentRound > totalRounds && gamePhase === 'DONE';
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
