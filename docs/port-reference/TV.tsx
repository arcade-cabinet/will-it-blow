import {Box, Plane} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useMemo, useRef} from 'react';
import * as THREE from 'three';

// CRT shader disabled for native — three/tsl crashes on Hermes runtime
// TODO: Rewrite CRT effect without TSL NodeMaterial for native compatibility

export function TV() {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Simple green CRT fallback instead of TSL shader
  const crtMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({color: 0x002200, transparent: true, opacity: 0.9}),
    [],
  );

  useFrame(state => {
    if (materialRef.current) {
      // Subtle flicker
      const flicker = 0.85 + Math.sin(state.clock.elapsedTime * 8) * 0.15;
      materialRef.current.opacity = flicker;
    }
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
