import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import {
	Color3,
	MeshBuilder,
	StandardMaterial,
	Vector3,
} from '@babylonjs/core';
import type { AbstractMesh, Observer, Scene as BabylonScene } from '@babylonjs/core';

interface StoveStationProps {
	temperature: number; // Current temp (room temp ~70 to max ~250)
	heatLevel: number; // 0-1 (burner intensity)
	holdProgress: number; // 0-100 (progress toward hold completion)
}

// Stove position near back wall
const STOVE_POS: [number, number, number] = [0, 0, -6.5];
const FLOOR_Y = 0;

// Temperature color thresholds (relative to a notional target of ~160)
const COLOR_PINK = new Color3(1.0, 0.714, 0.757); // #FFB6C1
const COLOR_BROWN = new Color3(0.545, 0.271, 0.075); // #8B4513
const COLOR_BLACK = new Color3(0.1, 0.1, 0.1); // charred

// Sizzle particle settings
const SIZZLE_PARTICLE_COUNT = 12;
// Smoke particle settings
const SMOKE_PARTICLE_COUNT = 10;

/** Compute sausage color based on temperature relative to a target zone. */
function sausageColor(temp: number, targetTemp: number, tolerance: number): Color3 {
	const lowThreshold = targetTemp - 20;
	const perfectLow = targetTemp - tolerance;
	const perfectHigh = targetTemp + tolerance;
	const highThreshold = targetTemp + 20;

	if (temp <= lowThreshold) {
		return COLOR_PINK;
	}
	if (temp <= perfectLow) {
		// Transition from pink to brown
		const t = (temp - lowThreshold) / (perfectLow - lowThreshold);
		return Color3.Lerp(COLOR_PINK, COLOR_BROWN, t);
	}
	if (temp <= perfectHigh) {
		return COLOR_BROWN;
	}
	if (temp <= highThreshold) {
		// Transition from brown to black
		const t = (temp - perfectHigh) / (highThreshold - perfectHigh);
		return Color3.Lerp(COLOR_BROWN, COLOR_BLACK, t);
	}
	return COLOR_BLACK;
}

