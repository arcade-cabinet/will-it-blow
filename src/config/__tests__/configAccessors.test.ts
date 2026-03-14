/**
 * Tests for all config JSON accessor modules.
 * Verifies typed imports, lookup functions, and data integrity.
 */

import {cameraConfig} from '../camera';
import {demandsConfig, getCookTarget} from '../demands';
import {dialogueConfig, getPhaseMessage} from '../dialogue';
import {getReactionQuip, getRoundsForDifficulty, roundsConfig} from '../rounds';
import {getTitleTierForScore, getVerdictRank, sausageConfig} from '../sausage';
import {
  getChallengePattern,
  getStationForChallenge,
  getTotalChallenges,
  stationsConfig,
} from '../stations';
import {getUIColor, uiConfig} from '../ui';

// ── Demands ──

describe('demands config', () => {
  it('has cook targets for all four preferences', () => {
    expect(demandsConfig.cookTargets.rare).toBe(0.15);
    expect(demandsConfig.cookTargets.medium).toBe(0.45);
    expect(demandsConfig.cookTargets['well-done']).toBe(0.75);
    expect(demandsConfig.cookTargets.charred).toBe(0.95);
  });

  it('getCookTarget returns correct values', () => {
    expect(getCookTarget('rare')).toBe(0.15);
    expect(getCookTarget('unknown')).toBe(0.45);
  });
});

// ── Dialogue ──

describe('dialogue config', () => {
  it('has phase messages', () => {
    expect(dialogueConfig.phaseMessages).toBeDefined();
    expect(dialogueConfig.idleThreshold).toBe(10);
  });

  it('getPhaseMessage returns message for known phases', () => {
    expect(getPhaseMessage('intro')).toBeTruthy();
    expect(getPhaseMessage('CHOPPING')).toBeTruthy();
  });

  it('getPhaseMessage returns empty string for unknown phases', () => {
    expect(getPhaseMessage('nonexistent')).toBe('');
  });
});

// ── Camera ──

describe('camera config', () => {
  it('has hands configuration', () => {
    expect(cameraConfig.hands).toBeDefined();
    expect(cameraConfig.hands.offset).toHaveLength(3);
    expect(cameraConfig.hands.bobSpeed).toBeGreaterThan(0);
  });

  it('has skin paths', () => {
    expect(cameraConfig.skins.length).toBeGreaterThan(0);
    for (const skin of cameraConfig.skins) {
      expect(skin).toMatch(/\.png$/);
    }
  });
});

// ── Rounds ──

describe('rounds config', () => {
  it('has rounds-by-difficulty mapping', () => {
    expect(roundsConfig.roundsByDifficulty.rare).toBe(3);
    expect(roundsConfig.roundsByDifficulty.medium).toBe(5);
    expect(roundsConfig.roundsByDifficulty['well-done']).toBe(10);
  });

  it('getRoundsForDifficulty returns correct values', () => {
    expect(getRoundsForDifficulty('rare')).toBe(3);
    expect(getRoundsForDifficulty('unknown')).toBe(5);
  });

  it('getReactionQuip returns quips by score threshold', () => {
    expect(getReactionQuip(95)).toBe('Adequate. BARELY.');
    expect(getReactionQuip(80)).toContain('improving');
    expect(getReactionQuip(55)).toContain('Mediocre');
    expect(getReactionQuip(20)).toContain('Disgusting');
  });
});

// ── Sausage ──

describe('sausage config', () => {
  it('has scoring parameters', () => {
    expect(sausageConfig.scoring.maxScore).toBe(100);
    expect(sausageConfig.scoring.tasteWeight).toBe(0.6);
  });

  it('has title tiers in ascending threshold order', () => {
    const tiers = sausageConfig.titleTiers;
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].threshold).toBeGreaterThanOrEqual(tiers[i - 1].threshold);
    }
  });

  it('getTitleTierForScore returns correct tiers', () => {
    expect(getTitleTierForScore(0)).toBe('Sausage Disaster');
    expect(getTitleTierForScore(100)).toBe('THE SAUSAGE KING');
  });

  it('getVerdictRank returns correct ranks', () => {
    expect(getVerdictRank(92)).toBe('S');
    expect(getVerdictRank(75)).toBe('A');
    expect(getVerdictRank(50)).toBe('B');
    expect(getVerdictRank(49)).toBe('F');
  });
});

// ── Stations ──

describe('stations config', () => {
  it('has 7 challenges', () => {
    expect(stationsConfig.challengeOrder).toHaveLength(7);
  });

  it('getStationForChallenge returns station names', () => {
    expect(getStationForChallenge('ingredients')).toBe('fridge');
    expect(getStationForChallenge('grinding')).toBe('grinder');
    expect(getStationForChallenge('unknown')).toBe('');
  });

  it('getChallengePattern returns correct patterns', () => {
    expect(getChallengePattern('ingredients')).toBe('bridge');
    expect(getChallengePattern('chopping')).toBe('ecs-orchestrator');
  });

  it('getTotalChallenges returns 7', () => {
    expect(getTotalChallenges()).toBe(7);
  });
});

// ── UI ──

describe('ui config', () => {
  it('has color definitions', () => {
    expect(uiConfig.colors.background).toBe('#0a0a0a');
    expect(uiConfig.colors.primary).toBe('#ff4444');
  });

  it('has transition durations', () => {
    expect(uiConfig.transitions.fadeInMs).toBe(300);
  });

  it('getUIColor returns correct values', () => {
    expect(getUIColor('background')).toBe('#0a0a0a');
    expect(getUIColor('text')).toBe('#ffffff');
  });
});
