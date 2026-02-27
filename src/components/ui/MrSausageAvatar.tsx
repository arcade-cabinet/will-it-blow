import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { MR_SAUSAGE_LINES } from "../../engine/Constants";
import type { GamePhase } from "../../engine/Constants";
import { useGame } from "../../engine/GameEngine";

type Mood =
	| "thinking"
	| "excited"
	| "singing"
	| "nervous"
	| "shocked"
	| "proud"
	| "disgusted";

const MOOD_EMOJI: Record<Mood, string> = {
	thinking: "\u{1F914}",
	excited: "\u{1F606}",
	singing: "\u{1F3A4}",
	nervous: "\u{1F62C}",
	shocked: "\u{1F631}",
	proud: "\u{1F60E}",
	disgusted: "\u{1F922}",
};

function pickRandom(arr: string[]): string {
	return arr[Math.floor(Math.random() * arr.length)];
}

export const MrSausageAvatar: React.FC = () => {
	const { phase, hasBurst, sausageRating } = useGame();

	// --- Mood derivation ---
	const mood: Mood = useMemo(() => {
		switch (phase) {
			case "title":
			case "select":
				return "thinking";
			case "grind":
				return "excited";
			case "stuff":
				return "singing";
			case "blow":
				return "nervous";
			case "cook":
				return hasBurst ? "shocked" : "nervous";
			case "taste":
				return "nervous";
			case "results":
				return sausageRating >= 3 ? "proud" : "disgusted";
			default:
				return "thinking";
		}
	}, [phase, hasBurst, sausageRating]);

	// --- Speech line management ---
	const [speechLine, setSpeechLine] = useState("");
	const speechOpacity = useRef(new Animated.Value(1)).current;

	// Pick a line from the current phase's pool, falling back to select lines
	const getLinesForPhase = (p: GamePhase): string[] => {
		return MR_SAUSAGE_LINES[p] ?? MR_SAUSAGE_LINES.select;
	};

	// On phase change, immediately pick a new line with fade-in
	useEffect(() => {
		const lines = getLinesForPhase(phase);
		speechOpacity.setValue(0);
		setSpeechLine(pickRandom(lines));
		Animated.timing(speechOpacity, {
			toValue: 1,
			duration: 300,
			useNativeDriver: true,
		}).start();
	}, [phase]);

	// Cycle lines every 5 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			const lines = getLinesForPhase(phase);
			Animated.timing(speechOpacity, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}).start(() => {
				setSpeechLine(pickRandom(lines));
				Animated.timing(speechOpacity, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}).start();
			});
		}, 5000);

		return () => clearInterval(interval);
	}, [phase]);

	// --- Bobbing animation (sine wave, 3px amplitude, 600ms period) ---
	const bobValue = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		let rafId: number;
		let startTime: number | null = null;

		const animate = (timestamp: number) => {
			if (startTime === null) startTime = timestamp;
			const elapsed = timestamp - startTime;
			const sineVal = Math.sin((elapsed / 600) * 2 * Math.PI) * 3;
			bobValue.setValue(sineVal);
			rafId = requestAnimationFrame(animate);
		};

		rafId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(rafId);
	}, []);

	// --- Entry animation: slide up + scale ---
	const entryTranslateY = useRef(new Animated.Value(80)).current;
	const entryScale = useRef(new Animated.Value(0.5)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.spring(entryTranslateY, {
				toValue: 0,
				friction: 6,
				tension: 40,
				useNativeDriver: true,
			}),
			Animated.spring(entryScale, {
				toValue: 1,
				friction: 6,
				tension: 40,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	return (
		<Animated.View
			style={[
				styles.container,
				{
					transform: [
						{ translateY: Animated.add(bobValue, entryTranslateY) },
						{ scale: entryScale },
					],
				},
			]}
		>
			{/* Speech bubble */}
			<Animated.View style={[styles.speechBubble, { opacity: speechOpacity }]}>
				<Text style={styles.speechText}>{speechLine}</Text>
				{/* Triangle tail */}
				<View style={styles.speechTail} />
			</Animated.View>

			{/* Chef hat */}
			<View style={styles.chefHatContainer}>
				{/* Inner tall piece */}
				<View style={styles.chefHatInner} />
				{/* Outer brim */}
				<View style={styles.chefHatOuter} />
			</View>

			{/* Avatar circle */}
			<View style={styles.avatarCircle}>
				<Text style={styles.moodEmoji}>{MOOD_EMOJI[mood]}</Text>
			</View>

			{/* Name tag */}
			<Text style={styles.nameTag}>MR. SAUSAGE</Text>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		bottom: 16,
		left: 12,
		alignItems: "center",
		zIndex: 100,
	},

	// --- Speech bubble ---
	speechBubble: {
		backgroundColor: "rgba(30, 30, 30, 0.95)",
		borderColor: "#FF6B35",
		borderWidth: 2,
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 8,
		maxWidth: 200,
		marginBottom: 6,
		alignSelf: "center",
	},
	speechText: {
		color: "#FFFFFF",
		fontSize: 12,
		fontWeight: "700",
		fontFamily: "Bangers",
		textAlign: "center",
		lineHeight: 16,
	},
	speechTail: {
		position: "absolute",
		bottom: -8,
		left: 14,
		width: 0,
		height: 0,
		borderLeftWidth: 6,
		borderRightWidth: 6,
		borderTopWidth: 8,
		borderLeftColor: "transparent",
		borderRightColor: "transparent",
		borderTopColor: "#FF6B35",
	},

	// --- Chef hat ---
	chefHatContainer: {
		alignItems: "center",
		marginBottom: -4,
		zIndex: 2,
	},
	chefHatInner: {
		width: 16,
		height: 10,
		backgroundColor: "#FFFFFF",
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
	},
	chefHatOuter: {
		width: 28,
		height: 18,
		backgroundColor: "#FFFFFF",
		borderTopLeftRadius: 6,
		borderTopRightRadius: 6,
		borderBottomLeftRadius: 2,
		borderBottomRightRadius: 2,
	},

	// --- Avatar circle ---
	avatarCircle: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: "#FF6B35",
		borderWidth: 3,
		borderColor: "#FFD54F",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#FF6B35",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.5,
		shadowRadius: 10,
		elevation: 8,
	},
	moodEmoji: {
		fontSize: 26,
	},

	// --- Name tag ---
	nameTag: {
		color: "#FFD54F",
		fontSize: 9,
		fontWeight: "900",
		fontFamily: "Bangers",
		letterSpacing: 1.5,
		marginTop: 2,
		textAlign: "center",
	},
});
