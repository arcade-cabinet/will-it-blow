/**
 * @module GameOverScreen
 * Full-screen results overlay shown after the game ends (victory or defeat).
 *
 * **Victory path (S-rank only):** Displays the rank badge with a spring-in
 * animation, verdict title/message, average score card, and per-challenge
 * score breakdown.
 *
 * **Defeat path (A/B/F or early defeat):** Shows "GAME OVER" with the
 * defeat verdict. If the player was eliminated before completing all
 * challenges, shows "You are the sausage now." with no scores.
 *
 * Plays a rating-based audio jingle via `audioEngine.playRatingSong()`.
 * Provides "NEW GAME" and "MENU" buttons for replay.
 */

import {useEffect, useRef} from 'react';
import {Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {config} from '../../config';
import {audioEngine} from '../../engine/AudioEngine';
import {calculateFinalVerdict} from '../../engine/ChallengeRegistry';
import {useKeyboardNav} from '../../hooks/useKeyboardNav';
import {useOrientation} from '../../hooks/useOrientation';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {useGameStore} from '../../store/gameStore';

const CHALLENGE_NAMES = config.scene.challengeSequence.stations.map(
  s => s.challengeType.charAt(0).toUpperCase() + s.challengeType.slice(1),
);

export function GameOverScreen() {
  const {gameStatus, challengeScores, returnToMenu, setAppPhase} = useGameStore();
  const {width, isLandscape} = useOrientation();
  const isTablet = width >= 768;
  const contentMaxWidth = isTablet ? 560 : 420;
  const isVictory = gameStatus === 'victory';
  const verdict = isVictory ? calculateFinalVerdict(challengeScores) : null;
  const reducedMotion = useReducedMotion();

  // Escape returns to menu
  useKeyboardNav({onEscape: returnToMenu});

  // Rank scale-in animation
  const rankScale = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      fadeAnim.setValue(1);
      rankScale.setValue(1);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(rankScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
          delay: 300,
        }),
      ]).start();
    }

    // Play rating song based on outcome
    const ratingMap: Record<string, number> = {S: 5, A: 3, B: 2, F: 0};
    if (isVictory && challengeScores.length > 0) {
      const v = calculateFinalVerdict(challengeScores);
      audioEngine.playRatingSong(ratingMap[v.rank] ?? 1);
    } else {
      audioEngine.playRatingSong(0);
    }
  }, [fadeAnim, rankScale, isVictory, challengeScores, reducedMotion]);

  const rankColor =
    verdict?.rank === 'S'
      ? '#FFD700'
      : verdict?.rank === 'A'
        ? '#4CAF50'
        : verdict?.rank === 'B'
          ? '#FFC832'
          : '#FF1744';

  return (
    <Animated.View style={[styles.overlay, {opacity: fadeAnim}]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isLandscape && styles.scrollContentLandscape]}
        style={styles.scrollView}
      >
        <View style={[styles.content, {maxWidth: contentMaxWidth}]}>
          {isVictory && verdict ? (
            <>
              {/* Rank letter */}
              <Animated.Text
                style={[
                  styles.rankLetter,
                  {
                    color: rankColor,
                    transform: [{scale: rankScale}],
                    textShadowColor: rankColor,
                  },
                ]}
                accessibilityRole="text"
                accessibilityLabel={`Rank ${verdict.rank}`}
              >
                {verdict.rank}
              </Animated.Text>

              {/* Title */}
              <Text style={styles.verdictTitle} accessibilityRole="header">
                {verdict.title}
              </Text>

              {/* Message */}
              <Text style={styles.verdictMessage}>{verdict.message}</Text>

              {/* Average score */}
              <View
                style={styles.scoreCard}
                accessibilityLabel={`Average score ${Math.round(verdict.averageScore)}`}
              >
                <Text style={styles.scoreLabel}>AVERAGE SCORE</Text>
                <Text style={[styles.scoreValue, {color: rankColor}]}>
                  {Math.round(verdict.averageScore)}
                </Text>
              </View>

              {/* Individual challenge scores */}
              <View style={styles.challengeScores}>
                {challengeScores.map((score, i) => (
                  <View key={i} style={styles.challengeScoreRow}>
                    <Text style={styles.challengeScoreLabel}>
                      {CHALLENGE_NAMES[i] ?? `Challenge ${i + 1}`}
                    </Text>
                    <Text style={styles.challengeScoreValue}>{Math.round(score)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              {/* Defeat — show rank if we have scores (A/B/F) */}
              <Text style={styles.gameOverTitle} accessibilityRole="header">
                GAME OVER
              </Text>
              {challengeScores.length > 0 &&
                (() => {
                  const defeatVerdict = calculateFinalVerdict(challengeScores);
                  const defeatColor = defeatVerdict.rank === 'A' ? '#FF9800' : '#FF1744';
                  return (
                    <>
                      <Text
                        style={[
                          styles.rankLetter,
                          {color: defeatColor, textShadowColor: defeatColor},
                        ]}
                      >
                        {defeatVerdict.rank}
                      </Text>
                      <Text style={styles.gameOverSubtitle}>{defeatVerdict.message}</Text>
                      <View style={styles.challengeScores}>
                        {challengeScores.map((score, i) => (
                          <View key={i} style={styles.challengeScoreRow}>
                            <Text style={styles.challengeScoreLabel}>
                              {CHALLENGE_NAMES[i] ?? `Challenge ${i + 1}`}
                            </Text>
                            <Text style={styles.challengeScoreValue}>{Math.round(score)}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  );
                })()}
              {challengeScores.length === 0 && (
                <Text style={styles.gameOverSubtitle}>You are the sausage now.</Text>
              )}
            </>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.newGameButton}
              onPress={() => setAppPhase('loading')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Start new game"
            >
              <Text style={styles.buttonText}>NEW GAME</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={returnToMenu}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Return to main menu"
            >
              <Text style={styles.menuButtonText}>MENU</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  scrollContentLandscape: {
    paddingVertical: 20,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 420,
  },

  // Victory styles
  rankLetter: {
    fontSize: 72,
    fontWeight: '900',
    fontFamily: 'Bangers',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 30,
    marginBottom: 8,
  },
  verdictTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  verdictMessage: {
    fontSize: 16,
    fontFamily: 'Bangers',
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  scoreCard: {
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 2,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 2,
  },
  challengeScores: {
    width: '100%',
    marginBottom: 32,
    gap: 6,
  },
  challengeScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  challengeScoreLabel: {
    fontSize: 14,
    fontFamily: 'Bangers',
    color: '#666',
    letterSpacing: 1,
  },
  challengeScoreValue: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 1,
  },

  // Defeat styles
  gameOverTitle: {
    fontSize: 52,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 23, 68, 0.6)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 20,
    marginBottom: 16,
  },
  gameOverSubtitle: {
    fontSize: 18,
    fontFamily: 'Bangers',
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 48,
    letterSpacing: 1,
  },

  // Button styles
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  newGameButton: {
    backgroundColor: '#B71C1C',
    borderWidth: 2,
    borderColor: '#FF1744',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 36,
    shadowColor: '#FF1744',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  menuButton: {
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 36,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Bangers',
    textAlign: 'center',
    letterSpacing: 1,
  },
  menuButtonText: {
    color: '#AAA',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
