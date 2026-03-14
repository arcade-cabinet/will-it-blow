/**
 * @module AudioEngine
 * Native audio engine using expo-audio.
 *
 * Loads OGG samples from assets and plays them on demand.
 * Maps 14 sound IDs to audio files from public/audio/.
 *
 * TODO: Wire expo-audio Sound.createAsync for each sample.
 * Currently a functional skeleton that logs plays.
 */

export type SoundId =
  | 'chop'
  | 'grind'
  | 'squelch'
  | 'sizzle'
  | 'pressure'
  | 'burst'
  | 'tie'
  | 'strike'
  | 'success'
  | 'error'
  | 'click'
  | 'phaseAdvance'
  | 'rankReveal'
  | 'ambient';

class AudioEngineImpl {
  private _initialized = false;
  private muted = false;
  private sfxVolume = 0.8;

  get initialized() {
    return this._initialized;
  }

  async initialize() {
    if (this._initialized) return;
    // TODO: await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    this._initialized = true;
  }

  async playSound(name: SoundId) {
    if (this.muted || !this._initialized) return;
    // TODO: load and play OGG via expo-audio
    console.log(`[audio] ${name}`);
  }

  playChop() {
    this.playSound('chop');
  }
  setSizzleLevel(_level: number) {
    /* TODO: loop sizzle sample */
  }
  setGrinderSpeed(_speed: number) {
    /* TODO: loop grind sample */
  }
  setAmbientDrone(_active: boolean) {
    /* TODO: ambient loop */
  }
  startAmbient() {
    this.setAmbientDrone(true);
  }
  stopAmbient() {
    this.setAmbientDrone(false);
  }
  setVolume(_type: string, level: number) {
    this.sfxVolume = Math.max(0, Math.min(1, level));
  }
  setMuted(muted: boolean) {
    this.muted = muted;
  }
  isMuted() {
    return this.muted;
  }
  dispose() {
    /* TODO: unload all sounds */
  }
}

export const audioEngine = new AudioEngineImpl();
