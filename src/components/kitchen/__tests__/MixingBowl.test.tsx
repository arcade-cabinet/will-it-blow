import ReactThreeTestRenderer from '@react-three/test-renderer';
import {Platform} from 'react-native';
import {DEFAULT_ROOM, resolveTargets} from '../../../engine/FurnitureLayout';
import {useGameStore} from '../../../store/gameStore';
import {MixingBowl} from '../MixingBowl';

const targets = resolveTargets(DEFAULT_ROOM);

describe('MixingBowl', () => {
  beforeEach(() => {
    useGameStore.setState({bowlContents: [], bowlPosition: 'fridge'});
  });

  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <MixingBowl position={targets['mixing-bowl'].position} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at the given position', async () => {
    const pos: [number, number, number] = [2, 1, 3];
    const renderer = await ReactThreeTestRenderer.create(<MixingBowl position={pos} />);
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBeCloseTo(2, 1);
    expect(root.instance.position.y).toBeCloseTo(1, 1);
    expect(root.instance.position.z).toBeCloseTo(3, 1);
  });

  it('has grabbable userData', async () => {
    const renderer = await ReactThreeTestRenderer.create(<MixingBowl position={[0, 1, 0]} />);
    // Walk the tree to find the group with userData
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
      objectType: 'bowl',
      objectId: 'mixing-bowl',
    });
  });

  it('source imports @react-three/rapier', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../MixingBowl.tsx'), 'utf8');
    expect(source).toContain('@react-three/rapier');
  });

  it('renders with bowl contents', async () => {
    useGameStore.setState({bowlContents: ['ing-1', 'ing-2', 'ing-3']});
    const renderer = await ReactThreeTestRenderer.create(<MixingBowl position={[0, 1, 0]} />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('mixing-bowl target exists in FurnitureLayout', () => {
    expect(targets['mixing-bowl']).toBeDefined();
    expect(targets['mixing-bowl'].position).toHaveLength(3);
  });

  describe('web platform (Rapier physics)', () => {
    const originalOS = Platform.OS;

    beforeEach(() => {
      (Platform as any).OS = 'web';
    });

    afterEach(() => {
      (Platform as any).OS = originalOS;
    });

    it('renders with Rapier rigid bodies on web', async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <MixingBowl position={targets['mixing-bowl'].position} />,
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
    });

    it('renders with contents on web', async () => {
      useGameStore.setState({bowlContents: ['a', 'b']});
      const renderer = await ReactThreeTestRenderer.create(<MixingBowl position={[0, 1, 0]} />);
      expect(renderer.scene.children.length).toBeGreaterThan(0);
    });
  });
});
