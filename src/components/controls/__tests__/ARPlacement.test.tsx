// ARPlacement tests — source-level checks and module export verification.

describe('ARPlacement', () => {
  it('exports ARPlacement as a named function', () => {
    const mod = require('../ARPlacement');
    expect(typeof mod.ARPlacement).toBe('function');
  });

  it('uses a ring geometry for the placement reticle', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../ARPlacement.tsx'), 'utf8');
    expect(source).toContain('ringGeometry');
    expect(source).toContain('meshBasicMaterial');
  });

  it('reads arPlaced and setArPlaced from game store', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../ARPlacement.tsx'), 'utf8');
    expect(source).toContain('arPlaced');
    expect(source).toContain('setArPlaced');
    expect(source).toContain('useGameStore');
  });

  it('hides reticle after placement', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../ARPlacement.tsx'), 'utf8');
    expect(source).toContain('if (arPlaced) return null');
  });

  it('supports an onPlace callback prop', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../ARPlacement.tsx'), 'utf8');
    expect(source).toContain('onPlace');
    expect(source).toContain('Matrix4');
  });
});
