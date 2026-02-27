import React, { useEffect, useRef, useState } from "react";
import {
	Animated,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { audioEngine } from "../../engine/AudioEngine";
import { useGame } from "../../engine/GameEngine";
import { checkBurst } from "../../engine/SausagePhysics";
import { ProgressBar } from "./ProgressBar";
import { SfxText } from "./SfxText";

export const CookOverlay: React.FC = () => {
	const {
		cookProgress,
		setCookProgress,
		hasBurst,
		setHasBurst,
		setPhase,
		ingredients,
	} = useGame();

	const [cooking, setCooking] = useState(false);
	const [burstChecked, setBurstChecked] = useState(false);
	const [hereWeGo, setHereWeGo] = useState(true);

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const tickRef = useRef(0);
	const done = cookProgress >= 100;

	// --- "HERE WE GO!" slam animation ---
	const slamScale = useRef(new Animated.Value(0.3)).current;

	useEffect(() => {
		if (!hereWeGo) return;

		Animated.spring(slamScale, {
			toValue: 1,
			friction: 4,
			tension: 120,
			useNativeDriver: true,
		}).start();

		const timer = setTimeout(() => {
			setHereWeGo(false);
		}, 1500);

		return () => clearTimeout(timer);
	}, [hereWeGo, slamScale]);

	// --- Burst pulse animation ---
	const burstPulse = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		if (!hasBurst) return;

		const pulse = Animated.loop(
			Animated.sequence([
				Animated.timing(burstPulse, {
					toValue: 1.2,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.timing(burstPulse, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]),
		);
		pulse.start();

		return () => pulse.stop();
	}, [hasBurst, burstPulse]);

	// --- Cooking interval ---
	useEffect(() => {
		if (!cooking) return;

		intervalRef.current = setInterval(() => {
			tickRef.current += 1;

			setCookProgress((p: number) => {
				const next = Math.min(p + 1, 100);
				return next;
			});

			// Random sizzle sound (~every 3rd tick)
			if (Math.random() < 0.33) {
				audioEngine.playSizzle();
			}
		}, 80);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [cooking, setCookProgress]);

	// --- Burst check at cookProgress >= 40 ---
	useEffect(() => {
		if (cookProgress >= 40 && !burstChecked && cooking) {
			setBurstChecked(true);
			const didBurst = checkBurst(ingredients);
			if (didBurst) {
				setHasBurst(true);
				audioEngine.playBurst();
			}
		}
	}, [cookProgress, burstChecked, cooking, ingredients, setHasBurst]);

	// --- Done: transition to taste phase ---
	useEffect(() => {
		if (!done || !cooking) return;

		// Stop the cooking interval
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}

		const timer = setTimeout(() => {
			setPhase("taste");
		}, 800);

		return () => clearTimeout(timer);
	}, [done, cooking, setPhase]);

	// --- Cleanup on unmount ---
	useEffect(() => {
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, []);

	// --- "HERE WE GO!" phase ---
	if (hereWeGo) {
		return (
			<View style={styles.container}>
				<Animated.Text
					style={[
						styles.hereWeGoText,
						{ transform: [{ scale: slamScale as unknown as number }] },
					]}
				>
					HERE WE GO!
				</Animated.Text>
			</View>
		);
	}

	// --- Pre-cooking: show start button ---
	if (!cooking) {
		return (
			<View style={styles.container}>
				<Text style={styles.phaseTitle}>COOK THE SAUSAGE</Text>
				<TouchableOpacity
					style={styles.startButton}
					onPress={() => setCooking(true)}
					activeOpacity={0.7}
				>
					<Text style={styles.startButtonText}>START COOKING! 🔥</Text>
				</TouchableOpacity>
			</View>
		);
	}

	// --- Active cooking UI ---
	// pointerEvents="box-none" allows touch to pass through to 3D canvas for sausage flip/drag
	return (
		<View style={styles.gameplayOverlay} pointerEvents="box-none">
			{/* Top section */}
			<View style={styles.topSection}>
				<Text style={styles.phaseTitle}>COOK THE SAUSAGE</Text>

				{!done && !hasBurst && (
					<Text style={styles.instruction}>
						Click the sausage to flip it!
					</Text>
				)}

				{hasBurst && (
					<View style={styles.burstContainer}>
						<Animated.Text
							style={[
								styles.burstText,
								{
									transform: [
										{
											scale: burstPulse as unknown as number,
										},
									],
								},
							]}
						>
							BURST!
						</Animated.Text>
						<Text style={styles.burstSubtext}>
							Oh, we got a burst!
						</Text>
					</View>
				)}

				{done && (
					<Text style={styles.doneText}>
						{hasBurst ? "COOKED (with a burst!)" : "COOKED PERFECTLY!"}
					</Text>
				)}
			</View>

			{/* Bottom section */}
			<View style={styles.bottomSection}>
				<View style={styles.progressContainer}>
					<ProgressBar
						value={cookProgress}
						max={100}
						color={hasBurst ? "#F44336" : "#FF6B35"}
						label="COOK PROGRESS"
					/>
				</View>
			</View>

			<SfxText
				texts={[
					"SIZZLE!",
					"CRACKLE!",
					"*sizzling*",
					"POP!",
					"TSSSSS!",
					"HISSSSS!",
				]}
				active={cooking && !done}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
	},
	gameplayOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 60,
		paddingBottom: 30,
		paddingHorizontal: 24,
		zIndex: 100,
	},
	topSection: {
		alignItems: "center",
		width: "100%",
	},
	bottomSection: {
		alignItems: "center",
		width: "100%",
	},
	hereWeGoText: {
		fontSize: 52,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FFD54F",
		letterSpacing: 4,
		textShadowColor: "rgba(0, 0, 0, 0.7)",
		textShadowOffset: { width: 3, height: 3 },
		textShadowRadius: 6,
	},
	phaseTitle: {
		fontSize: 32,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FF6B35",
		letterSpacing: 3,
		textShadowColor: "rgba(0, 0, 0, 0.5)",
		textShadowOffset: { width: 2, height: 2 },
		textShadowRadius: 4,
		marginBottom: 8,
	},
	instruction: {
		fontSize: 18,
		color: "#FFFFFF",
		fontFamily: "Bangers",
		textAlign: "center",
		letterSpacing: 1,
		marginTop: 4,
	},
	startButton: {
		backgroundColor: "#F44336",
		paddingHorizontal: 36,
		paddingVertical: 18,
		borderRadius: 12,
		borderWidth: 3,
		borderColor: "#EF9A9A",
		shadowColor: "#F44336",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.5,
		shadowRadius: 12,
		elevation: 6,
	},
	startButtonText: {
		fontSize: 24,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FFFFFF",
		letterSpacing: 2,
		textTransform: "uppercase",
	},
	burstContainer: {
		alignItems: "center",
		marginBottom: 16,
	},
	burstText: {
		fontSize: 36,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#F44336",
		letterSpacing: 3,
		textShadowColor: "rgba(244, 67, 54, 0.5)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 8,
	},
	burstSubtext: {
		fontSize: 18,
		fontWeight: "700",
		fontFamily: "Bangers",
		color: "#FFCDD2",
		marginTop: 4,
		letterSpacing: 1,
	},
	doneText: {
		fontSize: 24,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#4CAF50",
		marginBottom: 12,
		textShadowColor: "rgba(76, 175, 80, 0.4)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 6,
	},
	progressContainer: {
		width: "100%",
	},
});
