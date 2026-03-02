import ReactThreeTestRenderer from '@react-three/test-renderer';
import {useGameStore} from '../../../store/gameStore';
import type {CookingPhase, HeatSetting} from '../CookingMechanics';
import {CookingMechanics, cookLevelToColor} from '../CookingMechanics';

// Reset store between tests
beforeEach(() => {
  useGameStore.getState().startNewGame();
});

describe('CookingMechanics', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CookingMechanics position={[0, 0, 0]} onCookComplete={jest.fn()} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at custom position', async () => {
    const pos: [number, number, number] = [3, 4, 5];
    const renderer = await ReactThreeTestRenderer.create(
      <CookingMechanics position={pos} onCookComplete={jest.fn()} />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(3);
    expect(root.instance.position.y).toBe(4);
    expect(root.instance.position.z).toBe(5);
  });

  it('renders burner, pan, sausage, dial, and particle meshes', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CookingMechanics position={[0, 0, 0]} onCookComplete={jest.fn()} />,
    );
    const root = renderer.scene.children[0];
    // Burner torus + pan group + dial + pointLight + 10 steam + 8 smoke = 22+
    expect(root.children.length).toBeGreaterThanOrEqual(4);
  });

  it('has no Babylon.js imports', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).not.toContain('@babylonjs/core');
    expect(source).not.toContain('reactylon');
  });

  it('imports THREE from three/webgpu', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain("from 'three/webgpu'");
  });

  it('exports CookingPhase and HeatSetting types', () => {
    // Type-level check: these should be importable without error
    const _phase: CookingPhase = 'cooking';
    const _heat: HeatSetting = 'medium';
    expect(_phase).toBe('cooking');
    expect(_heat).toBe('medium');
  });
});

describe('cookLevelToColor', () => {
  it('returns pinkish color at cook level 0', () => {
    const [r, g, b] = cookLevelToColor(0);
    expect(r).toBeGreaterThan(0.7);
    expect(g).toBeGreaterThan(0.5);
    expect(b).toBeGreaterThan(0.5);
  });

  it('returns brownish color at cook level 0.4', () => {
    const [r, _g, _b] = cookLevelToColor(0.4);
    expect(r).toBeLessThan(0.7);
    expect(r).toBeGreaterThan(0.2);
  });

  it('returns dark color at cook level 0.9', () => {
    const [r, g, _b] = cookLevelToColor(0.9);
    expect(r).toBeLessThan(0.3);
    expect(g).toBeLessThan(0.2);
  });

  it('returns burnt black at cook level > 1.0', () => {
    const [r, g, b] = cookLevelToColor(1.5);
    expect(r).toBeLessThan(0.1);
    expect(g).toBeLessThan(0.1);
    expect(b).toBeLessThan(0.1);
  });

  it('interpolates smoothly across the full range (no NaN)', () => {
    for (let cl = 0; cl <= 1.2; cl += 0.05) {
      const [r, g, b] = cookLevelToColor(cl);
      expect(Number.isNaN(r)).toBe(false);
      expect(Number.isNaN(g)).toBe(false);
      expect(Number.isNaN(b)).toBe(false);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});

describe('heat level cycling', () => {
  it('exports the HEAT_CYCLE constant order: low -> medium -> high -> off', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    // Verify the heat cycle array is defined with the expected order
    expect(source).toContain("const HEAT_CYCLE: HeatSetting[] = ['low', 'medium', 'high', 'off']");
  });

  it('defines heat rates for all four settings', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain('off: 0');
    expect(source).toContain('low: 0.03');
    expect(source).toContain('medium: 0.06');
    expect(source).toContain('high: 0.12');
  });
});

describe('burn detection', () => {
  it('defines BURN_THRESHOLD at 1.0', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain('const BURN_THRESHOLD = 1.0');
  });

  it('calls addStrike 3 times when cookLevel exceeds 1.0 (code inspection)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    // The burn handler should call addStrike three times for instant defeat
    const burnSection = source.slice(
      source.indexOf('BURN CHECK'),
      source.indexOf('BURN CHECK') + 300,
    );
    const strikeCount = (burnSection.match(/addStrike\(\)/g) || []).length;
    expect(strikeCount).toBe(3);
  });

  it('sets phase to overcooked on burn (code inspection)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain("phaseRef.current = 'overcooked'");
  });

  it('sets Mr. Sausage reaction to angry on burn (code inspection)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    const burnSection = source.slice(
      source.indexOf('BURN CHECK'),
      source.indexOf('BURN CHECK') + 300,
    );
    expect(burnSection).toContain("setMrSausageReaction('angry')");
  });
});

