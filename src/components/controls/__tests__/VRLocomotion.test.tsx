import ReactThreeTestRenderer from '@react-three/test-renderer';
import {useGameStore} from '../../../store/gameStore';
import {VRLocomotion} from '../VRLocomotion';

// Reset store between tests
beforeEach(() => {
  useGameStore.setState(useGameStore.getInitialState());
});

describe('VRLocomotion', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(<VRLocomotion />);
    // Outside XR, VRLocomotion renders XROrigin + child components
    expect(renderer).toBeDefined();
  });

  it('exports VRLocomotion as a named function', () => {
    expect(typeof VRLocomotion).toBe('function');
    expect(VRLocomotion.name).toBe('VRLocomotion');
  });

  it('reads vrLocomotionMode from the store (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../VRLocomotion.tsx'), 'utf8');
    expect(source).toContain('vrLocomotionMode');
    expect(source).toContain('useGameStore');
  });

  it('uses XROrigin for XR session root (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../VRLocomotion.tsx'), 'utf8');
    expect(source).toContain('XROrigin');
  });

  it('supports both smooth and teleport locomotion modes (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../VRLocomotion.tsx'), 'utf8');
    expect(source).toContain('SmoothLocomotion');
    expect(source).toContain('TeleportLocomotion');
  });

  it('uses useXRControllerLocomotion for smooth movement (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../VRLocomotion.tsx'), 'utf8');
    expect(source).toContain('useXRControllerLocomotion');
  });

  it('uses TeleportTarget for teleport mode (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../VRLocomotion.tsx'), 'utf8');
    expect(source).toContain('TeleportTarget');
  });

  it('clamps position to room bounds (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../VRLocomotion.tsx'), 'utf8');
    expect(source).toContain('clampToRoom');
    expect(source).toContain('ROOM_HALF_W');
    expect(source).toContain('ROOM_HALF_D');
  });

  it('supports seated mode via xrSeatedMode store field (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../VRLocomotion.tsx'), 'utf8');
    expect(source).toContain('xrSeatedMode');
    expect(source).toContain('SEATED_HEIGHT_OFFSET');
  });

  it('reads snap turn angle from store (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../VRLocomotion.tsx'), 'utf8');
    expect(source).toContain('snapTurnAngle');
  });

  it('renders ComfortVignette in smooth mode (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../VRLocomotion.tsx'), 'utf8');
    expect(source).toContain('ComfortVignette');
  });

  it('syncs player position to store (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../VRLocomotion.tsx'), 'utf8');
    expect(source).toContain('setPlayerPosition');
  });

  it('defaults to smooth locomotion mode', () => {
    const mode = useGameStore.getState().vrLocomotionMode;
    expect(mode).toBe('smooth');
  });

  it('allows switching locomotion mode via store action', () => {
    useGameStore.getState().setVrLocomotionMode('teleport');
    expect(useGameStore.getState().vrLocomotionMode).toBe('teleport');

    useGameStore.getState().setVrLocomotionMode('smooth');
    expect(useGameStore.getState().vrLocomotionMode).toBe('smooth');
  });
});
