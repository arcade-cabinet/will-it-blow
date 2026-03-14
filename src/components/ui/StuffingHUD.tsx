/**
 * @module StuffingHUD
 * Pure presentational HUD overlay for the stuffing station.
 * Props-driven: receives pressure and fillLevel, renders read-only display.
 * No store access -- all data flows through props.
 */

import {StyleSheet, Text, View} from 'react-native';

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
    <View style={styles.container} pointerEvents="box-none">
      {/* Pressure gauge */}
      <View style={styles.gaugeContainer}>
        <Text style={styles.label}>PRESSURE</Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.min(100, Math.max(0, pressure))}%`,
                backgroundColor: pressureColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.valueText, {color: pressureColor}]}>{Math.round(pressure)}%</Text>
        {isDanger && <Text style={styles.dangerText}>DANGER</Text>}
      </View>

      {/* Fill bar */}
      <View style={styles.fillContainer}>
        <Text style={styles.label}>FILL</Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.min(100, Math.max(0, fillLevel))}%`,
                backgroundColor: '#4CAF50',
              },
            ]}
          />
        </View>
        <Text style={styles.valueText}>{Math.round(fillLevel)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  gaugeContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 12,
  },
  fillContainer: {
    position: 'absolute',
    top: 160,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
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
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
  },
  dangerText: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#FF1744',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(255, 23, 68, 0.8)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
});
