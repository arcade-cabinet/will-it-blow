import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type * as THREE from 'three/webgpu';

interface StationMarkerProps {
  position: [number, number, number];
  visible: boolean;
}

/**
 * StationMarker — glowing pulsing waypoint indicator at a station.
 *
 * A small emissive sphere that bobs and pulses to guide the player
 * to the next challenge station. Disappears when the challenge activates.
 */
export function StationMarker({position, visible}: StationMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(state => {
    if (!meshRef.current || !matRef.current || !visible) return;

    const t = state.clock.getElapsedTime();

    // Gentle bob
    meshRef.current.position.y = position[1] + Math.sin(t * 2) * 0.15;

    // Pulse opacity
    matRef.current.opacity = 0.5 + 0.4 * Math.sin(t * 3);
  });

  if (!visible) return null;

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.2, 12, 12]} />
      <meshBasicMaterial
        ref={matRef}
        color="#44ff88"
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </mesh>
  );
}
