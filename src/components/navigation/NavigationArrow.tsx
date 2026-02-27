import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { WaypointId } from "../../engine/WaypointGraph";

interface NavigationArrowProps {
	targetId: WaypointId;
	label: string;
	direction: "left" | "right" | "up" | "down";
	onPress: (targetId: WaypointId) => void;
}

const ARROW_CHARS: Record<NavigationArrowProps["direction"], string> = {
	left: "\u25C0",
	right: "\u25B6",
	up: "\u25B2",
	down: "\u25BC",
};

export function NavigationArrow({
	targetId,
	label,
	direction,
	onPress,
}: NavigationArrowProps) {
	return (
		<TouchableOpacity
			style={[styles.button, positionStyles[direction]]}
			onPress={() => onPress(targetId)}
			activeOpacity={0.7}
		>
			<View style={styles.inner}>
				<Text style={styles.arrow}>{ARROW_CHARS[direction]}</Text>
				<Text style={styles.label}>{label}</Text>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	button: {
		position: "absolute",
		backgroundColor: "rgba(0, 0, 0, 0.6)",
		borderWidth: 2,
		borderColor: "#FFC832",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		alignItems: "center",
		justifyContent: "center",
		minWidth: 60,
	},
	inner: {
		alignItems: "center",
	},
	arrow: {
		fontFamily: "Bangers",
		fontSize: 24,
		color: "#FFC832",
	},
	label: {
		fontFamily: "Bangers",
		fontSize: 12,
		color: "#FFFFFF",
		marginTop: 2,
	},
});

const positionStyles = StyleSheet.create({
	left: {
		left: 20,
		top: "45%",
	},
	right: {
		right: 20,
		top: "45%",
	},
	up: {
		top: 60,
		left: "45%",
	},
	down: {
		bottom: 60,
		left: "45%",
	},
});
