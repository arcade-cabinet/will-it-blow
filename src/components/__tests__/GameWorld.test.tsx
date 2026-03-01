// GameWorld wraps a Canvas, which requires a GL context not available in Jest.
// We test the module export and verify no Babylon.js imports remain.
// Individual child components (KitchenEnvironment, CrtTelevision, stations)
// are already tested via @react-three/test-renderer in their own test files.
import {GameWorld} from '../GameWorld';

describe('GameWorld', () => {
  it('exports a GameWorld component', () => {
    expect(GameWorld).toBeDefined();
    expect(typeof GameWorld).toBe('function');
  });

  it('has no Babylon.js imports', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });

  it('does not use platform-specific file extensions', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    // Verify the platform-split files no longer exist
    expect(fs.existsSync(path.resolve(__dirname, '../GameWorld.web.tsx'))).toBe(false);
    expect(fs.existsSync(path.resolve(__dirname, '../GameWorld.native.tsx'))).toBe(false);
  });

  it('imports from @react-three/fiber', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    expect(source).toContain('@react-three/fiber');
  });

  it('uses FPSController for camera movement', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    expect(source).toContain('FPSController');
    // Old waypoint system should be removed
    expect(source).not.toContain('CameraWalker');
    expect(source).not.toContain('STATION_CAMERAS');
    expect(source).not.toContain('MENU_CAMERA');
    expect(source).not.toContain('easeInOutQuad');
  });

  it('contains SceneContent inner component', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    expect(source).toContain('SceneContent');
  });

  it('defines proximity trigger zones for all 5 stations', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    expect(source).toContain('STATION_TRIGGERS');
    expect(source).toContain('ProximityTrigger');
    // Should have comments for all 5 stations
    expect(source).toContain('Fridge');
    expect(source).toContain('Grinder');
    expect(source).toContain('Stuffer');
    expect(source).toContain('Stove');
    expect(source).toContain('CRT TV');
  });

  it('derives station triggers from FurnitureLayout targets (not hardcoded)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    // Should import from FurnitureLayout
    expect(source).toContain('FurnitureLayout');
    expect(source).toContain('resolveTargets');
    expect(source).toContain('STATION_TARGET_NAMES');
    // Should NOT have raw coordinate arrays for triggers
    expect(source).not.toMatch(/center:\s*\[\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*\]/);
  });

  it('passes position props to station components', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    // All stations should receive position from triggers
    expect(source).toContain('position={STATION_TRIGGERS[0].position}');
    expect(source).toContain('position={STATION_TRIGGERS[1].position}');
    expect(source).toContain('position={STATION_TRIGGERS[2].position}');
    expect(source).toContain('position={STATION_TRIGGERS[3].position}');
  });
});