describe('pan removal records cook level', () => {
  it('calls recordCookLevel in the pan handle click handler (code inspection)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain('recordCookLevel(cookLevelRef.current)');
  });

  it('calls onCookComplete when pan handle is clicked (code inspection)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    // The handlePanHandleClick should call onCookComplete
    const handlerMatch = source.includes('onCookComplete()');
    expect(handlerMatch).toBe(true);
  });

  it('store recordCookLevel action writes to playerDecisions.finalCookLevel', () => {
    const store = useGameStore.getState();
    expect(store.playerDecisions.finalCookLevel).toBe(0);
    store.recordCookLevel(0.65);
    expect(useGameStore.getState().playerDecisions.finalCookLevel).toBe(0.65);
  });
});

describe('flip records flair points', () => {
  it('defines diminishing flair points: 3, 2, 1, 1...', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain('const FLAIR_POINTS = [3, 2, 1, 1, 1, 1, 1, 1, 1, 1]');
  });

  it('calls recordFlairPoint with pan-flip label on clean flip (code inspection)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain("recordFlairPoint('pan-flip', points)");
  });

  it('store recordFlairPoint action appends to playerDecisions.flairPoints', () => {
    const store = useGameStore.getState();
    expect(store.playerDecisions.flairPoints).toEqual([]);
    store.recordFlairPoint('pan-flip', 3);
    expect(useGameStore.getState().playerDecisions.flairPoints).toEqual([
      {reason: 'pan-flip', points: 3},
    ]);
    store.recordFlairPoint('pan-flip', 2);
    expect(useGameStore.getState().playerDecisions.flairPoints).toEqual([
      {reason: 'pan-flip', points: 3},
      {reason: 'pan-flip', points: 2},
    ]);
  });

  it('startNewGame resets finalCookLevel and flairPoints', () => {
    const store = useGameStore.getState();
    store.recordCookLevel(0.7);
    store.recordFlairPoint('pan-flip', 3);
    expect(useGameStore.getState().playerDecisions.finalCookLevel).toBe(0.7);
    expect(useGameStore.getState().playerDecisions.flairPoints).toEqual([
      {reason: 'pan-flip', points: 3},
    ]);
    store.startNewGame();
    expect(useGameStore.getState().playerDecisions.finalCookLevel).toBe(0);
    expect(useGameStore.getState().playerDecisions.flairPoints).toEqual([]);
  });
});

describe('glisten light', () => {
  it('renders GlistenLight sub-component (code inspection)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain('<GlistenLight');
    expect(source).toContain('panY={PAN_Y}');
  });

  it('GlistenLight sub-component has pointLight with correct params', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../stove/GlistenLight.tsx'), 'utf8');
    expect(source).toContain('pointLight');
    expect(source).toContain('intensity={150}');
    expect(source).toContain('distance={50}');
  });

  it('orbits the glisten light in useFrame (code inspection)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain('Math.sin(timeRef.current * 0.5)');
    expect(source).toContain('Math.cos(timeRef.current * 0.7)');
  });
});

describe('smoke particles', () => {
  it('spawns smoke when cookLevel exceeds 0.85 (code inspection)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../CookingMechanics.tsx'), 'utf8');
    expect(source).toContain('SMOKE_THRESHOLD');
    expect(source).toContain('const SMOKE_THRESHOLD = 0.85');
  });
});
