/**
 * @module CookingChallenge
 * Challenge 4 of 5: Temperature control via a vertical heat slider.
 *
 * The player drags a vertical slider to control heat level (0-1). Temperature
 * responds with physics: heat adds degrees, natural cooling removes degrees.
 * The goal is to reach the target temperature zone and hold it for
 * `variant.holdSeconds`.
 *
 * **Temperature model:**
 * `tempChange = (heatLevel * heatRate - COOLING_RATE) * dt`
 * Clamped to [ROOM_TEMP, 280].
 *
 * **Overheat:** If temp exceeds targetTemp + tolerance*2, a strike is added.
 * Overheat flag resets when temp drops back below threshold.
 *
 * **Store sync:** Temperature and heatLevel are written to the Zustand store
 * (`setChallengeTemperature`, `setChallengeHeatLevel`) so the 3D StoveStation
 * can visualize burner glow, sausage color, sizzle/smoke particles.
 *
 * **Scoring:** 100 - (overheats * 15) - (overtime * 3) + (noOverheat bonus 10).
 *
 * **Phases:** dialogue -> cooking -> success -> complete
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {PanResponder, StyleSheet, Text, View} from 'react-native';
import type {CookingVariant} from '../../data/challenges/variants';
import {COOKING_DIALOGUE, COOKING_SUCCESS} from '../../data/dialogue/cooking';
import {audioEngine} from '../../engine/AudioEngine';
import {pickVariant} from '../../engine/ChallengeRegistry';
import {useGameStore} from '../../store/gameStore';
import type {Reaction} from '../characters/reactions';
import {DialogueOverlay} from '../ui/DialogueOverlay';
import {ProgressGauge} from '../ui/ProgressGauge';

/**
 * @param props.onComplete - Called with the final score (0-100) when the challenge ends
 * @param props.onReaction - Triggers Mr. Sausage reactions on the CRT TV
 */
interface CookingChallengeProps {
  onComplete: (score: number) => void;
  onReaction?: (reaction: Reaction) => void;
}

type ChallengePhase = 'dialogue' | 'cooking' | 'success' | 'complete';

const TICK_INTERVAL_MS = 16; // ~60fps
const COOLING_RATE = 3; // degrees per second when heat is off
const ROOM_TEMP = 70;
const SCORE_PENALTY_PER_OVERHEAT = 15;
const SCORE_PENALTY_PER_OVERTIME_SEC = 3;
const SCORE_BONUS_NO_OVERHEAT = 10;
const COMPLETE_DELAY_MS = 1200;

// Slider layout
const SLIDER_HEIGHT = 280;

