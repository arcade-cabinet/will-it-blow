/**
 * @module KitchenAssembly
 * Pure TypeScript module defining equipment locations and assembly rules.
 *
 * At Medium+ difficulty, the player must FIND equipment parts hidden in
 * cabinets/drawers before they can use stations. This module defines
 * the canonical part list, their default cabinet locations, and the
 * assembly logic that gates station access.
 *
 * No React or Three.js dependencies — pure data + logic.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single equipment part that must be found and assembled. */
export interface EquipmentPart {
  /** Unique part ID, referenced in store.assembledParts */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Which station this part belongs to */
  station: 'grinder' | 'stuffer' | 'stove';
  /** Default cabinet/drawer ID where this part is hidden */
  location: string;
  /** Cabinet or drawer that contains this part */
  cabinetId: string;
}

// ---------------------------------------------------------------------------
// Equipment part definitions
// ---------------------------------------------------------------------------

/**
 * Canonical list of all equipment parts, their stations, and default locations.
 * Part locations are deterministic by default; use randomizeLocations() for
 * extreme difficulty where parts are shuffled each playthrough.
 */
export const EQUIPMENT_PARTS: EquipmentPart[] = [
  // --- Grinder parts ---
  {
    id: 'grinder-motor-housing',
    name: 'Motor Housing',
    station: 'grinder',
    location: 'cabinet-lower-left',
    cabinetId: 'cabinet-lower-left',
  },
  {
    id: 'grinder-faceplate',
    name: 'Faceplate',
    station: 'grinder',
    location: 'drawer-upper-right',
    cabinetId: 'drawer-upper-right',
  },
  {
    id: 'grinder-base',
    name: 'Base Mount',
    station: 'grinder',
    location: 'under-counter',
    cabinetId: 'under-counter',
  },

  // --- Stuffer parts ---
  {
    id: 'stuffer-crank-handle',
    name: 'Crank Handle',
    station: 'stuffer',
    location: 'cabinet-upper-left',
    cabinetId: 'cabinet-upper-left',
  },
  {
    id: 'stuffer-nozzle',
    name: 'Nozzle',
    station: 'stuffer',
    location: 'drawer-lower-right',
    cabinetId: 'drawer-lower-right',
  },
  {
    id: 'stuffer-body',
    name: 'Body Cylinder',
    station: 'stuffer',
    location: 'under-counter',
    cabinetId: 'under-counter',
  },

  // --- Stove parts ---
  {
    id: 'stove-frying-pan',
    name: 'Frying Pan',
    station: 'stove',
    location: 'wall-hook',
    cabinetId: 'wall-hook',
  },
  {
    id: 'stove-oven-mitt',
    name: 'Oven Mitt',
    station: 'stove',
    location: 'drawer-upper-left',
    cabinetId: 'drawer-upper-left',
  },
];

// ---------------------------------------------------------------------------
// Station readiness logic
// ---------------------------------------------------------------------------

/**
 * Returns all part IDs required for a given station.
 *
 * @param station - The station to query ('grinder' | 'stuffer' | 'stove')
 * @returns Array of part IDs that belong to this station
 */
export function getRequiredParts(station: string): string[] {
  return EQUIPMENT_PARTS.filter(p => p.station === station).map(p => p.id);
}

/**
 * Returns true when all parts for the given station have been assembled.
 *
 * @param station - The station to check
 * @param assembledParts - Array of assembled part IDs (from store.assembledParts)
 * @returns true if every required part is in assembledParts
 */
export function isStationReady(station: string, assembledParts: string[]): boolean {
  const required = getRequiredParts(station);
  if (required.length === 0) return true;
  const assembled = new Set(assembledParts);
  return required.every(id => assembled.has(id));
}

// ---------------------------------------------------------------------------
// Deterministic location randomization (extreme difficulty)
// ---------------------------------------------------------------------------

/**
 * All possible cabinet/drawer IDs parts can be shuffled into.
 * Must match CabinetDrawer IDs rendered in the scene.
 */
const VALID_LOCATIONS = [
  'cabinet-lower-left',
  'cabinet-upper-left',
  'cabinet-lower-right',
  'cabinet-upper-right',
  'drawer-upper-left',
  'drawer-upper-right',
  'drawer-lower-left',
  'drawer-lower-right',
  'under-counter',
  'wall-hook',
] as const;

/**
 * Deterministic mulberry32 PRNG — produces the same sequence for the same seed.
 * Used to shuffle part locations reproducibly for a given game session.
 *
 * @param seed - Integer seed value
 * @returns A function that returns the next pseudorandom number in [0, 1)
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/**
 * Fisher-Yates shuffle using a provided PRNG.
 *
 * @param array - Array to shuffle in place
 * @param rand - PRNG function returning values in [0, 1)
 */
function shuffle<T>(array: T[], rand: () => number): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
}

/**
 * Returns a shuffled copy of EQUIPMENT_PARTS with randomized locations.
 * Given the same seed, always produces the same layout — ensures that the
 * store.assembledParts correctly resolves against the shuffled cabinetIds.
 *
 * @param seed - Deterministic seed (e.g. store.variantSeed)
 * @returns New array of EquipmentPart with shuffled location/cabinetId
 */
export function randomizeLocations(seed: number): EquipmentPart[] {
  const rand = mulberry32(seed);

  // Shuffle a pool of location IDs the same length as EQUIPMENT_PARTS
  const locationPool = VALID_LOCATIONS.slice(0, EQUIPMENT_PARTS.length);
  // Pad with cycling values if more parts than locations
  while (locationPool.length < EQUIPMENT_PARTS.length) {
    locationPool.push(VALID_LOCATIONS[locationPool.length % VALID_LOCATIONS.length]);
  }

  const shuffledLocations = [...locationPool] as string[];
  shuffle(shuffledLocations, rand);

  return EQUIPMENT_PARTS.map((part, i) => ({
    ...part,
    location: shuffledLocations[i],
    cabinetId: shuffledLocations[i],
  }));
}
