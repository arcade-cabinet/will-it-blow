/**
 * @module StuffingHUD
 * Pure presentational HUD overlay for the stuffing station.
 * Props-driven: receives pressure and fillLevel, renders read-only display.
 * No store access -- all data flows through props.
 *
 * NOT used during gameplay (diegetic feedback via SurrealText).
 * Rewritten from react-native to web HTML/CSS.
 */

interface StuffingHUDProps {
  /** Current casing pressure (0-100) */
  pressure: number;
  /** Current fill level (0-100) */
  fillLevel: number;
}

const DANGER_THRESHOLD = 80;

export function StuffingHUD({pressure, fillLevel}: StuffingHUDProps) {
  const isDanger = pressure >= DANGER_THRESHOLD;
  const pressureColor = isDanger ? '#FF1744' : pressure > 60 ? '#FFC107' : '#4CAF50';

  return (
    <div style={styles.container}>
      {/* Pressure gauge */}
      <div style={styles.gaugeContainer}>
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
        <div style={{...styles.valueText, color: pressureColor}}>{Math.round(pressure)}%</div>
        {isDanger && <div style={styles.dangerText}>DANGER</div>}
      </div>

      {/* Fill bar */}
      <div style={styles.fillContainer}>
        <div style={styles.label}>FILL</div>
        <div style={styles.barTrack}>
          <div
            style={{
              ...styles.barFill,
              width: `${Math.min(100, Math.max(0, fillLevel))}%`,
              backgroundColor: '#4CAF50',
            }}
          />
        </div>
        <div style={styles.valueText}>{Math.round(fillLevel)}%</div>
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
  gaugeContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
    border: '2px solid #333',
    borderRadius: 12,
    padding: 12,
  },
  fillContainer: {
    position: 'absolute',
    top: 160,
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
  valueText: {
    fontSize: 16,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
  },
  dangerText: {
    fontSize: 20,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 4,
    textShadow: '0 0 12px rgba(255, 23, 68, 0.8)',
  },
};
