import ReactThreeTestRenderer from '@react-three/test-renderer';
import {act} from 'react';
import {config} from '../../../config';
import {HorrorPropsLoader} from '../HorrorPropsLoader';

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

const mockScene = {
  traverse: mockTraverse,
  clone: jest.fn(function (this: any) {
    return {...this, traverse: mockTraverse};
  }),
};

jest.mock('@react-three/drei', () => ({
  useGLTF: jest.fn(() => ({
    scene: mockScene,
    animations: [],
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const allProps = config.scene.horrorProps.props;
const tier1Props = allProps.filter(p => p.tier === 1);
const tier2Props = allProps.filter(p => p.tier === 2);
const flickerProps = allProps.filter(p => p.modelOn !== undefined);

describe('HorrorPropsLoader', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(<HorrorPropsLoader />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders tier 1 props immediately', async () => {
    const renderer = await ReactThreeTestRenderer.create(<HorrorPropsLoader />);
    const root = renderer.scene.children[0];
    // Only tier 1 before timer fires
    expect(root.children.length).toBe(tier1Props.length);
  });

  it('renders tier 2 props after delay', async () => {
    const renderer = await ReactThreeTestRenderer.create(<HorrorPropsLoader />);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    const root = renderer.scene.children[0];
    expect(root.children.length).toBe(tier1Props.length + tier2Props.length);
  });

  it('positions tier 1 props from config', async () => {
    const renderer = await ReactThreeTestRenderer.create(<HorrorPropsLoader />);
    const root = renderer.scene.children[0];

    for (let i = 0; i < tier1Props.length; i++) {
      const prop = tier1Props[i];
      const group = root.children[i];
      const pos = group.instance.position;

      expect(pos.x).toBeCloseTo(prop.position[0], 2);
      expect(pos.y).toBeCloseTo(prop.position[1], 2);
      expect(pos.z).toBeCloseTo(prop.position[2], 2);
    }
  });

  it('applies scale from config', async () => {
    const renderer = await ReactThreeTestRenderer.create(<HorrorPropsLoader />);
    const root = renderer.scene.children[0];

    for (let i = 0; i < tier1Props.length; i++) {
      const prop = tier1Props[i];
      const group = root.children[i];
      const scale = group.instance.scale;

      expect(scale.x).toBeCloseTo(prop.scale, 2);
      expect(scale.y).toBeCloseTo(prop.scale, 2);
      expect(scale.z).toBeCloseTo(prop.scale, 2);
    }
  });

  it('applies material fixes on load', async () => {
    await ReactThreeTestRenderer.create(<HorrorPropsLoader />);
    expect(mockTraverse).toHaveBeenCalled();
  });

  it('has correct number of props in config', () => {
    expect(tier1Props.length).toBeGreaterThan(0);
    expect(tier2Props.length).toBeGreaterThan(0);
    expect(allProps.length).toBe(tier1Props.length + tier2Props.length);
  });

  it('has flicker lamp props with modelOn defined', () => {
    // PSX lamp props require both model (_off) and modelOn (_on) paths
    expect(flickerProps.length).toBeGreaterThan(0);
    for (const prop of flickerProps) {
      expect(prop.model).toMatch(/_off\.glb$/);
      expect(prop.modelOn).toMatch(/_on\.glb$/);
    }
  });

  it('calls useGLTF for both off and on variants of flicker lamps', async () => {
    const {useGLTF: mockUseGLTF} = jest.requireMock('@react-three/drei') as {
      useGLTF: jest.Mock;
    };

    await ReactThreeTestRenderer.create(<HorrorPropsLoader />);

    // Each flicker prop calls useGLTF twice (off + on variant)
    const calledUrls: string[] = mockUseGLTF.mock.calls.map((args: any[]) => args[0] as string);
    for (const prop of flickerProps) {
      const offPath = prop.model;
      const onPath = prop.modelOn as string;
      expect(calledUrls.some(u => u.includes(offPath))).toBe(true);
      expect(calledUrls.some(u => u.includes(onPath))).toBe(true);
    }
  });

  it('flicker lamp remains mounted after flicker interval fires', async () => {
    // Advance past a flicker interval but before tier-2 delay
    // so we only have tier 1 in the scene
    const renderer = await ReactThreeTestRenderer.create(<HorrorPropsLoader />);

    await act(async () => {
      // 1800ms: past minimum flicker interval (1.0s) but before tier-2 delay (2000ms)
      jest.advanceTimersByTime(1800);
    });

    // Tier 1 props should still all be present after flicker toggle
    const root = renderer.scene.children[0];
    expect(root.children.length).toBe(tier1Props.length);
  });
});
