import {config} from '../../../config';
import {CHALLENGE_ORDER, pickVariant} from '../../../engine/ChallengeRegistry';

describe('ChoppingOrchestrator', () => {
  it('chopping is in the challenge order at index 1', () => {
    expect(CHALLENGE_ORDER[1]).toBe('chopping');
  });

  it('pickVariant returns a valid chopping variant', () => {
    const variant = pickVariant('chopping', 42);
    expect(variant).not.toBeNull();
    expect(variant).toHaveProperty('chopCount');
    expect(variant).toHaveProperty('knifeSpeed');
    expect(variant).toHaveProperty('sweetSpotSize');
    expect(variant).toHaveProperty('timerSeconds');
  });

  it('chopping gameplay config has expected fields', () => {
    const gc = config.gameplay.chopping;
    expect(gc.goodChopProgress).toBeGreaterThan(0);
    expect(gc.badChopProgress).toBeGreaterThan(0);
    expect(gc.knifeBaseFrequency).toBeGreaterThan(0);
    expect(gc.knifeAmplitude).toBeGreaterThan(0);
    expect(gc.dialogueDurationMs).toBeGreaterThan(0);
    expect(gc.successDelayMs).toBeGreaterThan(0);
    expect(gc.scorePenaltyPerStrike).toBeGreaterThan(0);
    expect(gc.streakBonusThreshold).toBeGreaterThan(0);
    expect(gc.streakFlairPoints).toBeGreaterThan(0);
    expect(gc.missStrikeCooldownMs).toBeGreaterThan(0);
  });

  it('chopping variants have valid constraints', () => {
    const variants = config.variants.chopping;
    expect(variants.length).toBeGreaterThan(0);
    for (const v of variants) {
      expect(v.chopCount).toBeGreaterThan(0);
      expect(v.knifeSpeed).toBeGreaterThan(0);
      expect(v.sweetSpotSize).toBeGreaterThan(0);
      expect(v.sweetSpotSize).toBeLessThanOrEqual(1);
      expect(v.timerSeconds).toBeGreaterThan(0);
    }
  });

  it('cutting-board station target resolves with triggerRadius > 0', () => {
    const {mergeLayoutConfigs, resolveLayout} = require('../../../engine/layout');
    const {DEFAULT_ROOM} = require('../../../engine/FurnitureLayout');
    const targets = resolveLayout(
      mergeLayoutConfigs(config.layout.room, config.layout.rails, config.layout.placements),
      DEFAULT_ROOM,
    ).targets;
    expect(targets['cutting-board']).toBeDefined();
    expect(targets['cutting-board'].triggerRadius).toBeGreaterThan(0);
    expect(targets['cutting-board'].markerY).toBeDefined();
  });

  it('source imports from correct modules', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../ChoppingOrchestrator.tsx'), 'utf8');
    expect(source).toContain("pickVariant('chopping'");
    expect(source).toContain('setChallengeProgress');
    expect(source).toContain('setChallengeTimeRemaining');
    expect(source).toContain('setChallengePhase');
    expect(source).toContain('completeChallenge');
    expect(source).toContain('addStrike');
    expect(source).toContain('handleChop');
    expect(source).toContain('knifeRef');
  });

  it('TOTAL_CHALLENGES is now 6 in store', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../../../store/gameStore.ts'), 'utf8');
    expect(source).toContain('TOTAL_CHALLENGES = 6');
  });
});
