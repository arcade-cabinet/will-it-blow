import {
	Color3,
	MeshBuilder,
	StandardMaterial,
} from "@babylonjs/core";
import { useEffect, useState } from "react";
import { useScene } from "reactylon";
import { useGame } from "../../engine/GameEngine";
import { MrSausage3D } from "../characters/MrSausage3D";
import type { Reaction } from "../characters/reactions";

/**
 * Hex color string (#RRGGBB) to Babylon Color3.
 */
const hexToColor3 = (hex: string): Color3 => {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return new Color3(r, g, b);
};

export const StufferScene = () => {
	const scene = useScene();
	const { stuffProgress, setStuffProgress, ingredients } = useGame();
	const [reaction, setReaction] = useState<Reaction>("idle");

	useEffect(() => {
		if (!scene) return;

		// ---------------------------------------------------------------
		// Materials
		// ---------------------------------------------------------------
		const bodyMat = new StandardMaterial("stufferBodyMat", scene);
		bodyMat.diffuseColor = new Color3(0.5, 0.5, 0.55);
		bodyMat.specularColor = new Color3(0.6, 0.6, 0.65);

		const plungerMat = new StandardMaterial("plungerMat", scene);
		plungerMat.diffuseColor = new Color3(0.35, 0.35, 0.4);

		const handleMat = new StandardMaterial("handleMat", scene);
		handleMat.diffuseColor = new Color3(0.25, 0.25, 0.3);

		const casingMat = new StandardMaterial("casingMat", scene);
		casingMat.diffuseColor = new Color3(0.9, 0.5, 0.5);
		casingMat.alpha = 0.7;

		// ---------------------------------------------------------------
		// Stuffer body
		// ---------------------------------------------------------------
		const stufferBody = MeshBuilder.CreateBox(
			"stufferBody",
			{ width: 4, height: 1.5, depth: 1 },
			scene,
		);
		stufferBody.material = bodyMat;

		// ---------------------------------------------------------------
		// Plunger (cylinder + handle)
		// ---------------------------------------------------------------
		const plunger = MeshBuilder.CreateCylinder(
			"plunger",
			{ diameter: 0.8, height: 0.6 },
			scene,
		);
		plunger.rotation.z = Math.PI / 2;
		plunger.position.x = -2;
		plunger.position.y = 0;
		plunger.material = plungerMat;

		const plungerHandle = MeshBuilder.CreateBox(
			"plungerHandle",
			{ width: 0.4, height: 1.5, depth: 0.4 },
			scene,
		);
		plungerHandle.position.x = -2;
		plungerHandle.position.y = 0.9;
		plungerHandle.material = handleMat;
		plungerHandle.isPickable = true;
		plunger.isPickable = true;

		// ---------------------------------------------------------------
		// Casing
		// ---------------------------------------------------------------
		const casing = MeshBuilder.CreateCylinder(
			"casing",
			{ diameter: 1.1, height: 1 },
			scene,
		);
		casing.rotation.z = Math.PI / 2;
		casing.position.x = 2.5;
		casing.material = casingMat;

		// ---------------------------------------------------------------
		// Knot tracking
		// ---------------------------------------------------------------
		let leftKnot: ReturnType<typeof MeshBuilder.CreateSphere> | null = null;
		let rightKnot: ReturnType<typeof MeshBuilder.CreateSphere> | null = null;
		let knotMat: StandardMaterial | null = null;
		let knotsAdded = false;

		// ---------------------------------------------------------------
		// First ingredient color for blending
		// ---------------------------------------------------------------
		const baseCasingColor = new Color3(0.9, 0.5, 0.5);
		const ingredientColor =
			ingredients.length > 0
				? hexToColor3(ingredients[0].color)
				: baseCasingColor;

		// ---------------------------------------------------------------
		// Drag state
		// ---------------------------------------------------------------
		let draggingPlunger = false;
		let lastX = 0;
		let currentStuffProgress = stuffProgress;
		let dragSpeed = 0;

		// ---------------------------------------------------------------
		// Ground surface (metal counter)
		// ---------------------------------------------------------------
		const groundMat = new StandardMaterial("groundMat", scene);
		groundMat.diffuseColor = new Color3(0.2, 0.2, 0.22);
		groundMat.specularColor = new Color3(0.3, 0.3, 0.32);

		const ground = MeshBuilder.CreateDisc(
			"ground",
			{ radius: 6 },
			scene,
		);
		ground.rotation.x = Math.PI / 2;
		ground.position.y = -1.2;
		ground.material = groundMat;

		// ---------------------------------------------------------------
		// Back wall panel
		// ---------------------------------------------------------------
		const wallMat = new StandardMaterial("wallMat", scene);
		wallMat.diffuseColor = new Color3(0.25, 0.25, 0.28);
		wallMat.specularColor = new Color3(0.15, 0.15, 0.18);

		const backWall = MeshBuilder.CreatePlane(
			"backWall",
			{ width: 12, height: 6 },
			scene,
		);
		backWall.position.z = 2;
		backWall.position.y = 1.8;
		backWall.material = wallMat;

		scene.onPointerDown = (evt) => {
			const px = evt.offsetX ?? scene.pointerX;
			const py = evt.offsetY ?? scene.pointerY;
			const pick = scene.pick(px, py);
			const name = pick?.pickedMesh?.name;
			// Accept clicks on plunger, plungerHandle, or stufferBody (which often occludes plunger)
			if (
				pick?.hit &&
				(name === "plunger" ||
					name === "plungerHandle" ||
					name === "stufferBody")
			) {
				draggingPlunger = true;
				lastX = scene.pointerX;
			}
		};

		scene.onPointerMove = () => {
			if (!draggingPlunger) return;
			const dx = (scene.pointerX - lastX) * 0.01;
			lastX = scene.pointerX;

			// Only allow rightward push (positive X)
			if (dx > 0) {
				currentStuffProgress = Math.min(currentStuffProgress + dx * 15, 100);
				setStuffProgress(Math.round(currentStuffProgress));

				// Move plunger mesh
				plunger.position.x = Math.min(plunger.position.x + dx, 1.5);
				plungerHandle.position.x = plunger.position.x;

				// Drag speed detection for casing stress
				dragSpeed = Math.abs(dx);
			}
		};

		scene.onPointerUp = () => {
			draggingPlunger = false;
		};

		// ---------------------------------------------------------------
		// Render loop — casing stress visuals + scaling
		// ---------------------------------------------------------------
		let time = 0;
		let prevProgress = currentStuffProgress;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			time += dt;

			// Re-read from local tracker
			const progress = currentStuffProgress;

			// Scale casing on Y axis based on stuff progress (max scale 8)
			const scaleY = Math.max((progress / 100) * 8, 0.01);
			casing.scaling.y = scaleY;

			// Keep casing extending outward from the stuffer end
			casing.position.x = 2.5 + scaleY / 2;

			// Ingredient color bleed: interpolate casing color from pink to ingredient[0].color
			const t = Math.min(progress / 100, 1);
			casingMat.diffuseColor = Color3.Lerp(baseCasingColor, ingredientColor, t);

			// Casing stress visual
			if (dragSpeed > 0.3) {
				// Flash casing emissive red
				casingMat.emissiveColor = new Color3(0.3, 0, 0);
				// Wobble casing
				casing.position.y = Math.sin(time * 20) * 0.05;

				// Mr. Sausage gets nervous during fast pushing
				setReaction("nervous");
			} else {
				// Reset emissive
				casingMat.emissiveColor = Color3.Black();
				// Smooth casing position back to center
				casing.position.y *= 0.9;

				if (progress < 100) {
					setReaction("idle");
				}
			}

			// Decay drag speed when not actively dragging
			if (!draggingPlunger) {
				dragSpeed *= 0.9;
			}

			// At 100%: add decorative knots at both ends
			if (progress >= 100 && !knotsAdded) {
				knotsAdded = true;

				knotMat = new StandardMaterial("knotMat", scene);
				knotMat.diffuseColor = new Color3(0.6, 0.3, 0.2);

				// Left knot — at pipe-end of casing
				leftKnot = MeshBuilder.CreateSphere(
					"leftKnot",
					{ diameter: 0.6 },
					scene,
				);
				leftKnot.position.x = 2.5;
				leftKnot.material = knotMat;

				// Right knot — at far end of casing
				rightKnot = MeshBuilder.CreateSphere(
					"rightKnot",
					{ diameter: 0.6 },
					scene,
				);
				rightKnot.position.x = 2.5 + scaleY;
				rightKnot.material = knotMat;

				// Mr. Sausage celebrates
				setReaction("excitement");
			}

			prevProgress = progress;
		});

		// ---------------------------------------------------------------
		// Cleanup
		// ---------------------------------------------------------------
		return () => {
			scene.onBeforeRenderObservable.remove(observer);
			scene.onPointerDown = undefined;
			scene.onPointerMove = undefined;
			scene.onPointerUp = undefined;

			stufferBody.dispose();
			plunger.dispose();
			plungerHandle.dispose();
			casing.dispose();
			ground.dispose();
			backWall.dispose();

			bodyMat.dispose();
			plungerMat.dispose();
			handleMat.dispose();
			casingMat.dispose();
			groundMat.dispose();
			wallMat.dispose();

			if (leftKnot) leftKnot.dispose();
			if (rightKnot) rightKnot.dispose();
			if (knotMat) knotMat.dispose();
		};
	}, [scene]);

	return <MrSausage3D reaction={reaction} position={[4, -1, 0]} scale={0.8} />;
};
