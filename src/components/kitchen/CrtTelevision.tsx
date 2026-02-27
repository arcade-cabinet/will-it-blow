import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import { createCrtMaterial } from '../effects/CrtShader';
import { MrSausage3D } from '../characters/MrSausage3D';
import type { Reaction } from '../characters/reactions';

interface CrtTelevisionProps {
	reaction?: Reaction;
	position?: [number, number, number];
}

export const CrtTelevision = ({
	reaction = 'idle',
	position = [0, 2.5, -6.8],
}: CrtTelevisionProps) => {
	const scene = useScene();
	const timeRef = useRef(0);

	useEffect(() => {
		if (!scene) return;

		// --- TV Housing ---

		const tvHousing = MeshBuilder.CreateBox(
			'tvHousing',
			{ width: 3.0, height: 2.2, depth: 1.5 },
			scene,
		);
		const housingMat = new StandardMaterial('tvHousingMat', scene);
		housingMat.diffuseColor = new Color3(0.15, 0.12, 0.1);
		housingMat.specularColor = new Color3(0.05, 0.05, 0.05);
		tvHousing.material = housingMat;
		tvHousing.position = new Vector3(position[0], position[1], position[2]);

		// --- Screen ---

		const tvScreen = MeshBuilder.CreatePlane(
			'tvScreen',
			{ width: 2.4, height: 1.8 },
			scene,
		);
		const crtMat = createCrtMaterial('tvCrt', scene);
		tvScreen.material = crtMat;
		tvScreen.position = new Vector3(
			position[0],
			position[1],
			position[2] + 0.76,
		);

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
		bracket.position = new Vector3(
			position[0],
			position[1] - 1.2,
			position[2] - 0.2,
		);

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
		antennaL.position = new Vector3(
			position[0] - 0.5,
			position[1] + 1.6,
			position[2],
		);
		antennaL.rotation.z = 0.35; // Angled outward left

		const antennaR = MeshBuilder.CreateCylinder(
			'antennaR',
			{ height: 1.2, diameter: 0.06, tessellation: 8 },
			scene,
		);
		antennaR.material = antennaMat;
		antennaR.position = new Vector3(
			position[0] + 0.5,
			position[1] + 1.6,
			position[2],
		);
		antennaR.rotation.z = -0.35; // Angled outward right

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
		powerLed.position = new Vector3(
			position[0] + 1.2,
			position[1] - 0.9,
			position[2] + 0.76,
		);

		// --- Render loop: CRT time + LED blink ---

		const observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			timeRef.current += dt;

			// Update CRT shader time uniform
			crtMat.setFloat('time', timeRef.current);

			// Blink power LED using sin(time*3)
			const ledBrightness = 0.5 + 0.5 * Math.sin(timeRef.current * 3);
			ledMat.emissiveColor = new Color3(ledBrightness, 0.0, 0.0);
		});

		// --- Cleanup ---

		return () => {
			scene.onBeforeRenderObservable.remove(observer);

			tvHousing.dispose();
			housingMat.dispose();

			tvScreen.dispose();
			crtMat.dispose();

			bracket.dispose();
			bracketMat.dispose();

			antennaL.dispose();
			antennaR.dispose();
			antennaMat.dispose();

			powerLed.dispose();
			ledMat.dispose();
		};
	}, [scene]);

	// MrSausage3D is returned as JSX — positioned at the TV, offset slightly forward, small scale
	return (
		<MrSausage3D
			reaction={reaction}
			position={[position[0], position[1], position[2] + 0.8]}
			scale={0.35}
		/>
	);
};
