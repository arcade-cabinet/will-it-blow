import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { GameWorld } from "./src/components/GameWorld";
import { GameProvider, useGame } from "./src/engine/GameEngine";
import { TitleOverlay } from "./src/components/ui/TitleOverlay";
import { IngredientSelect } from "./src/components/ui/IngredientSelect";
import { GrindOverlay } from "./src/components/ui/GrindOverlay";
import { StuffOverlay } from "./src/components/ui/StuffOverlay";
import { BlowOverlay } from "./src/components/ui/BlowOverlay";
import { CookOverlay } from "./src/components/ui/CookOverlay";
import { TasteOverlay } from "./src/components/ui/TasteOverlay";
import { ResultsScreen } from "./src/components/ui/ResultsScreen";
import { MrSausageAvatar } from "./src/components/ui/MrSausageAvatar";
import { ButFirstEvent } from "./src/components/ui/ButFirstEvent";
import { PhaseTracker } from "./src/components/ui/PhaseTracker";

const GameUI = () => {
	const { phase, showButFirst } = useGame();
	const isPlaying =
		phase !== "title" && phase !== "results" && phase !== "select";

	return (
		<View style={styles.overlay} pointerEvents="box-none">
			{/* Phase tracker — visible during active gameplay */}
			{isPlaying && (
				<View style={styles.trackerContainer}>
					<PhaseTracker />
				</View>
			)}

			{/* Phase-specific overlays */}
			{phase === "title" && <TitleOverlay />}
			{phase === "select" && <IngredientSelect />}
			{phase === "grind" && <GrindOverlay />}
			{phase === "stuff" && <StuffOverlay />}
			{phase === "blow" && <BlowOverlay />}
			{phase === "cook" && <CookOverlay />}
			{phase === "taste" && <TasteOverlay />}
			{phase === "results" && <ResultsScreen />}

			{/* Mr. Sausage avatar — visible during all phases except title */}
			{phase !== "title" && !showButFirst && <MrSausageAvatar />}

			{/* BUT FIRST modal — takes over everything */}
			{showButFirst && <ButFirstEvent />}
		</View>
	);
};

export default function App() {
	return (
		<GameProvider>
			<SafeAreaView style={styles.container}>
				<GameWorld />
				<GameUI />
			</SafeAreaView>
		</GameProvider>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0a0a0a",
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		zIndex: 10,
	},
	trackerContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 20,
		backgroundColor: "rgba(10, 10, 10, 0.85)",
		borderBottomWidth: 1,
		borderBottomColor: "#1a1a1a",
	},
});
