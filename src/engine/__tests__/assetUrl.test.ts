import {vi} from 'vitest';
/**
 * Tests for assetUrl.ts — verifies correct base path detection for both
 * localhost development and GitHub Pages deployment (/will-it-blow/ prefix).
 */

// We need to re-import after each `document` mock change, so we use dynamic imports
// and clear the module cache between tests.

beforeEach(() => {
  vi.resetModules();
});

describe('getWebBasePath', () => {
  it('returns empty string when document is undefined (native)', () => {
    // On native (iOS/Android), `document` is undefined
    const originalDocument = globalThis.document;
    (globalThis as any).document = undefined;
    try {
      const {getWebBasePath} = require('../assetUrl');
      expect(getWebBasePath()).toBe('');
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it('returns base path from <base> tag when present', () => {
    const originalDocument = globalThis.document;
    const mockDoc = {
      querySelector: (selector: string) => {
        if (selector === 'base') {
          return {href: 'https://arcade-cabinet.github.io/will-it-blow/'};
        }
        return null;
      },
    };
    (globalThis as any).document = mockDoc;
    try {
      const {getWebBasePath} = require('../assetUrl');
      expect(getWebBasePath()).toBe('/will-it-blow');
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it('returns empty string for root-hosted <base> tag', () => {
    const originalDocument = globalThis.document;
    const mockDoc = {
      querySelector: (selector: string) => {
        if (selector === 'base') {
          return {href: 'https://example.com/'};
        }
        return null;
      },
    };
    (globalThis as any).document = mockDoc;
    try {
      const {getWebBasePath} = require('../assetUrl');
      expect(getWebBasePath()).toBe('');
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it('returns base path from Expo script tag fallback', () => {
    const originalDocument = globalThis.document;
    const mockDoc = {
      querySelector: (selector: string) => {
        if (selector === 'base') return null;
        if (selector === 'script[src*="/_expo/"]') {
          return {getAttribute: () => '/will-it-blow/_expo/static/js/entry.js'};
        }
        return null;
      },
      baseURI: 'https://arcade-cabinet.github.io/will-it-blow/',
    };
    (globalThis as any).document = mockDoc;
    try {
      const {getWebBasePath} = require('../assetUrl');
      expect(getWebBasePath()).toBe('/will-it-blow');
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it('returns empty string when no base tag or expo scripts exist (localhost)', () => {
    const originalDocument = globalThis.document;
    const mockDoc = {
      querySelector: () => null,
    };
    (globalThis as any).document = mockDoc;
    try {
      const {getWebBasePath} = require('../assetUrl');
      expect(getWebBasePath()).toBe('');
    } finally {
      globalThis.document = originalDocument;
    }
  });
});

describe('getAssetUrl', () => {
  it('returns asset URL without base path on native', () => {
    // In the RN test environment Platform.OS is a plain property (not web),
    // so getWebBasePath() returns '' (no document) and basePath is ''
    const {getAssetUrl} = require('../assetUrl');
    expect(getAssetUrl('models', 'kitchen.glb')).toBe('/models/kitchen.glb');
  });

  it('constructs directory URL without filename', () => {
    const {getAssetUrl} = require('../assetUrl');
    expect(getAssetUrl('textures')).toBe('/textures/');
  });

  it('includes subdir and filename in the path', () => {
    const {getAssetUrl} = require('../assetUrl');
    expect(getAssetUrl('audio', 'chop_1.ogg')).toBe('/audio/chop_1.ogg');
  });
});

describe('app.json baseUrl configuration', () => {
  it('has experiments.baseUrl set to /will-it-blow', () => {
    const appJson = require('../../../app.json');
    expect(appJson.expo.experiments.baseUrl).toBe('/will-it-blow');
  });
});
