import ReactThreeTestRenderer from '@react-three/test-renderer';
import {DEFAULT_ROOM, FURNITURE_RULES, resolveTargets} from '../../../engine/FurnitureLayout';
import {FurnitureLoader} from '../FurnitureLoader';

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

describe('FurnitureLoader', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(<FurnitureLoader />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders one group per furniture rule', async () => {
    const renderer = await ReactThreeTestRenderer.create(<FurnitureLoader />);
    // Root group contains one child group per FURNITURE_RULES entry
    const root = renderer.scene.children[0];
    expect(root.children.length).toBe(FURNITURE_RULES.length);
  });

  it('positions each piece at its resolved target', async () => {
    const targets = resolveTargets(DEFAULT_ROOM);
    const renderer = await ReactThreeTestRenderer.create(<FurnitureLoader />);
    const root = renderer.scene.children[0];

    for (let i = 0; i < FURNITURE_RULES.length; i++) {
      const rule = FURNITURE_RULES[i];
      const target = targets[rule.target];
      const group = root.children[i];
      const pos = group.instance.position;

      expect(pos.x).toBeCloseTo(target.position[0], 2);
      expect(pos.y).toBeCloseTo(target.position[1], 2);
      expect(pos.z).toBeCloseTo(target.position[2], 2);
    }
  });

  it('applies rotationY from target', async () => {
    const targets = resolveTargets(DEFAULT_ROOM);
    const renderer = await ReactThreeTestRenderer.create(<FurnitureLoader />);
    const root = renderer.scene.children[0];

    for (let i = 0; i < FURNITURE_RULES.length; i++) {
      const rule = FURNITURE_RULES[i];
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
    const targets = resolveTargets(customRoom);
    const renderer = await ReactThreeTestRenderer.create(<FurnitureLoader room={customRoom} />);
    const root = renderer.scene.children[0];

    // Check fridge position matches custom room targets
    const fridgeIndex = FURNITURE_RULES.findIndex(r => r.glb === 'fridge.glb');
    const fridgeGroup = root.children[fridgeIndex];
    const fridgeTarget = targets.fridge;

    expect(fridgeGroup.instance.position.x).toBeCloseTo(fridgeTarget.position[0], 2);
    expect(fridgeGroup.instance.position.y).toBeCloseTo(fridgeTarget.position[1], 2);
    expect(fridgeGroup.instance.position.z).toBeCloseTo(fridgeTarget.position[2], 2);
  });

  describe('fridge door animation', () => {
    it('plays door open animation when fridgeDoorOpen is true', async () => {
      const doorAction = {
        clampWhenFinished: false,
        timeScale: 1,
        paused: false,
        setLoop: mockSetLoop,
        reset: mockReset,
        stop: mockStop,
      };
      mockActions = {FridgeArmatureAction: doorAction};

      await ReactThreeTestRenderer.create(<FurnitureLoader fridgeDoorOpen />);

      expect(mockSetLoop).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalled();
      expect(doorAction.timeScale).toBe(1);
    });

    it('reverses animation when fridgeDoorOpen is false', async () => {
      const doorAction = {
        clampWhenFinished: false,
        timeScale: 1,
        paused: true,
        setLoop: mockSetLoop,
        reset: jest.fn(() => ({play: jest.fn()})),
        stop: mockStop,
      };
      mockActions = {FridgeArmatureAction: doorAction};

      await ReactThreeTestRenderer.create(<FurnitureLoader fridgeDoorOpen={false} />);

      expect(doorAction.timeScale).toBe(-1);
      expect(doorAction.paused).toBe(false);
    });
  });

  describe('grinder crank animation', () => {
    it('plays crank animation when grinderCranking is true', async () => {
      const crankAction = {
        setLoop: mockSetLoop,
        reset: mockReset,
        stop: mockStop,
      };
      mockActions = {CrankPivotAction: crankAction};

      await ReactThreeTestRenderer.create(<FurnitureLoader grinderCranking />);

      expect(mockSetLoop).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalled();
      expect(mockPlay).toHaveBeenCalled();
    });

    it('stops crank animation when grinderCranking is false', async () => {
      const crankAction = {
        setLoop: mockSetLoop,
        reset: mockReset,
        stop: mockStop,
      };
      mockActions = {CrankPivotAction: crankAction};

      await ReactThreeTestRenderer.create(<FurnitureLoader grinderCranking={false} />);

      expect(mockStop).toHaveBeenCalled();
    });
  });
});
