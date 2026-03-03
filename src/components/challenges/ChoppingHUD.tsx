/**
 * @module ChoppingHUD
 * Thin read-only HUD overlay for the chopping challenge.
 *
 * Displays timer, progress bar, timing zone indicator, and streak counter.
 * Also handles dialogue phase display. ZERO input handling — all game logic
 * lives in ChoppingOrchestrator.
 *
 * Data flow: ChoppingOrchestrator → Zustand store → ChoppingHUD reads & displays.
 */

import {useCallback} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {CHOPPING_DIALOGUE, CHOPPING_SUCCESS} from '../../data/dialogue/chopping';
import {useGameStore} from '../../store/gameStore';
import {DialogueOverlay} from '../ui/DialogueOverlay';
import {ProgressGauge} from '../ui/ProgressGauge';

export function ChoppingHUD() {
  const challengePhase = useGameStore(s => s.challengePhase);
  const challengeProgress = useGameStore(s => s.challengeProgress);
  const challengeTimeRemaining = useGameStore(s => s.challengeTimeRemaining);
  const challengeSpeedZone = useGameStore(s => s.challengeSpeedZone);
  const setChallengePhase = useGameStore(s => s.setChallengePhase);

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
        <DialogueOverlay lines={CHOPPING_DIALOGUE} onComplete={handleDialogueComplete} />
      )}

      {/* Success dialogue */}
      {challengePhase === 'success' && (
        <DialogueOverlay lines={CHOPPING_SUCCESS} onComplete={handleSuccessComplete} />
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
            <ProgressGauge value={challengeProgress} label="CHOP PROGRESS" color="#FF9800" />
          </View>

          {/* Timing zone feedback */}
          <View style={styles.zoneFeedback}>
            <Text
              style={[
                styles.zoneFeedbackText,
                challengeSpeedZone === 'slow' && styles.zoneClose,
                challengeSpeedZone === 'good' && styles.zoneSweet,
                challengeSpeedZone === 'fast' && styles.zoneWait,
              ]}
            >
              {challengeSpeedZone === 'slow' && 'ALMOST...'}
              {challengeSpeedZone === 'good' && 'CHOP NOW!'}
              {challengeSpeedZone === 'fast' && 'WAIT...'}
            </Text>
          </View>
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
    borderColor: '#FF9800',
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
  zoneClose: {
    color: '#FF9800',
    textShadowColor: 'rgba(255, 152, 0, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  zoneSweet: {
    color: '#4CAF50',
    textShadowColor: 'rgba(76, 175, 80, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  zoneWait: {
    color: '#9E9E9E',
    textShadowColor: 'rgba(158, 158, 158, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
});
