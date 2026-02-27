import React from "react";
import { View, StyleSheet } from "react-native";
import {
	getWaypoint,
	getConnections,
	type WaypointId,
} from "../../engine/WaypointGraph";
import { NavigationArrow } from "./NavigationArrow";

interface WaypointNavigatorProps {
	currentWaypoint: WaypointId;
	onNavigate: (to: WaypointId) => void;
	disabled?: boolean;
}

type Direction = "left" | "right" | "up" | "down";

function getDirection(
	current: [number, number, number],
	target: [number, number, number],
): Direction {
	const dx = target[0] - current[0];
	const dz = target[2] - current[2];

	if (Math.abs(dx) > Math.abs(dz)) {
		return dx < 0 ? "left" : "right";
	}
	return dz < 0 ? "up" : "down";
}

export function WaypointNavigator({
	currentWaypoint,
	onNavigate,
	disabled,
}: WaypointNavigatorProps) {
	if (disabled) return null;

	const current = getWaypoint(currentWaypoint);
	const connections = getConnections(currentWaypoint);

	return (
		<View style={styles.container} pointerEvents="box-none">
			{connections.map((connId) => {
				const target = getWaypoint(connId);
				const direction = getDirection(
					current.position,
					target.position,
				);
				return (
					<NavigationArrow
						key={connId}
						targetId={connId}
						label={target.label}
						direction={direction}
						onPress={onNavigate}
					/>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		zIndex: 15,
	},
});
