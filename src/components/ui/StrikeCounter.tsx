/**
 * @module StrikeCounter
 * HUD showing strike indicators (circles that turn to red X marks).
 *
 * Pure presentational — receives strikes/maxStrikes via props.
 */

import {StyleSheet, Text, View} from 'react-native';

interface StrikeCounterProps {
  strikes: number;
  maxStrikes?: number;
}

export function StrikeCounter({strikes, maxStrikes = 3}: StrikeCounterProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`${strikes} of ${maxStrikes} strikes used`}
    >
      {Array.from({length: maxStrikes}, (_, i) => (
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
  },
  used: {
    color: '#FF1744',
  },
  unused: {
    color: '#555',
  },
});
