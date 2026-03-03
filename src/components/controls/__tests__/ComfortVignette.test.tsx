import ReactThreeTestRenderer from '@react-three/test-renderer';
import {useGameStore} from '../../../store/gameStore';
import {ComfortVignette} from '../ComfortVignette';

// Reset store between tests
beforeEach(() => {
  useGameStore.setState(useGameStore.getInitialState());
});

describe('ComfortVignette', () => {
  it('renders without crashing when enabled', async () => {
    useGameStore.setState({comfortVignette: true});
    const renderer = await ReactThreeTestRenderer.create(<ComfortVignette />);
    expect(renderer).toBeDefined();
  });

  it('returns null when disabled', async () => {
    useGameStore.setState({comfortVignette: false});
    const renderer = await ReactThreeTestRenderer.create(<ComfortVignette />);
    expect(renderer.scene.children.length).toBe(0);
  });

  it('exports ComfortVignette as a named function', () => {
    expect(typeof ComfortVignette).toBe('function');
    expect(ComfortVignette.name).toBe('ComfortVignette');
  });

  it('uses a custom shader for radial gradient (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../ComfortVignette.tsx'), 'utf8');
    expect(source).toContain('shaderMaterial');
    expect(source).toContain('uIntensity');
    expect(source).toContain('vUv');
    expect(source).toContain('smoothstep');
  });

  it('reads comfortVignette setting from the store (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../ComfortVignette.tsx'), 'utf8');
    expect(source).toContain('useGameStore');
    expect(source).toContain('comfortVignette');
  });

  it('reads movement input from InputManager (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../ComfortVignette.tsx'), 'utf8');
    expect(source).toContain('InputManager');
    expect(source).toContain('getMovement');
  });

  it('uses lerp for smooth fade transitions (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../ComfortVignette.tsx'), 'utf8');
    expect(source).toContain('MathUtils.lerp');
    expect(source).toContain('FADE_SPEED');
  });

  it('renders at high renderOrder to overlay the scene (source-level check)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../ComfortVignette.tsx'), 'utf8');
    expect(source).toContain('renderOrder');
    expect(source).toContain('depthTest={false}');
    expect(source).toContain('depthWrite={false}');
  });

  it('comfortVignette defaults to true in the store', () => {
    expect(useGameStore.getState().comfortVignette).toBe(true);
  });

  it('can toggle comfortVignette via store action', () => {
    useGameStore.getState().setComfortVignette(false);
    expect(useGameStore.getState().comfortVignette).toBe(false);

    useGameStore.getState().setComfortVignette(true);
    expect(useGameStore.getState().comfortVignette).toBe(true);
  });
});
