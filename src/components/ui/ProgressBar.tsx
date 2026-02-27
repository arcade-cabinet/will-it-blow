import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface ProgressBarProps {
	value: number;
	max: number;
	color?: string;
	label?: string;
	height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
	value,
	max,
	color = "#FF6B35",
	label,
	height = 18,
}) => {
	const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
	const showGlow = percentage > 5;

	return (
		<View style={styles.container}>
			{label ? <Text style={styles.label}>{label}</Text> : null}
			<View style={[styles.track, { height }]}>
				<View
					style={[
						styles.fill,
						{
							width: `${percentage}%`,
							backgroundColor: color,
							height: "100%",
						},
						showGlow && {
							shadowColor: color,
							shadowOffset: { width: 0, height: 0 },
							shadowOpacity: 0.6,
							shadowRadius: 8,
							elevation: 6,
						},
					]}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: "100%",
	},
	label: {
		color: "#FFD54F",
		fontSize: 14,
		fontWeight: "900",
		fontFamily: "Bangers",
		letterSpacing: 1,
		marginBottom: 4,
		textTransform: "uppercase",
	},
	track: {
		width: "100%",
		backgroundColor: "#111",
		borderRadius: 9,
		borderWidth: 1,
		borderColor: "#2a2a2a",
		overflow: "hidden",
	},
	fill: {
		borderRadius: 8,
	},
});
