/**
 * @module config/camera
 * Typed accessor for camera.json -- first-person camera/hands configuration.
 */

import data from './camera.json';

export interface HandsConfig {
  offset: [number, number, number];
  proneDropY: number;
  bobSpeed: number;
  bobAmplitudeY: number;
  swaySpeed: number;
  swayAmplitudeX: number;
  smoothingFactor: number;
  modelScale: number;
  modelOffset: [number, number, number];
}

export interface CameraConfig {
  hands: HandsConfig;
  skins: string[];
}

export const cameraConfig: CameraConfig = data as unknown as CameraConfig;
