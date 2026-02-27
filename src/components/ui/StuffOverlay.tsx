import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useGame } from "../../engine/GameEngine";
import { ProgressBar } from "./ProgressBar";
import { SfxText } from "./SfxText";
import { CountdownOverlay } from "./CountdownOverlay";

export const StuffOverlay: React.FC = () => {
	const { stuffProgress, ingredients, tryButFirst } = useGame();
	const [subPhase, setSubPhase] = useState<"countdown" | "stuffing" | "done">(
		"countdown",
	);

	const firstIngredientColor =
		ingredients.length > 0 ? ingredients[0].color : "#8D6E63";

	const handleCountdownComplete = () => {
		setSubPhase("stuffing");
	};

	// Auto-transition when stuffProgress reaches 100
	useEffect(() => {
		if (stuffProgress >= 100 && subPhase === "stuffing") {
			setSubPhase("done");
			setTimeout(() => tryButFirst("blow"), 1000);
		}
	}, [stuffProgress]);

	return (
		<View style={styles.overlay}>
			{/* Title */}
			<Text style={styles.title}>STUFF THE CASING</Text>

			{/* Countdown overlay */}
			{subPhase === "countdown" && (
				<CountdownOverlay onComplete={handleCountdownComplete} />
			)}

			{/* Stuffing UI */}
			{(subPhase === "stuffing" || subPhase === "done") && (
				<View style={styles.stuffContainer}>
					{subPhase === "stuffing" && (
						<Text style={styles.instruction}>
							Drag the plunger to stuff the casing!
						</Text>
					)}

					{subPhase === "done" && (
						<Text style={styles.doneText}>PERFECTLY STUFFED!</Text>
					)}

					{/* Sausage casing visual (HUD indicator) */}
					<View style={styles.casingOuter}>
						{/* Left tie knot */}
						<Text style={styles.knotLeft}>{"\uD83E\uDEA2"}</Text>

						{/* Casing track */}
						<View style={styles.casingTrack}>
							<View
								style={[
									styles.casingFill,
									{
										width: `${Math.min(stuffProgress, 100)}%`,
										backgroundColor: firstIngredientColor,
									},
								]}
							/>
						</View>

						{/* Right tie knot -- appears when done */}
						{subPhase === "done" && (
							<Text style={styles.knotRight}>{"\uD83E\uDEA2"}</Text>
						)}
					</View>

					{/* Progress bar */}
					<View style={styles.progressContainer}>
						<ProgressBar
							value={stuffProgress}
							max={100}
							color="#8D6E63"
							label="SAUSAGE FULLNESS"
						/>
					</View>

					{/* SFX floating text */}
					<SfxText
						texts={[
							"SQUISH!",
							"SQUELCH!",
							"*stuffing*",
							"PACK!",
							"SQUEEZE!",
						]}
						active={subPhase === "stuffing"}
					/>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 100,
	},
	title: {
		fontSize: 32,
		fontWeight: "900",
		color: "#FFD54F",
		textAlign: "center",
		letterSpacing: 2,
		textShadowColor: "rgba(255, 213, 79, 0.5)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 12,
		marginBottom: 16,
	},
	stuffContainer: {
		width: "100%",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	instruction: {
		fontSize: 18,
		color: "#BDBDBD",
		textAlign: "center",
		marginBottom: 20,
	},
	doneText: {
		fontSize: 28,
		fontWeight: "900",
		color: "#4CAF50",
		textAlign: "center",
		marginBottom: 20,
		textShadowColor: "rgba(76, 175, 80, 0.5)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 10,
	},
	casingOuter: {
		flexDirection: "row",
		alignItems: "center",
		width: "100%",
		marginBottom: 24,
	},
	knotLeft: {
		fontSize: 28,
		marginRight: 4,
	},
	knotRight: {
		fontSize: 28,
		marginLeft: 4,
	},
	casingTrack: {
		flex: 1,
		height: 64,
		borderRadius: 32,
		backgroundColor: "#2A2A2A",
		borderWidth: 2,
		borderColor: "#444",
		overflow: "hidden",
		justifyContent: "center",
	},
	casingFill: {
		height: "100%",
		borderRadius: 30,
	},
	progressContainer: {
		width: "100%",
		marginBottom: 16,
	},
});
