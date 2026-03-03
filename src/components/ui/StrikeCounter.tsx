/**
 * @module StrikeCounter
 * Top-left HUD showing 3 strike indicators (circles that turn to red X marks).
 *
 * Reads `strikes` from the Zustand store. Renders MAX_STRIKES (3) symbols:
 * used strikes show a red X with a glowing text shadow, unused strikes
 * show a dim gray circle. When strikes reaches 3, the game triggers
 * a defeat via the challenge overlay logic.
 *
 * Positioned at zIndex 80, same level as the HintButton.
 */

import {StyleSheet, Text, View} from 'react-native';
import {useGameStore} from '../../store/gameStore';

const MAX_STRIKES = 3;

/** Displays 3 strike indicators — red X for used, gray circle for remaining. */
export function StrikeCounter() {
  const {strikes} = useGameStore();

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`${strikes} of ${MAX_STRIKES} strikes used`}
    >
      {Array.from({length: MAX_STRIKES}, (_, i) => (
        <Text
          key={i}
          style={[styles.strike, i < strikes ? styles.used : styles.unused]}
          accessibilityLabel={i < strikes ? `Strike ${i + 1} used` : `Strike ${i + 1} remaining`}
        >
          {i < strikes ? '\u2715' : '\u25CB'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 80,
  },
  strike: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Bangers',
  },
  used: {
    color: '#FF1744',
    textShadowColor: 'rgba(255, 23, 68, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
  },
  unused: {
    color: '#555',
  },
});
