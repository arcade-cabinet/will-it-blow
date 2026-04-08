/**
 * @module fidelityConfig
 * Centralized particle count and FBO size tuning for mobile-first
 * performance (T2.C).
 *
 * WHY centralized: the Grinder, Stove, and BlowoutStation each had
 * hardcoded constants that were tuned for desktop. This module collects
 * them into one file so performance profiling adjusts one place instead
 * of three scattered files.
 *
 * The default preset targets iPhone 12-class GPUs (A14 Bionic) at 60fps
 * with all set dressing active. Desktop can raise these via a "high"
 * preset in a future settings menu.
 */

export interface FidelityPreset {
  /** Grinder: max instanced meat particles. Was 300, reduced to 150. */
  grinderMaxParticles: number;
  /** Grinder: particles spawned per drag frame. Was 5, reduced to 3. */
  grinderSpawnPerFrame: number;
  /** Stove: FBO ripple sim resolution (px). Kept at 128 for mobile. */
  stoveFboSize: number;
  /** Stove: max instanced splat meshes. Was 100, reduced to 48. */
  stoveSplatInstances: number;
  /** Blowout: max burst particles. Was 80, reduced to 48. */
  blowoutParticleCount: number;
  /** Blowout: max floor splatter stains. Was 12, reduced to 8. */
  blowoutSplatterCount: number;
}

/**
 * Mobile-first fidelity preset. Targets 60fps on A14-class GPUs with
 * all set dressing + CRT shader active.
 */
export const FIDELITY: FidelityPreset = {
  grinderMaxParticles: 150,
  grinderSpawnPerFrame: 3,
  stoveFboSize: 128,
  stoveSplatInstances: 48,
  blowoutParticleCount: 48,
  blowoutSplatterCount: 8,
};
