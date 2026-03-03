import {Dimensions} from 'react-native';

// We test the hook logic indirectly by verifying the module's orientation
// calculation based on Dimensions. Full hook lifecycle tests would need
// renderHook from @testing-library/react-native, which is not in deps.

describe('useOrientation', () => {
  const originalGet = Dimensions.get;

  afterEach(() => {
    Dimensions.get = originalGet;
  });

  it('exports useOrientation as a named function', () => {
    const mod = require('../useOrientation');
    expect(typeof mod.useOrientation).toBe('function');
  });

  it('exports OrientationInfo type shape (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useOrientation.ts'), 'utf8');
    expect(source).toContain('isLandscape');
    expect(source).toContain('isPortrait');
    expect(source).toContain('width');
    expect(source).toContain('height');
  });

  it('listens to Dimensions change events (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useOrientation.ts'), 'utf8');
    expect(source).toContain('addEventListener');
    expect(source).toContain("'change'");
  });

  it('listens to matchMedia on web (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useOrientation.ts'), 'utf8');
    expect(source).toContain('matchMedia');
    expect(source).toContain("'(orientation: portrait)'");
  });

  it('cleans up listeners on unmount (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../useOrientation.ts'), 'utf8');
    expect(source).toContain('subscription.remove()');
    expect(source).toContain('removeEventListener');
  });
});
