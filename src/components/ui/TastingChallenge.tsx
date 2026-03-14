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
 *
 * Rewritten from react-native to web HTML/CSS with CSS transitions.
 */

import {useEffect, useState} from 'react';

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
  const [rankVisible, setRankVisible] = useState(false);

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
      // Trigger rank badge animation
      requestAnimationFrame(() => setRankVisible(true));
    }

    const timer = setTimeout(() => {
      if (currentIdx < phases.length - 1) {
        setPhase(phases[currentIdx + 1]);
      }
    }, PHASE_DURATION);

    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  const showIngredients = ['ingredients', 'cook', 'total', 'rank', 'done'].includes(phase);
  const showCook = ['cook', 'total', 'rank', 'done'].includes(phase);
  const showTotal = ['total', 'rank', 'done'].includes(phase);
  const showRank = ['rank', 'done'].includes(phase);

  return (
    <div style={styles.container}>
      <div style={styles.darkOverlay} />

      {/* Title */}
      <div style={styles.titleContainer}>
        <div style={styles.titleText}>THE TASTING</div>
        <div style={styles.titleUnderline} />
      </div>

      {/* Score reveal panel */}
      <div style={styles.scorePanel}>
        <div style={styles.scoreRow}>
          <span style={styles.scoreLabel}>FORM</span>
          <span style={styles.scoreValue}>{Math.round(scores.form)}</span>
        </div>

        {showIngredients && (
          <div style={styles.scoreRow}>
            <span style={styles.scoreLabel}>INGREDIENTS</span>
            <span style={styles.scoreValue}>{Math.round(scores.ingredients)}</span>
          </div>
        )}

        {showCook && (
          <div style={styles.scoreRow}>
            <span style={styles.scoreLabel}>COOK</span>
            <span style={styles.scoreValue}>{Math.round(scores.cook)}</span>
          </div>
        )}

        {showTotal && (
          <>
            <div style={styles.divider} />

            {demandBonus !== 0 && (
              <div style={styles.scoreRow}>
                <span style={styles.demandLabel}>DEMAND BONUS</span>
                <span
                  style={{...styles.demandValue, color: demandBonus > 0 ? '#4CAF50' : '#FF1744'}}
                >
                  {demandBonus > 0 ? '+' : ''}
                  {demandBonus}
                </span>
              </div>
            )}

            <div style={styles.scoreRow}>
              <span style={styles.totalLabel}>TOTAL</span>
              <span style={{...styles.totalValue, color: rankColor}}>{Math.round(total)}</span>
            </div>
          </>
        )}
      </div>

      {/* Rank badge */}
      {showRank && (
        <div
          style={{
            ...styles.rankContainer,
            opacity: rankVisible ? 1 : 0,
            transform: rankVisible ? 'scale(1)' : 'scale(0.3)',
            transition:
              'opacity 600ms ease-out, transform 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          <div
            style={{
              ...styles.rankBadge,
              borderColor: rankColor,
              boxShadow: `0 0 20px ${rankColor}`,
            }}
          >
            <span
              style={{
                ...styles.rankLetter,
                color: rankColor,
                textShadow: `0 0 16px ${rankColor}`,
              }}
            >
              {rank}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
  },
  darkOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(5, 0, 0, 0.85)',
    pointerEvents: 'none',
  },
  titleContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 55,
  },
  titleText: {
    fontSize: 42,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 6,
    textShadow: '0 0 20px rgba(255, 23, 68, 0.7)',
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
    border: '2px solid #333',
    borderRadius: 12,
    padding: 16,
    zIndex: 55,
  },
  scoreRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#BDBDBD',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 2,
  },
  divider: {
    height: 2,
    backgroundColor: '#444',
    margin: '8px 0',
  },
  demandLabel: {
    fontSize: 16,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#D2A24C',
    letterSpacing: 1,
  },
  demandValue: {
    fontSize: 18,
    fontWeight: 900,
    fontFamily: 'Bangers',
    letterSpacing: 1,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 900,
    fontFamily: 'Bangers',
    letterSpacing: 2,
  },
  rankContainer: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 55,
  },
  rankBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    border: '4px solid',
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankLetter: {
    fontSize: 72,
    fontWeight: 900,
    fontFamily: 'Bangers',
    letterSpacing: 0,
  },
};
