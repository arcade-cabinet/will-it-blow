import * as Tone from 'tone';
import {getAssetUrl} from './assetUrl';

class AudioEngine {
  private initialized = false;

  // Synthesizers
  private grindSynth: Tone.FMSynth | null = null;

  // Samplers / Players for gorgeous SFX
  private chopPlayer: Tone.Player | null = null;
  private sizzlePlayer: Tone.Player | null = null;
  private ambientPlayer: Tone.Player | null = null;

  async initialize() {
    if (this.initialized) return;

    try {
      await Tone.start();

      // Use high-quality sampled audio for chop
      this.chopPlayer = new Tone.Player({
        url: getAssetUrl('audio/sfx', 'chop-1.ogg'),
        volume: -5,
        autostart: false,
        onload: () => {},
        onerror: error => console.warn('Failed to load chop audio:', error),
      }).toDestination();

      // Use real sizzle loop
      this.sizzlePlayer = new Tone.Player({
        url: getAssetUrl('audio/sfx', 'sizzle-loop.ogg'),
        volume: -20,
        loop: true,
        autostart: false,
        onload: () => {},
        onerror: error => console.warn('Failed to load sizzle audio:', error),
      }).toDestination();

      // Use real ambient horror track
      this.ambientPlayer = new Tone.Player({
        url: getAssetUrl('audio/music', 'track_boss_horror.ogg'),
        volume: -25,
        loop: true,
        autostart: false,
        onload: () => {},
        onerror: error => console.warn('Failed to load ambient audio:', error),
      }).toDestination();

      // Keep the procedural Grinder noise because it reacts dynamically to speed
      this.grindSynth = new Tone.FMSynth({
        harmonicity: 1.5,
        modulationIndex: 10,
        oscillator: {type: 'sawtooth'},
        envelope: {attack: 0.1, decay: 0.2, sustain: 1.0, release: 0.5},
        modulation: {type: 'square'},
        modulationEnvelope: {attack: 0.1, decay: 0.2, sustain: 1.0, release: 0.5},
      }).toDestination();
      this.grindSynth.volume.value = -15;

      this.initialized = true;
    } catch (error) {
      console.warn('Audio engine initialization failed:', error);
    }
  }

  playChop() {
    if (!this.initialized || !this.chopPlayer || !this.chopPlayer.loaded) return;
    this.chopPlayer.start();
  }

  setSizzleLevel(level: number) {
    // 0.0 to 1.0
    if (!this.initialized || !this.sizzlePlayer || !this.sizzlePlayer.loaded) return;

    if (level > 0 && this.sizzlePlayer.state !== 'started') {
      this.sizzlePlayer.start();
    } else if (level === 0 && this.sizzlePlayer.state === 'started') {
      this.sizzlePlayer.stop();
    }

    // Scale volume based on cooking level
    this.sizzlePlayer.volume.rampTo(-25 + level * 15, 0.1);
  }

  setGrinderSpeed(speed: number) {
    // 0.0 to 1.0
    if (!this.initialized || !this.grindSynth) return;

    if (speed > 0) {
      // Re-trigger if it stopped
      this.grindSynth.triggerAttack('C1');
      this.grindSynth.set({harmonicity: 1.0 + speed * 2.0});
    } else {
      this.grindSynth.triggerRelease();
    }
  }

  setAmbientDrone(active: boolean) {
    if (!this.initialized || !this.ambientPlayer || !this.ambientPlayer.loaded) return;
    if (active && this.ambientPlayer.state !== 'started') {
      this.ambientPlayer.start();
    } else if (!active && this.ambientPlayer.state === 'started') {
      this.ambientPlayer.stop();
    }
  }
}

export const audioEngine = new AudioEngine();
