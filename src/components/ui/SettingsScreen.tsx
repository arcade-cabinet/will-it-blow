import {useCallback} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useGameStore} from '../../store/gameStore';

interface VolumeSliderProps {
  label: string;
  value: number;
  muted: boolean;
  onValueChange: (value: number) => void;
  onMuteToggle: () => void;
}

/** Simple 5-step volume control using touchable segments */
function VolumeSlider({label, value, muted, onValueChange, onMuteToggle}: VolumeSliderProps) {
  const steps = 5;
  const activeStep = muted ? 0 : Math.round(value * steps);

  return (
    <View style={sliderStyles.row}>
      <TouchableOpacity onPress={onMuteToggle} activeOpacity={0.7} style={sliderStyles.muteButton}>
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
            onPress={() => {
              if (muted) onMuteToggle();
              onValueChange((i + 1) / steps);
            }}
            activeOpacity={0.7}
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

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({onBack}: SettingsScreenProps) {
  const {musicVolume, sfxVolume, musicMuted, sfxMuted} = useGameStore();
  const {setMusicVolume, setSfxVolume, setMusicMuted, setSfxMuted} = useGameStore();

  const toggleMusicMute = useCallback(
    () => setMusicMuted(!musicMuted),
    [musicMuted, setMusicMuted],
  );
  const toggleSfxMute = useCallback(() => setSfxMuted(!sfxMuted), [sfxMuted, setSfxMuted]);

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={styles.divider} />

        <VolumeSlider
          label="MUSIC"
          value={musicVolume}
          muted={musicMuted}
          onValueChange={setMusicVolume}
          onMuteToggle={toggleMusicMute}
        />

        <VolumeSlider
          label="SFX"
          value={sfxVolume}
          muted={sfxMuted}
          onValueChange={setSfxVolume}
          onMuteToggle={toggleSfxMute}
        />

        <View style={styles.divider} />

        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backText}>{'\u25C0'} BACK</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>v0.1.0</Text>
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
  versionText: {
    fontFamily: 'Bangers',
    fontSize: 12,
    color: '#333',
    marginTop: 24,
    letterSpacing: 2,
  },
});
