import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { useNavigationStore } from '../../store/navigationStore';
import { calculateFinalVerdict, CHALLENGE_ORDER, type Verdict } from '../../engine/ChallengeRegistry';
import { DialogueOverlay } from '../ui/DialogueOverlay';
import {
	VERDICT_S,
	VERDICT_A,
	VERDICT_B,
	VERDICT_F,
} from '../../data/dialogue/verdict';
import type { Reaction } from '../characters/reactions';

interface TastingChallengeProps {
	onComplete: (score: number) => void;
	onReaction?: (reaction: Reaction) => void;
}

type TastingPhase =
	| 'title'         // "THE TASTING" fades in
	| 'eating'        // Mr. Sausage eating animation
	| 'judging'       // Dramatic pause
	| 'scores'        // Score summary reveals one by one
	| 'rank'          // Rank badge appears
	| 'dialogue'      // Verdict dialogue plays
	| 'complete';     // Outcome applied

const CHALLENGE_LABELS = ['Ingredients', 'Grinding', 'Stuffing', 'Cooking'];

const RANK_COLORS: Record<string, string> = {
	S: '#FFD700',
	A: '#4CAF50',
	B: '#FF9800',
	F: '#FF1744',
};

export function TastingChallenge({ onComplete, onReaction }: TastingChallengeProps) {
	const { challengeScores, completeChallenge } = useGameStore();
	const { navigateTo } = useNavigationStore();

	const [phase, setPhase] = useState<TastingPhase>('title');
	const [revealedScoreCount, setRevealedScoreCount] = useState(0);

	// Animated values
	const titleOpacity = useRef(new Animated.Value(0)).current;
	const scoreOpacities = useRef(
		CHALLENGE_LABELS.map(() => new Animated.Value(0)),
	).current;
	const averageOpacity = useRef(new Animated.Value(0)).current;
	const rankScale = useRef(new Animated.Value(0)).current;
	const rankOpacity = useRef(new Animated.Value(0)).current;
	const overlayOpacity = useRef(new Animated.Value(0)).current;

	// Calculate verdict once on mount
	const verdict: Verdict = useMemo(
		() => calculateFinalVerdict(challengeScores),
		[challengeScores],
	);

	// Get the right dialogue lines for the rank
	const verdictDialogue = useMemo(() => {
		switch (verdict.rank) {
			case 'S': return VERDICT_S;
			case 'A': return VERDICT_A;
			case 'B': return VERDICT_B;
			case 'F': return VERDICT_F;
		}
	}, [verdict.rank]);

	// Refs to avoid stale closures in timeouts
	const phaseRef = useRef(phase);
	phaseRef.current = phase;

	// Navigate camera to center on mount (to face the CRT TV)
	useEffect(() => {
		if (navigateTo) {
			navigateTo('center');
		}
	}, [navigateTo]);

	// Phase 1: Title fade-in
	useEffect(() => {
		// Fade in overlay background
		Animated.timing(overlayOpacity, {
			toValue: 1,
			duration: 800,
			useNativeDriver: true,
		}).start();

		// Fade in title
		Animated.timing(titleOpacity, {
			toValue: 1,
			duration: 1200,
			useNativeDriver: true,
		}).start();

		// After 1s: move to eating phase
		const timer = setTimeout(() => {
			setPhase('eating');
		}, 1200);

		return () => clearTimeout(timer);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// Phase 2: Eating animation (use 'talk' as closest available Reaction)
	useEffect(() => {
		if (phase !== 'eating') return;
		onReaction?.('talk');

		const timer = setTimeout(() => {
			setPhase('judging');
		}, 2000);

		return () => clearTimeout(timer);
	}, [phase, onReaction]);

	// Phase 3: Judging (dramatic pause — use 'nervous' as closest available Reaction)
	useEffect(() => {
		if (phase !== 'judging') return;
		onReaction?.('nervous');

		const timer = setTimeout(() => {
			setPhase('scores');
		}, 2000);

		return () => clearTimeout(timer);
	}, [phase, onReaction]);

	// Phase 4: Score reveal one by one
	useEffect(() => {
		if (phase !== 'scores') return;

		const totalToReveal = CHALLENGE_LABELS.length;
		let count = 0;

		const revealNext = () => {
			if (count < totalToReveal) {
				Animated.timing(scoreOpacities[count], {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}).start();
				count++;
				setRevealedScoreCount(count);
			}

			if (count < totalToReveal) {
				timer = setTimeout(revealNext, 500);
			} else {
				// Reveal average after last score
				timer = setTimeout(() => {
					Animated.timing(averageOpacity, {
						toValue: 1,
						duration: 400,
						useNativeDriver: true,
					}).start();

					// Then move to rank phase
					setTimeout(() => {
						setPhase('rank');
					}, 1200);
				}, 600);
			}
		};

		let timer = setTimeout(revealNext, 300);

		return () => clearTimeout(timer);
	}, [phase, scoreOpacities, averageOpacity]);

	// Phase 5: Rank badge reveal
	useEffect(() => {
		if (phase !== 'rank') return;

		// Dramatic rank appearance
		Animated.parallel([
			Animated.timing(rankOpacity, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.spring(rankScale, {
				toValue: 1,
				friction: 4,
				tension: 40,
				useNativeDriver: true,
			}),
		]).start();

		// Reaction based on rank
		if (verdict.rank === 'S') {
			onReaction?.('excitement');
		} else if (verdict.rank === 'A') {
			onReaction?.('nod');
		} else if (verdict.rank === 'B') {
			onReaction?.('disgust');
		} else {
			onReaction?.('laugh');
		}

		const timer = setTimeout(() => {
			setPhase('dialogue');
		}, 1500);

		return () => clearTimeout(timer);
	}, [phase, rankOpacity, rankScale, verdict.rank, onReaction]);

	// Handle dialogue completion
	const handleDialogueComplete = useCallback(
		(_effects: string[]) => {
			setPhase('complete');

			if (verdict.rank === 'S' || verdict.rank === 'A') {
				// Victory: completeChallenge handles setting gameStatus to 'victory'
				// since tasting is the last challenge (index 4)
				completeChallenge(verdict.averageScore);
			} else {
				// Defeat: B and F ranks
				useGameStore.setState({ gameStatus: 'defeat' });
			}
		},
		[verdict, completeChallenge],
	);

	const rankColor = RANK_COLORS[verdict.rank] ?? '#FF1744';

	return (
		<Animated.View
			style={[styles.container, { opacity: overlayOpacity }]}
			pointerEvents="box-none"
		>
			{/* Dark overlay background */}
			<View style={styles.darkOverlay} pointerEvents="none" />

			{/* THE TASTING title */}
			<Animated.View style={[styles.titleContainer, { opacity: titleOpacity }]}>
				<Text style={styles.titleText}>THE TASTING</Text>
				<View style={styles.titleUnderline} />
			</Animated.View>

			{/* Eating / Judging status indicator */}
			{phase === 'eating' && (
				<View style={styles.statusContainer}>
					<Text style={styles.statusText}>Mr. Sausage is eating...</Text>
				</View>
			)}
			{phase === 'judging' && (
				<View style={styles.statusContainer}>
					<Text style={[styles.statusText, styles.judgingText]}>
						Judging...
					</Text>
				</View>
			)}

			{/* Score summary panel */}
			{(phase === 'scores' || phase === 'rank' || phase === 'dialogue' || phase === 'complete') && (
				<View style={styles.scoreSummaryPanel}>
					{CHALLENGE_LABELS.map((label, index) => {
						const score = challengeScores[index] ?? 0;
						return (
							<Animated.View
								key={label}
								style={[
									styles.scoreRow,
									{ opacity: scoreOpacities[index] },
								]}
							>
								<Text style={styles.scoreLabel}>{label}</Text>
								<Text style={styles.scoreValue}>{Math.round(score)}</Text>
							</Animated.View>
						);
					})}

					{/* Average line */}
					<Animated.View
						style={[styles.averageRow, { opacity: averageOpacity }]}
					>
						<View style={styles.averageDivider} />
						<View style={styles.scoreRow}>
							<Text style={styles.averageLabel}>Average</Text>
							<Text style={styles.averageValue}>
								{verdict.averageScore.toFixed(1)}
							</Text>
						</View>
					</Animated.View>
				</View>
			)}

			{/* Rank badge */}
			{(phase === 'rank' || phase === 'dialogue' || phase === 'complete') && (
				<Animated.View
					style={[
						styles.rankContainer,
						{
							opacity: rankOpacity,
							transform: [{ scale: rankScale }],
						},
					]}
				>
					<View
						style={[
							styles.rankBadge,
							{
								borderColor: rankColor,
								shadowColor: rankColor,
							},
						]}
					>
						<Text style={[styles.rankLetter, { color: rankColor }]}>
							{verdict.rank}
						</Text>
					</View>
					<Text style={[styles.rankTitle, { color: rankColor }]}>
						{verdict.title}
					</Text>
				</Animated.View>
			)}

			{/* Verdict dialogue */}
			{phase === 'dialogue' && (
				<DialogueOverlay
					lines={verdictDialogue}
					onComplete={handleDialogueComplete}
				/>
			)}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		zIndex: 50,
	},
	darkOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(5, 0, 0, 0.75)',
	},

	// Title
	titleContainer: {
		position: 'absolute',
		top: 40,
		left: 0,
		right: 0,
		alignItems: 'center',
		zIndex: 55,
	},
	titleText: {
		fontSize: 42,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#FF1744',
		letterSpacing: 6,
		textShadowColor: 'rgba(255, 23, 68, 0.7)',
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 20,
	},
	titleUnderline: {
		width: 200,
		height: 3,
		backgroundColor: '#FF1744',
		marginTop: 6,
		opacity: 0.6,
	},

	// Status indicators
	statusContainer: {
		position: 'absolute',
		top: '40%',
		left: 0,
		right: 0,
		alignItems: 'center',
		zIndex: 55,
	},
	statusText: {
		fontSize: 24,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#FFC832',
		letterSpacing: 3,
		textShadowColor: 'rgba(255, 200, 50, 0.4)',
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 12,
	},
	judgingText: {
		color: '#FF1744',
		textShadowColor: 'rgba(255, 23, 68, 0.6)',
	},

	// Score summary
	scoreSummaryPanel: {
		position: 'absolute',
		top: 110,
		left: '15%',
		right: '15%',
		backgroundColor: 'rgba(10, 10, 10, 0.92)',
		borderWidth: 2,
		borderColor: '#333',
		borderRadius: 12,
		padding: 16,
		zIndex: 55,
	},
	scoreRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 6,
	},
	scoreLabel: {
		fontSize: 18,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#BDBDBD',
		letterSpacing: 1,
	},
	scoreValue: {
		fontSize: 22,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#FFC832',
		letterSpacing: 2,
	},
	averageRow: {
		marginTop: 4,
	},
	averageDivider: {
		height: 2,
		backgroundColor: '#444',
		marginBottom: 4,
	},
	averageLabel: {
		fontSize: 20,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#E0E0E0',
		letterSpacing: 2,
	},
	averageValue: {
		fontSize: 26,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#FF1744',
		letterSpacing: 2,
		textShadowColor: 'rgba(255, 23, 68, 0.4)',
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 8,
	},

	// Rank badge
	rankContainer: {
		position: 'absolute',
		top: '52%',
		left: 0,
		right: 0,
		alignItems: 'center',
		zIndex: 55,
	},
	rankBadge: {
		width: 100,
		height: 100,
		borderRadius: 50,
		borderWidth: 4,
		backgroundColor: 'rgba(10, 10, 10, 0.95)',
		alignItems: 'center',
		justifyContent: 'center',
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.8,
		shadowRadius: 20,
		elevation: 10,
	},
	rankLetter: {
		fontSize: 72,
		fontWeight: '900',
		fontFamily: 'Bangers',
		letterSpacing: 0,
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 16,
	},
	rankTitle: {
		fontSize: 24,
		fontWeight: '900',
		fontFamily: 'Bangers',
		letterSpacing: 3,
		marginTop: 8,
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 12,
	},
});
