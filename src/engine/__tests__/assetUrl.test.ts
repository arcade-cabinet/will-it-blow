/**
 * Tests for assetUrl.ts — verifies correct asset URL resolution for Vite builds.
 *
 * After the Expo → Vite migration, assetUrl is a simple passthrough (base path
 * is always root). These tests verify the contract is maintained.
 */

import {getAssetUrl, getWebBasePath} from '../assetUrl';

describe('getWebBasePath', () => {
  it('returns empty string (Vite always serves from root)', () => {
    expect(getWebBasePath()).toBe('');
  });
});

describe('getAssetUrl', () => {
  it('returns asset URL with subdir and filename', () => {
    expect(getAssetUrl('models', 'kitchen.glb')).toBe('/models/kitchen.glb');
  });

  it('constructs directory URL without filename', () => {
    expect(getAssetUrl('textures')).toBe('/textures/');
  });

  it('includes subdir and filename in the path', () => {
    expect(getAssetUrl('audio', 'chop_1.ogg')).toBe('/audio/chop_1.ogg');
  });
});
