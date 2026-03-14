/**
 * @module SettingsScreen
 * Settings panel with volume sliders and haptics toggle.
 *
 * Props-driven: receives volume levels, haptics state, and callbacks.
 * Styled to match the horror butcher-shop aesthetic.
 * Rewritten from react-native to web HTML/CSS.
 */

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

function VolumeSlider({label, value, onValueChange}: VolumeSliderProps) {
  const steps = 5;
  const activeStep = Math.round((value / 100) * steps);
  const muted = value === 0;

  return (
    <fieldset style={sliderStyles.row} aria-label={`${label} volume: ${activeStep} of ${steps}`}>
      <button
        type="button"
        onClick={() => onValueChange(muted ? 60 : 0)}
        style={sliderStyles.muteButton}
        aria-label={`${muted ? 'Unmute' : 'Mute'} ${label.toLowerCase()}`}
      >
        <span style={{...sliderStyles.muteIcon, ...(muted ? sliderStyles.muteIconActive : {})}}>
          {muted ? '\u{1F507}' : '\u{1F50A}'}
        </span>
      </button>
      <span style={sliderStyles.label}>{label}</span>
      <div style={sliderStyles.bars}>
        {Array.from({length: steps}, (_, i) => (
          <button
            type="button"
            key={i}
            style={{...sliderStyles.bar, ...(i < activeStep ? sliderStyles.barActive : {})}}
            onClick={() => onValueChange(Math.round(((i + 1) / steps) * 100))}
            aria-label={`Set ${label.toLowerCase()} volume to ${Math.round(((i + 1) / steps) * 100)}%`}
          />
        ))}
      </div>
    </fieldset>
  );
}

const sliderStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    margin: '12px 0',
    border: 'none',
    padding: 0,
  },
  muteButton: {
    padding: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
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
    display: 'flex',
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  bar: {
    flex: 1,
    height: 20,
    backgroundColor: '#333',
    borderRadius: 3,
    border: '1px solid #555',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
  },
  barActive: {
    backgroundColor: '#FF1744',
    borderColor: '#FF1744',
  },
};

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
    <div style={styles.container}>
      <section style={styles.panel} aria-label="Settings panel">
        <h2 style={styles.title}>SETTINGS</h2>
        <div style={styles.divider} />

        <VolumeSlider label="MUSIC" value={musicVolume} onValueChange={onMusicChange} />
        <VolumeSlider label="SFX" value={sfxVolume} onValueChange={onSfxChange} />

        <div style={styles.divider} />

        <button
          type="button"
          style={styles.toggleRow}
          onClick={onHapticsToggle}
          role="switch"
          aria-label="HAPTICS"
          aria-checked={hapticsEnabled}
        >
          <span style={styles.toggleLabel}>HAPTICS</span>
          <span style={{...styles.toggleValue, ...(hapticsEnabled ? styles.toggleActive : {})}}>
            {hapticsEnabled ? 'ON' : 'OFF'}
          </span>
        </button>

        <div style={styles.divider} />

        <button
          type="button"
          style={styles.backButton}
          onClick={onBack}
          aria-label="Back to main menu"
        >
          <span style={styles.backText}>{'\u25C0'} BACK</span>
        </button>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 24px',
    width: '100vw',
    height: '100vh',
  },
  panel: {
    backgroundColor: '#1a0a00',
    border: '4px solid #8B4513',
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
    textShadow: '0 0 12px rgba(255, 23, 68, 0.4)',
  },
  divider: {
    height: 2,
    backgroundColor: '#D2A24C',
    margin: '16px 0',
    opacity: 0.5,
  },
  toggleRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '12px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    padding: 0,
    outline: 'none',
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
    padding: '4px 12px',
    border: '1px solid #555',
    borderRadius: 3,
  },
  toggleActive: {
    color: '#FF1744',
    borderColor: '#FF1744',
  },
  backButton: {
    alignSelf: 'center',
    padding: '10px 24px',
    display: 'block',
    margin: '0 auto',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
  },
  backText: {
    fontFamily: 'Bangers',
    fontSize: 22,
    color: '#CCBBAA',
    letterSpacing: 2,
  },
};
