import React, { useCallback, useState } from "react";
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
import { IngredientChallenge } from "./src/components/challenges/IngredientChallenge";
import { GrindingChallenge } from "./src/components/challenges/GrindingChallenge";
import { StuffingChallenge } from "./src/components/challenges/StuffingChallenge";
import type { Reaction } from "./src/components/characters/reactions";

const GameUI = () => {
	const { gameStatus, currentChallenge, completeChallenge } = useGameStore();
	const { currentWaypoint, navigateTo } = useNavigationStore();
	const [mrSausageReaction, setMrSausageReaction] = useState<Reaction>("idle");

	const handleIngredientReaction = useCallback((reaction: Reaction) => {
		setMrSausageReaction(reaction);
	}, []);

	const isIngredientChallenge =
		gameStatus === "playing" && currentChallenge === 0;
	const isGrindingChallenge =
		gameStatus === "playing" && currentChallenge === 1;
	const isStuffingChallenge =
		gameStatus === "playing" && currentChallenge === 2;

	return (
		<View style={styles.overlay} pointerEvents="box-none">
			{gameStatus === "menu" && <TitleScreen />}

			{gameStatus === "playing" && (
				<>
					<ChallengeHeader />
					<StrikeCounter />
					{!isIngredientChallenge && !isGrindingChallenge && !isStuffingChallenge && (
						<HintButton
							onHint={() => {
								/* TODO: trigger hint glow in scene */
							}}
						/>
					)}
					<WaypointNavigator
						currentWaypoint={currentWaypoint}
						onNavigate={(id) => navigateTo?.(id)}
					/>

					{/* Challenge overlays */}
					{isIngredientChallenge && (
						<IngredientChallenge
							onComplete={completeChallenge}
							onReaction={handleIngredientReaction}
						/>
					)}
					{isGrindingChallenge && (
						<GrindingChallenge
							onComplete={completeChallenge}
							onReaction={handleIngredientReaction}
						/>
					)}
					{isStuffingChallenge && (
						<StuffingChallenge
							onComplete={completeChallenge}
							onReaction={handleIngredientReaction}
						/>
					)}
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
