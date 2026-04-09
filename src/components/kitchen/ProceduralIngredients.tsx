import {Box, Cylinder, Sphere} from '@react-three/drei';
import {RigidBody} from '@react-three/rapier';
import {useMemo} from 'react';
import * as THREE from 'three';

export interface IngredientProps {
  type: 'meat' | 'water' | 'grease' | 'mystery';
  position: [number, number, number];
}

const INGREDIENT_COLORS = {
  meat: '#822424',
  water: '#aaccff',
  grease: '#cccc22',
  mystery: '#4422aa',
};

export function ProceduralIngredient({type, position}: IngredientProps) {
  const color = INGREDIENT_COLORS[type];

  const material = useMemo(() => {
    switch (type) {
      case 'water':
        return new THREE.MeshPhysicalMaterial({
          color,
          transmission: 0.9,
          opacity: 1,
          transparent: true,
          roughness: 0.1,
          thickness: 0.5,
        });
      case 'grease':
        return new THREE.MeshPhysicalMaterial({
          color,
          transmission: 0.5,
          opacity: 0.8,
          transparent: true,
          roughness: 0.4,
          clearcoat: 1.0,
        });
      default:
        return new THREE.MeshStandardMaterial({color, roughness: 0.8, metalness: 0.1});
    }
  }, [type, color]);

  // Select random shape based on simple hash of position
  const shapeIndex =
    Math.abs(Math.floor(position[0] * 10 + position[1] * 10 + position[2] * 10)) % 3;

  return (
    <RigidBody position={position} colliders="hull" restitution={0.2} friction={0.8}>
      {/* D.3: Small fridge items — no castShadow (too many small casters).
          receiveShadow kept so they catch station/ceiling shadows. */}
      {shapeIndex === 0 && <Box args={[0.2, 0.2, 0.2]} material={material} receiveShadow />}
      {shapeIndex === 1 && <Sphere args={[0.15, 16, 16]} material={material} receiveShadow />}
      {shapeIndex === 2 && (
        <Cylinder args={[0.1, 0.1, 0.2, 16]} material={material} receiveShadow />
      )}
    </RigidBody>
  );
}

export function ProceduralIngredientsList() {
  return (
    <group>
      <ProceduralIngredient type="meat" position={[-1.2, 0.6, -2.4]} />
      <ProceduralIngredient type="meat" position={[-1.5, 0.6, -2.5]} />
      <ProceduralIngredient type="meat" position={[-1.7, 0.6, -2.6]} />

      {/* "DLC" Additions */}
      <ProceduralIngredient type="water" position={[-1.6, 0.8, -2.2]} />
      <ProceduralIngredient type="grease" position={[-1.3, 0.8, -2.4]} />
      <ProceduralIngredient type="mystery" position={[-1.4, 0.8, -2.6]} />
    </group>
  );
}
