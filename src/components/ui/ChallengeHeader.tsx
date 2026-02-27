import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';
import {
  getChallengeConfig,
  CHALLENGE_ORDER,
} from '../../engine/ChallengeRegistry';

export function ChallengeHeader() {
  const { currentChallenge } = useGameStore();

  const challengeId = CHALLENGE_ORDER[currentChallenge];
  if (!challengeId) return null;

  const config = getChallengeConfig(challengeId);

  return (
    <View style={styles.container}>
      <Text style={styles.challengeNumber}>
        CHALLENGE {currentChallenge + 1}/{CHALLENGE_ORDER.length}
      </Text>
      <Text style={styles.challengeName}>{config.name}</Text>
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
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
