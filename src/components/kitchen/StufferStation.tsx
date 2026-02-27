import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import {
	Color3,
	MeshBuilder,
	StandardMaterial,
	Vector3,
} from '@babylonjs/core';
import type { AbstractMesh, Observer, Scene as BabylonScene } from '@babylonjs/core';

interface StufferStationProps {
	fillLevel: number; // 0-100
	pressureLevel: number; // 0-100
	isPressing: boolean; // Whether player is pressing
	hasBurst: boolean; // Trigger burst animation
}

// Stuffer sits on a counter near the stuffer waypoint
const STUFFER_POS: [number, number, number] = [5, 0, -4];
const COUNTER_HEIGHT = 0.9;
const STUFFER_BASE_Y = COUNTER_HEIGHT;

// Burst particle settings
const BURST_PARTICLE_COUNT = 16;

/** Linearly interpolate between two Color3 values. */
function lerpColor(a: Color3, b: Color3, t: number): Color3 {
	return new Color3(
		a.r + (b.r - a.r) * t,
		a.g + (b.g - a.g) * t,
		a.b + (b.b - a.b) * t,
	);
}

/** Map pressureLevel (0-100) to a green->yellow->red color. */
function pressureToColor(pressure: number): Color3 {
	const green = new Color3(0.2, 0.7, 0.15);
	const yellow = new Color3(0.85, 0.75, 0.1);
	const red = new Color3(0.9, 0.1, 0.05);

	if (pressure <= 50) {
		return lerpColor(green, yellow, pressure / 50);
	}
	return lerpColor(yellow, red, (pressure - 50) / 50);
}

