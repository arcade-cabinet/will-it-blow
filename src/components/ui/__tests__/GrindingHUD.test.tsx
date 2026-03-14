import renderer, {act} from 'react-test-renderer';
import {GrindingHUD} from '../GrindingHUD';

describe('GrindingHUD', () => {
  it('renders without crashing', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GrindingHUD speed={50} progress={30} />);
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('displays speed zone indicator', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GrindingHUD speed={50} progress={30} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('SPEED');
  });

  it('displays progress bar', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GrindingHUD speed={50} progress={75} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('PROGRESS');
  });

  it('shows slow zone for low speed', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GrindingHUD speed={15} progress={30} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('SLOW');
  });

  it('shows good zone for medium speed', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GrindingHUD speed={50} progress={30} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('GOOD');
  });

  it('shows fast zone for high speed', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<GrindingHUD speed={90} progress={30} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('FAST');
  });

  it('is a pure presentational component (no store imports)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GrindingHUD.tsx'), 'utf8');
    expect(source).not.toContain('useGameStore');
  });
});
