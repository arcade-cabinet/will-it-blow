/**
 * @module CookingHUD
 * Thin read-only HUD overlay for the cooking challenge.
 *
 * Displays timer, temperature readout, target temp, hold progress gauge,
 * PERFECT badge, heat level indicator, and overheat flash.
 * Also handles dialogue phase display. ZERO input handling — all game logic
 * lives in CookingOrchestrator.
 *
 * Data flow: CookingOrchestrator → Zustand store → CookingHUD reads & displays.
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {CookingVariant} from '../../data/challenges/variants';
import {COOKING_DIALOGUE, COOKING_SUCCESS} from '../../data/dialogue/cooking';
import {pickVariant} from '../../engine/ChallengeRegistry';
import {useGameStore} from '../../store/gameStore';
import {DialogueOverlay} from '../ui/DialogueOverlay';
import {ProgressGauge} from '../ui/ProgressGauge';

export function CookingHUD() {
  const challengePhase = useGameStore(s => s.challengePhase);
  const challengeProgress = useGameStore(s => s.challengeProgress);
  const challengeTemperature = useGameStore(s => s.challengeTemperature);
  const challengeHeatLevel = useGameStore(s => s.challengeHeatLevel);
  const challengeTimeRemaining = useGameStore(s => s.challengeTimeRemaining);
  const strikes = useGameStore(s => s.strikes);
  const variantSeed = useGameStore(s => s.variantSeed);
  const setChallengePhase = useGameStore(s => s.setChallengePhase);

  // Get variant for target temp display
  const variant = pickVariant('cooking', variantSeed) as CookingVariant | null;
  const targetTemp = variant?.targetTemp ?? 160;
  const tempTolerance = variant?.tempTolerance ?? 10;
  const holdSeconds = variant?.holdSeconds ?? 5;

  const inTargetZone = Math.abs(challengeTemperature - targetTemp) <= tempTolerance;

  // Overheat flash on new strike
  const [overheatFlash, setOverheatFlash] = useState(false);
  const prevStrikesRef = useRef(strikes);

  useEffect(() => {
    if (strikes > prevStrikesRef.current) {
      setOverheatFlash(true);
      const timer = setTimeout(() => setOverheatFlash(false), 600);
      prevStrikesRef.current = strikes;
      return () => clearTimeout(timer);
    }
    prevStrikesRef.current = strikes;
  }, [strikes]);

  // Temperature zone color
  const getTempColor = () => {
    if (challengeTemperature < targetTemp - tempTolerance) return '#4FC3F7'; // blue-cold
    if (challengeTemperature <= targetTemp + tempTolerance) return '#4CAF50'; // green-perfect
    return '#FF1744'; // red-hot
  };

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

  // Heat level label
  const heatLabels = ['OFF', 'LOW', 'MED', 'HIGH'];
  const heatIndex = Math.min(3, Math.round(challengeHeatLevel));

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Intro dialogue */}
      {challengePhase === 'dialogue' && (
        <DialogueOverlay lines={COOKING_DIALOGUE} onComplete={handleDialogueComplete} />
      )}

      {/* Success dialogue */}
      {challengePhase === 'success' && (
        <DialogueOverlay lines={COOKING_SUCCESS} onComplete={handleSuccessComplete} />
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

          {/* Hold progress gauge */}
          <View style={styles.holdGaugeContainer}>
            <ProgressGauge value={challengeProgress} label="HOLD" color="#4CAF50" />
            <Text style={styles.holdTimerText}>
              {((challengeProgress / 100) * holdSeconds).toFixed(1)}s / {holdSeconds}s
            </Text>
          </View>

          {/* Temperature readout */}
          <View style={styles.tempContainer}>
            <Text style={[styles.tempReadout, {color: getTempColor()}]}>
              {Math.round(challengeTemperature)}
              {'\u00B0'}F
            </Text>
            <Text style={styles.targetLabel}>
              TARGET: {targetTemp}
              {'\u00B0'}F {'\u00B1'} {tempTolerance}
              {'\u00B0'}F
            </Text>
            {inTargetZone && (
              <View style={styles.perfectBadge}>
                <Text style={styles.perfectText}>PERFECT</Text>
              </View>
            )}
          </View>

          {/* Heat level indicator */}
          <View style={styles.heatIndicator}>
            <Text style={styles.heatIndicatorText}>HEAT: {heatLabels[heatIndex]}</Text>
          </View>

          {/* Overheat warning flash */}
          {overheatFlash && <View style={styles.overheatOverlay} pointerEvents="none" />}
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
  holdGaugeContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    zIndex: 55,
  },
  holdTimerText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },
  tempContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 55,
  },
  tempReadout: {
    fontSize: 64,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 12,
  },
  targetLabel: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#999',
    letterSpacing: 2,
    marginTop: 4,
  },
  perfectBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  perfectText: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#4CAF50',
    letterSpacing: 4,
    textShadowColor: 'rgba(76, 175, 80, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  heatIndicator: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 55,
  },
  heatIndicatorText: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 2,
  },
  overheatOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200, 0, 0, 0.35)',
    borderWidth: 10,
    borderColor: 'rgba(255, 0, 0, 0.7)',
    zIndex: 80,
  },
});
