import ReactThreeTestRenderer from '@react-three/test-renderer';
import {world} from '../../world';
import {ECSScene} from '../ECSScene';

beforeEach(() => {
  for (const e of [...world.entities]) world.remove(e);
});

test('renders without crashing with empty world', async () => {
  const renderer = await ReactThreeTestRenderer.create(<ECSScene />);
  // Should render (systems + renderers) but no visible entities
  expect(renderer.scene).toBeDefined();
});

test('renders mesh entities added to the world', async () => {
  world.add({
    name: 'scene-box',
    geometry: {type: 'box', args: [1, 1, 1]},
    material: {type: 'standard', color: 0xff0000},
    transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<ECSScene />);
  expect(renderer.scene.children.length).toBeGreaterThan(0);
});