export const StoveStation = ({
	temperature,
	heatLevel,
	holdProgress,
}: StoveStationProps) => {
	const scene = useScene();
	const timeRef = useRef(0);
	const temperatureRef = useRef(temperature);
	const heatLevelRef = useRef(heatLevel);
	const holdProgressRef = useRef(holdProgress);

	// Keep refs in sync so the render loop reads current values
	temperatureRef.current = temperature;
	heatLevelRef.current = heatLevel;
	holdProgressRef.current = holdProgress;

	useEffect(() => {
		if (!scene) return;

		const allMeshes: AbstractMesh[] = [];
		const allMaterials: StandardMaterial[] = [];
		let observer: Observer<BabylonScene> | null = null;

		const sx = STOVE_POS[0];
		const sy = STOVE_POS[1];
		const sz = STOVE_POS[2];

		// --- Stove Body ---
		const stoveWidth = 1.8;
		const stoveHeight = 0.9;
		const stoveDepth = 1.2;
		const stoveBody = MeshBuilder.CreateBox(
			'stoveBody',
			{ width: stoveWidth, height: stoveHeight, depth: stoveDepth },
			scene,
		);
		const stoveBodyMat = new StandardMaterial('stoveBodyMat', scene);
		stoveBodyMat.disableLighting = true;
		stoveBodyMat.emissiveColor = new Color3(0.15, 0.15, 0.17);
		stoveBody.material = stoveBodyMat;
		stoveBody.position = new Vector3(sx, FLOOR_Y + stoveHeight / 2, sz);
		allMeshes.push(stoveBody);
		allMaterials.push(stoveBodyMat);

		// --- Stove Top Surface (slightly lighter) ---
		const stoveTop = MeshBuilder.CreateBox(
			'stoveTop',
			{ width: stoveWidth + 0.05, height: 0.04, depth: stoveDepth + 0.05 },
			scene,
		);
		const stoveTopMat = new StandardMaterial('stoveTopMat', scene);
		stoveTopMat.disableLighting = true;
		stoveTopMat.emissiveColor = new Color3(0.2, 0.2, 0.22);
		stoveTop.material = stoveTopMat;
		stoveTop.position = new Vector3(sx, FLOOR_Y + stoveHeight + 0.02, sz);
		allMeshes.push(stoveTop);
		allMaterials.push(stoveTopMat);

		// --- Burner Ring (torus on top surface) ---
		const burnerRing = MeshBuilder.CreateTorus(
			'burnerRing',
			{ diameter: 0.7, thickness: 0.06, tessellation: 24 },
			scene,
		);
		const burnerMat = new StandardMaterial('burnerMat', scene);
		burnerMat.disableLighting = true;
		burnerMat.emissiveColor = new Color3(0.3, 0.05, 0.02); // dark red initially
		burnerRing.material = burnerMat;
		burnerRing.position = new Vector3(sx, FLOOR_Y + stoveHeight + 0.06, sz);
		allMeshes.push(burnerRing);
		allMaterials.push(burnerMat);

		// --- Frying Pan ---
		const panRadius = 0.4;
		const panHeight = 0.06;
		const pan = MeshBuilder.CreateCylinder(
			'fryingPan',
			{ diameter: panRadius * 2, height: panHeight, tessellation: 24 },
			scene,
		);
		const panMat = new StandardMaterial('panMat', scene);
		panMat.disableLighting = true;
		panMat.emissiveColor = new Color3(0.2, 0.2, 0.22);
		pan.material = panMat;
		const panY = FLOOR_Y + stoveHeight + 0.06 + panHeight / 2;
		pan.position = new Vector3(sx, panY, sz);
		allMeshes.push(pan);
		allMaterials.push(panMat);

		// --- Pan Handle ---
		const panHandle = MeshBuilder.CreateBox(
			'panHandle',
			{ width: 0.06, height: 0.04, depth: 0.5 },
			scene,
		);
		const panHandleMat = new StandardMaterial('panHandleMat', scene);
		panHandleMat.disableLighting = true;
		panHandleMat.emissiveColor = new Color3(0.12, 0.12, 0.14);
		panHandle.material = panHandleMat;
		panHandle.position = new Vector3(sx, panY, sz + panRadius + 0.25);
		allMeshes.push(panHandle);
		allMaterials.push(panHandleMat);

		// --- Sausage in Pan ---
		const sausage = MeshBuilder.CreateCylinder(
			'sausageInPan',
			{ diameter: 0.14, height: 0.5, tessellation: 12, cap: 2 },
			scene,
		);
		const sausageMat = new StandardMaterial('sausageMat', scene);
		sausageMat.disableLighting = true;
		sausageMat.emissiveColor = COLOR_PINK.clone();
		sausage.material = sausageMat;
		sausage.rotation.z = Math.PI / 2; // Lay horizontal
		sausage.position = new Vector3(sx, panY + panHeight / 2 + 0.07, sz);
		allMeshes.push(sausage);
		allMaterials.push(sausageMat);

		// Sausage end caps (spheres for rounded ends)
		const sausageCapL = MeshBuilder.CreateSphere(
			'sausageCapL',
			{ diameter: 0.14, segments: 8 },
			scene,
		);
		sausageCapL.material = sausageMat;
		sausageCapL.position = new Vector3(sx - 0.25, panY + panHeight / 2 + 0.07, sz);
		allMeshes.push(sausageCapL);

		const sausageCapR = MeshBuilder.CreateSphere(
			'sausageCapR',
			{ diameter: 0.14, segments: 8 },
			scene,
		);
		sausageCapR.material = sausageMat;
		sausageCapR.position = new Vector3(sx + 0.25, panY + panHeight / 2 + 0.07, sz);
		allMeshes.push(sausageCapR);

		// --- Thermometer (vertical cylinder next to stove) ---
		const thermoHeight = 0.8;
		const thermoX = sx + stoveWidth / 2 + 0.3;
		const thermoBaseY = FLOOR_Y + stoveHeight * 0.2;

		// Thermometer tube (outer)
		const thermoTube = MeshBuilder.CreateCylinder(
			'thermoTube',
			{ diameter: 0.08, height: thermoHeight, tessellation: 12 },
			scene,
		);
		const thermoTubeMat = new StandardMaterial('thermoTubeMat', scene);
		thermoTubeMat.disableLighting = true;
		thermoTubeMat.emissiveColor = new Color3(0.3, 0.3, 0.32);
		thermoTube.material = thermoTubeMat;
		thermoTube.position = new Vector3(thermoX, thermoBaseY + thermoHeight / 2, sz);
		allMeshes.push(thermoTube);
		allMaterials.push(thermoTubeMat);

		// Thermometer fill (inner, scales with temperature)
		const thermoFill = MeshBuilder.CreateCylinder(
			'thermoFill',
			{ diameter: 0.05, height: thermoHeight * 0.9, tessellation: 12 },
			scene,
		);
		const thermoFillMat = new StandardMaterial('thermoFillMat', scene);
		thermoFillMat.disableLighting = true;
		thermoFillMat.emissiveColor = new Color3(0.8, 0.1, 0.05);
		thermoFill.material = thermoFillMat;
		thermoFill.position = new Vector3(thermoX, thermoBaseY + thermoHeight * 0.45, sz);
		allMeshes.push(thermoFill);
		allMaterials.push(thermoFillMat);

		// Thermometer bulb (bottom sphere)
		const thermoBulb = MeshBuilder.CreateSphere(
			'thermoBulb',
			{ diameter: 0.1, segments: 8 },
			scene,
		);
		thermoBulb.material = thermoFillMat;
		thermoBulb.position = new Vector3(thermoX, thermoBaseY, sz);
		allMeshes.push(thermoBulb);

		// --- Sizzle Particles (small spheres that pop up from pan) ---
		const sizzleParticles: AbstractMesh[] = [];
		const sizzleMat = new StandardMaterial('sizzleMat', scene);
		sizzleMat.disableLighting = true;
		sizzleMat.emissiveColor = new Color3(1.0, 0.85, 0.3);
		allMaterials.push(sizzleMat);

		const sizzleVelocities: { x: number; y: number; z: number; life: number; maxLife: number }[] = [];

		for (let i = 0; i < SIZZLE_PARTICLE_COUNT; i++) {
			const particle = MeshBuilder.CreateSphere(
				`sizzle_${i}`,
				{ diameter: 0.02 + Math.random() * 0.02, segments: 4 },
				scene,
			);
			particle.material = sizzleMat;
			particle.isVisible = false;
			particle.position = new Vector3(sx, panY, sz);
			sizzleParticles.push(particle);
			allMeshes.push(particle);
			sizzleVelocities.push({
				x: (Math.random() - 0.5) * 0.4,
				y: Math.random() * 1.5 + 0.5,
				z: (Math.random() - 0.5) * 0.4,
				life: 0,
				maxLife: 0.3 + Math.random() * 0.4,
			});
		}

		// --- Smoke Particles (white/gray spheres rising when overheating) ---
		const smokeParticles: AbstractMesh[] = [];
		const smokeMat = new StandardMaterial('smokeMat', scene);
		smokeMat.disableLighting = true;
		smokeMat.emissiveColor = new Color3(0.6, 0.6, 0.6);
		smokeMat.alpha = 0.5;
		allMaterials.push(smokeMat);

		const smokeVelocities: { x: number; y: number; z: number; life: number; maxLife: number }[] = [];

		for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
			const particle = MeshBuilder.CreateSphere(
				`smoke_${i}`,
				{ diameter: 0.08 + Math.random() * 0.06, segments: 4 },
				scene,
			);
			particle.material = smokeMat;
			particle.isVisible = false;
			particle.position = new Vector3(sx, panY + 0.3, sz);
			smokeParticles.push(particle);
			allMeshes.push(particle);
			smokeVelocities.push({
				x: (Math.random() - 0.5) * 0.15,
				y: Math.random() * 0.8 + 0.3,
				z: (Math.random() - 0.5) * 0.15,
				life: 0,
				maxLife: 1.0 + Math.random() * 0.8,
			});
		}

		// Sizzle spawn timer
		let sizzleSpawnTimer = 0;
		let smokeSpawnTimer = 0;

		// Use a rough notional target for color computation (the real target comes from variant)
		// We'll use 160 as default; the actual color mapping uses relative thresholds
		const NOTIONAL_TARGET = 160;
		const NOTIONAL_TOLERANCE = 10;

		// --- Render Loop ---
		observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			timeRef.current += dt;
			const temp = temperatureRef.current;
			const heat = heatLevelRef.current;
			const hold = holdProgressRef.current;

			// --- Burner color: dark red when off, bright orange when full heat ---
			const burnerOff = new Color3(0.3, 0.05, 0.02);
			const burnerOn = new Color3(1.0, 0.5, 0.05);
			burnerMat.emissiveColor = Color3.Lerp(burnerOff, burnerOn, heat);

			// Burner flicker effect when heat is on
			if (heat > 0.1) {
				const flicker = Math.sin(timeRef.current * 20) * 0.05 * heat;
				burnerMat.emissiveColor.r = Math.min(1, burnerMat.emissiveColor.r + flicker);
			}

			// --- Sausage color based on temperature ---
			sausageMat.emissiveColor = sausageColor(temp, NOTIONAL_TARGET, NOTIONAL_TOLERANCE);

			// Sausage sizzle wobble when hot
			if (heat > 0.3) {
				const wobble = Math.sin(timeRef.current * 25) * 0.003 * heat;
				sausage.position.y = panY + panHeight / 2 + 0.07 + wobble;
				sausageCapL.position.y = sausage.position.y;
				sausageCapR.position.y = sausage.position.y;
			}

			// --- Thermometer fill based on temperature ---
			// Map 70-250 to 0-1 fill range
			const tempNorm = Math.max(0, Math.min(1, (temp - 70) / 180));
			const fillScale = Math.max(0.02, tempNorm);
			thermoFill.scaling.y = fillScale;
			thermoFill.position.y = thermoBaseY + (thermoHeight * 0.45) * fillScale;

			// Thermometer color: blue (cold) -> green (target) -> red (hot)
			if (temp < NOTIONAL_TARGET - NOTIONAL_TOLERANCE) {
				const coldT = Math.min(1, (temp - 70) / (NOTIONAL_TARGET - NOTIONAL_TOLERANCE - 70));
				thermoFillMat.emissiveColor = Color3.Lerp(
					new Color3(0.1, 0.3, 0.8), // blue
					new Color3(0.1, 0.7, 0.2), // green
					coldT,
				);
			} else if (temp <= NOTIONAL_TARGET + NOTIONAL_TOLERANCE) {
				thermoFillMat.emissiveColor = new Color3(0.1, 0.8, 0.2); // bright green
			} else {
				const hotT = Math.min(1, (temp - NOTIONAL_TARGET - NOTIONAL_TOLERANCE) / 40);
				thermoFillMat.emissiveColor = Color3.Lerp(
					new Color3(0.1, 0.7, 0.2), // green
					new Color3(0.9, 0.1, 0.05), // red
					hotT,
				);
			}

			// --- Sizzle particles when heat > 0.3 ---
			if (heat > 0.3) {
				sizzleSpawnTimer += dt;
				const spawnInterval = 0.08 / heat; // Spawn faster with more heat

				if (sizzleSpawnTimer >= spawnInterval) {
					sizzleSpawnTimer = 0;
					// Find an inactive particle
					for (let i = 0; i < SIZZLE_PARTICLE_COUNT; i++) {
						if (!sizzleParticles[i].isVisible) {
							sizzleParticles[i].isVisible = true;
							sizzleParticles[i].position = new Vector3(
								sx + (Math.random() - 0.5) * panRadius * 1.4,
								panY + panHeight / 2,
								sz + (Math.random() - 0.5) * panRadius * 1.4,
							);
							sizzleVelocities[i].life = 0;
							sizzleVelocities[i].maxLife = 0.2 + Math.random() * 0.3;
							sizzleVelocities[i].x = (Math.random() - 0.5) * 0.4;
							sizzleVelocities[i].y = Math.random() * 1.5 + 0.5;
							sizzleVelocities[i].z = (Math.random() - 0.5) * 0.4;
							break;
						}
					}
				}
			}

			// Update sizzle particles
			for (let i = 0; i < SIZZLE_PARTICLE_COUNT; i++) {
				if (sizzleParticles[i].isVisible) {
					const v = sizzleVelocities[i];
					v.life += dt;
					sizzleParticles[i].position.x += v.x * dt;
					sizzleParticles[i].position.y += v.y * dt;
					sizzleParticles[i].position.z += v.z * dt;
					v.y -= 3.0 * dt; // gravity

					const fadeScale = Math.max(0, 1.0 - v.life / v.maxLife);
					sizzleParticles[i].scaling = new Vector3(fadeScale, fadeScale, fadeScale);

					if (v.life >= v.maxLife) {
						sizzleParticles[i].isVisible = false;
					}
				}
			}

			// --- Smoke particles when temperature is above target zone ---
			const isOverheating = temp > NOTIONAL_TARGET + NOTIONAL_TOLERANCE;
			if (isOverheating) {
				smokeSpawnTimer += dt;
				const smokeRate = 0.15 - Math.min(0.1, (temp - NOTIONAL_TARGET - NOTIONAL_TOLERANCE) / 200);

				if (smokeSpawnTimer >= smokeRate) {
					smokeSpawnTimer = 0;
					for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
						if (!smokeParticles[i].isVisible) {
							smokeParticles[i].isVisible = true;
							smokeParticles[i].position = new Vector3(
								sx + (Math.random() - 0.5) * 0.2,
								panY + 0.15,
								sz + (Math.random() - 0.5) * 0.2,
							);
							smokeVelocities[i].life = 0;
							smokeVelocities[i].maxLife = 1.0 + Math.random() * 0.6;
							smokeVelocities[i].x = (Math.random() - 0.5) * 0.12;
							smokeVelocities[i].y = Math.random() * 0.5 + 0.3;
							smokeVelocities[i].z = (Math.random() - 0.5) * 0.12;
							break;
						}
					}
				}
			}

			// Update smoke particles
			for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
				if (smokeParticles[i].isVisible) {
					const v = smokeVelocities[i];
					v.life += dt;
					smokeParticles[i].position.x += v.x * dt;
					smokeParticles[i].position.y += v.y * dt;
					smokeParticles[i].position.z += v.z * dt;

					// Smoke expands and fades
					const lifeNorm = v.life / v.maxLife;
					const expandScale = 1.0 + lifeNorm * 2.0;
					const fadeAlpha = Math.max(0, 1.0 - lifeNorm);
					smokeParticles[i].scaling = new Vector3(expandScale, expandScale, expandScale);
					(smokeParticles[i].material as StandardMaterial).alpha = fadeAlpha * 0.4;

					if (v.life >= v.maxLife) {
						smokeParticles[i].isVisible = false;
					}
				}
			}

			// --- Heat haze shimmer near pan ---
			if (heat > 0.5) {
				const hazeWobble = Math.sin(timeRef.current * 12) * 0.002 * heat;
				pan.position.x = sx + hazeWobble;
			} else {
				pan.position.x = sx;
			}
		});

		// --- Cleanup ---
		return () => {
			if (observer) scene.onBeforeRenderObservable.remove(observer);

			for (const mesh of allMeshes) {
				mesh.dispose();
			}
			for (const mat of allMaterials) {
				mat.dispose();
			}
		};
	}, [scene]);

	return null;
};
