import {
	type AbstractMesh,
	Color3,
	Color4,
	MeshBuilder,
	ParticleSystem,
	StandardMaterial,
	Texture,
	TransformNode,
	Vector3,
} from "@babylonjs/core";
import { useEffect, useState } from "react";
import { useScene } from "reactylon";
import type { IngredientShape } from "../../engine/Ingredients";
import { useGame } from "../../engine/GameEngine";
import { audioEngine } from "../../engine/AudioEngine";
import { MrSausage3D } from "../characters/MrSausage3D";
import type { Reaction } from "../characters/reactions";

function hexToColor3(hex: string): Color3 {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return new Color3(r, g, b);
}

function createIngredientMesh(
	name: string,
	shape: IngredientShape,
	scene: any,
): AbstractMesh[] {
	const meshes: AbstractMesh[] = [];

	switch (shape.base) {
		case "sphere": {
			const mesh = MeshBuilder.CreateSphere(
				name,
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
			const mesh = MeshBuilder.CreateBox(name, { size: 0.9 }, scene);
			meshes.push(mesh);
			break;
		}
		case "cylinder": {
			const height = shape.detail === "flat" ? 0.3 : 1;
			const mesh = MeshBuilder.CreateCylinder(
				name,
				{ height, diameter: 0.8 },
				scene,
			);
			meshes.push(mesh);
			break;
		}
		case "elongated": {
			const body = MeshBuilder.CreateCylinder(
				name,
				{ height: 1.8, diameter: 0.6 },
				scene,
			);
			meshes.push(body);
			break;
		}
		case "wedge": {
			const mesh = MeshBuilder.CreateCylinder(
				name,
				{ diameterTop: 0, diameterBottom: 1, height: 1 },
				scene,
			);
			meshes.push(mesh);
			break;
		}
		case "cone": {
			const mesh = MeshBuilder.CreateCylinder(
				name,
				{ diameterTop: 0, diameterBottom: 0.8, height: 1 },
				scene,
			);
			meshes.push(mesh);
			break;
		}
		case "small-sphere": {
			const mesh = MeshBuilder.CreateSphere(
				name,
				{ diameter: 0.6, segments: 10 },
				scene,
			);
			meshes.push(mesh);
			break;
		}
		case "irregular": {
			const mesh = MeshBuilder.CreateBox(
				name,
				{ width: 0.9, height: 0.7, depth: 1.1 },
				scene,
			);
			meshes.push(mesh);
			break;
		}
	}

	return meshes;
}

export const GrinderScene = () => {
	const scene = useScene();
	const { grindProgress, setGrindProgress, setPhase, ingredients } = useGame();
	const [reaction, setReaction] = useState<Reaction>("idle");

	useEffect(() => {
		if (!scene) return;

		// ----- Grinder body -----
		const grinderBody = MeshBuilder.CreateBox(
			"grinderBody",
			{ width: 2, height: 2.5, depth: 1.5 },
			scene,
		);
		const grinderMat = new StandardMaterial("grinderMat", scene);
		grinderMat.diffuseColor = new Color3(0.3, 0.3, 0.35);
		grinderMat.specularColor = new Color3(0.5, 0.5, 0.55);
		grinderBody.material = grinderMat;
		grinderBody.position.y = 0;

		// ----- Hopper funnel -----
		const hopper = MeshBuilder.CreateCylinder(
			"hopper",
			{ diameterTop: 3, diameterBottom: 1, height: 2 },
			scene,
		);
		const hopperMat = new StandardMaterial("hopperMat", scene);
		hopperMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
		hopperMat.alpha = 0.5;
		hopper.material = hopperMat;
		hopper.position.y = 2.5;

		// ----- Blade -----
		const blade = MeshBuilder.CreateBox(
			"blade",
			{ width: 2, height: 0.1, depth: 0.5 },
			scene,
		);
		const bladeMat = new StandardMaterial("bladeMat", scene);
		bladeMat.diffuseColor = new Color3(0.8, 0.1, 0.1);
		blade.material = bladeMat;
		blade.position.y = 1.3;

		// ----- Output bowl -----
		const bowl = MeshBuilder.CreateSphere(
			"bowl",
			{ diameter: 2, slice: 0.5 },
			scene,
		);
		const bowlMat = new StandardMaterial("bowlMat", scene);
		bowlMat.diffuseColor = new Color3(0.4, 0.25, 0.15);
		bowl.material = bowlMat;
		bowl.position.y = -1.5;

		// ----- Ground surface (butcher block counter) -----
		const ground = MeshBuilder.CreateDisc(
			"ground",
			{ radius: 8, tessellation: 48 },
			scene,
		);
		const groundMat = new StandardMaterial("groundMat", scene);
		groundMat.diffuseColor = new Color3(0.35, 0.2, 0.1);
		groundMat.specularColor = new Color3(0.15, 0.1, 0.05);
		ground.material = groundMat;
		ground.position.y = -2.5;
		ground.rotation.x = Math.PI / 2;

		// ----- Back wall panel for depth -----
		const backWall = MeshBuilder.CreatePlane(
			"backWall",
			{ width: 16, height: 10 },
			scene,
		);
		const backWallMat = new StandardMaterial("backWallMat", scene);
		backWallMat.diffuseColor = new Color3(0.28, 0.16, 0.08);
		backWallMat.specularColor = new Color3(0.05, 0.03, 0.02);
		backWall.material = backWallMat;
		backWall.position.y = 2;
		backWall.position.z = 3;

		// ----- Ground meat accumulator -----
		const meatBall = MeshBuilder.CreateSphere(
			"meatBall",
			{ diameter: 1, segments: 12 },
			scene,
		);
		const meatBallMat = new StandardMaterial("meatBallMat", scene);
		meatBallMat.diffuseColor = new Color3(0.6, 0.2, 0.15);
		meatBall.material = meatBallMat;
		meatBall.position.y = -1.3;
		meatBall.scaling = new Vector3(0.01, 0.01, 0.01);

		// ----- Ingredient meshes on shelf -----
		const ingredientMeshNames: string[] = [];
		const ingredientMeshes: AbstractMesh[] = [];
		const allCreatedMeshes: AbstractMesh[] = [];
		const ingredientMats: StandardMaterial[] = [];
		const shelfPositions = [
			new Vector3(-3, 2, 0),
			new Vector3(-3, 2, 1.2),
			new Vector3(-3, 2, -1.2),
		];

		for (let i = 0; i < Math.min(ingredients.length, 3); i++) {
			const ing = ingredients[i];
			const meshName = `ingredient_${i}`;
			const shape = ing.shape ?? { base: "sphere" as const };
			const meshes = createIngredientMesh(meshName, shape, scene);

			const mat = new StandardMaterial(`${meshName}_mat`, scene);
			mat.diffuseColor = hexToColor3(ing.color);
			ingredientMats.push(mat);

			// If multiple meshes (e.g. elongated with claws), group under a TransformNode
			if (meshes.length > 1) {
				const group = new TransformNode(`${meshName}_group`, scene);
				group.position = shelfPositions[i].clone();
				for (const m of meshes) {
					m.material = mat;
					m.parent = group;
					m.checkCollisions = true;
				}
				// Use the first mesh as the primary draggable/collidable
				ingredientMeshNames.push(meshes[0].name);
				ingredientMeshes.push(meshes[0]);
				allCreatedMeshes.push(...meshes);
			} else if (meshes.length === 1) {
				meshes[0].material = mat;
				meshes[0].position = shelfPositions[i].clone();
				meshes[0].checkCollisions = true;
				ingredientMeshNames.push(meshes[0].name);
				ingredientMeshes.push(meshes[0]);
				allCreatedMeshes.push(meshes[0]);
			}
		}

		// ----- Meat particle system -----
		const meatParticles = new ParticleSystem("meat", 500, scene);
		meatParticles.particleTexture = new Texture(
			"https://playground.babylonjs.com/textures/flare.png",
			scene,
		);
		meatParticles.emitter = new Vector3(0, 0, 0);
		meatParticles.minEmitBox = new Vector3(-0.5, 0, -0.5);
		meatParticles.maxEmitBox = new Vector3(0.5, 0, 0.5);
		meatParticles.color1 = new Color4(0.8, 0.2, 0.2, 1);
		meatParticles.color2 = new Color4(0.5, 0.1, 0.1, 1);
		meatParticles.colorDead = new Color4(0.3, 0.1, 0.1, 0.0);
		meatParticles.minSize = 0.1;
		meatParticles.maxSize = 0.3;
		meatParticles.minLifeTime = 0.5;
		meatParticles.maxLifeTime = 1.0;
		meatParticles.emitRate = 0;
		meatParticles.direction1 = new Vector3(-1, -2, -1);
		meatParticles.direction2 = new Vector3(1, -5, 1);
		meatParticles.gravity = new Vector3(0, -9.81, 0);
		meatParticles.start();

		// ----- Drag-fling interaction state -----
		let pickedMesh: AbstractMesh | null = null;
		let lastPointerPos = { x: 0, y: 0 };

		scene.onPointerDown = (evt) => {
			const pick = scene.pick(
				evt.offsetX ?? scene.pointerX,
				evt.offsetY ?? scene.pointerY,
			);
			if (
				pick?.hit &&
				pick.pickedMesh &&
				ingredientMeshNames.includes(pick.pickedMesh.name)
			) {
				pickedMesh = pick.pickedMesh;
				lastPointerPos = { x: scene.pointerX, y: scene.pointerY };
			}
		};

		scene.onPointerMove = () => {
			if (!pickedMesh) return;
			const dx = (scene.pointerX - lastPointerPos.x) * 0.02;
			const dy = -(scene.pointerY - lastPointerPos.y) * 0.02;
			if (pickedMesh.parent) {
				(pickedMesh.parent as TransformNode).position.x += dx;
				(pickedMesh.parent as TransformNode).position.y += dy;
			} else {
				pickedMesh.position.x += dx;
				pickedMesh.position.y += dy;
			}
			lastPointerPos = { x: scene.pointerX, y: scene.pointerY };
		};

		scene.onPointerUp = () => {
			pickedMesh = null;
		};

		// ----- Force initial world matrix computation -----
		// Babylon.js doesn't compute world matrices until first render.
		// intersectsMesh uses bounding boxes derived from world matrices,
		// so without this, all meshes appear at origin and collide instantly.
		grinderBody.computeWorldMatrix(true);
		hopper.computeWorldMatrix(true);
		blade.computeWorldMatrix(true);
		bowl.computeWorldMatrix(true);
		meatBall.computeWorldMatrix(true);
		for (const m of allCreatedMeshes) {
			m.computeWorldMatrix(true);
		}

		// ----- Hopper collision & animation loop -----
		let currentGrindProgress = grindProgress;
		let groundCount = 0;
		const groundIngredients = new Set<string>();
		let shakeTimer = 0;
		let warmupFrames = 3; // Skip first 3 frames to let bounding boxes settle
		const totalIngredients = Math.min(ingredients.length, 3);
		const progressPerIngredient =
			totalIngredients > 0 ? 100 / totalIngredients : 100;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;

			// Skip collision checks during warmup
			if (warmupFrames > 0) {
				warmupFrames--;
				// Still spin blade during warmup
				blade.rotation.y += dt * 8;
				return;
			}

			// Spin blade continuously
			blade.rotation.y += dt * 8;

			// Grow meat ball with grind progress
			const scale = Math.max(0.01, (currentGrindProgress / 100) * 0.8);
			meatBall.scaling = new Vector3(scale, scale, scale);

			// Hopper shake
			if (shakeTimer > 0) {
				shakeTimer -= dt;
				hopper.position.x = (Math.random() - 0.5) * 0.15;
				hopper.position.z = (Math.random() - 0.5) * 0.15;
				hopper.position.y = 2.5 + (Math.random() - 0.5) * 0.08;
			} else {
				hopper.position.x = 0;
				hopper.position.z = 0;
				hopper.position.y = 2.5;
			}

			// Check ingredient-hopper collisions
			for (let i = ingredientMeshes.length - 1; i >= 0; i--) {
				const mesh = ingredientMeshes[i];
				if (groundIngredients.has(mesh.name)) continue;
				if (!mesh.isDisposed() && mesh.intersectsMesh(hopper)) {
					// Mark as ground
					groundIngredients.add(mesh.name);
					groundCount++;

					// Dispose ingredient mesh (and parent group if it has one)
					if (mesh.parent && mesh.parent instanceof TransformNode) {
						const parent = mesh.parent as TransformNode;
						const children = parent.getChildMeshes();
						for (const child of children) {
							child.dispose();
						}
						parent.dispose();
					} else {
						mesh.dispose();
					}

					// Particle burst
					meatParticles.manualEmitCount += 30;

					// Increase grind progress
					const newProgress = Math.min(
						currentGrindProgress + progressPerIngredient,
						100,
					);
					currentGrindProgress = newProgress;
					setGrindProgress(newProgress);

					// Shake hopper
					shakeTimer = 0.5;

					// Audio
					audioEngine.startGrinder();
					setTimeout(() => audioEngine.stopGrinder(), 500);

					// Mr. Sausage reaction
					if (totalIngredients > 0 && groundCount >= totalIngredients) {
						setReaction("excitement");
						setTimeout(() => setPhase("stuff"), 600);
					} else {
						setReaction("flinch");
						setTimeout(() => setReaction("idle"), 500);
					}
				}
			}
		});

		// ----- Cleanup -----
		return () => {
			scene.onPointerDown = undefined as any;
			scene.onPointerMove = undefined as any;
			scene.onPointerUp = undefined as any;
			if (observer) scene.onBeforeRenderObservable.remove(observer);

			meatParticles.stop();
			meatParticles.dispose();

			for (const mesh of allCreatedMeshes) {
				if (!mesh.isDisposed()) mesh.dispose();
			}
			for (const mat of ingredientMats) {
				mat.dispose();
			}

			grinderBody.dispose();
			grinderMat.dispose();
			hopper.dispose();
			hopperMat.dispose();
			blade.dispose();
			bladeMat.dispose();
			bowl.dispose();
			bowlMat.dispose();
			meatBall.dispose();
			meatBallMat.dispose();
			ground.dispose();
			groundMat.dispose();
			backWall.dispose();
			backWallMat.dispose();
		};
	}, [scene]);

	return <MrSausage3D reaction={reaction} position={[4, -1, 0]} scale={0.8} />;
};
