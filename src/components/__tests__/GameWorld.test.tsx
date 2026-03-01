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

  it('imports from @react-three/fiber and @react-three/rapier', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    expect(source).toContain('@react-three/fiber');
    expect(source).toContain('@react-three/rapier');
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

  it('uses Rapier sensor colliders for station proximity detection', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    // Rapier physics components
    expect(source).toContain('PlayerBody');
    expect(source).toContain('StationSensor');
    expect(source).toContain('RoomColliders');
    expect(source).toContain('PhysicsWrapper');
    // Manual ProximityTrigger replaced (native fallback renamed)
    expect(source).not.toContain('function ProximityTrigger');
    expect(source).not.toContain('STATION_TRIGGERS');
    // Should reference all 5 station components
    expect(source).toContain('FridgeStation');
    expect(source).toContain('GrinderStation');
    expect(source).toContain('StufferStation');
    expect(source).toContain('StoveStation');
    expect(source).toContain('CrtTelevision');
  });

  it('derives station positions from FurnitureLayout targets (not hardcoded)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    // Should import from FurnitureLayout
    expect(source).toContain('FurnitureLayout');
    expect(source).toContain('resolveTargets');
    expect(source).toContain('STATION_TARGET_NAMES');
    // Uses RESOLVED_TARGETS / STATIONS instead of old STATION_TRIGGERS
    expect(source).toContain('RESOLVED_TARGETS');
    // Should NOT have raw coordinate arrays for triggers
    expect(source).not.toMatch(/center:\s*\[\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*\]/);
  });

  it('passes position props to station components from STATIONS array', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    // All stations should receive position from STATIONS (resolved targets)
    expect(source).toContain('position={STATIONS[0].position}');
    expect(source).toContain('position={STATIONS[1].position}');
    expect(source).toContain('position={STATIONS[2].position}');
    expect(source).toContain('position={STATIONS[3].position}');
    expect(source).toContain('position={STATIONS[4].position}');
  });

  it('keeps a ManualProximityTrigger fallback for native platforms', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    expect(source).toContain('ManualProximityTrigger');
    // Native fallback should be gated on Platform.OS
    expect(source).toContain('Platform.OS');
  });

  it('supports inter-station physics flow with dynamic bowl and sausage', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    // Dynamic bowl positioning from store state
    expect(source).toContain('bowlPosition');
    expect(source).toContain('MixingBowl');
    // Sausage spawning after stuffer challenge
    expect(source).toContain('GrabbableSausage');
    expect(source).toContain('sausagePlaced');
    // StoveStation receives onSausagePlaced callback
    expect(source).toContain('onSausagePlaced');
    expect(source).toContain('handleSausagePlaced');
    // GrabSystem for carry mechanics
    expect(source).toContain('GrabSystem');
  });
});
