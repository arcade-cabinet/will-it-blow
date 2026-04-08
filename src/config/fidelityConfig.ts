/**
 * @module fidelityConfig
 * Centralized particle count, FBO size, and simulation tuning.
 *
 * WHY centralized: the Grinder, Stove, and BlowoutStation each had
 * hardcoded constants. This module collects them into one file so
 * performance profiling or platform-specific presets adjust one place
 * instead of three scattered files.
 *
 * VALUES: these match the original POC (docs/poc/minigames.html) which
 * was the design target. The POC ran fine on desktop; mobile profiling
 * will come later as a separate performance pass with adaptive
 * quality, NOT as a pre-emptive downgrade that sacrifices the visual
 * signature the game was designed around.
 */

export interface FidelityPreset {
  /** Grinder: max instanced meat particles. POC target: 300. */
  grinderMaxParticles: number;
  /** Grinder: particles spawned per plunger-drag frame. POC target: 5. */
  grinderSpawnPerFrame: number;
  /** Grinder: number of raw meat chunks in the chute. POC target: 20. */
  grinderMeatChunks: number;
  /** Stove: FBO ripple sim resolution (px). POC target: 512. */
  stoveFboSize: number;
  /** Stove: max instanced splat meshes for the grease pool. POC target: 1000. */
  stoveSplatInstances: number;
  /** Stove: grease pool displacement intensity. POC target: 1.5. */
  stoveDisplacementScale: number;
  /** Blowout: max burst particles. POC target: 1000. */
  blowoutParticleCount: number;
  /** Blowout: max floor splatter stains. POC target: 50. */
  blowoutSplatterCount: number;
}

/**
 * POC-faithful fidelity preset — the design target.
 *
 * The POC's grease pool FBO at 512², 1000 splat instances, and 1000
 * blowout particles are what make the game's visual signature. These
 * are NOT optional polish — they are the agreed visual bar.
 */
export const FIDELITY: FidelityPreset = {
  grinderMaxParticles: 300,
  grinderSpawnPerFrame: 5,
  grinderMeatChunks: 20,
  stoveFboSize: 512,
  stoveSplatInstances: 1000,
  stoveDisplacementScale: 1.5,
  blowoutParticleCount: 1000,
  blowoutSplatterCount: 50,
};
