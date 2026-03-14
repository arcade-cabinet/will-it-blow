import renderer, {act} from 'react-test-renderer';
import {StrikeCounter} from '../StrikeCounter';

describe('StrikeCounter', () => {
  it('renders 3 strike indicators when strikes is 0', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrikeCounter strikes={0} />);
    });
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    expect(root.children).toHaveLength(3);
  });

  it('shows all circles (unused) when strikes is 0', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrikeCounter strikes={0} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('\u25CB');
    expect(json).not.toContain('\u2715');
  });

  it('shows 1 red X and 2 circles when strikes is 1', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrikeCounter strikes={1} />);
    });
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    const texts = root.children!.map((c: any) => c.children[0]);
    expect(texts[0]).toBe('\u2715');
    expect(texts[1]).toBe('\u25CB');
    expect(texts[2]).toBe('\u25CB');
  });

  it('shows all 3 red Xs when strikes is 3', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrikeCounter strikes={3} />);
    });
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    const texts = root.children!.map((c: any) => c.children[0]);
    expect(texts.every((t: string) => t === '\u2715')).toBe(true);
  });

  it('has an accessibility label with the strikes count', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrikeCounter strikes={2} />);
    });
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    expect(root.props.accessibilityLabel).toContain('2 of 3 strikes used');
  });

  it('supports custom maxStrikes', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrikeCounter strikes={1} maxStrikes={5} />);
    });
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    expect(root.children).toHaveLength(5);
    expect(root.props.accessibilityLabel).toContain('1 of 5 strikes used');
  });

  it('individual strikes have per-item accessibility labels', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<StrikeCounter strikes={1} />);
    });
    const root = tree!.toJSON() as renderer.ReactTestRendererJSON;
    const labels = root.children!.map((c: any) => c.props.accessibilityLabel);
    expect(labels[0]).toContain('used');
    expect(labels[1]).toContain('remaining');
    expect(labels[2]).toContain('remaining');
  });
});
