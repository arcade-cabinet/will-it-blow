/**
 * @module TastingChallenge
 * Challenge 5 of 5: Final scoring and verdict reveal.
 *
 * Unlike the other challenges, this is a non-interactive cinematic sequence.
 * It calculates the final verdict from all four challenge scores and presents
 * it through a dramatic multi-phase animation:
 *
 * **Phases:**
 * 1. `title` — "THE TASTING" fades in with dark overlay
 * 2. `eating` — Mr. Sausage "eats" (talk reaction, 2s)
 * 3. `judging` — Dramatic pause (nervous reaction, 2s)
 * 4. `reveal-form` — "I wanted {preferredForm}!" + match/mismatch indicator
 * 5. `reveal-ingredients` — "I was CRAVING {desired}..." + hit/miss
 * 6. `reveal-cook` — "I said {cookPreference}!" + match indicator
 * 7. `scores` — Individual challenge scores + demand breakdown reveal
 * 8. `rank` — Rank badge (S/A/B/F) appears with spring animation
 * 9. `dialogue` — Verdict dialogue plays (rank-specific lines)
 * 10. `complete` — Records score and sets game outcome
 *
 * **Verdict system:**
 * - S-rank (>= 92): THE SAUSAGE KING — only true victory
 * - A/B/F: Various degrees of defeat with different dialogue
 *
 * Only S-rank results in `gameStatus: 'victory'`. All other ranks
 * override to `gameStatus: 'defeat'` after completeChallenge() is called.
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {config} from '../../config';
import {VERDICT_A, VERDICT_B, VERDICT_F, VERDICT_S} from '../../data/dialogue/verdict';
import {calculateFinalVerdict, type Verdict} from '../../engine/ChallengeRegistry';
import {calculateDemandBonus, type DemandBreakdown} from '../../engine/DemandScoring';
import {useGameStore} from '../../store/gameStore';
import type {Reaction} from '../characters/reactions';
import {DialogueOverlay} from '../ui/DialogueOverlay';

/**
 * @param props.onComplete - Unused (tasting completes via completeChallenge store action)
 * @param props.onReaction - Triggers Mr. Sausage reactions on the CRT TV
 */
interface TastingChallengeProps {
  onComplete: (score: number) => void;
  onReaction?: (reaction: Reaction) => void;
}

type TastingPhase =
  | 'title' // "THE TASTING" fades in
  | 'eating' // Mr. Sausage eating animation
  | 'judging' // Dramatic pause
  | 'reveal-form' // Mr. Sausage reveals preferred form
  | 'reveal-ingredients' // Mr. Sausage reveals desired/hated ingredients
  | 'reveal-cook' // Mr. Sausage reveals cook preference
  | 'scores' // Score summary + demand breakdown reveals one by one
  | 'rank' // Rank badge appears
  | 'dialogue' // Verdict dialogue plays
  | 'complete'; // Outcome applied

const CHALLENGE_LABELS = config.scene.challengeSequence.stations
  .slice(0, -1) // All stations except tasting (last)
  .map(s => s.challengeType.charAt(0).toUpperCase() + s.challengeType.slice(1));

const RANK_COLORS: Record<string, string> = {
  S: '#FFD700',
  A: '#4CAF50',
  B: '#FF9800',
  F: '#FF1744',
};

/** Human-readable labels for cook preferences. */
const COOK_LABELS: Record<string, string> = {
  rare: 'RARE',
  medium: 'MEDIUM',
  'well-done': 'WELL-DONE',
  charred: 'CHARRED',
};

