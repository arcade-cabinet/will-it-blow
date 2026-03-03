import {useCallback, useEffect, useState} from 'react';
import {Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {version} from '../../../package.json';
import {useKeyboardNav} from '../../hooks/useKeyboardNav';
import {useOrientation} from '../../hooks/useOrientation';
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
    <View
      style={sliderStyles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} volume`}
      accessibilityValue={{min: 0, max: steps, now: activeStep}}
    >
      <TouchableOpacity
        onPress={onMuteToggle}
        activeOpacity={0.7}
        style={sliderStyles.muteButton}
        accessibilityRole="button"
        accessibilityLabel={`${muted ? 'Unmute' : 'Mute'} ${label.toLowerCase()}`}
        accessibilityState={{checked: !muted}}
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
            onPress={() => {
              if (muted) onMuteToggle();
              onValueChange((i + 1) / steps);
            }}
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

interface SettingsScreenProps {
  onBack: () => void;
}

/** Detect WebXR VR availability at runtime (web only). */
function useXrSupported(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    const xr = (navigator as {xr?: {isSessionSupported?: (m: string) => Promise<boolean>}}).xr;
    if (xr?.isSessionSupported) {
      xr.isSessionSupported('immersive-vr')
        .then(setSupported)
        .catch(() => setSupported(false));
    }
  }, []);
  return supported;
}

/** Detect WebXR AR availability at runtime (web only). */
function useArSupported(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    const xr = (navigator as {xr?: {isSessionSupported?: (m: string) => Promise<boolean>}}).xr;
    if (xr?.isSessionSupported) {
      xr.isSessionSupported('immersive-ar')
        .then(setSupported)
        .catch(() => setSupported(false));
    }
  }, []);
  return supported;
}

/**
 * Settings panel with music/SFX volume controls, mute toggles, and VR preference.
 *
 * Reads `musicVolume`, `sfxVolume`, `musicMuted`, `sfxMuted`, and `xrEnabled`
 * from the Zustand store. Each audio channel gets a `VolumeSlider` (5-step
 * discrete bar + mute icon toggle). The VR toggle only appears when the
 * browser supports WebXR immersive-vr sessions.
 *
 * Styled to match the butcher-shop aesthetic (dark panel, saddlebrown
 * border, Bangers font, gold dividers).
 *
 * @param props.onBack - Called when the BACK button is pressed to return to the title screen
 */
export function SettingsScreen({onBack}: SettingsScreenProps) {
  const {
    musicVolume,
    sfxVolume,
    musicMuted,
    sfxMuted,
    xrEnabled,
    arEnabled,
    spatialAudioEnabled,
    snapTurnAngle,
    comfortVignette,
    xrSeatedMode,
    vrLocomotionMode,
  } = useGameStore();
  const {
    setMusicVolume,
    setSfxVolume,
    setMusicMuted,
    setSfxMuted,
    setXrEnabled,
    setArEnabled,
    setSpatialAudioEnabled,
    setSnapTurnAngle,
    setComfortVignette,
    setXrSeatedMode,
    setVrLocomotionMode,
  } = useGameStore();
  const xrSupported = useXrSupported();
  const arSupported = useArSupported();
  const {width, isLandscape} = useOrientation();

  // Escape returns to title screen
  useKeyboardNav({onEscape: onBack});

  const isTablet = Math.min(width) >= 768;
  const panelMaxWidth = isTablet ? 480 : 340;

  const toggleMusicMute = useCallback(
    () => setMusicMuted(!musicMuted),
    [musicMuted, setMusicMuted],
  );
  const toggleSfxMute = useCallback(() => setSfxMuted(!sfxMuted), [sfxMuted, setSfxMuted]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        bounces={false}
      >
        <View style={[styles.panel, {maxWidth: panelMaxWidth}]} accessibilityLabel="Settings panel">
          <Text style={styles.title} accessibilityRole="header">
            SETTINGS
          </Text>
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

          <TouchableOpacity
            style={styles.xrRow}
            onPress={() => setSpatialAudioEnabled(!spatialAudioEnabled)}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityLabel="3D Audio"
            accessibilityState={{checked: spatialAudioEnabled}}
            accessibilityHint="Enables positional audio for immersive sound"
          >
            <Text style={styles.xrLabel}>3D AUDIO</Text>
            <Text style={[styles.xrToggle, spatialAudioEnabled && styles.xrToggleActive]}>
              {spatialAudioEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.xrHint} accessibilityRole="text">
            Positional audio — sounds move with the environment
          </Text>

          {xrSupported && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.xrRow}
                onPress={() => setXrEnabled(!xrEnabled)}
                activeOpacity={0.7}
                accessibilityRole="switch"
                accessibilityLabel="VR Mode"
                accessibilityState={{checked: xrEnabled}}
                accessibilityHint="Enters VR automatically when the game starts"
              >
                <Text style={styles.xrLabel}>VR MODE</Text>
                <Text style={[styles.xrToggle, xrEnabled && styles.xrToggleActive]}>
                  {xrEnabled ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.xrHint} accessibilityRole="text">
                Enters VR automatically when the game starts
              </Text>

              {/* VR Comfort Settings — only shown when VR is supported */}
              <Text style={[styles.xrLabel, {marginTop: 16, marginBottom: 8}]}>VR COMFORT</Text>

              {/* Snap Turn */}
              <View style={styles.xrRow}>
                <Text style={styles.xrLabel}>SNAP TURN</Text>
                <View style={{flexDirection: 'row', gap: 6}}>
                  {([0, 30, 45, 90] as const).map(angle => (
                    <TouchableOpacity
                      key={angle}
                      style={[styles.xrToggle, snapTurnAngle === angle && styles.xrToggleActive]}
                      onPress={() => setSnapTurnAngle(angle)}
                      activeOpacity={0.7}
                      accessibilityRole="radio"
                      accessibilityLabel={
                        angle === 0 ? 'Smooth turning' : `${angle} degree snap turn`
                      }
                      accessibilityState={{selected: snapTurnAngle === angle}}
                    >
                      <Text
                        style={[
                          styles.xrToggleText,
                          snapTurnAngle === angle && styles.xrToggleTextActive,
                        ]}
                      >
                        {angle === 0 ? 'SMOOTH' : `${angle}\u00B0`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={styles.xrHint} accessibilityRole="text">
                Snap turning reduces motion sickness
              </Text>

              {/* Comfort Vignette */}
              <TouchableOpacity
                style={styles.xrRow}
                onPress={() => setComfortVignette(!comfortVignette)}
                activeOpacity={0.7}
                accessibilityRole="switch"
                accessibilityLabel="Comfort Vignette"
                accessibilityState={{checked: comfortVignette}}
                accessibilityHint="Darkens edges during movement to reduce motion sickness"
              >
                <Text style={styles.xrLabel}>VIGNETTE</Text>
                <Text style={[styles.xrToggle, comfortVignette && styles.xrToggleActive]}>
                  {comfortVignette ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.xrHint} accessibilityRole="text">
                Darkens periphery during movement
              </Text>

              {/* Seated Mode */}
              <TouchableOpacity
                style={styles.xrRow}
                onPress={() => setXrSeatedMode(!xrSeatedMode)}
                activeOpacity={0.7}
                accessibilityRole="switch"
                accessibilityLabel="Seated Mode"
                accessibilityState={{checked: xrSeatedMode}}
                accessibilityHint="Raises camera height for seated VR play"
              >
                <Text style={styles.xrLabel}>SEATED</Text>
                <Text style={[styles.xrToggle, xrSeatedMode && styles.xrToggleActive]}>
                  {xrSeatedMode ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.xrHint} accessibilityRole="text">
                Adjusts height for sitting down
              </Text>

              {/* Locomotion Mode */}
              <View style={styles.xrRow}>
                <Text style={styles.xrLabel}>MOVEMENT</Text>
                <View style={{flexDirection: 'row', gap: 6}}>
                  {(['smooth', 'teleport'] as const).map(mode => (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.xrToggle, vrLocomotionMode === mode && styles.xrToggleActive]}
                      onPress={() => setVrLocomotionMode(mode)}
                      activeOpacity={0.7}
                      accessibilityRole="radio"
                      accessibilityLabel={`${mode === 'smooth' ? 'Smooth' : 'Teleport'} movement`}
                      accessibilityState={{selected: vrLocomotionMode === mode}}
                    >
                      <Text
                        style={[
                          styles.xrToggleText,
                          vrLocomotionMode === mode && styles.xrToggleTextActive,
                        ]}
                      >
                        {mode.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={styles.xrHint} accessibilityRole="text">
                Teleport is more comfortable for VR beginners
              </Text>
            </>
          )}

          {arSupported && (
            <>
              {!xrSupported && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.xrRow}
                onPress={() => setArEnabled(!arEnabled)}
                activeOpacity={0.7}
                accessibilityRole="switch"
                accessibilityLabel="AR Mode"
                accessibilityState={{checked: arEnabled}}
                accessibilityHint="Enters AR with camera passthrough when the game starts"
              >
                <Text style={styles.xrLabel}>AR MODE</Text>
                <Text style={[styles.xrToggle, arEnabled && styles.xrToggleActive]}>
                  {arEnabled ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.xrHint} accessibilityRole="text">
                Camera passthrough — kitchen floats in the real world
              </Text>
            </>
          )}

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

        <Text style={styles.versionText}>v{version}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
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
  xrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  xrLabel: {
    fontFamily: 'Bangers',
    fontSize: 18,
    color: '#CCBBAA',
    letterSpacing: 2,
  },
  xrToggle: {
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
  xrToggleActive: {
    color: '#FF1744',
    borderColor: '#FF1744',
  },
  xrToggleText: {
    fontFamily: 'Bangers',
    fontSize: 14,
    color: '#555',
    letterSpacing: 1,
  },
  xrToggleTextActive: {
    color: '#FF1744',
  },
  xrHint: {
    fontFamily: 'Bangers',
    fontSize: 11,
    color: '#666',
    letterSpacing: 1,
    marginTop: -4,
    marginBottom: 4,
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
