import { useEffect } from 'react';
import { useScene } from 'reactylon';
import {
	Color3,
	MeshBuilder,
	PointLight,
	ShadowGenerator,
	StandardMaterial,
	Vector3,
} from '@babylonjs/core';

export const KitchenEnvironment = () => {
	const scene = useScene();

	useEffect(() => {
		if (!scene) return;

		// --- Floor ---

		const floor = MeshBuilder.CreateGround(
			'floor',
			{ width: 12, height: 14 },
			scene,
		);
		const floorMat = new StandardMaterial('floorMat', scene);
		floorMat.diffuseColor = new Color3(0.25, 0.22, 0.2);
		floorMat.specularColor = new Color3(0.05, 0.05, 0.05);
		floor.material = floorMat;
		floor.receiveShadows = true;

		// --- Ceiling ---

		const ceiling = MeshBuilder.CreateGround(
			'ceiling',
			{ width: 12, height: 14 },
			scene,
		);
		const ceilingMat = new StandardMaterial('ceilingMat', scene);
		ceilingMat.diffuseColor = new Color3(0.18, 0.17, 0.16);
		ceilingMat.specularColor = new Color3(0.02, 0.02, 0.02);
		ceiling.material = ceilingMat;
		ceiling.position.y = 4;
		ceiling.rotation.x = Math.PI;

		// --- Walls ---

		const wallMat = new StandardMaterial('wallMat', scene);
		wallMat.diffuseColor = new Color3(0.3, 0.28, 0.25);
		wallMat.specularColor = new Color3(0.05, 0.05, 0.05);

		// Back wall (CRT wall)
		const backWall = MeshBuilder.CreatePlane(
			'backWall',
			{ width: 12, height: 4 },
			scene,
		);
		backWall.material = wallMat;
		backWall.position = new Vector3(0, 2, -7);

		// Front wall
		const frontWall = MeshBuilder.CreatePlane(
			'frontWall',
			{ width: 12, height: 4 },
			scene,
		);
		frontWall.material = wallMat;
		frontWall.position = new Vector3(0, 2, 7);
		frontWall.rotation.y = Math.PI;

		// Left wall
		const leftWall = MeshBuilder.CreatePlane(
			'leftWall',
			{ width: 14, height: 4 },
			scene,
		);
		leftWall.material = wallMat;
		leftWall.position = new Vector3(-6, 2, 0);
		leftWall.rotation.y = Math.PI / 2;

		// Right wall
		const rightWall = MeshBuilder.CreatePlane(
			'rightWall',
			{ width: 14, height: 4 },
			scene,
		);
		rightWall.material = wallMat;
		rightWall.position = new Vector3(6, 2, 0);
		rightWall.rotation.y = -Math.PI / 2;

		// --- Swinging lightbulb ---

		// Point light
		const bulbLight = new PointLight(
			'bulbLight',
			new Vector3(0, 3.5, 0),
			scene,
		);
		bulbLight.diffuse = new Color3(1.0, 0.85, 0.6);
		bulbLight.intensity = 1.5;
		bulbLight.range = 15;

		// Bulb sphere
		const bulb = MeshBuilder.CreateSphere(
			'bulb',
			{ diameter: 0.2, segments: 8 },
			scene,
		);
		const bulbMat = new StandardMaterial('bulbMat', scene);
		bulbMat.emissiveColor = new Color3(1.0, 0.9, 0.5);
		bulbMat.disableLighting = true;
		bulb.material = bulbMat;
		bulb.position = new Vector3(0, 3.5, 0);

		// Wire from ceiling to bulb
		const wire = MeshBuilder.CreateCylinder(
			'wire',
			{ diameter: 0.02, height: 0.5 },
			scene,
		);
		const wireMat = new StandardMaterial('wireMat', scene);
		wireMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
		wire.material = wireMat;
		wire.position = new Vector3(0, 3.75, 0);

		// --- Shadow generator ---

		const shadowGen = new ShadowGenerator(512, bulbLight);
		shadowGen.usePoissonSampling = true;

		// --- Swing animation ---

		let time = 0;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			time += dt;

			// Gentle swing
			const swingOffset = Math.sin(time * 0.8) * 0.15;

			bulb.position.x = swingOffset;
			bulbLight.position.x = swingOffset;
			wire.position.x = swingOffset;

			// Subtle tilt of the wire to follow the swing
			wire.rotation.z = -swingOffset * 0.5;

			// Subtle intensity flicker
			bulbLight.intensity = 1.5 + Math.sin(time * 12) * 0.05;
		});

		// --- Cleanup ---

		return () => {
			if (observer) scene.onBeforeRenderObservable.remove(observer);

			shadowGen.dispose();

			bulbLight.dispose();

			bulb.dispose();
			bulbMat.dispose();
			wire.dispose();
			wireMat.dispose();

			floor.dispose();
			floorMat.dispose();
			ceiling.dispose();
			ceilingMat.dispose();

			backWall.dispose();
			frontWall.dispose();
			leftWall.dispose();
			rightWall.dispose();
			wallMat.dispose();
		};
	}, [scene]);

	return null;
};
