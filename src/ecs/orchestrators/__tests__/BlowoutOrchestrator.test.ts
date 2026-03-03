/**
 * Tests for BlowoutOrchestrator — phase transitions, scoring, config.
 *
 * We test at the source-code level (inspecting the file) and at the
 * config level (validating tunable values), mirroring the style of
 * CookingOrchestrator.test.ts. Full React integration tests are
 * covered by the store test for casingTied / blowoutScore actions.
 */

import {config} from '../../../config';

describe('BlowoutOrchestrator — blowout config', () => {
  it('config has all required tunables', () => {
    const c = config.gameplay.blowout;
    expect(typeof c.timerSeconds).toBe('number');
    expect(typeof c.maxPressure).toBe('number');
    expect(typeof c.pressureDecayRate).toBe('number');
    expect(typeof c.pressureBuildRate).toBe('number');
    expect(typeof c.particleCount).toBe('number');
    expect(typeof c.particleGravity).toBe('number');
    expect(typeof c.coveragePerHit).toBe('number');
    expect(typeof c.floorPenaltyPerHit).toBe('number');
    expect(typeof c.fastTieThresholdMs).toBe('number');
    expect(typeof c.fastTieFlairPoints).toBe('number');
    expect(typeof c.completeDelaySec).toBe('number');
  });

  it('timerSeconds is positive', () => {
    expect(config.gameplay.blowout.timerSeconds).toBeGreaterThan(0);
  });

  it('maxPressure is positive', () => {
    expect(config.gameplay.blowout.maxPressure).toBeGreaterThan(0);
  });

  it('particleCount is at least 8', () => {
    expect(config.gameplay.blowout.particleCount).toBeGreaterThanOrEqual(8);
  });

  it('coveragePerHit and floorPenaltyPerHit are positive', () => {
    expect(config.gameplay.blowout.coveragePerHit).toBeGreaterThan(0);
    expect(config.gameplay.blowout.floorPenaltyPerHit).toBeGreaterThan(0);
  });

  it('fastTieFlairPoints matches expected value', () => {
    expect(config.gameplay.blowout.fastTieFlairPoints).toBe(5);
  });

  it('boxPosition is a three-element array', () => {
    expect(Array.isArray(config.gameplay.blowout.boxPosition)).toBe(true);
    expect((config.gameplay.blowout.boxPosition as number[]).length).toBe(3);
  });
});

describe('BlowoutOrchestrator — source structure', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source: string = fs.readFileSync(
    path.resolve(__dirname, '../BlowoutOrchestrator.tsx'),
    'utf8',
  );

  it('imports from three/webgpu', () => {
    expect(source).toContain("from 'three/webgpu'");
  });

  it('has OrchestratorPhase including tie and blow', () => {
    expect(source).toContain("'tie'");
    expect(source).toContain("'blow'");
    expect(source).toContain("'score'");
  });

  it('reads casingTied from store', () => {
    expect(source).toContain('casingTied');
  });

  it('calls setBlowoutScore and completeChallenge', () => {
    expect(source).toContain('setBlowoutScore');
    expect(source).toContain('completeChallenge');
  });

  it('applies floor penalty to final score', () => {
    expect(source).toContain('floorPenaltyPerHit');
    expect(source).toContain('floorHitsRef');
  });

  it('uses InputManager for hold mechanic', () => {
    expect(source).toContain("isActionHeld('interact')");
  });

  it('particle emission calls emitBurst', () => {
    expect(source).toContain('emitBurst');
  });

  it('writes challengePhase transitions', () => {
    expect(source).toContain("setChallengePhase('dialogue')");
    expect(source).toContain("setChallengePhase('success')");
    expect(source).toContain("setChallengePhase('complete')");
  });
});

describe('BlowoutOrchestrator — TieGesture source structure', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source: string = fs.readFileSync(
    path.resolve(__dirname, '../../../components/challenges/TieGesture.tsx'),
    'utf8',
  );

  it('calls setCasingTied(true) when both ends tied', () => {
    expect(source).toContain('setCasingTied(true)');
  });

  it('records flair point for fast ties', () => {
    expect(source).toContain("recordFlairPoint('fast-tie', 5)");
  });

  it('has two distinct tie point buttons', () => {
    expect(source).toContain('testID="tie-left"');
    expect(source).toContain('testID="tie-right"');
  });
});

describe('BlowoutOrchestrator — BlowoutHUD source structure', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source: string = fs.readFileSync(
    path.resolve(__dirname, '../../../components/challenges/BlowoutHUD.tsx'),
    'utf8',
  );

  it('renders TieGesture when active and not yet tied', () => {
    expect(source).toContain('TieGesture');
    expect(source).toContain('!casingTied');
  });

  it('shows coverage gauge and timer when blow phase active', () => {
    expect(source).toContain('challengeProgress');
    expect(source).toContain('challengeTimeRemaining');
    expect(source).toContain('COVERAGE');
  });

  it('shows BLOW prompt during blow phase', () => {
    expect(source).toContain('HOLD TO BLOW');
  });

  it('has zero input handling (no gesture handlers except delegating to TieGesture)', () => {
    // HUD should not contain input state (no useState for game logic)
    // It's ok to have useState for animation, but not for game-logic state
    expect(source).not.toContain('useState(false)'); // no local game state
  });
});

describe('BlowoutOrchestrator — CerealBox source structure', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source: string = fs.readFileSync(
    path.resolve(__dirname, '../../../components/kitchen/CerealBox.tsx'),
    'utf8',
  );

  it('uses CanvasTexture for front face branding', () => {
    expect(source).toContain('CanvasTexture');
  });

  it('has onSplatReady callback for particle hits', () => {
    expect(source).toContain('onSplatReady');
  });

  it('updates texture needsUpdate on splat', () => {
    expect(source).toContain('needsUpdate = true');
  });

  it('disposes textures on unmount', () => {
    expect(source).toContain('dispose()');
  });
});
