/**
 * @module HiddenObjectOverlay
 * React Native overlay showing equipment part silhouettes and assembly status.
 *
 * Only visible when difficulty.assembly is true. Shows a grid of icons:
 * - Gray silhouette: part not yet found
 * - Outlined (white border): part found but not assembled
 * - Green checkmark: part assembled at station
 *
 * Reads assembledParts from the Zustand store. Grouped by station so the
 * player knows which station each part belongs to.
 */

import {StyleSheet, Text, View} from 'react-native';
import {EQUIPMENT_PARTS} from '../../engine/KitchenAssembly';
import {useGameStore} from '../../store/gameStore';

// ---------------------------------------------------------------------------
// Station groups
// ---------------------------------------------------------------------------

const STATIONS = ['grinder', 'stuffer', 'stove'] as const;
type StationType = (typeof STATIONS)[number];

const STATION_LABELS: Record<StationType, string> = {
  grinder: 'GRINDER',
  stuffer: 'STUFFER',
  stove: 'STOVE',
};

// Part icons — simple text symbols per station type
const PART_ICONS: Record<StationType, string[]> = {
  grinder: ['M', 'F', 'B'],
  stuffer: ['C', 'N', 'Y'],
  stove: ['P', 'G'],
};

// ---------------------------------------------------------------------------
// PartIcon — single part status tile
// ---------------------------------------------------------------------------

interface PartIconProps {
  label: string;
  assembled: boolean;
}

function PartIcon({label, assembled}: PartIconProps) {
  return (
    <View style={[styles.partTile, assembled && styles.partTileAssembled]}>
      {assembled ? (
        <Text style={styles.checkmark}>&#10003;</Text>
      ) : (
        <Text style={styles.partLabel}>{label}</Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// HiddenObjectOverlay — main export
// ---------------------------------------------------------------------------

/**
 * Full-screen corner HUD showing part assembly status.
 * Only renders when difficulty.assembly is enabled.
 */
export function HiddenObjectOverlay() {
  const difficulty = useGameStore(s => s.difficulty);
  const assembledParts = useGameStore(s => s.assembledParts);

  // Only show this overlay at Medium+ difficulty with assembly enabled
  if (!difficulty.assembly) {
    return null;
  }

  const assembledSet = new Set(assembledParts);

  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.heading}>FIND PARTS</Text>

      {STATIONS.map(station => {
        const parts = EQUIPMENT_PARTS.filter(p => p.station === station);
        const icons = PART_ICONS[station];
        const allAssembled = parts.every(p => assembledSet.has(p.id));

        return (
          <View key={station} style={styles.stationRow}>
            <Text style={[styles.stationLabel, allAssembled && styles.stationLabelDone]}>
              {STATION_LABELS[station]}
            </Text>
            <View style={styles.partsRow}>
              {parts.map((part, i) => (
                <PartIcon
                  key={part.id}
                  label={icons[i] ?? '?'}
                  assembled={assembledSet.has(part.id)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 6,
    padding: 10,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.4)',
  },
  heading: {
    fontFamily: 'Bangers',
    fontSize: 13,
    color: '#ff5050',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  stationRow: {
    marginBottom: 6,
  },
  stationLabel: {
    fontFamily: 'Bangers',
    fontSize: 10,
    color: '#aaaaaa',
    letterSpacing: 1,
    marginBottom: 3,
  },
  stationLabelDone: {
    color: '#44cc44',
  },
  partsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  partTile: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#555555',
    backgroundColor: 'rgba(60,60,60,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partTileAssembled: {
    borderColor: '#44cc44',
    backgroundColor: 'rgba(20,80,20,0.6)',
  },
  partLabel: {
    color: '#555555',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkmark: {
    color: '#44cc44',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
