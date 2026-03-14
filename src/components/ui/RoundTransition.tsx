/**
 * @module RoundTransition
 * Between-round summary overlay.
 *
 * Props-driven (no ChallengeRegistry dependency):
 *  - roundNumber, totalRounds, roundScore, totalScore
 *  - onNextRound callback
 *
 * Rewritten from react-native to web HTML/CSS.
 */

interface RoundTransitionProps {
  roundNumber: number;
  totalRounds: number;
  roundScore: number;
  totalScore: number;
  onNextRound: () => void;
}

export function RoundTransition({
  roundNumber,
  totalRounds,
  roundScore,
  totalScore,
  onNextRound,
}: RoundTransitionProps) {
  const scoreColor =
    roundScore >= 90
      ? '#FFD700'
      : roundScore >= 70
        ? '#FFC832'
        : roundScore >= 50
          ? '#FF8C00'
          : '#FF1744';

  return (
    <section
      style={styles.container}
      aria-label={`Round ${roundNumber} of ${totalRounds} complete`}
    >
      <div style={styles.card}>
        <h2 style={styles.roundLabel}>
          ROUND {roundNumber} OF {totalRounds}
        </h2>

        <div style={styles.divider} />

        <div style={styles.scoreRow}>
          <span style={styles.scoreLabel}>ROUND SCORE</span>
          <span style={{...styles.scoreValue, color: scoreColor}}>{Math.round(roundScore)}</span>
        </div>

        <div style={styles.scoreRow}>
          <span style={styles.scoreLabel}>TOTAL</span>
          <span style={{...styles.scoreValue, color: '#FFC832'}}>{Math.round(totalScore)}</span>
        </div>

        <div style={styles.divider} />

        <button type="button" style={styles.button} onClick={onNextRound} aria-label="Next round">
          <span style={styles.buttonText}>NEXT ROUND</span>
        </button>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 0, 0, 0.9)',
  },
  card: {
    backgroundColor: '#1a0505',
    border: '2px solid #8B0000',
    borderRadius: 4,
    padding: '28px 32px',
    minWidth: 300,
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  roundLabel: {
    fontSize: 28,
    fontWeight: 900,
    color: '#FF1744',
    letterSpacing: 4,
    textAlign: 'center',
  },
  divider: {
    height: 2,
    backgroundColor: '#8B0000',
    width: '100%',
    margin: '16px 0',
    opacity: 0.6,
  },
  scoreRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '6px 0',
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: 700,
    color: '#ccc',
    letterSpacing: 2,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#D2A24C',
    padding: '14px 28px',
    borderRadius: 8,
    border: '3px solid #8B4513',
    cursor: 'pointer',
    outline: 'none',
  },
  buttonText: {
    color: '#1a0a00',
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 2,
  },
};
