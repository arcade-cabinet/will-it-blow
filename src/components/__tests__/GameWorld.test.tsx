import React from 'react';

// GameWorld wraps a Canvas, which requires a GL context not available in Jest.
// We test the module export and verify no Babylon.js imports remain.
// Individual child components (KitchenEnvironment, CrtTelevision, stations)
// are already tested via @react-three/test-renderer in their own test files.
import { GameWorld } from '../GameWorld';

describe('GameWorld', () => {
  it('exports a GameWorld component', () => {
    expect(GameWorld).toBeDefined();
    expect(typeof GameWorld).toBe('function');
  });

  it('has no Babylon.js imports', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../GameWorld.tsx'),
      'utf8'
    );
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });

  it('does not use platform-specific file extensions', () => {
    const fs = require('fs');
    const path = require('path');
    // Verify the platform-split files no longer exist
    expect(
      fs.existsSync(path.resolve(__dirname, '../GameWorld.web.tsx'))
    ).toBe(false);
    expect(
      fs.existsSync(path.resolve(__dirname, '../GameWorld.native.tsx'))
    ).toBe(false);
  });

  it('imports from @react-three/fiber', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../GameWorld.tsx'),
      'utf8'
    );
    expect(source).toContain('@react-three/fiber');
  });

  it('contains CameraWalker inner component', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../GameWorld.tsx'),
      'utf8'
    );
    expect(source).toContain('CameraWalker');
  });

  it('contains SceneContent inner component', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../GameWorld.tsx'),
      'utf8'
    );
    expect(source).toContain('SceneContent');
  });

  it('defines camera positions for all 5 stations', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../GameWorld.tsx'),
      'utf8'
    );
    expect(source).toContain('STATION_CAMERAS');
    expect(source).toContain('MENU_CAMERA');
    // Should have comments for all 5 stations
    expect(source).toContain('Fridge');
    expect(source).toContain('Grinder');
    expect(source).toContain('Stuffer');
    expect(source).toContain('Stove');
    expect(source).toContain('Tasting');
  });
});
