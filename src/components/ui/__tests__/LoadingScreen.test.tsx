import {act, render} from '@testing-library/react';
import {vi} from 'vitest';
import {LoadingScreen} from '../LoadingScreen';

describe('LoadingScreen', () => {
  it('renders without crashing', () => {
    const {container} = render(<LoadingScreen progress={0} onReady={vi.fn()} />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('displays progress percentage', () => {
    const {container} = render(<LoadingScreen progress={42} onReady={vi.fn()} />);
    expect(container.textContent).toContain('42');
  });

  it('shows horror-themed narrative messages', () => {
    const {container} = render(<LoadingScreen progress={20} onReady={vi.fn()} />);
    const text = container.textContent!;
    const hasNarrative =
      text.includes('PREPARING THE KITCHEN') ||
      text.includes('SHARPENING KNIVES') ||
      text.includes('HEATING THE GRINDER') ||
      text.includes('READY');
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

  it('has role="progressbar"', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('role="progressbar"');
  });

  it('has aria-valuenow on progress', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('aria-valuenow=');
  });

  it('calls onReady after 500ms when progress reaches 100', () => {
    vi.useFakeTimers();
    const onReady = vi.fn();
    render(<LoadingScreen progress={100} onReady={onReady} />);
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
    render(<LoadingScreen progress={99} onReady={onReady} />);
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
