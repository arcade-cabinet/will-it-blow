import {Box, Cylinder, useTexture} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {audioEngine} from '../../engine/AudioEngine';

export function Sink() {
  const [metalColor, metalNormal, metalRoughness] = useTexture([
    require('../../../public/textures/metal_plates_color.jpg'),
    require('../../../public/textures/metal_plates_normal.jpg'),
    require('../../../public/textures/metal_plates_roughness.jpg'),
  ]);

  const [concreteColor, concreteNormal, concreteRoughness] = useTexture([
    require('../../../public/textures/concrete_color.jpg'),
    require('../../../public/textures/concrete_normal.jpg'),
    require('../../../public/textures/concrete_roughness.jpg'),
  ]);

  const waterRef = useRef<THREE.Mesh>(null);
  const faucetHandleLRef = useRef<THREE.Group>(null);
  const faucetHandleRRef = useRef<THREE.Group>(null);

  // Chrome material for the sink basin
  const chromeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: metalColor,
        normalMap: metalNormal,
        roughnessMap: metalRoughness,
        color: '#dddddd',
        metalness: 0.9,
        roughness: 0.1,
      }),
    [metalColor, metalNormal, metalRoughness],
  );

  // Grimy concrete for the counter surrounding the sink
  const counterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: concreteColor,
        normalMap: concreteNormal,
        roughnessMap: concreteRoughness,
        color: '#888888',
        roughness: 0.9,
      }),
    [concreteColor, concreteNormal, concreteRoughness],
  );

  // Play ambient water/sizzle sound (re-using sizzle as a water-like loop)
  const waterSoundPlaying = useRef(false);
  useEffect(() => {
    // Start ambient water sound when sink mounts
    if (!waterSoundPlaying.current) {
      audioEngine.playSound('ambient');
      waterSoundPlaying.current = true;
    }
    return () => {
      waterSoundPlaying.current = false;
    };
  }, []);

  useFrame(state => {
    // Animate running water
    if (waterRef.current) {
      waterRef.current.position.y = 0.4 + Math.sin(state.clock.elapsedTime * 20) * 0.05;
      waterRef.current.scale.x = 0.9 + Math.random() * 0.2;
      waterRef.current.scale.z = 0.9 + Math.random() * 0.2;
    }
  });

  return (
    <group position={[-1.5, 0.4, -1.0]}>
      {/* Sink Cabinet Base */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[1.5, 0.8, 1.2]} position={[0, -0.4, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#3d2314" roughness={0.9} />
        </Box>
      </RigidBody>

      {/* Counter Top */}
      <RigidBody type="fixed" colliders="trimesh">
        {/* Left Side */}
        <Box
          args={[0.3, 0.1, 1.2]}
          position={[-0.6, 0.05, 0]}
          material={counterMat}
          castShadow
          receiveShadow
        />
        {/* Right Side */}
        <Box
          args={[0.3, 0.1, 1.2]}
          position={[0.6, 0.05, 0]}
          material={counterMat}
          castShadow
          receiveShadow
        />
        {/* Back Side */}
        <Box
          args={[0.9, 0.1, 0.3]}
          position={[0, 0.05, -0.45]}
          material={counterMat}
          castShadow
          receiveShadow
        />
        {/* Front Side */}
        <Box
          args={[0.9, 0.1, 0.3]}
          position={[0, 0.05, 0.45]}
          material={counterMat}
          castShadow
          receiveShadow
        />
      </RigidBody>

      {/* Chrome Basin */}
      <RigidBody type="fixed" colliders="hull">
        {/* Bottom */}
        <Box args={[0.9, 0.05, 0.6]} position={[0, -0.2, 0]} material={chromeMat} receiveShadow />
        {/* Walls */}
        <Box
          args={[0.05, 0.3, 0.6]}
          position={[-0.425, -0.05, 0]}
          material={chromeMat}
          receiveShadow
        />
        <Box
          args={[0.05, 0.3, 0.6]}
          position={[0.425, -0.05, 0]}
          material={chromeMat}
          receiveShadow
        />
        <Box
          args={[0.9, 0.3, 0.05]}
          position={[0, -0.05, -0.275]}
          material={chromeMat}
          receiveShadow
        />
        <Box
          args={[0.9, 0.3, 0.05]}
          position={[0, -0.05, 0.275]}
          material={chromeMat}
          receiveShadow
        />
      </RigidBody>

      {/* Faucet Base */}
      <Cylinder
        args={[0.05, 0.05, 0.1, 16]}
        position={[0, 0.15, -0.4]}
        material={chromeMat}
        castShadow
      />

      {/* Faucet Neck */}
      <mesh position={[0, 0.4, -0.25]} castShadow>
        <torusGeometry args={[0.15, 0.03, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#dddddd" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Faucet Handles */}
      <group ref={faucetHandleLRef} position={[-0.2, 0.15, -0.4]}>
        <Cylinder args={[0.03, 0.03, 0.05, 16]} material={chromeMat} />
        <Box args={[0.1, 0.02, 0.02]} position={[0, 0.05, 0]} material={chromeMat} />
      </group>

      <group ref={faucetHandleRRef} position={[0.2, 0.15, -0.4]}>
        <Cylinder args={[0.03, 0.03, 0.05, 16]} material={chromeMat} />
        <Box args={[0.1, 0.02, 0.02]} position={[0, 0.05, 0]} material={chromeMat} />
      </group>

      {/* Running Water Stream */}
      <mesh ref={waterRef} position={[0, 0.2, -0.1]}>
        <cylinderGeometry args={[0.015, 0.015, 0.5, 8]} />
        <meshPhysicalMaterial
          color="#aaccff"
          transparent
          opacity={0.6}
          transmission={0.9}
          roughness={0.1}
          thickness={0.5}
        />
      </mesh>

      {/* Drain Hole */}
      <Cylinder args={[0.05, 0.05, 0.06, 16]} position={[0, -0.19, 0]}>
        <meshStandardMaterial color="#111" />
      </Cylinder>
    </group>
  );
}
