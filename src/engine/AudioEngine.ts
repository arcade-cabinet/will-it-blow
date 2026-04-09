/**
 * @module AudioEngine
 * Hybrid audio engine for Will It Blow? — OGG samples as PRIMARY sources,
 * Tone.js synthesis as FALLBACK when samples fail to load.
 *
 * The hand-picked sfx_*.ogg files in public/audio/ are the authoritative
 * audio for gameplay. Tone.js procedural synths exist as a safety net so
 * gameplay is never silent even on devices that can't decode OGG.
 *
 * Usage:
 *   await audioEngine.initialize();
 *   audioEngine.play('chop');
 *   audioEngine.startDrone();
 *   audioEngine.setMuffled(true);
 *
 * E.1 — Phase stingers: playPhaseStinger(phase) fires a procedural
 * Tone.js one-shot with character per phase (metallic clang for GRINDING,
 * wet squelch for STUFFING, sizzle burst for COOKING, etc.).
 *
 * E.2 — Mr. Sausage reaction audio: playReactionAudio(reaction) fires
 * a Tone.js synthesis cue keyed to the reaction type.
 *
 * E.3 — Per-ingredient SFX: playIngredientSFX(archetype, action)
 * routes through archetype-specific Tone.js synths so each decomposition
 * type has a distinct sound character.
 *
 * E.4 — Station SFX: station-specific OGG playback for boiling, chopping,
 * wet mixing, pouring, sizzle loops, and pan clangs. These are PRIMARY;
 * the existing Tone.js players in SOUND_MAP are FALLBACK.
 */

import * as Tone from 'tone';
import type {Reaction} from '../characters/reactions';
import type {GamePhase} from '../ecs/hooks';

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

/**
 * Station-specific SFX IDs for hand-picked OGG samples.
 * These are PRIMARY — played instead of generic SOUND_MAP entries.
 */
export type StationSfxId =
  | 'sfx_boiling'
  | 'sfx_chop_1'
  | 'sfx_chop_2'
  | 'sfx_mix_wet'
  | 'sfx_pan_clang'
  | 'sfx_pour'
  | 'sfx_sizzle_loop';

/** Ingredient composition archetype for SFX routing. */
export type IngredientArchetype = 'meat' | 'plant' | 'plastic' | 'metal' | 'liquid' | 'other';

/** Action types that produce ingredient-specific SFX. */
export type IngredientAction = 'chop' | 'grind' | 'pour' | 'hit' | 'sizzle' | 'stuff';

/**
 * Mr. Sausage reaction types that produce audio cues.
 * Re-exported from the canonical {@link Reaction} type for convenience.
 */
export type ReactionType = Reaction;

/** Vite base path — '/' locally, '/will-it-blow/' on GitHub Pages. */
const BASE = import.meta.env.BASE_URL;

/** Prefix a root-relative path with the Vite base URL. */
function withBase(path: string): string {
  return `${BASE}${path.startsWith('/') ? path.slice(1) : path}`;
}

/** Maps each SoundId to its OGG file path under /audio/ (FALLBACK sources) */
const SOUND_MAP: Record<SoundId, string> = {
  chop: withBase('/audio/chop_1.ogg'),
  grind: withBase('/audio/mix_dry_1.ogg'),
  squelch: withBase('/audio/mix_wet_1.ogg'),
  sizzle: withBase('/audio/sizzle_1.ogg'),
  pressure: withBase('/audio/boiling_1.ogg'),
  burst: withBase('/audio/pots_and_pans_1.ogg'),
  tie: withBase('/audio/peel_1.ogg'),
  strike: withBase('/audio/pots_and_pans_2.ogg'),
  success: withBase('/audio/pour_1.ogg'),
  error: withBase('/audio/pots_and_pans_3.ogg'),
  click: withBase('/audio/peel_2.ogg'),
  phaseAdvance: withBase('/audio/pour_2.ogg'),
  rankReveal: withBase('/audio/verdict-unsettling.ogg'),
  ambient: withBase('/audio/ambient-horror.ogg'),
};

/**
 * Maps station SFX IDs to their hand-picked OGG file paths.
 * These are the PRIMARY audio sources for gameplay interactions.
 */
