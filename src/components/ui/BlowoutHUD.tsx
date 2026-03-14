/**
 * @module BlowoutHUD
 * Pure presentational HUD overlay for the blowout station.
 * Props-driven: receives pressure and tie status, renders read-only display.
 * No store access -- all data flows through props.
 *
 * NOT used during gameplay (diegetic feedback via SurrealText).
 * Rewritten from react-native to web HTML/CSS.
 */

interface BlowoutHUDProps {
  /** Current sausage pressure (0-100) */
  pressure: number;
  /** Whether the left end is tied */
  leftTied: boolean;
  /** Whether the right end is tied */
  rightTied: boolean;
}

export function BlowoutHUD({pressure, leftTied, rightTied}: BlowoutHUDProps) {
  const pressureColor = pressure > 80 ? '#FF1744' : pressure > 50 ? '#FFC107' : '#4CAF50';

  return (
    <div style={styles.container}>
      {/* Pressure gauge */}
      <div style={styles.pressureContainer}>
        <div style={styles.label}>PRESSURE</div>
        <div style={styles.barTrack}>
          <div
            style={{
              ...styles.barFill,
              width: `${Math.min(100, Math.max(0, pressure))}%`,
              backgroundColor: pressureColor,
            }}
          />
        </div>
        <div style={{...styles.pressureValue, color: pressureColor}}>{Math.round(pressure)}%</div>
      </div>

      {/* Tie status */}
      <div style={styles.tieContainer}>
        <div style={styles.tieRow}>
          <div style={styles.tieItem}>
            <div style={styles.tieLabel}>LEFT</div>
            <div style={{...styles.tieStatus, ...(leftTied ? styles.tied : styles.open)}}>
              {leftTied ? 'TIED' : 'OPEN'}
            </div>
          </div>
          <div style={styles.tieItem}>
            <div style={styles.tieLabel}>RIGHT</div>
            <div style={{...styles.tieStatus, ...(rightTied ? styles.tied : styles.open)}}>
              {rightTied ? 'TIED' : 'OPEN'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
    pointerEvents: 'none',
  },
  pressureContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
    border: '2px solid #333',
    borderRadius: 12,
    padding: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 3,
    marginBottom: 4,
  },
  barTrack: {
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  pressureValue: {
    fontSize: 20,
    fontWeight: 900,
    fontFamily: 'Bangers',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
  },
  tieContainer: {
    position: 'absolute',
    top: 160,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
    border: '2px solid #333',
    borderRadius: 12,
    padding: 12,
  },
  tieRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tieItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  tieLabel: {
    fontSize: 12,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 3,
    marginBottom: 4,
  },
  tieStatus: {
    fontSize: 18,
    fontWeight: 900,
    fontFamily: 'Bangers',
    letterSpacing: 2,
  },
  tied: {
    color: '#4CAF50',
  },
  open: {
    color: '#FF1744',
  },
};
