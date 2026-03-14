/**
 * @module GameOverScreen
 * Full-screen results overlay shown after the game ends.
 *
 * Props-driven: receives rank, totalScore, score breakdown, demand bonus,
 * and callback handlers. Displays rank badge with rank-specific colors,
 * per-challenge score breakdown, demand bonus details, and action buttons.
 *
 * Rank colors: S=Gold(#FFD700), A=Silver(#C0C0C0), B=Bronze(#CD7F32), F=Blood Red(#FF1744)
 */

import {useEffect, useRef} from 'react';
import {Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

interface GameOverScreenProps {
  /** Rank badge letter: S, A, B, or F */
  rank: string;
  /** Total combined score */
  totalScore: number;
  /** Per-challenge score breakdown */
  breakdown: {label: string; score: number}[];
  /** Demand bonus points */
  demandBonus: number;
  /** Called when PLAY AGAIN button is pressed */
  onPlayAgain: () => void;
  /** Called when MENU button is pressed */
  onMenu: () => void;
}

const RANK_COLORS: Record<string, string> = {
  S: '#FFD700',
  A: '#C0C0C0',
  B: '#CD7F32',
  F: '#FF1744',
};

export function GameOverScreen({
  rank,
  totalScore,
  breakdown,
  demandBonus,
  onPlayAgain,
  onMenu,
}: GameOverScreenProps) {
  const reducedMotion = false;
  const verdict = {rank};
  const rankColor = RANK_COLORS[rank] ?? '#FF1744';

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
  }, [fadeAnim, rankScale]);

  return (
    <Animated.View style={[styles.overlay, {opacity: fadeAnim}]}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.content}>
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
            {rank}
          </Animated.Text>

          {/* Total score */}
          <Text style={styles.verdictTitle} accessibilityRole="header">
            TOTAL SCORE
          </Text>
          <View style={styles.scoreCard}>
            <Text style={[styles.scoreValue, {color: rankColor}]}>{Math.round(totalScore)}</Text>
          </View>

          {/* Per-challenge score breakdown */}
          <View style={styles.challengeScores}>
            {breakdown.map((item, i) => (
              <View key={i} style={styles.challengeScoreRow}>
                <Text style={styles.challengeScoreLabel}>{item.label}</Text>
                <Text style={styles.challengeScoreValue}>{Math.round(item.score)}</Text>
              </View>
            ))}
          </View>

          {/* Demand bonus */}
          {demandBonus !== 0 && (
            <View style={styles.demandBonusContainer}>
              <Text style={styles.demandBonusLabel}>DEMAND BONUS</Text>
              <Text
                style={[styles.demandBonusValue, {color: demandBonus > 0 ? '#4CAF50' : '#FF1744'}]}
              >
                {demandBonus > 0 ? '+' : ''}
                {demandBonus}
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.newGameButton}
              onPress={onPlayAgain}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Start new game"
            >
              <Text style={styles.buttonText}>PLAY AGAIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={onMenu}
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
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 420,
  },
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
  scoreValue: {
    fontSize: 42,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 2,
  },
  challengeScores: {
    width: '100%',
    marginBottom: 16,
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
  demandBonusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 32,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
  },
  demandBonusLabel: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#D2A24C',
    letterSpacing: 2,
  },
  demandBonusValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 2,
  },
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
