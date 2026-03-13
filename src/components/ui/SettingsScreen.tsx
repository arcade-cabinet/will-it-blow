/**
 * @module SettingsScreen
 * Settings panel with volume sliders and haptics toggle.
 *
 * Props-driven: receives volume levels, haptics state, and callbacks.
 * Styled to match the horror butcher-shop aesthetic.
 */

import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

interface SettingsScreenProps {
  /** SFX volume 0-100 */
  sfxVolume: number;
  /** Music volume 0-100 */
  musicVolume: number;
  /** Whether haptics are enabled */
  hapticsEnabled: boolean;
  /** Called when SFX volume changes */
  onSfxChange: (v: number) => void;
  /** Called when Music volume changes */
  onMusicChange: (v: number) => void;
  /** Called when haptics toggle is pressed */
  onHapticsToggle: () => void;
  /** Called when back button is pressed */
  onBack: () => void;
}

interface VolumeSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
}

/**
 * Simple 5-step volume control using touchable segments.
 * Mute and Unmute functionality built into the first step.
 */
function VolumeSlider({label, value, onValueChange}: VolumeSliderProps) {
  const steps = 5;
  const activeStep = Math.round((value / 100) * steps);
  const muted = value === 0;

  return (
    <View
      style={sliderStyles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} volume`}
      accessibilityValue={{min: 0, max: steps, now: activeStep}}
    >
      <TouchableOpacity
        onPress={() => onValueChange(muted ? 60 : 0)}
        activeOpacity={0.7}
        style={sliderStyles.muteButton}
        accessibilityRole="button"
        accessibilityLabel={`${muted ? 'Unmute' : 'Mute'} ${label.toLowerCase()}`}
      >
        <Text style={[sliderStyles.muteIcon, muted && sliderStyles.muteIconActive]}>
          {muted ? '\u{1F507}' : '\u{1F50A}'}
        </Text>
      </TouchableOpacity>
      <Text style={sliderStyles.label}>{label}</Text>
      <View style={sliderStyles.bars}>
        {Array.from({length: steps}, (_, i) => (
          <TouchableOpacity
            key={i}
            style={[sliderStyles.bar, i < activeStep && sliderStyles.barActive]}
            onPress={() => onValueChange(Math.round(((i + 1) / steps) * 100))}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Set ${label.toLowerCase()} volume to ${Math.round(((i + 1) / steps) * 100)}%`}
          />
        ))}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  muteButton: {
    padding: 8,
  },
  muteIcon: {
    fontSize: 22,
  },
  muteIconActive: {
    opacity: 0.5,
  },
  label: {
    fontFamily: 'Bangers',
    fontSize: 18,
    color: '#CCBBAA',
    letterSpacing: 2,
    width: 80,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  bar: {
    flex: 1,
    height: 20,
    backgroundColor: '#333',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#555',
  },
  barActive: {
    backgroundColor: '#FF1744',
    borderColor: '#FF1744',
  },
});

export function SettingsScreen({
  sfxVolume,
  musicVolume,
  hapticsEnabled,
  onSfxChange,
  onMusicChange,
  onHapticsToggle,
  onBack,
}: SettingsScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.panel} accessibilityLabel="Settings panel">
        <Text style={styles.title} accessibilityRole="header">
          SETTINGS
        </Text>
        <View style={styles.divider} />

        <VolumeSlider label="MUSIC" value={musicVolume} onValueChange={onMusicChange} />

        <VolumeSlider label="SFX" value={sfxVolume} onValueChange={onSfxChange} />

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.toggleRow}
          onPress={onHapticsToggle}
          activeOpacity={0.7}
          accessibilityRole="switch"
          accessibilityLabel="HAPTICS"
          accessibilityState={{checked: hapticsEnabled}}
        >
          <Text style={styles.toggleLabel}>HAPTICS</Text>
          <Text style={[styles.toggleValue, hapticsEnabled && styles.toggleActive]}>
            {hapticsEnabled ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back to main menu"
        >
          <Text style={styles.backText}>{'\u25C0'} BACK</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    maxWidth: 340,
  },
  title: {
    fontFamily: 'Bangers',
    fontSize: 36,
    color: '#FF1744',
    textAlign: 'center',
    letterSpacing: 4,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  toggleLabel: {
    fontFamily: 'Bangers',
    fontSize: 18,
    color: '#CCBBAA',
    letterSpacing: 2,
  },
  toggleValue: {
    fontFamily: 'Bangers',
    fontSize: 18,
    color: '#555',
    letterSpacing: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 3,
  },
  toggleActive: {
    color: '#FF1744',
    borderColor: '#FF1744',
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
