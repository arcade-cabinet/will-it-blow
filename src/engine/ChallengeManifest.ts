/**
 * @module ChallengeManifest
 * Data-driven challenge configuration loaded from manifest.json.
 *
 * Replaces hardcoded challenge index checks scattered across App.tsx,
 * GameWorld.tsx, VRHUDLayer.tsx, and gameStore.ts with a single config-driven
 * lookup. To add/remove/reorder challenges, edit manifest.json only.
 */

import manifestData from '../config/challenges/manifest.json';

/** Actions that fire when a challenge completes. */
export interface ChallengeMilestone {
  on: 'complete';
  action: 'set-bowl-position' | 'reset-sausage-placed';
  value?: string;
}

/** A single challenge entry from the manifest. */
export interface ChallengeEntry {
  id: string;
  name: string;
  station: string;
  pattern: 'bridge' | 'ecs-orchestrator';
  cameraOffset: [number, number, number];
  description: string;
  quip: string;
  milestones: ChallengeMilestone[];
}

/** The full manifest — ordered array of challenge entries. */
const MANIFEST: ChallengeEntry[] = manifestData.challenges as ChallengeEntry[];

/** Ordered challenge IDs — derived from manifest, replaces hardcoded CHALLENGE_ORDER. */
export const CHALLENGE_ORDER: string[] = MANIFEST.map(c => c.id);

/** Total number of challenges — derived from manifest length. */
export const TOTAL_CHALLENGES = MANIFEST.length;

// ---------------------------------------------------------------------------
// Milestone index constants — derived from manifest milestones
// ---------------------------------------------------------------------------

/**
 * Challenge index after which the bowl moves to "grinder-output".
 * Derived from manifest: the challenge that has a "set-bowl-position" milestone with value "grinder-output".
 */
export const CHALLENGE_INDEX_BOWL_GRINDER_OUTPUT: number = (() => {
  const idx = MANIFEST.findIndex(c =>
    c.milestones.some(m => m.action === 'set-bowl-position' && m.value === 'grinder-output'),
  );
  if (idx === -1) throw new Error('ChallengeManifest: no "grinder-output" bowl milestone found');
  return idx;
})();

/**
 * Challenge index after which the bowl is "done" (sausage placed).
 * Derived from manifest: the challenge that has a "set-bowl-position" milestone with value "done".
 */
export const CHALLENGE_INDEX_BOWL_DONE: number = (() => {
  const idx = MANIFEST.findIndex(c =>
    c.milestones.some(m => m.action === 'set-bowl-position' && m.value === 'done'),
  );
  if (idx === -1) throw new Error('ChallengeManifest: no "done" bowl milestone found');
  return idx;
})();

/** Get the challenge entry at a given index, or undefined if out of range. */
export function getChallengeAt(index: number): ChallengeEntry | undefined {
  return MANIFEST[index];
}

/** Get the challenge entry by ID, or undefined if not found. */
export function getChallengeById(id: string): ChallengeEntry | undefined {
  return MANIFEST.find(c => c.id === id);
}

/**
 * Get the index of a challenge by ID.
 * Throws at module load time if the ID is missing — fail-fast prevents silent
 * -1 propagation into challenge routing logic.
 */
export function getChallengeIndex(id: string): number {
  const idx = MANIFEST.findIndex(c => c.id === id);
  if (idx === -1) {
    throw new Error(`ChallengeManifest: unknown challenge ID "${id}"`);
  }
  return idx;
}

/** Get the quip for a challenge at the given index. */
export function getTransitionQuip(index: number): string {
  return MANIFEST[index]?.quip ?? '';
}

/** Get milestones for a challenge at the given index. */
export function getChallengeMilestones(index: number): ChallengeMilestone[] {
  return MANIFEST[index]?.milestones ?? [];
}

/** Check if a challenge at the given index matches a specific ID. */
export function isChallengeId(index: number, id: string): boolean {
  return MANIFEST[index]?.id === id;
}
