import {render} from '@testing-library/react';
import {vi} from 'vitest';
import {LoadingScreen, LoadingScreenError} from '../LoadingScreen';

describe('LoadingScreen', () => {
  it('renders without crashing', () => {
    const {container} = render(<LoadingScreen />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('displays "PREPARING THE MEAT..." text', () => {
    const {container} = render(<LoadingScreen />);
    expect(container.textContent).toContain('PREPARING THE MEAT...');
  });

  it('has dark background (#0a0a0a)', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#0a0a0a');
  });

  it('has blood-red color (#FF1744)', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('#FF1744');
  });

  it('renders sausage coil segments', () => {
    const {container} = render(<LoadingScreen />);
    // The coil is built from multiple div segments with border arcs
    const allDivs = container.querySelectorAll('div');
    // Should have many nested divs for the coil segments (8 segments + container + center nub + text + dots)
    expect(allDivs.length).toBeGreaterThan(10);
  });

  it('includes spinning animation keyframes', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('sausageCoilSpin');
  });

  it('is a zero-props Suspense fallback component', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../LoadingScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('export function LoadingScreen()');
  });
});

describe('LoadingScreenError', () => {
  it('renders error message and retry button', () => {
    const onRetry = vi.fn();
    const {container} = render(<LoadingScreenError message="Failed to load" onRetry={onRetry} />);
    expect(container.textContent).toContain('Failed to load');
    expect(container.textContent).toContain('RETRY');
  });

  it('calls onRetry when button is clicked', () => {
    const onRetry = vi.fn();
    const {getByLabelText} = render(<LoadingScreenError message="Error" onRetry={onRetry} />);
    getByLabelText('Retry loading assets').click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
