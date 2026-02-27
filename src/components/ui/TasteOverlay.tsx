import React, { useEffect, useRef, useState } from "react";
import {
	Animated,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { TASTE_QUOTES } from "../../engine/Constants";
import { useGame } from "../../engine/GameEngine";
import { calculateTasteRating } from "../../engine/SausagePhysics";
import { SausageRating } from "./SausageRating";

type SubPhase = "open" | "cutting" | "rating";

export const TasteOverlay: React.FC = () => {
	const { ingredients, hasBurst, setSausageRating, setPhase } = useGame();

	const [subPhase, setSubPhase] = useState<SubPhase>("open");
	const [localRating, setLocalRating] = useState<number | null>(null);

	// Cutting animation values
	const leftSlide = useRef(new Animated.Value(0)).current;
	const rightSlide = useRef(new Animated.Value(0)).current;
	const scissorsScale = useRef(new Animated.Value(0)).current;

	// Rating phase animation values
	const ratingFade = useRef(new Animated.Value(0)).current;
	const ratingNumberScale = useRef(new Animated.Value(0.5)).current;

	const firstIngredientColor =
		ingredients.length > 0 ? ingredients[0].color : "#8D6E63";

	const handleCut = () => {
		setSubPhase("cutting");

		// Animate halves sliding apart
		Animated.parallel([
			Animated.timing(leftSlide, {
				toValue: -20,
				duration: 500,
				useNativeDriver: true,
			}),
			Animated.timing(rightSlide, {
				toValue: 20,
				duration: 500,
				useNativeDriver: true,
			}),
		]).start();

		// Scissors pop-in after a short delay
		setTimeout(() => {
			Animated.spring(scissorsScale, {
				toValue: 1,
				friction: 4,
				tension: 120,
				useNativeDriver: true,
			}).start();
		}, 200);

		// After 1200ms, calculate and show rating
		setTimeout(() => {
			const rating = calculateTasteRating(ingredients, hasBurst);
			setLocalRating(rating);
			setSausageRating(rating);
			setSubPhase("rating");
		}, 1200);
	};

	// Fade in and scale animation for rating phase
	useEffect(() => {
		if (subPhase === "rating") {
			Animated.parallel([
				Animated.timing(ratingFade, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}),
				Animated.spring(ratingNumberScale, {
					toValue: 1,
					friction: 5,
					tension: 100,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [subPhase]);

	const getRatingColor = (rating: number): string => {
		if (rating >= 4) return "#4CAF50";
		if (rating >= 2) return "#FFD54F";
		return "#F44336";
	};

	return (
		<View style={styles.overlay}>
			{/* Title */}
			<Text style={styles.title}>TASTE TEST</Text>

			{/* OPEN sub-phase */}
			{subPhase === "open" && (
				<View style={styles.contentContainer}>
					<Text style={styles.subtitle}>
						Let's open it up and see how we did!
					</Text>

					{/* Visual sausage representation */}
					<View
						style={[
							styles.sausageVisual,
							{
								backgroundColor: firstIngredientColor,
							},
						]}
					>
						{/* Subtle highlight strip at top */}
						<View style={styles.sausageHighlight} />
					</View>

					{/* Cut button */}
					<TouchableOpacity
						style={styles.cutButton}
						onPress={handleCut}
						activeOpacity={0.7}
					>
						<Text style={styles.cutButtonText}>
							{"\uD83D\uDD2A"} CUT IT OPEN!
						</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* CUTTING sub-phase */}
			{subPhase === "cutting" && (
				<View style={styles.contentContainer}>
					<View style={styles.cuttingRow}>
						{/* Left half */}
						<Animated.View
							style={[
								styles.halfSausage,
								styles.halfSausageLeft,
								{
									backgroundColor: firstIngredientColor,
									transform: [{ translateX: leftSlide }],
								},
							]}
						>
							<View style={styles.sausageHighlightHalf} />
						</Animated.View>

						{/* Scissors emoji */}
						<Animated.Text
							style={[
								styles.scissorsEmoji,
								{
									transform: [{ scale: scissorsScale }],
								},
							]}
						>
							{"\u2702\uFE0F"}
						</Animated.Text>

						{/* Right half */}
						<Animated.View
							style={[
								styles.halfSausage,
								styles.halfSausageRight,
								{
									backgroundColor: firstIngredientColor,
									transform: [{ translateX: rightSlide }],
								},
							]}
						>
							<View style={styles.sausageHighlightHalf} />
						</Animated.View>
					</View>
				</View>
			)}

			{/* RATING sub-phase */}
			{subPhase === "rating" && localRating !== null && (
				<Animated.View
					style={[
						styles.contentContainer,
						{ opacity: ratingFade },
					]}
				>
					{/* Quote */}
					<Text style={styles.quoteText}>
						{TASTE_QUOTES[localRating]}
					</Text>

					{/* Sausage Rating component */}
					<View style={styles.ratingContainer}>
						<SausageRating count={localRating} size={34} />
					</View>

					{/* Large rating number */}
					<Animated.Text
						style={[
							styles.ratingNumber,
							{
								color: getRatingColor(localRating),
								transform: [{ scale: ratingNumberScale }],
							},
						]}
					>
						{localRating}/5
					</Animated.Text>

					{/* Results button */}
					<TouchableOpacity
						style={styles.resultsButton}
						onPress={() => setPhase("results")}
						activeOpacity={0.7}
					>
						<Text style={styles.resultsButtonText}>
							SEE FINAL RESULTS {"\uD83D\uDCCB"}
						</Text>
					</TouchableOpacity>
				</Animated.View>
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
		fontSize: 36,
		fontWeight: "900",
		color: "#FF6B35",
		textAlign: "center",
		letterSpacing: 3,
		textShadowColor: "rgba(255, 107, 53, 0.5)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 12,
		marginBottom: 12,
	},
	subtitle: {
		fontSize: 18,
		color: "#FFD54F",
		textAlign: "center",
		marginBottom: 24,
	},
	contentContainer: {
		width: "100%",
		alignItems: "center",
		paddingHorizontal: 24,
	},
	// --- Whole sausage visual ---
	sausageVisual: {
		width: 210,
		height: 55,
		borderRadius: 28,
		borderWidth: 3,
		borderColor: "#6D4C41",
		overflow: "hidden",
		marginBottom: 28,
		justifyContent: "flex-start",
	},
	sausageHighlight: {
		width: "100%",
		height: 12,
		backgroundColor: "rgba(255, 255, 255, 0.25)",
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
	},
	// --- Cut button ---
	cutButton: {
		backgroundColor: "#FF6B35",
		borderWidth: 3,
		borderColor: "#FFD54F",
		borderRadius: 16,
		paddingVertical: 16,
		paddingHorizontal: 40,
		shadowColor: "#FF6B35",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 10,
		elevation: 8,
	},
	cutButtonText: {
		color: "#FFFFFF",
		fontSize: 24,
		fontWeight: "900",
		textAlign: "center",
		letterSpacing: 1,
	},
	// --- Cutting animation ---
	cuttingRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginTop: 16,
	},
	halfSausage: {
		width: 100,
		height: 55,
		borderWidth: 3,
		borderColor: "#6D4C41",
		overflow: "hidden",
		justifyContent: "flex-start",
	},
	halfSausageLeft: {
		borderTopLeftRadius: 28,
		borderBottomLeftRadius: 28,
		borderTopRightRadius: 4,
		borderBottomRightRadius: 4,
	},
	halfSausageRight: {
		borderTopLeftRadius: 4,
		borderBottomLeftRadius: 4,
		borderTopRightRadius: 28,
		borderBottomRightRadius: 28,
	},
	sausageHighlightHalf: {
		width: "100%",
		height: 12,
		backgroundColor: "rgba(255, 255, 255, 0.25)",
	},
	scissorsEmoji: {
		fontSize: 36,
		marginHorizontal: 8,
	},
	// --- Rating phase ---
	quoteText: {
		fontSize: 18,
		fontStyle: "italic",
		color: "#cccccc",
		textAlign: "center",
		maxWidth: 320,
		marginBottom: 20,
	},
	ratingContainer: {
		marginBottom: 16,
	},
	ratingNumber: {
		fontSize: 56,
		fontWeight: "900",
		textAlign: "center",
		marginBottom: 28,
		textShadowColor: "rgba(0, 0, 0, 0.3)",
		textShadowOffset: { width: 0, height: 2 },
		textShadowRadius: 6,
	},
	resultsButton: {
		backgroundColor: "#4CAF50",
		borderWidth: 3,
		borderColor: "#81C784",
		borderRadius: 16,
		paddingVertical: 16,
		paddingHorizontal: 36,
		shadowColor: "#4CAF50",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 10,
		elevation: 8,
	},
	resultsButtonText: {
		color: "#FFFFFF",
		fontSize: 20,
		fontWeight: "900",
		textAlign: "center",
		letterSpacing: 1,
	},
});
