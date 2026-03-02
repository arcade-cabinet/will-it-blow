import ReactThreeTestRenderer from '@react-three/test-renderer';
import {StufferBody} from '../StufferBody';

describe('StufferBody', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferBody fillLevel={0} isCranking={false} />,
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('plunger descends as fillLevel increases', async () => {
    // At fillLevel=0 the plunger is near the top
    const atZero = await ReactThreeTestRenderer.create(
      <StufferBody fillLevel={0} isCranking={false} />,
    );
    const rootZero = atZero.scene.children[0]; // group
    // Plunger disc is the second child (index 1) of the group
    const plungerZeroY = rootZero.children[1].instance.position.y;

    // At fillLevel=1 the plunger is near the bottom
    const atOne = await ReactThreeTestRenderer.create(
      <StufferBody fillLevel={1} isCranking={false} />,
    );
    const rootOne = atOne.scene.children[0];
    const plungerOneY = rootOne.children[1].instance.position.y;

    // Plunger Y at fill=0 should be higher than at fill=1
    expect(plungerZeroY).toBeGreaterThan(plungerOneY);
  });

  it('renders canister, plunger, handle shaft, knob, meat fill, and spout (6 meshes)', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <StufferBody fillLevel={0.5} isCranking={false} />,
    );
    const root = renderer.scene.children[0]; // group
    // 6 child meshes: canister, plunger, handle shaft, knob, meat fill, spout
    expect(root.children.length).toBe(6);
  });
});
