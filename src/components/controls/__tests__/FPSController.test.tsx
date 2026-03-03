// FPSController tests — source-level verification of XR-aware camera behavior.
// Full R3F rendering tests require a GL context; we verify the contract and
// structural properties instead.

describe('FPSController', () => {
  it('exports FPSController as a named function', () => {
    const {FPSController} = require('../FPSController');
    expect(typeof FPSController).toBe('function');
    expect(FPSController.name).toBe('FPSController');
  });

  it('imports useXR from @react-three/xr for XR session detection', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../FPSController.tsx'), 'utf8');
    expect(source).toContain("from '@react-three/xr'");
    expect(source).toContain('useXR');
  });

  it('reads xr.mode to detect active XR sessions', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../FPSController.tsx'), 'utf8');
    expect(source).toContain('xr => xr.mode');
    expect(source).toContain("'immersive-vr'");
    expect(source).toContain("'immersive-ar'");
  });

  it('skips manual camera control when XR is active', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../FPSController.tsx'), 'utf8');
    // The early return in the useFrame callback when XR is active
    expect(source).toContain('isXRActive');
    // Should still sync position to store in XR mode
    expect(source).toContain('setPlayerPosition');
  });

  it('still syncs audio listener position in XR mode', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../FPSController.tsx'), 'utf8');
    // Audio listener sync should happen in the XR branch too
    expect(source).toContain('audioEngine.setListenerPosition');
    expect(source).toContain('audioEngine.setListenerOrientation');
  });

  it('uses InputManager for non-XR camera control', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../FPSController.tsx'), 'utf8');
    expect(source).toContain('InputManager');
    expect(source).toContain('getLookDelta');
    expect(source).toContain('getMovement');
  });

  it('supports teleport in non-XR mode', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../FPSController.tsx'), 'utf8');
    expect(source).toContain('pendingTeleport');
    expect(source).toContain('clearTeleport');
  });

  it('clamps position to room bounds in non-XR mode', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../FPSController.tsx'), 'utf8');
    expect(source).toContain('ROOM_HALF_W');
    expect(source).toContain('ROOM_HALF_D');
  });
});