const STATION_SFX_MAP: Record<StationSfxId, string> = {
  sfx_boiling: withBase('/audio/sfx_boiling.ogg'),
  sfx_chop_1: withBase('/audio/sfx_chop_1.ogg'),
  sfx_chop_2: withBase('/audio/sfx_chop_2.ogg'),
  sfx_mix_wet: withBase('/audio/sfx_mix_wet.ogg'),
  sfx_pan_clang: withBase('/audio/sfx_pan_clang.ogg'),
  sfx_pour: withBase('/audio/sfx_pour.ogg'),
  sfx_sizzle_loop: withBase('/audio/sfx_sizzle_loop.ogg'),
};

class AudioEngineImpl {
  private _initialized = false;
  private muted = false;

  // Effects chain: filter -> reverb -> destination
  private filter: Tone.Filter | null = null;
  private reverb: Tone.Reverb | null = null;

  // Sample players (fallback)
  private players: Map<SoundId, Tone.Player> = new Map();

  // Station SFX players (PRIMARY)
  private stationPlayers: Map<StationSfxId, Tone.Player> = new Map();

  // Alternating chop index for sfx_chop_1 / sfx_chop_2
  private chopAlternator = 0;

  // Procedural horror drone
  private fmSynth: Tone.FMSynth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private droneActive = false;

  // E.1: Phase stinger synths
  private stingerSynth: Tone.MetalSynth | null = null;
  private stingerMembrane: Tone.MembraneSynth | null = null;
  private stingerNoise: Tone.NoiseSynth | null = null;

  // E.2: Reaction audio synths
  private reactionFM: Tone.FMSynth | null = null;

  // E.3: Per-archetype ingredient synths
  private ingredientMembrane: Tone.MembraneSynth | null = null;
  private ingredientMetal: Tone.MetalSynth | null = null;
  private ingredientNoise: Tone.NoiseSynth | null = null;

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

    // Build effects chain: filter -> reverb -> destination
    this.filter = new Tone.Filter({frequency: 8000, type: 'lowpass'});
    this.reverb = new Tone.Reverb({decay: 3, wet: 0.3});
    this.filter.connect(this.reverb);
    this.reverb.connect(Tone.getDestination());

    // Create fallback sample players for all generic sounds
    for (const [id, url] of Object.entries(SOUND_MAP)) {
      const player = new Tone.Player({url}).connect(this.filter);
      this.players.set(id as SoundId, player);
    }

    // Create PRIMARY station SFX players from hand-picked OGGs
    for (const [id, url] of Object.entries(STATION_SFX_MAP)) {
      const player = new Tone.Player({url}).connect(this.filter);
      this.stationPlayers.set(id as StationSfxId, player);
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

    // E.1: Phase stinger synths — metallic + membrane for horror
    this.stingerSynth = new Tone.MetalSynth({
      volume: -12,
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      envelope: {attack: 0.001, decay: 0.4, sustain: 0, release: 0.2},
    }).connect(this.filter);

    this.stingerMembrane = new Tone.MembraneSynth({
      volume: -10,
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: {type: 'sine'},
      envelope: {attack: 0.001, decay: 0.3, sustain: 0, release: 0.1},
    }).connect(this.filter);

    this.stingerNoise = new Tone.NoiseSynth({
      noise: {type: 'white'},
      volume: -18,
      envelope: {attack: 0.001, decay: 0.15, sustain: 0, release: 0.05},
    }).connect(this.filter);

    // E.2: Reaction audio FM synth — expressive vocal-like sounds
    this.reactionFM = new Tone.FMSynth({
      volume: -15,
      harmonicity: 3.01,
      modulationIndex: 14,
      oscillator: {type: 'triangle'},
      envelope: {attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3},
      modulation: {type: 'square'},
      modulationEnvelope: {attack: 0.002, decay: 0.2, sustain: 0, release: 0.2},
    }).connect(this.filter);

    // E.3: Per-archetype ingredient synths
    this.ingredientMembrane = new Tone.MembraneSynth({
      volume: -14,
      pitchDecay: 0.08,
      octaves: 4,
      oscillator: {type: 'sine'},
      envelope: {attack: 0.001, decay: 0.2, sustain: 0, release: 0.1},
    }).connect(this.filter);

    this.ingredientMetal = new Tone.MetalSynth({
      volume: -16,
      harmonicity: 12,
      modulationIndex: 20,
      resonance: 3000,
      octaves: 1,
      envelope: {attack: 0.001, decay: 0.15, sustain: 0, release: 0.1},
    }).connect(this.filter);

    this.ingredientNoise = new Tone.NoiseSynth({
      noise: {type: 'pink'},
      volume: -20,
      envelope: {attack: 0.005, decay: 0.1, sustain: 0, release: 0.05},
    }).connect(this.filter);

    this._initialized = true;
  }

