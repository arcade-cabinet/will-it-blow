import ReactThreeTestRenderer from '@react-three/test-renderer';
import {useGameStore} from '../../../store/gameStore';
import {TransferBowl} from '../TransferBowl';

describe('TransferBowl', () => {
  beforeEach(() => {
    useGameStore.setState({bowlPosition: 'fridge', blendColor: '#808080'});
  });

  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(<TransferBowl />);
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('reads bowlPosition from store', async () => {
    const renderer = await ReactThreeTestRenderer.create(<TransferBowl />);
    const root = renderer.scene.children[0];
    // The group should be visible when bowlPosition is 'fridge'
    expect(root.instance.visible).toBe(true);
  });

  it('hides when bowlPosition is done', async () => {
    useGameStore.setState({bowlPosition: 'done'});
    const renderer = await ReactThreeTestRenderer.create(<TransferBowl />);
    const root = renderer.scene.children[0];
    expect(root.instance.visible).toBe(false);
  });

  it('hides when bowlPosition is carried', async () => {
    useGameStore.setState({bowlPosition: 'carried'});
    const renderer = await ReactThreeTestRenderer.create(<TransferBowl />);
    const root = renderer.scene.children[0];
    expect(root.instance.visible).toBe(false);
  });

  it('contains bowl mesh and meat mound mesh', async () => {
    const renderer = await ReactThreeTestRenderer.create(<TransferBowl />);
    const root = renderer.scene.children[0];
    // Group should contain the bowl mesh and the meat mound mesh
    expect(root.children.length).toBe(2);
  });

  it('imports from three/webgpu', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../TransferBowl.tsx'), 'utf8');
    expect(source).toContain("from 'three/webgpu'");
  });
});
