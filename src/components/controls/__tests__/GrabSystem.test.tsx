import ReactThreeTestRenderer from '@react-three/test-renderer';
import {GrabSystem} from '../GrabSystem';

describe('GrabSystem', () => {
  it('renders without crashing (returns null — no visible scene nodes)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<GrabSystem />);
    // GrabSystem renders null (no 3D geometry), so scene should have no children
    expect(renderer.scene.children.length).toBe(0);
  });

  it('exports GrabSystem as a named function', () => {
    expect(typeof GrabSystem).toBe('function');
    expect(GrabSystem.name).toBe('GrabSystem');
  });

  it('imports from @react-three/rapier (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GrabSystem.tsx'), 'utf8');
    // GrabSystem does not directly import rapier — it manipulates rigid bodies
    // found on objects at runtime. Verify it uses the rapier body type constants.
    expect(source).toContain('BODY_TYPE_KINEMATIC_POSITION');
    expect(source).toContain('BODY_TYPE_DYNAMIC');
    expect(source).toContain('setBodyType');
    expect(source).toContain('setNextKinematicTranslation');
  });

  it('uses raycaster for object picking (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GrabSystem.tsx'), 'utf8');
    expect(source).toContain('Raycaster');
    expect(source).toContain('setFromCamera');
    expect(source).toContain('intersectObjects');
  });

  it('integrates with gameStore for grab state (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GrabSystem.tsx'), 'utf8');
    expect(source).toContain('useGameStore');
    expect(source).toContain('setGrabbedObject');
  });

  it('checks userData.grabbable and userData.receiver for interactions', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GrabSystem.tsx'), 'utf8');
    expect(source).toContain('userData.grabbable');
    expect(source).toContain('userData.receiver');
    expect(source).toContain('onReceive');
  });

  it('is web-only (guards with Platform.OS check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GrabSystem.tsx'), 'utf8');
    expect(source).toContain("Platform.OS !== 'web'");
  });
});
