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

  it('defines SpatialSoundDef interface', () => {
    expect(src).toContain('interface SpatialSoundDef');
  });

  it('AudioConfig has spatialSounds field', () => {
    expect(src).toContain('spatialSounds');
  });
});

// ---------------------------------------------------------------------------
// Spatial Audio — Web engine
// ---------------------------------------------------------------------------

describe('AudioEngine.web.ts — spatial audio methods', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/engine/AudioEngine.web.ts');
  });

  it('has setListenerPosition method', () => {
    expect(src).toContain('setListenerPosition(');
  });

  it('has setListenerOrientation method', () => {
    expect(src).toContain('setListenerOrientation(');
  });

  it('has playSpatial method', () => {
    expect(src).toContain('playSpatial(');
  });

  it('has stopSpatial method', () => {
    expect(src).toContain('stopSpatial(');
  });

  it('has startSpatialAmbient method', () => {
    expect(src).toContain('startSpatialAmbient(');
  });

  it('has stopSpatialAmbient method', () => {
    expect(src).toContain('stopSpatialAmbient(');
  });

  it('uses Panner3D for spatial positioning', () => {
    expect(src).toContain('Panner3D');
  });

  it('uses HRTF panning model for immersive audio', () => {
    expect(src).toContain('HRTF');
  });

  it('checks spatialAudioEnabled from store before playing', () => {
    expect(src).toContain('spatialAudioEnabled');
  });

  it('reads spatialSounds from config for ambient setup', () => {
    expect(src).toContain('config.audio.spatialSounds');
  });

  it('updates Web Audio API listener position', () => {
    expect(src).toContain('listener.positionX');
  });

  it('updates Web Audio API listener orientation', () => {
    expect(src).toContain('listener.forwardX');
  });

  it('cleans up spatial sources in stopEngine', () => {
    expect(src).toContain('stopSpatialAmbient()');
  });

  it('tracks spatial sources in a Map', () => {
    expect(src).toContain('spatialSources');
  });
});

// ---------------------------------------------------------------------------
// Spatial Audio — Native engine stubs
// ---------------------------------------------------------------------------

describe('AudioEngine.ts (native) — spatial audio stubs', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/engine/AudioEngine.ts');
  });

  it('has setListenerPosition stub', () => {
    expect(src).toContain('setListenerPosition(');
  });

  it('has setListenerOrientation stub', () => {
    expect(src).toContain('setListenerOrientation(');
  });

  it('has playSpatial stub', () => {
    expect(src).toContain('playSpatial(');
  });

  it('has stopSpatial stub', () => {
    expect(src).toContain('stopSpatial(');
  });

  it('has startSpatialAmbient stub', () => {
    expect(src).toContain('startSpatialAmbient(');
  });

  it('has stopSpatialAmbient stub', () => {
    expect(src).toContain('stopSpatialAmbient(');
  });
});

// ---------------------------------------------------------------------------
// Native engine: music track support
// ---------------------------------------------------------------------------

describe('AudioEngine.ts (native) — music track support', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/engine/AudioEngine.ts');
  });

  it('imports config for challenge track definitions', () => {
    expect(src).toContain("from '../config'");
  });

  it('imports getAssetUrl for audio file resolution', () => {
    expect(src).toContain("from './assetUrl'");
  });

  it('imports useGameStore for volume/mute reactivity', () => {
    expect(src).toContain("from '../store/gameStore'");
  });

  it('has ambientTrack field for persistent music', () => {
    expect(src).toContain('ambientTrack');
  });

  it('has challengePlayer field for challenge music', () => {
    expect(src).toContain('challengePlayer');
  });

  it('startAmbientDrone creates a looping audio player', () => {
    expect(src).toContain('player.loop = true');
  });

  it('startChallengeTrack reads track definition from config', () => {
    expect(src).toContain('config.audio.challengeTracks');
  });

  it('stopChallengeTrack restores ambient volume', () => {
    expect(src).toContain('ambientTrack');
  });

  it('stopEngine cleans up ambient and challenge tracks', () => {
    expect(src).toContain('stopAmbientDrone()');
    expect(src).toContain('stopChallengeTrack()');
  });
});

// ---------------------------------------------------------------------------
// Audio config JSON — spatial sounds shape
// ---------------------------------------------------------------------------

