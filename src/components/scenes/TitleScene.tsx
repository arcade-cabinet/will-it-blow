import { Color3, HemisphericLight, PointLight, SpotLight, Vector3 } from "@babylonjs/core";
import { useEffect } from "react";
import { useScene } from "reactylon";
import { MrSausage3D } from "../characters/MrSausage3D";

export const TitleScene = () => {
	const scene = useScene();

	useEffect(() => {
		if (!scene) return;

		// Key light — bright warm from front-below, illuminates the face
		const keyLight = new SpotLight(
			"keyLight",
			new Vector3(0, 0, -8),           // Directly in front
			new Vector3(0, 0.15, 1),          // Aimed slightly up at face
			Math.PI / 2.5,                    // Wide cone
			1.5,                              // Soft falloff
			scene,
		);
		keyLight.diffuse = new Color3(1.0, 0.9, 0.75);
		keyLight.intensity = 2.5;

		// Fill light — top-down to catch the hat
		const fillLight = new PointLight(
			"fillLight",
			new Vector3(0, 8, -3),
			scene,
		);
		fillLight.diffuse = new Color3(1.0, 0.95, 0.85);
		fillLight.intensity = 1.2;

		// Side accent — warm orange from the right
		const rimLight = new PointLight(
			"rimLight",
			new Vector3(4, 2, -4),
			scene,
		);
		rimLight.diffuse = new Color3(1.0, 0.65, 0.35);
		rimLight.intensity = 1.0;

		return () => {
			keyLight.dispose();
			fillLight.dispose();
			rimLight.dispose();
		};
	}, [scene]);

	return <MrSausage3D reaction="idle" position={[0, 0.2, 0]} scale={1.0} />;
};
