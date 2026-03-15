/**
 * Tests for assetUrl.ts — verifies correct asset URL resolution for Vite builds.
 *
 * import.meta.env.BASE_URL is '/' in dev and '/will-it-blow/' on GitHub Pages.
 * The test environment sets BASE_URL to '/' by default.
 */

import {getAssetUrl, getWebBasePath} from '../assetUrl';

describe('getWebBasePath', () => {
  it('returns the Vite BASE_URL', () => {
    // In test env, BASE_URL defaults to '/'
    expect(getWebBasePath()).toBe('/');
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
