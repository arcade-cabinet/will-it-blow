/**
 * @module BlowoutHUD
 * Thin read-only HUD overlay for the blowout challenge.
 *
 * Displays: timer, pressure gauge, coverage meter, BLOW! prompt.
 * Handles dialogue phase and TieGesture overlay.
 * ZERO input handling — all game logic lives in BlowoutOrchestrator.
 *
 * Data flow: BlowoutOrchestrator → Zustand store → BlowoutHUD reads & displays.
 * TieGesture is rendered here during the 'tie' sub-phase (when store.casingTied === false
 * and challengePhase === 'active').
 */

import {useCallback} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BLOWOUT_DIALOGUE, BLOWOUT_SUCCESS} from '../../data/dialogue/blowout';
import {useGameStore} from '../../store/gameStore';
import {DialogueOverlay} from '../ui/DialogueOverlay';
import {ProgressGauge} from '../ui/ProgressGauge';
import {TieGesture} from './TieGesture';

export function BlowoutHUD() {
  const challengePhase = useGameStore(s => s.challengePhase);
  const challengeProgress = useGameStore(s => s.challengeProgress);
  const challengeTimeRemaining = useGameStore(s => s.challengeTimeRemaining);
  const casingTied = useGameStore(s => s.casingTied);
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

  // TieGesture completion is handled inside TieGesture itself (sets store.casingTied)
  // BlowoutOrchestrator watches casingTied to advance to 'blow' phase
  const handleTieComplete = useCallback(() => {
    // Orchestrator handles the phase transition via casingTied store field
  }, []);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Intro dialogue */}
      {challengePhase === 'dialogue' && (
        <DialogueOverlay lines={BLOWOUT_DIALOGUE} onComplete={handleDialogueComplete} />
      )}

      {/* Success dialogue */}
      {challengePhase === 'success' && (
        <DialogueOverlay lines={BLOWOUT_SUCCESS} onComplete={handleSuccessComplete} />
      )}

      {/* Tie phase — active but casing not yet tied */}
      {challengePhase === 'active' && !casingTied && <TieGesture onComplete={handleTieComplete} />}

      {/* Blow phase — active and casing tied */}
      {challengePhase === 'active' && casingTied && (
        <>
          {/* Timer */}
          <View style={styles.timerBanner}>
            <Text style={[styles.timerText, challengeTimeRemaining < 10 && styles.timerDanger]}>
              {Math.ceil(challengeTimeRemaining)}s
            </Text>
          </View>

          {/* Coverage meter */}
          <View style={styles.gaugeContainer}>
            <ProgressGauge value={challengeProgress} label="COVERAGE" color="#FFC832" />
          </View>

          {/* BLOW prompt */}
          <View style={styles.blowPrompt}>
            <Text style={styles.blowPromptText}>HOLD TO BLOW</Text>
            <Text style={styles.blowSubText}>Release to fire</Text>
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
  gaugeContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    zIndex: 55,
  },
  blowPrompt: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
    borderWidth: 2,
    borderColor: '#FFC832',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 28,
    alignItems: 'center',
    zIndex: 55,
  },
  blowPromptText: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 4,
    textShadowColor: 'rgba(255, 200, 50, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
  blowSubText: {
    fontSize: 14,
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 1,
    marginTop: 2,
  },
});
