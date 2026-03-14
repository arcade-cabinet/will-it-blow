/**
 * @module ChallengeHeader
 * Top-of-screen HUD showing the current challenge number and name.
 *
 * Reads `gamePhase` from the Zustand store and maps it to a player-facing
 * challenge number (1-7). Returns null for transition phases.
 */

import {StyleSheet, Text, View} from 'react-native';
import {type GamePhase, useGameStore} from '../../ecs/hooks';

/** Maps GamePhase values to player-facing challenge info. Transition phases return null. */
const PHASE_TO_CHALLENGE: Partial<Record<GamePhase, {number: number; name: string}>> = {
  SELECT_INGREDIENTS: {number: 1, name: 'SELECT INGREDIENTS'},
  CHOPPING: {number: 2, name: 'CHOPPING'},
  FILL_GRINDER: {number: 3, name: 'FILL GRINDER'},
  GRINDING: {number: 3, name: 'GRINDING'},
  STUFFING: {number: 4, name: 'STUFFING'},
  TIE_CASING: {number: 5, name: 'TIE CASING'},
  BLOWOUT: {number: 5, name: 'BLOWOUT'},
  COOKING: {number: 6, name: 'COOKING'},
  DONE: {number: 7, name: 'TASTING'},
};

const TOTAL_CHALLENGES = 7;

export function ChallengeHeader() {
  const gamePhase = useGameStore(s => s.gamePhase);

  const challenge = PHASE_TO_CHALLENGE[gamePhase];
  if (!challenge) return null;

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Challenge ${challenge.number} of ${TOTAL_CHALLENGES}: ${challenge.name}`}
    >
      <Text style={styles.challengeNumber} accessibilityRole="text">
        CHALLENGE {challenge.number}/{TOTAL_CHALLENGES}
      </Text>
      <Text style={styles.challengeName} accessibilityRole="header">
        {challenge.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 70,
  },
  challengeNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: '#888',
    letterSpacing: 3,
    marginBottom: 2,
  },
  challengeName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FF1744',
    letterSpacing: 2,
    textAlign: 'center',
  },
});
