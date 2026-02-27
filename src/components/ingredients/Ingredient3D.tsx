import {
	Color3,
	MeshBuilder,
	StandardMaterial,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import type { AbstractMesh } from "@babylonjs/core";
import { useEffect } from "react";
import { useScene } from "reactylon";
import type { Ingredient, IngredientShape } from "../../engine/Ingredients";

interface Ingredient3DProps {
	ingredient: Ingredient;
	position: [number, number, number];
	id: string;
}

function hexToColor3(hex: string): Color3 {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return new Color3(r, g, b);
}

export const Ingredient3D = ({ ingredient, position, id }: Ingredient3DProps) => {
	const scene = useScene();

	useEffect(() => {
		if (!scene) return;

		const shape: IngredientShape = ingredient.shape ?? { base: "sphere" };
		const meshes: AbstractMesh[] = [];
		let transformNode: TransformNode | null = null;

		// Create mesh based on shape
		switch (shape.base) {
			case "sphere": {
				const mesh = MeshBuilder.CreateSphere(
					id,
					{ diameter: 1, segments: 12 },
					scene,
				);
				if (shape.detail === "wobbly") {
					const positions = mesh.getVerticesData("position");
					if (positions) {
						for (let i = 0; i < positions.length; i++) {
							positions[i] += (Math.random() - 0.5) * 0.08;
						}
						mesh.updateVerticesData("position", positions);
					}
				}
				meshes.push(mesh);
				break;
			}
			case "box": {
				const opts =
					shape.detail === "rounded"
						? { size: 0.9, updatable: false }
						: { size: 0.9 };
				const mesh = MeshBuilder.CreateBox(id, opts, scene);
				meshes.push(mesh);
				break;
			}
			case "cylinder": {
				const height = shape.detail === "flat" ? 0.3 : 1;
				const mesh = MeshBuilder.CreateCylinder(
					id,
					{ height, diameter: 0.8 },
					scene,
				);
				meshes.push(mesh);
				break;
			}
			case "elongated": {
				const body = MeshBuilder.CreateCylinder(
					id,
					{ height: 1.8, diameter: 0.6 },
					scene,
				);
				meshes.push(body);
				if (shape.detail === "claws") {
					const clawL = MeshBuilder.CreateSphere(
						`${id}_clawL`,
						{ diameter: 0.25, segments: 8 },
						scene,
					);
					clawL.position = new Vector3(-0.25, 0.9, 0);
					meshes.push(clawL);
					const clawR = MeshBuilder.CreateSphere(
						`${id}_clawR`,
						{ diameter: 0.25, segments: 8 },
						scene,
					);
					clawR.position = new Vector3(0.25, 0.9, 0);
					meshes.push(clawR);
				}
				break;
			}
			case "wedge": {
				const mesh = MeshBuilder.CreateCylinder(
					id,
					{ diameterTop: 0, diameterBottom: 1, height: 1 },
					scene,
				);
				meshes.push(mesh);
				break;
			}
			case "cone": {
				transformNode = new TransformNode(`${id}_root`, scene);
				const cone = MeshBuilder.CreateCylinder(
					`${id}_cone`,
					{ diameterTop: 0, diameterBottom: 0.8, height: 1 },
					scene,
				);
				cone.parent = transformNode;
				meshes.push(cone);
				const scoop = MeshBuilder.CreateSphere(
					`${id}_scoop`,
					{ diameter: 0.7 },
					scene,
				);
				scoop.position.y = 0.7;
				scoop.parent = transformNode;
				meshes.push(scoop);
				break;
			}
			case "small-sphere": {
				const mesh = MeshBuilder.CreateSphere(
					id,
					{ diameter: 0.6, segments: 10 },
					scene,
				);
				meshes.push(mesh);
				break;
			}
			case "irregular": {
				const mesh = MeshBuilder.CreateBox(
					id,
					{ width: 0.9, height: 0.7, depth: 1.1 },
					scene,
				);
				meshes.push(mesh);
				break;
			}
		}

		// Create material
		const mat = new StandardMaterial(`${id}_mat`, scene);
		const baseColor = hexToColor3(ingredient.color);
		mat.diffuseColor = baseColor;
		mat.specularColor = new Color3(
			Math.min(baseColor.r + 0.2, 1),
			Math.min(baseColor.g + 0.2, 1),
			Math.min(baseColor.b + 0.2, 1),
		);
		if (shape.base === "sphere" && shape.detail === "wobbly") {
			mat.alpha = 0.85;
		}

		// Apply material and position
		const pos = new Vector3(position[0], position[1], position[2]);

		if (transformNode) {
			transformNode.position = pos;
		}

		for (const mesh of meshes) {
			mesh.material = mat;
			mesh.checkCollisions = true;
			// Position non-parented meshes directly
			if (!mesh.parent) {
				mesh.position = mesh.position.add(pos);
			}
		}

		return () => {
			for (const mesh of meshes) {
				mesh.dispose();
			}
			mat.dispose();
			if (transformNode) {
				transformNode.dispose();
			}
		};
	}, [scene, ingredient, position, id]);

	return null;
};
