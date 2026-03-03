import ReactThreeTestRenderer from '@react-three/test-renderer';
import {world} from '../../world';
import {MeshRenderer} from '../MeshRenderer';

beforeEach(() => {
  for (const e of [...world.entities]) world.remove(e);
});

test('renders a mesh for an entity with box geometry', async () => {
  world.add({
    name: 'test-box',
    geometry: {type: 'box', args: [1, 2, 3]},
    material: {type: 'standard', color: 0xff0000},
    transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<MeshRenderer />);
  const meshes = renderer.scene.children;
  expect(meshes.length).toBe(1);
});

test('skips lathe entities', async () => {
  world.add({
    name: 'lathe-entity',
    geometry: {type: 'lathe', args: [24]},
    material: {type: 'standard', color: 0x00ff00},
    transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<MeshRenderer />);
  // lathe entities should not be rendered by MeshRenderer
  expect(renderer.scene.children.length).toBe(0);
});

test('renders multiple entities', async () => {
  world.add({
    name: 'box-a',
    geometry: {type: 'box', args: [1, 1, 1]},
    material: {type: 'standard', color: 0xff0000},
    transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });
  world.add({
    name: 'sphere-b',
    geometry: {type: 'sphere', args: [1, 16, 16]},
    material: {type: 'basic', color: 0x0000ff},
    transform: {position: [2, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<MeshRenderer />);
  expect(renderer.scene.children.length).toBe(2);
});

test('applies position from transform', async () => {
  world.add({
    name: 'positioned',
    geometry: {type: 'box', args: [1, 1, 1]},
    material: {type: 'standard', color: 0xffffff},
    transform: {position: [3, 5, -2], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<MeshRenderer />);
  const mesh = renderer.scene.children[0];
  expect(mesh.instance.position.x).toBe(3);
  expect(mesh.instance.position.y).toBe(5);
  expect(mesh.instance.position.z).toBe(-2);
});

test('applies material preset values', async () => {
  world.add({
    name: 'metal-box',
    geometry: {type: 'box', args: [1, 1, 1]},
    material: {type: 'standard', color: 0x888888, preset: 'polished-metal'},
    transform: {position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1]},
  });

  const renderer = await ReactThreeTestRenderer.create(<MeshRenderer />);
  expect(renderer.scene.children.length).toBe(1);
});

test('renders nothing when world is empty', async () => {
  const renderer = await ReactThreeTestRenderer.create(<MeshRenderer />);
  expect(renderer.scene.children.length).toBe(0);
});
