/**
 * @module AudioEngine (native/universal)
 * Web Audio API synthesized sound effects for Will It Blow?
 * Adapted from grovekeeper's AudioManager — all SFX generated procedurally,
 * no audio files required. Horror butcher-shop aesthetic: low drones,
 * metallic scrapes, wet impacts, and tension stingers.
 *
 * Usage:
 *   await audioEngine.initialize();
 *   audioEngine.playChop();
 *   audioEngine.setVolume('sfx', 0.8);
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
  private ctx: AudioContext | null = null;
  private _initialized = false;
  private muted = false;
  private sfxVolume = 0.4;
  private musicVolume = 0.3;
  private masterGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private noiseCallIndex = 0;

  get initialized() {
    return this._initialized;
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx?.state === 'closed') {
      this.ctx = null;
      this.masterGain = null;
    }
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.sfxVolume;
      this.masterGain.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      return null;
    }
  }

  async initialize() {
    if (this._initialized) return;
    const ctx = this.ensureContext();
    if (ctx?.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    this._initialized = true;
  }

  playSound(name: SoundId): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    switch (name) {
      case 'chop':
        this.playNoiseBurst(ctx, 0.06, 200, 0.2);
        this.playTone(ctx, {freq: 100, duration: 0.08, type: 'triangle', gain: 0.25, delay: 0.01});
        break;
      case 'grind':
        this.playTone(ctx, {freq: 80, duration: 0.3, type: 'sawtooth', gain: 0.15});
        this.playNoiseBurst(ctx, 0.2, 300, 0.1);
        break;
      case 'squelch':
        this.playNoiseBurst(ctx, 0.12, 500, 0.18);
        this.playTone(ctx, {freq: 150, duration: 0.1, type: 'sine', gain: 0.1, delay: 0.03});
        break;
      case 'sizzle':
        this.playNoiseBurst(ctx, 0.3, 4000, 0.12);
        break;
      case 'pressure':
        this.playRisingTone(ctx, 60, 200, 0.4, 'sawtooth', 0.1);
        break;
      case 'burst':
        this.playNoiseBurst(ctx, 0.15, 800, 0.3);
        this.playTone(ctx, {freq: 60, duration: 0.2, type: 'triangle', gain: 0.3, delay: 0.02});
        break;
      case 'tie':
        this.playTone(ctx, {freq: 400, duration: 0.05, type: 'square', gain: 0.12});
        this.playTone(ctx, {freq: 600, duration: 0.05, type: 'square', gain: 0.12, delay: 0.06});
        break;
      case 'strike':
        this.playTone(ctx, {freq: 150, duration: 0.2, type: 'sawtooth', gain: 0.2});
        this.playNoiseBurst(ctx, 0.1, 250, 0.15);
        break;
      case 'success':
        this.playChime(ctx, [330, 440, 554, 660], 0.12, 0.15);
        break;
      case 'error':
        this.playTone(ctx, {freq: 100, duration: 0.25, type: 'sawtooth', gain: 0.15});
        this.playTone(ctx, {freq: 80, duration: 0.25, type: 'sawtooth', gain: 0.12, delay: 0.05});
        break;
      case 'click':
        this.playTone(ctx, {freq: 600, duration: 0.03, type: 'sine', gain: 0.1});
        break;
      case 'phaseAdvance':
        this.playRisingTone(ctx, 200, 400, 0.15, 'triangle', 0.15);
        break;
      case 'rankReveal':
        this.playArpeggio(ctx, [220, 330, 440, 660], 0.12, 0.2);
        this.playTone(ctx, {freq: 660, duration: 0.5, type: 'sine', gain: 0.15, delay: 0.5});
        break;
    }
  }

  playChop() {
    this.playSound('chop');
  }

  setSizzleLevel(level: number) {
    if (level > 0) this.playSound('sizzle');
  }

  setGrinderSpeed(speed: number) {
    if (speed > 0) this.playSound('grind');
  }

  setAmbientDrone(active: boolean) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (active && !this.ambientOsc) {
      this.ambientOsc = ctx.createOscillator();
      this.ambientGain = ctx.createGain();
      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.value = 55;
      this.ambientGain.gain.value = this.musicVolume * 0.15;
      this.ambientOsc.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);
      this.ambientOsc.start();
    } else if (!active && this.ambientOsc) {
      this.ambientOsc.stop();
      this.ambientOsc.disconnect();
      this.ambientOsc = null;
      this.ambientGain = null;
    }
  }

  startAmbient() {
    this.setAmbientDrone(true);
  }

  stopAmbient() {
    this.setAmbientDrone(false);
  }

  setVolume(type: string, level: number) {
    const clamped = Math.max(0, Math.min(1, level));
    if (type === 'sfx') {
      this.sfxVolume = clamped;
      if (this.masterGain) this.masterGain.gain.value = clamped;
    } else if (type === 'music') {
      this.musicVolume = clamped;
      if (this.ambientGain) this.ambientGain.gain.value = clamped * 0.15;
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopAmbient();
      if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => {});
    } else if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  dispose() {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
    }
  }

  // --- Primitive synthesizers (adapted from grovekeeper AudioManager) ---

  private playTone(
    ctx: AudioContext,
    opts: {freq: number; duration: number; type: OscillatorType; gain: number; delay?: number},
  ) {
    const master = this.masterGain;
    if (!master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.value = opts.freq;
    gain.gain.value = opts.gain;
    const startTime = ctx.currentTime + (opts.delay ?? 0);
    const endTime = startTime + opts.duration;
    gain.gain.setValueAtTime(opts.gain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);
    osc.connect(gain);
    gain.connect(master);
    osc.start(startTime);
    osc.stop(endTime + 0.01);
  }

  private playRisingTone(
    ctx: AudioContext,
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gain: number,
  ) {
    const master = this.masterGain;
    if (!master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
  }

  private playChime(ctx: AudioContext, freqs: number[], noteDuration: number, gain: number) {
    for (let i = 0; i < freqs.length; i++) {
      this.playTone(ctx, {
        freq: freqs[i],
        duration: noteDuration,
        type: 'sine',
        gain,
        delay: i * noteDuration * 0.6,
      });
    }
  }

  private playArpeggio(ctx: AudioContext, freqs: number[], noteGap: number, gain: number) {
    for (let i = 0; i < freqs.length; i++) {
      this.playTone(ctx, {
        freq: freqs[i],
        duration: noteGap * 1.5,
        type: 'sine',
        gain,
        delay: i * noteGap,
      });
    }
  }

  private playNoiseBurst(ctx: AudioContext, duration: number, filterFreq: number, gain: number) {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Deterministic noise via simple PRNG (no Math.random)
    let seed = ++this.noiseCallIndex;
    for (let i = 0; i < bufferSize; i++) {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      data[i] = seed / 0x7fffffff - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    const master = this.masterGain;
    if (!master) return;
    source.connect(filter);
    filter.connect(g);
    g.connect(master);
    source.start();
    source.stop(ctx.currentTime + duration + 0.01);
  }
}

export const audioEngine = new AudioEngineImpl();
