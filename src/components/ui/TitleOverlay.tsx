import React, { useEffect, useRef } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	Animated,
	StyleSheet,
} from "react-native";
import { useGame } from "../../engine/GameEngine";

export const TitleOverlay: React.FC = () => {
	const { setPhase } = useGame();

	// Fade-in / slide-up animation
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	// Sausage emoji rotation oscillation
	const rotateAnim = useRef(new Animated.Value(0)).current;

	// Title glow pulse
	const glowAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		// Mount fade-in: opacity 0->1, translateY 30->0 over 800ms
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 800,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 800,
				useNativeDriver: true,
			}),
		]).start();

		// Sausage rotation: gentle -5 to +5 degrees oscillation
		Animated.loop(
			Animated.sequence([
				Animated.timing(rotateAnim, {
					toValue: 1,
					duration: 1200,
					useNativeDriver: true,
				}),
				Animated.timing(rotateAnim, {
					toValue: -1,
					duration: 1200,
					useNativeDriver: true,
				}),
			]),
		).start();

		// Glow pulse: alternate bright/dim every 1.2s
		Animated.loop(
			Animated.sequence([
				Animated.timing(glowAnim, {
					toValue: 1,
					duration: 1200,
					useNativeDriver: false,
				}),
				Animated.timing(glowAnim, {
					toValue: 0,
					duration: 1200,
					useNativeDriver: false,
				}),
			]),
		).start();
	}, []);

	const rotation = rotateAnim.interpolate({
		inputRange: [-1, 1],
		outputRange: ["-5deg", "5deg"],
	});

	const textShadowOpacity = glowAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [0.4, 1],
	});

	const handleStart = () => {
		setPhase("select");
	};

	return (
		<Animated.View
			style={[
				styles.overlay,
				{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				},
			]}
		>
			<View style={styles.content}>
				{/* Sausage emoji with rotation */}
				<Animated.View style={{ transform: [{ rotate: rotation }] }}>
					<Text style={styles.sausageEmoji}>{"\uD83C\uDF2D"}</Text>
				</Animated.View>

				{/* Title text with pulsing glow */}
				<Animated.View style={{ opacity: textShadowOpacity }}>
					<View style={styles.titleGlow} />
				</Animated.View>
				<Text style={styles.titleOrdinary}>ORDINARY</Text>
				<Text style={styles.titleSausage}>SAUSAGE</Text>

				{/* Subtitle */}
				<Text style={styles.subtitle}>{"\u2605"} THE GAME {"\u2605"}</Text>

				{/* Description */}
				<Text style={styles.description}>
					Grind it. Stuff it. Blow it. Cook it. Rate it.{"\n"}Can you become the
					Sausage King?
				</Text>

				{/* Start button */}
				<TouchableOpacity
					style={styles.button}
					onPress={handleStart}
					activeOpacity={0.8}
				>
					<Text style={styles.buttonText}>LET'S SAUSAGE!</Text>
				</TouchableOpacity>

				{/* Attribution */}
				<Text style={styles.attribution}>
					Based on the YouTube series by Mr. Sausage
				</Text>
			</View>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.3)",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 100,
	},
	content: {
		alignItems: "center",
		paddingHorizontal: 24,
	},
	sausageEmoji: {
		fontSize: 80,
		textAlign: "center",
		marginBottom: 12,
	},
	titleGlow: {
		position: "absolute",
		top: -20,
		left: -40,
		right: -40,
		bottom: -20,
		backgroundColor: "#FF6B35",
		opacity: 0.15,
		borderRadius: 40,
	},
	titleOrdinary: {
		fontSize: 48,
		fontWeight: "bold",
		color: "#FF6B35",
		textAlign: "center",
		letterSpacing: 2,
		textShadowColor: "#FF6B35",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 20,
		lineHeight: 54,
	},
	titleSausage: {
		fontSize: 52,
		fontWeight: "bold",
		color: "#FF6B35",
		textAlign: "center",
		letterSpacing: 4,
		textShadowColor: "#FF6B35",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 20,
		marginBottom: 8,
		lineHeight: 58,
	},
	subtitle: {
		fontSize: 22,
		fontWeight: "bold",
		color: "#FFD54F",
		letterSpacing: 3,
		textAlign: "center",
		marginBottom: 16,
	},
	description: {
		fontSize: 15,
		color: "#888",
		textAlign: "center",
		lineHeight: 22,
		marginBottom: 28,
		paddingHorizontal: 20,
	},
	button: {
		backgroundColor: "#FF6B35",
		borderWidth: 2,
		borderColor: "#FFD54F",
		borderRadius: 14,
		paddingVertical: 16,
		paddingHorizontal: 52,
		marginBottom: 24,
		shadowColor: "#FF6B35",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 12,
		elevation: 8,
	},
	buttonText: {
		color: "#FFFFFF",
		fontSize: 28,
		fontWeight: "bold",
		textAlign: "center",
		letterSpacing: 1,
	},
	attribution: {
		fontSize: 12,
		color: "#666",
		fontStyle: "italic",
		textAlign: "center",
	},
});
