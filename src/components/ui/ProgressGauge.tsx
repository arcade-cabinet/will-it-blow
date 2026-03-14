/**
 * @module ProgressGauge
 * Horizontal progress bar used across challenge overlays for fill level,
 * pressure, temperature, and other 0-100 metrics.
 *
 * Features:
 * - Labeled bar with percentage readout
 * - Configurable fill color (default green #4CAF50)
 * - Optional danger threshold marker
 * - Glow shadow on the fill when value > 5%
 * - Value is clamped to [0, 100] before rendering
 *
 * NOT used during gameplay (diegetic feedback via SurrealText).
 * Rewritten from react-native to web HTML/CSS.
 */

interface ProgressGaugeProps {
  value: number; // 0-100
  label: string;
  color?: string; // default '#4CAF50'
  dangerThreshold?: number; // turns red above this
}

export function ProgressGauge({
  value,
  label,
  color = '#4CAF50',
  dangerThreshold,
}: ProgressGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const isAboveDanger = dangerThreshold !== undefined && clampedValue > dangerThreshold;
  const fillColor = isAboveDanger ? '#FF1744' : color;
  const percentage = Math.round(clampedValue);

  return (
    <div
      style={styles.container}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <div style={styles.labelRow}>
        <span style={styles.label}>{label}</span>
        <span style={{...styles.percentage, color: fillColor}}>{percentage}%</span>
      </div>
      <div style={styles.track}>
        <div
          style={{
            ...styles.fill,
            width: `${clampedValue}%`,
            backgroundColor: fillColor,
            ...(clampedValue > 5
              ? {
                  boxShadow: `0 0 6px ${fillColor}`,
                }
              : {}),
          }}
        />
        {dangerThreshold !== undefined && (
          <div style={{...styles.thresholdMarker, left: `${dangerThreshold}%`}} />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  labelRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: 900,
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  percentage: {
    fontSize: 14,
    fontWeight: 900,
    fontFamily: 'Bangers',
    letterSpacing: 1,
  },
  track: {
    width: '100%',
    height: 18,
    backgroundColor: '#222',
    borderRadius: 9,
    border: '1px solid #444',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 8,
  },
  thresholdMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF1744',
  },
};
