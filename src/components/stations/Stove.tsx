import {Torus, useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useState, useRef} from 'react';
import * as THREE from 'three';
import {audioEngine} from '../../engine/AudioEngine';
import {useGameStore} from '../../store/gameStore';

export function Stove() {
  const [burnerLevels, setBurnerLevels] = useState([0, 0]); // FrontLeft, BackRight
  const dialFL = useRef<THREE.Group>(null);
  const dialBR = useRef<THREE.Group>(null);

  const oven = useGLTF('/models/kitchen_oven_large.glb') as any;
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const cookLevel = useGameStore(state => state.cookLevel);
  const setCookLevel = useGameStore(state => state.setCookLevel);

  const updateSizzle = (l1: number, l2: number) => {
    if (gamePhase === 'COOKING') {
      audioEngine.setSizzleLevel(Math.max(l1, l2));
    }
  };

  const bindDialFL = useDrag(({movement: [, my]}) => {
    const level = Math.max(0, Math.min(1.0, burnerLevels[0] - my * 0.005));
    setBurnerLevels([level, burnerLevels[1]]);
    if (dialFL.current) dialFL.current.rotation.x = level * Math.PI * 0.8;
    updateSizzle(level, burnerLevels[1]);
  });

  const bindDialBR = useDrag(({movement: [, my]}) => {
    const level = Math.max(0, Math.min(1.0, burnerLevels[1] - my * 0.005));
    setBurnerLevels([burnerLevels[0], level]);
    if (dialBR.current) dialBR.current.rotation.x = level * Math.PI * 0.8;
    updateSizzle(burnerLevels[0], level);
  });

  // Cook logic
  useFrame((state, delta) => {
    if (gamePhase === 'COOKING') {
      const maxHeat = Math.max(burnerLevels[0], burnerLevels[1]);
      if (maxHeat > 0) {
        const nextCook = Math.min(1.0, cookLevel + maxHeat * delta * 0.1); // Takes 10s at full heat
        setCookLevel(nextCook);
        if (nextCook >= 1.0) {
          setGamePhase('DONE');
        }
      }
    }
  });

  const handlePanClick = () => {
    if (gamePhase === 'MOVE_PAN') {
      setGamePhase('COOKING');
    }
  };

  return (
    <group position={[2.8, 0.0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      {/* Stove Base (Model) */}
      {oven.scene && (
        <RigidBody type="fixed" colliders="hull">
          <primitive 
            object={oven.scene.clone()} 
            position={[0, 0, 0]} 
            scale={1.2} 
            onClick={handlePanClick} 
          />
        </RigidBody>
      )}

      {/* Burners */}
      <group position={[-0.4, 0.9, -0.4]}>
        {/* Burner FL */}
        <Torus args={[0.2, 0.02, 8, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.8]}>
          <meshStandardMaterial
            color={new THREE.Color().lerpColors(
              new THREE.Color('#333'),
              new THREE.Color('#ff4400'),
              burnerLevels[0],
            )}
            emissive={new THREE.Color().lerpColors(
              new THREE.Color('#000'),
              new THREE.Color('#ff2200'),
              burnerLevels[0],
            )}
          />
          {/* Pan placeholder when cooking */}
          {gamePhase === 'COOKING' && burnerLevels[0] > 0 && (
            <mesh position={[0, 0, -0.05]}>
              <cylinderGeometry args={[0.25, 0.2, 0.05, 32]} />
              <meshStandardMaterial color="#222" metalness={0.8} />
            </mesh>
          )}
        </Torus>

        {/* Burner BR */}
        <Torus args={[0.2, 0.02, 8, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0.8, 0, 0]}>
          <meshStandardMaterial
            color={new THREE.Color().lerpColors(
              new THREE.Color('#333'),
              new THREE.Color('#ff4400'),
              burnerLevels[1],
            )}
            emissive={new THREE.Color().lerpColors(
              new THREE.Color('#000'),
              new THREE.Color('#ff2200'),
              burnerLevels[1],
            )}
          />
        </Torus>
      </group>

      {/* Dials */}
      <group position={[0.4, 0.75, 0.85]} rotation={[0, Math.PI / 2, 0]}>
        {/* @ts-ignore */}
        <group {...bindDialFL()} ref={dialFL} position={[0.4, 0, 0]}>
          <mesh>
             <boxGeometry args={[0.08, 0.08, 0.04]} />
             <meshStandardMaterial color="#888" />
          </mesh>
          <mesh visible={false}>
             <boxGeometry args={[0.2, 0.3, 0.3]} />
          </mesh>
        </group>

        {/* @ts-ignore */}
        <group {...bindDialBR()} ref={dialBR} position={[-0.4, 0, 0]}>
          <mesh>
             <boxGeometry args={[0.08, 0.08, 0.04]} />
             <meshStandardMaterial color="#888" />
          </mesh>
          <mesh visible={false}>
             <boxGeometry args={[0.2, 0.3, 0.3]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload('/models/kitchen_oven_large.glb');
