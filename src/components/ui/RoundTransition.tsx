/**
 * @module RoundTransition
 * Between-round summary overlay shown after each tasting verdict.
 *
 * Displays:
 *  - Round X of Y counter
 *  - Challenge score breakdown for the completed round
 *  - Mr. Sausage's reaction quip based on performance
 *  - "NEXT ROUND" SausageButton (auto-advances after 10s)
 *
 * On advance: calls `advanceRound()` then `startNewGame()` with round state
 * preserved. The component only renders when `gameStatus === 'victory'` and
 * there are more rounds remaining.
 *
 * Follows the butcher-shop dark theme: deep reds, Bangers font, dark backgrounds.
 */

import {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {CHALLENGE_ORDER, getChallengeConfig} from '../../engine/ChallengeRegistry';
import {getRoundReactionQuip, shouldEscape} from '../../engine/RoundManager';
import {useGameStore} from '../../store/gameStore';
import {SausageButton} from './SausageButton';

/** Auto-advance delay in milliseconds. */
const AUTO_ADVANCE_DELAY_MS = 10_000;

/** Challenge display names in order (indexes 0-6 match CHALLENGE_ORDER). */
const CHALLENGE_LABELS: Record<number, string> = {
  0: 'INGREDIENTS',
  1: 'CHOPPING',
  2: 'GRINDING',
  3: 'STUFFING',
  4: 'COOKING',
  5: 'BLOWOUT',
  6: 'TASTING',
};

// ---------------------------------------------------------------------------
// Countdown bar
// ---------------------------------------------------------------------------

interface CountdownBarProps {
  durationMs: number;
  onComplete: () => void;
}

function CountdownBar({durationMs, onComplete}: CountdownBarProps) {
  const width = useRef(new Animated.Value(1)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const anim = Animated.timing(width, {
      toValue: 0,
      duration: durationMs,
      useNativeDriver: false,
    });
    anim.start(({finished}) => {
      if (finished) onCompleteRef.current();
    });
    return () => anim.stop();
  }, [width, durationMs]);

  return (
    <View style={styles.countdownTrack}>
      <Animated.View
        style={[
          styles.countdownFill,
          {
            width: width.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Score row
// ---------------------------------------------------------------------------

interface ScoreRowProps {
  label: string;
  score: number;
}

function ScoreRow({label, score}: ScoreRowProps) {
  const color =
    score >= 90 ? '#FFD700' : score >= 70 ? '#FFC832' : score >= 50 ? '#FF8C00' : '#FF1744';
  return (
    <View style={styles.scoreRow} accessibilityLabel={`${label}: ${Math.round(score)} points`}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={[styles.scoreValue, {color}]}>{Math.round(score)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// RoundTransition
// ---------------------------------------------------------------------------

export function RoundTransition() {
  const gameStatus = useGameStore(s => s.gameStatus);
  const currentRound = useGameStore(s => s.currentRound);
  const totalRounds = useGameStore(s => s.totalRounds);
  const challengeScores = useGameStore(s => s.challengeScores);
  const advanceRound = useGameStore(s => s.advanceRound);
  const startNewGame = useGameStore(s => s.startNewGame);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [advanced, setAdvanced] = useState(false);

  // Only show when victory and there are more rounds to play
  const hasMoreRounds = !shouldEscape(currentRound, totalRounds);
  const visible = gameStatus === 'victory' && hasMoreRounds && !advanced;

  // Fade in when visible
  useEffect(() => {
    if (!visible) return;
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [visible, overlayOpacity]);

  const handleAdvance = () => {
    if (advanced) return;
    setAdvanced(true);

    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      advanceRound();
      startNewGame();
    });
  };

  if (!visible) return null;

  const quip = getRoundReactionQuip(challengeScores);
  const avg =
    challengeScores.length > 0
      ? challengeScores.reduce((a, b) => a + b, 0) / challengeScores.length
      : 0;
  const avgColor =
    avg >= 90 ? '#FFD700' : avg >= 70 ? '#FFC832' : avg >= 50 ? '#FF8C00' : '#FF1744';

  return (
    <Animated.View style={[styles.container, {opacity: overlayOpacity}]} pointerEvents="box-none">
      <View style={styles.darkOverlay} />

      <View
        style={styles.card}
        accessibilityLabel={`Round ${currentRound} of ${totalRounds} complete`}
      >
        {/* Round counter */}
        <Text style={styles.roundLabel} accessibilityRole="header">
          ROUND {currentRound} OF {totalRounds}
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Score breakdown */}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          CHALLENGE SCORES
        </Text>
        <View style={styles.scoresContainer}>
          {challengeScores.map((score, i) => {
            const challengeId = CHALLENGE_ORDER[i];
            const cfg = challengeId ? getChallengeConfig(challengeId) : null;
            const label = cfg?.name?.toUpperCase() ?? CHALLENGE_LABELS[i] ?? `CHALLENGE ${i + 1}`;
            return <ScoreRow key={i} label={label} score={score} />;
          })}
        </View>

        {/* Average */}
        <View style={styles.avgRow} accessibilityLabel={`Average score ${Math.round(avg)}`}>
          <Text style={styles.avgLabel}>AVERAGE</Text>
          <Text style={[styles.avgValue, {color: avgColor}]}>{Math.round(avg)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Mr. Sausage quip */}
        <Text style={styles.quip}>"{quip}"</Text>
        <Text style={styles.quipAttribution}>— Mr. Sausage</Text>

        <View style={styles.divider} />

        {/* Countdown + advance button */}
        <CountdownBar durationMs={AUTO_ADVANCE_DELAY_MS} onComplete={handleAdvance} />

        <View style={styles.buttonContainer}>
          <SausageButton label="NEXT ROUND" onPress={handleAdvance} />
        </View>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 0, 0, 0.9)',
  },
  card: {
    backgroundColor: '#1a0505',
    borderWidth: 2,
    borderColor: '#8B0000',
    borderRadius: 4,
    paddingVertical: 28,
    paddingHorizontal: 32,
    minWidth: 340,
    maxWidth: 480,
    alignItems: 'center',
    shadowColor: '#FF1744',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  roundLabel: {
    fontFamily: 'Bangers',
    fontSize: 36,
    color: '#FF1744',
    letterSpacing: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 23, 68, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 16,
  },
  divider: {
    height: 2,
    backgroundColor: '#8B0000',
    width: '100%',
    marginVertical: 16,
    opacity: 0.6,
  },
  sectionTitle: {
    fontFamily: 'Bangers',
    fontSize: 16,
    color: '#888',
    letterSpacing: 4,
    marginBottom: 12,
  },
  scoresContainer: {
    width: '100%',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  scoreLabel: {
    fontFamily: 'Bangers',
    fontSize: 18,
    color: '#ccc',
    letterSpacing: 2,
  },
  scoreValue: {
    fontFamily: 'Bangers',
    fontSize: 24,
    letterSpacing: 2,
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  avgLabel: {
    fontFamily: 'Bangers',
    fontSize: 20,
    color: '#fff',
    letterSpacing: 3,
  },
  avgValue: {
    fontFamily: 'Bangers',
    fontSize: 32,
    letterSpacing: 2,
  },
  quip: {
    fontFamily: 'Bangers',
    fontSize: 20,
    color: '#FFC832',
    letterSpacing: 1,
    textAlign: 'center',
    fontStyle: 'italic',
    textShadowColor: 'rgba(255, 200, 50, 0.3)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
    paddingHorizontal: 8,
  },
  quipAttribution: {
    fontFamily: 'Bangers',
    fontSize: 14,
    color: '#888',
    letterSpacing: 2,
    marginTop: 4,
  },
  countdownTrack: {
    height: 4,
    backgroundColor: '#333',
    width: '100%',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  countdownFill: {
    height: '100%',
    backgroundColor: '#8B0000',
    borderRadius: 2,
  },
  buttonContainer: {
    marginTop: 4,
  },
});
