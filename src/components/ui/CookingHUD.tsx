/**
 * @module CookingHUD
 * Pure presentational HUD overlay for the cooking station.
 * Props-driven: receives temperature, target zone, and time in zone.
 * No store access -- all data flows through props.
 *
 * NOT used during gameplay (diegetic feedback via SurrealText).
 * Rewritten from react-native to web HTML/CSS.
 */

interface CookingHUDProps {
  /** Current temperature in degrees */
  temperature: number;
  /** Target temperature zone [min, max] */
  targetZone: [number, number];
  /** Time spent in the target zone (seconds) */
  timeInZone: number;
}

export function CookingHUD({temperature, targetZone, timeInZone}: CookingHUDProps) {
  const [minTarget, maxTarget] = targetZone;
  const inZone = temperature >= minTarget && temperature <= maxTarget;

  const getTempColor = (): string => {
    if (temperature < minTarget) return '#4FC3F7'; // cold
    if (temperature <= maxTarget) return '#4CAF50'; // perfect
    return '#FF1744'; // hot
  };

  return (
    <div style={styles.container}>
      {/* Temperature readout */}
      <div style={styles.tempContainer}>
        <div style={{...styles.tempValue, color: getTempColor()}}>
          {Math.round(temperature)}
          {'\u00B0'}F
        </div>
        <div style={styles.targetText}>
          TARGET: {minTarget}
          {'\u00B0'} - {maxTarget}
          {'\u00B0'}F
        </div>
        {inZone && (
          <div style={styles.inZoneBadge}>
            <span style={styles.inZoneText}>IN ZONE</span>
          </div>
        )}
      </div>

      {/* Zone time indicator */}
      <div style={styles.timeContainer}>
        <div style={styles.label}>TIME IN ZONE</div>
        <div style={styles.timeValue}>{timeInZone.toFixed(1)}s</div>
      </div>

      {/* Temperature bar */}
      <div style={styles.barContainer}>
        <div style={styles.barTrack}>
          {/* Target zone indicator */}
          <div
            style={{
              ...styles.targetZoneIndicator,
              left: `${Math.min(100, Math.max(0, (minTarget / 400) * 100))}%`,
              width: `${Math.min(100, ((maxTarget - minTarget) / 400) * 100)}%`,
            }}
          />
          {/* Temperature needle */}
          <div
            style={{
              ...styles.tempNeedle,
              left: `${Math.min(100, Math.max(0, (temperature / 400) * 100))}%`,
              backgroundColor: getTempColor(),
            }}
          />
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
  tempContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  tempValue: {
    fontSize: 48,
    fontWeight: 900,
    fontFamily: 'Bangers',
    letterSpacing: 4,
    textShadow: '2px 2px 12px rgba(0, 0, 0, 0.8)',
  },
  targetText: {
    fontSize: 14,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#999',
    letterSpacing: 2,
    marginTop: 4,
  },
  inZoneBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    border: '2px solid #4CAF50',
    borderRadius: 8,
    padding: '4px 16px',
  },
  inZoneText: {
    fontSize: 18,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#4CAF50',
    letterSpacing: 4,
  },
  timeContainer: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 3,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#FFC832',
    letterSpacing: 2,
    marginTop: 4,
  },
  barContainer: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
    border: '2px solid #333',
    borderRadius: 12,
    padding: 12,
  },
  barTrack: {
    height: 16,
    backgroundColor: '#222',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  targetZoneIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderLeft: '2px solid #4CAF50',
    borderRight: '2px solid #4CAF50',
  },
  tempNeedle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
  },
};
