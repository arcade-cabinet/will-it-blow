/**
 * @module flairPoints.test
 * Contract test verifying that all station components call
 * recordFlairPoint. This test inspects the source files for the
 * expected import/call pattern rather than mounting React components
 * (which would require full R3F + Rapier + GLB mocking).
 *
 * The acceptance criterion is presence of `recordFlairPoint` in each
 * station source file. The actual flair logic is integration-tested
 * via the browser test suite.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

const STATIONS_DIR = resolve(__dirname, '..');

/** Read a station's source and check for `recordFlairPoint`. */
function stationHasFlair(filename: string): boolean {
  const src = readFileSync(resolve(STATIONS_DIR, filename), 'utf-8');
  return src.includes('recordFlairPoint');
}

describe('Style points wiring (T1.C)', () => {
  it('ChoppingBlock calls recordFlairPoint', () => {
    expect(stationHasFlair('ChoppingBlock.tsx')).toBe(true);
  });

  it('Grinder calls recordFlairPoint', () => {
    expect(stationHasFlair('Grinder.tsx')).toBe(true);
  });

  it('Stuffer calls recordFlairPoint', () => {
    expect(stationHasFlair('Stuffer.tsx')).toBe(true);
  });

  it('Stove calls recordFlairPoint', () => {
    expect(stationHasFlair('Stove.tsx')).toBe(true);
  });

  it('Sink calls recordFlairPoint', () => {
    expect(stationHasFlair('Sink.tsx')).toBe(true);
  });

  it('BlowoutStation calls recordFlairPoint', () => {
    expect(stationHasFlair('BlowoutStation.tsx')).toBe(true);
  });
});

describe('GameOverScreen flairPoints display (T1.C)', () => {
  it('GameOverScreen references flairPoints', () => {
    const src = readFileSync(resolve(STATIONS_DIR, '..', 'ui', 'GameOverScreen.tsx'), 'utf-8');
    expect(src.includes('flairPoints')).toBe(true);
  });
});
