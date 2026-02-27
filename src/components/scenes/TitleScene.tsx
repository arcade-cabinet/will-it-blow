import { Color3, PointLight, Vector3 } from "@babylonjs/core";
import { useEffect } from "react";
import { useScene } from "reactylon";
import { MrSausage3D } from "../characters/MrSausage3D";

export const TitleScene = () => {
	const scene = useScene();

	useEffect(() => {
		if (!scene) return;

		// Warm spotlight on the mascot
		const spotlight = new PointLight(
			"mascotLight",
			new Vector3(0, 6, -3),
			scene,
		);
		spotlight.diffuse = new Color3(1, 0.7, 0.4);
		spotlight.intensity = 0.6;

		return () => {
			spotlight.dispose();
		};
	}, [scene]);

	return <MrSausage3D reaction="idle" position={[0, 0, 0]} scale={1.2} />;
};
