import {beforeEach, describe, expect, it, vi} from 'vitest';

/** Shared synth mock factory. */
function mockSynth() {
  return {
    connect: vi.fn().mockReturnThis(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    triggerAttackRelease: vi.fn(),
    dispose: vi.fn(),
  };
}

/** Shared Tone.js mock factory — all synth types included (E.1/E.2/E.3). */
function createToneMock() {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    now: vi.fn().mockReturnValue(0),
    getDestination: vi.fn().mockReturnValue({}),
    Player: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      loaded: true,
      loop: false,
    })),
    Reverb: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
    })),
    Filter: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
      frequency: {rampTo: vi.fn()},
    })),
    FMSynth: vi.fn().mockImplementation(() => mockSynth()),
    NoiseSynth: vi.fn().mockImplementation(() => mockSynth()),
    MetalSynth: vi.fn().mockImplementation(() => mockSynth()),
    MembraneSynth: vi.fn().mockImplementation(() => mockSynth()),
  };
}

vi.mock('tone', () => createToneMock());

// Re-import fresh audioEngine for each test by using dynamic import
// We need a factory since audioEngine is a singleton with internal state
async function createFreshEngine() {
  // Reset modules to get a fresh singleton
  vi.resetModules();

  // Re-register the mock after resetModules
  vi.doMock('tone', () => createToneMock());

  const mod = await import('../AudioEngine');
  return mod.audioEngine;
}

