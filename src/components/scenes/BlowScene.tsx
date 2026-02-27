import {
	Color3,
	Color4,
	type Mesh,
	MeshBuilder,
	ParticleSystem,
	StandardMaterial,
	Texture,
	Vector3,
} from "@babylonjs/core";
import { useEffect, useRef, useState } from "react";
import { useScene } from "reactylon";
import { MrSausage3D } from "../characters/MrSausage3D";
import type { Reaction } from "../characters/reactions";
import { useGame } from "../../engine/GameEngine";

/**
 * Parses a hex color string (e.g. "#FF6B35") into a Color4 with the given alpha.
 */
function hexToColor4(hex: string, alpha = 1): Color4 {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return new Color4(r, g, b, alpha);
}

function hexToColor3(hex: string): Color3 {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return new Color3(r, g, b);
}

interface MeatChunk {
	mesh: Mesh;
	material: StandardMaterial;
	velocity: Vector3;
	stuck: boolean;
}

export const BlowScene = () => {
	const scene = useScene();
	const { ruffalos, ingredients } = useGame();
	const prevRuffalos = useRef(0);
	const chunksRef = useRef<MeatChunk[]>([]);
	const shakeIntensityRef = useRef(0);
	const pointerDownRef = useRef(false);
	const [reaction, setReaction] = useState<Reaction>("nervous");

	// Main scene setup: tube, ring, wall, particles, pointer shake, render loop
	useEffect(() => {
		if (!scene) return;

		// ---------------------------------------------------------------
		// Stuffer tube — horizontal cylinder facing +Z
		// ---------------------------------------------------------------
		const tube = MeshBuilder.CreateCylinder(
			"tube",
			{ diameter: 2, height: 1.5, tessellation: 32 },
			scene,
		);
		const tubeMat = new StandardMaterial("tubeMat", scene);
		tubeMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
		tubeMat.specularColor = new Color3(0.3, 0.3, 0.3);
		tube.material = tubeMat;
		tube.rotation.x = Math.PI / 2; // rotate so opening faces +Z
		tube.position = new Vector3(0, 0, -2);

		// ---------------------------------------------------------------
		// Tube opening ring (torus)
		// ---------------------------------------------------------------
		const tubeRing = MeshBuilder.CreateTorus(
			"tubeRing",
			{ diameter: 2.2, thickness: 0.2, tessellation: 24 },
			scene,
		);
		const tubeRingMat = new StandardMaterial("tubeRingMat", scene);
		tubeRingMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
		tubeRingMat.emissiveColor = new Color3(0, 0, 0);
		tubeRing.material = tubeRingMat;
		tubeRing.rotation.x = Math.PI / 2;
		tubeRing.position = new Vector3(0, 0, -1.25);

		// ---------------------------------------------------------------
		// Back wall — splatter target
		// ---------------------------------------------------------------
		const wall = MeshBuilder.CreatePlane(
			"wall",
			{ width: 12, height: 10 },
			scene,
		);
		const wallMat = new StandardMaterial("wallMat", scene);
		wallMat.diffuseColor = new Color3(0.05, 0.05, 0.05);
		wall.material = wallMat;
		wall.position = new Vector3(0, 0, 6);

		// ---------------------------------------------------------------
		// Splatter particle system (kept for additional visual flair)
		// ---------------------------------------------------------------
		const splatterParticles = new ParticleSystem("splatter", 2000, scene);
		splatterParticles.particleTexture = new Texture(
			"https://playground.babylonjs.com/textures/flare.png",
			scene,
		);
		splatterParticles.emitter = new Vector3(0, 0, -1);
		splatterParticles.direction1 = new Vector3(-3, -3, 5);
		splatterParticles.direction2 = new Vector3(3, 3, 8);
		splatterParticles.minSize = 0.2;
		splatterParticles.maxSize = 0.8;
		splatterParticles.minLifeTime = 2;
		splatterParticles.maxLifeTime = 4;
		splatterParticles.gravity = new Vector3(0, -2, 0);

		if (ingredients.length > 0) {
			splatterParticles.color1 = hexToColor4(ingredients[0].color);
			splatterParticles.color2 = hexToColor4(
				ingredients[ingredients.length > 1 ? 1 : 0].color,
			);
			splatterParticles.colorDead = hexToColor4(
				ingredients[Math.min(2, ingredients.length - 1)].color,
				0,
			);
		} else {
			splatterParticles.color1 = new Color4(0.8, 0.2, 0.2, 1);
			splatterParticles.color2 = new Color4(0.5, 0.1, 0.1, 1);
			splatterParticles.colorDead = new Color4(0.3, 0.1, 0.1, 0);
		}

		splatterParticles.emitRate = 0;
		splatterParticles.start();

		// ---------------------------------------------------------------
		// Floor plane — large disc at y=-2
		// ---------------------------------------------------------------
		const floor = MeshBuilder.CreateDisc(
			"floor",
			{ radius: 8, tessellation: 48 },
			scene,
		);
		const floorMat = new StandardMaterial("floorMat", scene);
		floorMat.diffuseColor = new Color3(0.12, 0.12, 0.14);
		floorMat.specularColor = new Color3(0.05, 0.05, 0.05);
		floor.material = floorMat;
		floor.rotation.x = Math.PI / 2; // lay flat
		floor.position.y = -2;

		// ---------------------------------------------------------------
		// Side wall panels — enclosed chamber feel
		// ---------------------------------------------------------------
		const leftWall = MeshBuilder.CreatePlane(
			"leftWall",
			{ width: 12, height: 10 },
			scene,
		);
		const leftWallMat = new StandardMaterial("leftWallMat", scene);
		leftWallMat.diffuseColor = new Color3(0.08, 0.08, 0.1);
		leftWall.material = leftWallMat;
		leftWall.position = new Vector3(-6, 0, 2);
		leftWall.rotation.y = Math.PI / 2; // face inward (+X)

		const rightWall = MeshBuilder.CreatePlane(
			"rightWall",
			{ width: 12, height: 10 },
			scene,
		);
		const rightWallMat = new StandardMaterial("rightWallMat", scene);
		rightWallMat.diffuseColor = new Color3(0.08, 0.08, 0.1);
		rightWall.material = rightWallMat;
		rightWall.position = new Vector3(6, 0, 2);
		rightWall.rotation.y = -Math.PI / 2; // face inward (-X)

		// ---------------------------------------------------------------
		// Pointer events for shake detection
		// ---------------------------------------------------------------
		const onPointerDown = () => {
			pointerDownRef.current = true;
		};
		const onPointerUp = () => {
			pointerDownRef.current = false;
		};
		scene.onPointerDown = onPointerDown;
		scene.onPointerUp = onPointerUp;

		// ---------------------------------------------------------------
		// Render loop — tube shake + chunk physics
		// ---------------------------------------------------------------
		const tubeBaseX = 0;
		const tubeBaseY = 0;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;

			// --- Shake intensity management ---
			if (pointerDownRef.current && prevRuffalos.current === 0) {
				// Building pressure — increase shake
				shakeIntensityRef.current = Math.min(
					shakeIntensityRef.current + dt * 0.8,
					1,
				);
			} else {
				// Ease off shake
				shakeIntensityRef.current = Math.max(
					shakeIntensityRef.current - dt * 2,
					0,
				);
			}

			const shake = shakeIntensityRef.current;

			// --- Tube vibration ---
			tube.position.x =
				tubeBaseX + (Math.random() - 0.5) * shake * 0.1;
			tube.position.y =
				tubeBaseY + (Math.random() - 0.5) * shake * 0.1;

			// --- Tube ring glow ---
			tubeRingMat.emissiveColor = Color3.Lerp(
				new Color3(0, 0, 0),
				new Color3(0.5, 0.2, 0),
				shake,
			);

			// --- Meat chunk physics ---
			for (const chunk of chunksRef.current) {
				if (chunk.stuck) {
					// Drip slowly down the wall
					chunk.mesh.position.y -= 0.2 * dt;
					continue;
				}

				// Move chunk
				chunk.mesh.position.x += chunk.velocity.x * dt;
				chunk.mesh.position.y += chunk.velocity.y * dt;
				chunk.mesh.position.z += chunk.velocity.z * dt;

				// Apply gravity
				chunk.velocity.y -= 5 * dt;

				// Check wall collision
				if (chunk.mesh.position.z >= 5.8) {
					chunk.mesh.position.z = 5.8;
					chunk.stuck = true;
				}
			}
		});

		// ---------------------------------------------------------------
		// Cleanup
		// ---------------------------------------------------------------
		return () => {
			scene.onBeforeRenderObservable.remove(observer);
			scene.onPointerDown = undefined;
			scene.onPointerUp = undefined;

			splatterParticles.stop();
			splatterParticles.dispose();
			tube.dispose();
			tubeMat.dispose();
			tubeRing.dispose();
			tubeRingMat.dispose();
			wall.dispose();
			wallMat.dispose();
			floor.dispose();
			floorMat.dispose();
			leftWall.dispose();
			leftWallMat.dispose();
			rightWall.dispose();
			rightWallMat.dispose();

			// Dispose all meat chunks
			for (const chunk of chunksRef.current) {
				chunk.mesh.dispose();
				chunk.material.dispose();
			}
			chunksRef.current = [];
		};
	}, [scene, ingredients]);

	// Trigger splatter burst + meat chunks when ruffalos transitions 0 -> positive
	useEffect(() => {
		if (!scene) return;

		if (prevRuffalos.current === 0 && ruffalos > 0) {
			// Trigger the particle system burst
			const ps = scene.particleSystems.find(
				(p) => p.name === "splatter",
			);
			if (ps) {
				(ps as ParticleSystem).manualEmitCount = ruffalos * 100;
			}

			// Create meat chunk meshes
			const chunkCount = ruffalos * 15 + 5;
			const newChunks: MeatChunk[] = [];

			for (let i = 0; i < chunkCount; i++) {
				const diameter = 0.15 + Math.random() * 0.25;
				const mesh = MeshBuilder.CreateSphere(
					`chunk_${i}_${Date.now()}`,
					{ diameter, segments: 6 },
					scene,
				);

				// Pick a random ingredient color
				const mat = new StandardMaterial(
					`chunkMat_${i}_${Date.now()}`,
					scene,
				);
				if (ingredients.length > 0) {
					const ing =
						ingredients[
							Math.floor(Math.random() * ingredients.length)
						];
					mat.diffuseColor = hexToColor3(ing.color);
				} else {
					mat.diffuseColor = new Color3(0.8, 0.2, 0.2);
				}
				mesh.material = mat;

				// Position at tube opening
				mesh.position = new Vector3(0, 0, -1);

				// Velocity toward wall with random spread
				const velocityZ = 8 + Math.random() * 4;
				const velocityX = (Math.random() - 0.5) * ruffalos * 2;
				const velocityY = (Math.random() - 0.5) * ruffalos * 2;

				newChunks.push({
					mesh,
					material: mat,
					velocity: new Vector3(velocityX, velocityY, velocityZ),
					stuck: false,
				});
			}

			chunksRef.current.push(...newChunks);

			// Set Mr. Sausage reaction based on ruffalos result
			if (ruffalos >= 3) {
				setReaction("laugh");
			} else if (ruffalos >= 1) {
				setReaction("nod");
			} else {
				setReaction("disgust");
			}
		}

		prevRuffalos.current = ruffalos;
	}, [scene, ruffalos, ingredients]);

	return (
		<MrSausage3D reaction={reaction} position={[-4, -1, 0]} scale={0.8} />
	);
};
