/**
 * @module config/demands
 * Typed accessor for demands.json -- Mr. Sausage's demand parameters.
 */

import data from './demands.json';

export interface DemandsConfig {
  cookTargets: Record<string, number>;
  cookThresholds: Record<string, number>;
}

export const demandsConfig: DemandsConfig = data as unknown as DemandsConfig;

/** Look up the cook target value for a given preference label. */
export function getCookTarget(preference: string): number {
  return demandsConfig.cookTargets[preference] ?? 0.45;
}
