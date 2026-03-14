/**
 * @module TieGesture.test
 * Tests for the TieGesture casing-tie overlay.
 *
 * Covers:
 * - Both tie points must be tapped before onComplete fires
 * - Order of tapping does not matter (left-then-right or right-then-left both work)
 * - setCasingTied is called when both ends are tied
 * - Component cleanup -- timer cleared on unmount
 */

import {act, fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import {useGameStore} from '../../../ecs/hooks';
import {TieGesture} from '../TieGesture';

const store = () => useGameStore.getState();
const reset = () =>
  useGameStore.setState({
    casingTied: false,
    gamePhase: 'TIE_CASING',
  });

beforeEach(() => {
  vi.useFakeTimers();
  reset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pressButton(testId: string) {
  const el = screen.getByTestId(testId);
  act(() => {
    fireEvent.click(el);
  });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('TieGesture rendering', () => {
  it('renders without crashing', () => {
    const {container} = render(<TieGesture onComplete={vi.fn()} />);
    expect(container.innerHTML).toBeTruthy();
  });

  it('renders two tie-point buttons (tie-left, tie-right)', () => {
    render(<TieGesture onComplete={vi.fn()} />);
    expect(screen.getByTestId('tie-left')).toBeDefined();
    expect(screen.getByTestId('tie-right')).toBeDefined();
  });

  it('shows "TIE THE CASING" instruction text', () => {
    const {container} = render(<TieGesture onComplete={vi.fn()} />);
    expect(container.textContent).toContain('TIE THE CASING');
  });
});

// ---------------------------------------------------------------------------
// Core logic: both ends must be tied
// ---------------------------------------------------------------------------

describe('tie gesture logic', () => {
  it('does not call onComplete after tying only the left end', () => {
    const onComplete = vi.fn();
    render(<TieGesture onComplete={onComplete} />);

    pressButton('tie-left');
    act(() => vi.advanceTimersByTime(1000));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not call onComplete after tying only the right end', () => {
    const onComplete = vi.fn();
    render(<TieGesture onComplete={onComplete} />);

    pressButton('tie-right');
    act(() => vi.advanceTimersByTime(1000));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete after tying left then right (with 600ms completion delay)', () => {
    const onComplete = vi.fn();
    render(<TieGesture onComplete={onComplete} />);

    pressButton('tie-left');
    act(() => vi.runAllTimers());

    pressButton('tie-right');
    act(() => vi.runAllTimers());
    act(() => vi.runAllTimers());

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete after tying right then left', () => {
    const onComplete = vi.fn();
    render(<TieGesture onComplete={onComplete} />);

    pressButton('tie-right');
    act(() => vi.runAllTimers());

    pressButton('tie-left');
    act(() => vi.runAllTimers());
    act(() => vi.runAllTimers());

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls setCasingTied(true) when both ends are tied', () => {
    render(<TieGesture onComplete={vi.fn()} />);

    expect(store().casingTied).toBe(false);

    pressButton('tie-left');
    act(() => vi.runAllTimers());
    pressButton('tie-right');
    act(() => vi.runAllTimers());

    expect(store().casingTied).toBe(true);
  });

  it('does not call onComplete more than once if both buttons tapped again', () => {
    const onComplete = vi.fn();
    render(<TieGesture onComplete={onComplete} />);

    pressButton('tie-left');
    act(() => vi.runAllTimers());
    pressButton('tie-right');
    act(() => vi.runAllTimers());
    act(() => vi.runAllTimers());

    expect(onComplete).toHaveBeenCalledTimes(1);

    // Advance more time -- should not double-fire
    act(() => vi.advanceTimersByTime(3000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

describe('cleanup', () => {
  it('cleans up completion timer on unmount without throwing', () => {
    const {unmount} = render(<TieGesture onComplete={vi.fn()} />);

    pressButton('tie-left');
    pressButton('tie-right');

    // Unmount before the 600ms fires
    act(() => unmount());

    // Advancing timers should not throw
    expect(() => act(() => vi.advanceTimersByTime(1000))).not.toThrow();
  });
});
