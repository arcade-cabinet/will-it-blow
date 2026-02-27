import {
	Color3,
	MeshBuilder,
	StandardMaterial,
	Vector3,
} from "@babylonjs/core";
import { useEffect, useRef, useState } from "react";
import { useScene } from "reactylon";
import { useGame } from "../../engine/GameEngine";
import { MrSausage3D } from "../characters/MrSausage3D";
import type { Reaction } from "../characters/reactions";

/**
 * Parses a hex color string (e.g. "#FF6B35") into a Color3.
 */
function hexToColor3(hex: string): Color3 {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return new Color3(r, g, b);
}

export const TasteScene = () => {
	const scene = useScene();
	const { sausageRating, ingredients } = useGame();
	const prevRating = useRef(0);
	const [reaction, setReaction] = useState<Reaction>("idle");

	// Mr. Sausage reaction sequence triggered by sausageRating
	useEffect(() => {
		if (sausageRating <= 0) return;
		if (prevRating.current > 0) return; // already triggered
		prevRating.current = sausageRating;

		// t=800ms: Mr. Sausage reaches toward sausage
		const talkTimer = setTimeout(() => {
			setReaction("talk");
		}, 800);

		// t=1500ms: React based on rating
		const reactTimer = setTimeout(() => {
			if (sausageRating <= 1) {
				setReaction("disgust");
			} else if (sausageRating <= 3) {
				setReaction("nod");
			} else {
				setReaction("excitement");
			}
		}, 1500);

		return () => {
			clearTimeout(talkTimer);
			clearTimeout(reactTimer);
		};
	}, [sausageRating]);

	useEffect(() => {
		if (!scene) return;

		const meatColor =
			ingredients.length > 0
				? hexToColor3(ingredients[0].color)
				: new Color3(0.55, 0.27, 0.07);

		const crossSectionColor =
			ingredients.length > 1
				? hexToColor3(ingredients[1].color)
				: meatColor;

		// Collect ingredient colors for the swirl cross-section
		const ingredientColors = ingredients.slice(0, 3).map((ing) =>
			hexToColor3(ing.color),
		);

		// --- Plate ---
		const plate = MeshBuilder.CreateDisc(
			"plate",
			{ radius: 3, tessellation: 32 },
			scene,
		);
		const plateMat = new StandardMaterial("plateMat", scene);
		plateMat.diffuseColor = new Color3(0.95, 0.92, 0.85);
		plateMat.specularColor = new Color3(0.3, 0.3, 0.3);
		plate.material = plateMat;
		plate.rotation.x = Math.PI / 2;
		plate.position.y = 0;

		// --- Plate rim ---
		const plateRim = MeshBuilder.CreateTorus(
			"plateRim",
			{ diameter: 6, thickness: 0.2, tessellation: 32 },
			scene,
		);
		const rimMat = new StandardMaterial("rimMat", scene);
		rimMat.diffuseColor = new Color3(0.88, 0.85, 0.78);
		rimMat.specularColor = new Color3(0.2, 0.2, 0.2);
		plateRim.material = rimMat;
		plateRim.position.y = 0;

		// --- Bun meshes ---
		const bunMat = new StandardMaterial("bunMat", scene);
		bunMat.diffuseColor = new Color3(0.85, 0.7, 0.4);
		bunMat.specularColor = new Color3(0.1, 0.1, 0.05);

		const bunL = MeshBuilder.CreateCylinder(
			"bunL",
			{ diameter: 1.5, height: 0.8, tessellation: 16 },
			scene,
		);
		bunL.material = bunMat;
		bunL.position = new Vector3(0, -0.1, -0.7);
		bunL.rotation.x = Math.PI / 2;

		const bunCapL = MeshBuilder.CreateSphere(
			"bunCapL",
			{ diameter: 1.5, slice: 0.5, segments: 16 },
			scene,
		);
		bunCapL.material = bunMat;
		bunCapL.position = new Vector3(0, -0.1, -1.1);
		bunCapL.rotation.x = Math.PI / 2;

		const bunR = MeshBuilder.CreateCylinder(
			"bunR",
			{ diameter: 1.5, height: 0.8, tessellation: 16 },
			scene,
		);
		bunR.material = bunMat;
		bunR.position = new Vector3(0, -0.1, 0.7);
		bunR.rotation.x = Math.PI / 2;

		const bunCapR = MeshBuilder.CreateSphere(
			"bunCapR",
			{ diameter: 1.5, slice: 0.5, segments: 16 },
			scene,
		);
		bunCapR.material = bunMat;
		bunCapR.position = new Vector3(0, -0.1, 1.1);
		bunCapR.rotation.x = -Math.PI / 2;

		// --- Condiment drizzles ---
		const mustardDrizzleMat = new StandardMaterial("mustardDrizzleMat", scene);
		mustardDrizzleMat.diffuseColor = new Color3(1, 0.85, 0);
		mustardDrizzleMat.emissiveColor = new Color3(0.2, 0.17, 0);

		const mustardDrizzle = MeshBuilder.CreateCylinder(
			"mustardDrizzle",
			{ diameter: 0.08, height: 3, tessellation: 8 },
			scene,
		);
		mustardDrizzle.material = mustardDrizzleMat;
		mustardDrizzle.rotation.z = Math.PI / 2;
		mustardDrizzle.position = new Vector3(0, 0.55, -0.15);

		const ketchupDrizzleMat = new StandardMaterial("ketchupDrizzleMat", scene);
		ketchupDrizzleMat.diffuseColor = new Color3(0.8, 0.1, 0.05);
		ketchupDrizzleMat.emissiveColor = new Color3(0.15, 0.02, 0.01);

		const ketchupDrizzle = MeshBuilder.CreateCylinder(
			"ketchupDrizzle",
			{ diameter: 0.08, height: 3, tessellation: 8 },
			scene,
		);
		ketchupDrizzle.material = ketchupDrizzleMat;
		ketchupDrizzle.rotation.z = Math.PI / 2;
		ketchupDrizzle.position = new Vector3(0, 0.55, 0.15);

		// --- Meaty material ---
		const meatMat = new StandardMaterial("meatMat", scene);
		meatMat.diffuseColor = meatColor;
		meatMat.specularColor = new Color3(
			Math.min(meatColor.r + 0.15, 1),
			Math.min(meatColor.g + 0.15, 1),
			Math.min(meatColor.b + 0.15, 1),
		);

		// --- Whole sausage (initially visible) ---
		const wholeSausage = MeshBuilder.CreateCylinder(
			"sausage",
			{ height: 4, diameter: 1, tessellation: 24 },
			scene,
		);
		wholeSausage.material = meatMat;
		wholeSausage.rotation.z = Math.PI / 2;
		wholeSausage.position.y = 0.5;

		// Hemisphere caps
		const capL = MeshBuilder.CreateSphere(
			"capL",
			{ diameter: 1, slice: 0.5, segments: 16 },
			scene,
		);
		capL.material = meatMat;
		capL.position = new Vector3(-2, 0.5, 0);
		capL.rotation.z = Math.PI / 2;

		const capR = MeshBuilder.CreateSphere(
			"capR",
			{ diameter: 1, slice: 0.5, segments: 16 },
			scene,
		);
		capR.material = meatMat;
		capR.position = new Vector3(2, 0.5, 0);
		capR.rotation.z = -Math.PI / 2;

		// --- Left half (initially hidden) ---
		const leftHalf = MeshBuilder.CreateCylinder(
			"leftHalf",
			{ height: 2, diameter: 1, tessellation: 24 },
			scene,
		);
		leftHalf.material = meatMat;
		leftHalf.rotation.z = Math.PI / 2;
		leftHalf.position = new Vector3(-1, 0.5, 0);
		leftHalf.setEnabled(false);

		const leftCap = MeshBuilder.CreateSphere(
			"leftCap",
			{ diameter: 1, slice: 0.5, segments: 16 },
			scene,
		);
		leftCap.material = meatMat;
		leftCap.position = new Vector3(-2, 0.5, 0);
		leftCap.rotation.z = Math.PI / 2;
		leftCap.setEnabled(false);

		// Cross-section disc on the cut face of the left half (background)
		const leftCrossSection = MeshBuilder.CreateDisc(
			"leftCross",
			{ radius: 0.5, tessellation: 24 },
			scene,
		);
		const crossMat = new StandardMaterial("crossMat", scene);
		crossMat.diffuseColor = crossSectionColor;
		crossMat.specularColor = new Color3(0.1, 0.1, 0.1);
		leftCrossSection.material = crossMat;
		leftCrossSection.rotation.y = Math.PI / 2;
		leftCrossSection.position = new Vector3(0, 0.5, 0);
		leftCrossSection.setEnabled(false);

		// Enhanced cross-section swirl discs (left side)
		const leftSwirlDiscs: ReturnType<typeof MeshBuilder.CreateDisc>[] = [];
		const leftSwirlMats: StandardMaterial[] = [];
		for (let i = 0; i < ingredientColors.length; i++) {
			const angle = (i / ingredientColors.length) * Math.PI * 2 + Math.random() * 0.5;
			const radius = 0.1 + Math.random() * 0.2;
			const offsetY = Math.sin(angle) * radius;
			const offsetZ = Math.cos(angle) * radius;

			const swirlDisc = MeshBuilder.CreateDisc(
				`leftSwirl${i}`,
				{ radius: 0.15, tessellation: 12 },
				scene,
			);
			const swirlMat = new StandardMaterial(`leftSwirlMat${i}`, scene);
			swirlMat.diffuseColor = ingredientColors[i];
			swirlMat.specularColor = new Color3(0.05, 0.05, 0.05);
			swirlDisc.material = swirlMat;
			swirlDisc.rotation.y = Math.PI / 2;
			swirlDisc.position = new Vector3(0.001, 0.5 + offsetY, offsetZ);
			swirlDisc.setEnabled(false);
			leftSwirlDiscs.push(swirlDisc);
			leftSwirlMats.push(swirlMat);
		}

		// --- Right half (initially hidden) ---
		const rightHalf = MeshBuilder.CreateCylinder(
			"rightHalf",
			{ height: 2, diameter: 1, tessellation: 24 },
			scene,
		);
		rightHalf.material = meatMat;
		rightHalf.rotation.z = Math.PI / 2;
		rightHalf.position = new Vector3(1, 0.5, 0);
		rightHalf.setEnabled(false);

		const rightCap = MeshBuilder.CreateSphere(
			"rightCap",
			{ diameter: 1, slice: 0.5, segments: 16 },
			scene,
		);
		rightCap.material = meatMat;
		rightCap.position = new Vector3(2, 0.5, 0);
		rightCap.rotation.z = -Math.PI / 2;
		rightCap.setEnabled(false);

		// Cross-section disc on the cut face of the right half (background)
		const rightCrossSection = MeshBuilder.CreateDisc(
			"rightCross",
			{ radius: 0.5, tessellation: 24 },
			scene,
		);
		rightCrossSection.material = crossMat;
		rightCrossSection.rotation.y = -Math.PI / 2;
		rightCrossSection.position = new Vector3(0, 0.5, 0);
		rightCrossSection.setEnabled(false);

		// Enhanced cross-section swirl discs (right side)
		const rightSwirlDiscs: ReturnType<typeof MeshBuilder.CreateDisc>[] = [];
		const rightSwirlMats: StandardMaterial[] = [];
		for (let i = 0; i < ingredientColors.length; i++) {
			const angle = (i / ingredientColors.length) * Math.PI * 2 + Math.random() * 0.5;
			const radius = 0.1 + Math.random() * 0.2;
			const offsetY = Math.sin(angle) * radius;
			const offsetZ = Math.cos(angle) * radius;

			const swirlDisc = MeshBuilder.CreateDisc(
				`rightSwirl${i}`,
				{ radius: 0.15, tessellation: 12 },
				scene,
			);
			const swirlMat = new StandardMaterial(`rightSwirlMat${i}`, scene);
			swirlMat.diffuseColor = ingredientColors[i];
			swirlMat.specularColor = new Color3(0.05, 0.05, 0.05);
			swirlDisc.material = swirlMat;
			swirlDisc.rotation.y = -Math.PI / 2;
			swirlDisc.position = new Vector3(-0.001, 0.5 + offsetY, offsetZ);
			swirlDisc.setEnabled(false);
			rightSwirlDiscs.push(swirlDisc);
			rightSwirlMats.push(swirlMat);
		}

		// --- Animation state ---
		let isCut = false;
		let bobTime = 0;
		const leftTargetX = -1.5;
		const rightTargetX = 1.5;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;

			if (!isCut && sausageRating > 0) {
				// Trigger cut
				isCut = true;

				// Hide whole sausage and its caps
				wholeSausage.setEnabled(false);
				capL.setEnabled(false);
				capR.setEnabled(false);

				// Hide condiment drizzles (they were on the whole sausage)
				mustardDrizzle.setEnabled(false);
				ketchupDrizzle.setEnabled(false);

				// Show halves
				leftHalf.setEnabled(true);
				leftCap.setEnabled(true);
				leftCrossSection.setEnabled(true);
				for (const disc of leftSwirlDiscs) disc.setEnabled(true);
				rightHalf.setEnabled(true);
				rightCap.setEnabled(true);
				rightCrossSection.setEnabled(true);
				for (const disc of rightSwirlDiscs) disc.setEnabled(true);
			}

			if (!isCut) {
				// Gentle hover bob on the whole sausage
				bobTime += dt;
				const bobOffset = Math.sin(bobTime * 2) * 0.1;
				wholeSausage.position.y = 0.5 + bobOffset;
				capL.position.y = 0.5 + bobOffset;
				capR.position.y = 0.5 + bobOffset;
				mustardDrizzle.position.y = 0.55 + bobOffset;
				ketchupDrizzle.position.y = 0.55 + bobOffset;
			} else {
				// Animate halves sliding apart
				const speed = 3;

				// Left half group slides to -1.5
				const leftCurrentX = leftHalf.position.x;
				if (leftCurrentX > leftTargetX) {
					const newX = Math.max(
						leftCurrentX - speed * dt,
						leftTargetX,
					);
					const delta = newX - leftCurrentX;
					leftHalf.position.x = newX;
					leftCap.position.x += delta;
					leftCrossSection.position.x += delta;
					for (const disc of leftSwirlDiscs) disc.position.x += delta;
				}

				// Right half group slides to 1.5
				const rightCurrentX = rightHalf.position.x;
				if (rightCurrentX < rightTargetX) {
					const newX = Math.min(
						rightCurrentX + speed * dt,
						rightTargetX,
					);
					const delta = newX - rightCurrentX;
					rightHalf.position.x = newX;
					rightCap.position.x += delta;
					rightCrossSection.position.x += delta;
					for (const disc of rightSwirlDiscs) disc.position.x += delta;
				}
			}
		});

		return () => {
			if (observer) scene.onBeforeRenderObservable.remove(observer);
			wholeSausage.dispose();
			capL.dispose();
			capR.dispose();
			leftHalf.dispose();
			leftCap.dispose();
			leftCrossSection.dispose();
			for (const disc of leftSwirlDiscs) disc.dispose();
			rightHalf.dispose();
			rightCap.dispose();
			rightCrossSection.dispose();
			for (const disc of rightSwirlDiscs) disc.dispose();
			plate.dispose();
			plateRim.dispose();
			bunL.dispose();
			bunCapL.dispose();
			bunR.dispose();
			bunCapR.dispose();
			mustardDrizzle.dispose();
			ketchupDrizzle.dispose();
			plateMat.dispose();
			rimMat.dispose();
			bunMat.dispose();
			mustardDrizzleMat.dispose();
			ketchupDrizzleMat.dispose();
			meatMat.dispose();
			crossMat.dispose();
			for (const mat of leftSwirlMats) mat.dispose();
			for (const mat of rightSwirlMats) mat.dispose();
		};
	}, [scene, ingredients, sausageRating]);

	return (
		<MrSausage3D reaction={reaction} position={[0, -1, -3]} scale={0.9} />
	);
};
