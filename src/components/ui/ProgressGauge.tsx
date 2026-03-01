/**
 * @module ProgressGauge
 * Horizontal progress bar used across challenge overlays for fill level,
 * pressure, temperature, and other 0-100 metrics.
 *
 * Features:
 * - Labeled bar with percentage readout
 * - Configurable fill color (default green #4CAF50)
 * - Optional danger threshold marker: a red vertical line at the
 *   threshold position; bar fill turns red (#FF1744) when value exceeds it
 * - Glow shadow on the fill when value > 5% for visual feedback
 * - Value is clamped to [0, 100] before rendering
 *
 * @param props.value - Current value (0-100, clamped)
 * @param props.label - Uppercase label shown left of the bar
 * @param props.color - Fill color below danger threshold (default '#4CAF50')
 * @param props.dangerThreshold - Value above which fill turns red; renders a marker line
 */

import {StyleSheet, Text, View} from 'react-native';

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
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.percentage, {color: fillColor}]}>{percentage}%</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedValue}%`,
              backgroundColor: fillColor,
            },
            clampedValue > 5 && {
              shadowColor: fillColor,
              shadowOffset: {width: 0, height: 0},
              shadowOpacity: 0.6,
              shadowRadius: 6,
              elevation: 4,
            },
          ]}
        />
        {dangerThreshold !== undefined && (
          <View style={[styles.thresholdMarker, {left: `${dangerThreshold}%`}]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 1,
  },
  track: {
    width: '100%',
    height: 18,
    backgroundColor: '#222',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#444',
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
});
