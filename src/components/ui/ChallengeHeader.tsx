/**
 * @module ChallengeHeader
 * Top-of-screen HUD showing the current challenge number and name.
 *
 * Reads `currentChallenge` from the Zustand store and looks up the
 * challenge config from `ChallengeRegistry`. Renders as a centered
 * absolute-positioned overlay at zIndex 70 (below hints/strikes at 80,
 * below dialogue at 90).
 *
 * Returns null if the challenge index is out of range (e.g., during
 * transitions or before the first challenge starts).
 */

import {StyleSheet, Text, View} from 'react-native';
import {CHALLENGE_ORDER, getChallengeConfig} from '../../engine/ChallengeRegistry';
import {useGameStore} from '../../store/gameStore';

/** Displays "CHALLENGE N/5" label and the challenge name at the top of the screen. */
export function ChallengeHeader() {
  const {currentChallenge} = useGameStore();

  const challengeId = CHALLENGE_ORDER[currentChallenge];
  if (!challengeId) return null;

  const config = getChallengeConfig(challengeId);

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Challenge ${currentChallenge + 1} of ${CHALLENGE_ORDER.length}: ${config.name}`}
    >
      <Text style={styles.challengeNumber} accessibilityRole="text">
        CHALLENGE {currentChallenge + 1}/{CHALLENGE_ORDER.length}
      </Text>
      <Text style={styles.challengeName} accessibilityRole="header">
        {config.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 70,
  },
  challengeNumber: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  challengeName: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 23, 68, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
});