describe('src/config/audio.json — spatialSounds shape', () => {
  let cfg: Record<string, unknown>;

  beforeAll(() => {
    cfg = readJson('src/config/audio.json') as Record<string, unknown>;
  });

  it('has spatialSounds section', () => {
    expect(cfg.spatialSounds).toBeDefined();
  });

  it('spatialSounds contains fridge_hum', () => {
    const spatial = cfg.spatialSounds as Record<string, unknown>;
    expect(spatial.fridge_hum).toBeDefined();
  });

  it('spatialSounds contains stove_sizzle', () => {
    const spatial = cfg.spatialSounds as Record<string, unknown>;
    expect(spatial.stove_sizzle).toBeDefined();
  });

  it('each spatial sound has required fields', () => {
    const spatial = cfg.spatialSounds as Record<
      string,
      {
        file: string;
        volume: number;
        position: number[];
        refDistance: number;
        maxDistance: number;
        rolloffFactor: number;
        loop: boolean;
      }
    >;
    for (const [, def] of Object.entries(spatial)) {
      expect(typeof def.file).toBe('string');
      expect(typeof def.volume).toBe('number');
      expect(Array.isArray(def.position)).toBe(true);
      expect(def.position).toHaveLength(3);
      expect(typeof def.refDistance).toBe('number');
      expect(typeof def.maxDistance).toBe('number');
      expect(typeof def.rolloffFactor).toBe('number');
      expect(typeof def.loop).toBe('boolean');
    }
  });
});

// ---------------------------------------------------------------------------
// FPSController — audio listener sync
// ---------------------------------------------------------------------------

describe('FPSController — spatial audio listener wiring', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/components/controls/FPSController.tsx');
  });

  it('imports audioEngine', () => {
    expect(src).toContain("from '../../engine/AudioEngine'");
  });

  it('calls setListenerPosition in the sync block', () => {
    expect(src).toContain('audioEngine.setListenerPosition(');
  });

  it('calls setListenerOrientation in the sync block', () => {
    expect(src).toContain('audioEngine.setListenerOrientation(');
  });
});

// ---------------------------------------------------------------------------
// Store — spatialAudioEnabled setting
// ---------------------------------------------------------------------------

describe('gameStore — spatialAudioEnabled', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/store/gameStore.ts');
  });

  it('has spatialAudioEnabled field in GameState', () => {
    expect(src).toContain('spatialAudioEnabled');
  });

  it('has setSpatialAudioEnabled action', () => {
    expect(src).toContain('setSpatialAudioEnabled');
  });

  it('defaults spatialAudioEnabled to true', () => {
    expect(src).toContain('spatialAudioEnabled: true');
  });

  it('persists spatialAudioEnabled in partialize', () => {
    // Check that the partialize function includes spatialAudioEnabled
    expect(src).toContain('spatialAudioEnabled: state.spatialAudioEnabled');
  });
});

// ---------------------------------------------------------------------------
// Victory/defeat/enemy track support in startChallengeTrack
// ---------------------------------------------------------------------------

describe('AudioEngine.web.ts — special track key fallback', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/engine/AudioEngine.web.ts');
  });

  it('falls back to victoryTrack for "victory" key', () => {
    expect(src).toContain("challengeType === 'victory'");
    expect(src).toContain('config.audio.victoryTrack');
  });

  it('falls back to enemyTrack for "enemy" key', () => {
    expect(src).toContain("challengeType === 'enemy'");
    expect(src).toContain('config.audio.enemyTrack');
  });

  it('falls back to defeatTrack for "defeat" key', () => {
    expect(src).toContain("challengeType === 'defeat'");
    expect(src).toContain('config.audio.defeatTrack');
  });
});

describe('AudioEngine.ts (native) — special track key fallback', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/engine/AudioEngine.ts');
  });

  it('falls back to victoryTrack for "victory" key', () => {
    expect(src).toContain("challengeType === 'victory'");
    expect(src).toContain('config.audio.victoryTrack');
  });

  it('falls back to defeatTrack for "defeat" key', () => {
    expect(src).toContain("challengeType === 'defeat'");
    expect(src).toContain('config.audio.defeatTrack');
  });
});

