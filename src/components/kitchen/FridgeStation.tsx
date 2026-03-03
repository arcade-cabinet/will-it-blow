/**
 * @module FridgeStation
 * 3D fridge interior with interactive ingredient meshes on glass shelves.
 *
 * Part of the "fridge bridge" pattern: this 3D component renders the
 * ingredients that the player clicks to select. Clicks are forwarded to
 * the Zustand store via `onSelect(index)`, which the IngredientChallenge
 * overlay then processes for scoring.
 *
 * Features:
 * - 3 glass shelves with per-shelf ingredient layout
 * - PBR ingredient meshes with shape-based geometry (8 shape types)
 * - Hover scale-up + emissive glow with cursor change
 * - Hint mode: matching ingredients pulse with emissive glow
 * - Selected ingredients fade to 30% opacity (web: physics pop; native: slide)
 * - Interior cold-white point lights for fridge ambiance
 * - Web: Rapier rigid bodies for each ingredient (click pops with impulse)
 * - Native: Manual position animation in useFrame
 */

import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import type {RapierRigidBody} from '@react-three/rapier';
import {BallCollider, CuboidCollider, RigidBody} from '@react-three/rapier';
import {Suspense, useMemo, useRef} from 'react';
import {Platform} from 'react-native';
import * as THREE from 'three/webgpu';
import {config} from '../../config';
import {getAssetUrl} from '../../engine/assetUrl';
import type {Ingredient} from '../../engine/Ingredients';

/**
 * @param props.position - Fridge world position from resolveTargets()
 * @param props.ingredients - Pool of 10 ingredients to display
 * @param props.selectedIds - Set of already-selected pool indices (faded out)
 * @param props.hintActive - Whether hint glow is active on matching ingredients
 * @param props.matchingIndices - Set of pool indices that match the criteria
 * @param props.onSelect - Called with pool index when player clicks an ingredient
 * @param props.onHover - Called with pool index on hover, null on hover-out
 */
interface FridgeStationProps {
  position: [number, number, number];
  ingredients: Ingredient[];
  selectedIds: Set<number>;
  hintActive: boolean;
  matchingIndices: Set<number>;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

// Constants from centralized config
const {
  fridgeWidth: FRIDGE_W,
  fridgeHeight: FRIDGE_H,
  fridgeDepth: FRIDGE_D,
  shelfYPositions: SHELF_Y_POSITIONS,
  ingredientDiameter: INGREDIENT_DIAMETER,
  ingredientColliderPadding,
  shelfTiers: SHELF_TIER,
  maxSpacing: MAX_SPACING,
  zOffset: Z_OFFSET,
} = config.scene.fridge;
const HALF_D = FRIDGE_D / 2;

/** Converts a hex color string to a THREE.Color. */
function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

// -------------------------------------------------------
// FridgeShelf — glass/wire shelf with blue tint
// -------------------------------------------------------

const isWeb = Platform.OS === 'web';

function FridgeShelf({y}: {y: number}) {
  const shelfW = FRIDGE_W - 0.08;
  const shelfH = 0.012;
  const shelfD = FRIDGE_D - 0.08;

  const shelfMesh = (
    <mesh position={isWeb ? undefined : [0, y, 0]}>
      <boxGeometry args={[shelfW, shelfH, shelfD]} />
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

  if (!isWeb) return shelfMesh;

  return (
    <RigidBody type="fixed" position={[0, y, 0]} colliders={false}>
      <CuboidCollider args={[shelfW / 2, shelfH / 2, shelfD / 2]} />
      {shelfMesh}
    </RigidBody>
  );
}

// -------------------------------------------------------
// GlbIngredientGeometry — loads a GLB model and scales it to fit INGREDIENT_DIAMETER
// -------------------------------------------------------

function GlbIngredientGeometry({glbPath}: {glbPath: string}) {
  const url = getAssetUrl('models', `ingredients/${glbPath}`);
  const {scene} = useGLTF(url);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    // Normalize scale to fit within INGREDIENT_DIAMETER bounding sphere
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = INGREDIENT_DIAMETER / maxDim;
      c.scale.multiplyScalar(scale);
    }
    // Center the model
    const center = new THREE.Vector3();
    box.getCenter(center);
    c.position.sub(center.multiplyScalar(c.scale.x));
    return c;
  }, [scene]);

  return <primitive object={cloned} />;
}

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

