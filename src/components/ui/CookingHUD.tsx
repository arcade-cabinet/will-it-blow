/**
 * @module CookingHUD
 * Pure presentational HUD overlay for the cooking station.
 * Props-driven: receives temperature, target zone, and time in zone.
 * No store access -- all data flows through props.
 */

import {StyleSheet, Text, View} from 'react-native';

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
    <View style={styles.container} pointerEvents="box-none">
      {/* Temperature readout */}
      <View style={styles.tempContainer}>
        <Text style={[styles.tempValue, {color: getTempColor()}]}>
          {Math.round(temperature)}
          {'\u00B0'}F
        </Text>
        <Text style={styles.targetText}>
          TARGET: {minTarget}
          {'\u00B0'} - {maxTarget}
          {'\u00B0'}F
        </Text>
        {inZone && (
          <View style={styles.inZoneBadge}>
            <Text style={styles.inZoneText}>IN ZONE</Text>
          </View>
        )}
      </View>

      {/* Zone time indicator */}
      <View style={styles.timeContainer}>
        <Text style={styles.label}>TIME IN ZONE</Text>
        <Text style={styles.timeValue}>{timeInZone.toFixed(1)}s</Text>
      </View>

      {/* Temperature bar */}
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          {/* Target zone indicator */}
          <View
            style={[
              styles.targetZoneIndicator,
              {
                left: `${Math.min(100, Math.max(0, (minTarget / 400) * 100))}%`,
                width: `${Math.min(100, ((maxTarget - minTarget) / 400) * 100)}%`,
              },
            ]}
          />
          {/* Temperature needle */}
          <View
            style={[
              styles.tempNeedle,
              {
                left: `${Math.min(100, Math.max(0, (temperature / 400) * 100))}%`,
                backgroundColor: getTempColor(),
              },
            ]}
          />
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
  tempContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tempValue: {
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'Bangers',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 12,
  },
  targetText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#999',
    letterSpacing: 2,
    marginTop: 4,
  },
  inZoneBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  inZoneText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#4CAF50',
    letterSpacing: 4,
  },
  timeContainer: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Bangers',
    color: '#888',
    letterSpacing: 3,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '900',
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
    borderWidth: 2,
    borderColor: '#333',
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
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#4CAF50',
  },
  tempNeedle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
  },
});
