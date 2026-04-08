/**
 * @module StrikeCounter
 * HUD showing strike indicators (circles that turn to red X marks).
 *
 * Pure presentational -- receives strikes/maxStrikes via props.
 * NOT used during gameplay (diegetic feedback via SurrealText).
 * Rewritten from react-native to web HTML/CSS.
 */

interface StrikeCounterProps {
  strikes: number;
  maxStrikes?: number;
}

export function StrikeCounter({strikes, maxStrikes = 3}: StrikeCounterProps) {
  return (
    <div
      style={styles.container}
      role="status"
      aria-label={`${strikes} of ${maxStrikes} strikes used`}
    >
      {Array.from({length: maxStrikes}, (_, i) => (
        <span
          key={i}
          role="img"
          style={{...styles.strike, ...(i < strikes ? styles.used : styles.unused)}}
          aria-label={i < strikes ? `Strike ${i + 1} used` : `Strike ${i + 1} remaining`}
        >
          {i < strikes ? '\u2715' : '\u25CB'}
        </span>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    zIndex: 80,
  },
  strike: {
    fontSize: 24,
    fontWeight: 900,
  },
  used: {
    color: '#FF1744',
  },
  unused: {
    color: '#555',
  },
};
