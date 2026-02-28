import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Ingredient } from '../../engine/Ingredients';

interface FridgeStationProps {
	ingredients: Ingredient[];
	selectedIds: Set<number>;
	hintActive: boolean;
	matchingIndices: Set<number>;
	onSelect: (index: number) => void;
}

// Fridge position near the left wall, facing the player at the fridge waypoint
const FRIDGE_POS: [number, number, number] = [-5, 1.5, -4];
const SHELF_COUNT = 3;
const SHELF_Y_POSITIONS = [0.5, 1.5, 2.5];
const ITEMS_PER_SHELF = 4;
const INGREDIENT_DIAMETER = 0.3;

/** Converts a hex color string (e.g. "#FF1744") to a THREE.Color. */
function hexToThreeColor(hex: string): THREE.Color {
	return new THREE.Color(hex);
}

// -------------------------------------------------------
// IngredientSphere — individual clickable ingredient on shelf
// -------------------------------------------------------

interface IngredientMeshProps {
	index: number;
	ingredient: Ingredient;
	position: [number, number, number];
	isSelected: boolean;
	isHinted: boolean;
	onSelect: (index: number) => void;
}

function IngredientMesh({
	index,
	ingredient,
	position,
	isSelected,
	isHinted,
	onSelect,
}: IngredientMeshProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const matRef = useRef<THREE.MeshBasicMaterial>(null);
	const [hovered, setHovered] = useState(false);
	const baseColor = useRef(hexToThreeColor(ingredient.color));

	// Animate hint glow pulsing + selected slide-forward
	useFrame((state) => {
		const mesh = meshRef.current;
		const mat = matRef.current;
		if (!mesh || !mat) return;

		// Selected: slide forward on Z and reduce opacity
		if (isSelected) {
			const targetZ = position[2] + 0.5;
			mesh.position.z += (targetZ - mesh.position.z) * 0.1;
			mat.opacity = 0.4;
			mat.transparent = true;
		} else {
			// Ease back to original position
			mesh.position.z += (position[2] - mesh.position.z) * 0.1;
			mat.opacity = 1.0;
			mat.transparent = false;
		}

		// Hint glow: pulsing brightness on matching ingredients
		if (isHinted && !isSelected) {
			const t = state.clock.getElapsedTime();
			const pulse = 0.5 + 0.5 * Math.sin(t * 6);
			const base = baseColor.current;
			mat.color.setRGB(
				Math.min(base.r + pulse * 0.5, 1),
				Math.min(base.g + pulse * 0.5, 1),
				Math.min(base.b + pulse * 0.5, 1),
			);
		} else {
			mat.color.copy(baseColor.current);
		}
	});

	// Choose geometry based on ingredient shape
	const renderGeometry = () => {
		const shape = ingredient.shape;
		switch (shape.base) {
			case 'box':
			case 'irregular':
				return <boxGeometry args={[INGREDIENT_DIAMETER, INGREDIENT_DIAMETER, INGREDIENT_DIAMETER]} />;
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
				return (
					<cylinderGeometry
						args={[0, INGREDIENT_DIAMETER / 2, INGREDIENT_DIAMETER, 12]}
					/>
				);
			case 'small-sphere':
				return <sphereGeometry args={[INGREDIENT_DIAMETER * 0.35, 8, 8]} />;
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
			case 'sphere':
			default:
				return <sphereGeometry args={[INGREDIENT_DIAMETER / 2, 10, 10]} />;
		}
	};

	return (
		<mesh
			ref={meshRef}
			position={position}
			onClick={(e) => {
				e.stopPropagation();
				if (!isSelected) {
					onSelect(index);
				}
			}}
			onPointerOver={(e) => {
				e.stopPropagation();
				setHovered(true);
				document.body.style.cursor = isSelected ? 'default' : 'pointer';
			}}
			onPointerOut={() => {
				setHovered(false);
				document.body.style.cursor = 'default';
			}}
		>
			{renderGeometry()}
			<meshBasicMaterial
				ref={matRef}
				color={ingredient.color}
			/>
		</mesh>
	);
}

// -------------------------------------------------------
// FridgeStation — procedural fridge with ingredient shelves
// -------------------------------------------------------

export const FridgeStation = ({
	ingredients,
	selectedIds,
	hintActive,
	matchingIndices,
	onSelect,
}: FridgeStationProps) => {
	return (
		<group position={FRIDGE_POS}>
			{/* ===== Fridge body ===== */}
			<mesh position={[0, 0, 0]}>
				<boxGeometry args={[1.5, 3, 1]} />
				<meshStandardMaterial
					color={[0.18, 0.17, 0.15]}
					roughness={0.9}
					metalness={0.05}
				/>
			</mesh>

			{/* ===== Open door (pivoted ~90 degrees to the left) ===== */}
			<mesh
				position={[-0.75, 0, 0.75]}
				rotation={[0, Math.PI / 2, 0]}
			>
				<boxGeometry args={[1.5, 3, 0.08]} />
				<meshStandardMaterial
					color={[0.16, 0.15, 0.14]}
					roughness={0.9}
					metalness={0.05}
				/>
			</mesh>

			{/* ===== Interior light glow (emissive plane at top of fridge) ===== */}
			<mesh position={[0, 1.4, 0.49]}>
				<planeGeometry args={[1.3, 0.15]} />
				<meshBasicMaterial
					color={[0.3, 0.35, 0.5]}
					transparent
					opacity={0.5}
				/>
			</mesh>

			{/* ===== Interior point light ===== */}
			<pointLight
				position={[0, 1.0, 0.2]}
				intensity={0.5}
				color="#e0f0ff"
				distance={3}
				decay={2}
			/>

			{/* ===== Shelves ===== */}
			{SHELF_Y_POSITIONS.map((shelfY, s) => (
				<mesh key={`shelf_${s}`} position={[0, -1.5 + shelfY, 0]}>
					<boxGeometry args={[1.4, 0.05, 0.85]} />
					<meshStandardMaterial
						color={[0.2, 0.22, 0.25]}
						roughness={0.9}
						metalness={0.05}
					/>
				</mesh>
			))}

			{/* ===== Ingredients on shelves ===== */}
			{ingredients.map((ingredient, i) => {
				const shelfIndex = Math.floor(i / ITEMS_PER_SHELF) % SHELF_COUNT;
				const slotIndex = i % ITEMS_PER_SHELF;

				// Distribute items across the shelf width
				const xOffset = (slotIndex - (ITEMS_PER_SHELF - 1) / 2) * 0.35;
				const shelfY =
					-1.5 + SHELF_Y_POSITIONS[shelfIndex] + INGREDIENT_DIAMETER / 2 + 0.05;

				return (
					<IngredientMesh
						key={i}
						index={i}
						ingredient={ingredient}
						position={[xOffset, shelfY, 0]}
						isSelected={selectedIds.has(i)}
						isHinted={hintActive && matchingIndices.has(i)}
						onSelect={onSelect}
					/>
				);
			})}
		</group>
	);
};
