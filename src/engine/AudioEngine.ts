// Native AudioEngine — uses expo-av for basic audio on iOS/Android.
// Metro resolves AudioEngine.web.ts on web (Tone.js), this file on native.

import {Audio} from 'expo-av';

/** Simple beep generator via expo-av. Falls back to no-op if audio context unavailable. */
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
      const env =
        i < 100 ? i / 100 : i > numSamples - 100 ? (numSamples - i) / 100 : 1;
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

    const {sound} = await Audio.Sound.createAsync({uri}, {shouldPlay: true});
    // Auto-unload after playback
    sound.setOnPlaybackStatusUpdate(status => {
      if ('didJustFinish' in status && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch {
    // Silently fail — audio is non-critical
  }
}

class AudioEngine {
  private isInitialized = false;

  async initTone() {
    if (this.isInitialized) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
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
      rating >= 4
        ? [262, 330, 392, 523]
        : rating > 1
          ? [262, 294, 330, 262]
          : [262, 196, 165, 131];
    melody.forEach((freq, i) => {
      setTimeout(() => playBeep(freq, 200, 0.4), i * 250);
    });
  }

  startAmbientDrone() {
    // Native ambient drone: play a low sustained tone
    if (!this.isInitialized) return;
    playBeep(55, 5000, 0.15);
  }

  stopAmbientDrone() {
    // No persistent sounds to stop in simplified native engine
  }

  stopEngine() {
    // Nothing persistent to clean up
  }
}

export const audioEngine = new AudioEngine();
