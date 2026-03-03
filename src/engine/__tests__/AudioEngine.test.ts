/**
 * AudioEngine source-analysis tests (Wave 8).
 *
 * These tests read the source files directly with Node fs — no Tone.js runtime
 * is involved. This lets us assert structural contracts (method presence,
 * crossfade logic, config shape) without spinning up a Web Audio context.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath: string): unknown {
  return JSON.parse(readSource(relativePath));
}

// ---------------------------------------------------------------------------
// 8A — Web engine: challenge track system
// ---------------------------------------------------------------------------

describe('AudioEngine.web.ts — challenge track system', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/engine/AudioEngine.web.ts');
  });

  it('exports startChallengeTrack method', () => {
    expect(src).toContain('startChallengeTrack(');
  });

  it('exports stopChallengeTrack method', () => {
    expect(src).toContain('stopChallengeTrack(');
  });

  it('uses rampTo for crossfade (fade-in)', () => {
    expect(src).toContain('rampTo');
  });

  it('fades ambient gain to 0 when starting challenge track', () => {
    // The code should ramp ambient gain to 0 during crossfade
    expect(src).toContain('ambientGain.gain.rampTo(0,');
  });

  it('restores ambient gain when stopping challenge track', () => {
    // The code should ramp ambient gain back to musicVolume on stop
    expect(src).toContain('ambientGain.gain.rampTo(');
  });

  it('uses crossfadeDuration from config', () => {
    expect(src).toContain('config.audio.crossfadeDuration');
  });

  it('subscribes to store for live volume reactivity on challenge track', () => {
    expect(src).toContain('challengeUnsub');
  });

  it('disposes challengeTrack player on stopChallengeTrack', () => {
    expect(src).toContain('challengeTrack.dispose()');
  });

  it('cleans up challenge track in stopEngine', () => {
    expect(src).toContain('stopChallengeTrack()');
  });
});

// ---------------------------------------------------------------------------
// 8B — Web engine: enemy SFX
// ---------------------------------------------------------------------------

describe('AudioEngine.web.ts — enemy SFX methods', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/engine/AudioEngine.web.ts');
  });

  it('has playCabinetBurst method', () => {
    expect(src).toContain('playCabinetBurst()');
  });

  it('playCabinetBurst uses NoiseSynth for burst', () => {
    expect(src).toContain('NoiseSynth');
  });

  it('playCabinetBurst uses MembraneSynth for wood crack', () => {
    // Should have at least two MembraneSynth usages (slam + cabinet burst)
    const count = (src.match(/MembraneSynth/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('has playCreatureVocal method', () => {
    expect(src).toContain('playCreatureVocal()');
  });

  it('playCreatureVocal uses FMSynth', () => {
    expect(src).toContain('FMSynth');
  });

  it('has playWeaponImpact method', () => {
    expect(src).toContain('playWeaponImpact()');
  });

  it('playWeaponImpact reuses pots_and_pans sample', () => {
    expect(src).toContain("playSample('pots_and_pans'");
  });

  it('has playEnemyDeath method', () => {
    expect(src).toContain('playEnemyDeath()');
  });

  it('playEnemyDeath uses Oscillator with rampTo for descending sweep', () => {
    expect(src).toContain('playEnemyDeath');
    expect(src).toContain('frequency.rampTo');
  });
});

// ---------------------------------------------------------------------------
// 8C — Native engine: matching stubs
// ---------------------------------------------------------------------------

describe('AudioEngine.ts (native) — stub methods', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/engine/AudioEngine.ts');
  });

  it('has startChallengeTrack stub', () => {
    expect(src).toContain('startChallengeTrack(');
  });

  it('has stopChallengeTrack stub', () => {
    expect(src).toContain('stopChallengeTrack()');
  });

  it('has playCabinetBurst stub', () => {
    expect(src).toContain('playCabinetBurst()');
  });

  it('has playCreatureVocal stub', () => {
    expect(src).toContain('playCreatureVocal()');
  });

  it('has playWeaponImpact stub', () => {
    expect(src).toContain('playWeaponImpact()');
  });

  it('has playEnemyDeath stub', () => {
    expect(src).toContain('playEnemyDeath()');
  });
});

// ---------------------------------------------------------------------------
// 8D — Audio config JSON shape
// ---------------------------------------------------------------------------

describe('src/config/audio.json — shape', () => {
  let cfg: Record<string, unknown>;

  beforeAll(() => {
    cfg = readJson('src/config/audio.json') as Record<string, unknown>;
  });

  it('has crossfadeDuration', () => {
    expect(typeof cfg.crossfadeDuration).toBe('number');
  });

  it('has enemyTrack', () => {
    expect(cfg.enemyTrack).toBeDefined();
  });

  it('has defeatTrack', () => {
    expect(cfg.defeatTrack).toBeDefined();
  });

  it('challengeTracks has ingredients', () => {
    const tracks = cfg.challengeTracks as Record<string, unknown>;
    expect(tracks.ingredients).toBeDefined();
  });

  it('challengeTracks has chopping', () => {
    const tracks = cfg.challengeTracks as Record<string, unknown>;
    expect(tracks.chopping).toBeDefined();
  });

  it('challengeTracks has grinding', () => {
    const tracks = cfg.challengeTracks as Record<string, unknown>;
    expect(tracks.grinding).toBeDefined();
  });

  it('challengeTracks has stuffing', () => {
    const tracks = cfg.challengeTracks as Record<string, unknown>;
    expect(tracks.stuffing).toBeDefined();
  });

  it('challengeTracks has cooking', () => {
    const tracks = cfg.challengeTracks as Record<string, unknown>;
    expect(tracks.cooking).toBeDefined();
  });

  it('challengeTracks has blowout', () => {
    const tracks = cfg.challengeTracks as Record<string, unknown>;
    expect(tracks.blowout).toBeDefined();
  });

  it('challengeTracks has tasting', () => {
    const tracks = cfg.challengeTracks as Record<string, unknown>;
    expect(tracks.tasting).toBeDefined();
  });

  it('all 7 challenge types are present', () => {
    const tracks = cfg.challengeTracks as Record<string, unknown>;
    const required = [
      'ingredients',
      'chopping',
      'grinding',
      'stuffing',
      'cooking',
      'blowout',
      'tasting',
    ];
    for (const key of required) {
      expect(tracks[key]).toBeDefined();
    }
  });

  it('each challenge track has file and volume', () => {
    const tracks = cfg.challengeTracks as Record<string, {file: string; volume: number}>;
    for (const [, track] of Object.entries(tracks)) {
      expect(typeof track.file).toBe('string');
      expect(typeof track.volume).toBe('number');
    }
  });
});

// ---------------------------------------------------------------------------
// Config barrel — AudioConfig wired in
// ---------------------------------------------------------------------------

describe('src/config/index.ts — audio barrel wiring', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/config/index.ts');
  });

  it('imports audio.json', () => {
    expect(src).toContain("from './audio.json'");
  });

  it('exports audio config on config object', () => {
    expect(src).toContain('audio:');
  });

  it('imports AudioConfig type', () => {
    expect(src).toContain('AudioConfig');
  });
});

// ---------------------------------------------------------------------------
// Config types — AudioConfig defined
// ---------------------------------------------------------------------------

describe('src/config/types.ts — AudioConfig type', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/config/types.ts');
  });

  it('defines AudioConfig interface', () => {
    expect(src).toContain('interface AudioConfig');
  });

  it('AudioConfig has challengeTracks', () => {
    expect(src).toContain('challengeTracks');
  });

  it('AudioConfig has crossfadeDuration', () => {
    expect(src).toContain('crossfadeDuration');
  });

  it('defines ChallengeTrackDef interface', () => {
    expect(src).toContain('interface ChallengeTrackDef');
  });
});
