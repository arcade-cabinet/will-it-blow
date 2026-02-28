import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import { createCrtMaterial } from '../effects/CrtShader';
import { MrSausage3D } from '../characters/MrSausage3D';
import type { Reaction } from '../characters/reactions';

/** Map reactions to CRT signal distortion intensity (0 = calm, 1 = max chaos) */
const REACTION_INTENSITY: Record<Reaction, number> = {
	idle: 0.0,
	flinch: 0.6,
	laugh: 0.9,
	disgust: 0.5,
	excitement: 0.8,
	nervous: 0.3,
	nod: 0.2,
	talk: 0.4,
};

/**
 * TV geometry constants.
 * Housing is the outer plastic shell; screen is the CRT glass inset.
 * The glass bezel sits between them, giving the classic recessed-screen look.
 */
const TV = {
	housing: { width: 3.2, height: 2.6, depth: 1.6 },
	screen: { width: 2.2, height: 1.6 },
	/** How far forward the screen glass sits from the housing center */
	screenZ: 0.81,
	/** Glass bezel dimensions — slightly larger than screen, slightly proud of housing */
	bezel: { width: 2.5, height: 1.85, depth: 0.12 },
	bezelZ: 0.82,
	/** Mr. Sausage scale — small enough to fit within the screen with headroom */
	sausageScale: 0.22,
	/** Mr. Sausage vertical offset from TV center (nudge down slightly so head is centered) */
	sausageYOffset: -0.15,
};

interface CrtTelevisionProps {
	reaction?: Reaction;
	position?: [number, number, number];
}

