import { useEffect } from 'react';
import { useScene } from 'reactylon';
import {
	Color3,
	CubeTexture,
	HemisphericLight,
	Mesh,
	MeshBuilder,
	PBRMaterial,
	PointLight,
	SceneLoader,
	StandardMaterial,
	Texture,
	Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

// --- Room dimensions (slightly larger than 12x12 kitchen GLB to avoid z-fighting) ---
const ROOM_W = 13;   // x-axis
const ROOM_D = 13;   // z-axis
const ROOM_H = 5.5;  // y-axis
const TILE_LINE = 2.4; // height where subway tile meets concrete on walls

/** Resolve asset URL accounting for Expo web baseUrl in production */
function getAssetRootUrl(subdir: string): string {
	if (typeof document !== 'undefined') {
		const base = document.querySelector('base');
		if (base?.href) {
			const url = new URL(base.href);
			return `${url.pathname.replace(/\/$/, '')}/${subdir}/`;
		}
	}
	return `/${subdir}/`;
}

export const KitchenEnvironment = () => {
	const scene = useScene();

	useEffect(() => {
		if (!scene) return;

		let disposed = false;
		const disposables: { dispose: () => void }[] = [];

		const texRoot = getAssetRootUrl('textures');
		const modelRoot = getAssetRootUrl('models');

		// PBR materials need an environment texture for indirect lighting (IBL).
		// Without this, PBR surfaces render nearly black — no reflection/ambient contribution.
		// We ship a local prefiltered cubemap (Babylon's .env format) to avoid runtime CDN fetches.
		if (!scene.environmentTexture) {
			const envTex = CubeTexture.CreateFromPrefilteredData(
				texRoot + 'environment.env',
				scene,
			);
			scene.environmentTexture = envTex;
			disposables.push(envTex);
		}
		// Indoor basement: higher intensity needed because the neutral IBL is sky-biased.
		// Vertical surfaces (walls) get much less IBL than horizontal ones, so push it up.
		scene.environmentIntensity = 0.5;

		// Helper: load a texture with tiling, tracked for disposal
		function loadTex(file: string, uScale: number, vScale: number): Texture {
			const tex = new Texture(texRoot + file, scene);
			tex.uScale = uScale;
			tex.vScale = vScale;
			disposables.push(tex);
			return tex;
		}

		// Helper: create a PBR material from AmbientCG texture set.
		// AmbientCG provides separate Color, NormalGL, Roughness, and optionally AO maps.
		// Babylon's PBRMaterial metallicTexture packs metallic (R) and roughness (G) into
		// one texture — since our source is roughness-only grayscale, we:
		//   - Read roughness from green channel (all RGB channels identical in grayscale JPG)
		//   - Explicitly disable alpha-channel roughness (JPGs have no alpha)
		//   - Set metallic=0 (acts as multiplier, zeroes out the R channel metallic read)
		function makePBR(
			name: string,
			colorFile: string,
			normalFile: string,
			roughnessFile: string,
			uScale: number,
			vScale: number,
			aoFile?: string,
		): PBRMaterial {
			const mat = new PBRMaterial(name, scene);

			mat.albedoTexture = loadTex(colorFile, uScale, vScale);
			mat.bumpTexture = loadTex(normalFile, uScale, vScale);

			// Roughness via metallicTexture green channel
			mat.metallicTexture = loadTex(roughnessFile, uScale, vScale);
			mat.useRoughnessFromMetallicTextureAlpha = false;
			mat.useRoughnessFromMetallicTextureGreen = true;
			mat.metallic = 0;  // multiplier: zeroes any metallic read from texture
			mat.roughness = 1; // multiplier: preserves roughness texture values as-is

			// Ambient occlusion adds depth in grout lines, cracks, crevices
			if (aoFile) {
				mat.ambientTexture = loadTex(aoFile, uScale, vScale);
			}

			disposables.push(mat);
			return mat;
		}

		// =======================================================
		// ROOM ENCLOSURE — floor, ceiling, 4 walls with PBR
		// =======================================================

		// --- Floor (checkered tiles) ---
		const floorMat = makePBR('floorMat',
			'tile_floor_color.jpg', 'tile_floor_normal.jpg', 'tile_floor_roughness.jpg',
			4, 4,
		);
		floorMat.maxSimultaneousLights = 4;
		// Cap floor's IBL contribution — horizontal surfaces catch too much sky-biased light
		floorMat.environmentIntensity = 0.1;
		floorMat.directIntensity = 0.4; // dimmer floor for basement horror atmosphere
		floorMat.albedoColor = new Color3(0.55, 0.53, 0.5); // grimy aged floor
		const floor = MeshBuilder.CreateGround('floor', { width: ROOM_W, height: ROOM_D }, scene);
		floor.position.y = 0;
		floor.material = floorMat;
		floor.receiveShadows = true;
		disposables.push(floor);

		// --- Ceiling (cracked concrete) ---
		const ceilingMat = makePBR('ceilingMat',
			'concrete_color.jpg', 'concrete_normal.jpg', 'concrete_roughness.jpg',
			3, 3,
		);
		ceilingMat.maxSimultaneousLights = 4;
		ceilingMat.environmentIntensity = 0.3; // ceiling: minimal IBL, lit mostly by bounce
		ceilingMat.albedoColor = new Color3(0.5, 0.48, 0.45); // darken
		const ceiling = MeshBuilder.CreateGround('ceiling', { width: ROOM_W, height: ROOM_D }, scene);
		ceiling.position.y = ROOM_H;
		ceiling.rotation.x = Math.PI; // flip to face downward into room
		ceiling.material = ceilingMat;
		disposables.push(ceiling);

		// --- Walls ---
		// Each wall is TWO planes stacked: lower subway tile + upper exposed concrete.
		// Plane normals face +Z by default. We rotate each wall so normals point inward.
		//   Back wall  (z = -6.5):  rotY=0     → normal faces +Z (into room) ✓
		//   Front wall (z = +6.5):  rotY=PI    → normal faces -Z (into room) ✓
		//   Left wall  (x = -6.5):  rotY=PI/2  → normal faces +X (into room) ✓
		//   Right wall (x = +6.5):  rotY=-PI/2 → normal faces -X (into room) ✓
		const wallConfigs = [
			{ pos: [0, 0, -ROOM_D / 2], rotY: 0, w: ROOM_W },
			{ pos: [0, 0, ROOM_D / 2], rotY: Math.PI, w: ROOM_W },
			{ pos: [-ROOM_W / 2, 0, 0], rotY: Math.PI / 2, w: ROOM_D },
			{ pos: [ROOM_W / 2, 0, 0], rotY: -Math.PI / 2, w: ROOM_D },
		];

		// Subway tile: AO map available for Tiles009 — adds grout line depth
		const wallTileMat = makePBR('wallTileMat',
			'tile_wall_color.jpg', 'tile_wall_normal.jpg', 'tile_wall_roughness.jpg',
			4, 2,
			'tile_wall_ao.jpg',
		);
		wallTileMat.albedoColor = new Color3(0.6, 0.58, 0.52); // dingy yellowed tile
		wallTileMat.backFaceCulling = false;
		wallTileMat.twoSidedLighting = true;
		wallTileMat.maxSimultaneousLights = 4;
		wallTileMat.forceIrradianceInFragment = true;

		const wallConcreteMat = makePBR('wallConcreteMat',
			'concrete_color.jpg', 'concrete_normal.jpg', 'concrete_roughness.jpg',
			2, 1.5,
		);
		wallConcreteMat.albedoColor = new Color3(0.55, 0.52, 0.48);
		wallConcreteMat.backFaceCulling = false;
		wallConcreteMat.twoSidedLighting = true;
		wallConcreteMat.maxSimultaneousLights = 4;
		wallConcreteMat.forceIrradianceInFragment = true;

		for (const cfg of wallConfigs) {
			// Lower wall: subway tile (y = 0 → TILE_LINE)
			const lower = MeshBuilder.CreatePlane(`wallLower_${cfg.rotY}`, {
				width: cfg.w,
				height: TILE_LINE,
				sideOrientation: Mesh.DOUBLESIDE,
			}, scene);
			lower.position = new Vector3(cfg.pos[0], TILE_LINE / 2, cfg.pos[2]);
			lower.rotation.y = cfg.rotY;
			lower.material = wallTileMat;
			disposables.push(lower);

			// Upper wall: concrete (y = TILE_LINE → ROOM_H)
			const upperH = ROOM_H - TILE_LINE;
			const upper = MeshBuilder.CreatePlane(`wallUpper_${cfg.rotY}`, {
				width: cfg.w,
				height: upperH,
				sideOrientation: Mesh.DOUBLESIDE,
			}, scene);
			upper.position = new Vector3(cfg.pos[0], TILE_LINE + upperH / 2, cfg.pos[2]);
			upper.rotation.y = cfg.rotY;
			upper.material = wallConcreteMat;
			disposables.push(upper);
		}

		// =======================================================
		// GRIME DECALS — transparent planes offset from walls
		//
		// Uses ALPHA_BLEND (not ALPHA_TEST) so the Leaking decals'
		// soft gradient edges render correctly instead of hard cutoffs.
		// Normal + roughness maps applied for wet surface relief.
		// =======================================================

		function makeGrimeDecal(
			name: string,
			colorFile: string,
			opacityFile: string,
			normalFile: string,
			roughnessFile: string,
			width: number,
			height: number,
			position: Vector3,
			rotY: number,
		) {
			const mat = new PBRMaterial(name + 'Mat', scene);

			mat.albedoTexture = loadTex(colorFile, 1, 1);
			mat.opacityTexture = loadTex(opacityFile, 1, 1);
			mat.bumpTexture = loadTex(normalFile, 1, 1);

			// Roughness for wet grime sheen
			mat.metallicTexture = loadTex(roughnessFile, 1, 1);
			mat.useRoughnessFromMetallicTextureAlpha = false;
			mat.useRoughnessFromMetallicTextureGreen = true;
			mat.metallic = 0;
			mat.roughness = 1;

			// ALPHA_BLEND for soft gradient edges (not hard ALPHA_TEST cutoff)
			mat.transparencyMode = 1; // PBRMaterial.PBRMATERIAL_ALPHABLEND
			mat.alpha = 1;
			mat.albedoColor = new Color3(0.45, 0.38, 0.25);  // darker, more visible grime
			mat.environmentIntensity = 0.5;  // grime catches some light for wet sheen

			// Render decals after walls to avoid sorting artifacts
			const plane = MeshBuilder.CreatePlane(name, { width, height }, scene);
			plane.position = position;
			plane.rotation.y = rotY;
			plane.material = mat;
			plane.alphaIndex = 10; // render after opaque geometry

			disposables.push(mat, plane);
		}

		// Dripping grime (Leaking003) — 3 placements on different walls
		makeGrimeDecal('grimeDrip1',
			'grime_drip_color.jpg', 'grime_drip_opacity.jpg',
			'grime_drip_normal.jpg', 'grime_drip_roughness.jpg',
			6, 4,
			new Vector3(-2, 3.5, -ROOM_D / 2 + 0.02), 0,
		);
		makeGrimeDecal('grimeDrip2',
			'grime_drip_color.jpg', 'grime_drip_opacity.jpg',
			'grime_drip_normal.jpg', 'grime_drip_roughness.jpg',
			5, 3.5,
			new Vector3(-ROOM_W / 2 + 0.02, 3.2, -2), Math.PI / 2,
		);
		makeGrimeDecal('grimeDrip3',
			'grime_drip_color.jpg', 'grime_drip_opacity.jpg',
			'grime_drip_normal.jpg', 'grime_drip_roughness.jpg',
			7, 3,
			new Vector3(2, 3.8, ROOM_D / 2 - 0.02), Math.PI,
		);
		// Extra drip on right wall for full coverage
		makeGrimeDecal('grimeDrip4',
			'grime_drip_color.jpg', 'grime_drip_opacity.jpg',
			'grime_drip_normal.jpg', 'grime_drip_roughness.jpg',
			5, 3,
			new Vector3(ROOM_W / 2 - 0.02, 3.0, 1), -Math.PI / 2,
		);

		// Baseboard mold (Leaking008) along floor line — all 4 walls
		makeGrimeDecal('grimeBase1',
			'grime_base_color.jpg', 'grime_base_opacity.jpg',
			'grime_base_normal.jpg', 'grime_base_roughness.jpg',
			ROOM_W, 1.2,
			new Vector3(0, 0.6, -ROOM_D / 2 + 0.03), 0,
		);
		makeGrimeDecal('grimeBase2',
			'grime_base_color.jpg', 'grime_base_opacity.jpg',
			'grime_base_normal.jpg', 'grime_base_roughness.jpg',
			ROOM_D, 1.0,
			new Vector3(-ROOM_W / 2 + 0.03, 0.5, 0), Math.PI / 2,
		);
		makeGrimeDecal('grimeBase3',
			'grime_base_color.jpg', 'grime_base_opacity.jpg',
			'grime_base_normal.jpg', 'grime_base_roughness.jpg',
			ROOM_W, 1.1,
			new Vector3(0, 0.55, ROOM_D / 2 - 0.03), Math.PI,
		);
		makeGrimeDecal('grimeBase4',
			'grime_base_color.jpg', 'grime_base_opacity.jpg',
			'grime_base_normal.jpg', 'grime_base_roughness.jpg',
			ROOM_D, 0.9,
			new Vector3(ROOM_W / 2 - 0.03, 0.45, 0), -Math.PI / 2,
		);

		// =======================================================
		// KITCHEN GLB MODEL
		// =======================================================

		SceneLoader.ImportMeshAsync('', modelRoot, 'kitchen.glb', scene).then(
			(result) => {
				if (disposed) {
					result.meshes.forEach((m) => m.dispose());
					return;
				}
				// Per-material overrides to tame direct light on bright surfaces.
				// The baked GLB has albedoColor as a tint multiplier on albedoTexture.
				// Under our strong direct lights (hemi 0.6 + fill 0.8 + tubes 2.0),
				// light-colored surfaces clip to white. Force-darken those here.
				const brightMaterialOverrides: Record<string, { albedo: [number, number, number]; directI: number; killEmissive?: boolean }> = {
					blancblanc:    { albedo: [0.28, 0.27, 0.24], directI: 0.3 },
					blanccarreaux: { albedo: [0.30, 0.28, 0.24], directI: 0.4 },
					blancemission: { albedo: [0.25, 0.24, 0.20], directI: 0.25, killEmissive: true },
				};

				for (const mesh of result.meshes) {
					if (mesh.name !== '__root__') {
						disposables.push(mesh as Mesh);
					}
					const mat = mesh.material;
					if (!mat) continue;
					if (mat instanceof PBRMaterial) {
						mat.maxSimultaneousLights = 4;
						mat.environmentIntensity = 0.05;
						mat.directIntensity = 0.5;

						const override = brightMaterialOverrides[mat.name];
						if (override) {
							mat.albedoColor = new Color3(...override.albedo);
							mat.directIntensity = override.directI;
							if (override.killEmissive) {
								mat.emissiveColor = new Color3(0, 0, 0);
								mat.emissiveIntensity = 0;
							}
						}
					}
				}
			},
			(error) => {
				console.warn('Failed to load kitchen.glb:', error);
			},
		);

		// =======================================================
		// LIGHTING — harsh fluorescent overhead
		// =======================================================

		const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
		hemiLight.diffuse = new Color3(0.85, 0.9, 0.82); // slightly cooler fluorescent
		// groundColor provides "bounce from below" that helps illuminate vertical surfaces
		hemiLight.groundColor = new Color3(0.3, 0.28, 0.24); // darker ground bounce
		hemiLight.intensity = 0.6; // dimmer overall for horror atmosphere
		disposables.push(hemiLight);

		// Single center fill light at mid-wall height — illuminates vertical surfaces
		// that the top-down hemisphere light misses. Kept to 1 light to stay within
		// WebGPU's uniform buffer limits (total scene lights ≤ 8).
		const centerFill = new PointLight('wallFill', new Vector3(0, 2.0, 0), scene);
		centerFill.diffuse = new Color3(0.85, 0.88, 0.8);
		centerFill.intensity = 0.8;
		centerFill.range = 14;
		disposables.push(centerFill);

		// Fluorescent tube fixtures — collect lights in a direct array for the flicker loop
		const tubePositions = [
			new Vector3(-2.5, 4.2, 1.5),
			new Vector3(1.5, 4.2, -1.0),
			new Vector3(-2.5, 4.2, -3.0),
		];
		const tubeLights: PointLight[] = [];

		const tubeMat = new StandardMaterial('tubeMat', scene);
		tubeMat.emissiveColor = new Color3(0.95, 1.0, 0.9);
		tubeMat.disableLighting = true;
		disposables.push(tubeMat);

		for (let i = 0; i < tubePositions.length; i++) {
			const pos = tubePositions[i];

			const tube = MeshBuilder.CreateBox(`fluorescentTube${i}`, { width: 0.12, height: 0.06, depth: 2.5 }, scene);
			tube.material = tubeMat;
			tube.position = pos;
			disposables.push(tube);

			const housingMat = new StandardMaterial(`tubeHousingMat${i}`, scene);
			housingMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
			housingMat.specularColor = new Color3(0.1, 0.1, 0.1);

			const housing = MeshBuilder.CreateBox(`tubeHousing${i}`, { width: 0.3, height: 0.08, depth: 2.7 }, scene);
			housing.material = housingMat;
			housing.position = new Vector3(pos.x, pos.y + 0.06, pos.z);
			disposables.push(housing, housingMat);

			const light = new PointLight(`tubeLight${i}`, new Vector3(pos.x, pos.y - 0.05, pos.z), scene);
			light.diffuse = new Color3(0.95, 1.0, 0.9);
			light.intensity = 2.0;
			light.range = 12;
			tubeLights.push(light);
			disposables.push(light);
		}

		// =======================================================
		// FLICKER ANIMATION
		// =======================================================

		let flickerTime = 0;
		let nextFlickerAt = 2 + Math.random() * 3;
		let flickeringTube = -1;
		let flickerEnd = 0;
		const BASE_INTENSITY = 2.0;

		const flickerObserver = scene.onBeforeRenderObservable.add(() => {
			const dt = scene.getEngine().getDeltaTime() / 1000;
			flickerTime += dt;

			if (flickerTime > nextFlickerAt && flickeringTube === -1) {
				flickeringTube = Math.floor(Math.random() * tubePositions.length);
				flickerEnd = flickerTime + 0.1 + Math.random() * 0.3;
				nextFlickerAt = flickerTime + 3 + Math.random() * 8;
			}

			for (let i = 0; i < tubeLights.length; i++) {
				if (i === flickeringTube && flickerTime < flickerEnd) {
					tubeLights[i].intensity = Math.sin(flickerTime * 60) > 0 ? 0.4 : BASE_INTENSITY;
				} else {
					tubeLights[i].intensity = BASE_INTENSITY;
				}
			}

			if (flickeringTube !== -1 && flickerTime >= flickerEnd) {
				flickeringTube = -1;
			}
		});

		// =======================================================
		// CLEANUP
		// =======================================================

		return () => {
			disposed = true;
			if (flickerObserver) scene.onBeforeRenderObservable.remove(flickerObserver);
			for (const d of disposables) d.dispose();
		};
	}, [scene]);

	return null;
};
