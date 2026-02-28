import {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableWithoutFeedback, View} from 'react-native';
import type {StuffingVariant} from '../../data/challenges/variants';
import {STUFFING_DIALOGUE, STUFFING_SUCCESS} from '../../data/dialogue/stuffing';
import {pickVariant} from '../../engine/ChallengeRegistry';
import {useGameStore} from '../../store/gameStore';
import type {Reaction} from '../characters/reactions';
import {DialogueOverlay} from '../ui/DialogueOverlay';
import {ProgressGauge} from '../ui/ProgressGauge';

interface StuffingChallengeProps {
  onComplete: (score: number) => void;
  onReaction?: (reaction: Reaction) => void;
}

type ChallengePhase = 'dialogue' | 'stuffing' | 'success' | 'complete';

const SCORE_PENALTY_PER_BURST = 20;
const SCORE_PENALTY_PER_OVERTIME_SEC = 5;
const COMPLETE_DELAY_MS = 1200;
const TICK_INTERVAL_MS = 16; // ~60fps
const FILL_DROP_ON_BURST = 20;

export function StuffingChallenge({onComplete, onReaction}: StuffingChallengeProps) {
  const [phase, setPhase] = useState<ChallengePhase>('dialogue');
  const [variant, setVariant] = useState<StuffingVariant | null>(null);
  const [fillLevel, setFillLevel] = useState(0);
  const [pressureLevel, setPressureLevel] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isPressing, setIsPressing] = useState(false);
  const [_hasBurst, setHasBurst] = useState(false);
  const [burstFlash, setBurstFlash] = useState(false);
  const [_burstCount, setBurstCount] = useState(0);
  const [warningVisible, setWarningVisible] = useState(false);

  const {
    strikes,
    addStrike,
    variantSeed,
    setChallengeProgress,
    setChallengePressure,
    setChallengeIsPressing,
    gameStatus,
  } = useGameStore();

  // Refs for render loop (avoid stale closures)
  const fillRef = useRef(0);
  const pressureRef = useRef(0);
  const isPressingRef = useRef(false);
  const timeRemainingRef = useRef(30);
  const phaseRef = useRef(phase);
  const variantRef = useRef(variant);
  const strikesRef = useRef(strikes);
  const burstCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const burstCooldownRef = useRef(false);

  phaseRef.current = phase;
  variantRef.current = variant;
  strikesRef.current = strikes;

  // Initialize variant on mount
  useEffect(() => {
    const v = pickVariant('stuffing', variantSeed) as StuffingVariant;
    setVariant(v);
    setTimeRemaining(v.timerSeconds);
    timeRemainingRef.current = v.timerSeconds;
  }, [variantSeed]);

  // Watch for defeat
  useEffect(() => {
    if (gameStatus === 'defeat' && phase === 'stuffing') {
      setPhase('complete');
    }
  }, [gameStatus, phase]);

  // Sync pressing ref
  useEffect(() => {
    isPressingRef.current = isPressing;
  }, [isPressing]);

  // Warning flicker when pressure is high
  useEffect(() => {
    if (phase !== 'stuffing') return;
    if (pressureLevel > 70) {
      setWarningVisible(true);
    } else {
      setWarningVisible(false);
    }
  }, [pressureLevel, phase]);

  // Main gameplay tick
  useEffect(() => {
    if (phase !== 'stuffing' || !variant) return;

    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const v = variantRef.current;
      if (!v || phaseRef.current !== 'stuffing') return;

      const dt = TICK_INTERVAL_MS / 1000;
      const pressing = isPressingRef.current;
      let newFill = fillRef.current;
      let newPressure = pressureRef.current;

      if (pressing) {
        // While pressing: fill increases, pressure increases
        newFill = Math.min(100, newFill + v.fillRate * dt);
        newPressure = Math.min(100, newPressure + v.pressureRate * dt);
      } else {
        // While not pressing: pressure decays
        newPressure = Math.max(0, newPressure - v.pressureDecay * dt);
      }

      // Check for burst
      if (newPressure > v.burstThreshold && !burstCooldownRef.current) {
        burstCooldownRef.current = true;

        // Burst! Strike + fill drop
        addStrike();
        burstCountRef.current += 1;
        setBurstCount(burstCountRef.current);
        newPressure = 0;
        newFill = Math.max(0, newFill - FILL_DROP_ON_BURST);

        // Visual burst feedback
        setHasBurst(true);
        setBurstFlash(true);
        onReaction?.('flinch');

        setTimeout(() => {
          setHasBurst(false);
          setBurstFlash(false);
          burstCooldownRef.current = false;
        }, 1000);
      }

      // Update state
      fillRef.current = newFill;
      pressureRef.current = newPressure;
      setFillLevel(newFill);
      setPressureLevel(newPressure);
      setChallengeProgress(newFill);
      setChallengePressure(newPressure);

      // Reaction based on pressure
      if (!burstCooldownRef.current) {
        if (pressing && newPressure > 70) {
          onReaction?.('nervous');
        } else if (pressing) {
          onReaction?.('nod');
        } else {
          onReaction?.('idle');
        }
      }

      // Check for completion
      if (newFill >= 100) {
        setPhase('success');
        onReaction?.('excitement');
        return;
      }

      // Timer countdown
      const newTime = Math.max(0, timeRemainingRef.current - dt);
      timeRemainingRef.current = newTime;
      setTimeRemaining(newTime);

      // Timer expired
      if (newTime <= 0) {
        setPhase('complete');
        const score = Math.max(
          0,
          Math.round(
            (fillRef.current / 100) * 100 - burstCountRef.current * SCORE_PENALTY_PER_BURST,
          ),
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
    setChallengePressure,
    onComplete,
    onReaction,
  ]);

  // Handle dialogue completion
  const handleDialogueComplete = useCallback(
    (_effects: string[]) => {
      setPhase('stuffing');
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
    const score = Math.max(
      0,
      Math.round(
        100 -
          burstCountRef.current * SCORE_PENALTY_PER_BURST -
          overtime * SCORE_PENALTY_PER_OVERTIME_SEC,
      ),
    );
    setTimeout(() => onComplete(score), COMPLETE_DELAY_MS);
  }, [onComplete]);

  // Press handlers
  const handlePressIn = useCallback(() => {
    if (phaseRef.current === 'stuffing') {
      setIsPressing(true);
      setChallengeIsPressing(true);
    }
  }, [setChallengeIsPressing]);

  const handlePressOut = useCallback(() => {
    setIsPressing(false);
    setChallengeIsPressing(false);
  }, [setChallengeIsPressing]);

  if (!variant) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Intro dialogue */}
      {phase === 'dialogue' && (
        <DialogueOverlay lines={STUFFING_DIALOGUE} onComplete={handleDialogueComplete} />
      )}

      {/* Success dialogue */}
      {phase === 'success' && (
        <DialogueOverlay lines={STUFFING_SUCCESS} onComplete={handleSuccessComplete} />
      )}

      {/* Main gameplay UI */}
      {phase === 'stuffing' && (
        <>
          {/* Timer at top */}
          <View style={styles.timerBanner}>
            <Text style={[styles.timerText, timeRemaining < 10 && styles.timerDanger]}>
              {Math.ceil(timeRemaining)}s
            </Text>
          </View>

          {/* Two gauges side by side */}
          <View style={styles.gaugesRow}>
            <View style={styles.gaugeWrapper}>
              <ProgressGauge value={fillLevel} label="FILL" color="#4CAF50" />
            </View>
            <View style={styles.gaugeWrapper}>
              <ProgressGauge
                value={pressureLevel}
                label="PRESSURE"
                color="#FFC107"
                dangerThreshold={variant.burstThreshold}
              />
            </View>
          </View>

          {/* Warning text when pressure is high */}
          {warningVisible && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>CAREFUL!</Text>
            </View>
          )}

          {/* Status indicator */}
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusText,
                isPressing ? styles.statusPressing : styles.statusReleased,
              ]}
            >
              {isPressing ? 'PRESSING...' : 'RELEASE...'}
            </Text>
          </View>

          {/* Burst flash overlay */}
          {burstFlash && <View style={styles.burstOverlay} pointerEvents="none" />}

          {/* Large push area - fills lower 60% of screen */}
          <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <View style={styles.pushArea}>
              <View style={styles.pushButton}>
                <Text style={styles.pushText}>{isPressing ? 'PUSHING...' : 'PUSH'}</Text>
                <Text style={styles.pushHint}>PRESS AND HOLD</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
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
  pushArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 55,
  },
  pushButton: {
    width: '80%',
    height: '70%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 200, 50, 0.4)',
    backgroundColor: 'rgba(10, 10, 10, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pushText: {
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 6,
    textShadowColor: 'rgba(255, 200, 50, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 16,
  },
  pushHint: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: 'rgba(255, 200, 50, 0.4)',
    letterSpacing: 3,
    marginTop: 8,
  },
});
