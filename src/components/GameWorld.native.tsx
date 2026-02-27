import * as BABYLON from "@babylonjs/core";
import {
	CannonJSPlugin,
	type Camera,
	Color4,
	DirectionalLight,
	HemisphericLight,
	Vector3,
} from "@babylonjs/core";
import * as CANNON from "cannon-es";
import React, { useState } from "react";
import { Scene } from "reactylon";
import { NativeEngine } from "reactylon/mobile";
import { useGame } from "../engine/GameEngine";
import { TitleScene } from "./scenes/TitleScene";
import { GrinderScene } from "./scenes/GrinderScene";
import { StufferScene } from "./scenes/StufferScene";
import { BlowScene } from "./scenes/BlowScene";
import { CookScene } from "./scenes/CookScene";
import { TasteScene } from "./scenes/TasteScene";

// cannon-es compat: Babylon's CannonJSPlugin reads from globalThis.CANNON
(globalThis as any).CANNON = CANNON;

export const GameWorld = () => {
	const { phase } = useGame();
	const [camera, setCamera] = useState<Camera>();

	const onSceneReady = (scene: any) => {
		// Dark moody background
		scene.clearColor = new Color4(0.04, 0.04, 0.04, 1);

		// Enable physics with downward gravity
		scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin());

		// Ambient Fill Light
		const ambientLight = new HemisphericLight(
			"ambientLight",
			new Vector3(0, 1, 0),
			scene,
		);
		ambientLight.intensity = 0.4;
		ambientLight.groundColor = new BABYLON.Color3(0.15, 0.1, 0.08);

		// Main Directional Light — warm orange tint
		const dirLight = new DirectionalLight(
			"dirLight",
			new Vector3(-1, -2, -1),
			scene,
		);
		dirLight.position = new Vector3(20, 40, 20);
		dirLight.intensity = 0.8;
		dirLight.diffuse = new BABYLON.Color3(1, 0.9, 0.8);

		// Camera
		scene.createDefaultCameraOrLight(true, undefined, true);
		const cam = scene.activeCamera as BABYLON.ArcRotateCamera;
		cam.alpha = -Math.PI / 2;
		cam.beta = Math.PI / 2.5;
		cam.radius = 10;
		cam.lowerRadiusLimit = 5;
		cam.upperRadiusLimit = 20;

		setCamera(cam);
	};

	return (
		<NativeEngine camera={camera as Camera}>
			<Scene onSceneReady={onSceneReady}>
				{camera && (
					<>
						{(phase === "title" || phase === "select" || phase === "results") && (
							<TitleScene />
						)}
						{phase === "grind" && <GrinderScene />}
						{phase === "stuff" && <StufferScene />}
						{phase === "blow" && <BlowScene />}
						{phase === "cook" && <CookScene />}
						{phase === "taste" && <TasteScene />}
					</>
				)}
			</Scene>
		</NativeEngine>
	);
};
