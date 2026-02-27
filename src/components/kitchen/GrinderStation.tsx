import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import {
	Color3,
	MeshBuilder,
	StandardMaterial,
	Vector3,
} from '@babylonjs/core';
import type { AbstractMesh, Observer, Scene as BabylonScene } from '@babylonjs/core';

interface GrinderStationProps {
	grindProgress: number; // 0-100
	crankAngle: number; // Current rotation angle in radians
	isSplattering: boolean; // Trigger splatter visual
}

// Grinder sits on a counter near the back wall, aligned with the grinder waypoint
const GRINDER_POS: [number, number, number] = [0, 0, -5];
const COUNTER_HEIGHT = 0.9;
const GRINDER_BASE_Y = COUNTER_HEIGHT;

// Meat chunk settings
const MEAT_CHUNK_COUNT = 6;
const OUTPUT_PARTICLE_MAX = 12;
const SPLATTER_PARTICLE_COUNT = 10;

export const GrinderStation = ({
	grindProgress,
	crankAngle,
	isSplattering,
}: GrinderStationProps) => {
	const scene = useScene();
	const timeRef = useRef(0);
	const progressRef = useRef(grindProgress);
	const crankAngleRef = useRef(crankAngle);
	const iseSplatteringRef = useRef(isSplattering);

	// Keep refs in sync so the render loop reads current values
	progressRef.current = grindProgress;
	crankAngleRef.current = crankAngle;
	iseSplatteringRef.current = isSplattering;

	useEffect(() => {
		if (!scene) return;

		const allMeshes: AbstractMesh[] = [];
		const allMaterials: StandardMaterial[] = [];
		let observer: Observer<BabylonScene> | null = null;

		const gx = GRINDER_POS[0];
		const gz = GRINDER_POS[2];

		// --- Counter / Table ---

		const counter = MeshBuilder.CreateBox(
			'grinderCounter',
			{ width: 2.5, height: COUNTER_HEIGHT, depth: 1.2 },
			scene,
		);
		const counterMat = new StandardMaterial('grinderCounterMat', scene);
		counterMat.disableLighting = true;
		counterMat.emissiveColor = new Color3(0.25, 0.18, 0.12);
		counter.material = counterMat;
		counter.position = new Vector3(gx, COUNTER_HEIGHT / 2, gz);
		allMeshes.push(counter);
		allMaterials.push(counterMat);

		// --- Grinder Body (main cylinder) ---

		const bodyHeight = 0.7;
		const body = MeshBuilder.CreateCylinder(
			'grinderBody',
			{ height: bodyHeight, diameter: 0.6, tessellation: 16 },
			scene,
		);
		const bodyMat = new StandardMaterial('grinderBodyMat', scene);
		bodyMat.disableLighting = true;
		bodyMat.emissiveColor = new Color3(0.5, 0.5, 0.55);
		body.material = bodyMat;
		body.position = new Vector3(gx, GRINDER_BASE_Y + bodyHeight / 2, gz);
		allMeshes.push(body);
		allMaterials.push(bodyMat);

		// --- Hopper (inverted cone on top) ---

		const hopperHeight = 0.5;
		const hopper = MeshBuilder.CreateCylinder(
			'grinderHopper',
			{
				height: hopperHeight,
				diameterTop: 0.7,
				diameterBottom: 0.3,
				tessellation: 12,
			},
			scene,
		);
		const hopperMat = new StandardMaterial('grinderHopperMat', scene);
		hopperMat.disableLighting = true;
		hopperMat.emissiveColor = new Color3(0.55, 0.55, 0.6);
		hopperMat.alpha = 0.85;
		hopper.material = hopperMat;
		hopper.position = new Vector3(
			gx,
			GRINDER_BASE_Y + bodyHeight + hopperHeight / 2,
			gz,
		);
		allMeshes.push(hopper);
		allMaterials.push(hopperMat);

		// --- Spout (horizontal cylinder for meat output) ---

		const spout = MeshBuilder.CreateCylinder(
			'grinderSpout',
			{ height: 0.4, diameter: 0.2, tessellation: 8 },
			scene,
		);
		const spoutMat = new StandardMaterial('grinderSpoutMat', scene);
		spoutMat.disableLighting = true;
		spoutMat.emissiveColor = new Color3(0.45, 0.45, 0.5);
		spout.material = spoutMat;
		// Lay it horizontal and position at front of grinder body
		spout.rotation.x = Math.PI / 2;
		spout.position = new Vector3(
			gx,
			GRINDER_BASE_Y + bodyHeight * 0.35,
			gz + 0.45,
		);
		allMeshes.push(spout);
		allMaterials.push(spoutMat);

		// --- Crank Arm (cylinder) ---

		const crankArmLength = 0.5;
		const crankArm = MeshBuilder.CreateCylinder(
			'grinderCrankArm',
			{ height: crankArmLength, diameter: 0.06, tessellation: 8 },
			scene,
		);
		const crankMat = new StandardMaterial('grinderCrankMat', scene);
		crankMat.disableLighting = true;
		crankMat.emissiveColor = new Color3(0.6, 0.6, 0.65);
		crankArm.material = crankMat;
		// Position to the right side of the grinder body, will be animated
		crankArm.rotation.z = Math.PI / 2;
		crankArm.position = new Vector3(
			gx + 0.55,
			GRINDER_BASE_Y + bodyHeight * 0.5,
			gz,
		);
		allMeshes.push(crankArm);
		allMaterials.push(crankMat);

		// --- Crank Knob (sphere at end of arm) ---

		const knob = MeshBuilder.CreateSphere(
			'grinderCrankKnob',
			{ diameter: 0.12, segments: 8 },
			scene,
		);
		const knobMat = new StandardMaterial('grinderKnobMat', scene);
		knobMat.disableLighting = true;
		knobMat.emissiveColor = new Color3(0.7, 0.2, 0.2);
		knob.material = knobMat;
		knob.position = new Vector3(
			gx + 0.55 + crankArmLength / 2,
			GRINDER_BASE_Y + bodyHeight * 0.5,
			gz,
		);
		allMeshes.push(knob);
		allMaterials.push(knobMat);

		// --- Meat Chunks in Hopper ---

		const meatChunks: AbstractMesh[] = [];
		const meatMat = new StandardMaterial('meatChunkMat', scene);
		meatMat.disableLighting = true;
		meatMat.emissiveColor = new Color3(0.6, 0.15, 0.1);
		allMaterials.push(meatMat);

		for (let i = 0; i < MEAT_CHUNK_COUNT; i++) {
			const chunk = MeshBuilder.CreateSphere(
				`meatChunk_${i}`,
				{ diameter: 0.08 + Math.random() * 0.06, segments: 6 },
				scene,
			);
			chunk.material = meatMat;
			// Distribute randomly inside the hopper area
			const angle = (i / MEAT_CHUNK_COUNT) * Math.PI * 2;
			const radius = 0.12 + Math.random() * 0.08;
			chunk.position = new Vector3(
				gx + Math.cos(angle) * radius,
				GRINDER_BASE_Y + bodyHeight + hopperHeight * 0.3 + Math.random() * 0.2,
				gz + Math.sin(angle) * radius,
			);
			meatChunks.push(chunk);
			allMeshes.push(chunk);
		}

		// --- Ground Meat Output Particles ---

		const outputParticles: AbstractMesh[] = [];
		const outputMat = new StandardMaterial('groundMeatMat', scene);
		outputMat.disableLighting = true;
		outputMat.emissiveColor = new Color3(0.5, 0.12, 0.08);
		allMaterials.push(outputMat);

		for (let i = 0; i < OUTPUT_PARTICLE_MAX; i++) {
			const particle = MeshBuilder.CreateSphere(
				`groundMeat_${i}`,
				{ diameter: 0.06, segments: 4 },
				scene,
			);
			particle.material = outputMat;
			// Start hidden below the spout
			particle.position = new Vector3(
				gx + (Math.random() - 0.5) * 0.15,
				GRINDER_BASE_Y + bodyHeight * 0.2 - i * 0.04,
				gz + 0.55 + Math.random() * 0.1,
			);
			particle.isVisible = false;
			outputParticles.push(particle);
			allMeshes.push(particle);
		}

		// --- Splatter Particles ---

		const splatterParticles: AbstractMesh[] = [];
		const splatterMat = new StandardMaterial('splatterMat', scene);
		splatterMat.disableLighting = true;
		splatterMat.emissiveColor = new Color3(0.8, 0.05, 0.02);
		allMaterials.push(splatterMat);

		for (let i = 0; i < SPLATTER_PARTICLE_COUNT; i++) {
			const splat = MeshBuilder.CreateSphere(
				`splatter_${i}`,
				{ diameter: 0.05 + Math.random() * 0.08, segments: 4 },
				scene,
			);
			splat.material = splatterMat;
			splat.isVisible = false;
			splat.position = new Vector3(gx, GRINDER_BASE_Y + bodyHeight * 0.5, gz);
			splatterParticles.push(splat);
			allMeshes.push(splat);
		}

		// Splatter animation state
		let splatterActive = false;
		let splatterTime = 0;
		const splatterVelocities: Vector3[] = splatterParticles.map(() => {
			return new Vector3(
				(Math.random() - 0.5) * 4,
				Math.random() * 3 + 1,
				(Math.random() - 0.5) * 4,
			);
		});

		// --- Render Loop ---

		observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			timeRef.current += dt;
			const progress = progressRef.current;
			const angle = crankAngleRef.current;

			// Animate crank rotation
			const crankPivotX = gx + 0.3;
			const crankPivotY = GRINDER_BASE_Y + bodyHeight * 0.5;
			const crankPivotZ = gz;
			const armRadius = crankArmLength / 2;

			// Crank arm rotates around the side of the grinder body
			crankArm.position.x = crankPivotX + Math.cos(angle) * armRadius;
			crankArm.position.y = crankPivotY + Math.sin(angle) * armRadius;
			crankArm.position.z = crankPivotZ;
			crankArm.rotation.z = angle + Math.PI / 2;

			// Knob at the end of the arm
			knob.position.x = crankPivotX + Math.cos(angle) * crankArmLength;
			knob.position.y = crankPivotY + Math.sin(angle) * crankArmLength;
			knob.position.z = crankPivotZ;

			// Meat chunks shrink as progress increases
			const chunkScale = Math.max(0, 1.0 - progress / 100);
			for (const chunk of meatChunks) {
				chunk.scaling = new Vector3(chunkScale, chunkScale, chunkScale);
				chunk.isVisible = chunkScale > 0.05;
			}

			// Show output particles proportional to progress
			const visibleCount = Math.floor((progress / 100) * OUTPUT_PARTICLE_MAX);
			for (let i = 0; i < OUTPUT_PARTICLE_MAX; i++) {
				outputParticles[i].isVisible = i < visibleCount;
			}

			// Splatter animation
			if (iseSplatteringRef.current && !splatterActive) {
				// Start new splatter burst
				splatterActive = true;
				splatterTime = 0;
				for (let i = 0; i < splatterParticles.length; i++) {
					splatterParticles[i].isVisible = true;
					splatterParticles[i].position = new Vector3(
						gx,
						GRINDER_BASE_Y + bodyHeight,
						gz,
					);
					// Randomize velocities for each burst
					splatterVelocities[i] = new Vector3(
						(Math.random() - 0.5) * 4,
						Math.random() * 3 + 1,
						(Math.random() - 0.5) * 4,
					);
				}
			}

			if (splatterActive) {
				splatterTime += dt;
				for (let i = 0; i < splatterParticles.length; i++) {
					const p = splatterParticles[i];
					const v = splatterVelocities[i];
					p.position.x += v.x * dt;
					p.position.y += v.y * dt;
					p.position.z += v.z * dt;
					// Gravity
					v.y -= 9.8 * dt;
					// Fade out via scaling
					const fadeScale = Math.max(0, 1.0 - splatterTime / 0.8);
					p.scaling = new Vector3(fadeScale, fadeScale, fadeScale);
				}

				if (splatterTime > 0.8) {
					splatterActive = false;
					for (const p of splatterParticles) {
						p.isVisible = false;
					}
				}
			} else if (!iseSplatteringRef.current) {
				// Ensure particles are hidden when not splattering
				for (const p of splatterParticles) {
					p.isVisible = false;
				}
			}

			// Subtle idle vibration on the grinder body when making progress
			if (progress > 0 && progress < 100) {
				const vibration = Math.sin(timeRef.current * 40) * 0.003;
				body.position.x = gx + vibration;
			} else {
				body.position.x = gx;
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
