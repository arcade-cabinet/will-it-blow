import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { audioEngine } from "../../engine/AudioEngine";
import { SONGS } from "../../engine/Constants";

interface CountdownOverlayProps {
	onComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
	onComplete,
}) => {
	const [phase, setPhase] = useState<"countdown" | "singing" | "done">(
		"countdown",
	);
	const [count, setCount] = useState(3);
	const [song] = useState(
		() => SONGS[Math.floor(Math.random() * SONGS.length)],
	);

	// Animated values for number pop-in
	const scaleAnim = useRef(new Animated.Value(0.5)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;

	// Animated values for song text fade
	const songOpacity = useRef(new Animated.Value(0)).current;

	// Pop-in animation for each countdown number
	useEffect(() => {
		if (phase !== "countdown") return;

		// Reset and animate for each number
		scaleAnim.setValue(0.5);
		opacityAnim.setValue(0);

		Animated.parallel([
			Animated.timing(scaleAnim, {
				toValue: 1,
				duration: 400,
				useNativeDriver: true,
			}),
			Animated.timing(opacityAnim, {
				toValue: 1,
				duration: 400,
				useNativeDriver: true,
			}),
		]).start();

		if (count > 0) {
			audioEngine.playCountdownBeep();
		}
	}, [count, phase]);

	// Countdown timer: 3 -> 2 -> 1 -> 0 (LET'S SAUSAGE!)
	useEffect(() => {
		if (phase !== "countdown") return;

		if (count > 0) {
			const timer = setTimeout(() => {
				setCount((c) => c - 1);
			}, 800);
			return () => clearTimeout(timer);
		}

		// count === 0: show "LET'S SAUSAGE!" then transition to singing
		audioEngine.playCountdownBeep(true);
		const timer = setTimeout(() => {
			setPhase("singing");
		}, 800);
		return () => clearTimeout(timer);
	}, [count, phase]);

	// Singing phase: fade in/out song text over 2.5s, then complete
	useEffect(() => {
		if (phase !== "singing") return;

		songOpacity.setValue(0);
		Animated.sequence([
			Animated.timing(songOpacity, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.delay(1300),
			Animated.timing(songOpacity, {
				toValue: 0,
				duration: 600,
				useNativeDriver: true,
			}),
		]).start(() => {
			setPhase("done");
			onComplete();
		});
	}, [phase]);

	if (phase === "done") return null;

	return (
		<View style={styles.overlay}>
			{phase === "countdown" && (
				<Animated.View
					style={{
						transform: [{ scale: scaleAnim }],
						opacity: opacityAnim,
					}}
				>
					{count > 0 ? (
						<Text style={styles.countdownNumber}>{count}</Text>
					) : (
						<Text style={styles.letsSausage}>LET'S SAUSAGE!</Text>
					)}
				</Animated.View>
			)}

			{phase === "singing" && (
				<Animated.View style={{ opacity: songOpacity }}>
					<Text style={styles.songText}>{song}</Text>
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
		zIndex: 200,
	},
	countdownNumber: {
		fontSize: 100,
		fontWeight: "900",
		color: "#FFD54F",
		textAlign: "center",
		textShadowColor: "rgba(255, 213, 79, 0.6)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 20,
	},
	letsSausage: {
		fontSize: 44,
		fontWeight: "900",
		color: "#4CAF50",
		textAlign: "center",
		textShadowColor: "rgba(76, 175, 80, 0.6)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 16,
	},
	songText: {
		fontSize: 22,
		fontStyle: "italic",
		color: "#F48FB1",
		textAlign: "center",
		paddingHorizontal: 24,
		textShadowColor: "rgba(244, 143, 177, 0.4)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 10,
	},
});
