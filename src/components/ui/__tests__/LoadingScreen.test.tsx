import {vi} from 'vitest';
import renderer, {act} from 'react-test-renderer';
import {LoadingScreen} from '../LoadingScreen';

describe('LoadingScreen', () => {
  it('renders without crashing', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LoadingScreen progress={0} onReady={vi.fn()} />);
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('displays progress percentage', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LoadingScreen progress={42} onReady={vi.fn()} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    expect(json).toContain('42');
  });

  it('shows horror-themed narrative messages', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<LoadingScreen progress={20} onReady={vi.fn()} />);
    });
    const json = JSON.stringify(tree!.toJSON());
    // Should show one of the narrative messages
    const hasNarrative =
      json.includes('PREPARING THE KITCHEN') ||
      json.includes('SHARPENING KNIVES') ||
      json.includes('HEATING THE GRINDER') ||
      json.includes('READY');
    expect(hasNarrative).toBe(true);
  });

  it('has dark background', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#0a0a0a');
  });

  it('has blood-red progress fill', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#FF1744');
  });

  it('has accessibilityRole="progressbar"', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('accessibilityRole="progressbar"');
  });

  it('has accessibilityValue on progress', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('accessibilityValue=');
  });

  it('calls onReady after 500ms when progress reaches 100', () => {
    vi.useFakeTimers();
    const onReady = vi.fn();
    let _tree: renderer.ReactTestRenderer;
    act(() => {
      _tree = renderer.create(<LoadingScreen progress={100} onReady={onReady} />);
    });
    expect(onReady).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onReady).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does not call onReady when progress is below 100', () => {
    vi.useFakeTimers();
    const onReady = vi.fn();
    act(() => {
      renderer.create(<LoadingScreen progress={99} onReady={onReady} />);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onReady).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('is a pure presentational component with props', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('progress: number');
    expect(source).toContain('onReady');
  });
});
