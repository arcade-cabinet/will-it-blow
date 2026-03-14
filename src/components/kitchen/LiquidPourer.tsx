/**
 * @module LiquidPourer
 * Liquid pouring mechanics for kitchen station interactions. Renders an
 * interactive bottle that tilts on pointer-down and streams a translucent
 * liquid column. Only visible during FILL_GRINDER and ATTACH_CASING phases.
 */
import {Cone, Cylinder} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {useGameStore} from '../../ecs/hooks';

/**
 * Interactive liquid bottle with pour animation.
 * @param position - World-space position to place the bottle group.
 */
export function LiquidPourer({position = [0, 0, 0]}: {position?: [number, number, number]}) {
  const [isPouring, setIsPouring] = useState(false);
  const liquidRef = useRef<THREE.Mesh>(null);
  const bottleRef = useRef<THREE.Group>(null);

  const gamePhase = useGameStore(state => state.gamePhase);

  // Only visible/active during grinder filling or stuffering
  const isRelevantPhase = gamePhase === 'FILL_GRINDER' || gamePhase === 'ATTACH_CASING';

  const liquidMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#aaccff', // Water DLC by default
        transmission: 0.9,
        opacity: 1,
        transparent: true,
        roughness: 0.1,
        thickness: 0.5,
      }),
    [],
  );

  useFrame((state, delta) => {
    if (!bottleRef.current) return;

    // Tilt the bottle when pouring using delta-based damping
    const targetRotZ = isPouring ? -Math.PI / 2.2 : 0;
    bottleRef.current.rotation.z = THREE.MathUtils.lerp(
      bottleRef.current.rotation.z,
      targetRotZ,
      1 - 0.001 ** delta,
    );

    if (liquidRef.current) {
      if (isPouring) {
        liquidRef.current.visible = true;
        const t = state.clock.elapsedTime;
        liquidRef.current.position.y = -0.5 - Math.sin(t * 30) * 0.05;
        // Use deterministic noise for scaling
        liquidRef.current.scale.x = 0.9 + Math.sin(t * 40) * 0.1;
        liquidRef.current.scale.z = 0.9 + Math.cos(t * 45) * 0.1;
      } else {
        liquidRef.current.visible = false;
      }
    }
  });

  if (!isRelevantPhase) return null;

  return (
    <group position={position}>
      <group
        ref={bottleRef}
        position={[0, 0.6, 0]}
        onPointerDown={() => setIsPouring(true)}
        onPointerUp={() => setIsPouring(false)}
        onPointerOut={() => setIsPouring(false)}
      >
        {/* Bottle Body */}
        <Cylinder args={[0.15, 0.15, 0.4, 16]} position={[0, -0.2, 0]}>
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.9}
            transparent
            opacity={1}
            roughness={0.1}
          />
        </Cylinder>
        {/* Bottle Neck */}
        <Cone args={[0.15, 0.15, 16]} position={[0, 0.075, 0]}>
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.9}
            transparent
            opacity={1}
            roughness={0.1}
          />
        </Cone>
        <Cylinder args={[0.04, 0.04, 0.1, 16]} position={[0, 0.2, 0]}>
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.9}
            transparent
            opacity={1}
            roughness={0.1}
          />
        </Cylinder>
        {/* Label */}
        <Cylinder args={[0.151, 0.151, 0.2, 16]} position={[0, -0.2, 0]}>
          <meshStandardMaterial color="#2244aa" roughness={0.4} />
        </Cylinder>

        {/* Liquid Stream */}
        <mesh
          ref={liquidRef}
          position={[0.2, -0.5, 0]}
          rotation={[0, 0, Math.PI / 2]}
          visible={false}
        >
          <cylinderGeometry args={[0.02, 0.02, 1.0, 8]} />
          <primitive object={liquidMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}