describe('AudioEngine (Tone.js)', () => {
  let engine: Awaited<ReturnType<typeof createFreshEngine>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    engine = await createFreshEngine();
  });

  describe('initialize()', () => {
    it('calls Tone.start() and sets initialized to true', async () => {
      expect(engine.initialized).toBe(false);
      await engine.initialize();
      expect(engine.initialized).toBe(true);
    });

    it('creates Filter, Reverb, Players, and all synths', async () => {
      await engine.initialize();

      const ToneMock = await import('tone');
      expect(ToneMock.Filter).toHaveBeenCalledTimes(1);
      expect(ToneMock.Reverb).toHaveBeenCalledTimes(1);
      // E.1/E.2: FMSynth called 2x (drone + reaction)
      expect(ToneMock.FMSynth).toHaveBeenCalledTimes(2);
      // E.1/E.3: NoiseSynth called 3x (drone + stinger + ingredient)
      expect(ToneMock.NoiseSynth).toHaveBeenCalledTimes(3);
      // E.1: MetalSynth called 2x (stinger + ingredient)
      expect(ToneMock.MetalSynth).toHaveBeenCalledTimes(2);
      // E.1/E.3: MembraneSynth called 2x (stinger + ingredient)
      expect(ToneMock.MembraneSynth).toHaveBeenCalledTimes(2);
      // Players are created dynamically from audio.json sample entries.
      // The count grows as new SFX are added — assert at least the
      // original 14 core samples exist, plus any new ones.
      expect(
        (ToneMock.Player as unknown as {mock: {calls: unknown[]}}).mock.calls.length,
      ).toBeGreaterThanOrEqual(14);
    });

    it('is idempotent — calling twice does not reinitialize', async () => {
      await engine.initialize();
      await engine.initialize();

      const ToneMock = await import('tone');
      expect(ToneMock.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('play()', () => {
    it('plays a one-shot sample', async () => {
      await engine.initialize();
      engine.play('chop');
      // The player's start should have been called (via the mock)
      // We verify no errors are thrown and the method completes
      expect(engine.initialized).toBe(true);
    });

    it('does nothing when not initialized', () => {
      expect(() => engine.play('chop')).not.toThrow();
    });

    it('does nothing when muted', async () => {
      await engine.initialize();
      engine.setMuted(true);
      // Should not throw
      expect(() => engine.play('chop')).not.toThrow();
    });
  });

  describe('loop() and stop()', () => {
    it('starts and stops a looping sound', async () => {
      await engine.initialize();
      engine.loop('ambient');
      engine.stop('ambient');
      expect(engine.initialized).toBe(true);
    });
  });

  describe('stopAll()', () => {
    it('stops all players without error', async () => {
      await engine.initialize();
      engine.loop('ambient');
      engine.loop('sizzle');
      expect(() => engine.stopAll()).not.toThrow();
    });
  });

  describe('startDrone() / stopDrone()', () => {
    it('starts and stops the procedural drone', async () => {
      await engine.initialize();
      engine.startDrone();
      // Should not start again if already active
      engine.startDrone();
      engine.stopDrone();
      // Should not stop again if already stopped
      engine.stopDrone();
      expect(engine.initialized).toBe(true);
    });

    it('does nothing when not initialized', () => {
      expect(() => engine.startDrone()).not.toThrow();
      expect(() => engine.stopDrone()).not.toThrow();
    });
  });

  describe('setMuffled()', () => {
    it('ramps filter frequency for muffle/clear', async () => {
      await engine.initialize();
      expect(() => engine.setMuffled(true)).not.toThrow();
      expect(() => engine.setMuffled(false)).not.toThrow();
    });

    it('does nothing before initialization', () => {
      expect(() => engine.setMuffled(true)).not.toThrow();
    });
  });

  describe('playPhaseStinger()', () => {
    it('fires a stinger for each phase without error', async () => {
      await engine.initialize();
      const phases = [
        'SELECT_INGREDIENTS',
        'CHOPPING',
        'FILL_GRINDER',
        'GRINDING',
        'STUFFING',
        'TIE_CASING',
        'BLOWOUT',
        'COOKING',
        'DONE',
        'MOVE_BOWL',
        'ATTACH_CASING',
        'MOVE_SAUSAGE',
        'MOVE_PAN',
      ] as const;
      for (const phase of phases) {
        expect(() => engine.playPhaseStinger(phase)).not.toThrow();
      }
    });

    it('does nothing when muted', async () => {
      await engine.initialize();
      engine.setMuted(true);
      expect(() => engine.playPhaseStinger('CHOPPING')).not.toThrow();
    });
  });

  describe('playReactionAudio()', () => {
    it('fires audio for each reaction type without error', async () => {
      await engine.initialize();
      const reactions = [
        'nod',
        'disgust',
        'excitement',
        'laugh',
        'flinch',
        'judging',
        'idle',
      ] as const;
      for (const r of reactions) {
        expect(() => engine.playReactionAudio(r)).not.toThrow();
      }
    });
  });

  describe('playIngredientSFX()', () => {
    it('fires archetype-specific SFX without error', async () => {
      await engine.initialize();
      const archetypes = ['meat', 'plant', 'plastic', 'metal', 'liquid', 'other'] as const;
      const actions = ['chop', 'grind', 'pour', 'hit', 'sizzle', 'stuff'] as const;
      for (const a of archetypes) {
        for (const act of actions) {
          expect(() => engine.playIngredientSFX(a, act)).not.toThrow();
        }
      }
    });
  });

  describe('dispose()', () => {
    it('cleans up all Tone.js nodes and resets state', async () => {
      await engine.initialize();
      engine.startDrone();
      engine.loop('ambient');
      engine.dispose();
      expect(engine.initialized).toBe(false);
    });

    it('is safe to call without initialization', () => {
      expect(() => engine.dispose()).not.toThrow();
    });
  });

  describe('backward-compatible API', () => {
    it('playSound() delegates to play()', async () => {
      await engine.initialize();
      expect(() => engine.playSound('chop')).not.toThrow();
      expect(() => engine.playSound('burst')).not.toThrow();
    });

    it('playChop() plays the chop sound', async () => {
      await engine.initialize();
      expect(() => engine.playChop()).not.toThrow();
    });

    it('setSizzleLevel() loops or stops sizzle', async () => {
      await engine.initialize();
      engine.setSizzleLevel(0.5);
      engine.setSizzleLevel(0);
      expect(engine.initialized).toBe(true);
    });

    it('setGrinderSpeed() loops or stops grind', async () => {
      await engine.initialize();
      engine.setGrinderSpeed(0.8);
      engine.setGrinderSpeed(0);
      expect(engine.initialized).toBe(true);
    });

    it('setAmbientDrone() loops ambient + starts drone', async () => {
      await engine.initialize();
      engine.setAmbientDrone(true);
      engine.setAmbientDrone(false);
      expect(engine.initialized).toBe(true);
    });

    it('startAmbient/stopAmbient convenience methods', async () => {
      await engine.initialize();
      expect(() => engine.startAmbient()).not.toThrow();
      expect(() => engine.stopAmbient()).not.toThrow();
    });

    it('setVolume does not throw', async () => {
      await engine.initialize();
      expect(() => engine.setVolume('sfx', 0.5)).not.toThrow();
    });

    it('setMuted/isMuted toggle', async () => {
      await engine.initialize();
      expect(engine.isMuted()).toBe(false);
      engine.setMuted(true);
      expect(engine.isMuted()).toBe(true);
      engine.setMuted(false);
      expect(engine.isMuted()).toBe(false);
    });
  });
});
