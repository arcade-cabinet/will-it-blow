/**
 * @module RoundTransition
 * Between-round summary overlay.
 *
 * Props-driven (no ChallengeRegistry dependency):
 *  - roundNumber, totalRounds, roundScore, totalScore
 *  - onNextRound callback
 */

import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

interface RoundTransitionProps {
  roundNumber: number;
  totalRounds: number;
  roundScore: number;
  totalScore: number;
  onNextRound: () => void;
}

export function RoundTransition({
  roundNumber,
  totalRounds,
  roundScore,
  totalScore,
  onNextRound,
}: RoundTransitionProps) {
  const scoreColor =
    roundScore >= 90
      ? '#FFD700'
      : roundScore >= 70
        ? '#FFC832'
        : roundScore >= 50
          ? '#FF8C00'
          : '#FF1744';

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Round ${roundNumber} of ${totalRounds} complete`}
    >
      <View style={styles.card}>
        <Text style={styles.roundLabel} accessibilityRole="header">
          ROUND {roundNumber} OF {totalRounds}
        </Text>

        <View style={styles.divider} />

        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>ROUND SCORE</Text>
          <Text style={[styles.scoreValue, {color: scoreColor}]}>{Math.round(roundScore)}</Text>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>TOTAL</Text>
          <Text style={[styles.scoreValue, {color: '#FFC832'}]}>{Math.round(totalScore)}</Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.button}
          onPress={onNextRound}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Next round"
        >
          <Text style={styles.buttonText}>NEXT ROUND</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 0, 0, 0.9)',
  },
  card: {
    backgroundColor: '#1a0505',
    borderWidth: 2,
    borderColor: '#8B0000',
    borderRadius: 4,
    paddingVertical: 28,
    paddingHorizontal: 32,
    minWidth: 300,
    maxWidth: 420,
    alignItems: 'center',
  },
  roundLabel: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF1744',
    letterSpacing: 4,
    textAlign: 'center',
  },
  divider: {
    height: 2,
    backgroundColor: '#8B0000',
    width: '100%',
    marginVertical: 16,
    opacity: 0.6,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 6,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ccc',
    letterSpacing: 2,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#D2A24C',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#8B4513',
  },
  buttonText: {
    color: '#1a0a00',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
