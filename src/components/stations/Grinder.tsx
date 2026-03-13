import {Box, Cylinder, useTexture} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useDrag} from '@use-gesture/react';
import {useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {audioEngine} from '../../engine/AudioEngine';
import {useGameStore} from '../../store/gameStore';

export function Grinder() {
  const [isGrinderOn, setIsGrinderOn] = useState(false);
  const faceplateRef = useRef<THREE.Mesh>(null);
  const motorRef = useRef<THREE.Group>(null);
  const plungerRef = useRef<THREE.Group>(null);

  // Plunger Y state
  const [plungerY, setPlungerY] = useState(1.2);

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
        color: '#888',
        metalness: 0.8,
        roughness: 0.4,
      }),
    [metalMap, metalNormal, metalRough],
  );

  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const setGroundMeatVol = useGameStore(state => state.setGroundMeatVol);
  const groundMeatVol = useGameStore(state => state.groundMeatVol);

  const toggleGrinder = () => {
    const nextState = !isGrinderOn;
    setIsGrinderOn(nextState);
    if (nextState && gamePhase === 'FILL_GRINDER') {
      setGamePhase('GRINDING');
    }
  };

  const bindPlunger = useDrag(({ offset: [, y] }) => {
    if (gamePhase !== 'GRINDING') return;
    // Offset y goes positive when dragging down screen
    // Map this to our 3D world.
    // Base Y is 1.2. Max plunge is 0.5.
    const newY = Math.max(0.5, Math.min(1.2, 1.2 - y * 0.01));
    setPlungerY(newY);

    // Play sound based on plunger position
    if (isGrinderOn) {
      const plungePercent = 1.0 - ((newY - 0.5) / 0.7);
      audioEngine.setGrinderSpeed(0.2 + plungePercent * 0.8);

      // Increase ground meat volume
      setGroundMeatVol(prev => {
        const next = Math.min(1.0, prev + 0.01 * plungePercent);
        if (next >= 1.0 && gamePhase === 'GRINDING') {
          setGamePhase('MOVE_BOWL');
        }
        return next;
      });
    }
  });

  useEffect(() => {
    if (isGrinderOn && gamePhase === 'GRINDING') {
      audioEngine.setGrinderSpeed(0.2);
    } else {
      audioEngine.setGrinderSpeed(0);
    }

    return () => audioEngine.setGrinderSpeed(0);
  }, [isGrinderOn, gamePhase]);

  useFrame((state, delta) => {
    if (isGrinderOn) {
      const t = state.clock.elapsedTime;
      if (faceplateRef.current) {
        faceplateRef.current.rotation.y += delta * 5;
      }
      if (motorRef.current) {
        motorRef.current.position.x = -2.8 + Math.sin(t * 50) * 0.01;
      }
    }
  });

  return (
    <group ref={motorRef} position={[-2.8, 1.2, -2]}>
      {/* Grinder Body */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[0.6, 0.8, 0.8]} position={[-0.3, 0, 0]} material={metalMat} castShadow />
      </RigidBody>

      {/* Extruder */}
      <Cylinder
        args={[0.2, 0.2, 0.6, 32]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0.2, 0, 0]}
        material={metalMat}
        castShadow
      />

      {/* Chute */}
      <Cylinder
        args={[0.25, 0.15, 0.4, 32]}
        position={[0.2, 0.4, 0]}
        material={metalMat}
        castShadow
      />

      {/* Tray */}
      <Box 
        args={[0.8, 0.05, 0.6]} 
        position={[0.2, 0.6, 0]} 
        material={metalMat} 
        castShadow 
        onClick={() => {
          if (gamePhase === 'MOVE_BOWL') {
            setGamePhase('ATTACH_CASING');
          }
        }}
      >
        {groundMeatVol > 0 && (
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.7, 0.05 * groundMeatVol, 0.5]} />
            <meshStandardMaterial color="#822424" roughness={0.8} />
          </mesh>
        )}
      </Box>

      {/* Plunger */}
      {/* @ts-ignore - use-gesture typing requires this cast for R3F elements */}
      <group {...bindPlunger()} ref={plungerRef} position={[0.2, plungerY, 0]}>
        <Cylinder args={[0.12, 0.12, 0.6, 16]} position={[0, -0.3, 0]}>
          <meshStandardMaterial color="#fff" roughness={0.4} />
        </Cylinder>
        <Cylinder args={[0.18, 0.18, 0.05, 16]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#fff" roughness={0.4} />
        </Cylinder>
        <Cylinder args={[0.05, 0.05, 0.2, 16]} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#fff" roughness={0.4} />
        </Cylinder>
        {/* Invisible larger hit box for easier grabbing */}
        <Cylinder args={[0.3, 0.3, 1.0, 16]} position={[0, -0.2, 0]} visible={false} />
      </group>

      {/* Faceplate */}
      <mesh ref={faceplateRef} position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
        <meshStandardMaterial color="#222" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Switch */}
      <group position={[-0.1, 0.2, 0.45]} onClick={toggleGrinder}>
        <Cylinder args={[0.05, 0.05, 0.1, 16]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color={isGrinderOn ? '#44ff44' : '#ff4444'}
            emissive={isGrinderOn ? '#22aa22' : '#aa2222'}
          />
        </Cylinder>
      </group>
    </group>
  );
}
