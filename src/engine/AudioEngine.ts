/**
 * @module AudioEngine
 * Tone.js-based audio engine for Will It Blow?
 * Sample playback, procedural horror drone, reverb/filter effects chain.
 *
 * Usage:
 *   await audioEngine.initialize();
 *   audioEngine.play('chop');
 *   audioEngine.startDrone();
 *   audioEngine.setMuffled(true);
 */

import * as Tone from 'tone';

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

/** Maps each SoundId to its OGG file path under /audio/ */
const SOUND_MAP: Record<SoundId, string> = {
  chop: '/audio/chop_1.ogg',
  grind: '/audio/mix_dry_1.ogg',
  squelch: '/audio/mix_wet_1.ogg',
  sizzle: '/audio/sizzle_1.ogg',
  pressure: '/audio/boiling_1.ogg',
  burst: '/audio/pots_and_pans_1.ogg',
  tie: '/audio/peel_1.ogg',
  strike: '/audio/pots_and_pans_2.ogg',
  success: '/audio/pour_1.ogg',
  error: '/audio/pots_and_pans_3.ogg',
  click: '/audio/peel_2.ogg',
  phaseAdvance: '/audio/pour_2.ogg',
  rankReveal: '/audio/verdict-unsettling.ogg',
  ambient: '/audio/ambient-horror.ogg',
};

class AudioEngineImpl {
  private _initialized = false;
  private muted = false;

  // Effects chain: filter → reverb → destination
  private filter: Tone.Filter | null = null;
  private reverb: Tone.Reverb | null = null;

  // Sample players
  private players: Map<SoundId, Tone.Player> = new Map();

  // Procedural horror drone
  private fmSynth: Tone.FMSynth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private droneActive = false;

  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Initialize the audio engine: start Tone.js context, build effects chain,
   * create sample players and procedural synths.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    await Tone.start();

    // Build effects chain: filter → reverb → destination
    this.filter = new Tone.Filter({frequency: 8000, type: 'lowpass'});
    this.reverb = new Tone.Reverb({decay: 3, wet: 0.3});
    this.filter.connect(this.reverb);
    this.reverb.connect(Tone.getDestination());

    // Create sample players for all sounds
    for (const [id, url] of Object.entries(SOUND_MAP)) {
      const player = new Tone.Player({url}).connect(this.filter);
      this.players.set(id as SoundId, player);
    }

    // Procedural horror drone synths
    this.fmSynth = new Tone.FMSynth({
      harmonicity: 0.5,
      modulationIndex: 8,
      volume: -20,
    }).connect(this.filter);

    this.noiseSynth = new Tone.NoiseSynth({
      noise: {type: 'brown'},
      volume: -25,
    }).connect(this.filter);

    this._initialized = true;
  }

  /** Play a sample once (one-shot). */
  play(sound: string): void {
    if (!this._initialized || this.muted) return;
    const player = this.players.get(sound as SoundId);
    if (!player?.loaded) return;
    player.loop = false;
    player.start();
  }

  /** Play a sample in a loop. */
  loop(sound: string): void {
    if (!this._initialized || this.muted) return;
    const player = this.players.get(sound as SoundId);
    if (!player?.loaded) return;
    player.loop = true;
    player.start();
  }

  /** Stop a looping sample. */
  stop(sound: string): void {
    if (!this._initialized) return;
    const player = this.players.get(sound as SoundId);
    if (!player) return;
    player.stop();
  }

  /** Stop all looping samples. */
  stopAll(): void {
    if (!this._initialized) return;
    for (const player of this.players.values()) {
      player.stop();
    }
  }

  /** Start procedural horror ambience (FM drone + brown noise). */
  startDrone(): void {
    if (!this._initialized || this.droneActive || this.muted) return;
    this.fmSynth?.triggerAttack('C1');
    this.noiseSynth?.triggerAttack();
    this.droneActive = true;
  }

  /** Stop procedural horror drone. */
  stopDrone(): void {
    if (!this._initialized || !this.droneActive) return;
    this.fmSynth?.triggerRelease();
    this.noiseSynth?.triggerRelease();
    this.droneActive = false;
  }

  /**
   * Muffle/unmuffle audio by ramping the lowpass filter.
   * Muffled: 400 Hz cutoff (sounds underwater/behind a wall).
   * Clear: 8000 Hz cutoff (normal).
   */
  setMuffled(muffled: boolean): void {
    if (!this.filter) return;
    this.filter.frequency.rampTo(muffled ? 400 : 8000, 0.5);
  }

  /** Clean up all Tone.js nodes. */
  dispose(): void {
    this.stopDrone();
    this.stopAll();

    for (const player of this.players.values()) {
      player.dispose();
    }
    this.players.clear();

    this.fmSynth?.dispose();
    this.fmSynth = null;
    this.noiseSynth?.dispose();
    this.noiseSynth = null;
    this.reverb?.dispose();
    this.reverb = null;
    this.filter?.dispose();
    this.filter = null;

    this._initialized = false;
  }

  // --- Backward-compatible API (used by existing station components) ---

  /** Unified playSound interface (legacy — delegates to play()). */
  playSound(name: SoundId | string): void {
    this.play(name);
  }

  playChop(): void {
    this.play('chop');
  }

  setSizzleLevel(level: number): void {
    if (level > 0) {
      this.loop('sizzle');
    } else {
      this.stop('sizzle');
    }
  }

  setGrinderSpeed(speed: number): void {
    if (speed > 0) {
      this.loop('grind');
    } else {
      this.stop('grind');
    }
  }

  setAmbientDrone(active: boolean): void {
    if (active) {
      this.loop('ambient');
      this.startDrone();
    } else {
      this.stop('ambient');
      this.stopDrone();
    }
  }

  startAmbient(): void {
    this.setAmbientDrone(true);
  }

  stopAmbient(): void {
    this.setAmbientDrone(false);
  }

  setVolume(_type: string, _level: number): void {
    // Volume control via Tone.Destination.volume could be added here
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopAll();
      this.stopDrone();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }
}

export const audioEngine = new AudioEngineImpl();
