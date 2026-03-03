import ReactThreeTestRenderer from '@react-three/test-renderer';
import {config} from '../../../config';
import {DEFAULT_ROOM} from '../../../engine/FurnitureLayout';
import {mergeLayoutConfigs, resolveLayout} from '../../../engine/layout';
import {CrtTelevision} from '../CrtTelevision';

const targets = resolveLayout(
  mergeLayoutConfigs(config.layout.room, config.layout.rails, config.layout.placements),
  DEFAULT_ROOM,
).targets;

describe('CrtTelevision', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CrtTelevision reaction="idle" position={targets['crt-tv'].position} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('renders at the expected wall position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CrtTelevision reaction="idle" position={targets['crt-tv'].position} />,
    );
    const root = renderer.scene.children[0];
    // TV should be mounted high on the back wall
    expect(root.instance.position.y).toBeGreaterThan(2);
  });

  it('renders the root group at the resolved crt-tv target', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CrtTelevision reaction="idle" position={targets['crt-tv'].position} />,
    );
    const root = renderer.scene.children[0];
    const [ex, ey, ez] = targets['crt-tv'].position;
    expect(root.instance.position.x).toBeCloseTo(ex, 1);
    expect(root.instance.position.y).toBeCloseTo(ey, 1);
    expect(root.instance.position.z).toBeCloseTo(ez, 1);
  });

  it('accepts a custom position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CrtTelevision reaction="idle" position={[1, 3, -4]} />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(1);
    expect(root.instance.position.y).toBe(3);
    expect(root.instance.position.z).toBe(-4);
  });

  it('accepts all valid reactions without error', async () => {
    const reactions = [
      'idle',
      'flinch',
      'laugh',
      'disgust',
      'excitement',
      'nervous',
      'nod',
      'talk',
    ] as const;
    for (const reaction of reactions) {
      const renderer = await ReactThreeTestRenderer.create(
        <CrtTelevision reaction={reaction} position={targets['crt-tv'].position} />,
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
      await renderer.unmount();
    }
  });
});
