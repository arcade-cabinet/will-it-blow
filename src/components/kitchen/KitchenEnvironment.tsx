import { useEffect } from 'react';
import { useScene } from 'reactylon';
import {
	Color3,
	MeshBuilder,
	SpotLight,
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
		floorMat.diffuseColor = new Color3(0.35, 0.33, 0.3);
		floorMat.specularColor = new Color3(0.15, 0.15, 0.15);
		floor.material = floorMat;

		// --- Ceiling ---

		const ceiling = MeshBuilder.CreateGround(
			'ceiling',
			{ width: 12, height: 14 },
			scene,
		);
		const ceilingMat = new StandardMaterial('ceilingMat', scene);
		ceilingMat.diffuseColor = new Color3(0.7, 0.68, 0.65);
		ceilingMat.specularColor = new Color3(0.05, 0.05, 0.05);
		ceiling.material = ceilingMat;
		ceiling.position.y = 4;
		ceiling.rotation.x = Math.PI;

		// --- Walls ---

		const wallMat = new StandardMaterial('wallMat', scene);
		wallMat.diffuseColor = new Color3(0.6, 0.58, 0.55);
		wallMat.specularColor = new Color3(0.1, 0.1, 0.1);

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

		// --- Fluorescent Tube Fixtures ---
		const tubePositions = [
			new Vector3(-3, 3.8, -2),
			new Vector3(0, 3.8, -3.5),
			new Vector3(3, 3.8, -2),
		];

		const tubeMeshes: any[] = [];
		const tubeLights: SpotLight[] = [];
		const tubeMats: StandardMaterial[] = [];

		const tubeMat = new StandardMaterial('tubeMat', scene);
		tubeMat.emissiveColor = new Color3(0.95, 1.0, 0.9);
		tubeMat.disableLighting = true;
		tubeMats.push(tubeMat);

		for (let i = 0; i < tubePositions.length; i++) {
			const pos = tubePositions[i];

			// Tube mesh (long thin box — the glass tube)
			const tube = MeshBuilder.CreateBox(
				`fluorescentTube${i}`,
				{ width: 0.12, height: 0.06, depth: 3.0 },
				scene,
			);
			tube.material = tubeMat;
			tube.position = pos;
			tubeMeshes.push(tube);

			// Housing/fixture (slightly wider metal housing above tube)
			const housing = MeshBuilder.CreateBox(
				`tubeHousing${i}`,
				{ width: 0.3, height: 0.08, depth: 3.2 },
				scene,
			);
			const housingMat = new StandardMaterial(`tubeHousingMat${i}`, scene);
			housingMat.diffuseColor = new Color3(0.6, 0.6, 0.6);
			housingMat.specularColor = new Color3(0.1, 0.1, 0.1);
			housing.material = housingMat;
			housing.position = new Vector3(pos.x, pos.y + 0.06, pos.z);
			tubeMeshes.push(housing);
			tubeMats.push(housingMat);

			// SpotLight pointing straight down
			const light = new SpotLight(
				`tubeLight${i}`,
				new Vector3(pos.x, pos.y - 0.05, pos.z),
				new Vector3(0, -1, 0),
				Math.PI / 2.5,
				1.5,
				scene,
			);
			light.diffuse = new Color3(0.95, 1.0, 0.9);
			light.intensity = 2.0;
			light.range = 8;
			tubeLights.push(light);
		}

		// --- Flicker animation ---
		let flickerTime = 0;
		let nextFlickerAt = 2 + Math.random() * 3;
		let flickeringTube = -1;
		let flickerEnd = 0;

		const observer = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			flickerTime += dt;

			// Check if it's time for a new flicker
			if (flickerTime > nextFlickerAt && flickeringTube === -1) {
				flickeringTube = Math.floor(Math.random() * tubePositions.length);
				flickerEnd = flickerTime + 0.1 + Math.random() * 0.3;
				nextFlickerAt = flickerTime + 3 + Math.random() * 8;
			}

			// Apply flicker
			for (let i = 0; i < tubeLights.length; i++) {
				if (i === flickeringTube && flickerTime < flickerEnd) {
					const flash = Math.sin(flickerTime * 60) > 0 ? 0.3 : 2.0;
					tubeLights[i].intensity = flash;
				} else {
					tubeLights[i].intensity = 2.0;
				}
			}

			// End flicker
			if (flickeringTube !== -1 && flickerTime >= flickerEnd) {
				flickeringTube = -1;
			}
		});

		// --- Cleanup ---

		return () => {
			if (observer) scene.onBeforeRenderObservable.remove(observer);

			for (const light of tubeLights) light.dispose();
			for (const mesh of tubeMeshes) mesh.dispose();
			for (const mat of tubeMats) mat.dispose();

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
