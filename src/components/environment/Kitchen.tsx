/**
 * @module Kitchen
 * 3D kitchen environment using useGLTF for model loading.
 * Provides ambient, hemisphere, and point lighting for the horror kitchen scene.
 */

import {useGLTF} from '@react-three/drei';
import {Suspense} from 'react';

interface KitchenProps {
  /** Path to the kitchen GLB model */
  modelPath?: string;
  position?: [number, number, number];
}

function KitchenModel({modelPath}: {modelPath: string}) {
  const {scene} = useGLTF(modelPath);
  return <primitive object={scene} />;
}

export function Kitchen({modelPath, position = [0, 0, 0]}: KitchenProps) {
  return (
    <group position={position}>
      {/* Ambient light - low horror ambiance */}
      <ambientLight intensity={0.15} color="#1a1a2e" />

      {/* Hemisphere light - cool sky, warm ground */}
      <hemisphereLight intensity={0.3} color="#4444aa" groundColor="#442200" />

      {/* Overhead point light - fluorescent feel */}
      <pointLight position={[0, 2.8, 0]} intensity={1.2} color="#ffe8cc" distance={8} decay={2} />

      {/* Secondary point light - corner accent */}
      <pointLight position={[-2, 2, -1]} intensity={0.4} color="#ff4444" distance={5} decay={2} />

      {/* Emergency light - red horror accent */}
      <pointLight position={[2, 1.5, 1]} intensity={0.3} color="#ff0000" distance={4} decay={2} />

      {/* Kitchen model (if provided) */}
      {modelPath && (
        <Suspense fallback={null}>
          <KitchenModel modelPath={modelPath} />
        </Suspense>
      )}
    </group>
  );
}
