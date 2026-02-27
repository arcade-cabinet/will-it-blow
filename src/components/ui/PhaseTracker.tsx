import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useGame } from "../../engine/GameEngine";
import {
	PHASE_STEPS,
	PHASE_LABELS,
	PHASE_EMOJIS,
} from "../../engine/Constants";

export const PhaseTracker: React.FC = () => {
	const { phase } = useGame();

	const currentIndex = PHASE_STEPS.indexOf(phase);

	return (
		<View style={styles.container}>
			{PHASE_STEPS.map((step, index) => {
				const isDone = currentIndex > index;
				const isActive = currentIndex === index;
				const isFuture = currentIndex < index;

				return (
					<React.Fragment key={step}>
						{/* Connector line before this step (skip the first) */}
						{index > 0 && (
							<View
								style={[
									styles.connector,
									{
										backgroundColor: isDone ? "#4CAF50" : "#333",
									},
								]}
							/>
						)}

						{/* Step circle + label */}
						<View style={styles.stepContainer}>
							<View
								style={[
									styles.circle,
									isActive && styles.circleActive,
									isDone && styles.circleDone,
									isFuture && styles.circleFuture,
								]}
							>
								<Text
									style={[
										styles.circleText,
										isActive && styles.circleTextActive,
										isDone && styles.circleTextDone,
										isFuture && styles.circleTextFuture,
									]}
								>
									{isDone ? "\u2713" : PHASE_EMOJIS[index]}
								</Text>
							</View>
							<Text
								style={[
									styles.label,
									isActive && styles.labelActive,
									isDone && styles.labelDone,
									isFuture && styles.labelFuture,
								]}
							>
								{PHASE_LABELS[index]}
							</Text>
						</View>
					</React.Fragment>
				);
			})}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 8,
		paddingHorizontal: 4,
	},
	stepContainer: {
		alignItems: "center",
		justifyContent: "center",
	},
	connector: {
		height: 3,
		flex: 1,
		minWidth: 16,
		maxWidth: 40,
		borderRadius: 1.5,
		marginHorizontal: 2,
		marginBottom: 18, // offset to align with circles (above labels)
	},
	circle: {
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
	},
	circleActive: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#FF6B35",
		borderColor: "#FF8A5C",
		shadowColor: "#FF6B35",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.6,
		shadowRadius: 8,
		elevation: 6,
	},
	circleDone: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "#4CAF50",
		borderColor: "#66BB6A",
	},
	circleFuture: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "#222",
		borderColor: "#333",
	},
	circleText: {
		fontSize: 14,
		textAlign: "center",
	},
	circleTextActive: {
		fontSize: 16,
	},
	circleTextDone: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "900",
	},
	circleTextFuture: {
		fontSize: 12,
		opacity: 0.5,
	},
	label: {
		marginTop: 4,
		fontSize: 10,
		fontWeight: "900",
		fontFamily: "Bangers",
		letterSpacing: 0.5,
		textTransform: "uppercase",
	},
	labelActive: {
		color: "#FF6B35",
	},
	labelDone: {
		color: "#4CAF50",
	},
	labelFuture: {
		color: "#555",
	},
});
