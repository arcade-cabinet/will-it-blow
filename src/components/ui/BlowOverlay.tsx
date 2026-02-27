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
import { calculateBlowRuffalos } from "../../engine/SausagePhysics";
import { ProgressBar } from "./ProgressBar";
import { RuffaloRating } from "./RuffaloRating";
import { SfxText } from "./SfxText";

type SubPhase = "ready" | "blowing" | "watching" | "result";

interface Splat {
	id: number;
	x: number;
	y: number;
	size: number;
	color: string;
}

export const BlowOverlay: React.FC = () => {
	const { ingredients, setRuffalos, tryButFirst } = useGame();

	const [subPhase, setSubPhase] = useState<SubPhase>("ready");
	const [holdStart, setHoldStart] = useState<number | null>(null);
	const [holdPower, setHoldPower] = useState(0);
	const [localRuffalos, setLocalRuffalos] = useState(0);
	const [splats, setSplats] = useState<Splat[]>([]);

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Wobble animation for the wind emoji
	const wobbleAnim = useRef(new Animated.Value(0)).current;
	// Pop-in animation for the result text
	const popAnim = useRef(new Animated.Value(0)).current;

	// Start wobble animation
	useEffect(() => {
		const speed = subPhase === "blowing" ? 200 : 600;
		const wobble = Animated.loop(
			Animated.sequence([
				Animated.timing(wobbleAnim, {
					toValue: 1,
					duration: speed,
					useNativeDriver: true,
				}),
				Animated.timing(wobbleAnim, {
					toValue: -1,
					duration: speed,
					useNativeDriver: true,
				}),
			]),
		);
		wobble.start();
		return () => wobble.stop();
	}, [subPhase, wobbleAnim]);

	// Pop-in animation when result appears
	useEffect(() => {
		if (subPhase === "result") {
			popAnim.setValue(0);
			Animated.spring(popAnim, {
				toValue: 1,
				friction: 4,
				tension: 80,
				useNativeDriver: true,
			}).start();
		}
	}, [subPhase, popAnim]);

	const wobbleRotation = wobbleAnim.interpolate({
		inputRange: [-1, 1],
		outputRange: ["-10deg", "10deg"],
	});

	const popScale = popAnim.interpolate({
		inputRange: [0, 0.5, 0.8, 1],
		outputRange: [0, 1.3, 0.9, 1],
	});

	const handlePressIn = () => {
		setSubPhase("blowing");
		setHoldStart(Date.now());
		setHoldPower(0);
		audioEngine.startBlowWhoosh();

		intervalRef.current = setInterval(() => {
			setHoldPower((prev) => Math.min(prev + 2, 100));
		}, 30);
	};

	const handlePressOut = () => {
		// Stop the power interval
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}

		// Calculate blow duration and ruffalos
		const duration = holdStart ? (Date.now() - holdStart) / 1000 : 0;
		const result = calculateBlowRuffalos(duration, ingredients);
		setLocalRuffalos(result);
		setRuffalos(result);

		// Stop audio
		audioEngine.stopBlowWhoosh();

		// Transition to "watching" — let the 3D meat chunks fly before showing result
		setSubPhase("watching");
	};

	// Auto-transition from "watching" → "result" after 1.5s
	useEffect(() => {
		if (subPhase !== "watching") return;

		const timer = setTimeout(() => {
			// Generate splats on the wall when result appears
			const splatCount = localRuffalos * 4 + 3;
			const newSplats: Splat[] = Array.from({ length: splatCount }, (_, i) => ({
				id: i,
				x: Math.random() * 80 + 10,
				y: Math.random() * 70 + 5,
				size: Math.random() * 24 + 6,
				color:
					ingredients.length > 0
						? ingredients[Math.floor(Math.random() * ingredients.length)]
								.color
						: "#E85D2C",
			}));
			setSplats(newSplats);
			setSubPhase("result");
		}, 1500);

		return () => clearTimeout(timer);
	}, [subPhase, localRuffalos, ingredients]);

	// Cleanup interval on unmount
	useEffect(() => {
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	// --- READY + BLOWING sub-phases (merged so the button stays mounted for touch events) ---
	if (subPhase === "ready" || subPhase === "blowing") {
		const isBlowing = subPhase === "blowing";
		return (
			<View style={styles.gameplayOverlay} pointerEvents="box-none">
				{/* Top section */}
				<View style={styles.topSection}>
					<Text style={styles.phaseTitle}>WILL IT BLOW?!</Text>
					{!isBlowing && (
						<Text style={styles.description}>
							Hold the button to blow the leftover filling out!
						</Text>
					)}
					{isBlowing && (
						<>
							<Animated.Text
								style={[
									styles.windEmojiLarge,
									{ transform: [{ rotate: wobbleRotation }] },
								]}
							>
								{"\uD83C\uDF2C\uFE0F"}
							</Animated.Text>
							<Text style={styles.blowingLabel}>BLOWING!</Text>
						</>
					)}
				</View>

				{/* Bottom section */}
				<View style={styles.bottomSection}>
					{!isBlowing && (
						<Animated.Text
							style={[
								styles.windEmoji,
								{ transform: [{ rotate: wobbleRotation }] },
							]}
						>
							{"\uD83C\uDF2C\uFE0F"}
						</Animated.Text>
					)}
					{isBlowing && (
						<View key="progress" style={styles.progressContainer}>
							<ProgressBar
								value={holdPower}
								max={100}
								color="#2196F3"
								label="BLOW POWER"
							/>
						</View>
					)}

					<TouchableOpacity
						key="blowBtn"
						style={isBlowing ? styles.releaseButton : styles.blowButton}
						onPressIn={handlePressIn}
						onPressOut={handlePressOut}
						activeOpacity={0.8}
					>
						<Text
							style={
								isBlowing
									? styles.releaseButtonText
									: styles.blowButtonText
							}
						>
							{isBlowing ? "RELEASE!" : "HOLD TO BLOW!"}
						</Text>
					</TouchableOpacity>
				</View>

				<SfxText
					texts={[
						"WHOOSH!",
						"PFFFT!",
						"SPLAT!",
						"*blowing*",
						"FWOOOM!",
					]}
					active={isBlowing}
				/>
			</View>
		);
	}

	// --- WATCHING sub-phase: let 3D explosion play out ---
	if (subPhase === "watching") {
		return (
			<View style={styles.gameplayOverlay} pointerEvents="box-none">
				<View style={styles.topSection}>
					<Text style={styles.phaseTitle}>WILL IT BLOW?!</Text>
					<Text style={styles.watchingLabel}>WATCH IT FLY!</Text>
				</View>
				<View style={styles.bottomSection} />
				<SfxText
					texts={[
						"WHOOSH!",
						"PFFFT!",
						"SPLAT!",
						"*blowing*",
						"FWOOOM!",
					]}
					active={true}
				/>
			</View>
		);
	}

	// --- RESULT sub-phase ---
	return (
		<View style={styles.container}>
			{/* Splat wall */}
			<View style={styles.splatWall}>
				{splats.map((splat) => (
					<View
						key={splat.id}
						style={[
							styles.splatDot,
							{
								left: `${splat.x}%`,
								top: `${splat.y}%`,
								width: splat.size,
								height: splat.size,
								borderRadius: 50,
								backgroundColor: splat.color,
							},
						]}
					/>
				))}
				<Text style={styles.wallLabel}>
					Mrs. Sausage's kitchen wall {"\uD83D\uDE24"}
				</Text>
			</View>

			{/* Ruffalos result */}
			<Animated.View
				style={{
					transform: [{ scale: popScale as unknown as number }],
				}}
			>
				<Text style={styles.ruffalosText}>
					{localRuffalos} MARK RUFFALOS!
				</Text>
			</Animated.View>

			<RuffaloRating count={localRuffalos} />

			<TouchableOpacity
				style={styles.cookButton}
				onPress={() => tryButFirst("cook")}
				activeOpacity={0.8}
			>
				<Text style={styles.cookButtonText}>
					TIME TO COOK! {"\uD83D\uDD25"}
				</Text>
			</TouchableOpacity>

			<SfxText
				texts={[
					"WHOOSH!",
					"PFFFT!",
					"SPLAT!",
					"*blowing*",
					"FWOOOM!",
				]}
				active={false}
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
	blowingLabel: {
		fontSize: 24,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#64B5F6",
		letterSpacing: 2,
		textShadowColor: "rgba(33, 150, 243, 0.4)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 8,
	},
	watchingLabel: {
		fontSize: 28,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FF6B35",
		letterSpacing: 2,
		textShadowColor: "rgba(255, 107, 53, 0.5)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 10,
		marginTop: 8,
	},
	phaseTitle: {
		fontSize: 36,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FF6B35",
		letterSpacing: 3,
		textShadowColor: "rgba(0, 0, 0, 0.5)",
		textShadowOffset: { width: 2, height: 2 },
		textShadowRadius: 4,
		marginBottom: 8,
		textAlign: "center",
	},
	description: {
		fontSize: 16,
		color: "#FFD54F",
		fontFamily: "Bangers",
		textAlign: "center",
		marginBottom: 16,
		letterSpacing: 0.5,
		paddingHorizontal: 16,
	},
	windEmoji: {
		fontSize: 80,
		textAlign: "center",
		marginBottom: 24,
	},
	windEmojiLarge: {
		fontSize: 100,
		textAlign: "center",
		marginBottom: 20,
	},
	blowButton: {
		backgroundColor: "#2196F3",
		borderWidth: 3,
		borderColor: "#64B5F6",
		borderRadius: 14,
		paddingVertical: 16,
		paddingHorizontal: 48,
		shadowColor: "#2196F3",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 12,
		elevation: 8,
	},
	blowButtonText: {
		color: "#FFFFFF",
		fontSize: 26,
		fontWeight: "900",
		fontFamily: "Bangers",
		textAlign: "center",
		letterSpacing: 2,
	},
	progressContainer: {
		width: "100%",
		marginBottom: 16,
	},
	releaseButton: {
		backgroundColor: "#F44336",
		borderWidth: 3,
		borderColor: "#EF5350",
		borderRadius: 14,
		paddingVertical: 16,
		paddingHorizontal: 48,
		shadowColor: "#F44336",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 12,
		elevation: 8,
	},
	releaseButtonText: {
		color: "#FFFFFF",
		fontSize: 26,
		fontWeight: "900",
		fontFamily: "Bangers",
		textAlign: "center",
		letterSpacing: 2,
	},
	splatWall: {
		width: "85%",
		height: 190,
		borderRadius: 14,
		backgroundColor: "#111",
		borderWidth: 1,
		borderColor: "#282828",
		marginBottom: 16,
		overflow: "hidden",
	},
	splatDot: {
		position: "absolute",
	},
	wallLabel: {
		position: "absolute",
		bottom: 6,
		alignSelf: "center",
		width: "100%",
		textAlign: "center",
		fontSize: 11,
		color: "#444",
		fontFamily: "Bangers",
	},
	ruffalosText: {
		fontSize: 32,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FFD54F",
		letterSpacing: 2,
		textShadowColor: "rgba(255, 213, 79, 0.4)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 8,
		textAlign: "center",
		marginBottom: 12,
	},
	cookButton: {
		backgroundColor: "#FF6B35",
		borderWidth: 2,
		borderColor: "#FFD54F",
		borderRadius: 14,
		paddingVertical: 14,
		paddingHorizontal: 40,
		marginTop: 20,
		shadowColor: "#FF6B35",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 12,
		elevation: 8,
	},
	cookButtonText: {
		color: "#FFFFFF",
		fontSize: 24,
		fontWeight: "900",
		fontFamily: "Bangers",
		textAlign: "center",
		letterSpacing: 1,
	},
});
