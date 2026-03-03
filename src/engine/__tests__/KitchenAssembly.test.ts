/**
 * Tests for KitchenAssembly — station readiness, randomization, part lookup.
 */

import {
  EQUIPMENT_PARTS,
  getRequiredParts,
  isStationReady,
  randomizeLocations,
} from '../KitchenAssembly';

// ---------------------------------------------------------------------------
// EQUIPMENT_PARTS — structure validation
// ---------------------------------------------------------------------------

describe('EQUIPMENT_PARTS', () => {
  it('contains parts for all three stations', () => {
    const stations = new Set(EQUIPMENT_PARTS.map(p => p.station));
    expect(stations.has('grinder')).toBe(true);
    expect(stations.has('stuffer')).toBe(true);
    expect(stations.has('stove')).toBe(true);
  });

  it('every part has a unique id', () => {
    const ids = EQUIPMENT_PARTS.map(p => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every part has a non-empty name and cabinetId', () => {
    for (const part of EQUIPMENT_PARTS) {
      expect(part.name.length).toBeGreaterThan(0);
      expect(part.cabinetId.length).toBeGreaterThan(0);
    }
  });

  it('has exactly 3 grinder parts', () => {
    expect(EQUIPMENT_PARTS.filter(p => p.station === 'grinder')).toHaveLength(3);
  });

  it('has exactly 3 stuffer parts', () => {
    expect(EQUIPMENT_PARTS.filter(p => p.station === 'stuffer')).toHaveLength(3);
  });

  it('has exactly 2 stove parts', () => {
    expect(EQUIPMENT_PARTS.filter(p => p.station === 'stove')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getRequiredParts
// ---------------------------------------------------------------------------

describe('getRequiredParts', () => {
  it('returns all grinder part IDs', () => {
    const ids = getRequiredParts('grinder');
    expect(ids.length).toBe(3);
    expect(ids).toContain('grinder-motor-housing');
    expect(ids).toContain('grinder-faceplate');
    expect(ids).toContain('grinder-base');
  });

  it('returns all stuffer part IDs', () => {
    const ids = getRequiredParts('stuffer');
    expect(ids.length).toBe(3);
    expect(ids).toContain('stuffer-crank-handle');
    expect(ids).toContain('stuffer-nozzle');
    expect(ids).toContain('stuffer-body');
  });

  it('returns all stove part IDs', () => {
    const ids = getRequiredParts('stove');
    expect(ids.length).toBe(2);
    expect(ids).toContain('stove-frying-pan');
    expect(ids).toContain('stove-oven-mitt');
  });

  it('returns empty array for unknown station', () => {
    expect(getRequiredParts('unknown-station')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// isStationReady
// ---------------------------------------------------------------------------

describe('isStationReady', () => {
  it('returns false when no parts assembled', () => {
    expect(isStationReady('grinder', [])).toBe(false);
    expect(isStationReady('stuffer', [])).toBe(false);
    expect(isStationReady('stove', [])).toBe(false);
  });

  it('returns false when only some grinder parts assembled', () => {
    expect(isStationReady('grinder', ['grinder-motor-housing', 'grinder-faceplate'])).toBe(false);
  });

  it('returns true when all grinder parts assembled', () => {
    expect(
      isStationReady('grinder', ['grinder-motor-housing', 'grinder-faceplate', 'grinder-base']),
    ).toBe(true);
  });

  it('returns true when all stuffer parts assembled', () => {
    expect(
      isStationReady('stuffer', ['stuffer-crank-handle', 'stuffer-nozzle', 'stuffer-body']),
    ).toBe(true);
  });

  it('returns true when all stove parts assembled', () => {
    expect(isStationReady('stove', ['stove-frying-pan', 'stove-oven-mitt'])).toBe(true);
  });

  it('returns false with only one stove part', () => {
    expect(isStationReady('stove', ['stove-frying-pan'])).toBe(false);
  });

  it('returns true when assembledParts contains all required plus extras', () => {
    const assembled = [
      'grinder-motor-housing',
      'grinder-faceplate',
      'grinder-base',
      'stove-frying-pan', // extra part from other station
    ];
    expect(isStationReady('grinder', assembled)).toBe(true);
  });

  it('returns true for unknown station (no required parts)', () => {
    expect(isStationReady('unknown-station', [])).toBe(true);
  });

  it('does not modify the assembledParts array', () => {
    const arr = ['grinder-motor-housing'];
    const before = [...arr];
    isStationReady('grinder', arr);
    expect(arr).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// randomizeLocations
// ---------------------------------------------------------------------------

describe('randomizeLocations', () => {
  it('returns the same number of parts as EQUIPMENT_PARTS', () => {
    const result = randomizeLocations(12345);
    expect(result).toHaveLength(EQUIPMENT_PARTS.length);
  });

  it('preserves part IDs, names, and stations', () => {
    const result = randomizeLocations(12345);
    for (let i = 0; i < EQUIPMENT_PARTS.length; i++) {
      expect(result[i].id).toBe(EQUIPMENT_PARTS[i].id);
      expect(result[i].name).toBe(EQUIPMENT_PARTS[i].name);
      expect(result[i].station).toBe(EQUIPMENT_PARTS[i].station);
    }
  });

  it('is deterministic — same seed produces same locations', () => {
    const a = randomizeLocations(42);
    const b = randomizeLocations(42);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].location).toBe(b[i].location);
      expect(a[i].cabinetId).toBe(b[i].cabinetId);
    }
  });

  it('different seeds produce different layouts (most of the time)', () => {
    const a = randomizeLocations(1);
    const b = randomizeLocations(9999);
    // At least one part should have a different location
    const differ = a.some((part, i) => part.location !== b[i].location);
    expect(differ).toBe(true);
  });

  it('all assigned locations are non-empty strings', () => {
    const result = randomizeLocations(999);
    for (const part of result) {
      expect(typeof part.location).toBe('string');
      expect(part.location.length).toBeGreaterThan(0);
    }
  });

  it('does not mutate the original EQUIPMENT_PARTS array', () => {
    const originalLocations = EQUIPMENT_PARTS.map(p => p.location);
    randomizeLocations(777);
    const afterLocations = EQUIPMENT_PARTS.map(p => p.location);
    expect(afterLocations).toEqual(originalLocations);
  });
});
