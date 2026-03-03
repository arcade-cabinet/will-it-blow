import ReactThreeTestRenderer from '@react-three/test-renderer';
import {world} from '../../world';
import {LightRenderer} from '../LightRenderer';

beforeEach(() => {
  for (const e of [...world.entities]) world.remove(e);
});

test('renders a point light for a light entity', async () => {
  world.add({
    name: 'test-light',
    lightDef: {type: 'point', intensity: 2, distance: 10, color: 0xffcc00},
    transform: {position: [0, 3, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<LightRenderer />);
  expect(renderer.scene.children.length).toBe(1);
});

test('renders nothing when no light entities exist', async () => {
  // Add a non-light entity
  world.add({
    name: 'box-only',
    geometry: {type: 'box', args: [1, 1, 1]},
    material: {type: 'standard', color: 0xff0000},
    transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<LightRenderer />);
  expect(renderer.scene.children.length).toBe(0);
});

test('applies light position', async () => {
  world.add({
    name: 'positioned-light',
    lightDef: {type: 'point', intensity: 1, distance: 5, color: 0xffffff},
    transform: {position: [4, 6, -1], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<LightRenderer />);
  const light = renderer.scene.children[0];
  expect(light.instance.position.x).toBe(4);
  expect(light.instance.position.y).toBe(6);
  expect(light.instance.position.z).toBe(-1);
});
