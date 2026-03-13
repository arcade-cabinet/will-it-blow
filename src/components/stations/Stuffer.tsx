import {Box, Cylinder, useTexture} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useMemo, useRef} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../store/gameStore';

export function Stuffer() {
  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const stuffLevel = useGameStore(state => state.stuffLevel);
  const setStuffLevel = useGameStore(state => state.setStuffLevel);

  const crankRef = useRef<THREE.Group>(null);
  const rodRef = useRef<THREE.Mesh>(null);

  const [metalMap, metalNormal, metalRough] = useTexture([
    require('../../../public/textures/concrete_color.jpg'),
    require('../../../public/textures/concrete_normal.jpg'),
    require('../../../public/textures/concrete_roughness.jpg'),
  ]);

  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: metalMap,
        normalMap: metalNormal,
        roughnessMap: metalRough,
        color: '#aaa',
        metalness: 0.9,
        roughness: 0.3,
      }),
    [metalMap, metalNormal, metalRough],
  );

  const bindCrank = useDrag(({movement: [, my]}) => {
    if (gamePhase !== 'STUFFING') return;

    // Rotate crank and adjust stuff level
    // `my` maps to vertical drag movement
    const newLevel = Math.max(0, Math.min(1.0, stuffLevel + my * 0.002));
    setStuffLevel(newLevel);

    if (crankRef.current) {
      crankRef.current.rotation.x = -newLevel * Math.PI * 10;
    }
    if (rodRef.current) {
      // Base Y = 1.0. Plunge down by 0.8 units at max level
      rodRef.current.position.y = 1.0 - newLevel * 0.8;
    }
    
    if (newLevel >= 1.0) {
      setGamePhase('MOVE_SAUSAGE');
    }
  });

  const handleNozzleClick = () => {
    if (gamePhase === 'ATTACH_CASING') {
      setGamePhase('STUFFING');
    }
  };

  const handleSausageClick = () => {
    if (gamePhase === 'MOVE_SAUSAGE') {
      setGamePhase('MOVE_PAN');
    }
  };

  return (
    <group position={[-2.8, 0.4, 2]}>
      {/* Stuffer Base */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[1.0, 0.1, 1.0]} position={[0, 0, 0]} material={metalMat} receiveShadow />
      </RigidBody>

      {/* Canister */}
      <RigidBody type="fixed" colliders="hull">
        <Cylinder
          args={[0.3, 0.3, 1.0, 32]}
          position={[0, 0.5, 0]}
          material={metalMat}
          castShadow
        />
      </RigidBody>

      {/* Nozzle */}
      <Cylinder
        args={[0.05, 0.1, 0.4, 32]}
        rotation={[0, 0, -Math.PI / 2]}
        position={[0.4, 0.2, 0]}
        material={metalMat}
        castShadow
        onClick={handleNozzleClick}
      >
        {gamePhase === 'ATTACH_CASING' && (
           <mesh position={[0, 0.25, 0]}>
             <cylinderGeometry args={[0.05, 0.05, 0.1]} />
             <meshStandardMaterial color="#eeeeee" transparent opacity={0.5} />
           </mesh>
        )}
      </Cylinder>
      
      {/* Sausage visual for picking up */}
      {(gamePhase === 'MOVE_SAUSAGE' || gamePhase === 'STUFFING') && (
        <mesh 
          position={[0.8, 0.2, 0]} 
          rotation={[0, 0, Math.PI / 2]} 
          onClick={handleSausageClick}
        >
          <cylinderGeometry args={[0.08, 0.08, stuffLevel * 0.8]} />
          <meshStandardMaterial color="#822424" roughness={0.6} />
        </mesh>
      )}

      {/* Support Pillars */}
      <Box args={[0.05, 1.2, 0.05]} position={[-0.4, 0.6, 0]} material={metalMat} />
      <Box args={[0.05, 1.2, 0.05]} position={[0.4, 0.6, 0]} material={metalMat} />

      {/* Top Bar */}
      <Box args={[1.0, 0.2, 0.3]} position={[0, 1.2, 0]} material={metalMat} castShadow />

      {/* Threaded Rod */}
      <mesh ref={rodRef} position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.5, 16]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.5} />
      </mesh>

      {/* Crank */}
      {/* @ts-ignore */}
      <group {...bindCrank()} ref={crankRef} position={[0.5, 1.2, 0]}>
        <Box args={[0.05, 0.4, 0.05]} position={[0, 0.2, 0]} material={metalMat} />
        <Cylinder
          args={[0.03, 0.03, 0.1, 16]}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0.4, 0.05]}
        >
          <meshStandardMaterial color="#111" roughness={0.9} />
        </Cylinder>
        {/* Invisible hit box for easier grab */}
        <Box args={[0.4, 0.6, 0.4]} position={[0, 0.2, 0]} visible={false} />
      </group>
    </group>
  );
}