  // --- Station SFX (PRIMARY) --------------------------------------------------

  /**
   * Try to play a station SFX OGG. Returns true if played, false if
   * the sample wasn't loaded (caller should fall back to Tone.js).
   */
  private tryPlayStationSfx(id: StationSfxId, loop = false): boolean {
    const player = this.stationPlayers.get(id);
    if (!player?.loaded) return false;
    player.loop = loop;
    player.start();
    return true;
  }

  /** Stop a station SFX loop. */
  private stopStationSfx(id: StationSfxId): void {
    const player = this.stationPlayers.get(id);
    if (player) player.stop();
  }

  // --- Public Station SFX API ------------------------------------------------

  /**
   * Play a chop sound. PRIMARY: alternates between sfx_chop_1 and sfx_chop_2.
   * FALLBACK: generic chop_1.ogg via Tone.Player.
   */
  playChop(): void {
    if (!this._initialized || this.muted) return;
    const sfxId: StationSfxId = this.chopAlternator % 2 === 0 ? 'sfx_chop_1' : 'sfx_chop_2';
    this.chopAlternator++;
    if (!this.tryPlayStationSfx(sfxId)) {
      this.play('chop');
    }
  }

  /**
   * Play boiling sound. PRIMARY: sfx_boiling.ogg one-shot.
   * FALLBACK: boiling_1.ogg via generic player.
   */
  playBoiling(): void {
    if (!this._initialized || this.muted) return;
    if (!this.tryPlayStationSfx('sfx_boiling')) {
      this.play('pressure');
    }
  }

  /**
   * Start sizzle loop. PRIMARY: sfx_sizzle_loop.ogg looped.
   * FALLBACK: sizzle_1.ogg loop via generic player.
   */
  startSizzleLoop(): void {
    if (!this._initialized || this.muted) return;
    if (!this.tryPlayStationSfx('sfx_sizzle_loop', true)) {
      this.loop('sizzle');
    }
  }

  /** Stop sizzle loop (both primary and fallback). */
  stopSizzleLoop(): void {
    this.stopStationSfx('sfx_sizzle_loop');
    this.stop('sizzle');
  }

  /**
   * Play wet mixing sound. PRIMARY: sfx_mix_wet.ogg.
   * FALLBACK: mix_wet_1.ogg via generic player.
   */
  playMixWet(): void {
    if (!this._initialized || this.muted) return;
    if (!this.tryPlayStationSfx('sfx_mix_wet')) {
      this.play('squelch');
    }
  }

  /**
   * Start wet mixing loop. PRIMARY: sfx_mix_wet.ogg looped.
   * FALLBACK: squelch loop via generic player.
   */
  startMixWetLoop(): void {
    if (!this._initialized || this.muted) return;
    if (!this.tryPlayStationSfx('sfx_mix_wet', true)) {
      this.loop('squelch');
    }
  }

  /** Stop wet mixing loop. */
  stopMixWetLoop(): void {
    this.stopStationSfx('sfx_mix_wet');
    this.stop('squelch');
  }

  /**
   * Play pan clang. PRIMARY: sfx_pan_clang.ogg.
   * FALLBACK: pots_and_pans_1.ogg via generic player.
   */
  playPanClang(): void {
    if (!this._initialized || this.muted) return;
    if (!this.tryPlayStationSfx('sfx_pan_clang')) {
      this.play('burst');
    }
  }

  /**
   * Play pour sound. PRIMARY: sfx_pour.ogg.
   * FALLBACK: pour_1.ogg via generic player.
   */
  playPour(): void {
    if (!this._initialized || this.muted) return;
    if (!this.tryPlayStationSfx('sfx_pour')) {
      this.play('success');
    }
  }

  // --- Generic sample playback (FALLBACK layer) ---

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

