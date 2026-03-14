/**
 * @module ChestFreezer
 * 3D interactive chest freezer station for ingredient selection.
 *
 * Renders ingredient items with onClick handlers. Selected ingredients
 * highlight with emissive pulse. 3 ingredients required.
 *
 * Reads ingredient data from props. Writes selected IDs via onSelect callback.
 */

import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type * as THREE from 'three/webgpu';
import {audioEngine} from '../../engine/AudioEngine';

interface IngredientItem {
  id: string;
  name: string;
  color?: string;
}

interface ChestFreezerProps {
  position?: [number, number, number];
  /** Available ingredients to display */
  ingredients?: IngredientItem[];
  /** Currently selected ingredient IDs */
  selectedIds?: string[];
  /** Called when an ingredient is selected */
  onSelect?: (id: string) => void;
  /** Number of ingredients required */
  requiredCount?: number;
}

function IngredientMesh({
  item,
  index,
  isSelected,
  onSelect,
}: {
  item: IngredientItem;
  index: number;
  isSelected: boolean;
  onSelect?: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const emissiveIntensityRef = useRef(0);

  // Emissive pulse animation for selected items
  useFrame((_, _delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (isSelected) {
      emissiveIntensityRef.current = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
      mat.emissiveIntensity = emissiveIntensityRef.current;
    } else {
      mat.emissiveIntensity = 0;
    }
  });

  // Layout ingredients in a grid inside the freezer
  const col = index % 3;
  const row = Math.floor(index / 3);
  const x = (col - 1) * 0.2;
  const z = (row - 0.5) * 0.2;

  return (
    <mesh
      ref={meshRef}
      position={[x, 0.15, z]}
      onClick={() => {
        audioEngine.playSound('click');
        onSelect?.(item.id);
      }}
    >
      <boxGeometry args={[0.12, 0.12, 0.12]} />
      <meshStandardMaterial
        color={item.color ?? '#DD6868'}
        roughness={0.6}
        metalness={0.1}
        emissive={isSelected ? '#FFD700' : '#000000'}
        emissiveIntensity={0}
      />
    </mesh>
  );
}

export function ChestFreezer({
  position = [0, 0, 0],
  ingredients = [],
  selectedIds = [],
  onSelect,
  requiredCount = 3,
}: ChestFreezerProps) {
  const selectedSet = new Set(selectedIds);

  return (
    <group position={position}>
      {/* Freezer body */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.8, 0.6, 0.5]} />
        <meshStandardMaterial color="#E8E8E8" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Freezer lid (open) */}
      <mesh position={[0, 0.65, -0.22]} rotation={[-0.8, 0, 0]}>
        <boxGeometry args={[0.78, 0.03, 0.48]} />
        <meshStandardMaterial color="#D8D8D8" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Interior cold light */}
      <pointLight position={[0, 0.5, 0]} intensity={0.5} color="#AADDFF" distance={1.5} />
      {/* Interior dark base */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.74, 0.02, 0.44]} />
        <meshStandardMaterial color="#555555" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Ingredient items */}
      {ingredients.map((item, i) => (
        <IngredientMesh
          key={item.id}
          item={item}
          index={i}
          isSelected={selectedSet.has(item.id)}
          onSelect={selectedIds.length < requiredCount ? onSelect : undefined}
        />
      ))}
    </group>
  );
}
