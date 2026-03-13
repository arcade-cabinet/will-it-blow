/**
 * @module TastingChallenge
 * Props-driven tasting/scoring overlay with 4-beat reveal sequence.
 *
 * Phases:
 * 1. FORM score reveal
 * 2. INGREDIENTS score reveal
 * 3. COOK score reveal
 * 4. TOTAL with demand bonus + rank badge reveal
 *
 * Rank colors: S=Gold(#FFD700), A=Silver(#C0C0C0), B=Bronze(#CD7F32), F=Blood Red(#FF1744)
 */

import {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';

interface TastingChallengeProps {
  /** Scores for each category */
  scores: {form: number; ingredients: number; cook: number};
  /** Demand bonus points */
  demandBonus: number;
  /** Final rank letter */
  rank: string;
  /** Called when the reveal sequence completes */
  onComplete: () => void;
}

const RANK_COLORS: Record<string, string> = {
  S: '#FFD700',
  A: '#C0C0C0',
  B: '#CD7F32',
  F: '#FF1744',
};

type RevealPhase = 'form' | 'ingredients' | 'cook' | 'total' | 'rank' | 'done';

const PHASE_DURATION = 1500;

export function TastingChallenge({scores, demandBonus, rank, onComplete}: TastingChallengeProps) {
  const [phase, setPhase] = useState<RevealPhase>('form');
  const rankScale = useRef(new Animated.Value(0)).current;
  const rankOpacity = useRef(new Animated.Value(0)).current;

  const rankColor = RANK_COLORS[rank] ?? '#FF1744';
  const total = scores.form + scores.ingredients + scores.cook + demandBonus;

  // Auto-advance through phases
  useEffect(() => {
    const phases: RevealPhase[] = ['form', 'ingredients', 'cook', 'total', 'rank', 'done'];
    const currentIdx = phases.indexOf(phase);

    if (phase === 'done') {
      onComplete();
      return;
    }

    if (phase === 'rank') {
      // Animate rank badge
      Animated.parallel([
        Animated.timing(rankOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(rankScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }

    const timer = setTimeout(() => {
      if (currentIdx < phases.length - 1) {
        setPhase(phases[currentIdx + 1]);
      }
    }, PHASE_DURATION);

    return () => clearTimeout(timer);
  }, [phase, onComplete, rankOpacity, rankScale]);

  const showForm = phase !== 'form' || phase === 'form';
  const showIngredients = ['ingredients', 'cook', 'total', 'rank', 'done'].includes(phase);
  const showCook = ['cook', 'total', 'rank', 'done'].includes(phase);
  const showTotal = ['total', 'rank', 'done'].includes(phase);
  const showRank = ['rank', 'done'].includes(phase);

  return (
    <View style={styles.container}>
      <View style={styles.darkOverlay} pointerEvents="none" />

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>THE TASTING</Text>
        <View style={styles.titleUnderline} />
      </View>

      {/* Score reveal panel */}
      <View style={styles.scorePanel}>
        {showForm && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>FORM</Text>
            <Text style={styles.scoreValue}>{Math.round(scores.form)}</Text>
          </View>
        )}

        {showIngredients && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>INGREDIENTS</Text>
            <Text style={styles.scoreValue}>{Math.round(scores.ingredients)}</Text>
          </View>
        )}

        {showCook && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>COOK</Text>
            <Text style={styles.scoreValue}>{Math.round(scores.cook)}</Text>
          </View>
        )}

        {showTotal && (
          <>
            <View style={styles.divider} />

            {/* Demand bonus */}
            {demandBonus !== 0 && (
              <View style={styles.scoreRow}>
                <Text style={styles.demandLabel}>DEMAND BONUS</Text>
                <Text
                  style={[styles.demandValue, {color: demandBonus > 0 ? '#4CAF50' : '#FF1744'}]}
                >
                  {demandBonus > 0 ? '+' : ''}
                  {demandBonus}
                </Text>
              </View>
            )}

            <View style={styles.scoreRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={[styles.totalValue, {color: rankColor}]}>{Math.round(total)}</Text>
            </View>
          </>
        )}
      </View>

      {/* Rank badge */}
      {showRank && (
        <Animated.View
          style={[styles.rankContainer, {opacity: rankOpacity, transform: [{scale: rankScale}]}]}
        >
          <View style={[styles.rankBadge, {borderColor: rankColor, shadowColor: rankColor}]}>
            <Text style={[styles.rankLetter, {color: rankColor}]}>{rank}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 0, 0, 0.85)',
  },
  titleContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 55,
  },
  titleText: {
    fontSize: 42,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 6,
    textShadowColor: 'rgba(255, 23, 68, 0.7)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 20,
  },
  titleUnderline: {
    width: 200,
    height: 3,
    backgroundColor: '#FF1744',
    marginTop: 6,
    opacity: 0.6,
  },
  scorePanel: {
    position: 'absolute',
    top: 140,
    left: '15%',
    right: '15%',
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    zIndex: 55,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#BDBDBD',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 2,
  },
  divider: {
    height: 2,
    backgroundColor: '#444',
    marginVertical: 8,
  },
  demandLabel: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#D2A24C',
    letterSpacing: 1,
  },
  demandValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 1,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 2,
  },
  rankContainer: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 55,
  },
  rankBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  rankLetter: {
    fontSize: 72,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 0,
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 16,
  },
});
