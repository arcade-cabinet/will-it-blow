import ReactThreeTestRenderer from '@react-three/test-renderer';
import {FryingPan} from '../FryingPan';

describe('FryingPan', () => {
  it('renders pan body and handle (2 meshes in group)', async () => {
    const renderer = await ReactThreeTestRenderer.create(<FryingPan />);
    const group = renderer.scene.children[0];
    expect(group.children.length).toBe(2);
  });

  it('accepts click handlers', async () => {
    const onPan = jest.fn();
    const onHandle = jest.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <FryingPan onPanClick={onPan} onHandleClick={onHandle} />,
    );
    const group = renderer.scene.children[0];
    expect(group.children.length).toBe(2);
  });
});