export const CrtTelevision = ({
	reaction = 'idle',
	position = [0, 2.5, -5.5],
}: CrtTelevisionProps) => {
	const scene = useScene();
	const timeRef = useRef(0);
	const reactionRef = useRef<Reaction>(reaction);

	useEffect(() => {
		reactionRef.current = reaction;
	}, [reaction]);

	useEffect(() => {
		if (!scene) return;

		const px = position[0];
		const py = position[1];
		const pz = position[2];

		// --- TV Housing (outer plastic shell) ---

		const tvHousing = MeshBuilder.CreateBox(
			'tvHousing',
			{ width: TV.housing.width, height: TV.housing.height, depth: TV.housing.depth },
			scene,
		);
		const housingMat = new StandardMaterial('tvHousingMat', scene);
		housingMat.diffuseColor = new Color3(0.13, 0.1, 0.08);
		housingMat.specularColor = new Color3(0.05, 0.05, 0.05);
		housingMat.emissiveColor = new Color3(0.02, 0.04, 0.025);
		tvHousing.material = housingMat;
		tvHousing.position = new Vector3(px, py, pz);

		// --- Inner bezel recess — dark inset frame around the screen ---
		// Creates the visual depth between housing edge and glass surface

		const bezelRecess = MeshBuilder.CreateBox(
			'tvBezelRecess',
			{ width: TV.bezel.width + 0.15, height: TV.bezel.height + 0.15, depth: 0.08 },
			scene,
		);
		const recessMat = new StandardMaterial('tvRecessMat', scene);
		recessMat.diffuseColor = new Color3(0.05, 0.04, 0.03);
		recessMat.specularColor = Color3.Black();
		bezelRecess.material = recessMat;
		bezelRecess.position = new Vector3(px, py, pz + TV.bezelZ - 0.04);

		// --- Glass bezel — the curved glass surface of a real CRT ---
		// Slightly transparent with specular reflection, sits proud of the housing

		const glassFront = MeshBuilder.CreatePlane(
			'tvGlass',
			{ width: TV.bezel.width, height: TV.bezel.height },
			scene,
		);
		const glassMat = new StandardMaterial('tvGlassMat', scene);
		glassMat.diffuseColor = new Color3(0.03, 0.04, 0.03);
		glassMat.specularColor = new Color3(0.4, 0.45, 0.4);
		glassMat.specularPower = 80;
		glassMat.alpha = 0.15; // Mostly transparent — you see through to the CRT screen
		glassMat.emissiveColor = new Color3(0.01, 0.02, 0.015);
		glassFront.material = glassMat;
		glassFront.position = new Vector3(px, py, pz + TV.bezelZ + 0.02);

		// --- CRT Screen (shader plane behind the glass) ---

		const tvScreen = MeshBuilder.CreatePlane(
			'tvScreen',
			{ width: TV.screen.width, height: TV.screen.height },
			scene,
		);
		const crtMat = createCrtMaterial('tvCrt', scene);
		tvScreen.material = crtMat;
		tvScreen.position = new Vector3(px, py, pz + TV.screenZ);

		// --- Bezel frame — 4 bars forming a rounded-corner frame around the glass ---

		const frameMat = new StandardMaterial('tvFrameMat', scene);
		frameMat.diffuseColor = new Color3(0.08, 0.07, 0.06);
		frameMat.specularColor = new Color3(0.02, 0.02, 0.02);

		const frameThickness = 0.12;
		const fw = TV.bezel.width / 2 + frameThickness / 2;
		const fh = TV.bezel.height / 2 + frameThickness / 2;

		// Top frame bar
		const frameTop = MeshBuilder.CreateBox('frameTop', { width: TV.bezel.width + frameThickness * 2, height: frameThickness, depth: TV.bezel.depth }, scene);
		frameTop.material = frameMat;
		frameTop.position = new Vector3(px, py + fh, pz + TV.bezelZ);

		// Bottom frame bar
		const frameBottom = MeshBuilder.CreateBox('frameBottom', { width: TV.bezel.width + frameThickness * 2, height: frameThickness, depth: TV.bezel.depth }, scene);
		frameBottom.material = frameMat;
		frameBottom.position = new Vector3(px, py - fh, pz + TV.bezelZ);

		// Left frame bar
		const frameLeft = MeshBuilder.CreateBox('frameLeft', { width: frameThickness, height: TV.bezel.height, depth: TV.bezel.depth }, scene);
		frameLeft.material = frameMat;
		frameLeft.position = new Vector3(px - fw, py, pz + TV.bezelZ);

		// Right frame bar
		const frameRight = MeshBuilder.CreateBox('frameRight', { width: frameThickness, height: TV.bezel.height, depth: TV.bezel.depth }, scene);
		frameRight.material = frameMat;
		frameRight.position = new Vector3(px + fw, py, pz + TV.bezelZ);

		// --- Control knobs on the right side (inspired by classic CRT TVs) ---

		const knobMat = new StandardMaterial('knobMat', scene);
		knobMat.diffuseColor = new Color3(0.2, 0.18, 0.15);
		knobMat.specularColor = new Color3(0.1, 0.1, 0.1);

		const knob1 = MeshBuilder.CreateCylinder('knob1', { height: 0.15, diameter: 0.22, tessellation: 12 }, scene);
		knob1.material = knobMat;
		knob1.position = new Vector3(px + TV.housing.width / 2 - 0.2, py + 0.3, pz + TV.bezelZ);
		knob1.rotation.x = Math.PI / 2;

		const knob2 = MeshBuilder.CreateCylinder('knob2', { height: 0.15, diameter: 0.22, tessellation: 12 }, scene);
		knob2.material = knobMat;
		knob2.position = new Vector3(px + TV.housing.width / 2 - 0.2, py - 0.15, pz + TV.bezelZ);
		knob2.rotation.x = Math.PI / 2;

		// --- Speaker grille (horizontal slots below the screen) ---

		const grilleMat = new StandardMaterial('grilleMat', scene);
		grilleMat.diffuseColor = new Color3(0.06, 0.05, 0.04);
		grilleMat.specularColor = Color3.Black();

		const grilleSlots: ReturnType<typeof MeshBuilder.CreateBox>[] = [];
		for (let i = 0; i < 4; i++) {
			const slot = MeshBuilder.CreateBox(`grille_${i}`, { width: 1.0, height: 0.03, depth: 0.06 }, scene);
			slot.material = grilleMat;
			slot.position = new Vector3(px - 0.4, py - TV.housing.height / 2 + 0.25 + i * 0.08, pz + TV.bezelZ);
			grilleSlots.push(slot);
		}

		// --- Wall Bracket ---

		const bracket = MeshBuilder.CreateBox(
			'tvBracket',
			{ width: 1.2, height: 0.15, depth: 0.6 },
			scene,
		);
		const bracketMat = new StandardMaterial('tvBracketMat', scene);
		bracketMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
		bracketMat.specularColor = new Color3(0.02, 0.02, 0.02);
		bracket.material = bracketMat;
		bracket.position = new Vector3(px, py - 1.4, pz - 0.3);

		// --- Antennas ---

		const antennaMat = new StandardMaterial('antennaMat', scene);
		antennaMat.diffuseColor = new Color3(0.6, 0.6, 0.6);
		antennaMat.specularColor = new Color3(0.3, 0.3, 0.3);

		const antennaL = MeshBuilder.CreateCylinder(
			'antennaL',
			{ height: 1.2, diameter: 0.06, tessellation: 8 },
			scene,
		);
		antennaL.material = antennaMat;
		antennaL.position = new Vector3(px - 0.5, py + 1.8, pz);
		antennaL.rotation.z = 0.35;

		const antennaR = MeshBuilder.CreateCylinder(
			'antennaR',
			{ height: 1.2, diameter: 0.06, tessellation: 8 },
			scene,
		);
		antennaR.material = antennaMat;
		antennaR.position = new Vector3(px + 0.5, py + 1.8, pz);
		antennaR.rotation.z = -0.35;

		// --- Power LED ---

		const powerLed = MeshBuilder.CreateSphere(
			'powerLed',
			{ diameter: 0.08, segments: 8 },
			scene,
		);
		const ledMat = new StandardMaterial('ledMat', scene);
		ledMat.disableLighting = true;
		ledMat.emissiveColor = new Color3(1.0, 0.0, 0.0);
		powerLed.material = ledMat;
		powerLed.position = new Vector3(px + TV.housing.width / 2 - 0.2, py - 0.5, pz + TV.bezelZ);

		// --- Render loop: CRT time + LED blink + reaction-driven effects ---

		let targetReactionIntensity = 0;
		let currentReactionIntensity = 0;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			timeRef.current += dt;

			crtMat.setFloat('time', timeRef.current);

			targetReactionIntensity = REACTION_INTENSITY[reactionRef.current] ?? 0;
			const lerpSpeed = targetReactionIntensity > currentReactionIntensity ? 8.0 : 3.0;
			currentReactionIntensity += (targetReactionIntensity - currentReactionIntensity) * Math.min(lerpSpeed * dt, 1.0);
			crtMat.setFloat('reactionIntensity', currentReactionIntensity);

			// Blink power LED
			const ledBrightness = 0.5 + 0.5 * Math.sin(timeRef.current * 3);
			ledMat.emissiveColor = new Color3(ledBrightness, 0.0, 0.0);

			// CRT screen light bleed onto housing
			const glowPulse = 0.02 + currentReactionIntensity * 0.04;
			const flicker = 1.0 + Math.sin(timeRef.current * 4) * 0.3 * (1.0 + currentReactionIntensity);
			const g = glowPulse * flicker;
			housingMat.emissiveColor = new Color3(g * 0.6, g, g * 0.7);

			// Glass reflection pulse — subtle specular shimmer when reactions happen
			const glassGlow = 0.01 + currentReactionIntensity * 0.03;
			glassMat.emissiveColor = new Color3(glassGlow * 0.5, glassGlow, glassGlow * 0.7);
		});

		// --- Cleanup ---

		return () => {
			scene.onBeforeRenderObservable.remove(observer);

			tvHousing.dispose();
			housingMat.dispose();

			bezelRecess.dispose();
			recessMat.dispose();

			glassFront.dispose();
			glassMat.dispose();

			tvScreen.dispose();
			crtMat.dispose();

			frameTop.dispose();
			frameBottom.dispose();
			frameLeft.dispose();
			frameRight.dispose();
			frameMat.dispose();

			knob1.dispose();
			knob2.dispose();
			knobMat.dispose();

			grilleSlots.forEach((s) => { s.dispose(); });
			grilleMat.dispose();

			bracket.dispose();
			bracketMat.dispose();

			antennaL.dispose();
			antennaR.dispose();
			antennaMat.dispose();

			powerLed.dispose();
			ledMat.dispose();
		};
	}, [scene]);

	// MrSausage3D faces -Z by default. Rotate π around Y so he faces the viewer (+Z).
	// Centered on the screen, scaled to fit within the glass bezel with headroom.
	// Camera tracking enabled so Mr. Sausage creepily follows the player around.
	return (
		<MrSausage3D
			reaction={reaction}
			position={[position[0], position[1] + TV.sausageYOffset, position[2] + TV.screenZ + 0.05]}
			scale={TV.sausageScale}
			rotationY={Math.PI}
			trackCamera
		/>
	);
};