export const StufferStation = ({
	fillLevel,
	pressureLevel,
	isPressing,
	hasBurst,
}: StufferStationProps) => {
	const scene = useScene();
	const timeRef = useRef(0);
	const fillRef = useRef(fillLevel);
	const pressureRef = useRef(pressureLevel);
	const isPressingRef = useRef(isPressing);
	const hasBurstRef = useRef(hasBurst);

	// Keep refs in sync so the render loop reads current values
	fillRef.current = fillLevel;
	pressureRef.current = pressureLevel;
	isPressingRef.current = isPressing;
	hasBurstRef.current = hasBurst;

	useEffect(() => {
		if (!scene) return;

		const allMeshes: AbstractMesh[] = [];
		const allMaterials: StandardMaterial[] = [];
		let observer: Observer<BabylonScene> | null = null;

		const sx = STUFFER_POS[0];
		const sz = STUFFER_POS[2];

		// --- Counter / Work Surface ---

		const counter = MeshBuilder.CreateBox(
			'stufferCounter',
			{ width: 2.5, height: COUNTER_HEIGHT, depth: 1.4 },
			scene,
		);
		const counterMat = new StandardMaterial('stufferCounterMat', scene);
		counterMat.disableLighting = true;
		counterMat.emissiveColor = new Color3(0.22, 0.16, 0.1);
		counter.material = counterMat;
		counter.position = new Vector3(sx, COUNTER_HEIGHT / 2, sz);
		allMeshes.push(counter);
		allMaterials.push(counterMat);

		// --- Stuffer Body (vertical cylinder - the main tube) ---

		const bodyHeight = 1.0;
		const bodyDiameter = 0.5;
		const body = MeshBuilder.CreateCylinder(
			'stufferBody',
			{ height: bodyHeight, diameter: bodyDiameter, tessellation: 16 },
			scene,
		);
		const bodyMat = new StandardMaterial('stufferBodyMat', scene);
		bodyMat.disableLighting = true;
		bodyMat.emissiveColor = new Color3(0.5, 0.5, 0.55);
		body.material = bodyMat;
		body.position = new Vector3(sx, STUFFER_BASE_Y + bodyHeight / 2, sz);
		allMeshes.push(body);
		allMaterials.push(bodyMat);

		// --- Plunger (cylinder that moves down as fillLevel increases) ---

		const plungerHeight = 0.15;
		const plunger = MeshBuilder.CreateCylinder(
			'stufferPlunger',
			{ height: plungerHeight, diameter: bodyDiameter * 0.9, tessellation: 16 },
			scene,
		);
		const plungerMat = new StandardMaterial('stufferPlungerMat', scene);
		plungerMat.disableLighting = true;
		plungerMat.emissiveColor = new Color3(0.6, 0.6, 0.65);
		plunger.material = plungerMat;
		// Starts at the top of the body, moves down with fill
		plunger.position = new Vector3(
			sx,
			STUFFER_BASE_Y + bodyHeight - plungerHeight / 2,
			sz,
		);
		allMeshes.push(plunger);
		allMaterials.push(plungerMat);

		// --- Plunger Handle (thin cylinder on top of plunger) ---

		const handleHeight = 0.5;
		const handle = MeshBuilder.CreateCylinder(
			'stufferHandle',
			{ height: handleHeight, diameter: 0.06, tessellation: 8 },
			scene,
		);
		const handleMat = new StandardMaterial('stufferHandleMat', scene);
		handleMat.disableLighting = true;
		handleMat.emissiveColor = new Color3(0.55, 0.55, 0.6);
		handle.material = handleMat;
		handle.position = new Vector3(
			sx,
			STUFFER_BASE_Y + bodyHeight + handleHeight / 2,
			sz,
		);
		allMeshes.push(handle);
		allMaterials.push(handleMat);

		// --- Handle Knob (sphere at top of handle) ---

		const handleKnob = MeshBuilder.CreateSphere(
			'stufferHandleKnob',
			{ diameter: 0.14, segments: 8 },
			scene,
		);
		const handleKnobMat = new StandardMaterial('stufferHandleKnobMat', scene);
		handleKnobMat.disableLighting = true;
		handleKnobMat.emissiveColor = new Color3(0.7, 0.2, 0.2);
		handleKnob.material = handleKnobMat;
		handleKnob.position = new Vector3(
			sx,
			STUFFER_BASE_Y + bodyHeight + handleHeight,
			sz,
		);
		allMeshes.push(handleKnob);
		allMaterials.push(handleKnobMat);

		// --- Spout (small horizontal cylinder connecting body to casing) ---

		const spout = MeshBuilder.CreateCylinder(
			'stufferSpout',
			{ height: 0.3, diameter: 0.12, tessellation: 8 },
			scene,
		);
		const spoutMat = new StandardMaterial('stufferSpoutMat', scene);
		spoutMat.disableLighting = true;
		spoutMat.emissiveColor = new Color3(0.45, 0.45, 0.5);
		spout.material = spoutMat;
		spout.rotation.z = Math.PI / 2; // Lay horizontal
		spout.position = new Vector3(
			sx + bodyDiameter / 2 + 0.15,
			STUFFER_BASE_Y + bodyHeight * 0.25,
			sz,
		);
		allMeshes.push(spout);
		allMaterials.push(spoutMat);

		// --- Casing (horizontal cylinder emerging from spout, inflates with fill) ---

		const casingBaseLength = 1.2;
		const casingBaseDiameter = 0.15;
		const casing = MeshBuilder.CreateCylinder(
			'stufferCasing',
			{
				height: casingBaseLength,
				diameter: casingBaseDiameter,
				tessellation: 16,
			},
			scene,
		);
		const casingMat = new StandardMaterial('stufferCasingMat', scene);
		casingMat.disableLighting = true;
		casingMat.emissiveColor = pressureToColor(0);
		casingMat.alpha = 0.85;
		casing.material = casingMat;
		casing.rotation.z = Math.PI / 2; // Lay horizontal
		casing.position = new Vector3(
			sx + bodyDiameter / 2 + 0.3 + casingBaseLength / 2,
			STUFFER_BASE_Y + bodyHeight * 0.25,
			sz,
		);
		allMeshes.push(casing);
		allMaterials.push(casingMat);

		// --- Casing End Cap (sphere at end of casing) ---

		const casingEnd = MeshBuilder.CreateSphere(
			'stufferCasingEnd',
			{ diameter: casingBaseDiameter, segments: 8 },
			scene,
		);
		const casingEndMat = new StandardMaterial('stufferCasingEndMat', scene);
		casingEndMat.disableLighting = true;
		casingEndMat.emissiveColor = pressureToColor(0);
		casingEndMat.alpha = 0.85;
		casingEnd.material = casingEndMat;
		casingEnd.position = new Vector3(
			sx + bodyDiameter / 2 + 0.3 + casingBaseLength,
			STUFFER_BASE_Y + bodyHeight * 0.25,
			sz,
		);
		allMeshes.push(casingEnd);
		allMaterials.push(casingEndMat);

		// --- Meat Fill Inside Body (shows how much meat is left in the tube) ---

		const meatFill = MeshBuilder.CreateCylinder(
			'stufferMeatFill',
			{ height: bodyHeight * 0.9, diameter: bodyDiameter * 0.85, tessellation: 16 },
			scene,
		);
		const meatFillMat = new StandardMaterial('stufferMeatFillMat', scene);
		meatFillMat.disableLighting = true;
		meatFillMat.emissiveColor = new Color3(0.55, 0.12, 0.08);
		meatFill.material = meatFillMat;
		meatFill.position = new Vector3(sx, STUFFER_BASE_Y + bodyHeight * 0.45, sz);
		allMeshes.push(meatFill);
		allMaterials.push(meatFillMat);

		// --- Burst Particles ---

		const burstParticles: AbstractMesh[] = [];
		const burstMat = new StandardMaterial('burstParticleMat', scene);
		burstMat.disableLighting = true;
		burstMat.emissiveColor = new Color3(0.8, 0.08, 0.03);
		allMaterials.push(burstMat);

		for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
			const particle = MeshBuilder.CreateSphere(
				`burstParticle_${i}`,
				{ diameter: 0.06 + Math.random() * 0.08, segments: 4 },
				scene,
			);
			particle.material = burstMat;
			particle.isVisible = false;
			particle.position = new Vector3(
				sx + bodyDiameter / 2 + 0.3 + casingBaseLength / 2,
				STUFFER_BASE_Y + bodyHeight * 0.25,
				sz,
			);
			burstParticles.push(particle);
			allMeshes.push(particle);
		}

		// Burst animation state
		let burstActive = false;
		let burstTime = 0;
		const burstVelocities: Vector3[] = burstParticles.map(() => {
			return new Vector3(
				(Math.random() - 0.5) * 5,
				Math.random() * 3 + 1.5,
				(Math.random() - 0.5) * 5,
			);
		});

		// --- Render Loop ---

		observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			timeRef.current += dt;
			const fill = fillRef.current;
			const pressure = pressureRef.current;
			const pressing = isPressingRef.current;
			const burst = hasBurstRef.current;

			// --- Plunger movement: moves down as fill increases ---
			const plungerTravel = bodyHeight * 0.8;
			const plungerTopY = STUFFER_BASE_Y + bodyHeight - plungerHeight / 2;
			const plungerTargetY = plungerTopY - (fill / 100) * plungerTravel;
			plunger.position.y = plungerTargetY;
			handle.position.y = plungerTargetY + plungerHeight / 2 + handleHeight / 2;
			handleKnob.position.y = plungerTargetY + plungerHeight / 2 + handleHeight;

			// Plunger jiggle when pressing
			if (pressing) {
				const jiggle = Math.sin(timeRef.current * 30) * 0.008;
				plunger.position.x = sx + jiggle;
				handle.position.x = sx + jiggle;
				handleKnob.position.x = sx + jiggle;
			} else {
				plunger.position.x = sx;
				handle.position.x = sx;
				handleKnob.position.x = sx;
			}

			// --- Meat fill decreases as fill goes up (meat leaves the tube) ---
			const meatScale = Math.max(0.05, 1.0 - fill / 100);
			meatFill.scaling.y = meatScale;
			meatFill.position.y = STUFFER_BASE_Y + (bodyHeight * 0.45) * meatScale;
			meatFill.isVisible = meatScale > 0.06;

			// --- Casing inflation based on fill level ---
			const inflationFactor = 1 + (fill / 100) * 2.5; // Up to 3.5x diameter
			casing.scaling.y = 1; // Length stays constant (horizontal)
			casing.scaling.x = inflationFactor;
			casing.scaling.z = inflationFactor;

			// Casing end cap matches inflation
			casingEnd.scaling = new Vector3(inflationFactor, inflationFactor, inflationFactor);

			// --- Casing color based on pressure level ---
			const casingColor = pressureToColor(pressure);
			casingMat.emissiveColor = casingColor;
			casingEndMat.emissiveColor = casingColor;

			// Casing pulsing when pressure is high
			if (pressure > 70) {
				const pulseIntensity = ((pressure - 70) / 30) * 0.08;
				const pulse = 1 + Math.sin(timeRef.current * 15) * pulseIntensity;
				casing.scaling.x = inflationFactor * pulse;
				casing.scaling.z = inflationFactor * pulse;
				casingEnd.scaling = new Vector3(
					inflationFactor * pulse,
					inflationFactor * pulse,
					inflationFactor * pulse,
				);
			}

			// --- Burst animation ---
			if (burst && !burstActive) {
				burstActive = true;
				burstTime = 0;

				// Hide the casing temporarily during burst
				casing.scaling.x = 0.01;
				casing.scaling.z = 0.01;
				casingEnd.isVisible = false;

				// Launch particles from casing position
				const burstOriginX = sx + bodyDiameter / 2 + 0.3 + casingBaseLength / 2;
				const burstOriginY = STUFFER_BASE_Y + bodyHeight * 0.25;
				for (let i = 0; i < burstParticles.length; i++) {
					burstParticles[i].isVisible = true;
					burstParticles[i].position = new Vector3(
						burstOriginX + (Math.random() - 0.5) * 0.3,
						burstOriginY + (Math.random() - 0.5) * 0.2,
						sz + (Math.random() - 0.5) * 0.3,
					);
					burstParticles[i].scaling = new Vector3(1, 1, 1);
					// Randomize velocities for each burst
					burstVelocities[i] = new Vector3(
						(Math.random() - 0.5) * 6,
						Math.random() * 4 + 1,
						(Math.random() - 0.5) * 6,
					);
				}
			}

			if (burstActive) {
				burstTime += dt;
				for (let i = 0; i < burstParticles.length; i++) {
					const p = burstParticles[i];
					const v = burstVelocities[i];
					p.position.x += v.x * dt;
					p.position.y += v.y * dt;
					p.position.z += v.z * dt;
					// Gravity
					v.y -= 9.8 * dt;
					// Fade out via scaling
					const fadeScale = Math.max(0, 1.0 - burstTime / 1.0);
					p.scaling = new Vector3(fadeScale, fadeScale, fadeScale);
				}

				if (burstTime > 1.0) {
					burstActive = false;
					for (const p of burstParticles) {
						p.isVisible = false;
					}
					// Restore casing visibility
					casingEnd.isVisible = true;
				}
			} else if (!burst) {
				// Ensure particles are hidden when not bursting
				for (const p of burstParticles) {
					p.isVisible = false;
				}
			}

			// --- Subtle body vibration when pressing ---
			if (pressing && fill > 0 && fill < 100) {
				const vibration = Math.sin(timeRef.current * 35) * 0.004;
				body.position.x = sx + vibration;
			} else {
				body.position.x = sx;
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
