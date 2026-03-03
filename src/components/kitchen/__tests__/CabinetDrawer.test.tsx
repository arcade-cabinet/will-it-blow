/**
 * Tests for CabinetDrawer — renders correctly, click toggles open state.
 */

import ReactThreeTestRenderer from '@react-three/test-renderer';
import {act} from 'react';
import {useGameStore} from '../../../store/gameStore';
import {CabinetDrawer} from '../CabinetDrawer';

// ---------------------------------------------------------------------------
// Mock useGLTF (not used by CabinetDrawer but required by test environment
// conventions for R3F component tests)
// ---------------------------------------------------------------------------

jest.mock('@react-three/drei', () => ({
  useGLTF: () => ({
    scene: {clone: () => ({position: {sub: jest.fn()}, scale: {multiplyScalar: jest.fn()}})},
  }),
  useTexture: () => ({}),
}));

// ---------------------------------------------------------------------------
// Store reset between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useGameStore.setState({
    openCabinets: [],
    openDrawers: [],
  });
});

// ---------------------------------------------------------------------------
// Cabinet tests
// ---------------------------------------------------------------------------

describe('CabinetDrawer — cabinet type', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetDrawer id="test-cabinet" type="cabinet" position={[0, 1, -2]} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders a group at the given position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetDrawer id="cabinet-a" type="cabinet" position={[1, 2, 3]} />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBeCloseTo(1, 1);
    expect(root.instance.position.y).toBeCloseTo(2, 1);
    expect(root.instance.position.z).toBeCloseTo(3, 1);
  });

  it('starts closed (not in openCabinets)', () => {
    const {openCabinets} = useGameStore.getState();
    expect(openCabinets).toHaveLength(0);
  });

  it('toggles open when clicked', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetDrawer id="cabinet-click-test" type="cabinet" position={[0, 1, -1]} />,
    );

    // Find a clickable mesh
    const findClickableMesh = (node: any): any => {
      if (node.props?.onClick) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findClickableMesh(child);
          if (found) return found;
        }
      }
      return null;
    };

    const mesh = findClickableMesh(renderer.scene.children[0]);
    expect(mesh).toBeTruthy();

    await act(async () => {
      mesh.props.onClick({stopPropagation: jest.fn()});
    });

    const {openCabinets} = useGameStore.getState();
    expect(openCabinets).toContain('cabinet-click-test');
  });

  it('toggles closed on second click', async () => {
    // Pre-open the cabinet
    useGameStore.setState({openCabinets: ['cabinet-toggle-test']});

    const renderer = await ReactThreeTestRenderer.create(
      <CabinetDrawer id="cabinet-toggle-test" type="cabinet" position={[0, 1, -1]} />,
    );

    const findClickableMesh = (node: any): any => {
      if (node.props?.onClick) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findClickableMesh(child);
          if (found) return found;
        }
      }
      return null;
    };

    const mesh = findClickableMesh(renderer.scene.children[0]);
    await act(async () => {
      mesh.props.onClick({stopPropagation: jest.fn()});
    });

    const {openCabinets} = useGameStore.getState();
    expect(openCabinets).not.toContain('cabinet-toggle-test');
  });

  it('renders with children (revealed contents)', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetDrawer id="cabinet-with-child" type="cabinet" position={[0, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </CabinetDrawer>,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('accepts custom size prop', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetDrawer
        id="cabinet-sized"
        type="cabinet"
        position={[0, 0, 0]}
        size={[1.2, 1.0, 0.06]}
      />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Drawer tests
// ---------------------------------------------------------------------------

describe('CabinetDrawer — drawer type', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetDrawer id="test-drawer" type="drawer" position={[0, 0.5, -2]} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('toggles open when clicked', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetDrawer id="drawer-click-test" type="drawer" position={[0, 0.5, -1]} />,
    );

    const findClickableMesh = (node: any): any => {
      if (node.props?.onClick) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findClickableMesh(child);
          if (found) return found;
        }
      }
      return null;
    };

    const mesh = findClickableMesh(renderer.scene.children[0]);
    expect(mesh).toBeTruthy();

    await act(async () => {
      mesh.props.onClick({stopPropagation: jest.fn()});
    });

    const {openDrawers} = useGameStore.getState();
    expect(openDrawers).toContain('drawer-click-test');
  });

  it('does not pollute openCabinets when a drawer is toggled', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CabinetDrawer id="drawer-isolation" type="drawer" position={[0, 0, 0]} />,
    );

    const findClickableMesh = (node: any): any => {
      if (node.props?.onClick) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findClickableMesh(child);
          if (found) return found;
        }
      }
      return null;
    };

    const mesh = findClickableMesh(renderer.scene.children[0]);
    await act(async () => {
      mesh.props.onClick({stopPropagation: jest.fn()});
    });

    const {openCabinets, openDrawers} = useGameStore.getState();
    expect(openCabinets).toHaveLength(0);
    expect(openDrawers).toContain('drawer-isolation');
  });
});
