/**
 * @module AudioEngine
 * Tone.js-based audio engine for Will It Blow?
 * Sample playback, procedural horror drone, reverb/filter effects chain,
 * phase stingers, Mr. Sausage reaction audio, and per-archetype
 * ingredient SFX — all via Tone.js synthesis when audio files don't exist.
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
 */

import * as Tone from 'tone';
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

/** Ingredient composition archetype for SFX routing. */
export type IngredientArchetype = 'meat' | 'plant' | 'plastic' | 'metal' | 'liquid' | 'other';

/** Action types that produce ingredient-specific SFX. */
export type IngredientAction = 'chop' | 'grind' | 'pour' | 'hit' | 'sizzle' | 'stuff';

/** Mr. Sausage reaction types that produce audio cues. */
export type ReactionType = 'nod' | 'disgust' | 'excitement' | 'laugh' | 'flinch' | 'judging';

/** Vite base path — '/' locally, '/will-it-blow/' on GitHub Pages. */
const BASE = import.meta.env.BASE_URL;

/** Prefix a root-relative path with the Vite base URL. */
function withBase(path: string): string {
  return `${BASE}${path.startsWith('/') ? path.slice(1) : path}`;
}

/** Maps each SoundId to its OGG file path under /audio/ */
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

class AudioEngineImpl {
  private _initialized = false;
  private muted = false;

  // Effects chain: filter -> reverb -> destination
  private filter: Tone.Filter | null = null;
  private reverb: Tone.Reverb | null = null;

  // Sample players
  private players: Map<SoundId, Tone.Player> = new Map();

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
  playReactionAudio(reaction: string): void {
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
