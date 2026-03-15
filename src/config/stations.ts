/**
 * @module config/stations
 * Typed accessor for stations.json -- challenge-station mapping.
 */

import data from './stations.json';

export interface StationsConfig {
  challengeOrder: string[];
  stationMap: Record<string, string>;
  patterns: Record<string, 'bridge' | 'ecs-orchestrator'>;
}

export const stationsConfig: StationsConfig = data as unknown as StationsConfig;

/** Get the station name for a given challenge ID. */
export function getStationForChallenge(challengeId: string): string {
  return stationsConfig.stationMap[challengeId] ?? '';
}

/** Get the interaction pattern for a given challenge. */
export function getChallengePattern(challengeId: string): 'bridge' | 'ecs-orchestrator' {
  return stationsConfig.patterns[challengeId] ?? 'bridge';
}

/** Get the total number of challenges in the ordered sequence. */
export function getTotalChallenges(): number {
  return stationsConfig.challengeOrder.length;
}
