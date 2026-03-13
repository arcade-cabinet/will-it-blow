/**
 * @module BlowoutHUD
 * Pure presentational HUD overlay for the blowout station.
 * Props-driven: receives pressure and tie status, renders read-only display.
 * No store access -- all data flows through props.
 */

import {StyleSheet, Text, View} from 'react-native';

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
    <View style={styles.container} pointerEvents="box-none">
      {/* Pressure gauge */}
      <View style={styles.pressureContainer}>
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
        <Text style={[styles.pressureValue, {color: pressureColor}]}>{Math.round(pressure)}%</Text>
      </View>

      {/* Tie status */}
      <View style={styles.tieContainer}>
        <View style={styles.tieRow}>
          <View style={styles.tieItem}>
            <Text style={styles.tieLabel}>LEFT</Text>
            <Text style={[styles.tieStatus, leftTied ? styles.tied : styles.open]}>
              {leftTied ? 'TIED' : 'OPEN'}
            </Text>
          </View>
          <View style={styles.tieItem}>
            <Text style={styles.tieLabel}>RIGHT</Text>
            <Text style={[styles.tieStatus, rightTied ? styles.tied : styles.open]}>
              {rightTied ? 'TIED' : 'OPEN'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  pressureContainer: {
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
  pressureValue: {
    fontSize: 20,
    fontWeight: '900',
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
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 12,
    padding: 12,
  },
  tieRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tieItem: {
    alignItems: 'center',
  },
  tieLabel: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 3,
    marginBottom: 4,
  },
  tieStatus: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 2,
  },
  tied: {
    color: '#4CAF50',
  },
  open: {
    color: '#FF1744',
  },
});
