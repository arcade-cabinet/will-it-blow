import ReactThreeTestRenderer from '@react-three/test-renderer';
import {Vector2} from 'three';
import {world} from '../../world';
import {LatheRenderer} from '../LatheRenderer';

beforeEach(() => {
  for (const e of [...world.entities]) world.remove(e);
});

test('renders a lathe mesh for a lathe entity', async () => {
  world.add({
    name: 'test-lathe',
    geometry: {
      type: 'lathe',
      args: [24],
      lathePoints: [new Vector2(0, 0), new Vector2(1, 0.5), new Vector2(0.5, 1)],
    },
    material: {type: 'standard', color: 0xcccccc},
    transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<LatheRenderer />);
  expect(renderer.scene.children.length).toBe(1);
});

test('ignores non-lathe entities', async () => {
  world.add({
    name: 'box-entity',
    geometry: {type: 'box', args: [1, 1, 1]},
    material: {type: 'standard', color: 0xff0000},
    transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<LatheRenderer />);
  expect(renderer.scene.children.length).toBe(0);
});

test('renders nothing when world is empty', async () => {
  const renderer = await ReactThreeTestRenderer.create(<LatheRenderer />);
  expect(renderer.scene.children.length).toBe(0);
});