/** Radius for the BallCollider wrapping each ingredient (slightly larger than visual). */
const INGREDIENT_COLLIDER_RADIUS = INGREDIENT_DIAMETER / 2 + ingredientColliderPadding;

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
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const hoveredRef = useRef(false);
  const baseColor = useRef(hexToThreeColor(ingredient.color));
  const scaleVec = useRef(new THREE.Vector3(1, 1, 1));
  const impulseApplied = useRef(false);

  // Stagger the bob animation per ingredient so they don't all bob in sync
  const bobPhase = useRef(index * 0.7);

  useFrame(state => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const t = state.clock.getElapsedTime();

    // On web, physics handles position when selected (impulse applied).
    // Only do manual position animation on native or when not selected.
    if (!isWeb) {
      // Subtle idle bob animation
      const bobY = Math.sin(t * 1.5 + bobPhase.current) * 0.008;

      if (isSelected) {
        const targetZ = position[2] + 0.5;
        mesh.position.z += (targetZ - mesh.position.z) * 0.1;
        mat.opacity = 0.3;
        mat.transparent = true;
      } else {
        mesh.position.z += (position[2] - mesh.position.z) * 0.1;
        mesh.position.y += (position[1] + bobY - mesh.position.y) * 0.15;
        mat.opacity = 1.0;
        mat.transparent = false;
      }
    } else {
      // Web: fade selected ingredients
      if (isSelected) {
        mat.opacity = 0.3;
        mat.transparent = true;
      } else {
        mat.opacity = 1.0;
        mat.transparent = false;
      }
    }

    // Hover scale-up (smooth lerp)
    const targetScale = hoveredRef.current && !isSelected ? 1.2 : 1.0;
    scaleVec.current.set(targetScale, targetScale, targetScale);
    mesh.scale.lerp(scaleVec.current, 0.15);

    // Hint glow: pulsing emissive on matching ingredients
    if (isHinted && !isSelected) {
      const pulse = 0.4 + 0.6 * Math.sin(t * 6);
      mat.emissiveIntensity = pulse * 0.6;
      mat.emissive.copy(baseColor.current);
    } else if (hoveredRef.current && !isSelected) {
      mat.emissiveIntensity = 0.35;
      mat.emissive.set('#ffffff');
    } else {
      // Resting glow — keeps ingredients visible in dim fridge
      mat.emissiveIntensity = 0.15;
      mat.emissive.copy(baseColor.current);
    }

    mat.color.copy(baseColor.current);
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!isSelected) {
      // On web, pop the ingredient out with an upward impulse
      if (isWeb && rigidBodyRef.current && !impulseApplied.current) {
        rigidBodyRef.current.applyImpulse({x: 0, y: 0.4, z: 0.3}, true);
        impulseApplied.current = true;
      }
      onSelect(index);
    }
  };

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

  const ingredientMesh = (
    <mesh
      ref={meshRef}
      position={isWeb ? undefined : position}
      userData={{
        grabbable: true,
        objectType: 'ingredient',
        objectId: ingredient.name,
      }}
      onClick={handleClick}
      onPointerOver={e => {
        e.stopPropagation();
        hoveredRef.current = true;
        onHover(index);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = isSelected ? 'default' : 'pointer';
        }
      }}
      onPointerOut={() => {
        hoveredRef.current = false;
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
      {/* GLB model overlay — when glbPath exists, render the loaded model as a child.
          The procedural geometry stays as the collision/click target + material host. */}
      {ingredient.glbPath && (
        <Suspense fallback={null}>
          <GlbIngredientGeometry glbPath={ingredient.glbPath} />
        </Suspense>
      )}
    </mesh>
  );

  if (!isWeb) return ingredientMesh;

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      position={position}
      colliders={false}
      linearDamping={1.5}
      angularDamping={1.0}
    >
      <BallCollider args={[INGREDIENT_COLLIDER_RADIUS]} />
      {ingredientMesh}
    </RigidBody>
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
  // Group ingredients by category into shelf tiers, preserving original indices
  const shelfGroups = useMemo(() => {
    const tiers: Array<Array<{ingredient: Ingredient; originalIndex: number}>> = [[], [], []];
    for (let i = 0; i < ingredients.length; i++) {
      const tier = SHELF_TIER[ingredients[i].category] ?? 2;
      tiers[tier].push({ingredient: ingredients[i], originalIndex: i});
    }
    return tiers;
  }, [ingredients]);

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

      {/* Ingredients on shelves — grouped by category tier */}
      {shelfGroups.map((group, shelfIndex) =>
        group.map((entry, slotIndex) => {
          const availableWidth = FRIDGE_W - 0.16;
          const spacing = Math.min(MAX_SPACING, availableWidth / Math.max(group.length, 1));
          const xOffset = (slotIndex - (group.length - 1) / 2) * spacing;
          const shelfY = SHELF_Y_POSITIONS[shelfIndex] + INGREDIENT_DIAMETER / 2 + 0.012;

          return (
            <IngredientMesh
              key={entry.originalIndex}
              index={entry.originalIndex}
              ingredient={entry.ingredient}
              position={[xOffset, shelfY, Z_OFFSET]}
              isSelected={selectedIds.has(entry.originalIndex)}
              isHinted={hintActive && matchingIndices.has(entry.originalIndex)}
              onSelect={onSelect}
              onHover={onHover}
            />
          );
        }),
      )}
    </group>
  );
};
