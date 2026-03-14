/**
 * @module GameOverScreen
 * Full-screen results overlay shown after the game ends.
 *
 * Props-driven: receives rank, totalScore, score breakdown, demand bonus,
 * and callback handlers. Displays rank badge with rank-specific colors,
 * per-challenge score breakdown, demand bonus details, and action buttons.
 *
 * Rank colors: S=Gold(#FFD700), A=Silver(#C0C0C0), B=Bronze(#CD7F32), F=Blood Red(#FF1744)
 *
 * Rewritten from react-native to web HTML/CSS with CSS transitions.
 */

import {useEffect, useState} from 'react';

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
  const rankColor = RANK_COLORS[rank] ?? '#FF1744';
  const [visible, setVisible] = useState(false);
  const [rankScale, setRankScale] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => setRankScale(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        ...styles.overlay,
        opacity: visible ? 1 : 0,
        transition: 'opacity 600ms ease-out',
      }}
    >
      <div style={styles.scrollView}>
        <div style={styles.content}>
          {/* Rank letter */}
          <div
            style={{
              ...styles.rankLetter,
              color: rankColor,
              textShadow: `0 0 30px ${rankColor}`,
              transform: rankScale ? 'scale(1)' : 'scale(0.3)',
              transition: 'transform 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            title={`Rank ${rank}`}
          >
            {rank}
          </div>

          {/* Total score */}
          <h2 style={styles.verdictTitle}>TOTAL SCORE</h2>
          <div style={styles.scoreCard}>
            <span style={{...styles.scoreValue, color: rankColor}}>{Math.round(totalScore)}</span>
          </div>

          {/* Per-challenge score breakdown */}
          <div style={styles.challengeScores}>
            {breakdown.map((item, i) => (
              <div key={i} style={styles.challengeScoreRow}>
                <span style={styles.challengeScoreLabel}>{item.label}</span>
                <span style={styles.challengeScoreValue}>{Math.round(item.score)}</span>
              </div>
            ))}
          </div>

          {/* Demand bonus */}
          {demandBonus !== 0 && (
            <div style={styles.demandBonusContainer}>
              <span style={styles.demandBonusLabel}>DEMAND BONUS</span>
              <span
                style={{
                  ...styles.demandBonusValue,
                  color: demandBonus > 0 ? '#4CAF50' : '#FF1744',
                }}
              >
                {demandBonus > 0 ? '+' : ''}
                {demandBonus}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div style={styles.buttonContainer}>
            <button
              type="button"
              style={styles.newGameButton}
              onClick={onPlayAgain}
              aria-label="Start new game"
            >
              <span style={styles.buttonText}>PLAY AGAIN</span>
            </button>

            <button
              type="button"
              style={styles.menuButton}
              onClick={onMenu}
              aria-label="Return to main menu"
            >
              <span style={styles.menuButtonText}>MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 100,
  },
  scrollView: {
    width: '100%',
    height: '100%',
    overflow: 'auto',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 24px',
    width: '100%',
    maxWidth: 420,
    margin: '0 auto',
    minHeight: '100%',
    justifyContent: 'center',
  },
  rankLetter: {
    fontSize: 72,
    fontWeight: 900,
    fontFamily: 'Bangers',
    marginBottom: 8,
  },
  verdictTitle: {
    fontSize: 28,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  scoreCard: {
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    border: '1px solid #333',
    borderRadius: 12,
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: 900,
    fontFamily: 'Bangers',
    letterSpacing: 2,
  },
  challengeScores: {
    width: '100%',
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  challengeScoreRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '0 16px',
  },
  challengeScoreLabel: {
    fontSize: 14,
    fontFamily: 'Bangers',
    color: '#666',
    letterSpacing: 1,
  },
  challengeScoreValue: {
    fontSize: 14,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 1,
  },
  demandBonusContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 16px',
    marginBottom: 32,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    border: '1px solid #333',
    borderRadius: 8,
    boxSizing: 'border-box',
  },
  demandBonusLabel: {
    fontSize: 14,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#D2A24C',
    letterSpacing: 2,
  },
  demandBonusValue: {
    fontSize: 18,
    fontWeight: 900,
    fontFamily: 'Bangers',
    letterSpacing: 2,
  },
  buttonContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  newGameButton: {
    backgroundColor: '#B71C1C',
    border: '2px solid #FF1744',
    borderRadius: 12,
    padding: '16px 36px',
    boxShadow: '0 4px 12px rgba(255, 23, 68, 0.4)',
    cursor: 'pointer',
    outline: 'none',
  },
  menuButton: {
    backgroundColor: '#333',
    border: '2px solid #555',
    borderRadius: 12,
    padding: '14px 36px',
    cursor: 'pointer',
    outline: 'none',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 900,
    fontFamily: 'Bangers',
    textAlign: 'center',
    letterSpacing: 1,
    display: 'block',
  },
  menuButtonText: {
    color: '#AAA',
    fontSize: 18,
    fontWeight: 900,
    fontFamily: 'Bangers',
    textAlign: 'center',
    letterSpacing: 1,
    display: 'block',
  },
};
