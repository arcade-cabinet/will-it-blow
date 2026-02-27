import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GRINDER_TURN_ON_ITEMS } from "../../engine/Constants";
import { useGame } from "../../engine/GameEngine";
import { ProgressBar } from "./ProgressBar";
import { SfxText } from "./SfxText";

export const GrindOverlay: React.FC = () => {
	const { grindProgress, setPhase } = useGame();

	const [grinderOn, setGrinderOn] = useState(false);
	const [turnOnItem] = useState(
		() =>
			GRINDER_TURN_ON_ITEMS[
				Math.floor(Math.random() * GRINDER_TURN_ON_ITEMS.length)
			],
	);

	const done = grindProgress >= 100;

	// Auto-transition to stuff phase when fully ground
	useEffect(() => {
		if (done) {
			const timer = setTimeout(() => setPhase("stuff"), 600);
			return () => clearTimeout(timer);
		}
	}, [done, setPhase]);

	const handleTurnOn = () => {
		setGrinderOn(true);
	};

	// Turn-on screen — centered CTA
	if (!grinderOn) {
		return (
			<View style={styles.centeredContainer}>
				<Text style={styles.phaseTitle}>GRIND PHASE</Text>
				<Text style={styles.grinderEmoji}>&#x2699;&#xFE0F;</Text>
				<Text style={styles.turnOnText}>
					Mr. Sausage turns on the grinder with...
				</Text>
				<TouchableOpacity
					style={styles.turnOnButton}
					onPress={handleTurnOn}
					activeOpacity={0.7}
				>
					<Text style={styles.turnOnButtonText}>{turnOnItem}</Text>
				</TouchableOpacity>
			</View>
		);
	}

	// Active grinding — instruction at top, progress at bottom, center clear for 3D
	return (
		<View style={styles.gameplayContainer} pointerEvents="box-none">
			{/* Top: instruction */}
			<View style={styles.topSection}>
				<Text style={styles.instruction}>
					Drag and fling ingredients into the grinder!
				</Text>
				{done && <Text style={styles.doneText}>FULLY GROUND!</Text>}
			</View>

			{/* Bottom: progress bar */}
			<View style={styles.bottomSection}>
				<View style={styles.progressContainer}>
					<ProgressBar
						value={grindProgress}
						max={100}
						color="#FF6B35"
						label="GRIND PROGRESS"
					/>
				</View>
			</View>

			<SfxText
				texts={[
					"BZZZZZ!",
					"GRRRND!",
					"CRUNCH!",
					"*grinding*",
					"WHIRRRR!",
				]}
				active={grinderOn && !done}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	centeredContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
	},
	gameplayContainer: {
		flex: 1,
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 60,
		paddingBottom: 30,
		paddingHorizontal: 20,
	},
	topSection: {
		alignItems: "center",
		width: "100%",
	},
	bottomSection: {
		alignItems: "center",
		width: "100%",
	},
	phaseTitle: {
		fontSize: 36,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FFD54F",
		letterSpacing: 3,
		textShadowColor: "rgba(0, 0, 0, 0.5)",
		textShadowOffset: { width: 2, height: 2 },
		textShadowRadius: 4,
		marginBottom: 16,
	},
	grinderEmoji: {
		fontSize: 64,
		marginBottom: 16,
	},
	turnOnText: {
		fontSize: 18,
		color: "#FFFFFF",
		fontFamily: "Bangers",
		textAlign: "center",
		marginBottom: 20,
	},
	turnOnButton: {
		backgroundColor: "#FF6B35",
		paddingHorizontal: 32,
		paddingVertical: 16,
		borderRadius: 12,
		shadowColor: "#FF6B35",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.5,
		shadowRadius: 10,
		elevation: 6,
	},
	turnOnButtonText: {
		fontSize: 22,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FFFFFF",
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	instruction: {
		fontSize: 18,
		color: "#FFFFFF",
		fontFamily: "Bangers",
		textAlign: "center",
		letterSpacing: 1,
	},
	doneText: {
		fontSize: 24,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#4CAF50",
		marginTop: 8,
		textShadowColor: "rgba(76, 175, 80, 0.4)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 6,
	},
	progressContainer: {
		width: "100%",
		maxWidth: 300,
	},
});
