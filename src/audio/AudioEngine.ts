/**
 * @module AudioEngine
 * Native audio engine using expo-audio.
 * Uses createAudioPlayer() for one-shot and looping playback.
 */

import {createAudioPlayer, setIsAudioActiveAsync} from 'expo-audio';
import type {AudioPlayer} from 'expo-audio';

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

const SOUND_MAP: Partial<Record<SoundId, number>> = {
  chop: require('../../public/audio/chop_1.ogg'),
  grind: require('../../public/audio/mix_dry_1.ogg'),
  squelch: require('../../public/audio/mix_wet_1.ogg'),
  sizzle: require('../../public/audio/sizzle_1.ogg'),
  pressure: require('../../public/audio/boiling_1.ogg'),
  burst: require('../../public/audio/pots_and_pans_1.ogg'),
  tie: require('../../public/audio/peel_1.ogg'),
  strike: require('../../public/audio/pots_and_pans_2.ogg'),
  success: require('../../public/audio/pour_1.ogg'),
  error: require('../../public/audio/pots_and_pans_3.ogg'),
  click: require('../../public/audio/peel_2.ogg'),
  phaseAdvance: require('../../public/audio/pour_2.ogg'),
  rankReveal: require('../../public/audio/verdict-unsettling.ogg'),
  ambient: require('../../public/audio/ambient-horror.ogg'),
};

class AudioEngineImpl {
  private _initialized = false;
  private muted = false;
  private sfxVolume = 0.8;
  private activePlayers: Map<string, AudioPlayer> = new Map();

  get initialized() {
    return this._initialized;
  }

  async initialize() {
    if (this._initialized) return;
    try {
      await setIsAudioActiveAsync(true);
      this._initialized = true;
    } catch (err) {
      console.warn('[AudioEngine] init failed:', err);
    }
  }

  playSound(name: SoundId) {
    if (this.muted || !this._initialized) return;
    const source = SOUND_MAP[name];
    if (!source) return;

    try {
      const player = createAudioPlayer(source);
      player.volume = this.sfxVolume;
      player.play();
    } catch (err) {
      console.warn(`[AudioEngine] playSound(${name}) failed:`, err);
    }
  }

  playChop() {
    this.playSound('chop');
  }

  setSizzleLevel(level: number) {
    if (this.muted || !this._initialized) return;
    if (level > 0 && !this.activePlayers.has('sizzle')) {
      const source = SOUND_MAP.sizzle;
      if (!source) return;
      try {
        const player = createAudioPlayer(source);
        player.volume = this.sfxVolume * level;
        player.loop = true;
        player.play();
        this.activePlayers.set('sizzle', player);
      } catch {}
    } else if (level === 0 && this.activePlayers.has('sizzle')) {
      const player = this.activePlayers.get('sizzle');
      player?.pause();
      player?.remove();
      this.activePlayers.delete('sizzle');
    }
  }

  setGrinderSpeed(_speed: number) {
    // Future: looping grinder sample
  }

  setAmbientDrone(active: boolean) {
    if (active && !this.activePlayers.has('ambient')) {
      const source = SOUND_MAP.ambient;
      if (!source) return;
      try {
        const player = createAudioPlayer(source);
        player.volume = this.sfxVolume * 0.3;
        player.loop = true;
        player.play();
        this.activePlayers.set('ambient', player);
      } catch {}
    } else if (!active && this.activePlayers.has('ambient')) {
      const player = this.activePlayers.get('ambient');
      player?.pause();
      player?.remove();
      this.activePlayers.delete('ambient');
    }
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
    if (muted) this.stopAmbient();
  }
  isMuted() {
    return this.muted;
  }
  dispose() {
    for (const [, player] of this.activePlayers) {
      player.pause();
      player.remove();
    }
    this.activePlayers.clear();
  }
}

export const audioEngine = new AudioEngineImpl();
