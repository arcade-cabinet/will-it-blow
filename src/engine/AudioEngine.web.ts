import * as Tone from 'tone';
import {config} from '../config';
import {useGameStore} from '../store/gameStore';
import {getAssetUrl} from './assetUrl';

/** Sample categories mapped to their OGG file variants. */
const SAMPLE_VARIANTS: Record<string, string[]> = {
  boiling: ['boiling_1.ogg', 'boiling_2.ogg', 'boiling_3.ogg', 'boiling_4.ogg'],
  chop: ['chop_1.ogg', 'chop_2.ogg', 'chop_3.ogg', 'chop_9.ogg'],
  mix_dry: ['mix_dry_1.ogg', 'mix_dry_2.ogg'],
  mix_wet: ['mix_wet_1.ogg', 'mix_wet_2.ogg'],
  peel: ['peel_1.ogg', 'peel_2.ogg'],
  pots_and_pans: [
    'pots_and_pans_1.ogg',
    'pots_and_pans_2.ogg',
    'pots_and_pans_3.ogg',
    'pots_and_pans_5.ogg',
  ],
  pour: ['pour_1.ogg', 'pour_2.ogg', 'pour_3.ogg', 'pour_6.ogg'],
  sizzle_hit: ['sizzle_1.ogg', 'sizzle_2.ogg', 'sizzle_3.ogg', 'sizzle_8.ogg'],
  sizzle_loop: ['sizzle_loop_1.ogg', 'sizzle_loop_2.ogg'],
};

/** Spatial sound instance: player + panner, managed by the engine. */
interface SpatialSource {
  player: Tone.Player;
  panner: Tone.Panner3D;
}

class AudioEngine {
  private synths: Tone.PolySynth[] = [];
  private currentSong: Tone.Part | null = null;
  private sfxSynths: Record<string, any> = {};
  private isInitialized = false;

  /** Loaded Tone.Player instances keyed by filename. */
  private samples: Map<string, Tone.Player> = new Map();
  /** Currently playing looped sample. */
  private loopingSample: Tone.Player | null = null;

  /** Active spatial (3D-positioned) sound sources keyed by sound ID. */
  private spatialSources: Map<string, SpatialSource> = new Map();

