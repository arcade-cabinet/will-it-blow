import * as BABYLON from "@babylonjs/core";
import {
	ArcRotateCamera,
	CannonJSPlugin,
	type Camera,
	Color4,
	DirectionalLight,
	HemisphericLight,
	Vector3,
} from "@babylonjs/core";
import * as CANNON from "cannon-es";
import React, { useEffect, useState } from "react";
import { Scene } from "reactylon";
import { Engine } from "reactylon/web";
import { useGame } from "../engine/GameEngine";
import type { GamePhase } from "../engine/Constants";
import { TitleScene } from "./scenes/TitleScene";
import { GrinderScene } from "./scenes/GrinderScene";
import { StufferScene } from "./scenes/StufferScene";
import { BlowScene } from "./scenes/BlowScene";
import { CookScene } from "./scenes/CookScene";
import { TasteScene } from "./scenes/TasteScene";

// cannon-es compat: Babylon's CannonJSPlugin reads from globalThis.CANNON
(globalThis as any).CANNON = CANNON;

/**
 * Per-phase camera compositions.
 * Each entry defines target, alpha, beta, radius for optimal scene framing.
 */
const CAMERA_COMPOSITIONS: Record<
	string,
	{ target: [number, number, number]; alpha: number; beta: number; radius: number }
> = {
	// Title/select/results: Mr. Sausage centered, slight hero angle
	title: { target: [0, 0.3, 0], alpha: -Math.PI / 2, beta: Math.PI / 2.5, radius: 10 },
	select: { target: [0, 0.3, 0], alpha: -Math.PI / 2, beta: Math.PI / 2.5, radius: 10 },
	results: { target: [0, 0.3, 0], alpha: -Math.PI / 2, beta: Math.PI / 2.5, radius: 10 },
	// Grind: Framed on grinder + ingredient shelf, slightly closer
	grind: { target: [-0.5, 0.5, 0], alpha: -Math.PI / 2, beta: Math.PI / 2.5, radius: 9 },
	// Stuff: Horizontal stuffer, offset right to show casing extension
	stuff: { target: [0.5, 0, 0], alpha: -Math.PI / 2, beta: Math.PI / 2.3, radius: 9 },
	// Blow: Pulled back to show full tube-to-wall distance
	blow: { target: [0, 0, 2], alpha: -Math.PI / 2, beta: Math.PI / 2.5, radius: 12 },
	// Cook: More top-down to see frying pan + sausage from above
	cook: { target: [0, 0, 0], alpha: -Math.PI / 2, beta: Math.PI / 3, radius: 7 },
	// Taste: Close-up of plated sausage
	taste: { target: [0, 0.3, 0], alpha: -Math.PI / 2, beta: Math.PI / 2.5, radius: 8 },
};

/** Phases where camera orbit should be locked to prevent accidental rotation */
const LOCKED_PHASES = new Set<GamePhase>(["grind", "stuff", "blow", "cook", "taste"]);

export const GameWorld = () => {
	const { phase } = useGame();
	const [camera, setCamera] = useState<Camera>();

	const onSceneReady = (scene: any) => {
		// Dark moody background
		scene.clearColor = new Color4(0.04, 0.04, 0.04, 1);

		// Enable physics with downward gravity
		scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin());

		// Ambient Fill Light — raised intensity for visibility
		const ambientLight = new HemisphericLight(
			"ambientLight",
			new Vector3(0, 1, 0),
			scene,
		);
		ambientLight.intensity = 1.0;
		ambientLight.groundColor = new BABYLON.Color3(0.3, 0.2, 0.12);

		// Main Directional Light — from behind camera toward +Z, illuminates -Z facing faces
		const dirLight = new DirectionalLight(
			"dirLight",
			new Vector3(0.1, -0.3, 1).normalize(),
			scene,
		);
		dirLight.intensity = 1.8;
		dirLight.diffuse = new BABYLON.Color3(1, 0.92, 0.82);

		// Camera
		scene.createDefaultCameraOrLight(true, undefined, true);
		const cam = scene.activeCamera as ArcRotateCamera;
		cam.alpha = -Math.PI / 2;
		cam.beta = Math.PI / 2.5;
		cam.radius = 10;
		cam.lowerRadiusLimit = 5;
		cam.upperRadiusLimit = 20;

		setCamera(cam);
	};

	// --- Per-phase camera composition + orbit locking ---
	useEffect(() => {
		if (!camera) return;
		const cam = camera as ArcRotateCamera;
		const canvas = cam.getScene().getEngine().getRenderingCanvas();

		const comp = CAMERA_COMPOSITIONS[phase];
		if (comp) {
			cam.target = new Vector3(comp.target[0], comp.target[1], comp.target[2]);
			cam.alpha = comp.alpha;
			cam.beta = comp.beta;
			cam.radius = comp.radius;
		}

		if (LOCKED_PHASES.has(phase)) {
			cam.detachControl();
		} else if (canvas) {
			cam.attachControl(canvas, true);
		}
	}, [phase, camera]);

	// reactylon Engine types are incomplete — antialias/style work at runtime
	const engineProps = {
		engineOptions: { preserveDrawingBuffer: true, stencil: true, antialias: true },
		style: { width: "100%", height: "100%" },
	} as any;

	return (
		<Engine {...engineProps}>
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
		</Engine>
	);
};
