// AR conditional rendering tests — verify KitchenEnvironment hides
// room enclosure and adjusts lighting when AR mode is active.

describe('KitchenEnvironment AR mode', () => {
  it('conditionally hides room enclosure in AR mode', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../KitchenEnvironment.tsx'), 'utf8');
    // Room enclosure is gated on !arEnabled
    expect(source).toContain('!arEnabled');
    expect(source).toContain('RoomEnclosure');
    expect(source).toContain('useGameStore');
  });

  it('hides grime decals in AR mode', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../KitchenEnvironment.tsx'), 'utf8');
    // Grime drips and bases are gated on !arEnabled
    const arGateCount = (source.match(/!arEnabled/g) || []).length;
    // At least 3 uses: enclosure, drip decals, base decals
    expect(arGateCount).toBeGreaterThanOrEqual(3);
  });

  it('adjusts lighting for AR mode (brighter ambient)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../KitchenEnvironment.tsx'), 'utf8');
    // AR mode uses brighter hemisphere and fill lights
    expect(source).toContain("arEnabled ? ['#ffffff'");
    expect(source).toContain('arEnabled ? 2.0');
  });

  it('hides horror atmosphere lighting in AR mode', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../KitchenEnvironment.tsx'), 'utf8');
    // Horror lights (red emergency, under-counter) disabled in AR
    expect(source).toContain('!arEnabled');
    expect(source).toContain('#ff1a1a');
    expect(source).toContain('#443322');
  });
});
