import {render, screen} from '@testing-library/react';
import {StrikeCounter} from '../StrikeCounter';

describe('StrikeCounter', () => {
  it('renders 3 strike indicators when strikes is 0', () => {
    const {container} = render(<StrikeCounter strikes={0} />);
    const root = container.firstElementChild!;
    expect(root.children).toHaveLength(3);
  });

  it('shows all circles (unused) when strikes is 0', () => {
    render(<StrikeCounter strikes={0} />);
    const text = document.body.textContent!;
    expect(text).toContain('\u25CB');
    expect(text).not.toContain('\u2715');
  });

  it('shows 1 red X and 2 circles when strikes is 1', () => {
    const {container} = render(<StrikeCounter strikes={1} />);
    const spans = container.querySelectorAll('span');
    const texts = Array.from(spans).map(s => s.textContent);
    expect(texts[0]).toBe('\u2715');
    expect(texts[1]).toBe('\u25CB');
    expect(texts[2]).toBe('\u25CB');
  });

  it('shows all 3 red Xs when strikes is 3', () => {
    const {container} = render(<StrikeCounter strikes={3} />);
    const spans = container.querySelectorAll('span');
    const texts = Array.from(spans).map(s => s.textContent);
    expect(texts.every(t => t === '\u2715')).toBe(true);
  });

  it('has an accessibility label with the strikes count', () => {
    render(<StrikeCounter strikes={2} />);
    expect(screen.getByLabelText('2 of 3 strikes used')).toBeDefined();
  });

  it('supports custom maxStrikes', () => {
    const {container} = render(<StrikeCounter strikes={1} maxStrikes={5} />);
    const root = container.firstElementChild!;
    expect(root.children).toHaveLength(5);
    expect(screen.getByLabelText('1 of 5 strikes used')).toBeDefined();
  });

  it('individual strikes have per-item accessibility labels', () => {
    render(<StrikeCounter strikes={1} />);
    expect(screen.getByLabelText('Strike 1 used')).toBeDefined();
    expect(screen.getByLabelText('Strike 2 remaining')).toBeDefined();
    expect(screen.getByLabelText('Strike 3 remaining')).toBeDefined();
  });
});
