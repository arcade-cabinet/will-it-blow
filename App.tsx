import React, { useCallback, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { GameWorld } from "./src/components/GameWorld";
import { useGameStore } from "./src/store/gameStore";
import { installGovernor } from "./src/dev/GameGovernor";
import { TitleScreen } from "./src/components/ui/TitleScreen";
import { LoadingScreen } from "./src/components/ui/LoadingScreen";
import { StrikeCounter } from "./src/components/ui/StrikeCounter";
import { HintButton } from "./src/components/ui/HintButton";
import { ChallengeHeader } from "./src/components/ui/ChallengeHeader";
import { GameOverScreen } from "./src/components/ui/GameOverScreen";
import { IngredientChallenge } from "./src/components/challenges/IngredientChallenge";
import { GrindingChallenge } from "./src/components/challenges/GrindingChallenge";
import { StuffingChallenge } from "./src/components/challenges/StuffingChallenge";
import { CookingChallenge } from "./src/components/challenges/CookingChallenge";
import { TastingChallenge } from "./src/components/challenges/TastingChallenge";
import type { Reaction } from "./src/components/characters/reactions";

// Install dev-only test harness (gated behind __DEV__, no-op in production)
installGovernor();

const GameUI = () => {
	const { gameStatus, currentChallenge, completeChallenge } = useGameStore();
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
	const isCookingChallenge =
		gameStatus === "playing" && currentChallenge === 3;
	const isTastingChallenge =
		gameStatus === "playing" && currentChallenge === 4;

	return (
		<View style={styles.overlay} pointerEvents="box-none">
			{gameStatus === "playing" && (
				<>
					<ChallengeHeader />
					<StrikeCounter />
					{!isIngredientChallenge && !isGrindingChallenge && !isStuffingChallenge && !isCookingChallenge && !isTastingChallenge && (
						<HintButton onHint={() => useGameStore.getState().useHint()} />
					)}
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
					{isCookingChallenge && (
						<CookingChallenge
							onComplete={completeChallenge}
							onReaction={handleIngredientReaction}
						/>
					)}
					{isTastingChallenge && (
						<TastingChallenge
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
	const appPhase = useGameStore((s) => s.appPhase);

	return (
		<SafeAreaView style={styles.container}>
			{appPhase === "menu" && <TitleScreen />}
			{appPhase === "loading" && <LoadingScreen />}
			{appPhase === "playing" && (
				<>
					<GameWorld />
					<GameUI />
				</>
			)}
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
