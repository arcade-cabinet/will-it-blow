/**
 * @module GrindingHUD
 * Pure presentational HUD overlay for the grinding station.
 * Props-driven: receives speed and progress, renders read-only display.
 * No store access -- all data flows through props.
 */

import {StyleSheet, Text, View} from 'react-native';

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
    <View style={styles.container} pointerEvents="box-none">
      {/* Speed zone indicator */}
      <View style={styles.speedContainer}>
        <Text style={styles.label}>SPEED</Text>
        <Text style={[styles.zoneText, {color: zoneColor}]}>{zone}</Text>
        <View style={styles.speedBarTrack}>
          <View
            style={[
              styles.speedBarFill,
              {width: `${Math.min(100, Math.max(0, speed))}%`, backgroundColor: zoneColor},
            ]}
          />
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.label}>PROGRESS</Text>
        <View style={styles.progressBarTrack}>
          <View
            style={[styles.progressBarFill, {width: `${Math.min(100, Math.max(0, progress))}%`}]}
          />
        </View>
        <Text style={styles.percentText}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    padding: 16,
  },
  speedContainer: {
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
  zoneText: {
    fontSize: 22,
    fontWeight: '900',
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
    borderWidth: 2,
    borderColor: '#333',
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
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#E0E0E0',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
  },
});