// ---------------------------------------------------------------------------
// Audio config JSON — victoryTrack
// ---------------------------------------------------------------------------

describe('src/config/audio.json — victoryTrack', () => {
  let cfg: Record<string, unknown>;

  beforeAll(() => {
    cfg = readJson('src/config/audio.json') as Record<string, unknown>;
  });

  it('has victoryTrack', () => {
    expect(cfg.victoryTrack).toBeDefined();
  });

  it('victoryTrack has file and volume', () => {
    const track = cfg.victoryTrack as {file: string; volume: number};
    expect(typeof track.file).toBe('string');
    expect(typeof track.volume).toBe('number');
  });

  it('all track files use music/ subdirectory', () => {
    const tracks = cfg.challengeTracks as Record<string, {file: string}>;
    for (const [, track] of Object.entries(tracks)) {
      expect(track.file).toMatch(/^music\//);
    }
    const victory = cfg.victoryTrack as {file: string};
    expect(victory.file).toMatch(/^music\//);
    const enemy = cfg.enemyTrack as {file: string};
    expect(enemy.file).toMatch(/^music\//);
    const defeat = cfg.defeatTrack as {file: string};
    expect(defeat.file).toMatch(/^music\//);
  });
});

// ---------------------------------------------------------------------------
// Music files exist on disk
// ---------------------------------------------------------------------------

describe('public/audio/music/ — track files exist', () => {
  // Music files live in public/audio/music/ but are NOT committed to git
  // (large binary assets hosted externally). Skip in CI where they don't exist.
  const musicDir = path.join(ROOT, 'public/audio/music');
  const hasMusicDir = fs.existsSync(musicDir);

  (hasMusicDir ? it : it.skip)('all config-referenced tracks exist on disk', () => {
    const cfg = readJson('src/config/audio.json') as Record<string, unknown>;
    const allFiles: string[] = [];

    const tracks = cfg.challengeTracks as Record<string, {file: string}>;
    for (const t of Object.values(tracks)) allFiles.push(t.file);
    allFiles.push((cfg.victoryTrack as {file: string}).file);
    allFiles.push((cfg.enemyTrack as {file: string}).file);
    allFiles.push((cfg.defeatTrack as {file: string}).file);

    for (const file of allFiles) {
      const fullPath = path.join(ROOT, 'public/audio', file);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// useChallengeMusic hook — source analysis
// ---------------------------------------------------------------------------

describe('src/hooks/useChallengeMusic.ts — hook structure', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/hooks/useChallengeMusic.ts');
  });

  it('imports audioEngine', () => {
    expect(src).toContain("from '../engine/AudioEngine'");
  });

  it('imports CHALLENGE_ORDER from ChallengeManifest', () => {
    expect(src).toContain("from '../engine/ChallengeManifest'");
  });

  it('imports useGameStore', () => {
    expect(src).toContain("from '../store/gameStore'");
  });

  it('calls startAmbientDrone when game begins', () => {
    expect(src).toContain('audioEngine.startAmbientDrone()');
  });

  it('calls startChallengeTrack with challenge ID', () => {
    expect(src).toContain('audioEngine.startChallengeTrack(challengeId)');
  });

  it('calls stopChallengeTrack on challenge completion', () => {
    expect(src).toContain('audioEngine.stopChallengeTrack()');
  });

  it('handles victory game status', () => {
    expect(src).toContain("gameStatus === 'victory'");
  });

  it('handles defeat game status', () => {
    expect(src).toContain("gameStatus === 'defeat'");
  });

  it('plays victory track on victory', () => {
    expect(src).toContain("startChallengeTrack('victory')");
  });

  it('plays defeat track on defeat', () => {
    expect(src).toContain("startChallengeTrack('defeat')");
  });
});

// ---------------------------------------------------------------------------
// GameWorld wires useChallengeMusic
// ---------------------------------------------------------------------------

describe('GameWorld.tsx — useChallengeMusic wiring', () => {
  let src: string;

  beforeAll(() => {
    src = readSource('src/components/GameWorld.tsx');
  });

  it('imports useChallengeMusic', () => {
    expect(src).toContain("from '../hooks/useChallengeMusic'");
  });

  it('calls useChallengeMusic() in SceneContent', () => {
    expect(src).toContain('useChallengeMusic()');
  });
});
