/**
 * @module GameOrchestrator.test
 * Tests for GameOrchestrator PHASES array completeness and phase navigation.
 * Uses the exported PHASES constant and pure helper functions.
 */
import type {GamePhase} from '../../store/gameStore';
import {PHASES, nextPhase, prevPhase} from '../GameOrchestrator';

// ---------------------------------------------------------------------------
// All GamePhase values — authoritative list from the store type
// ---------------------------------------------------------------------------

const ALL_GAME_PHASES: GamePhase[] = [
  'SELECT_INGREDIENTS',
  'CHOPPING',
  'FILL_GRINDER',
  'GRINDING',
  'MOVE_BOWL',
  'ATTACH_CASING',
  'STUFFING',
  'TIE_CASING',
  'BLOWOUT',
  'MOVE_SAUSAGE',
  'MOVE_PAN',
  'COOKING',
  'DONE',
];

// ---------------------------------------------------------------------------
// PHASES array completeness
// ---------------------------------------------------------------------------

describe('PHASES array', () => {
  it('contains all 13 GamePhase values', () => {
    expect(PHASES).toHaveLength(13);
  });

  it('includes every GamePhase value', () => {
    for (const phase of ALL_GAME_PHASES) {
      expect(PHASES).toContain(phase);
    }
  });

  it('has no duplicate entries', () => {
    const unique = new Set(PHASES);
    expect(unique.size).toBe(PHASES.length);
  });

  it('starts with SELECT_INGREDIENTS', () => {
    expect(PHASES[0]).toBe('SELECT_INGREDIENTS');
  });

  it('ends with DONE', () => {
    expect(PHASES[PHASES.length - 1]).toBe('DONE');
  });

  it('places TIE_CASING after STUFFING', () => {
    const stuffIdx = PHASES.indexOf('STUFFING');
    const tieIdx = PHASES.indexOf('TIE_CASING');
    expect(tieIdx).toBe(stuffIdx + 1);
  });

  it('places BLOWOUT after TIE_CASING', () => {
    const tieIdx = PHASES.indexOf('TIE_CASING');
    const blowIdx = PHASES.indexOf('BLOWOUT');
    expect(blowIdx).toBe(tieIdx + 1);
  });
});

// ---------------------------------------------------------------------------
// nextPhase helper
// ---------------------------------------------------------------------------

describe('nextPhase', () => {
  it('advances from SELECT_INGREDIENTS to CHOPPING', () => {
    expect(nextPhase('SELECT_INGREDIENTS')).toBe('CHOPPING');
  });

  it('advances through all 13 phases in order', () => {
    let current: GamePhase = PHASES[0];
    for (let i = 1; i < PHASES.length; i++) {
      const next = nextPhase(current);
      expect(next).toBe(PHASES[i]);
      current = next!;
    }
  });

  it('returns null at the last phase (DONE)', () => {
    expect(nextPhase('DONE')).toBeNull();
  });

  it('advances from STUFFING to TIE_CASING', () => {
    expect(nextPhase('STUFFING')).toBe('TIE_CASING');
  });

  it('advances from TIE_CASING to BLOWOUT', () => {
    expect(nextPhase('TIE_CASING')).toBe('BLOWOUT');
  });

  it('advances from BLOWOUT to MOVE_SAUSAGE', () => {
    expect(nextPhase('BLOWOUT')).toBe('MOVE_SAUSAGE');
  });
});

// ---------------------------------------------------------------------------
// prevPhase helper
// ---------------------------------------------------------------------------

describe('prevPhase', () => {
  it('returns null at the first phase (SELECT_INGREDIENTS)', () => {
    expect(prevPhase('SELECT_INGREDIENTS')).toBeNull();
  });

  it('goes back from CHOPPING to SELECT_INGREDIENTS', () => {
    expect(prevPhase('CHOPPING')).toBe('SELECT_INGREDIENTS');
  });

  it('goes back from DONE to COOKING', () => {
    expect(prevPhase('DONE')).toBe('COOKING');
  });

  it('goes back from TIE_CASING to STUFFING', () => {
    expect(prevPhase('TIE_CASING')).toBe('STUFFING');
  });

  it('goes back from BLOWOUT to TIE_CASING', () => {
    expect(prevPhase('BLOWOUT')).toBe('TIE_CASING');
  });

  it('navigates backward through all 13 phases', () => {
    let current: GamePhase = PHASES[PHASES.length - 1];
    for (let i = PHASES.length - 2; i >= 0; i--) {
      const prev = prevPhase(current);
      expect(prev).toBe(PHASES[i]);
      current = prev!;
    }
  });
});
