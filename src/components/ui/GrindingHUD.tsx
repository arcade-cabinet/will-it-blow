/**
 * @module GrindingHUD
 * Pure presentational HUD overlay for the grinding station.
 * Props-driven: receives speed and progress, renders read-only display.
 * No store access -- all data flows through props.
 *
 * NOT used during gameplay (diegetic feedback via SurrealText).
 * Rewritten from react-native to web HTML/CSS.
 */

interface GrindingHUDProps {
  /** Current grind speed (0-100) */
  speed: number;
  /** Current grind progress (0-100) */
  progress: number;
}

function getSpeedZone(speed: number): 'SLOW' | 'GOOD' | 'FAST' {
  if (speed < 30) return 'SLOW';
  if (speed <= 70) return 'GOOD';
  return 'FAST';
}

function getZoneColor(zone: 'SLOW' | 'GOOD' | 'FAST'): string {
  switch (zone) {
    case 'SLOW':
      return '#FF9800';
    case 'GOOD':
      return '#4CAF50';
    case 'FAST':
      return '#FF1744';
  }
}

export function GrindingHUD({speed, progress}: GrindingHUDProps) {
  const zone = getSpeedZone(speed);
  const zoneColor = getZoneColor(zone);

  return (
    <div style={styles.container}>
      {/* Speed zone indicator */}
      <div style={styles.speedContainer}>
        <div style={styles.label}>SPEED</div>
        <div style={{...styles.zoneText, color: zoneColor}}>{zone}</div>
        <div style={styles.speedBarTrack}>
          <div
            style={{
              ...styles.speedBarFill,
              width: `${Math.min(100, Math.max(0, speed))}%`,
              backgroundColor: zoneColor,
            }}
          />
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressContainer}>
        <div style={styles.label}>PROGRESS</div>
        <div style={styles.progressBarTrack}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${Math.min(100, Math.max(0, progress))}%`,
            }}
          />
        </div>
        <div style={styles.percentText}>{Math.round(progress)}%</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
    padding: 16,
    pointerEvents: 'none',
  },
  speedContainer: {
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
  zoneText: {
    fontSize: 22,
    fontWeight: 900,
    fontFamily: 'Bangers',
    letterSpacing: 3,
    marginBottom: 8,
  },
  speedBarTrack: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  speedBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressContainer: {
    position: 'absolute',
    top: 150,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
    border: '2px solid #333',
    borderRadius: 12,
    padding: 12,
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  percentText: {
    fontSize: 16,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
  },
};
