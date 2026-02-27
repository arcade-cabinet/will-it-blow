import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { GameWorld } from "./src/components/GameWorld";
import { useGameStore } from "./src/store/gameStore";
import { useNavigationStore } from "./src/store/navigationStore";
import { TitleScreen } from "./src/components/ui/TitleScreen";
import { StrikeCounter } from "./src/components/ui/StrikeCounter";
import { HintButton } from "./src/components/ui/HintButton";
import { ChallengeHeader } from "./src/components/ui/ChallengeHeader";
import { GameOverScreen } from "./src/components/ui/GameOverScreen";
import { WaypointNavigator } from "./src/components/navigation/WaypointNavigator";

const GameUI = () => {
	const { gameStatus } = useGameStore();
	const { currentWaypoint, navigateTo } = useNavigationStore();

	return (
		<View style={styles.overlay} pointerEvents="box-none">
			{gameStatus === "menu" && <TitleScreen />}

			{gameStatus === "playing" && (
				<>
					<ChallengeHeader />
					<StrikeCounter />
					<HintButton
						onHint={() => {
							/* TODO: trigger hint glow in scene */
						}}
					/>
					<WaypointNavigator
						currentWaypoint={currentWaypoint}
						onNavigate={(id) => navigateTo?.(id)}
					/>
				</>
			)}

			{(gameStatus === "victory" || gameStatus === "defeat") && (
				<GameOverScreen />
			)}
		</View>
	);
};

export default function App() {
	return (
		<SafeAreaView style={styles.container}>
			<GameWorld />
			<GameUI />
		</SafeAreaView>
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
});
