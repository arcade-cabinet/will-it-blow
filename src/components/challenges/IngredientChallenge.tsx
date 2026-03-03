/**
 * @module IngredientChallenge
 * Challenge 1 of 5: Ingredient selection from the 3D fridge.
 *
 * This is the UI overlay for the ingredient-picking challenge. The player
 * must select ingredients from the fridge that match Mr. Sausage's criteria
 * (e.g., "spicy meats"). Uses the "fridge bridge" pattern for 3D-to-2D
 * communication:
 *
 * **Scoring flow:**
 * 1. On mount, picks a variant (criteria + requiredCount) and generates a
 *    random pool of 10 ingredients, guaranteeing enough matching ones.
 * 2. Pool and matching indices are written to the Zustand store via
 *    `setFridgePool()` so FridgeStation (3D) can render them.
 * 3. When the player clicks a 3D ingredient, FridgeStation calls
 *    `triggerFridgeClick(index)` on the store. This overlay watches
 *    `pendingFridgeClick` in a useEffect and processes the pick.
 * 4. Alternatively, ingredients can be grabbed and dropped into the bowl
 *    (physics path), tracked via `bowlContents` changes.
 * 5. Correct picks advance progress; wrong picks add strikes. Score =
 *    100 - (strikes * 15).
 *
 * **Phases:** dialogue -> selecting -> success/failure -> complete
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import type {IngredientVariant} from '../../config/types';
import {
  INGREDIENTS_DIALOGUE,
  INGREDIENTS_FAIL,
  INGREDIENTS_SUCCESS,
} from '../../data/dialogue/ingredients';
import {INTRO_DIALOGUE} from '../../data/dialogue/intro';
import {audioEngine} from '../../engine/AudioEngine';
import {pickVariant} from '../../engine/ChallengeRegistry';
import {filterMatchingIngredients, matchesCriteria} from '../../engine/IngredientMatcher';
import {getRandomIngredientPool, INGREDIENTS} from '../../engine/Ingredients';
import {useGameStore} from '../../store/gameStore';
import type {Reaction} from '../characters/reactions';
import {DialogueOverlay} from '../ui/DialogueOverlay';
import {ProgressGauge} from '../ui/ProgressGauge';

/**
 * @param props.onComplete - Called with the final score (0-100) when the challenge ends
 * @param props.onReaction - Triggers Mr. Sausage reactions on the CRT TV
 */
interface IngredientChallengeProps {
  onComplete: (score: number) => void;
  onReaction?: (reaction: Reaction) => void;
}

type ChallengePhase = 'dialogue' | 'selecting' | 'success' | 'failure' | 'complete';

const SCORE_PENALTY_PER_STRIKE = 15;
const REACTION_RESET_MS = 1500;
const COMPLETE_DELAY_MS = 1200;
const INGREDIENT_POOL_SIZE = 10;