  /** Stop all looping samples (both generic and station). */
  stopAll(): void {
    if (!this._initialized) return;
    for (const player of this.players.values()) {
      player.stop();
    }
    for (const player of this.stationPlayers.values()) {
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

  /**
   * E.1 — Play a procedural one-shot stinger for a phase transition.
   * Each phase gets a distinct sonic character via Tone.js synthesis:
   *
   * - SELECT_INGREDIENTS: sharp metallic ping (fridge opening)
   * - CHOPPING: heavy thud + metallic ring (cleaver hitting block)
   * - GRINDING: low rumble + metallic grind
   * - STUFFING: wet squelch burst (membrane + noise)
   * - TIE_CASING: tight snap (short metallic)
   * - BLOWOUT: explosive burst (noise + membrane boom)
   * - COOKING: sizzle burst (noise + high FM)
   * - DONE: ominous low chord (verdict)
   */
  playPhaseStinger(phase: GamePhase): void {
    if (!this._initialized || this.muted) return;

    const now = Tone.now();

    switch (phase) {
      case 'SELECT_INGREDIENTS':
        // Sharp metallic ping — fridge door vibe
        this.stingerSynth?.triggerAttackRelease('C6', '16n', now);
        break;

      case 'CHOPPING':
        // Heavy thud + ring — cleaver on wood
        this.stingerMembrane?.triggerAttackRelease('G1', '8n', now);
        this.stingerSynth?.triggerAttackRelease('C4', '32n', now + 0.02);
        break;

      case 'FILL_GRINDER':
        // Clunk — metal on metal
        this.stingerSynth?.triggerAttackRelease('E3', '16n', now);
        break;

      case 'GRINDING':
        // Low rumble + metallic grind
        this.stingerMembrane?.triggerAttackRelease('C1', '4n', now);
        this.stingerSynth?.triggerAttackRelease('A2', '8n', now + 0.05);
        break;

      case 'STUFFING':
        // Wet squelch burst
        this.stingerMembrane?.triggerAttackRelease('E2', '8n', now);
        this.stingerNoise?.triggerAttackRelease('8n', now);
        break;

      case 'TIE_CASING':
        // Tight snap
        this.stingerSynth?.triggerAttackRelease('G5', '32n', now);
        break;

      case 'BLOWOUT':
        // Explosive burst — noise + membrane boom
        this.stingerMembrane?.triggerAttackRelease('C1', '4n', now);
        this.stingerNoise?.triggerAttackRelease('4n', now);
        this.stingerSynth?.triggerAttackRelease('C3', '8n', now + 0.1);
        break;

      case 'COOKING':
        // Sizzle burst — high frequency noise
        this.stingerNoise?.triggerAttackRelease('8n', now);
        this.reactionFM?.triggerAttackRelease('A5', '16n', now + 0.02);
        break;

      case 'DONE':
        // Ominous low chord — verdict
        this.stingerMembrane?.triggerAttackRelease('E1', '2n', now);
        this.reactionFM?.triggerAttackRelease('B2', '2n', now + 0.1);
        break;

      default:
        // Fallback: generic phase advance sound
        this.play('phaseAdvance');
        break;
    }
  }

  /**
   * E.2 — Play a reaction audio cue when Mr. Sausage reacts.
   * Each reaction type gets a distinct vocal-like synth character:
   *
   * - nod: low approving hum (F2, short)
   * - disgust: dissonant gag (descending FM, noisy)
   * - excitement: manic ascending trill (C4->C5 rapid)
   * - laugh: staccato descending bursts
   * - flinch: sharp startled yelp (high, short)
   * - judging: slow ominous low drone burst
   */
  playReactionAudio(reaction: Reaction): void {
    if (!this._initialized || this.muted) return;
    if (!this.reactionFM) return;

    const now = Tone.now();

    switch (reaction) {
      case 'nod':
        // Low approving hum
        this.reactionFM.triggerAttackRelease('F2', '8n', now);
        break;

      case 'disgust':
        // Dissonant gag — descending with noise
        this.reactionFM.triggerAttackRelease('E4', '16n', now);
        this.reactionFM.triggerAttackRelease('C3', '16n', now + 0.08);
        this.stingerNoise?.triggerAttackRelease('16n', now + 0.04);
        break;

      case 'excitement':
        // Manic ascending trill
        this.reactionFM.triggerAttackRelease('C4', '32n', now);
        this.reactionFM.triggerAttackRelease('E4', '32n', now + 0.06);
        this.reactionFM.triggerAttackRelease('G4', '32n', now + 0.12);
        this.reactionFM.triggerAttackRelease('C5', '16n', now + 0.18);
        break;

      case 'laugh':
        // Staccato descending bursts
        this.reactionFM.triggerAttackRelease('A4', '32n', now);
        this.reactionFM.triggerAttackRelease('F4', '32n', now + 0.08);
        this.reactionFM.triggerAttackRelease('D4', '32n', now + 0.16);
        this.reactionFM.triggerAttackRelease('A3', '32n', now + 0.24);
        break;

      case 'flinch':
        // Sharp startled yelp
        this.reactionFM.triggerAttackRelease('C6', '32n', now);
        break;

      case 'judging':
        // Slow ominous low drone burst
        this.reactionFM.triggerAttackRelease('D2', '4n', now);
        this.stingerMembrane?.triggerAttackRelease('A1', '4n', now + 0.05);
        break;

      default:
        // No audio for idle, talk, eating, nervous — too common
        break;
    }
  }

  /**
   * E.3 — Play an ingredient-specific SFX based on composition archetype.
   * Each archetype has a distinct sonic character synthesized via Tone.js:
   *
   * - meat/chunks: heavy thud (membrane low, short decay)
   * - plant/paste: wet splat (noise + membrane mid)
   * - plastic/powder: airy poof (filtered noise)
   * - metal/shards: glass/metal clink (MetalSynth high harmonics)
   * - liquid: pour/splash (noise sweep)
   * - other: generic impact
   */
  playIngredientSFX(archetype: IngredientArchetype, action: IngredientAction): void {
    if (!this._initialized || this.muted) return;

    const now = Tone.now();

    // Also play the generic sample as a base layer for familiar feedback
    const actionMap: Record<IngredientAction, SoundId> = {
      chop: 'chop',
      grind: 'grind',
      pour: 'squelch',
      hit: 'strike',
      sizzle: 'sizzle',
      stuff: 'squelch',
    };
    this.play(actionMap[action] ?? 'chop');

    // Layer archetype-specific synthesis on top
    switch (archetype) {
      case 'meat':
        // Heavy thud — deep membrane hit
        this.ingredientMembrane?.triggerAttackRelease('C2', '8n', now);
        break;

      case 'plant':
        // Wet splat — membrane + pink noise
        this.ingredientMembrane?.triggerAttackRelease('E3', '16n', now);
        this.ingredientNoise?.triggerAttackRelease('16n', now);
        break;

      case 'plastic':
        // Airy poof — filtered white noise, quick
        this.ingredientNoise?.triggerAttackRelease('16n', now);
        break;

      case 'metal':
        // Glass/metal clink — high harmonics MetalSynth
        this.ingredientMetal?.triggerAttackRelease('C6', '16n', now);
        break;

      case 'liquid':
        // Pour/splash — noise sweep + membrane
        this.ingredientNoise?.triggerAttackRelease('8n', now);
        this.ingredientMembrane?.triggerAttackRelease('A2', '16n', now + 0.03);
        break;

      case 'other':
      default:
        // Generic impact
        this.ingredientMembrane?.triggerAttackRelease('G2', '16n', now);
        break;
    }
  }

  /** Clean up all Tone.js nodes. */
  dispose(): void {
    this.stopDrone();
    this.stopAll();

    for (const player of this.players.values()) {
      player.dispose();
    }
    this.players.clear();

    for (const player of this.stationPlayers.values()) {
      player.dispose();
    }
    this.stationPlayers.clear();

    this.fmSynth?.dispose();
    this.fmSynth = null;
    this.noiseSynth?.dispose();
    this.noiseSynth = null;

    this.stingerSynth?.dispose();
    this.stingerSynth = null;
    this.stingerMembrane?.dispose();
    this.stingerMembrane = null;
    this.stingerNoise?.dispose();
    this.stingerNoise = null;

    this.reactionFM?.dispose();
    this.reactionFM = null;

    this.ingredientMembrane?.dispose();
    this.ingredientMembrane = null;
    this.ingredientMetal?.dispose();
    this.ingredientMetal = null;
    this.ingredientNoise?.dispose();
    this.ingredientNoise = null;

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

  /**
   * Set sizzle level. Starts or stops the PRIMARY sizzle loop.
   * Level > 0 starts sfx_sizzle_loop.ogg; 0 stops it.
   */
  setSizzleLevel(level: number): void {
    if (level > 0) {
      this.startSizzleLoop();
    } else {
      this.stopSizzleLoop();
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
