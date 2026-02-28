import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {PanResponder, StyleSheet, Text, View} from 'react-native';
import type {GrindingVariant} from '../../data/challenges/variants';
import {GRINDING_DIALOGUE, GRINDING_SUCCESS} from '../../data/dialogue/grinding';
import {audioEngine} from '../../engine/AudioEngine';
import {pickVariant} from '../../engine/ChallengeRegistry';
import {useGameStore} from '../../store/gameStore';
import type {Reaction} from '../characters/reactions';
import {DialogueOverlay} from '../ui/DialogueOverlay';
import {ProgressGauge} from '../ui/ProgressGauge';

interface GrindingChallengeProps {
  onComplete: (score: number) => void;
  onReaction?: (reaction: Reaction) => void;
}

type ChallengePhase = 'dialogue' | 'grinding' | 'success' | 'complete';

const SCORE_PENALTY_PER_STRIKE = 15;
const SCORE_PENALTY_PER_OVERTIME_SEC = 5;
const COMPLETE_DELAY_MS = 1200;
const TICK_INTERVAL_MS = 50;
const EMA_ALPHA = 0.3; // Exponential moving average smoothing factor
const GESTURE_AREA_SIZE = 200;
const SLOW_TIMER_MULTIPLIER = 1.5; // Timer counts down faster when too slow

