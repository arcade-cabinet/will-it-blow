import ReactThreeTestRenderer from '@react-three/test-renderer';
import {Platform} from 'react-native';
import {GrabbableSausage} from '../GrabbableSausage';

describe('GrabbableSausage', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrabbableSausage position={[0, 1, 0]} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at the given position', async () => {
    const pos: [number, number, number] = [2, 1, 3];
    const renderer = await ReactThreeTestRenderer.create(<GrabbableSausage position={pos} />);
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBeCloseTo(2, 1);
    expect(root.instance.position.y).toBeCloseTo(1, 1);
    expect(root.instance.position.z).toBeCloseTo(3, 1);
  });

  it('has grabbable userData with sausage type', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrabbableSausage position={[0, 1, 0]} />,
    );
    const findGrabbable = (node: any): any => {
      if (node.instance?.userData?.grabbable) return node;
      for (const child of node.children ?? []) {
        const found = findGrabbable(child);
        if (found) return found;
      }
      return null;
    };
    const grabbableNode = findGrabbable(renderer.scene);
    expect(grabbableNode).not.toBeNull();
    expect(grabbableNode.instance.userData).toEqual({
      grabbable: true,
      objectType: 'sausage',
      objectId: 'sausage-link',
    });
  });

  describe('web platform (Rapier physics)', () => {
    const originalOS = Platform.OS;

    beforeEach(() => {
      (Platform as any).OS = 'web';
    });

    afterEach(() => {
      (Platform as any).OS = originalOS;
    });

    it('renders with Rapier rigid body on web', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <GrabbableSausage position={[1, 2, 3]} />,
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
    });
  });
});
