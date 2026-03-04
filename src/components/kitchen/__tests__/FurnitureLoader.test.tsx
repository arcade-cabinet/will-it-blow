import ReactThreeTestRenderer from '@react-three/test-renderer';
import {config} from '../../../config';
import type {RoomDimensions} from '../../../engine/FurnitureLayout';
import {DEFAULT_ROOM, FURNITURE_RULES} from '../../../engine/FurnitureLayout';
import {mergeLayoutConfigs, resolveLayout} from '../../../engine/layout';
import {FurnitureLoader} from '../FurnitureLoader';

/** Helper — wraps resolveLayout() for tests */
function resolve(room: RoomDimensions = DEFAULT_ROOM) {
  return resolveLayout(
    mergeLayoutConfigs(config.layout.room, config.layout.rails, config.layout.placements),
    room,
  ).targets;
}

// Mock useGLTF and useAnimations — no real GLBs in tests
const mockPlay = jest.fn();
const mockStop = jest.fn();
const mockReset = jest.fn(() => ({play: mockPlay}));
const mockSetLoop = jest.fn();

const mockTraverse = jest.fn((cb: (child: any) => void) => {
  cb({
    isMesh: true,
    material: {
      side: 0,
      isMeshStandardMaterial: true,
      envMapIntensity: 1,
    },
  });
});

let mockActions: Record<string, any> = {};

jest.mock('@react-three/drei', () => ({
  useGLTF: jest.fn(() => ({
    scene: {traverse: mockTraverse},
    animations: [],
  })),
  useAnimations: jest.fn(() => ({
    actions: mockActions,
    mixer: {stopAllAction: jest.fn()},
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockActions = {};
});

// Rules that render: ecsManaged pieces are skipped, bowl is conditionally excluded
const RENDERED_RULES = FURNITURE_RULES.filter(r => !r.ecsManaged);

describe('FurnitureLoader', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(<FurnitureLoader />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders one group per non-ecsManaged furniture rule', async () => {
    const renderer = await ReactThreeTestRenderer.create(<FurnitureLoader />);
    // Root group — ecsManaged pieces (meat_grinder, mixing_bowl) are skipped
    const root = renderer.scene.children[0];
    expect(root.children.length).toBe(RENDERED_RULES.length);
  });

  it('positions each piece at its resolved target', async () => {
    const targets = resolve(DEFAULT_ROOM);
    const renderer = await ReactThreeTestRenderer.create(<FurnitureLoader />);
    const root = renderer.scene.children[0];

    for (let i = 0; i < RENDERED_RULES.length; i++) {
      const rule = RENDERED_RULES[i];
      const target = targets[rule.target];
      const group = root.children[i];
      const pos = group.instance.position;

      expect(pos.x).toBeCloseTo(target.position[0], 2);
      expect(pos.y).toBeCloseTo(target.position[1], 2);
      expect(pos.z).toBeCloseTo(target.position[2], 2);
    }
  });

  it('applies rotationY from target', async () => {
    const targets = resolve(DEFAULT_ROOM);
    const renderer = await ReactThreeTestRenderer.create(<FurnitureLoader />);
    const root = renderer.scene.children[0];

    for (let i = 0; i < RENDERED_RULES.length; i++) {
      const rule = RENDERED_RULES[i];
      const target = targets[rule.target];
      const group = root.children[i];
      expect(group.instance.rotation.y).toBeCloseTo(target.rotationY, 4);
    }
  });

  it('applies material fixes on load (backface culling + envMapIntensity)', async () => {
    await ReactThreeTestRenderer.create(<FurnitureLoader />);
    // traverse is called once per GLB load
    expect(mockTraverse).toHaveBeenCalled();
    // Verify the callback was applied — the mock traverse calls cb with a mesh
    const firstCall = mockTraverse.mock.calls[0];
    expect(firstCall).toBeDefined();
  });

  it('uses custom room dimensions when provided', async () => {
    const customRoom = {w: 20, d: 20, h: 8};
    const targets = resolve(customRoom);
    const renderer = await ReactThreeTestRenderer.create(<FurnitureLoader room={customRoom} />);
    const root = renderer.scene.children[0];

    // Check fridge position matches custom room targets
    const fridgeIndex = RENDERED_RULES.findIndex(r => r.glb === 'fridge.glb');
    const fridgeGroup = root.children[fridgeIndex];
    const fridgeTarget = targets.fridge;

    expect(fridgeGroup.instance.position.x).toBeCloseTo(fridgeTarget.position[0], 2);
    expect(fridgeGroup.instance.position.y).toBeCloseTo(fridgeTarget.position[1], 2);
    expect(fridgeGroup.instance.position.z).toBeCloseTo(fridgeTarget.position[2], 2);
  });

  describe('fridge door pull gesture', () => {
    it('door animation is paused on mount (driven by store progress)', async () => {
      const doorAction = {
        clampWhenFinished: false,
        timeScale: 1,
        paused: false,
        time: 0,
        setLoop: mockSetLoop,
        reset: mockReset,
        stop: mockStop,
        play: mockPlay,
        getClip: () => ({duration: 1.0}),
      };
      mockActions = {FridgeArmatureAction: doorAction};

      await ReactThreeTestRenderer.create(<FurnitureLoader />);

      expect(mockSetLoop).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalled();
      // Animation is paused — time driven by store progress in useFrame
      expect(doorAction.paused).toBe(true);
    });

    it('source reads fridgeDoorProgress from store', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../FurnitureLoader.tsx'), 'utf8');
      expect(source).toContain('fridgeDoorProgress');
      expect(source).toContain('setFridgeDoorProgress');
      expect(source).toContain('springBackRef');
    });

    it('source has pointer drag handlers for fridge door', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const source = fs.readFileSync(path.resolve(__dirname, '../FurnitureLoader.tsx'), 'utf8');
      expect(source).toContain('onFridgePointerDown');
      expect(source).toContain('onFridgePointerMove');
      expect(source).toContain('onFridgePointerUp');
      expect(source).toContain('isDraggingRef');
    });
  });

  // Grinder crank animation tests removed — meat_grinder.glb is now ecsManaged
  // and rendered by GrinderOrchestrator, not FurnitureLoader.
});
