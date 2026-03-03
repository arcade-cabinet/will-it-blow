/**
 * @module DifficultySelector
 * "Choose Your Doneness" screen — 5-tier difficulty picker.
 *
 * Displays a 3x2 grid (3 top row + 2 bottom row) of doneness buttons with
 * a visual "PERMADEATH LINE" separator between the safe tiers (Rare, Medium Rare,
 * Medium) and the brutal ones (Medium Well, Well Done).
 *
 * Each button shows the tier name, tinted by its color. Follows the butcher-shop
 * dark theme and Bangers font from SettingsScreen.
 */

import {Pressable, StyleSheet, Text, View} from 'react-native';
import {DIFFICULTY_TIERS} from '../../engine/DifficultyConfig';

interface DifficultySelectorProps {
  /** Called when the player selects a difficulty tier. */
  onSelect: (tierId: string) => void;
  /** Called when the player presses BACK. */
  onBack: () => void;
}

/** Top row: tiers without permadeath. Bottom row: permadeath tiers. */
const safeTiers = DIFFICULTY_TIERS.filter(t => !t.permadeath);
const brutalTiers = DIFFICULTY_TIERS.filter(t => t.permadeath);

export function DifficultySelector({onSelect, onBack}: DifficultySelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>CHOOSE YOUR DONENESS</Text>
        <View style={styles.divider} />

        {/* Safe tiers row */}
        <View style={styles.tierRow}>
          {safeTiers.map(tier => (
            <TierButton key={tier.id} tier={tier} onPress={() => onSelect(tier.id)} />
          ))}
        </View>

        {/* Permadeath line separator */}
        <View style={styles.permadeathLine}>
          <View style={styles.permadeathDash} />
          <Text style={styles.permadeathLabel}>PERMADEATH</Text>
          <View style={styles.permadeathDash} />
        </View>

        {/* Brutal tiers row */}
        <View style={styles.tierRow}>
          {brutalTiers.map(tier => (
            <TierButton key={tier.id} tier={tier} onPress={() => onSelect(tier.id)} />
          ))}
        </View>

        <View style={styles.divider} />

        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>{'\u25C0'} BACK</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Individual difficulty tier button with color-tinted circle and name. */
function TierButton({
  tier,
  onPress,
}: {
  tier: (typeof DIFFICULTY_TIERS)[number];
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tierButton} onPress={onPress}>
      {({pressed}) => (
        <>
          <View
            style={[
              styles.tierCircle,
              {backgroundColor: tier.color},
              pressed && styles.tierCirclePressed,
            ]}
          />
          <Text style={[styles.tierName, {color: tier.color}]}>{tier.name}</Text>
          <Text style={styles.tierHint}>
            {tier.maxStrikes} strike{tier.maxStrikes !== 1 ? 's' : ''}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  panel: {
    backgroundColor: '#1a0a00',
    borderWidth: 4,
    borderColor: '#8B4513',
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontFamily: 'Bangers',
    fontSize: 28,
    color: '#FF1744',
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: 'rgba(255, 23, 68, 0.4)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
  },
  divider: {
    height: 2,
    backgroundColor: '#D2A24C',
    marginVertical: 16,
    opacity: 0.5,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 8,
  },
  tierButton: {
    alignItems: 'center',
    width: 100,
    paddingVertical: 12,
  },
  tierCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#555',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  tierCirclePressed: {
    opacity: 0.7,
    borderColor: '#FF1744',
  },
  tierName: {
    fontFamily: 'Bangers',
    fontSize: 14,
    letterSpacing: 1,
    textAlign: 'center',
  },
  tierHint: {
    fontFamily: 'Bangers',
    fontSize: 11,
    color: '#666',
    letterSpacing: 1,
    marginTop: 2,
  },
  permadeathLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  permadeathDash: {
    flex: 1,
    height: 1,
    backgroundColor: '#FF1744',
    opacity: 0.6,
  },
  permadeathLabel: {
    fontFamily: 'Bangers',
    fontSize: 12,
    color: '#FF1744',
    letterSpacing: 3,
    opacity: 0.8,
  },
  backButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  backText: {
    fontFamily: 'Bangers',
    fontSize: 22,
    color: '#CCBBAA',
    letterSpacing: 2,
  },
});
