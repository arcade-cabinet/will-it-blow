/**
 * @module StuffingHUD
 * Thin read-only HUD overlay for the stuffing challenge.
 *
 * Displays timer, fill gauge, pressure gauge, burst flash, and warning text.
 * Also handles dialogue phase display. ZERO input handling — all game logic
 * lives in StufferOrchestrator.
 *
 * Data flow: StufferOrchestrator → Zustand store → StuffingHUD reads & displays.
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {STUFFING_DIALOGUE, STUFFING_SUCCESS} from '../../data/dialogue/stuffing';
import {useGameStore} from '../../store/gameStore';
import {DialogueOverlay} from '../ui/DialogueOverlay';
import {ProgressGauge} from '../ui/ProgressGauge';

export function StuffingHUD() {
  const challengePhase = useGameStore(s => s.challengePhase);
  const challengeProgress = useGameStore(s => s.challengeProgress);
  const challengePressure = useGameStore(s => s.challengePressure);
  const challengeTimeRemaining = useGameStore(s => s.challengeTimeRemaining);
  const challengeIsPressing = useGameStore(s => s.challengeIsPressing);
  const strikes = useGameStore(s => s.strikes);
  const setChallengePhase = useGameStore(s => s.setChallengePhase);

  // Burst flash on new strike
  const [burstFlash, setBurstFlash] = useState(false);
  const prevStrikesRef = useRef(strikes);

  useEffect(() => {
    if (strikes > prevStrikesRef.current) {
      setBurstFlash(true);
      const timer = setTimeout(() => setBurstFlash(false), 1000);
      prevStrikesRef.current = strikes;
      return () => clearTimeout(timer);
    }
    prevStrikesRef.current = strikes;
  }, [strikes]);

  const handleDialogueComplete = useCallback(
    (_effects: string[]) => {
      setChallengePhase('active');
    },
    [setChallengePhase],
  );

  const handleSuccessComplete = useCallback(
    (_effects: string[]) => {
      setChallengePhase('complete');
    },
    [setChallengePhase],
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Intro dialogue */}
      {challengePhase === 'dialogue' && (
        <DialogueOverlay lines={STUFFING_DIALOGUE} onComplete={handleDialogueComplete} />
      )}

      {/* Success dialogue */}
      {challengePhase === 'success' && (
        <DialogueOverlay lines={STUFFING_SUCCESS} onComplete={handleSuccessComplete} />
      )}

      {/* Active gameplay HUD */}
      {challengePhase === 'active' && (
        <>
          {/* Timer */}
          <View style={styles.timerBanner}>
            <Text
              style={[styles.timerText, challengeTimeRemaining < 10 && styles.timerDanger]}
            >
              {Math.ceil(challengeTimeRemaining)}s
            </Text>
          </View>

          {/* Fill and Pressure gauges side by side */}
          <View style={styles.gaugesRow}>
            <View style={styles.gaugeWrapper}>
              <ProgressGauge value={challengeProgress} label="FILL" color="#4CAF50" />
            </View>
            <View style={styles.gaugeWrapper}>
              <ProgressGauge
                value={challengePressure}
                label="PRESSURE"
                color="#FFC107"
                dangerThreshold={85}
              />
            </View>
          </View>

          {/* Warning text when pressure is high */}
          {challengePressure > 70 && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>CAREFUL!</Text>
            </View>
          )}

          {/* Status indicator */}
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusText,
                challengeIsPressing ? styles.statusPressing : styles.statusReleased,
              ]}
            >
              {challengeIsPressing ? 'FILLING...' : 'RELEASE...'}
            </Text>
          </View>

          {/* Burst flash overlay */}
          {burstFlash && <View style={styles.burstOverlay} pointerEvents="none" />}
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
  timerBanner: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderWidth: 2,
    borderColor: '#FF1744',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 20,
    zIndex: 55,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 200, 50, 0.3)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
  },
  timerDanger: {
    color: '#FF1744',
    textShadowColor: 'rgba(255, 23, 68, 0.6)',
  },
  gaugesRow: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    zIndex: 55,
  },
  gaugeWrapper: {
    flex: 1,
  },
  warningContainer: {
    position: 'absolute',
    top: 175,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 55,
  },
  warningText: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 4,
    textShadowColor: 'rgba(255, 23, 68, 0.8)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
  statusContainer: {
    position: 'absolute',
    top: 210,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 55,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 3,
  },
  statusPressing: {
    color: '#FFC832',
    textShadowColor: 'rgba(255, 200, 50, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  statusReleased: {
    color: '#4CAF50',
    textShadowColor: 'rgba(76, 175, 80, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  burstOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200, 0, 0, 0.35)',
    borderWidth: 10,
    borderColor: 'rgba(255, 0, 0, 0.7)',
    zIndex: 80,
  },
});