export function CookingChallenge({onComplete, onReaction}: CookingChallengeProps) {
  const [phase, setPhase] = useState<ChallengePhase>('dialogue');
  const [variant, setVariant] = useState<CookingVariant | null>(null);
  const [temperature, setTemperature] = useState(ROOM_TEMP);
  const [heatLevel, setHeatLevel] = useState(0);
  const [holdTimer, setHoldTimer] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [_overheatCount, setOverheatCount] = useState(0);
  const [_isOverheated, setIsOverheated] = useState(false);
  const [overheatFlash, setOverheatFlash] = useState(false);
  const [inTargetZone, setInTargetZone] = useState(false);

  const {
    addStrike,
    variantSeed,
    setChallengeProgress,
    setChallengeTemperature,
    setChallengeHeatLevel,
    gameStatus,
  } = useGameStore();

  // Refs for render loop (avoid stale closures)
  const temperatureRef = useRef(ROOM_TEMP);
  const heatLevelRef = useRef(0);
  const holdTimerRef = useRef(0);
  const timeRemainingRef = useRef(30);
  const phaseRef = useRef(phase);
  const variantRef = useRef(variant);
  const overheatCountRef = useRef(0);
  const isOverheatedRef = useRef(false);
  const startTimeRef = useRef(0);

  phaseRef.current = phase;
  variantRef.current = variant;
  const lastSizzleTimeRef = useRef(0);
  const lastBeepSecondRef = useRef(-1);

  // Initialize variant on mount
  useEffect(() => {
    const v = pickVariant('cooking', variantSeed) as CookingVariant;
    setVariant(v);
    setTimeRemaining(v.timerSeconds);
    timeRemainingRef.current = v.timerSeconds;
  }, [variantSeed]);

  // Watch for defeat
  useEffect(() => {
    if (gameStatus === 'defeat' && phase === 'cooking') {
      setPhase('complete');
    }
  }, [gameStatus, phase]);

  // PanResponder for vertical heat slider
  const sliderRef = useRef(heatLevel);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Start tracking from current position
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (phaseRef.current !== 'cooking') return;
        // dy is negative when swiping up (increase heat)
        // Map gesture to heat level change
        const delta = -gestureState.dy / SLIDER_HEIGHT;
        const newHeat = Math.max(0, Math.min(1, sliderRef.current + delta));
        heatLevelRef.current = newHeat;
        setHeatLevel(newHeat);
        setChallengeHeatLevel(newHeat);
      },
      onPanResponderRelease: () => {
        // Lock in current heat level
        sliderRef.current = heatLevelRef.current;
      },
      onPanResponderTerminate: () => {
        sliderRef.current = heatLevelRef.current;
      },
    }),
  ).current;

  // Start/stop sizzle loop when cooking phase changes
  useEffect(() => {
    if (phase === 'cooking') {
      audioEngine.startCookingSizzle();
    } else {
      audioEngine.stopCookingSizzle();
    }
    return () => {
      audioEngine.stopCookingSizzle();
    };
  }, [phase]);

  // Main gameplay tick
  useEffect(() => {
    if (phase !== 'cooking' || !variant) return;

    startTimeRef.current = Date.now();
    // Reset slider ref
    sliderRef.current = 0;

    const interval = setInterval(() => {
      const v = variantRef.current;
      if (!v || phaseRef.current !== 'cooking') return;

      const dt = TICK_INTERVAL_MS / 1000;
      const heat = heatLevelRef.current;
      let newTemp = temperatureRef.current;

      // Temperature physics: heat adds, cooling removes
      const tempChange = (heat * v.heatRate - COOLING_RATE) * dt;
      newTemp = Math.max(ROOM_TEMP, Math.min(280, newTemp + tempChange));

      // Check if in target zone
      const inZone = Math.abs(newTemp - v.targetTemp) <= v.tempTolerance;

      // Hold timer logic
      let newHoldTimer = holdTimerRef.current;
      if (inZone) {
        newHoldTimer = Math.min(v.holdSeconds, newHoldTimer + dt);
      } else {
        // Drain hold timer when outside zone (slowly)
        newHoldTimer = Math.max(0, newHoldTimer - dt * 0.5);
      }

      // Check for overheat (above targetTemp + tolerance * 2)
      const overheatThreshold = v.targetTemp + v.tempTolerance * 2;
      if (newTemp > overheatThreshold && !isOverheatedRef.current) {
        isOverheatedRef.current = true;
        overheatCountRef.current += 1;
        setOverheatCount(overheatCountRef.current);
        setIsOverheated(true);
        setOverheatFlash(true);
        addStrike();
        onReaction?.('flinch');

        setTimeout(() => {
          setOverheatFlash(false);
        }, 600);
      }

      // Reset overheat flag when temp drops back below threshold
      if (newTemp <= overheatThreshold && isOverheatedRef.current) {
        isOverheatedRef.current = false;
        setIsOverheated(false);
      }

      // Update state
      temperatureRef.current = newTemp;
      holdTimerRef.current = newHoldTimer;
      setTemperature(newTemp);
      setHoldTimer(newHoldTimer);
      setInTargetZone(inZone);

      // Sync to store for 3D scene
      setChallengeTemperature(newTemp);
      const holdProgress = (newHoldTimer / v.holdSeconds) * 100;
      setChallengeProgress(holdProgress);

      // Sizzle audio when heat is on (one-shot hits + loop running)
      if (heat > 0.1) {
        const now = Date.now();
        if (now - lastSizzleTimeRef.current > 1200) {
          audioEngine.playSizzleHit();
          lastSizzleTimeRef.current = now;
        }
      }

      // Reactions
      if (inZone) {
        onReaction?.('nod');
      } else if (newTemp > v.targetTemp + v.tempTolerance) {
        onReaction?.('nervous');
      } else {
        onReaction?.('idle');
      }

      // Check for completion
      if (newHoldTimer >= v.holdSeconds) {
        setPhase('success');
        onReaction?.('excitement');
        return;
      }

      // Timer countdown
      const newTime = Math.max(0, timeRemainingRef.current - dt);
      timeRemainingRef.current = newTime;
      setTimeRemaining(newTime);

      // Countdown beep for last 5 seconds
      const currentSecond = Math.ceil(newTime);
      if (currentSecond <= 5 && currentSecond > 0 && currentSecond !== lastBeepSecondRef.current) {
        lastBeepSecondRef.current = currentSecond;
        audioEngine.playCountdownBeep(currentSecond === 1);
      }

      // Timer expired
      if (newTime <= 0) {
        setPhase('complete');
        const holdPct = holdTimerRef.current / v.holdSeconds;
        const score = Math.max(
          0,
          Math.round(holdPct * 100 - overheatCountRef.current * SCORE_PENALTY_PER_OVERHEAT),
        );
        onComplete(score);
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [
    phase,
    variant,
    addStrike,
    setChallengeProgress,
    setChallengeTemperature,
    onComplete,
    onReaction,
  ]);

  // Handle dialogue completion
  const handleDialogueComplete = useCallback(
    (_effects: string[]) => {
      setPhase('cooking');
      onReaction?.('idle');
    },
    [onReaction],
  );

  // Handle success dialogue completion
  const handleSuccessComplete = useCallback(() => {
    setPhase('complete');
    const v = variantRef.current;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const timerLimit = v?.timerSeconds ?? 30;
    const overtime = Math.max(0, elapsed - timerLimit);

    let score = 100;
    score -= overheatCountRef.current * SCORE_PENALTY_PER_OVERHEAT;
    score -= overtime * SCORE_PENALTY_PER_OVERTIME_SEC;
    if (overheatCountRef.current === 0) {
      score += SCORE_BONUS_NO_OVERHEAT;
    }
    score = Math.max(0, Math.min(100, Math.round(score)));

    setTimeout(() => onComplete(score), COMPLETE_DELAY_MS);
  }, [onComplete]);

  if (!variant) return null;

  // Temperature zone color
  const getTempColor = () => {
    if (temperature < variant.targetTemp - variant.tempTolerance) return '#4FC3F7'; // blue-cold
    if (temperature <= variant.targetTemp + variant.tempTolerance) return '#4CAF50'; // green-perfect
    return '#FF1744'; // red-hot
  };

  // Heat slider fill percentage (bottom to top)
  const heatFillPct = Math.round(heatLevel * 100);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Intro dialogue */}
      {phase === 'dialogue' && (
        <DialogueOverlay lines={COOKING_DIALOGUE} onComplete={handleDialogueComplete} />
      )}

      {/* Success dialogue */}
      {phase === 'success' && (
        <DialogueOverlay lines={COOKING_SUCCESS} onComplete={handleSuccessComplete} />
      )}

      {/* Main gameplay UI */}
      {phase === 'cooking' && (
        <>
          {/* Timer at top */}
          <View style={styles.timerBanner}>
            <Text style={[styles.timerText, timeRemaining < 10 && styles.timerDanger]}>
              {Math.ceil(timeRemaining)}s
            </Text>
          </View>

          {/* Temperature readout - center */}
          <View style={styles.tempContainer}>
            <Text style={[styles.tempReadout, {color: getTempColor()}]}>
              {Math.round(temperature)}
              {'\u00B0'}F
            </Text>
            <Text style={styles.targetLabel}>
              TARGET: {variant.targetTemp}
              {'\u00B0'}F {'\u00B1'} {variant.tempTolerance}
              {'\u00B0'}F
            </Text>
            {inTargetZone && (
              <View style={styles.perfectBadge}>
                <Text style={styles.perfectText}>PERFECT</Text>
              </View>
            )}
          </View>

          {/* Hold progress gauge */}
          <View style={styles.holdGaugeContainer}>
            <ProgressGauge
              value={(holdTimer / variant.holdSeconds) * 100}
              label="HOLD"
              color="#4CAF50"
            />
            <Text style={styles.holdTimerText}>
              {holdTimer.toFixed(1)}s / {variant.holdSeconds}s
            </Text>
          </View>

          {/* Heat control slider - right side */}
          <View style={styles.sliderContainer} {...panResponder.panHandlers}>
            {/* Slider track */}
            <View style={styles.sliderTrack}>
              {/* Fill from bottom */}
              <View
                style={[
                  styles.sliderFill,
                  {
                    height: `${heatFillPct}%`,
                    backgroundColor:
                      heatLevel > 0.7 ? '#FF1744' : heatLevel > 0.4 ? '#FFC107' : '#FF9800',
                  },
                ]}
              />
              {/* Slider thumb */}
              <View style={[styles.sliderThumb, {bottom: `${heatFillPct}%`}]} />
            </View>

            {/* Labels */}
            <Text style={styles.sliderLabelTop}>HOT</Text>
            <Text style={styles.sliderLabelBottom}>COOL</Text>
          </View>

          {/* Overheat warning flash */}
          {overheatFlash && <View style={styles.overheatOverlay} pointerEvents="none" />}

          {/* Heat level indicator */}
          <View style={styles.heatIndicator}>
            <Text style={styles.heatIndicatorText}>HEAT: {Math.round(heatLevel * 100)}%</Text>
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
  tempContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 60, // Leave room for slider
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
  holdGaugeContainer: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 76,
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
  sliderContainer: {
    position: 'absolute',
    right: 16,
    top: '20%',
    bottom: '20%',
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  sliderTrack: {
    width: 20,
    height: SLIDER_HEIGHT,
    backgroundColor: '#222',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444',
    overflow: 'hidden',
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 9,
  },
  sliderThumb: {
    position: 'absolute',
    left: -6,
    width: 32,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFC832',
    marginBottom: -8,
  },
  sliderLabelTop: {
    position: 'absolute',
    top: 0,
    marginTop: -18,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 1,
  },
  sliderLabelBottom: {
    position: 'absolute',
    bottom: 0,
    marginBottom: -18,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#4FC3F7',
    letterSpacing: 1,
  },
  overheatOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200, 0, 0, 0.35)',
    borderWidth: 10,
    borderColor: 'rgba(255, 0, 0, 0.7)',
    zIndex: 80,
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
});
