import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { calculateFinalVerdict } from '../../engine/ChallengeRegistry';

export function GameOverScreen() {
  const { gameStatus, challengeScores, startNewGame, returnToMenu } =
    useGameStore();

  // Rank scale-in animation
  const rankScale = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, [fadeAnim, rankScale]);

  const isVictory = gameStatus === 'victory';
  const verdict = isVictory ? calculateFinalVerdict(challengeScores) : null;

  const rankColor =
    verdict?.rank === 'S'
      ? '#FFD700'
      : verdict?.rank === 'A'
        ? '#4CAF50'
        : verdict?.rank === 'B'
          ? '#FFC832'
          : '#FF1744';

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.content}>
          {isVictory && verdict ? (
            <>
              {/* Rank letter */}
              <Animated.Text
                style={[
                  styles.rankLetter,
                  {
                    color: rankColor,
                    transform: [{ scale: rankScale }],
                    textShadowColor: rankColor,
                  },
                ]}
              >
                {verdict.rank}
              </Animated.Text>

              {/* Title */}
              <Text style={styles.verdictTitle}>{verdict.title}</Text>

              {/* Message */}
              <Text style={styles.verdictMessage}>{verdict.message}</Text>

              {/* Average score */}
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>AVERAGE SCORE</Text>
                <Text style={[styles.scoreValue, { color: rankColor }]}>
                  {Math.round(verdict.averageScore)}
                </Text>
              </View>

              {/* Individual challenge scores */}
              <View style={styles.challengeScores}>
                {challengeScores.map((score, i) => (
                  <View key={i} style={styles.challengeScoreRow}>
                    <Text style={styles.challengeScoreLabel}>
                      Challenge {i + 1}
                    </Text>
                    <Text style={styles.challengeScoreValue}>{score}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              {/* Defeat */}
              <Text style={styles.gameOverTitle}>GAME OVER</Text>
              <Text style={styles.gameOverSubtitle}>
                You are the sausage now.
              </Text>
            </>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.newGameButton}
              onPress={startNewGame}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>NEW GAME</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={returnToMenu}
              activeOpacity={0.7}
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
    textShadowOffset: { width: 0, height: 0 },
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
    textShadowOffset: { width: 0, height: 0 },
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
    shadowOffset: { width: 0, height: 4 },
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
