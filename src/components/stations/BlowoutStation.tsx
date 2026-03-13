import {Box, useGLTF, useTexture} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {RigidBody} from '@react-three/rapier';
import {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../store/gameStore';

export function BlowoutStation() {
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  // Load the beautiful set piece assets
  const table = useGLTF('/models/table_styloo.glb') as any;
  const chair = useGLTF('/models/chair_styloo.glb') as any;

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Base Cereal Box Design
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#ffffff';
      ctx.font = '48px Impact';
      ctx.textAlign = 'center';
      ctx.fillText("MR. SAUSAGE'S", 256, 100);
      ctx.font = '72px Impact';
      ctx.fillText('FLAKES', 256, 180);
      ctx.fillStyle = '#aa4400';
      ctx.fillText('100% MEAT', 256, 400);

      // Simulate stain on mount
      ctx.fillStyle = 'rgba(150, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.arc(256, 256, 100, 0, Math.PI * 2);
      ctx.fill();
    }

    textureRef.current = new THREE.CanvasTexture(canvas);
    textureRef.current.needsUpdate = true;
  }, []);

  useFrame(() => {
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  });

  const gamePhase = useGameStore(state => state.gamePhase);
  const setGamePhase = useGameStore(state => state.setGamePhase);
  const setGroundMeatVol = useGameStore(state => state.setGroundMeatVol);
  const setStuffLevel = useGameStore(state => state.setStuffLevel);
  const setCookLevel = useGameStore(state => state.setCookLevel);

  const handleRestart = () => {
    if (gamePhase === 'DONE') {
      setGroundMeatVol(0);
      setStuffLevel(0);
      setCookLevel(0);
      setGamePhase('SELECT_INGREDIENTS');
    }
  };

  return (
    <group position={[-1.5, 0.0, 1.5]}>
      {/* Set Pieces */}
      {table.scene && (
        <RigidBody type="fixed" colliders="hull">
          <primitive object={table.scene.clone()} position={[0, 0, 0]} scale={1.2} />
        </RigidBody>
      )}

      {chair.scene && (
        <RigidBody type="fixed" colliders="hull">
          <primitive
            object={chair.scene.clone()}
            position={[0, 0, 0.8]}
            rotation={[0, Math.PI, 0]}
            scale={1.2}
          />
        </RigidBody>
      )}

      {/* Cereal Box */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, 0.95, 0]} castShadow receiveShadow onClick={handleRestart}>
          <boxGeometry args={[0.4, 0.6, 0.15]} />
          {textureRef.current ? (
            <meshStandardMaterial map={textureRef.current} roughness={0.6} />
          ) : (
            <meshStandardMaterial color="#ffaa00" roughness={0.6} />
          )}
        </mesh>
      </RigidBody>

      {/* Plate */}
      <RigidBody type="fixed" colliders="hull">
        <mesh position={[0, 0.75, 0.3]} castShadow receiveShadow>
          <cylinderGeometry args={[0.25, 0.2, 0.05, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
        </mesh>
      </RigidBody>
    </group>
  );
}

useGLTF.preload('/models/table_styloo.glb');
useGLTF.preload('/models/chair_styloo.glb');
