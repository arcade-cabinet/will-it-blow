import React from "react";

type ShapeType =
	| "sphere"
	| "box"
	| "cylinder"
	| "elongated"
	| "wedge"
	| "cone"
	| "small-sphere"
	| "irregular";

interface Ingredient3DProps {
	shape: ShapeType;
	color: string;
	position?: [number, number, number];
	scale?: number;
}

function ShapeMesh({ shape, color }: { shape: ShapeType; color: string }) {
	const mat = <meshBasicMaterial color={color} />;

	switch (shape) {
		case "sphere":
			return (
				<mesh>
					<sphereGeometry args={[0.5, 12, 12]} />
					{mat}
				</mesh>
			);
		case "box":
			return (
				<mesh>
					<boxGeometry args={[0.9, 0.9, 0.9]} />
					{mat}
				</mesh>
			);
		case "cylinder":
			return (
				<mesh>
					<cylinderGeometry args={[0.4, 0.4, 1, 16]} />
					{mat}
				</mesh>
			);
		case "elongated":
			return (
				<group>
					<mesh>
						<cylinderGeometry args={[0.3, 0.3, 1.8, 16]} />
						{mat}
					</mesh>
				</group>
			);
		case "wedge":
			return (
				<mesh>
					<coneGeometry args={[0.5, 1, 4]} />
					{mat}
				</mesh>
			);
		case "cone":
			return (
				<group>
					<mesh>
						<coneGeometry args={[0.4, 1, 16]} />
						{mat}
					</mesh>
					<mesh position={[0, 0.7, 0]}>
						<sphereGeometry args={[0.35, 12, 12]} />
						<meshBasicMaterial color={color} />
					</mesh>
				</group>
			);
		case "small-sphere":
			return (
				<mesh>
					<sphereGeometry args={[0.3, 10, 10]} />
					{mat}
				</mesh>
			);
		case "irregular":
			return (
				<mesh>
					<boxGeometry args={[0.9, 0.7, 1.1]} />
					{mat}
				</mesh>
			);
	}
}

export const Ingredient3D = ({
	shape,
	color,
	position,
	scale,
}: Ingredient3DProps) => {
	return (
		<group
			position={position}
			scale={scale !== undefined ? [scale, scale, scale] : undefined}
		>
			<ShapeMesh shape={shape} color={color} />
		</group>
	);
};
