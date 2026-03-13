import {Box, Plane} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useMemo, useRef} from 'react';
import type * as THREE from 'three';
import {createCrtMaterial, crtUniforms} from '../effects/CrtShader';

export function TV() {
  const materialRef = useRef<THREE.Material>(null);

  const crtMaterial = useMemo(() => createCrtMaterial('tv-screen'), []);

  useFrame(state => {
    // Update CRT uniforms each frame
    crtUniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <group position={[-2.8, 1.8, 0]}>
      {/* Wall Mount */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[0.2, 0.4, 0.4]} position={[-0.1, 0, 0]}>
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </Box>
      </RigidBody>

      {/* CRT TV Body */}
      <RigidBody type="fixed" colliders="cuboid">
        <Box args={[0.8, 0.8, 1.0]} position={[0.4, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#111" roughness={0.9} />
        </Box>
      </RigidBody>

      {/* TV Screen */}
      <Plane args={[0.65, 0.8]} position={[0.81, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <primitive object={crtMaterial} ref={materialRef} attach="material" />
      </Plane>
    </group>
  );
}
