/**
 * @module GrindingHUD
 * Thin read-only HUD overlay for the grinding challenge.
 *
 * Displays timer, progress bar, speed zone indicator, and splatter flash.
 * Also handles dialogue phase display. ZERO input handling — all game logic
 * lives in GrinderOrchestrator.
 *
 * Data flow: GrinderOrchestrator → Zustand store → GrindingHUD reads & displays.
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {GRINDING_DIALOGUE, GRINDING_SUCCESS} from '../../data/dialogue/grinding';
import {useGameStore} from '../../store/gameStore';
import {DialogueOverlay} from '../ui/DialogueOverlay';
import {ProgressGauge} from '../ui/ProgressGauge';

export function GrindingHUD() {
  const challengePhase = useGameStore(s => s.challengePhase);
  const challengeProgress = useGameStore(s => s.challengeProgress);
  const challengeTimeRemaining = useGameStore(s => s.challengeTimeRemaining);
  const challengeSpeedZone = useGameStore(s => s.challengeSpeedZone);
  const strikes = useGameStore(s => s.strikes);
  const setChallengePhase = useGameStore(s => s.setChallengePhase);

  // Splatter flash on new strike
  const [isSplattering, setIsSplattering] = useState(false);
  const prevStrikesRef = useRef(strikes);

  useEffect(() => {
    if (strikes > prevStrikesRef.current) {
      setIsSplattering(true);
      const timer = setTimeout(() => setIsSplattering(false), 800);
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
        <DialogueOverlay lines={GRINDING_DIALOGUE} onComplete={handleDialogueComplete} />
      )}

      {/* Success dialogue */}
      {challengePhase === 'success' && (
        <DialogueOverlay lines={GRINDING_SUCCESS} onComplete={handleSuccessComplete} />
      )}

      {/* Active gameplay HUD */}
      {challengePhase === 'active' && (
        <>
          {/* Timer */}
          <View style={styles.timerBanner}>
            <Text style={[styles.timerText, challengeTimeRemaining < 10 && styles.timerDanger]}>
              {Math.ceil(challengeTimeRemaining)}s
            </Text>
          </View>

          {/* Progress gauge */}
          <View style={styles.progressContainer}>
            <ProgressGauge value={challengeProgress} label="GRIND PROGRESS" color="#4CAF50" />
          </View>

          {/* Speed zone feedback */}
          <View style={styles.zoneFeedback}>
            <Text
              style={[
                styles.zoneFeedbackText,
                challengeSpeedZone === 'slow' && styles.zoneSlow,
                challengeSpeedZone === 'good' && styles.zoneGood,
                challengeSpeedZone === 'fast' && styles.zoneFast,
              ]}
            >
              {challengeSpeedZone === 'slow' && 'TOO SLOW!'}
              {challengeSpeedZone === 'good' && 'PERFECT!'}
              {challengeSpeedZone === 'fast' && 'TOO FAST!'}
            </Text>
          </View>

          {/* Splatter flash overlay */}
          {isSplattering && <View style={styles.splatterOverlay} pointerEvents="none" />}
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
  progressContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    zIndex: 55,
  },
  zoneFeedback: {
    position: 'absolute',
    top: 165,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 55,
  },
  zoneFeedbackText: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 3,
  },
  zoneSlow: {
    color: '#FF9800',
    textShadowColor: 'rgba(255, 152, 0, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  zoneGood: {
    color: '#4CAF50',
    textShadowColor: 'rgba(76, 175, 80, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  zoneFast: {
    color: '#FF1744',
    textShadowColor: 'rgba(255, 23, 68, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  splatterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180, 0, 0, 0.25)',
    borderWidth: 8,
    borderColor: 'rgba(200, 0, 0, 0.6)',
    zIndex: 80,
  },
});
