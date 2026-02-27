import React, { useEffect, useMemo, useRef } from "react";
import {
	Animated,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useGame } from "../../engine/GameEngine";
import {
	calculateFinalScore,
	getTitleTier,
} from "../../engine/SausagePhysics";
import { audioEngine } from "../../engine/AudioEngine";
import { SausageRating } from "./SausageRating";
import { RuffaloRating } from "./RuffaloRating";

const CONFETTI_EMOJIS = [
	"\uD83C\uDF2D",
	"\uD83C\uDF89",
	"\u2B50",
	"\uD83D\uDD25",
	"\u2728",
	"\uD83C\uDFC6",
];
const CONFETTI_COUNT = 35;

export const ResultsScreen: React.FC = () => {
	const {
		ingredients,
		sausageRating,
		ruffalos,
		hasBurst,
		bonusPoints,
		resetGame,
	} = useGame();

	const score = useMemo(
		() => calculateFinalScore(sausageRating, ruffalos, hasBurst, bonusPoints),
		[sausageRating, ruffalos, hasBurst, bonusPoints],
	);
	const titleTier = useMemo(() => getTitleTier(score), [score]);

	// Score scale-in animation
	const scoreScale = useRef(new Animated.Value(0.5)).current;

	// Confetti animated values
	const confettiAnims = useRef(
		Array.from({ length: CONFETTI_COUNT }, () => ({
			translateX: new Animated.Value(0),
			translateY: new Animated.Value(0),
			opacity: new Animated.Value(1),
			emoji:
				CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
			startX: Math.random() * 300 - 150,
			startY: Math.random() * 300 - 150,
		})),
	).current;

	useEffect(() => {
		// Play rating song on mount
		audioEngine.playRatingSong(sausageRating);

		// Animate score scale-in with 300ms delay
		const scoreTimeout = setTimeout(() => {
			Animated.spring(scoreScale, {
				toValue: 1,
				friction: 5,
				tension: 80,
				useNativeDriver: true,
			}).start();
		}, 300);

		// Confetti for high scores
		let confettiTimeout: ReturnType<typeof setTimeout> | undefined;
		if (score >= 60) {
			confettiTimeout = setTimeout(() => {
				const animations = confettiAnims.map((conf) => {
					conf.translateX.setValue(0);
					conf.translateY.setValue(0);
					conf.opacity.setValue(1);

					return Animated.parallel([
						Animated.spring(conf.translateX, {
							toValue: conf.startX,
							friction: 6,
							tension: 40,
							useNativeDriver: true,
						}),
						Animated.spring(conf.translateY, {
							toValue: conf.startY,
							friction: 6,
							tension: 40,
							useNativeDriver: true,
						}),
						Animated.timing(conf.opacity, {
							toValue: 0,
							duration: 2500,
							delay: 400,
							useNativeDriver: true,
						}),
					]);
				});

				Animated.parallel(animations).start();
			}, 600);
		}

		return () => {
			clearTimeout(scoreTimeout);
			if (confettiTimeout) clearTimeout(confettiTimeout);
		};
	}, []);

	const sausageName =
		ingredients.map((i) => i.name).join(" & ") + " Sausage";
	const ingredientEmojis = ingredients.map((i) => i.emoji).join(" ");

	const scoreColor =
		score >= 60 ? "#4CAF50" : score >= 30 ? "#FFD54F" : "#F44336";

	return (
		<ScrollView
			style={styles.scrollView}
			contentContainerStyle={styles.scrollContent}
		>
			<View style={styles.container}>
				{/* Confetti layer */}
				{score >= 60 && (
					<View style={styles.confettiContainer} pointerEvents="none">
						{confettiAnims.map((conf, index) => (
							<Animated.Text
								key={index}
								style={[
									styles.confettiPiece,
									{
										transform: [
											{ translateX: conf.translateX },
											{ translateY: conf.translateY },
										],
										opacity: conf.opacity,
									},
								]}
							>
								{conf.emoji}
							</Animated.Text>
						))}
					</View>
				)}

				{/* Title */}
				<Text style={styles.reportTitle}>SAUSAGE REPORT CARD</Text>

				{/* Card */}
				<View style={styles.card}>
					{/* Sausage name */}
					<Text style={styles.sausageName}>{sausageName}</Text>

					{/* Ingredient emojis -> arrow -> sausage */}
					<View style={styles.emojiRow}>
						<Text style={styles.emojiText}>{ingredientEmojis}</Text>
						<Text style={styles.arrowText}>{" \u2192 "}</Text>
						<Text style={styles.emojiText}>{"\uD83C\uDF2D"}</Text>
					</View>

					{/* Divider */}
					<View style={styles.divider} />

					{/* Taste Rating */}
					<View style={styles.section}>
						<Text style={styles.sectionLabel}>TASTE RATING</Text>
						<SausageRating count={sausageRating} max={5} size={28} />
						<Text style={styles.ratingNumber}>
							{sausageRating}/5
						</Text>
					</View>

					{/* Will It Blow Rating */}
					<View style={styles.section}>
						<Text style={styles.sectionLabel}>WILL IT BLOW? RATING</Text>
						<RuffaloRating count={ruffalos} />
						<Text style={styles.ruffaloText}>
							{ruffalos} Mark Ruffalos
						</Text>
					</View>

					{/* Burst Status */}
					<View style={styles.statusRow}>
						<Text style={styles.statusLabel}>BURST STATUS</Text>
						<Text
							style={[
								styles.statusValue,
								{ color: hasBurst ? "#F44336" : "#4CAF50" },
							]}
						>
							{hasBurst
								? "\uD83D\uDCA5 BURST!"
								: "\u2705 NO BURST!"}
						</Text>
					</View>

					{/* Bonus Points */}
					{bonusPoints > 0 && (
						<View style={styles.statusRow}>
							<Text style={styles.statusLabel}>BUT FIRST! BONUS</Text>
							<Text style={styles.bonusValue}>
								{"\uD83C\uDFA8"} +{bonusPoints}%
							</Text>
						</View>
					)}

					{/* Divider */}
					<View style={styles.divider} />

					{/* Overall Score */}
					<View style={styles.scoreSection}>
						<Text style={styles.overallLabel}>OVERALL SCORE</Text>
						<Animated.Text
							style={[
								styles.scoreNumber,
								{
									color: scoreColor,
									transform: [
										{ scale: scoreScale as unknown as number },
									],
								},
							]}
						>
							{score}
						</Animated.Text>
						<Text style={styles.titleTier}>{titleTier}</Text>
					</View>
				</View>

				{/* Play Again Button */}
				<TouchableOpacity
					style={styles.playAgainButton}
					onPress={resetGame}
					activeOpacity={0.8}
				>
					<Text style={styles.playAgainText}>
						{"\uD83C\uDF2D"} MAKE ANOTHER SAUSAGE! {"\uD83C\uDF2D"}
					</Text>
				</TouchableOpacity>

				{/* Subscribe text */}
				<Text style={styles.subscribeText}>
					Subscribe to Ordinary Sausage on YouTube for more sausage madness!
				</Text>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	scrollView: {
		flex: 1,
		backgroundColor: "#0A0A0A",
	},
	scrollContent: {
		flexGrow: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 30,
	},
	container: {
		width: "100%",
		alignItems: "center",
		paddingHorizontal: 20,
	},
	confettiContainer: {
		position: "absolute",
		top: "40%",
		left: "50%",
		width: 0,
		height: 0,
		alignItems: "center",
		justifyContent: "center",
		zIndex: 50,
	},
	confettiPiece: {
		position: "absolute",
		fontSize: 22,
	},
	reportTitle: {
		fontSize: 28,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FF6B35",
		letterSpacing: 3,
		textShadowColor: "rgba(255, 107, 53, 0.4)",
		textShadowOffset: { width: 0, height: 2 },
		textShadowRadius: 6,
		textAlign: "center",
		marginBottom: 18,
	},
	card: {
		width: "100%",
		maxWidth: 400,
		backgroundColor: "#141414",
		borderRadius: 18,
		padding: 22,
		borderWidth: 1,
		borderColor: "#252525",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.5,
		shadowRadius: 16,
		elevation: 10,
	},
	sausageName: {
		fontSize: 22,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FFD54F",
		textAlign: "center",
		letterSpacing: 1,
		marginBottom: 10,
	},
	emojiRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 14,
		flexWrap: "wrap",
	},
	emojiText: {
		fontSize: 26,
		textAlign: "center",
	},
	arrowText: {
		fontSize: 22,
		color: "#666",
		marginHorizontal: 6,
	},
	divider: {
		height: 1,
		backgroundColor: "#252525",
		marginVertical: 14,
	},
	section: {
		alignItems: "center",
		marginBottom: 16,
	},
	sectionLabel: {
		fontSize: 14,
		fontWeight: "700",
		fontFamily: "Bangers",
		color: "#888",
		letterSpacing: 2,
		marginBottom: 8,
		textAlign: "center",
	},
	ratingNumber: {
		fontSize: 20,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FFD54F",
		marginTop: 6,
		textAlign: "center",
	},
	ruffaloText: {
		fontSize: 16,
		fontWeight: "700",
		fontFamily: "Bangers",
		color: "#4CAF50",
		marginTop: 6,
		textAlign: "center",
	},
	statusRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 10,
		paddingHorizontal: 4,
	},
	statusLabel: {
		fontSize: 14,
		fontWeight: "700",
		fontFamily: "Bangers",
		color: "#888",
		letterSpacing: 1,
	},
	statusValue: {
		fontSize: 18,
		fontWeight: "900",
		fontFamily: "Bangers",
		letterSpacing: 1,
	},
	bonusValue: {
		fontSize: 18,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FFD54F",
		letterSpacing: 1,
	},
	scoreSection: {
		alignItems: "center",
		paddingTop: 4,
	},
	overallLabel: {
		fontSize: 16,
		fontWeight: "700",
		fontFamily: "Bangers",
		color: "#888",
		letterSpacing: 2,
		marginBottom: 4,
		textAlign: "center",
	},
	scoreNumber: {
		fontSize: 52,
		fontWeight: "900",
		fontFamily: "Bangers",
		letterSpacing: 2,
		textShadowOffset: { width: 0, height: 2 },
		textShadowRadius: 10,
		textAlign: "center",
	},
	titleTier: {
		fontSize: 22,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FF6B35",
		letterSpacing: 1,
		textShadowColor: "rgba(255, 107, 53, 0.3)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 4,
		marginTop: 4,
		textAlign: "center",
	},
	playAgainButton: {
		backgroundColor: "#FF6B35",
		borderWidth: 2,
		borderColor: "#FFD54F",
		borderRadius: 14,
		paddingVertical: 16,
		paddingHorizontal: 36,
		marginTop: 24,
		shadowColor: "#FF6B35",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 12,
		elevation: 8,
	},
	playAgainText: {
		color: "#FFFFFF",
		fontSize: 22,
		fontWeight: "900",
		fontFamily: "Bangers",
		textAlign: "center",
		letterSpacing: 1,
	},
	subscribeText: {
		fontSize: 12,
		color: "#555",
		fontStyle: "italic",
		textAlign: "center",
		marginTop: 18,
		paddingHorizontal: 30,
	},
});
