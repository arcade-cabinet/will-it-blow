import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import {
	ActionManager,
	Color3,
	ExecuteCodeAction,
	MeshBuilder,
	StandardMaterial,
	Vector3,
} from '@babylonjs/core';
import type { AbstractMesh, Observer, Scene as BabylonScene } from '@babylonjs/core';
import type { Ingredient } from '../../engine/Ingredients';

interface FridgeStationProps {
	ingredients: Ingredient[];
	selectedIds: Set<number>;
	hintActive: boolean;
	matchingIndices: Set<number>;
	onSelect: (index: number) => void;
}

/** Converts a hex color string (e.g. "#FF1744") to a Babylon Color3. */
function hexToColor3(hex: string): Color3 {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return new Color3(r, g, b);
}

// Fridge position near the left wall, facing the player at the fridge waypoint
const FRIDGE_POS: [number, number, number] = [-5, 1.5, -4];
const SHELF_COUNT = 3;
const SHELF_Y_POSITIONS = [0.5, 1.5, 2.5];
const ITEMS_PER_SHELF = 4;
const INGREDIENT_DIAMETER = 0.3;

export const FridgeStation = ({
	ingredients,
	selectedIds,
	hintActive,
	matchingIndices,
	onSelect,
}: FridgeStationProps) => {
	const scene = useScene();
	const timeRef = useRef(0);
	const selectedIdsRef = useRef(selectedIds);
	const hintActiveRef = useRef(hintActive);
	const matchingIndicesRef = useRef(matchingIndices);

	// Keep refs in sync so the render loop reads current values
	selectedIdsRef.current = selectedIds;
	hintActiveRef.current = hintActive;
	matchingIndicesRef.current = matchingIndices;

	useEffect(() => {
		if (!scene) return;

		const allMeshes: AbstractMesh[] = [];
		const allMaterials: StandardMaterial[] = [];
		const ingredientMeshes: AbstractMesh[] = [];
		const ingredientMats: StandardMaterial[] = [];
		let observer: Observer<BabylonScene> | null = null;

		// --- Fridge body (open box shape) ---

		const fridgeBody = MeshBuilder.CreateBox(
			'fridgeBody',
			{ width: 1.5, height: 3, depth: 1 },
			scene,
		);
		const fridgeMat = new StandardMaterial('fridgeMat', scene);
		fridgeMat.diffuseColor = new Color3(0.85, 0.85, 0.88);
		fridgeMat.specularColor = new Color3(0.2, 0.2, 0.2);
		fridgeBody.material = fridgeMat;
		fridgeBody.position = new Vector3(FRIDGE_POS[0], FRIDGE_POS[1], FRIDGE_POS[2]);
		allMeshes.push(fridgeBody);
		allMaterials.push(fridgeMat);

		// --- Open door (angled away from player) ---

		const fridgeDoor = MeshBuilder.CreateBox(
			'fridgeDoor',
			{ width: 1.5, height: 3, depth: 0.08 },
			scene,
		);
		const doorMat = new StandardMaterial('fridgeDoorMat', scene);
		doorMat.diffuseColor = new Color3(0.8, 0.8, 0.82);
		doorMat.specularColor = new Color3(0.15, 0.15, 0.15);
		fridgeDoor.material = doorMat;
		// Position door pivoted open ~90 degrees to the left
		fridgeDoor.position = new Vector3(
			FRIDGE_POS[0] - 0.75,
			FRIDGE_POS[1],
			FRIDGE_POS[2] + 0.75,
		);
		fridgeDoor.rotation.y = Math.PI / 2;
		allMeshes.push(fridgeDoor);
		allMaterials.push(doorMat);

		// --- Interior light glow (emissive plane inside the fridge) ---

		const interiorLight = MeshBuilder.CreatePlane(
			'fridgeInteriorLight',
			{ width: 1.3, height: 0.15 },
			scene,
		);
		const interiorLightMat = new StandardMaterial('fridgeInteriorLightMat', scene);
		interiorLightMat.disableLighting = true;
		interiorLightMat.emissiveColor = new Color3(0.6, 0.7, 0.9);
		interiorLightMat.alpha = 0.7;
		interiorLight.material = interiorLightMat;
		interiorLight.position = new Vector3(
			FRIDGE_POS[0],
			FRIDGE_POS[1] + 1.4,
			FRIDGE_POS[2] + 0.49,
		);
		allMeshes.push(interiorLight);
		allMaterials.push(interiorLightMat);

		// --- Shelves ---

		const shelfMat = new StandardMaterial('shelfMat', scene);
		shelfMat.diffuseColor = new Color3(0.7, 0.72, 0.75);
		shelfMat.specularColor = new Color3(0.1, 0.1, 0.1);
		allMaterials.push(shelfMat);

		for (let s = 0; s < SHELF_COUNT; s++) {
			const shelf = MeshBuilder.CreateBox(
				`fridgeShelf_${s}`,
				{ width: 1.4, height: 0.05, depth: 0.85 },
				scene,
			);
			shelf.material = shelfMat;
			shelf.position = new Vector3(
				FRIDGE_POS[0],
				FRIDGE_POS[1] - 1.5 + SHELF_Y_POSITIONS[s],
				FRIDGE_POS[2],
			);
			allMeshes.push(shelf);
		}

		// --- Ingredient meshes on shelves ---

		for (let i = 0; i < ingredients.length; i++) {
			const ingredient = ingredients[i];
			const shelfIndex = Math.floor(i / ITEMS_PER_SHELF) % SHELF_COUNT;
			const slotIndex = i % ITEMS_PER_SHELF;

			// Distribute items across the shelf width
			const xOffset = (slotIndex - (ITEMS_PER_SHELF - 1) / 2) * 0.35;
			const shelfY = FRIDGE_POS[1] - 1.5 + SHELF_Y_POSITIONS[shelfIndex] + INGREDIENT_DIAMETER / 2 + 0.05;

			let mesh: AbstractMesh;
			const meshName = `fridgeIngredient_${i}`;

			// Create mesh based on ingredient shape
			switch (ingredient.shape.base) {
				case 'box':
				case 'irregular':
					mesh = MeshBuilder.CreateBox(
						meshName,
						{ size: INGREDIENT_DIAMETER },
						scene,
					);
					break;
				case 'cylinder':
					mesh = MeshBuilder.CreateCylinder(
						meshName,
						{
							height: ingredient.shape.base === 'cylinder' && ingredient.shape.detail === 'flat'
								? INGREDIENT_DIAMETER * 0.5
								: INGREDIENT_DIAMETER,
							diameter: INGREDIENT_DIAMETER,
						},
						scene,
					);
					break;
				case 'cone':
				case 'wedge':
					mesh = MeshBuilder.CreateCylinder(
						meshName,
						{ diameterTop: 0, diameterBottom: INGREDIENT_DIAMETER, height: INGREDIENT_DIAMETER },
						scene,
					);
					break;
				case 'small-sphere':
					mesh = MeshBuilder.CreateSphere(
						meshName,
						{ diameter: INGREDIENT_DIAMETER * 0.7, segments: 8 },
						scene,
					);
					break;
				case 'elongated':
					mesh = MeshBuilder.CreateCylinder(
						meshName,
						{ height: INGREDIENT_DIAMETER * 1.5, diameter: INGREDIENT_DIAMETER * 0.5 },
						scene,
					);
					break;
				case 'sphere':
				default:
					mesh = MeshBuilder.CreateSphere(
						meshName,
						{ diameter: INGREDIENT_DIAMETER, segments: 10 },
						scene,
					);
					break;
			}

			// Self-lit material (same pattern as MrSausage3D)
			const mat = new StandardMaterial(`${meshName}_mat`, scene);
			mat.disableLighting = true;
			mat.emissiveColor = hexToColor3(ingredient.color);
			mesh.material = mat;

			mesh.position = new Vector3(
				FRIDGE_POS[0] + xOffset,
				shelfY,
				FRIDGE_POS[2],
			);

			// ActionManager for tap/click picking
			mesh.actionManager = new ActionManager(scene);
			const ingredientIndex = i;
			mesh.actionManager.registerAction(
				new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
					if (!selectedIdsRef.current.has(ingredientIndex)) {
						onSelect(ingredientIndex);
					}
				}),
			);

			ingredientMeshes.push(mesh);
			ingredientMats.push(mat);
			allMeshes.push(mesh);
			allMaterials.push(mat);
		}

		// --- Render loop: animate selected items + hint glow ---

		observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			timeRef.current += dt;

			for (let i = 0; i < ingredientMeshes.length; i++) {
				const mesh = ingredientMeshes[i];
				const mat = ingredientMats[i];
				if (!mesh || !mat) continue;

				const isSelected = selectedIdsRef.current.has(i);
				const isHintMatch =
					hintActiveRef.current && matchingIndicesRef.current.has(i) && !isSelected;

				// Selected: slide forward on Z and reduce opacity
				if (isSelected) {
					const targetZ = FRIDGE_POS[2] + 0.5;
					mesh.position.z += (targetZ - mesh.position.z) * 0.1;
					mat.alpha = 0.4;
				}

				// Hint glow: pulsing emissive multiplier on matching ingredients
				if (isHintMatch) {
					const pulse = 0.5 + 0.5 * Math.sin(timeRef.current * 6);
					const baseColor = hexToColor3(ingredients[i].color);
					mat.emissiveColor = new Color3(
						Math.min(baseColor.r + pulse * 0.5, 1),
						Math.min(baseColor.g + pulse * 0.5, 1),
						Math.min(baseColor.b + pulse * 0.5, 1),
					);
				} else if (!isSelected) {
					// Reset to base emissive when hint is off
					mat.emissiveColor = hexToColor3(ingredients[i].color);
				}
			}
		});

		// --- Cleanup ---

		return () => {
			if (observer) scene.onBeforeRenderObservable.remove(observer);

			for (const mesh of allMeshes) {
				if (mesh.actionManager) {
					mesh.actionManager.dispose();
				}
				mesh.dispose();
			}
			for (const mat of allMaterials) {
				mat.dispose();
			}
		};
	}, [scene, ingredients, onSelect]);

	return null;
};
