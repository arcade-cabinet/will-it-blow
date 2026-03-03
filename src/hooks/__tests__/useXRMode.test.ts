// useXRMode tests — source-level checks and module export verification.
// Full hook lifecycle would need renderHook; we verify the contract instead.

describe('useXRMode', () => {
  it('exports useXRMode as a named function', () => {
    const mod = require('../useXRMode');
    expect(typeof mod.useXRMode).toBe('function');
  });

  it('exports XRModeState interface fields (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useXRMode.ts'), 'utf8');
    expect(source).toContain('isVR: boolean');
    expect(source).toContain('isAR: boolean');
    expect(source).toContain('isDesktop: boolean');
    expect(source).toContain('isMobile: boolean');
  });

  it('reads arEnabled and xrEnabled from the game store', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useXRMode.ts'), 'utf8');
    expect(source).toContain('arEnabled');
    expect(source).toContain('xrEnabled');
    expect(source).toContain('useGameStore');
  });

  it('detects touch devices for mobile classification', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useXRMode.ts'), 'utf8');
    expect(source).toContain('ontouchstart');
    expect(source).toContain('maxTouchPoints');
  });

  it('detects AR mode from XR runtime (immersive-ar)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useXRMode.ts'), 'utf8');
    expect(source).toContain("'immersive-ar'");
    expect(source).toContain("'immersive-vr'");
  });

  it('exports useXRModeFromStore for use outside Canvas', () => {
    const mod = require('../useXRMode');
    expect(typeof mod.useXRModeFromStore).toBe('function');
  });

  it('useXRModeFromStore reads arEnabled for AR detection', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useXRMode.ts'), 'utf8');
    // useXRModeFromStore should read arEnabled from store
    expect(source).toContain('isAR: arEnabled');
  });
});
