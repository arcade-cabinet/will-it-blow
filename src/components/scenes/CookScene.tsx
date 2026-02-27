import {
	type AbstractMesh,
	Color3,
	Color4,
	MeshBuilder,
	ParticleSystem,
	StandardMaterial,
	Texture,
	Vector3,
} from "@babylonjs/core";
import { useEffect, useRef, useState } from "react";
import { useScene } from "reactylon";
import { useGame } from "../../engine/GameEngine";
import { MrSausage3D } from "../characters/MrSausage3D";
import type { Reaction } from "../characters/reactions";

function hexToColor3(hex: string): Color3 {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return new Color3(r, g, b);
}

export const CookScene = () => {
	const scene = useScene();
	const { cookProgress, hasBurst, ingredients } = useGame();
	const [reaction, setReaction] = useState<Reaction>("nervous");

	// Refs to avoid rebuilding the entire scene on every cookProgress tick
	const cookProgressRef = useRef(cookProgress);
	const hasBurstRef = useRef(hasBurst);
	useEffect(() => { cookProgressRef.current = cookProgress; }, [cookProgress]);
	useEffect(() => { hasBurstRef.current = hasBurst; }, [hasBurst]);

	// Refs for flip state (persist across renders without triggering re-render)
	const flipStateRef = useRef({
		flipped: false,
		flipping: false,
		flipProgress: 0,
		flipTarget: 0,
	});

	useEffect(() => {
		if (!scene) return;

		// --- Stove burner glow ---

		const burner = MeshBuilder.CreateDisc(
			"burner",
			{ radius: 2.5, tessellation: 32 },
			scene,
		);
		const burnerMat = new StandardMaterial("burnerMat", scene);
		burnerMat.diffuseColor = new Color3(0.1, 0.05, 0.02);
		burnerMat.specularColor = new Color3(0, 0, 0);
		burnerMat.emissiveColor = new Color3(0, 0, 0);
		burner.material = burnerMat;
		burner.position.y = -0.3;
		burner.rotation.x = Math.PI / 2;

		// --- Stove surface ---

		const stoveSurface = MeshBuilder.CreateDisc(
			"stoveSurface",
			{ radius: 4, tessellation: 48 },
			scene,
		);
		const stoveSurfaceMat = new StandardMaterial("stoveSurfaceMat", scene);
		stoveSurfaceMat.diffuseColor = new Color3(0.08, 0.08, 0.1);
		stoveSurfaceMat.specularColor = new Color3(0.15, 0.15, 0.15);
		stoveSurfaceMat.emissiveColor = new Color3(0.03, 0.015, 0.005);
		stoveSurface.material = stoveSurfaceMat;
		stoveSurface.position.y = -0.35;
		stoveSurface.rotation.x = Math.PI / 2;

		// --- Kitchen counter ---

		const counter = MeshBuilder.CreateBox(
			"counter",
			{ width: 10, height: 0.3, depth: 6 },
			scene,
		);
		const counterMat = new StandardMaterial("counterMat", scene);
		counterMat.diffuseColor = new Color3(0.18, 0.1, 0.06);
		counterMat.specularColor = new Color3(0.05, 0.05, 0.05);
		counter.material = counterMat;
		counter.position.y = -0.6;

		// --- Frying Pan ---

		const panRim = MeshBuilder.CreateTorus(
			"panRim",
			{ diameter: 5, thickness: 0.5, tessellation: 32 },
			scene,
		);
		const panRimMat = new StandardMaterial("panRimMat", scene);
		panRimMat.diffuseColor = new Color3(0.25, 0.25, 0.25);
		panRimMat.specularColor = new Color3(0.3, 0.3, 0.3);
		panRim.material = panRimMat;

		const panBase = MeshBuilder.CreateDisc(
			"panBase",
			{ radius: 2.2, tessellation: 32 },
			scene,
		);
		const panBaseMat = new StandardMaterial("panBaseMat", scene);
		panBaseMat.diffuseColor = new Color3(0.15, 0.15, 0.15);
		panBaseMat.emissiveColor = new Color3(0, 0, 0);
		panBaseMat.specularColor = new Color3(0.1, 0.1, 0.1);
		panBase.material = panBaseMat;
		panBase.position.y = -0.15;
		panBase.rotation.x = Math.PI / 2;

		const handle = MeshBuilder.CreateBox(
			"handle",
			{ width: 1.2, height: 0.3, depth: 0.3 },
			scene,
		);
		const handleMat = new StandardMaterial("handleMat", scene);
		handleMat.diffuseColor = new Color3(0.25, 0.25, 0.25);
		handle.material = handleMat;
		handle.position.x = 3.2;

		// --- Sausage ---

		const sausage = MeshBuilder.CreateCylinder(
			"sausage",
			{ height: 3, diameter: 0.8, tessellation: 24 },
			scene,
		);
		const sausageMat = new StandardMaterial("sausageMat", scene);
		sausageMat.diffuseColor = new Color3(0.8, 0.3, 0.2);
		sausageMat.specularColor = new Color3(0.2, 0.1, 0.05);
		sausage.material = sausageMat;
		sausage.rotation.z = Math.PI / 2; // Lay on side
		sausage.position.y = 0.15;

		// --- Char marks (created but hidden, fade in when cookProgress > 80 and !hasBurst) ---

		const charMarks: AbstractMesh[] = [];
		const charMarkMats: StandardMaterial[] = [];
		const charMarkOffsets = [-0.9, -0.3, 0.3, 0.9];
		for (let i = 0; i < 4; i++) {
			const mark = MeshBuilder.CreateCylinder(
				`charMark_${i}`,
				{ height: 0.05, diameter: 0.85, tessellation: 16 },
				scene,
			);
			const markMat = new StandardMaterial(`charMarkMat_${i}`, scene);
			markMat.diffuseColor = new Color3(0.15, 0.05, 0.02);
			markMat.alpha = 0;
			mark.material = markMat;
			mark.parent = sausage;
			// Position along the sausage length (which is the Y axis of the cylinder before rotation)
			mark.position.y = charMarkOffsets[i];
			charMarks.push(mark);
			charMarkMats.push(markMat);
		}

		// --- Spark Particle System ---

		const sparks = new ParticleSystem("sparks", 500, scene);
		sparks.particleTexture = new Texture(
			"https://playground.babylonjs.com/textures/flare.png",
			scene,
		);
		sparks.emitter = new Vector3(0, 0, 0);
		sparks.minEmitBox = new Vector3(-1.5, -0.1, -1.5);
		sparks.maxEmitBox = new Vector3(1.5, 0.1, 1.5);
		sparks.color1 = new Color4(1, 0.85, 0.2, 1);
		sparks.color2 = new Color4(1, 0.5, 0.1, 1);
		sparks.colorDead = new Color4(0.5, 0.2, 0.0, 0.0);
		sparks.minSize = 0.02;
		sparks.maxSize = 0.08;
		sparks.minLifeTime = 0.3;
		sparks.maxLifeTime = 0.8;
		sparks.emitRate = 0;
		sparks.direction1 = new Vector3(-0.5, 1, -0.5);
		sparks.direction2 = new Vector3(0.5, 3, 0.5);
		sparks.gravity = new Vector3(0, -2, 0);
		sparks.start();

		// --- Burst explosion state ---

		let burstExploded = false;
		let burstTimer = 0;
		const explosionChunks: {
			mesh: AbstractMesh;
			mat: StandardMaterial;
			velocity: Vector3;
		}[] = [];

		// --- Drag state ---

		let isDragging = false;
		let lastPointerPos = { x: 0, y: 0 };

		// --- Pointer interactions ---

		scene.onPointerDown = (evt: any) => {
			const pick = scene.pick(
				evt.offsetX ?? scene.pointerX,
				evt.offsetY ?? scene.pointerY,
			);
			if (pick?.hit && pick.pickedMesh?.name === "sausage") {
				// Start a flip
				const state = flipStateRef.current;
				if (!state.flipping && !burstExploded) {
					state.flipping = true;
					state.flipTarget = state.flipped ? 0 : Math.PI;
					state.flipProgress = state.flipped ? Math.PI : 0;
					// Spark spray on flip
					sparks.manualEmitCount += 20;
				}
				isDragging = true;
				lastPointerPos = { x: scene.pointerX, y: scene.pointerY };
			}
		};

		scene.onPointerMove = () => {
			if (!isDragging || sausage.isDisposed()) return;
			const dx = (scene.pointerX - lastPointerPos.x) * 0.02;
			const dz = -(scene.pointerY - lastPointerPos.y) * 0.02;

			// Move sausage, clamped within pan radius ~2 units
			const newX = sausage.position.x + dx;
			const newZ = sausage.position.z + dz;
			const dist = Math.sqrt(newX * newX + newZ * newZ);
			if (dist < 2.0) {
				sausage.position.x = newX;
				sausage.position.z = newZ;
			} else {
				// Clamp to edge
				const scale = 2.0 / dist;
				sausage.position.x = newX * scale;
				sausage.position.z = newZ * scale;
			}

			// Roll rotation based on movement direction
			sausage.rotation.y += dx * 2;

			lastPointerPos = { x: scene.pointerX, y: scene.pointerY };
		};

		scene.onPointerUp = () => {
			isDragging = false;
		};

		// --- Render loop observer ---

		let time = 0;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			time += dt;

			const currentCookProgress = cookProgressRef.current;
			const currentHasBurst = hasBurstRef.current;
			const progress = currentCookProgress / 100; // 0..1

			// --- Burner glow: pulses orange based on cookProgress ---
			const burnerPulse = Math.sin(time * 3) * 0.05;
			burnerMat.emissiveColor = new Color3(
				progress * 0.6 + burnerPulse,
				progress * 0.15 + burnerPulse * 0.25,
				0,
			);

			// --- Sausage color: gets redder as it cooks ---
			const r = Math.min(0.8 + progress * 0.2, 1.0);
			const g = Math.max(0.3 - progress * 0.2, 0.05);
			const b = Math.max(0.2 - progress * 0.15, 0.03);

			if (!sausage.isDisposed()) {
				sausageMat.diffuseColor = new Color3(r, g, b);

				// Subtle emissive glow on sausage as it cooks
				const sausageGlow = progress * 0.15;
				sausageMat.emissiveColor = new Color3(
					sausageGlow * 1.0,
					sausageGlow * 0.3,
					sausageGlow * 0.1,
				);

				// --- Flip animation ---
				const flipState = flipStateRef.current;
				if (flipState.flipping) {
					const dir = flipState.flipped ? -1 : 1;
					flipState.flipProgress += dir * dt * 6;

					if (
						(!flipState.flipped && flipState.flipProgress >= Math.PI) ||
						(flipState.flipped && flipState.flipProgress <= 0)
					) {
						// Snap and stop
						flipState.flipProgress = flipState.flipped ? 0 : Math.PI;
						flipState.flipped = !flipState.flipped;
						flipState.flipping = false;
					}

					sausage.rotation.x = flipState.flipProgress;
				}

				// --- Char marks (no-burst path) ---
				if (currentCookProgress > 80 && !currentHasBurst) {
					const charAlpha = Math.min(
						(currentCookProgress - 80) / 20,
						1,
					);
					for (const mat of charMarkMats) {
						mat.alpha = charAlpha;
					}
				}
			}

			// --- Spark emit rate: ramps up with cook progress ---
			sparks.emitRate = progress * 50;

			// --- Pan base heat shimmer: emissive intensifies ---
			const heatGlow = progress * 0.2;
			panBaseMat.emissiveColor = new Color3(
				heatGlow * 1.0,
				heatGlow * 0.25,
				heatGlow * 0.05,
			);

			// --- Burst behavior ---
			if (currentHasBurst) {
				if (!burstExploded) {
					// Phase 1: Pulse and jitter for 500ms
					burstTimer += dt;

					if (!sausage.isDisposed()) {
						const sausageGlow = progress * 0.15;
						const noise =
							Math.sin(time * 17.3) * 0.3 +
							Math.sin(time * 31.7) * 0.15;
						const pulse =
							1.0 + Math.sin(time * 8) * 0.1 + noise * 0.08;
						const diameterBulge = 1.15;

						sausage.scaling.x = pulse;
						sausage.scaling.y = diameterBulge * pulse;
						sausage.scaling.z = diameterBulge * pulse;

						sausage.position.x += (Math.random() - 0.5) * 0.06;
						sausage.position.z += (Math.random() - 0.5) * 0.06;

						sausageMat.diffuseColor = new Color3(
							Math.min(r + 0.1, 1.0),
							Math.max(g - 0.05, 0.02),
							Math.max(b - 0.05, 0.01),
						);
						sausageMat.emissiveColor = new Color3(
							sausageGlow * 1.2 + 0.05,
							sausageGlow * 0.15,
							0,
						);

						sparks.emitRate = Math.max(sparks.emitRate, 35) + 20;
					}

					// Phase 2: Explode after 500ms
					if (burstTimer >= 0.5 && !sausage.isDisposed()) {
						burstExploded = true;

						// Dispose sausage and char marks
						for (const mark of charMarks) {
							if (!mark.isDisposed()) mark.dispose();
						}
						for (const mat of charMarkMats) {
							mat.dispose();
						}
						sausage.dispose();

						// Collect ingredient colors for chunks
						const chunkColors =
							ingredients.length > 0
								? ingredients.map((ing) => hexToColor3(ing.color))
								: [
										new Color3(0.8, 0.2, 0.15),
										new Color3(0.6, 0.3, 0.1),
										new Color3(0.9, 0.4, 0.2),
									];

						// Create 20 explosion chunks
						for (let i = 0; i < 20; i++) {
							const diameter =
								0.15 + Math.random() * 0.15;
							const chunk = MeshBuilder.CreateSphere(
								`chunk_${i}`,
								{ diameter, segments: 6 },
								scene,
							);
							const chunkMat = new StandardMaterial(
								`chunkMat_${i}`,
								scene,
							);
							const color =
								chunkColors[i % chunkColors.length];
							chunkMat.diffuseColor = color;
							chunkMat.emissiveColor = new Color3(
								color.r * 0.2,
								color.g * 0.2,
								color.b * 0.2,
							);
							chunk.material = chunkMat;
							chunk.position = new Vector3(0, 0.15, 0);

							const velocity = new Vector3(
								(Math.random() - 0.5) * 8,
								3 + Math.random() * 5,
								(Math.random() - 0.5) * 8,
							);

							explosionChunks.push({
								mesh: chunk,
								mat: chunkMat,
								velocity,
							});
						}

						// Intense sparks during explosion
						sparks.emitRate = 150;
						sparks.manualEmitCount += 100;
					}
				} else {
					// Phase 3: Animate explosion chunks with gravity
					for (let i = explosionChunks.length - 1; i >= 0; i--) {
						const chunk = explosionChunks[i];
						if (chunk.mesh.isDisposed()) continue;

						chunk.velocity.y -= 9.81 * dt;
						chunk.mesh.position.x += chunk.velocity.x * dt;
						chunk.mesh.position.y += chunk.velocity.y * dt;
						chunk.mesh.position.z += chunk.velocity.z * dt;

						// Tumble
						chunk.mesh.rotation.x += dt * 5;
						chunk.mesh.rotation.z += dt * 3;

						// Dispose chunks that fell off screen
						if (chunk.mesh.position.y < -5) {
							chunk.mesh.dispose();
							chunk.mat.dispose();
						}
					}

					// Gradually reduce spark rate after explosion
					if (sparks.emitRate > 10) {
						sparks.emitRate -= dt * 60;
					}
				}
			} else {
				// Not burst — reset sausage scaling/position
				if (!sausage.isDisposed()) {
					if (!flipStateRef.current.flipping && !isDragging) {
						sausage.scaling.x = 1;
						sausage.scaling.y = 1;
						sausage.scaling.z = 1;
					}
				}
			}
		});

		return () => {
			scene.onPointerDown = undefined as any;
			scene.onPointerMove = undefined as any;
			scene.onPointerUp = undefined as any;
			if (observer) scene.onBeforeRenderObservable.remove(observer);

			sparks.stop();
			sparks.dispose();

			if (!sausage.isDisposed()) sausage.dispose();
			sausageMat.dispose();

			for (const mark of charMarks) {
				if (!mark.isDisposed()) mark.dispose();
			}
			for (const mat of charMarkMats) {
				mat.dispose();
			}

			for (const chunk of explosionChunks) {
				if (!chunk.mesh.isDisposed()) chunk.mesh.dispose();
				chunk.mat.dispose();
			}

			panRim.dispose();
			panRimMat.dispose();
			panBase.dispose();
			panBaseMat.dispose();
			handle.dispose();
			handleMat.dispose();
			burner.dispose();
			burnerMat.dispose();
			stoveSurface.dispose();
			stoveSurfaceMat.dispose();
			counter.dispose();
			counterMat.dispose();
		};
	}, [scene]);

	// --- MrSausage3D reaction logic ---
	useEffect(() => {
		if (hasBurst) {
			setReaction("flinch");
			const timer = setTimeout(() => setReaction("excitement"), 600);
			return () => clearTimeout(timer);
		}
		// cookProgress is 0-100; if complete and no burst, nod
		if (cookProgress >= 100 && !hasBurst) {
			setReaction("nod");
			return;
		}
		// Default during cooking
		setReaction("nervous");
	}, [hasBurst, cookProgress]);

	return (
		<MrSausage3D reaction={reaction} position={[-2.5, 0, 2]} scale={0.55} />
	);
};