export function IngredientChallenge({onComplete, onReaction}: IngredientChallengeProps) {
  const [phase, setPhase] = useState<ChallengePhase>('dialogue');
  const [correctCount, setCorrectCount] = useState(0);
  const [variant, setVariant] = useState<IngredientVariant | null>(null);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);

  const {
    strikes,
    addStrike,
    hintsRemaining,
    variantSeed,
    setChallengeProgress,
    gameStatus,
    setHintActive: setStoreHintActive,
    pendingFridgeClick,
    clearFridgeClick,
    addFridgeSelected,
    fridgePool,
    fridgeMatchingIndices,
    fridgeSelectedIndices,
    fridgeHoveredIndex,
    setFridgePool,
    bowlContents,
  } = useGameStore();

  // Refs for values read in the click handler to avoid stale closures
  const correctCountRef = useRef(correctCount);
  correctCountRef.current = correctCount;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Initialize variant and ingredient pool on mount → write to store for 3D
  useEffect(() => {
    const v = pickVariant('ingredients', variantSeed) as IngredientVariant;
    setVariant(v);
    const pool = getRandomIngredientPool(INGREDIENT_POOL_SIZE);

    // Calculate which pool indices match the variant criteria
    const matching: number[] = [];
    pool.forEach((ing, i) => {
      if (matchesCriteria(ing, v.criteria)) {
        matching.push(i);
      }
    });

    // Guarantee at least requiredCount matching ingredients in pool
    if (matching.length < v.requiredCount) {
      const allMatching = filterMatchingIngredients(INGREDIENTS, v.criteria);
      const alreadyInPool = new Set(pool.map(ing => ing.name));
      const available = allMatching.filter(ing => !alreadyInPool.has(ing.name));
      // Indices of non-matching pool items we can replace
      const nonMatchingIndices = pool.map((_, i) => i).filter(i => !matching.includes(i));
      let needed = v.requiredCount - matching.length;
      let availIdx = 0;
      let replaceIdx = 0;
      while (needed > 0 && replaceIdx < nonMatchingIndices.length) {
        // Pick from available extras first, then cycle through allMatching
        const replacement =
          availIdx < available.length
            ? available[availIdx++]
            : allMatching[availIdx++ % allMatching.length];
        const targetIdx = nonMatchingIndices[replaceIdx++];
        pool[targetIdx] = replacement;
        matching.push(targetIdx);
        needed--;
      }
    }

    // Write shared pool to store so FridgeStation 3D reads it
    setFridgePool(pool, matching);
  }, [variantSeed, setFridgePool]);

  // Shared scoring logic for ingredient picks (click or physics drop)
  const processIngredientPick = useCallback(
    (poolIndex: number) => {
      if (!variant) return;

      // Already selected — ignore
      if (fridgeSelectedIndices.includes(poolIndex)) return;

      // Mark as selected in the shared store (3D reads this for visual state)
      addFridgeSelected(poolIndex);

      const matchingSet = new Set(fridgeMatchingIndices);
      if (matchingSet.has(poolIndex)) {
        const newCount = correctCountRef.current + 1;
        setCorrectCount(newCount);
        setLastResult('correct');
        onReaction?.('excitement');
        audioEngine.playCorrectPick();
        setChallengeProgress((newCount / variant.requiredCount) * 100);

        if (newCount >= variant.requiredCount) {
          setPhase('success');
        }
      } else {
        setLastResult('wrong');
        const ing = fridgePool[poolIndex];
        const isClose =
          ing && variant.criteria.tags.some(tag => matchesCriteria(ing, {tags: [tag]}));
        if (isClose) {
          onReaction?.('nervous');
        } else {
          onReaction?.('disgust');
        }
        addStrike();
        audioEngine.playWrongPick();
      }

      setTimeout(() => {
        setLastResult(null);
        onReaction?.('idle');
      }, REACTION_RESET_MS);
    },
    [
      variant,
      fridgePool,
      fridgeMatchingIndices,
      fridgeSelectedIndices,
      addFridgeSelected,
      addStrike,
      setChallengeProgress,
      onReaction,
    ],
  );

  // Track bowl contents to score ingredients dropped via physics
  const prevBowlLenRef = useRef(0);
  useEffect(() => {
    if (phaseRef.current !== 'selecting' || !variant) return;
    if (bowlContents.length <= prevBowlLenRef.current) {
      prevBowlLenRef.current = bowlContents.length;
      return;
    }

    const newIngredientId = bowlContents[bowlContents.length - 1];
    prevBowlLenRef.current = bowlContents.length;

    const poolIndex = fridgePool.findIndex(ing => ing.name === newIngredientId);
    if (poolIndex === -1) return;

    processIngredientPick(poolIndex);
  }, [bowlContents, variant, fridgePool, processIngredientPick]);

  // Watch for defeat (3 strikes) to trigger failure dialogue
  useEffect(() => {
    if (gameStatus === 'defeat' && phase === 'selecting') {
      setPhase('failure');
    }
  }, [gameStatus, phase]);

  // Process 3D fridge clicks from the store
  useEffect(() => {
    if (pendingFridgeClick === null || !variant || phaseRef.current !== 'selecting') return;

    const index = pendingFridgeClick;
    clearFridgeClick();

    processIngredientPick(index);
  }, [pendingFridgeClick, variant, clearFridgeClick, processIngredientPick]);

  // Handle hint activation
  const handleHint = useCallback(() => {
    if (hintsRemaining > 0) {
      // biome-ignore lint/correctness/useHookAtTopLevel: useHint is a Zustand store action, not a React hook
      useGameStore.getState().useHint();
      setStoreHintActive(true);
      setTimeout(() => {
        setStoreHintActive(false);
      }, 3000);
    }
  }, [hintsRemaining, setStoreHintActive]);

  // Handle dialogue completion
  const handleDialogueComplete = useCallback(
    (effects: string[]) => {
      if (effects.includes('hint')) {
        setStoreHintActive(true);
        setTimeout(() => {
          setStoreHintActive(false);
        }, 3000);
      }
      setPhase('selecting');
      onReaction?.('idle');
    },
    [onReaction, setStoreHintActive],
  );

  // Handle success dialogue completion
  const handleSuccessComplete = useCallback(() => {
    setPhase('complete');
    const score = Math.max(0, 100 - strikes * SCORE_PENALTY_PER_STRIKE);
    setTimeout(() => onComplete(score), COMPLETE_DELAY_MS);
  }, [strikes, onComplete]);

  // Handle failure dialogue completion
  const handleFailureComplete = useCallback(() => {
    setPhase('complete');
  }, []);

  const requiredCount = variant?.requiredCount ?? 3;
  const progressPercent = (correctCount / requiredCount) * 100;

  // Hovered ingredient name from 3D scene
  const hoveredIngredient = fridgeHoveredIndex !== null ? fridgePool[fridgeHoveredIndex] : null;

  if (!variant) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Intro + ingredients dialogue */}
      {phase === 'dialogue' && (
        <DialogueOverlay
          lines={[...INTRO_DIALOGUE, ...INGREDIENTS_DIALOGUE]}
          onComplete={handleDialogueComplete}
        />
      )}

      {/* Success dialogue */}
      {phase === 'success' && (
        <DialogueOverlay lines={INGREDIENTS_SUCCESS} onComplete={handleSuccessComplete} />
      )}

      {/* Failure dialogue */}
      {phase === 'failure' && (
        <DialogueOverlay lines={INGREDIENTS_FAIL} onComplete={handleFailureComplete} />
      )}

      {/* Main gameplay UI — no emoji grid, player clicks 3D objects in the fridge */}
      {phase === 'selecting' && (
        <>
          {/* Demand banner at top */}
          <View
            style={styles.demandBanner}
            accessibilityRole="alert"
            accessibilityLabel={`Mr. Sausage demands: ${variant.mrSausageDemand}`}
          >
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
            <View style={styles.resultFlash} accessibilityLiveRegion="assertive">
              <Text
                style={[
                  styles.resultText,
                  lastResult === 'correct' ? styles.resultCorrect : styles.resultWrong,
                ]}
                accessibilityRole="alert"
              >
                {lastResult === 'correct' ? 'CORRECT!' : 'WRONG!'}
              </Text>
            </View>
          )}

          {/* Hover tooltip — shows ingredient name when hovering 3D objects */}
          {hoveredIngredient && (
            <View style={styles.hoverTooltip}>
              <Text style={styles.hoverTooltipText}>{hoveredIngredient.name}</Text>
              <Text style={styles.hoverTooltipCategory}>{hoveredIngredient.category}</Text>
            </View>
          )}

          {/* Instruction hint at bottom */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              Click ingredients in the fridge, or grab and drop them in the bowl
            </Text>
          </View>

          {/* Hint button at bottom */}
          {hintsRemaining > 0 && (
            <TouchableOpacity
              style={styles.hintButton}
              onPress={handleHint}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Use hint, ${hintsRemaining} remaining`}
              accessibilityHint="Highlights matching ingredients"
            >
              <Text style={styles.hintButtonText}>HINT ({hintsRemaining} left)</Text>
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
    textShadowOffset: {width: 0, height: 0},
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
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
  resultText: {
    fontSize: 36,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 4,
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 16,
  },
  resultCorrect: {
    color: '#4CAF50',
    textShadowColor: 'rgba(76, 175, 80, 0.7)',
  },
  resultWrong: {
    color: '#FF1744',
    textShadowColor: 'rgba(255, 23, 68, 0.7)',
  },
  hoverTooltip: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderWidth: 1,
    borderColor: '#FFC832',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 55,
  },
  hoverTooltipText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 1,
  },
  hoverTooltipCategory: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 55,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#666',
    letterSpacing: 2,
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