export function TastingChallenge({onComplete: _onComplete, onReaction}: TastingChallengeProps) {
  const challengeScores = useGameStore(s => s.challengeScores);
  const completeChallenge = useGameStore(s => s.completeChallenge);
  const mrSausageDemands = useGameStore(s => s.mrSausageDemands);
  const playerDecisions = useGameStore(s => s.playerDecisions);

  const [phase, setPhase] = useState<TastingPhase>('title');
  const [_revealedScoreCount, setRevealedScoreCount] = useState(0);

  // Animated values
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const scoreOpacities = useRef(CHALLENGE_LABELS.map(() => new Animated.Value(0))).current;
  const averageOpacity = useRef(new Animated.Value(0)).current;
  const demandOpacity = useRef(new Animated.Value(0)).current;
  const rankScale = useRef(new Animated.Value(0)).current;
  const rankOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;

  // Calculate demand breakdown
  const demandBreakdown: DemandBreakdown | null = useMemo(() => {
    if (!mrSausageDemands) return null;
    return calculateDemandBonus(mrSausageDemands, playerDecisions);
  }, [mrSausageDemands, playerDecisions]);

  // Calculate verdict once on mount (with demand bonus if available)
  const verdict: Verdict = useMemo(
    () => calculateFinalVerdict(challengeScores, demandBreakdown?.totalDemandBonus),
    [challengeScores, demandBreakdown],
  );

  // Get the right dialogue lines for the rank
  const verdictDialogue = useMemo(() => {
    switch (verdict.rank) {
      case 'S':
        return VERDICT_S;
      case 'A':
        return VERDICT_A;
      case 'B':
        return VERDICT_B;
      case 'F':
        return VERDICT_F;
    }
  }, [verdict.rank]);

  // Refs to avoid stale closures in timeouts
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Track all scheduled timeouts for cleanup
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Phase 1: Title fade-in
  useEffect(() => {
    // Fade in overlay background
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Fade in title
    Animated.timing(titleOpacity, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // After 1.2s: move to eating phase
    const timer = setTimeout(() => {
      setPhase('eating');
    }, 1200);

    return () => clearTimeout(timer);
  }, [overlayOpacity, titleOpacity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2: Eating animation (use 'talk' as closest available Reaction)
  useEffect(() => {
    if (phase !== 'eating') return;
    onReaction?.('talk');

    const timer = setTimeout(() => {
      setPhase('judging');
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, onReaction]);

  // Phase 3: Judging (dramatic pause — use 'nervous' as closest available Reaction)
  useEffect(() => {
    if (phase !== 'judging') return;
    onReaction?.('nervous');

    const nextPhase = mrSausageDemands ? 'reveal-form' : 'scores';
    const timer = setTimeout(() => {
      setPhase(nextPhase);
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, onReaction, mrSausageDemands]);

  // Phase 4: Reveal form preference
  useEffect(() => {
    if (phase !== 'reveal-form') return;

    revealOpacity.setValue(0);
    Animated.timing(revealOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    onReaction?.(demandBreakdown?.formMatch.matched ? 'nod' : 'disgust');

    const timer = setTimeout(() => {
      setPhase('reveal-ingredients');
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, revealOpacity, onReaction, demandBreakdown]);

  // Phase 5: Reveal ingredient preferences
  useEffect(() => {
    if (phase !== 'reveal-ingredients') return;

    revealOpacity.setValue(0);
    Animated.timing(revealOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const hasHated = (demandBreakdown?.ingredientMatch.hatedHits.length ?? 0) > 0;
    const hasDesired = (demandBreakdown?.ingredientMatch.desiredHits.length ?? 0) > 0;
    onReaction?.(hasHated ? 'disgust' : hasDesired ? 'excitement' : 'nervous');

    const timer = setTimeout(() => {
      setPhase('reveal-cook');
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, revealOpacity, onReaction, demandBreakdown]);

  // Phase 6: Reveal cook preference
  useEffect(() => {
    if (phase !== 'reveal-cook') return;

    revealOpacity.setValue(0);
    Animated.timing(revealOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    onReaction?.(demandBreakdown?.cookMatch.matched ? 'nod' : 'disgust');

    const timer = setTimeout(() => {
      setPhase('scores');
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, revealOpacity, onReaction, demandBreakdown]);

  // Phase 7: Score reveal one by one
  useEffect(() => {
    if (phase !== 'scores') return;

    // Clear any previously scheduled timers from this chain
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    const scheduleTimeout = (fn: () => void, delay: number) => {
      const id = setTimeout(fn, delay);
      timerRefs.current.push(id);
      return id;
    };

    const totalToReveal = CHALLENGE_LABELS.length;
    let count = 0;

    const revealNext = () => {
      if (count < totalToReveal) {
        Animated.timing(scoreOpacities[count], {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
        count++;
        setRevealedScoreCount(count);
      }

      if (count < totalToReveal) {
        scheduleTimeout(revealNext, 500);
      } else {
        // Reveal average after last score
        scheduleTimeout(() => {
          Animated.timing(averageOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();

          // Then reveal demand breakdown (if present)
          if (demandBreakdown) {
            scheduleTimeout(() => {
              Animated.timing(demandOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }).start();

              // Then move to rank phase
              scheduleTimeout(() => {
                setPhase('rank');
              }, 1500);
            }, 600);
          } else {
            // No demand breakdown — go straight to rank
            scheduleTimeout(() => {
              setPhase('rank');
            }, 1200);
          }
        }, 600);
      }
    };

    scheduleTimeout(revealNext, 300);

    return () => {
      timerRefs.current.forEach(clearTimeout);
      timerRefs.current = [];
    };
  }, [phase, scoreOpacities, averageOpacity, demandOpacity, demandBreakdown]);

  // Phase 8: Rank badge reveal
  useEffect(() => {
    if (phase !== 'rank') return;

    // Dramatic rank appearance
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

    // Reaction based on rank
    if (verdict.rank === 'S') {
      onReaction?.('excitement');
    } else if (verdict.rank === 'A') {
      onReaction?.('nod');
    } else if (verdict.rank === 'B') {
      onReaction?.('disgust');
    } else {
      onReaction?.('laugh');
    }

    const timer = setTimeout(() => {
      setPhase('dialogue');
    }, 1500);

    return () => clearTimeout(timer);
  }, [phase, rankOpacity, rankScale, verdict.rank, onReaction]);

  // Handle dialogue completion
  const handleDialogueComplete = useCallback(
    (_effects: string[]) => {
      setPhase('complete');

      // Record the final tasting score regardless of outcome
      completeChallenge(verdict.averageScore);

      if (verdict.rank !== 'S') {
        // Only S-rank is true victory. A/B/F = defeat with different dialogue tones.
        // completeChallenge already set gameStatus to 'victory' (last challenge),
        // so override it to 'defeat' for non-S ranks.
        useGameStore.setState({gameStatus: 'defeat'});
      }
    },
    [verdict, completeChallenge],
  );

  const rankColor = RANK_COLORS[verdict.rank] ?? '#FF1744';

  /** Format a bonus/penalty number with sign and color. */
  const formatBonus = (points: number) => {
    const sign = points >= 0 ? '+' : '';
    const color = points >= 0 ? '#4CAF50' : '#FF1744';
    return {text: `${sign}${points}`, color};
  };

  return (
    <Animated.View style={[styles.container, {opacity: overlayOpacity}]} pointerEvents="box-none">
      {/* Dark overlay background */}
      <View style={styles.darkOverlay} pointerEvents="none" />

      {/* THE TASTING title */}
      <Animated.View style={[styles.titleContainer, {opacity: titleOpacity}]}>
        <Text style={styles.titleText}>THE TASTING</Text>
        <View style={styles.titleUnderline} />
      </Animated.View>

      {/* Eating / Judging status indicator */}
      {phase === 'eating' && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Mr. Sausage is eating...</Text>
        </View>
      )}
      {phase === 'judging' && (
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, styles.judgingText]}>Judging...</Text>
        </View>
      )}

      {/* Reveal: Form preference */}
      {phase === 'reveal-form' && demandBreakdown && (
        <Animated.View style={[styles.revealContainer, {opacity: revealOpacity}]}>
          <Text style={styles.revealQuote}>
            {`"I wanted ${mrSausageDemands?.preferredForm?.toUpperCase()}!"`}
          </Text>
          <Text
            style={[
              styles.revealIndicator,
              {color: demandBreakdown.formMatch.matched ? '#4CAF50' : '#FF1744'},
            ]}
          >
            {demandBreakdown.formMatch.matched
              ? `MATCH — You made ${demandBreakdown.formMatch.got}`
              : `MISMATCH — You made ${demandBreakdown.formMatch.got ?? 'nothing'}`}
          </Text>
        </Animated.View>
      )}

      {/* Reveal: Ingredient preferences */}
      {phase === 'reveal-ingredients' && demandBreakdown && mrSausageDemands && (
        <Animated.View style={[styles.revealContainer, {opacity: revealOpacity}]}>
          <Text style={styles.revealQuote}>
            {`"I was CRAVING ${mrSausageDemands.desiredIngredients.join(', ')}..."`}
          </Text>
          {demandBreakdown.ingredientMatch.desiredHits.length > 0 && (
            <Text style={[styles.revealDetail, {color: '#4CAF50'}]}>
              {`HIT: ${demandBreakdown.ingredientMatch.desiredHits.join(', ')}`}
            </Text>
          )}
          {mrSausageDemands.hatedIngredients.length > 0 && (
            <Text style={styles.revealQuoteSmall}>
              {`"And I HATE ${mrSausageDemands.hatedIngredients.join(', ')}!"`}
            </Text>
          )}
          {demandBreakdown.ingredientMatch.hatedHits.length > 0 && (
            <Text style={[styles.revealDetail, {color: '#FF1744'}]}>
              {`INCLUDED HATED: ${demandBreakdown.ingredientMatch.hatedHits.join(', ')}`}
            </Text>
          )}
        </Animated.View>
      )}

      {/* Reveal: Cook preference */}
      {phase === 'reveal-cook' && demandBreakdown && mrSausageDemands && (
        <Animated.View style={[styles.revealContainer, {opacity: revealOpacity}]}>
          <Text style={styles.revealQuote}>
            {`"I said ${COOK_LABELS[mrSausageDemands.cookPreference] ?? mrSausageDemands.cookPreference}!"`}
          </Text>
          <Text
            style={[
              styles.revealIndicator,
              {color: demandBreakdown.cookMatch.matched ? '#4CAF50' : '#FF1744'},
            ]}
          >
            {demandBreakdown.cookMatch.matched ? 'MATCH' : 'MISMATCH'}
            {` — Cook level: ${(demandBreakdown.cookMatch.actual * 100).toFixed(0)}%`}
          </Text>
        </Animated.View>
      )}

      {/* Score summary panel */}
      {(phase === 'scores' || phase === 'rank' || phase === 'dialogue' || phase === 'complete') && (
        <View style={styles.scoreSummaryPanel}>
          {CHALLENGE_LABELS.map((label, index) => {
            const score = challengeScores[index] ?? 0;
            return (
              <Animated.View
                key={label}
                style={[styles.scoreRow, {opacity: scoreOpacities[index]}]}
              >
                <Text style={styles.scoreLabel}>{label}</Text>
                <Text style={styles.scoreValue}>{Math.round(score)}</Text>
              </Animated.View>
            );
          })}

          {/* Average line */}
          <Animated.View style={[styles.averageRow, {opacity: averageOpacity}]}>
            <View style={styles.averageDivider} />
            <View style={styles.scoreRow}>
              <Text style={styles.averageLabel}>Average</Text>
              <Text style={styles.averageValue}>
                {(
                  challengeScores.reduce((s, v) => s + v, 0) / (challengeScores.length || 1)
                ).toFixed(1)}
              </Text>
            </View>
          </Animated.View>

          {/* Demand breakdown */}
          {demandBreakdown && (
            <Animated.View style={[styles.demandSection, {opacity: demandOpacity}]}>
              <View style={styles.averageDivider} />
              <Text style={styles.demandHeader}>Mr. Sausage's Demands</Text>

              <View style={styles.scoreRow}>
                <Text style={styles.demandLabel}>Form</Text>
                <Text
                  style={[
                    styles.demandValue,
                    {color: formatBonus(demandBreakdown.formMatch.points).color},
                  ]}
                >
                  {formatBonus(demandBreakdown.formMatch.points).text}
                </Text>
              </View>

              <View style={styles.scoreRow}>
                <Text style={styles.demandLabel}>Ingredients</Text>
                <Text
                  style={[
                    styles.demandValue,
                    {color: formatBonus(demandBreakdown.ingredientMatch.points).color},
                  ]}
                >
                  {formatBonus(demandBreakdown.ingredientMatch.points).text}
                </Text>
              </View>

              <View style={styles.scoreRow}>
                <Text style={styles.demandLabel}>Cook</Text>
                <Text
                  style={[
                    styles.demandValue,
                    {color: formatBonus(demandBreakdown.cookMatch.points).color},
                  ]}
                >
                  {formatBonus(demandBreakdown.cookMatch.points).text}
                </Text>
              </View>

              {demandBreakdown.flairBonus > 0 && (
                <View style={styles.scoreRow}>
                  <Text style={styles.demandLabel}>Flair</Text>
                  <Text style={[styles.demandValue, {color: '#4CAF50'}]}>
                    {formatBonus(demandBreakdown.flairBonus).text}
                  </Text>
                </View>
              )}

              <View style={styles.averageDivider} />
              <View style={styles.scoreRow}>
                <Text style={styles.adjustedLabel}>Adjusted Total</Text>
                <Text style={styles.adjustedValue}>{verdict.averageScore.toFixed(1)}</Text>
              </View>
            </Animated.View>
          )}
        </View>
      )}

      {/* Rank badge */}
      {(phase === 'rank' || phase === 'dialogue' || phase === 'complete') && (
        <Animated.View
          style={[
            styles.rankContainer,
            {
              opacity: rankOpacity,
              transform: [{scale: rankScale}],
            },
          ]}
        >
          <View
            style={[
              styles.rankBadge,
              {
                borderColor: rankColor,
                shadowColor: rankColor,
              },
            ]}
          >
            <Text style={[styles.rankLetter, {color: rankColor}]}>{verdict.rank}</Text>
          </View>
          <Text style={[styles.rankTitle, {color: rankColor}]}>{verdict.title}</Text>
        </Animated.View>
      )}

      {/* Verdict dialogue */}
      {phase === 'dialogue' && (
        <DialogueOverlay lines={verdictDialogue} onComplete={handleDialogueComplete} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 0, 0, 0.75)',
  },

  // Title
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

  // Status indicators
  statusContainer: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 55,
  },
  statusText: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 3,
    textShadowColor: 'rgba(255, 200, 50, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
  judgingText: {
    color: '#FF1744',
    textShadowColor: 'rgba(255, 23, 68, 0.6)',
  },

  // Reveal phases
  revealContainer: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    alignItems: 'center',
    zIndex: 55,
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 12,
    padding: 20,
  },
  revealQuote: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(255, 200, 50, 0.3)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
  },
  revealQuoteSmall: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  revealIndicator: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 2,
    textAlign: 'center',
  },
  revealDetail: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Bangers',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },

  // Score summary
  scoreSummaryPanel: {
    position: 'absolute',
    top: 110,
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
  averageRow: {
    marginTop: 4,
  },
  averageDivider: {
    height: 2,
    backgroundColor: '#444',
    marginBottom: 4,
  },
  averageLabel: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
  },
  averageValue: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 23, 68, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
  },

  // Demand breakdown
  demandSection: {
    marginTop: 8,
  },
  demandHeader: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
    marginTop: 4,
  },
  demandLabel: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#9E9E9E',
    letterSpacing: 1,
  },
  demandValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 1,
  },
  adjustedLabel: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
  },
  adjustedValue: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FFD700',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 215, 0, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
  },

  // Rank badge
  rankContainer: {
    position: 'absolute',
    top: '52%',
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
  rankTitle: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 3,
    marginTop: 8,
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
});
