import * as Tone from 'tone';

class AudioEngine {
  private synths: Tone.PolySynth[] = [];
  private currentSong: Tone.Part | null = null;
  private sfxSynths: Record<string, any> = {};
  private isInitialized = false;

  async initTone() {
    if (this.isInitialized) return;
    await Tone.start();
    Tone.getTransport().start();

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

  /** Start an eerie ambient drone for the horror atmosphere */
  startAmbientDrone() {
    if (!this.isInitialized) return;
    this.stopAmbientDrone();

    // Low rumble
    const drone = new Tone.Oscillator(55, 'sawtooth').toDestination();
    drone.volume.value = -28;
    drone.start();
    this.sfxSynths.ambientDrone = drone;

    // Slow LFO on drone pitch for unease
    const lfo = new Tone.LFO(0.1, 50, 60).start();
    lfo.connect(drone.frequency);
    this.sfxSynths.ambientDroneLfo = lfo;

    // Subtle high-frequency whisper noise
    const hiss = new Tone.NoiseSynth({
      noise: {type: 'pink'},
      envelope: {attack: 2, decay: 0, sustain: 1, release: 2},
      volume: -32,
    }).toDestination();
    hiss.triggerAttack();
    this.sfxSynths.ambientHiss = hiss;
  }

  stopAmbientDrone() {
    if (this.sfxSynths.ambientDrone) {
      this.sfxSynths.ambientDrone.stop();
      this.sfxSynths.ambientDrone.dispose();
      delete this.sfxSynths.ambientDrone;
    }
    if (this.sfxSynths.ambientDroneLfo) {
      this.sfxSynths.ambientDroneLfo.dispose();
      delete this.sfxSynths.ambientDroneLfo;
    }
    if (this.sfxSynths.ambientHiss) {
      this.sfxSynths.ambientHiss.triggerRelease();
      setTimeout(() => {
        this.sfxSynths.ambientHiss?.dispose();
        delete this.sfxSynths.ambientHiss;
      }, 2500);
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
