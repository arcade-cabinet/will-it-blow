import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { pickVariant } from '../../engine/ChallengeRegistry';
import type { IngredientVariant } from '../../data/challenges/variants';
import { getRandomIngredientPool } from '../../engine/Ingredients';
import type { Ingredient } from '../../engine/Ingredients';
import { matchesCriteria } from '../../engine/IngredientMatcher';
import { DialogueOverlay } from '../ui/DialogueOverlay';
import { ProgressGauge } from '../ui/ProgressGauge';
import {
	INGREDIENTS_DIALOGUE,
	INGREDIENTS_SUCCESS,
	INGREDIENTS_FAIL,
} from '../../data/dialogue/ingredients';
import type { Reaction } from '../characters/reactions';

interface IngredientChallengeProps {
	onComplete: (score: number) => void;
	onReaction?: (reaction: Reaction) => void;
}

type ChallengePhase = 'dialogue' | 'selecting' | 'success' | 'failure' | 'complete';

const SCORE_PENALTY_PER_STRIKE = 15;
const REACTION_RESET_MS = 1500;
const COMPLETE_DELAY_MS = 1200;
const INGREDIENT_POOL_SIZE = 10;

export function IngredientChallenge({ onComplete, onReaction }: IngredientChallengeProps) {
	const [phase, setPhase] = useState<ChallengePhase>('dialogue');
	const [ingredientPool, setIngredientPool] = useState<Ingredient[]>([]);
	const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
	const [correctCount, setCorrectCount] = useState(0);
	const [variant, setVariant] = useState<IngredientVariant | null>(null);
	const [matchingIndices, setMatchingIndices] = useState<Set<number>>(new Set());
	const [hintActive, setHintActive] = useState(false);
	const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);

	const {
		strikes,
		addStrike,
		hintsRemaining,
		variantSeed,
		setChallengeProgress,
		gameStatus,
	} = useGameStore();

	// Initialize variant and ingredient pool on mount
	useEffect(() => {
		const v = pickVariant('ingredients', variantSeed) as IngredientVariant;
		setVariant(v);
		const pool = getRandomIngredientPool(INGREDIENT_POOL_SIZE);
		setIngredientPool(pool);

		// Calculate which pool indices match the variant criteria
		const matching = new Set<number>();
		pool.forEach((ing, i) => {
			if (matchesCriteria(ing, v.criteria)) {
				matching.add(i);
			}
		});
		setMatchingIndices(matching);
	}, [variantSeed]);

	// Watch for defeat (3 strikes) to trigger failure dialogue
	useEffect(() => {
		if (gameStatus === 'defeat' && phase === 'selecting') {
			setPhase('failure');
		}
	}, [gameStatus, phase]);

	// Handle ingredient selection
	const handleSelect = useCallback(
		(index: number) => {
			if (selectedIndices.has(index) || !variant || phase !== 'selecting') return;

			const newSelected = new Set(selectedIndices);
			newSelected.add(index);
			setSelectedIndices(newSelected);

			if (matchingIndices.has(index)) {
				// Correct ingredient
				const newCount = correctCount + 1;
				setCorrectCount(newCount);
				setLastResult('correct');
				onReaction?.('excitement');
				setChallengeProgress((newCount / variant.requiredCount) * 100);

				if (newCount >= variant.requiredCount) {
					// Challenge complete
					setPhase('success');
				}
			} else {
				// Wrong ingredient - strike
				setLastResult('wrong');

				// Check if ingredient is "close" (shares at least one tag)
				const isClose = variant.criteria.tags.some((tag) => {
					const pool = ingredientPool[index];
					if (!pool) return false;
					return matchesCriteria(pool, { tags: [tag] });
				});

				if (isClose) {
					onReaction?.('nervous');
				} else {
					onReaction?.('disgust');
				}

				addStrike();
			}

			// Reset result indicator after delay
			setTimeout(() => {
				setLastResult(null);
				onReaction?.('idle');
			}, REACTION_RESET_MS);
		},
		[
			selectedIndices,
			matchingIndices,
			correctCount,
			variant,
			phase,
			ingredientPool,
			addStrike,
			setChallengeProgress,
			onReaction,
		],
	);

	// Handle hint activation
	const handleHint = useCallback(() => {
		if (hintsRemaining > 0) {
			useGameStore.getState().useHint();
			setHintActive(true);
			setTimeout(() => setHintActive(false), 3000);
		}
	}, [hintsRemaining]);

	// Handle dialogue completion
	const handleDialogueComplete = useCallback(
		(effects: string[]) => {
			// If player got a hint from dialogue, activate hint glow
			if (effects.includes('hint')) {
				setHintActive(true);
				setTimeout(() => setHintActive(false), 3000);
			}
			setPhase('selecting');
			onReaction?.('idle');
		},
		[onReaction],
	);

	// Handle success dialogue completion
	const handleSuccessComplete = useCallback(() => {
		setPhase('complete');
		const score = Math.max(0, 100 - strikes * SCORE_PENALTY_PER_STRIKE);
		setTimeout(() => onComplete(score), COMPLETE_DELAY_MS);
	}, [strikes, onComplete]);

	// Handle failure dialogue completion (game over handled by gameStore)
	const handleFailureComplete = useCallback(() => {
		setPhase('complete');
	}, []);

	// Derived state for the ingredient grid
	const requiredCount = variant?.requiredCount ?? 3;
	const progressPercent = (correctCount / requiredCount) * 100;

	// Memoize the ingredient grid items
	const gridItems = useMemo(() => {
		return ingredientPool.map((ing, i) => ({
			ingredient: ing,
			index: i,
			isSelected: selectedIndices.has(i),
			isHinted: hintActive && matchingIndices.has(i) && !selectedIndices.has(i),
		}));
	}, [ingredientPool, selectedIndices, hintActive, matchingIndices]);

	if (!variant) return null;

	return (
		<View style={styles.container} pointerEvents="box-none">
			{/* Intro dialogue */}
			{phase === 'dialogue' && (
				<DialogueOverlay
					lines={INGREDIENTS_DIALOGUE}
					onComplete={handleDialogueComplete}
				/>
			)}

			{/* Success dialogue */}
			{phase === 'success' && (
				<DialogueOverlay
					lines={INGREDIENTS_SUCCESS}
					onComplete={handleSuccessComplete}
				/>
			)}

			{/* Failure dialogue */}
			{phase === 'failure' && (
				<DialogueOverlay
					lines={INGREDIENTS_FAIL}
					onComplete={handleFailureComplete}
				/>
			)}

			{/* Main gameplay UI */}
			{phase === 'selecting' && (
				<>
					{/* Demand banner at top */}
					<View style={styles.demandBanner}>
						<Text style={styles.demandLabel}>MR. SAUSAGE DEMANDS:</Text>
						<Text style={styles.demandText}>{variant.mrSausageDemand}</Text>
					</View>

					{/* Progress gauge */}
					<View style={styles.progressContainer}>
						<ProgressGauge
							value={progressPercent}
							label={`FOUND: ${correctCount} / ${requiredCount}`}
							color="#4CAF50"
						/>
					</View>

					{/* Result flash feedback */}
					{lastResult && (
						<View
							style={[
								styles.resultFlash,
								lastResult === 'correct' ? styles.resultCorrect : styles.resultWrong,
							]}
						>
							<Text style={styles.resultText}>
								{lastResult === 'correct' ? 'CORRECT!' : 'WRONG!'}
							</Text>
						</View>
					)}

					{/* Ingredient grid (2D overlay — mobile-first) */}
					<View style={styles.ingredientGrid}>
						{gridItems.map(({ ingredient, index, isSelected, isHinted }) => (
							<TouchableOpacity
								key={index}
								style={[
									styles.ingredientButton,
									isSelected && styles.ingredientSelected,
									isHinted && styles.ingredientHinted,
								]}
								onPress={() => handleSelect(index)}
								disabled={isSelected || phase !== 'selecting'}
								activeOpacity={0.7}
							>
								<Text style={styles.ingredientEmoji}>{ingredient.emoji}</Text>
								<Text
									style={[
										styles.ingredientName,
										isSelected && styles.ingredientNameSelected,
									]}
									numberOfLines={1}
								>
									{ingredient.name}
								</Text>
								{isSelected && matchingIndices.has(index) && (
									<View style={styles.checkMark}>
										<Text style={styles.checkMarkText}>{'\u2713'}</Text>
									</View>
								)}
								{isSelected && !matchingIndices.has(index) && (
									<View style={styles.crossMark}>
										<Text style={styles.crossMarkText}>{'\u2715'}</Text>
									</View>
								)}
							</TouchableOpacity>
						))}
					</View>

					{/* Hint button at bottom */}
					{hintsRemaining > 0 && (
						<TouchableOpacity
							style={styles.hintButton}
							onPress={handleHint}
							activeOpacity={0.7}
						>
							<Text style={styles.hintButtonText}>
								HINT ({hintsRemaining} left)
							</Text>
						</TouchableOpacity>
					)}
				</>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		zIndex: 50,
	},
	demandBanner: {
		position: 'absolute',
		top: 60,
		left: 16,
		right: 16,
		backgroundColor: 'rgba(10, 10, 10, 0.92)',
		borderWidth: 2,
		borderColor: '#FF1744',
		borderRadius: 12,
		padding: 12,
		alignItems: 'center',
		zIndex: 55,
	},
	demandLabel: {
		fontSize: 12,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#FF1744',
		letterSpacing: 3,
		marginBottom: 4,
	},
	demandText: {
		fontSize: 18,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#FFC832',
		letterSpacing: 1,
		textAlign: 'center',
		lineHeight: 24,
		textShadowColor: 'rgba(255, 200, 50, 0.3)',
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 8,
	},
	progressContainer: {
		position: 'absolute',
		top: 140,
		left: 16,
		right: 16,
		zIndex: 55,
	},
	resultFlash: {
		position: 'absolute',
		top: 185,
		left: 0,
		right: 0,
		alignItems: 'center',
		zIndex: 60,
	},
	resultCorrect: {},
	resultWrong: {},
	resultText: {
		fontSize: 22,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#FFC832',
		letterSpacing: 3,
		textShadowColor: 'rgba(255, 200, 50, 0.6)',
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 10,
	},
	ingredientGrid: {
		position: 'absolute',
		bottom: 80,
		left: 12,
		right: 12,
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 8,
		zIndex: 55,
	},
	ingredientButton: {
		width: 80,
		height: 90,
		backgroundColor: 'rgba(20, 20, 20, 0.9)',
		borderWidth: 2,
		borderColor: '#444',
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 6,
		paddingHorizontal: 4,
	},
	ingredientSelected: {
		opacity: 0.4,
		borderColor: '#666',
	},
	ingredientHinted: {
		borderColor: '#FFC832',
		borderWidth: 2,
		shadowColor: '#FFC832',
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.8,
		shadowRadius: 8,
		elevation: 6,
	},
	ingredientEmoji: {
		fontSize: 28,
		marginBottom: 4,
	},
	ingredientName: {
		fontSize: 10,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#E0E0E0',
		textAlign: 'center',
		letterSpacing: 0.5,
	},
	ingredientNameSelected: {
		color: '#888',
	},
	checkMark: {
		position: 'absolute',
		top: 2,
		right: 2,
	},
	checkMarkText: {
		fontSize: 14,
		fontWeight: '900',
		color: '#4CAF50',
	},
	crossMark: {
		position: 'absolute',
		top: 2,
		right: 2,
	},
	crossMarkText: {
		fontSize: 14,
		fontWeight: '900',
		color: '#FF1744',
	},
	hintButton: {
		position: 'absolute',
		bottom: 24,
		alignSelf: 'center',
		backgroundColor: 'rgba(10, 10, 10, 0.85)',
		borderWidth: 2,
		borderColor: '#FFC832',
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 20,
		zIndex: 55,
	},
	hintButtonText: {
		fontSize: 16,
		fontWeight: '900',
		fontFamily: 'Bangers',
		color: '#FFC832',
		letterSpacing: 2,
	},
});
