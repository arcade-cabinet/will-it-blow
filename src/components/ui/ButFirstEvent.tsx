import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Animated,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { useGame } from "../../engine/GameEngine";
import { FAN_ART } from "../../engine/Constants";
import { audioEngine } from "../../engine/AudioEngine";

type SubPhase = "smash" | "reveal";

const SMASHES_REQUIRED = 5;

// Crack line definitions — positioned relative to the sausage button center
const CRACK_LINES: { top: number; left: number; width: number; rotate: string }[] = [
	{ top: 20, left: 30, width: 28, rotate: "-25deg" },
	{ top: 45, left: 80, width: 22, rotate: "40deg" },
	{ top: 10, left: 100, width: 18, rotate: "-60deg" },
	{ top: 55, left: 50, width: 24, rotate: "15deg" },
	{ top: 35, left: 120, width: 20, rotate: "-45deg" },
];

export const ButFirstEvent: React.FC = () => {
	const { handleButFirstComplete } = useGame();

	const [subPhase, setSubPhase] = useState<SubPhase>("smash");
	const [smashCount, setSmashCount] = useState(0);
	const [revealed, setRevealed] = useState(false);

	// Pick fan art and bonus once
	const fanArt = useMemo(
		() => FAN_ART[Math.floor(Math.random() * FAN_ART.length)],
		[],
	);
	const bonusPoints = useMemo(
		() => Math.floor(Math.random() * 8) + 3,
		[],
	);

	// Animations
	const titleScale = useRef(new Animated.Value(3)).current;
	const revealOpacity = useRef(new Animated.Value(0)).current;
	const revealScale = useRef(new Animated.Value(0.3)).current;
	const bonusPopScale = useRef(new Animated.Value(0)).current;

	// Play slam on mount and animate title
	useEffect(() => {
		audioEngine.playSlam();

		Animated.spring(titleScale, {
			toValue: 1,
			friction: 5,
			tension: 100,
			useNativeDriver: true,
		}).start();
	}, []);

	// Reveal animation
	useEffect(() => {
		if (subPhase === "reveal" && revealed) {
			Animated.parallel([
				Animated.timing(revealOpacity, {
					toValue: 1,
					duration: 600,
					useNativeDriver: true,
				}),
				Animated.spring(revealScale, {
					toValue: 1,
					friction: 5,
					tension: 60,
					useNativeDriver: true,
				}),
			]).start(() => {
				// Pop in bonus text after reveal
				Animated.spring(bonusPopScale, {
					toValue: 1,
					friction: 4,
					tension: 80,
					useNativeDriver: true,
				}).start();
			});
		}
	}, [subPhase, revealed]);

	const handleSmash = () => {
		if (subPhase !== "smash") return;

		const newCount = smashCount + 1;
		setSmashCount(newCount);

		if (newCount >= SMASHES_REQUIRED) {
			setSubPhase("reveal");
			setTimeout(() => {
				setRevealed(true);
			}, 400);
		}
	};

	const smashesLeft = SMASHES_REQUIRED - smashCount;
	const sausageScale = 1 - (smashCount / SMASHES_REQUIRED) * 0.15;

	return (
		<View style={styles.overlay}>
			{/* BUT FIRST title */}
			<Animated.Text
				style={[
					styles.butFirstTitle,
					{
						transform: [{ scale: titleScale as unknown as number }],
					},
				]}
			>
				BUT FIRST!
			</Animated.Text>

			{subPhase === "smash" && (
				<View style={styles.smashContainer}>
					<Text style={styles.instruction}>
						Smash the sausage with your fist to reveal fan art!
					</Text>

					{/* Sausage button */}
					<TouchableOpacity
						onPress={handleSmash}
						activeOpacity={0.7}
						style={styles.sausageButtonWrapper}
					>
						<View
							style={[
								styles.sausageButton,
								{
									transform: [{ scale: sausageScale }],
								},
							]}
						>
							{/* Crack lines */}
							{Array.from(
								{ length: Math.min(smashCount, CRACK_LINES.length) },
								(_, i) => (
									<View
										key={i}
										style={[
											styles.crackLine,
											{
												top: CRACK_LINES[i].top,
												left: CRACK_LINES[i].left,
												width: CRACK_LINES[i].width,
												transform: [
													{ rotate: CRACK_LINES[i].rotate },
												],
											},
										]}
									/>
								),
							)}
							<Text style={styles.sausageEmoji}>
								{"\uD83C\uDF2D"}
							</Text>
						</View>
					</TouchableOpacity>

					<Text style={styles.smashCounter}>
						{"\uD83D\uDC4A"} {smashesLeft} smashes left!
					</Text>
				</View>
			)}

			{subPhase === "reveal" && (
				<Animated.View
					style={[
						styles.revealContainer,
						{
							opacity: revealOpacity,
							transform: [
								{ scale: revealScale as unknown as number },
							],
						},
					]}
				>
					{/* Art frame */}
					<View style={styles.artFrame}>
						<Text style={styles.artEmoji}>
							{"\uD83C\uDFA8"}
						</Text>
						<Text style={styles.artDescription}>{fanArt}</Text>
					</View>

					<Text style={styles.thanksText}>
						With special thanks to today's Mark Boxalo box artist!
					</Text>

					{/* Bonus text */}
					<Animated.Text
						style={[
							styles.bonusText,
							{
								transform: [
									{
										scale: bonusPopScale as unknown as number,
									},
								],
							},
						]}
					>
						+{bonusPoints}% BONUS!
					</Animated.Text>

					{/* Back to sausage button */}
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => handleButFirstComplete(bonusPoints)}
						activeOpacity={0.8}
					>
						<Text style={styles.backButtonText}>
							BACK TO THE SAUSAGE!
						</Text>
					</TouchableOpacity>
				</Animated.View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	overlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(0,0,0,0.94)",
		zIndex: 100,
		alignItems: "center",
		justifyContent: "center",
		padding: 20,
	},
	butFirstTitle: {
		fontSize: 58,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FFD54F",
		letterSpacing: 4,
		textShadowColor: "rgba(255, 213, 79, 0.6)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 20,
		textAlign: "center",
		marginBottom: 24,
	},
	smashContainer: {
		alignItems: "center",
		justifyContent: "center",
	},
	instruction: {
		fontSize: 16,
		color: "#CCC",
		fontFamily: "Bangers",
		textAlign: "center",
		marginBottom: 28,
		letterSpacing: 0.5,
		paddingHorizontal: 20,
	},
	sausageButtonWrapper: {
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 24,
	},
	sausageButton: {
		width: 170,
		height: 85,
		borderRadius: 42,
		backgroundColor: "#D84315",
		borderWidth: 3,
		borderColor: "#8D6E63",
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		shadowColor: "#D84315",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 10,
		elevation: 8,
	},
	crackLine: {
		position: "absolute",
		height: 2,
		backgroundColor: "#3E2723",
		borderRadius: 1,
		zIndex: 2,
	},
	sausageEmoji: {
		fontSize: 36,
		textAlign: "center",
	},
	smashCounter: {
		fontSize: 20,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#FF6B35",
		letterSpacing: 1,
		textAlign: "center",
	},
	revealContainer: {
		alignItems: "center",
		justifyContent: "center",
	},
	artFrame: {
		width: 250,
		height: 190,
		backgroundColor: "#1a1a2e",
		borderWidth: 4,
		borderColor: "#FFD54F",
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		padding: 16,
		marginBottom: 16,
		shadowColor: "#FFD54F",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 6,
	},
	artEmoji: {
		fontSize: 44,
		textAlign: "center",
		marginBottom: 10,
	},
	artDescription: {
		fontSize: 15,
		color: "#FFD54F",
		fontFamily: "Bangers",
		textAlign: "center",
		letterSpacing: 0.5,
		lineHeight: 20,
	},
	thanksText: {
		fontSize: 14,
		color: "#81C784",
		fontFamily: "Bangers",
		textAlign: "center",
		marginBottom: 16,
		letterSpacing: 0.5,
		paddingHorizontal: 20,
	},
	bonusText: {
		fontSize: 30,
		fontWeight: "900",
		fontFamily: "Bangers",
		color: "#4CAF50",
		letterSpacing: 2,
		textShadowColor: "rgba(76, 175, 80, 0.4)",
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 8,
		textAlign: "center",
		marginBottom: 24,
	},
	backButton: {
		backgroundColor: "#FF6B35",
		borderWidth: 2,
		borderColor: "#FFD54F",
		borderRadius: 14,
		paddingVertical: 14,
		paddingHorizontal: 36,
		shadowColor: "#FF6B35",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.5,
		shadowRadius: 12,
		elevation: 8,
	},
	backButtonText: {
		color: "#FFFFFF",
		fontSize: 22,
		fontWeight: "900",
		fontFamily: "Bangers",
		textAlign: "center",
		letterSpacing: 1,
	},
});