  async initTone() {
    if (this.isInitialized) return;
    await Tone.start();
    Tone.getTransport().start();

    // Pre-load all OGG samples
    this.loadSamples();

    // Grinder (Brown noise with rapid tremolo)
    this.sfxSynths.grinder = new Tone.NoiseSynth({
      noise: {type: 'brown'},
      envelope: {attack: 0.1, decay: 0, sustain: 1, release: 0.2},
      volume: -10,
    }).toDestination();
    this.sfxSynths.grinderLfo = new Tone.LFO(15, -20, -10).start();
    this.sfxSynths.grinderLfo.connect(this.sfxSynths.grinder.volume);

    // Stuffing squelch
    this.sfxSynths.stuffer = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: {type: 'sine'},
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
        attackCurve: 'exponential',
      },
    }).toDestination();

    // Pressure (Rising Pitch)
    this.sfxSynths.pressure = new Tone.Oscillator(50, 'sine').toDestination();
    this.sfxSynths.pressure.volume.value = -20;

    // Countdown beep
    this.sfxSynths.beep = new Tone.Synth({
      oscillator: {type: 'sine'},
      envelope: {attack: 0.01, decay: 0.1, sustain: 0, release: 0.1},
      volume: -8,
    }).toDestination();

    // Blow whoosh (filtered noise)
    const blowFilter = new Tone.Filter(200, 'lowpass').toDestination();
    this.sfxSynths.blowNoise = new Tone.NoiseSynth({
      noise: {type: 'white'},
      envelope: {attack: 0.5, decay: 0, sustain: 1, release: 0.3},
      volume: -12,
    }).connect(blowFilter);
    this.sfxSynths.blowFilter = blowFilter;

    // Impact slam (for BUT FIRST)
    this.sfxSynths.slam = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 6,
      envelope: {attack: 0.001, decay: 0.3, sustain: 0, release: 0.2},
      volume: -4,
    }).toDestination();

    // Sizzle (for cooking)
    this.sfxSynths.sizzle = new Tone.NoiseSynth({
      noise: {type: 'pink'},
      envelope: {attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.4},
      volume: -15,
    }).toDestination();

    this.isInitialized = true;
  }

  startGrinder() {
    if (!this.isInitialized) return;
    this.sfxSynths.grinder.triggerAttack();
  }

  stopGrinder() {
    if (!this.isInitialized) return;
    this.sfxSynths.grinder.triggerRelease();
  }

  playStuffingSquelch() {
    if (!this.isInitialized) return;
    this.sfxSynths.stuffer.triggerAttackRelease('C2', '8n');
  }

  playCountdownBeep(final = false) {
    if (!this.isInitialized) return;
    this.sfxSynths.beep.triggerAttackRelease(final ? 'C5' : 'C4', '16n');
  }

  startBlowWhoosh() {
    if (!this.isInitialized) return;
    this.sfxSynths.blowNoise.triggerAttack();
    this.sfxSynths.blowFilter.frequency.rampTo(2000, 2);
  }

  stopBlowWhoosh() {
    if (!this.isInitialized) return;
    this.sfxSynths.blowNoise.triggerRelease();
    this.sfxSynths.blowFilter.frequency.value = 200;
  }

  playSlam() {
    if (!this.isInitialized) return;
    this.sfxSynths.slam.triggerAttackRelease('C1', '8n');
  }

  playSizzle() {
    if (!this.isInitialized) return;
    this.sfxSynths.sizzle.triggerAttackRelease('8n');
  }

  playCorrectPick() {
    if (!this.isInitialized) return;
    const synth = new Tone.Synth({
      oscillator: {type: 'triangle'},
      envelope: {attack: 0.01, decay: 0.15, sustain: 0, release: 0.1},
      volume: -8,
    }).toDestination();
    synth.triggerAttackRelease('E5', '16n');
    setTimeout(() => synth.dispose(), 500);
  }

  playWrongPick() {
    if (!this.isInitialized) return;
    const synth = new Tone.Synth({
      oscillator: {type: 'sawtooth'},
      envelope: {attack: 0.01, decay: 0.3, sustain: 0, release: 0.1},
      volume: -10,
    }).toDestination();
    synth.triggerAttackRelease('C2', '8n');
    setTimeout(() => synth.dispose(), 500);
  }

  updatePressure(intensity: number) {
    if (!this.isInitialized) return;
    if (this.sfxSynths.pressure.state !== 'started') {
      this.sfxSynths.pressure.start();
    }
    const freq = 50 + intensity * 7.5;
    this.sfxSynths.pressure.frequency.rampTo(freq, 0.1);
    const vol = -20 + intensity * 0.15;
    this.sfxSynths.pressure.volume.rampTo(vol, 0.1);
  }

  stopPressure() {
    if (!this.isInitialized) return;
    if (this.sfxSynths.pressure?.state === 'started') {
      this.sfxSynths.pressure.stop();
    }
  }

  playBurst() {
    if (!this.isInitialized) return;
    const burst = new Tone.NoiseSynth({
      noise: {type: 'white'},
      envelope: {attack: 0.01, decay: 0.5, sustain: 0, release: 0.1},
      volume: -5,
    }).toDestination();
    burst.triggerAttackRelease('8n');
    setTimeout(() => burst.dispose(), 1000);
  }

  playTitleJingle() {
    if (!this.isInitialized) return;
    this.stopEngine();
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    this.synths.push(synth);
    const melody: [string, string][] = [
      ['0:0', 'E4'],
      ['0:0:2', 'G4'],
      ['0:1', 'A4'],
      ['0:1:2', 'G4'],
      ['0:2', 'E4'],
      ['0:2:2', 'C4'],
      ['0:3', 'E4'],
      ['0:3:2', 'G4'],
    ];
    this.currentSong = new Tone.Part((time, note) => {
      synth.triggerAttackRelease(note, '8n', time);
    }, melody).start(0);
    Tone.getTransport().start();
  }

  playRatingSong(rating: number) {
    if (!this.isInitialized) return;
    this.stopEngine();
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    this.synths.push(synth);
    let melody: [string, string][];
    if (rating >= 4) {
      melody = [
        ['0:0', 'C4'],
        ['0:1', 'E4'],
        ['0:2', 'G4'],
        ['0:3', 'C5'],
      ];
    } else if (rating > 1) {
      melody = [
        ['0:0', 'C4'],
        ['0:1', 'D4'],
        ['0:2', 'E4'],
        ['0:3', 'C4'],
      ];
    } else {
      melody = [
        ['0:0', 'C4'],
        ['0:1', 'G3'],
        ['0:2', 'E3'],
        ['0:3', 'C3'],
      ];
    }
    this.currentSong = new Tone.Part((time, note) => {
      synth.triggerAttackRelease(note, '8n', time);
    }, melody).start(0);
    Tone.getTransport().start();
  }

  /** Gain node for ambient music — respects musicVolume / musicMuted. */
  private ambientGain: Tone.Gain | null = null;
  /** Looping player for the ambient horror track. */
  private ambientPlayer: Tone.Player | null = null;
  /** Store subscription disposer for volume/mute reactivity. */
  private ambientUnsub: (() => void) | null = null;

  /** Looping player for the current challenge music track. */
  private challengeTrack: Tone.Player | null = null;
  /** Gain node for challenge track — respects musicVolume / musicMuted. */
  private challengeGain: Tone.Gain | null = null;
  /** Store subscription disposer for challenge track volume reactivity. */
  private challengeUnsub: (() => void) | null = null;

  /** Start the ambient horror loop, respecting musicVolume & musicMuted. */
  startAmbientDrone() {
    if (!this.isInitialized) return;
    this.stopAmbientDrone();

    const {musicVolume, musicMuted} = useGameStore.getState();

    // Gain node so we can adjust volume without touching the player
    const gain = new Tone.Gain(musicMuted ? 0 : musicVolume).toDestination();
    this.ambientGain = gain;

    const url = getAssetUrl('audio', 'ambient-horror.ogg');
    const player = new Tone.Player({
      url,
      loop: true,
      fadeIn: 2,
      volume: -6,
      onload: () => {
        // Only start if we haven't been stopped while loading
        if (this.ambientPlayer === player) {
          player.start();
        }
      },
      onerror: err => console.warn('Failed to load ambient-horror.ogg:', err),
    }).connect(gain);
    this.ambientPlayer = player;

    // Subscribe to store changes for live volume/mute reactivity
    this.ambientUnsub = useGameStore.subscribe(state => {
      if (this.ambientGain) {
        this.ambientGain.gain.rampTo(state.musicMuted ? 0 : state.musicVolume, 0.3);
      }
    });
  }

  stopAmbientDrone() {
    if (this.ambientUnsub) {
      this.ambientUnsub();
      this.ambientUnsub = null;
    }
    if (this.ambientPlayer) {
      this.ambientPlayer.stop();
      this.ambientPlayer.dispose();
      this.ambientPlayer = null;
    }
    if (this.ambientGain) {
      this.ambientGain.dispose();
      this.ambientGain = null;
    }
  }

  /** Start a music track for the current challenge, crossfading from ambient. */
  startChallengeTrack(challengeType: string): void {
    if (!this.isInitialized) return;
    const trackDef = config.audio.challengeTracks[challengeType];
    if (!trackDef) return;

    // Stop any previous challenge track first
    this.stopChallengeTrack();

    const {musicVolume, musicMuted} = useGameStore.getState();
    const crossfade = config.audio.crossfadeDuration;

    // Fade ambient out over crossfade duration
    if (this.ambientGain) {
      this.ambientGain.gain.rampTo(0, crossfade);
    }

    const gain = new Tone.Gain(0).toDestination();
    this.challengeGain = gain;

    const url = getAssetUrl('audio', trackDef.file);
    const player = new Tone.Player({
      url,
      loop: true,
      volume: trackDef.volume,
      onload: () => {
        if (this.challengeTrack === player) {
          player.start();
          // Fade in over crossfade duration, respecting mute/volume
          const targetGain = musicMuted ? 0 : musicVolume;
          gain.gain.rampTo(targetGain, crossfade);
        }
      },
      onerror: err => console.warn(`Failed to load challenge track ${trackDef.file}:`, err),
    }).connect(gain);
    this.challengeTrack = player;

    // Subscribe to store changes for live volume/mute reactivity
    this.challengeUnsub = useGameStore.subscribe(state => {
      if (this.challengeGain) {
        this.challengeGain.gain.rampTo(state.musicMuted ? 0 : state.musicVolume, 0.3);
      }
    });
  }

  /** Stop challenge track and resume ambient. */
  stopChallengeTrack(): void {
    if (this.challengeUnsub) {
      this.challengeUnsub();
      this.challengeUnsub = null;
    }
    if (this.challengeTrack) {
      this.challengeTrack.stop();
      this.challengeTrack.dispose();
      this.challengeTrack = null;
    }
    if (this.challengeGain) {
      this.challengeGain.dispose();
      this.challengeGain = null;
    }

    // Fade ambient back in
    if (this.ambientGain) {
      const {musicVolume, musicMuted} = useGameStore.getState();
      const crossfade = config.audio.crossfadeDuration;
      this.ambientGain.gain.rampTo(musicMuted ? 0 : musicVolume, crossfade);
    }
  }

  /** Sharp crack + wood creak — NoiseSynth burst + MembraneSynth for cabinet burst. */
  playCabinetBurst(): void {
    if (!this.isInitialized) return;
    // White noise burst (fast attack, short decay)
    const burst = new Tone.NoiseSynth({
      noise: {type: 'white'},
      envelope: {attack: 0.005, decay: 0.15, sustain: 0, release: 0.05},
      volume: -4,
    }).toDestination();
    burst.triggerAttackRelease('16n');
    // Membrane synth for wood crack thump
    const crack = new Tone.MembraneSynth({
      pitchDecay: 0.04,
      octaves: 5,
      envelope: {attack: 0.001, decay: 0.25, sustain: 0, release: 0.1},
      volume: -6,
    }).toDestination();
    crack.triggerAttackRelease('A1', '8n');
    setTimeout(() => {
      burst.dispose();
      crack.dispose();
    }, 1000);
  }

  /** Low growl — FM synth with carrier 80Hz, modulator 3Hz, long sustain. */
  playCreatureVocal(): void {
    if (!this.isInitialized) return;
    const fm = new Tone.FMSynth({
      harmonicity: 3 / 80,
      modulationIndex: 10,
      oscillator: {type: 'sine'},
      envelope: {attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5},
      modulation: {type: 'sine'},
      modulationEnvelope: {attack: 0.5, decay: 0.1, sustain: 1, release: 1.5},
      volume: -8,
    }).toDestination();
    fm.triggerAttack('A1');
    setTimeout(() => {
      fm.triggerRelease();
      setTimeout(() => fm.dispose(), 2000);
    }, 1200);
  }

  /** Metal clang from pots_and_pans sample at higher volume. */
  playWeaponImpact(): void {
    this.playSample('pots_and_pans', -2);
  }

  /** Descending sine sweep 400Hz → 80Hz over 0.3s. */
  playEnemyDeath(): void {
    if (!this.isInitialized) return;
    const osc = new Tone.Oscillator(400, 'sine').toDestination();
    osc.volume.value = -8;
    osc.start();
    osc.frequency.rampTo(80, 0.3);
    setTimeout(() => {
      osc.stop();
      osc.dispose();
    }, 400);
  }

  /** Load all OGG samples as Tone.Players (non-blocking). */
  private loadSamples() {
    for (const files of Object.values(SAMPLE_VARIANTS)) {
      for (const file of files) {
        const url = getAssetUrl('audio', file);
        const player = new Tone.Player({
          url,
          onerror: err => console.warn(`Failed to load sample ${file}:`, err),
        }).toDestination();
        player.volume.value = -8;
        this.samples.set(file, player);
      }
    }
  }

  /** Play a random variant from a sample category. */
  playSample(category: keyof typeof SAMPLE_VARIANTS, volume = -8) {
    if (!this.isInitialized) return;
    const variants = SAMPLE_VARIANTS[category];
    if (!variants || variants.length === 0) return;
    const file = variants[Math.floor(Math.random() * variants.length)];
    const player = this.samples.get(file);
    if (player?.loaded) {
      // Reset loop flag in case this player was previously used by startSampleLoop
      player.loop = false;
      player.volume.value = volume;
      if (player.state !== 'started') {
        player.start();
      }
    }
  }

  /** Start a looping sample (e.g. sizzle_loop for cooking). */
  startSampleLoop(category: keyof typeof SAMPLE_VARIANTS, volume = -12) {
    if (!this.isInitialized) return;
    this.stopSampleLoop();
    const variants = SAMPLE_VARIANTS[category];
    if (!variants || variants.length === 0) return;
    const file = variants[Math.floor(Math.random() * variants.length)];
    const player = this.samples.get(file);
    if (player?.loaded) {
      player.loop = true;
      player.volume.value = volume;
      if (player.state !== 'started') {
        player.start();
      }
      this.loopingSample = player;
    }
  }

  /** Stop the current looping sample. */
  stopSampleLoop() {
    if (this.loopingSample) {
      this.loopingSample.stop();
      this.loopingSample.loop = false;
      this.loopingSample = null;
    }
  }

  /** Play a grab/pickup sound. */
  playGrab() {
    this.playSample('pots_and_pans', -10);
  }

  /** Play a drop/place sound. */
  playDrop() {
    this.playSample('pots_and_pans', -6);
  }

  /** Play a pour sound (bowl → grinder, blend → stuffer). */
  playPour() {
    this.playSample('pour', -6);
  }

  /** Play a mixing sound (ingredients in bowl). */
  playMix() {
    this.playSample('mix_wet', -8);
  }

  /** Play a chopping/ingredient impact sound. */
  playChop() {
    this.playSample('chop', -8);
  }

  /** Start cooking sizzle loop. */
  startCookingSizzle() {
    this.startSampleLoop('sizzle_loop', -10);
  }

  /** Stop cooking sizzle loop. */
  stopCookingSizzle() {
    this.stopSampleLoop();
  }

  /** Play a one-shot sizzle. */
  playSizzleHit() {
    this.playSample('sizzle_hit', -8);
  }

  /** Play boiling water sound. */
  playBoiling() {
    this.playSample('boiling', -10);
  }

  // ---------------------------------------------------------------------------
  // Spatial Audio — 3D positional sounds via Tone.Panner3D
  // ---------------------------------------------------------------------------

  /**
   * Update the audio listener position (typically called from FPSController).
   * Maps to the Web Audio API AudioListener position.
   */
  setListenerPosition(x: number, y: number, z: number): void {
    if (!this.isInitialized) return;
    const listener = Tone.getContext().rawContext.listener;
    if (listener.positionX) {
      listener.positionX.value = x;
      listener.positionY.value = y;
      listener.positionZ.value = z;
    }
  }

  /**
   * Update the audio listener orientation (forward + up vectors).
   * Called from FPSController or XR head pose.
   */
  setListenerOrientation(
    forwardX: number,
    forwardY: number,
    forwardZ: number,
    upX: number,
    upY: number,
    upZ: number,
  ): void {
    if (!this.isInitialized) return;
    const listener = Tone.getContext().rawContext.listener;
    if (listener.forwardX) {
      listener.forwardX.value = forwardX;
      listener.forwardY.value = forwardY;
      listener.forwardZ.value = forwardZ;
      listener.upX.value = upX;
      listener.upY.value = upY;
      listener.upZ.value = upZ;
    }
  }

  /**
   * Play a sound at a 3D position using Panner3D.
   * If the soundId already has an active source, it is stopped first.
   */
  playSpatial(
    soundId: string,
    position: [number, number, number],
    options?: {
      file?: string;
      volume?: number;
      loop?: boolean;
      refDistance?: number;
      maxDistance?: number;
      rolloffFactor?: number;
    },
  ): void {
    if (!this.isInitialized) return;
    if (!useGameStore.getState().spatialAudioEnabled) return;

    // Stop existing source for this ID
    this.stopSpatial(soundId);

    const file = options?.file;
    if (!file) return;

    const panner = new Tone.Panner3D({
      positionX: position[0],
      positionY: position[1],
      positionZ: position[2],
      refDistance: options?.refDistance ?? 1,
      maxDistance: options?.maxDistance ?? 10,
      rolloffFactor: options?.rolloffFactor ?? 1,
      distanceModel: 'inverse',
      panningModel: 'HRTF',
    }).toDestination();

    const url = getAssetUrl('audio', file);
    const player = new Tone.Player({
      url,
      loop: options?.loop ?? false,
      volume: options?.volume ?? -12,
      onload: () => {
        // Only start if still active
        const current = this.spatialSources.get(soundId);
        if (current?.player === player) {
          player.start();
        }
      },
      onerror: err => console.warn(`Failed to load spatial sound ${file}:`, err),
    }).connect(panner);

    this.spatialSources.set(soundId, {player, panner});
  }

  /** Stop and dispose a specific spatial sound source. */
  stopSpatial(soundId: string): void {
    const source = this.spatialSources.get(soundId);
    if (source) {
      try {
        source.player.stop();
      } catch {
        // Player may not be started
      }
      source.player.dispose();
      source.panner.dispose();
      this.spatialSources.delete(soundId);
    }
  }

  /** Start all configured spatial ambient sounds from audio.json. */
  startSpatialAmbient(): void {
    if (!this.isInitialized) return;
    if (!useGameStore.getState().spatialAudioEnabled) return;

    const spatialSounds = config.audio.spatialSounds;
    if (!spatialSounds) return;

    for (const [id, def] of Object.entries(spatialSounds)) {
      this.playSpatial(id, def.position, {
        file: def.file,
        volume: def.volume,
        loop: def.loop,
        refDistance: def.refDistance,
        maxDistance: def.maxDistance,
        rolloffFactor: def.rolloffFactor,
      });
    }
  }

  /** Stop all spatial ambient sounds. */
  stopSpatialAmbient(): void {
    for (const id of this.spatialSources.keys()) {
      this.stopSpatial(id);
    }
  }

  stopEngine() {
    if (this.currentSong) {
      this.currentSong.dispose();
      this.currentSong = null;
    }
    for (const s of this.synths) {
      s.dispose();
    }
    this.synths = [];
    this.stopAmbientDrone();
    this.stopChallengeTrack();
    this.stopSampleLoop();
    this.stopSpatialAmbient();
    for (const player of this.samples.values()) {
      player.dispose();
    }
    this.samples.clear();
    if (this.isInitialized) {
      try {
        this.stopGrinder();
      } catch {}
      try {
        this.stopPressure();
      } catch {}
    }
  }
}

export const audioEngine = new AudioEngine();