export function GrindingChallenge({onComplete, onReaction}: GrindingChallengeProps) {
  const [phase, setPhase] = useState<ChallengePhase>('dialogue');
  const [variant, setVariant] = useState<GrindingVariant | null>(null);
  const [grindProgress, setGrindProgress] = useState(0);
  const [crankAngle, setCrankAngle] = useState(0);
  const [angularVelocity, setAngularVelocity] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isSplattering, setIsSplattering] = useState(false);
  const [speedZone, setSpeedZone] = useState<'slow' | 'good' | 'fast'>('slow');

  const {strikes, addStrike, variantSeed, setChallengeProgress, gameStatus} = useGameStore();

  // Refs for render loop / gesture tracking (avoid stale closures)
  const prevAngleRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number>(0);
  const smoothedVelocityRef = useRef(0);
  const progressRef = useRef(0);
  const timeRemainingRef = useRef(30);
  const strikesRef = useRef(strikes);
  const phaseRef = useRef(phase);
  const variantRef = useRef(variant);
  const startTimeRef = useRef(0);
  const splatCooldownRef = useRef(false);
  const lastBeepSecondRef = useRef(-1);

  strikesRef.current = strikes;
  phaseRef.current = phase;
  variantRef.current = variant;

  // Initialize variant on mount
  useEffect(() => {
    const v = pickVariant('grinding', variantSeed) as GrindingVariant;
    setVariant(v);
    setTimeRemaining(v.timerSeconds);
    timeRemainingRef.current = v.timerSeconds;
  }, [variantSeed]);

  // Watch for defeat
  useEffect(() => {
    if (gameStatus === 'defeat' && phase === 'grinding') {
      setPhase('complete');
    }
  }, [gameStatus, phase]);

  // Calculate angle from touch position relative to gesture area center
  const calculateAngle = useCallback(
    (pageX: number, pageY: number, layout: {cx: number; cy: number}) => {
      const dx = pageX - layout.cx;
      const dy = pageY - layout.cy;
      return Math.atan2(dy, dx);
    },
    [],
  );

  // Normalize delta angle to handle wrap-around at +/- PI
  const normalizeDelta = useCallback((delta: number): number => {
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    return delta;
  }, []);

  // Gesture area layout tracking
  const gestureLayoutRef = useRef({cx: 0, cy: 0});
  const gestureViewRef = useRef<View>(null);

  // PanResponder for circular gesture tracking
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === 'grinding',
      onMoveShouldSetPanResponder: () => phaseRef.current === 'grinding',

      onPanResponderGrant: evt => {
        const {pageX, pageY} = evt.nativeEvent;
        const angle = calculateAngle(pageX, pageY, gestureLayoutRef.current);
        prevAngleRef.current = angle;
        prevTimeRef.current = Date.now();
      },

      onPanResponderMove: evt => {
        if (phaseRef.current !== 'grinding') return;

        const {pageX, pageY} = evt.nativeEvent;
        const currentAngle = calculateAngle(pageX, pageY, gestureLayoutRef.current);
        const now = Date.now();

        if (prevAngleRef.current !== null) {
          const deltaAngle = normalizeDelta(currentAngle - prevAngleRef.current);
          const deltaTime = (now - prevTimeRef.current) / 1000;

          if (deltaTime > 0.001) {
            const instantVelocity = Math.abs(deltaAngle) / deltaTime;
            // Exponential moving average for smoothing
            const smoothed =
              EMA_ALPHA * instantVelocity + (1 - EMA_ALPHA) * smoothedVelocityRef.current;
            smoothedVelocityRef.current = smoothed;
            setAngularVelocity(smoothed);

            // Update crank angle (cumulative)
            setCrankAngle(prev => prev + deltaAngle);
          }
        }

        prevAngleRef.current = currentAngle;
        prevTimeRef.current = now;
      },

      onPanResponderRelease: () => {
        prevAngleRef.current = null;
        // Decay velocity on release
        smoothedVelocityRef.current *= 0.5;
        setAngularVelocity(smoothedVelocityRef.current);
      },
    });
  }, [calculateAngle, normalizeDelta]);

  // Main gameplay tick
  useEffect(() => {
    if (phase !== 'grinding' || !variant) return;

    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const v = variantRef.current;
      if (!v || phaseRef.current !== 'grinding') return;

      const velocity = smoothedVelocityRef.current;
      const minSpeed = v.targetSpeed - v.tolerance;
      const maxSpeed = v.targetSpeed + v.tolerance;

      // Determine speed zone
      let zone: 'slow' | 'good' | 'fast';
      if (velocity > maxSpeed) {
        zone = 'fast';
      } else if (velocity < minSpeed) {
        zone = 'slow';
      } else {
        zone = 'good';
      }
      setSpeedZone(zone);

      // Handle zones
      if (zone === 'good') {
        // Increase progress proportional to velocity
        const progressDelta = (TICK_INTERVAL_MS / 1000) * (velocity / v.targetSpeed) * 8;
        const newProgress = Math.min(100, progressRef.current + progressDelta);
        progressRef.current = newProgress;
        setGrindProgress(newProgress);
        setChallengeProgress(newProgress);

        if (newProgress >= v.targetProgress) {
          setPhase('success');
          onReaction?.('excitement');
          return;
        }

        onReaction?.('nod');
      } else if (zone === 'fast' && !splatCooldownRef.current) {
        // Splatter! Strike penalty
        splatCooldownRef.current = true;
        setIsSplattering(true);
        addStrike();
        onReaction?.('flinch');

        // Reset splatter cooldown after a short delay
        setTimeout(() => {
          splatCooldownRef.current = false;
          setIsSplattering(false);
        }, 800);
      } else if (zone === 'slow') {
        onReaction?.('nervous');
      }

      // Timer countdown (faster when too slow)
      const timerDelta = TICK_INTERVAL_MS / 1000;
      const timerDecrement = zone === 'slow' ? timerDelta * SLOW_TIMER_MULTIPLIER : timerDelta;
      const newTime = Math.max(0, timeRemainingRef.current - timerDecrement);
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
        // Calculate score and complete immediately on timeout
        const overtimeSeconds = 0;
        const score = Math.max(
          0,
          Math.round(
            (progressRef.current / 100) * 100 -
              strikesRef.current * SCORE_PENALTY_PER_STRIKE -
              overtimeSeconds * SCORE_PENALTY_PER_OVERTIME_SEC,
          ),
        );
        onComplete(score);
      }

      // Decay velocity when not touching
      smoothedVelocityRef.current *= 0.95;
      setAngularVelocity(smoothedVelocityRef.current);
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [phase, variant, addStrike, setChallengeProgress, onComplete, onReaction]);

  // Start/stop grinder audio when phase changes
  useEffect(() => {
    if (phase === 'grinding') {
      audioEngine.startGrinder();
    } else {
      audioEngine.stopGrinder();
    }
    return () => {
      audioEngine.stopGrinder();
    };
  }, [phase]);

  // Handle dialogue completion
  const handleDialogueComplete = useCallback(
    (_effects: string[]) => {
      setPhase('grinding');
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
          strikesRef.current * SCORE_PENALTY_PER_STRIKE -
          overtime * SCORE_PENALTY_PER_OVERTIME_SEC,
      ),
    );
    setTimeout(() => onComplete(score), COMPLETE_DELAY_MS);
  }, [onComplete]);

  // Speed indicator UI helpers
  const speedPercent = variant
    ? Math.min(100, (angularVelocity / (variant.targetSpeed + variant.tolerance + 1)) * 100)
    : 0;

  const goodZoneStart = variant
    ? ((variant.targetSpeed - variant.tolerance) / (variant.targetSpeed + variant.tolerance + 1)) *
      100
    : 30;

  const goodZoneEnd = variant
    ? ((variant.targetSpeed + variant.tolerance) / (variant.targetSpeed + variant.tolerance + 1)) *
      100
    : 70;

  // Measure gesture area layout
  const handleGestureLayout = useCallback(() => {
    if (gestureViewRef.current) {
      gestureViewRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        gestureLayoutRef.current = {
          cx: pageX + width / 2,
          cy: pageY + height / 2,
        };
      });
    }
  }, []);

  if (!variant) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Intro dialogue */}
      {phase === 'dialogue' && (
        <DialogueOverlay lines={GRINDING_DIALOGUE} onComplete={handleDialogueComplete} />
      )}

      {/* Success dialogue */}
      {phase === 'success' && (
        <DialogueOverlay lines={GRINDING_SUCCESS} onComplete={handleSuccessComplete} />
      )}

      {/* Main gameplay UI */}
      {phase === 'grinding' && (
        <>
          {/* Timer at top */}
          <View style={styles.timerBanner}>
            <Text style={[styles.timerText, timeRemaining < 10 && styles.timerDanger]}>
              {Math.ceil(timeRemaining)}s
            </Text>
          </View>

          {/* Progress gauge */}
          <View style={styles.progressContainer}>
            <ProgressGauge value={grindProgress} label="GRIND PROGRESS" color="#4CAF50" />
          </View>

          {/* Speed indicator bar */}
          <View style={styles.speedContainer}>
            <Text style={styles.speedLabel}>SPEED</Text>
            <View style={styles.speedTrack}>
              {/* TOO SLOW zone */}
              <View style={[styles.speedZoneSlow, {width: `${goodZoneStart}%`}]} />
              {/* GOOD zone */}
              <View
                style={[
                  styles.speedZoneGood,
                  {left: `${goodZoneStart}%`, width: `${goodZoneEnd - goodZoneStart}%`},
                ]}
              />
              {/* TOO FAST zone */}
              <View
                style={[
                  styles.speedZoneFast,
                  {left: `${goodZoneEnd}%`, width: `${100 - goodZoneEnd}%`},
                ]}
              />
              {/* Current speed marker */}
              <View style={[styles.speedMarker, {left: `${Math.min(98, speedPercent)}%`}]} />
            </View>
            <View style={styles.speedLabels}>
              <Text style={styles.speedLabelSlow}>SLOW</Text>
              <Text style={styles.speedLabelGood}>GOOD</Text>
              <Text style={styles.speedLabelFast}>FAST</Text>
            </View>
          </View>

          {/* Speed zone feedback text */}
          <View style={styles.zoneFeedback}>
            <Text
              style={[
                styles.zoneFeedbackText,
                speedZone === 'slow' && styles.zoneSlow,
                speedZone === 'good' && styles.zoneGood,
                speedZone === 'fast' && styles.zoneFast,
              ]}
            >
              {speedZone === 'slow' && 'TOO SLOW!'}
              {speedZone === 'good' && 'PERFECT!'}
              {speedZone === 'fast' && 'TOO FAST!'}
            </Text>
          </View>

          {/* Splatter flash overlay */}
          {isSplattering && <View style={styles.splatterOverlay} pointerEvents="none" />}

          {/* Circular gesture area */}
          <View
            ref={gestureViewRef}
            style={styles.gestureArea}
            onLayout={handleGestureLayout}
            {...panResponder.panHandlers}
          >
            <View style={styles.gestureCircle}>
              <Text style={styles.gestureHint}>DRAG IN CIRCLES</Text>
              {/* Visual crank indicator in gesture area */}
              <View
                style={[
                  styles.crankIndicator,
                  {
                    transform: [{rotate: `${crankAngle}rad`}],
                  },
                ]}
              >
                <View style={styles.crankLine} />
                <View style={styles.crankDot} />
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

// Export grind state hook for GameWorld to read
export function useGrindState() {
  return {
    grindProgress: 0,
    crankAngle: 0,
    isSplattering: false,
  };
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
  speedContainer: {
    position: 'absolute',
    top: 165,
    left: 16,
    right: 16,
    zIndex: 55,
  },
  speedLabel: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
    marginBottom: 4,
  },
  speedTrack: {
    width: '100%',
    height: 14,
    backgroundColor: '#222',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#444',
    overflow: 'hidden',
    position: 'relative',
  },
  speedZoneSlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
  },
  speedZoneGood: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.4)',
  },
  speedZoneFast: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 23, 68, 0.3)',
  },
  speedMarker: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 18,
    backgroundColor: '#FFC832',
    borderRadius: 2,
    shadowColor: '#FFC832',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  speedLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  speedLabelSlow: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF9800',
    letterSpacing: 1,
  },
  speedLabelGood: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#4CAF50',
    letterSpacing: 1,
  },
  speedLabelFast: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 1,
  },
  zoneFeedback: {
    position: 'absolute',
    top: 210,
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
  gestureArea: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    width: GESTURE_AREA_SIZE,
    height: GESTURE_AREA_SIZE,
    zIndex: 55,
  },
  gestureCircle: {
    width: GESTURE_AREA_SIZE,
    height: GESTURE_AREA_SIZE,
    borderRadius: GESTURE_AREA_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255, 200, 50, 0.4)',
    backgroundColor: 'rgba(10, 10, 10, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gestureHint: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: 'rgba(255, 200, 50, 0.5)',
    letterSpacing: 2,
    position: 'absolute',
    bottom: 20,
  },
  crankIndicator: {
    width: GESTURE_AREA_SIZE * 0.7,
    height: 4,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  crankLine: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 200, 50, 0.6)',
  },
  crankDot: {
    position: 'absolute',
    right: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF1744',
  },
});
