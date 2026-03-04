// Native AudioEngine — uses expo-audio for basic audio on iOS/Android.
// Metro resolves AudioEngine.web.ts on web (Tone.js), this file on native.

import {type AudioPlayer, createAudioPlayer, setAudioModeAsync} from 'expo-audio';
import {config} from '../config';
import {useGameStore} from '../store/gameStore';
import {getAssetUrl} from './assetUrl';

/** Simple beep generator via expo-audio. Falls back to no-op if audio context unavailable. */
async function playBeep(frequencyHz: number, durationMs: number, volume = 0.5): Promise<void> {
  try {
    // Generate a WAV buffer with a sine wave
    const sampleRate = 22050;
    const numSamples = Math.floor((sampleRate * durationMs) / 1000);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Generate sine wave samples
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Apply fade envelope to avoid clicks
      const env = i < 100 ? i / 100 : i > numSamples - 100 ? (numSamples - i) / 100 : 1;
      const sample = Math.sin(2 * Math.PI * frequencyHz * t) * volume * env;
      view.setInt16(44 + i * 2, Math.floor(sample * 32767), true);
    }

    // Convert to base64 data URI
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const uri = `data:audio/wav;base64,${base64}`;

    const player = createAudioPlayer(uri);
    player.volume = volume;
    player.play();
    // Auto-release after playback finishes
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // Player may already be released
      }
    }, durationMs + 500);
  } catch {
    // Silently fail — audio is non-critical
  }
}

class AudioEngine {
  private isInitialized = false;
  /** Currently playing ambient music track. */
  private ambientTrack: AudioPlayer | null = null;
  /** Currently playing challenge music track. */
  private challengePlayer: AudioPlayer | null = null;

  async initTone() {
    if (this.isInitialized) return;
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
      });
      this.isInitialized = true;
    } catch {
      // Audio unavailable
    }
  }

  startGrinder() {
    if (!this.isInitialized) return;
    playBeep(120, 500, 0.3);
  }

  stopGrinder() {
    // No persistent sounds to stop in the simplified native engine
  }

  playStuffingSquelch() {
    if (!this.isInitialized) return;
    playBeep(80, 200, 0.4);
  }

  playCountdownBeep(final = false) {
    if (!this.isInitialized) return;
    playBeep(final ? 1047 : 523, 100, 0.5);
  }

  startBlowWhoosh() {
    if (!this.isInitialized) return;
    playBeep(200, 1000, 0.3);
  }

  stopBlowWhoosh() {}

  playSlam() {
    if (!this.isInitialized) return;
    playBeep(65, 300, 0.6);
  }

  playSizzle() {
    if (!this.isInitialized) return;
    playBeep(3000, 200, 0.15);
  }

  playCorrectPick() {
    if (!this.isInitialized) return;
    playBeep(659, 100, 0.4); // E5
  }

  playWrongPick() {
    if (!this.isInitialized) return;
    playBeep(65, 200, 0.3); // C2
  }

  updatePressure(_intensity: number) {
    // Continuous pressure sound not supported in simplified native engine
  }

  stopPressure() {}

  playBurst() {
    if (!this.isInitialized) return;
    playBeep(100, 400, 0.5);
  }

  playTitleJingle() {
    if (!this.isInitialized) return;
    // Play a simple ascending arpeggio
    const notes = [330, 392, 440, 392, 330, 262, 330, 392];
    notes.forEach((freq, i) => {
      setTimeout(() => playBeep(freq, 150, 0.4), i * 200);
    });
  }

  playRatingSong(rating: number) {
    if (!this.isInitialized) return;
    const melody =
      rating >= 4 ? [262, 330, 392, 523] : rating > 1 ? [262, 294, 330, 262] : [262, 196, 165, 131];
    melody.forEach((freq, i) => {
      setTimeout(() => playBeep(freq, 200, 0.4), i * 250);
    });
  }

  /** Start the ambient horror loop using expo-audio for native music playback. */
  startAmbientDrone() {
    if (!this.isInitialized) return;
    this.stopAmbientDrone();
    try {
      const url = getAssetUrl('audio', 'ambient-horror.ogg');
      const player = createAudioPlayer(url);
      const {musicVolume, musicMuted} = useGameStore.getState();
      player.volume = musicMuted ? 0 : musicVolume;
      player.loop = true;
      player.play();
      this.ambientTrack = player;
    } catch {
      // Fallback to beep if file loading fails
      playBeep(55, 5000, 0.15);
    }
  }

  stopAmbientDrone() {
    if (this.ambientTrack) {
      try {
        this.ambientTrack.remove();
      } catch {
        // Player may already be released
      }
      this.ambientTrack = null;
    }
  }

  /** Start a music track for the current challenge with crossfade from ambient.
   *  Also supports special keys: 'victory', 'enemy', 'defeat'. */
  startChallengeTrack(challengeType: string): void {
    if (!this.isInitialized) return;
    const trackDef =
      config.audio.challengeTracks[challengeType] ??
      (challengeType === 'victory' ? config.audio.victoryTrack : undefined) ??
      (challengeType === 'enemy' ? config.audio.enemyTrack : undefined) ??
      (challengeType === 'defeat' ? config.audio.defeatTrack : undefined);
    if (!trackDef) return;

    this.stopChallengeTrack();

    // Hard-cut ambient out (instant mute, not a crossfade)
    if (this.ambientTrack) {
      this.ambientTrack.volume = 0;
    }

    try {
      const url = getAssetUrl('audio', trackDef.file);
      const player = createAudioPlayer(url);
      const {musicVolume, musicMuted} = useGameStore.getState();
      player.volume = musicMuted ? 0 : musicVolume;
      player.loop = true;
      player.play();
      this.challengePlayer = player;
    } catch {
      // Challenge music is non-critical
    }
  }

  /** Stop challenge track and restore ambient volume. */
  stopChallengeTrack(): void {
    if (this.challengePlayer) {
      try {
        this.challengePlayer.remove();
      } catch {
        // Player may already be released
      }
      this.challengePlayer = null;
    }
    // Restore ambient volume
    if (this.ambientTrack) {
      const {musicVolume, musicMuted} = useGameStore.getState();
      this.ambientTrack.volume = musicMuted ? 0 : musicVolume;
    }
  }

  playSample(_category: string, _volume?: number) {}
  startSampleLoop(_category: string, _volume?: number) {}
  stopSampleLoop() {}
  playGrab() {}
  playDrop() {}
  playPour() {}
  playMix() {}
  playChop() {}
  startCookingSizzle() {}
  stopCookingSizzle() {}
  playSizzleHit() {}
  playBoiling() {}
  playCabinetBurst() {}
  playCreatureVocal() {}
  playWeaponImpact() {}
  playEnemyDeath() {}

  // Spatial audio stubs — native does not support 3D positional audio
  setListenerPosition(_x: number, _y: number, _z: number) {}
  setListenerOrientation(
    _fx: number,
    _fy: number,
    _fz: number,
    _ux: number,
    _uy: number,
    _uz: number,
  ) {}
  playSpatial(
    _soundId: string,
    _position: [number, number, number],
    _options?: {
      file?: string;
      volume?: number;
      loop?: boolean;
      refDistance?: number;
      maxDistance?: number;
      rolloffFactor?: number;
    },
  ) {}
  stopSpatial(_soundId: string) {}
  startSpatialAmbient() {}
  stopSpatialAmbient() {}

  stopEngine() {
    this.stopAmbientDrone();
    this.stopChallengeTrack();
  }
}

export const audioEngine = new AudioEngine();
