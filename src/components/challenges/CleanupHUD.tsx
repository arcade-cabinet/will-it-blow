/**
 * @module CleanupHUD
 * Thin read-only React Native overlay shown during the cleanup phase.
 *
 * Displays:
 * - "PLACE ITEMS IN SINK" instruction header
 * - Per-item progress bars with checkmarks for completed washes
 * - Only renders when the active difficulty requires cleanup (difficulty.cleanup === true)
 *
 * This is a pure read-only subscriber — no input handling.
 * The orchestrator and store write stationCleanliness; this HUD only reads.
 */

import {StyleSheet, Text, View} from 'react-native';
import {getCleanupProgress, getRequiredCleanup} from '../../engine/CleanupManager';
import {useGameStore} from '../../store/gameStore';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 24,
    right: 16,
    backgroundColor: 'rgba(10,10,20,0.82)',
    borderRadius: 8,
    padding: 14,
    minWidth: 220,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: '#334',
  },
  header: {
    color: '#66aaff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemLabel: {
    color: '#ccd8ee',
    fontSize: 12,
    width: 110,
    textTransform: 'capitalize',
  },
  trackOuter: {
    flex: 1,
    height: 8,
    backgroundColor: '#1a2030',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 6,
  },
  trackInner: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#3399ff',
  },
  checkmark: {
    color: '#44dd88',
    fontWeight: 'bold',
    fontSize: 14,
    width: 18,
    textAlign: 'center',
  },
  placeholder: {
    width: 18,
  },
  footer: {
    color: '#8899aa',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
  },
});

// ---------------------------------------------------------------------------
// Item label helpers
// ---------------------------------------------------------------------------

function formatItemLabel(id: string): string {
  return id.replace(/-/g, ' ');
}

// ---------------------------------------------------------------------------
// CleanupHUD
// ---------------------------------------------------------------------------

/**
 * Renders the cleanup checklist overlay.
 * Returns null when cleanup is not required by the current difficulty.
 */
export function CleanupHUD() {
  const difficulty = useGameStore(s => s.difficulty);
  const stationCleanliness = useGameStore(s => s.stationCleanliness);

  // Only show when cleanup is required
  if (!difficulty.cleanup) return null;

  const required = getRequiredCleanup(difficulty);
  if (required.length === 0) return null;

  const overallProgress = getCleanupProgress(required, stationCleanliness);
  const allClean = overallProgress >= 1.0;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>PLACE ITEMS IN SINK</Text>

      {required.map(itemId => {
        const level = stationCleanliness[itemId] ?? 0;
        const clean = level >= 1.0;

        return (
          <View key={itemId} style={styles.itemRow}>
            <Text style={styles.itemLabel}>{formatItemLabel(itemId)}</Text>

            <View style={styles.trackOuter}>
              <View style={[styles.trackInner, {width: `${Math.round(level * 100)}%`}]} />
            </View>

            {clean ? <Text style={styles.checkmark}>✓</Text> : <View style={styles.placeholder} />}
          </View>
        );
      })}

      {allClean ? (
        <Text style={[styles.footer, {color: '#44dd88'}]}>KITCHEN CLEAN — READY TO CONTINUE</Text>
      ) : (
        <Text style={styles.footer}>Wash each item for 3 seconds under running water</Text>
      )}
    </View>
  );
}
