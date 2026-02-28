import {useFrame} from '@react-three/fiber';
import {useRef, useState} from 'react';
import * as THREE from 'three/webgpu';
import type {Ingredient} from '../../engine/Ingredients';

interface FridgeStationProps {
  ingredients: Ingredient[];
  selectedIds: Set<number>;
  hintActive: boolean;
  matchingIndices: Set<number>;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

// Position aligned with GLB fridge (Cube001_2): center [-5.16, 1.79, -5.02], size [1.01, 2.92, 1.42]
// The group origin sits at the fridge center; ingredients sit on shelves inside the volume.
const FRIDGE_POS: [number, number, number] = [-5.16, 1.79, -5.02];
const FRIDGE_W = 1.01; // x
const FRIDGE_H = 2.92; // y
const FRIDGE_D = 1.42; // z
const HALF_W = FRIDGE_W / 2;
const HALF_D = FRIDGE_D / 2;

const SHELF_COUNT = 3;
// Shelf Y offsets from fridge center (spread across the 2.92-unit height)
const SHELF_Y_POSITIONS = [-0.8, 0.0, 0.8];
const ITEMS_PER_SHELF = 4;
const INGREDIENT_DIAMETER = 0.22;

// Door spring animation
const DOOR_OPEN_ANGLE = 1.7; // ~97 degrees
const DOOR_OPEN_DELAY = 0.4; // seconds after mount before opening starts
const DOOR_SPRING_STIFFNESS = 3.0;
const DOOR_SPRING_DAMPING = 0.88;

/** Converts a hex color string to a THREE.Color. */
function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

// -------------------------------------------------------
// FridgeDoor — spring-damped animated door that swings open
// -------------------------------------------------------

function FridgeDoor() {
  const hingeRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const angleRef = useRef(0);
  const velocityRef = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;
    if (!hingeRef.current) return;

    // Wait for delay before opening
    if (timeRef.current < DOOR_OPEN_DELAY) return;

    // Spring toward target angle
    const target = DOOR_OPEN_ANGLE;
    const diff = target - angleRef.current;
    velocityRef.current += diff * DOOR_SPRING_STIFFNESS * dt;
    velocityRef.current *= DOOR_SPRING_DAMPING;
    angleRef.current += velocityRef.current;

    // Clamp to reasonable range
    angleRef.current = Math.max(0, Math.min(DOOR_OPEN_ANGLE + 0.2, angleRef.current));
    hingeRef.current.rotation.y = -angleRef.current;
  });

  return (
    // Hinge at +x edge, +z face of fridge (handle side, front face)
    <group ref={hingeRef} position={[HALF_W, 0, HALF_D]}>
      {/* Door panel */}
      <mesh position={[-HALF_W, 0, 0.015]}>
        <boxGeometry args={[FRIDGE_W - 0.02, FRIDGE_H - 0.04, 0.03]} />
        <meshStandardMaterial color="#f0ede5" roughness={0.35} metalness={0.05} />
      </mesh>

      {/* Rubber gasket rim (dark border around the door interior) */}
      <mesh position={[-HALF_W, 0, 0.0]}>
        <boxGeometry args={[FRIDGE_W + 0.01, FRIDGE_H + 0.01, 0.008]} />
        <meshStandardMaterial color="#333333" roughness={0.9} metalness={0.0} />
      </mesh>

      {/* Handle — metallic bar near the free edge */}
      <mesh position={[-FRIDGE_W + 0.12, 0.15, 0.04]}>
        <boxGeometry args={[0.02, 0.22, 0.035]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.15} metalness={0.8} />
      </mesh>
    </group>
  );
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
    } else {
      mat.emissiveIntensity = hovered && !isSelected ? 0.25 : 0;
      if (hovered && !isSelected) {
        mat.emissive.set('#ffffff');
      }
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
        emissive="#000000"
        emissiveIntensity={0}
      />
    </mesh>
  );
}

// -------------------------------------------------------
// FridgeStation — immersive fridge with door, shelves, PBR ingredients
// -------------------------------------------------------

export const FridgeStation = ({
  ingredients,
  selectedIds,
  hintActive,
  matchingIndices,
  onSelect,
  onHover,
}: FridgeStationProps) => {
  return (
    <group position={FRIDGE_POS}>
      {/* Interior fridge lighting — cool white glow from top and middle shelf */}
      <pointLight
        position={[0.1, 1.0, 0.3]}
        intensity={1.8}
        color="#e0f0ff"
        distance={2.5}
        decay={2}
      />
      <pointLight
        position={[0.1, -0.3, 0.3]}
        intensity={0.8}
        color="#e0f0ff"
        distance={2.0}
        decay={2}
      />

      {/* Animated door that swings open on mount */}
      <FridgeDoor />

      {/* Glass shelves */}
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
        const xOffset = (slotIndex - (ITEMS_PER_SHELF - 1) / 2) * 0.22;
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
