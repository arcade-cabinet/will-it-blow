/**
 * @module WaterBowl
 * Simple visual sub-component: a LatheGeometry bowl with translucent water
 * surface inside. The casing soaks here before being attached to the stuffer.
 *
 * Composed by StufferMechanics.
 */

import {useMemo} from 'react';
import * as THREE from 'three/webgpu';

// ---------------------------------------------------------------------------
// Bowl profile for LatheGeometry
// ---------------------------------------------------------------------------

const BOWL_POINTS = [
  new THREE.Vector2(0, 0),
  new THREE.Vector2(0.4, 0),
  new THREE.Vector2(0.5, 0.1),
  new THREE.Vector2(0.5, 0.35),
  new THREE.Vector2(0.45, 0.4),
  new THREE.Vector2(0, 0.4),
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WaterBowlProps {
  position?: [number, number, number];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WaterBowl({position = [0, 0, 0]}: WaterBowlProps) {
  const bowlGeo = useMemo(() => new THREE.LatheGeometry(BOWL_POINTS, 24), []);

  return (
    <group position={position}>
      {/* Bowl shell */}
      <mesh>
        <primitive object={bowlGeo} attach="geometry" />
        <meshBasicMaterial color={0xcccccc} side={THREE.DoubleSide} />
      </mesh>

      {/* Water surface */}
      <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color={0x88bbee} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
