/**
 * @module HintButton
 * Floating hint button (top-right corner) that reveals matching
 * ingredients during the IngredientChallenge.
 *
 * Displays a lightbulb emoji with a remaining-hints counter. When pressed,
 * decrements `hintsRemaining` in the Zustand store and calls `onHint()`
 * so the challenge overlay can activate hint glow on matching ingredients.
 * Visually disabled (40% opacity) and non-interactive when no hints remain.
 *
 * Positioned at zIndex 80, above the ChallengeHeader (70) but below
 * dialogue (90) and game-over (100).
 *
 * @param props.onHint - Called after the hint is consumed to trigger hint glow
 */

import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {useGameStore} from '../../store/gameStore';

interface HintButtonProps {
  onHint: () => void;
}

/** Floating hint button with remaining-hints counter. Disables when hints are exhausted. */
export function HintButton({onHint}: HintButtonProps) {
  const {hintsRemaining} = useGameStore();
  const isDisabled = hintsRemaining <= 0;

  const handlePress = () => {
    if (isDisabled) return;
    // biome-ignore lint/correctness/useHookAtTopLevel: Zustand store action, not a React hook
    useGameStore.getState().useHint();
    onHint();
  };

  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={handlePress}
      activeOpacity={isDisabled ? 1 : 0.7}
      disabled={isDisabled}
    >
      <Text style={styles.emoji}>💡</Text>
      <Text style={[styles.countText, isDisabled && styles.countDisabled]}>{hintsRemaining}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    borderWidth: 2,
    borderColor: '#FFC832',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    zIndex: 80,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  emoji: {
    fontSize: 20,
  },
  countText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 1,
  },
  countDisabled: {
    color: '#666',
  },
});
