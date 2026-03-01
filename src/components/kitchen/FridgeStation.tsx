import {useFrame} from '@react-three/fiber';
import {useRef, useState} from 'react';
import * as THREE from 'three/webgpu';
import type {Ingredient} from '../../engine/Ingredients';

interface FridgeStationProps {
  position: [number, number, number];
  ingredients: Ingredient[];
  selectedIds: Set<number>;
  hintActive: boolean;
  matchingIndices: Set<number>;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

const FRIDGE_W = 1.01; // x
const FRIDGE_H = 2.92; // y
const FRIDGE_D = 1.42; // z
const HALF_D = FRIDGE_D / 2;

const SHELF_COUNT = 3;
// Shelf Y offsets from fridge center (spread across the 2.92-unit height)
const SHELF_Y_POSITIONS = [-0.8, 0.0, 0.8];
const ITEMS_PER_SHELF = 4;
const INGREDIENT_DIAMETER = 0.28;

/** Converts a hex color string to a THREE.Color. */
function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

// -------------------------------------------------------
// FridgeShelf — glass/wire shelf with blue tint
// -------------------------------------------------------

function FridgeShelf({y}: {y: number}) {
  return (
    <mesh position={[0, y, 0]}>
      <boxGeometry args={[FRIDGE_W - 0.08, 0.012, FRIDGE_D - 0.08]} />
      <meshStandardMaterial
        color="#b8d8e8"
        transparent
        opacity={0.5}
        roughness={0.05}
        metalness={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// -------------------------------------------------------
// IngredientMesh — PBR clickable ingredient on shelf
// -------------------------------------------------------

interface IngredientMeshProps {
  index: number;
  ingredient: Ingredient;
  position: [number, number, number];
  isSelected: boolean;
  isHinted: boolean;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

function IngredientMesh({
  index,
  ingredient,
  position,
  isSelected,
  isHinted,
  onSelect,
  onHover,
}: IngredientMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const baseColor = useRef(hexToThreeColor(ingredient.color));
  const scaleVec = useRef(new THREE.Vector3(1, 1, 1));

  // Stagger the bob animation per ingredient so they don't all bob in sync
  const bobPhase = useRef(index * 0.7);

  useFrame(state => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const t = state.clock.getElapsedTime();

    // Subtle idle bob animation
    const bobY = Math.sin(t * 1.5 + bobPhase.current) * 0.008;

    // Selected: slide forward and fade out
    if (isSelected) {
      const targetZ = position[2] + 0.5;
      mesh.position.z += (targetZ - mesh.position.z) * 0.1;
      mat.opacity = 0.3;
      mat.transparent = true;
    } else {
      // Ease back to rest position with bob
      mesh.position.z += (position[2] - mesh.position.z) * 0.1;
      mesh.position.y += (position[1] + bobY - mesh.position.y) * 0.15;
      mat.opacity = 1.0;
      mat.transparent = false;
    }

    // Hover scale-up (smooth lerp)
    const targetScale = hovered && !isSelected ? 1.2 : 1.0;
    scaleVec.current.set(targetScale, targetScale, targetScale);
    mesh.scale.lerp(scaleVec.current, 0.15);

    // Hint glow: pulsing emissive on matching ingredients
    if (isHinted && !isSelected) {
      const pulse = 0.4 + 0.6 * Math.sin(t * 6);
      mat.emissiveIntensity = pulse * 0.6;
      mat.emissive.copy(baseColor.current);
    } else if (hovered && !isSelected) {
      mat.emissiveIntensity = 0.35;
      mat.emissive.set('#ffffff');
    } else {
      // Resting glow — keeps ingredients visible in dim fridge
      mat.emissiveIntensity = 0.15;
      mat.emissive.copy(baseColor.current);
    }

    mat.color.copy(baseColor.current);
  });

  // Choose geometry based on ingredient shape
  const renderGeometry = () => {
    const shape = ingredient.shape;
    switch (shape.base) {
      case 'box':
      case 'irregular':
        return (
          <boxGeometry args={[INGREDIENT_DIAMETER, INGREDIENT_DIAMETER, INGREDIENT_DIAMETER]} />
        );
      case 'cylinder':
        return (
          <cylinderGeometry
            args={[
              INGREDIENT_DIAMETER / 2,
              INGREDIENT_DIAMETER / 2,
              shape.detail === 'flat' ? INGREDIENT_DIAMETER * 0.5 : INGREDIENT_DIAMETER,
              12,
            ]}
          />
        );
      case 'cone':
      case 'wedge':
        return <cylinderGeometry args={[0, INGREDIENT_DIAMETER / 2, INGREDIENT_DIAMETER, 12]} />;
      case 'small-sphere':
        return <sphereGeometry args={[INGREDIENT_DIAMETER * 0.35, 10, 10]} />;
      case 'elongated':
        return (
          <cylinderGeometry
            args={[
              INGREDIENT_DIAMETER * 0.25,
              INGREDIENT_DIAMETER * 0.25,
              INGREDIENT_DIAMETER * 1.5,
              12,
            ]}
          />
        );
      default:
        return <sphereGeometry args={[INGREDIENT_DIAMETER / 2, 12, 12]} />;
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={e => {
        e.stopPropagation();
        if (!isSelected) {
          onSelect(index);
        }
      }}
      onPointerOver={e => {
        e.stopPropagation();
        setHovered(true);
        onHover(index);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = isSelected ? 'default' : 'pointer';
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'default';
        }
      }}
    >
      {renderGeometry()}
      <meshStandardMaterial
        ref={matRef}
        color={ingredient.color}
        roughness={0.55}
        metalness={0.08}
        emissive={ingredient.color}
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

// -------------------------------------------------------
// FridgeStation — immersive fridge with door, shelves, PBR ingredients
// -------------------------------------------------------

export const FridgeStation = ({
  position,
  ingredients,
  selectedIds,
  hintActive,
  matchingIndices,
  onSelect,
  onHover,
}: FridgeStationProps) => {
  return (
    <group position={position}>
      {/* Interior fridge lighting — cool white glow from top and middle shelf */}
      <pointLight
        position={[0.1, 1.0, 0.3]}
        intensity={3.0}
        color="#e0f0ff"
        distance={3.5}
        decay={2}
      />
      <pointLight
        position={[0.1, -0.3, 0.3]}
        intensity={1.5}
        color="#e0f0ff"
        distance={3.0}
        decay={2}
      />

      {/* Glass shelves (door is part of fridge.glb, animated via FurnitureLoader) */}
      {SHELF_Y_POSITIONS.map((y, i) => (
        <FridgeShelf key={i} y={y} />
      ))}

      {/* Fridge back wall interior (slightly off-white, catches interior light) */}
      <mesh position={[0, 0, -HALF_D + 0.02]}>
        <planeGeometry args={[FRIDGE_W - 0.04, FRIDGE_H - 0.04]} />
        <meshStandardMaterial color="#eae8e0" roughness={0.8} metalness={0.0} />
      </mesh>

      {/* Ingredients on shelves */}
      {ingredients.map((ingredient, i) => {
        const shelfIndex = Math.floor(i / ITEMS_PER_SHELF) % SHELF_COUNT;
        const slotIndex = i % ITEMS_PER_SHELF;

        // Spread items across the fridge width (~1.0 unit wide)
        const xOffset = (slotIndex - (ITEMS_PER_SHELF - 1) / 2) * 0.24;
        // Place on shelf + half diameter clearance above shelf surface
        const shelfY = SHELF_Y_POSITIONS[shelfIndex] + INGREDIENT_DIAMETER / 2 + 0.012;
        // Push forward toward fridge opening so they're visible
        const zOffset = 0.25;

        return (
          <IngredientMesh
            key={i}
            index={i}
            ingredient={ingredient}
            position={[xOffset, shelfY, zOffset]}
            isSelected={selectedIds.has(i)}
            isHinted={hintActive && matchingIndices.has(i)}
            onSelect={onSelect}
            onHover={onHover}
          />
        );
      })}
    </group>
  );
};
