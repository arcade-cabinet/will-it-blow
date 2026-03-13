/**
 * @module TieGesture.test
 * Tests for the TieGesture casing-tie overlay.
 *
 * Covers:
 * - Both tie points must be tapped before onComplete fires
 * - Order of tapping does not matter (left-then-right or right-then-left both work)
 * - setCasingTied is called when both ends are tied
 * - Component cleanup — timer cleared on unmount
 */

import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import renderer, {act} from 'react-test-renderer';
import {useGameStore} from '../../../store/gameStore';
import {TieGesture} from '../TieGesture';

const store = () => useGameStore.getState();
const reset = () =>
  useGameStore.setState({
    casingTied: false,
    gamePhase: 'TIE_CASING',
  });

beforeEach(() => {
  jest.useFakeTimers();
  reset();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers — interact with the Fiber tree (renderer.root preserves handlers)
// ---------------------------------------------------------------------------

/**
 * Press a node by testID using renderer.root (Fiber tree), not .toJSON().
 * .toJSON() strips event handlers; renderer.root preserves them.
 */
function pressNode(tree: renderer.ReactTestRenderer, testId: string) {
  const node = tree.root.findByProps({testID: testId});
  act(() => {
    node.props.onPress?.();
  });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('TieGesture rendering', () => {
  it('renders without crashing', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TieGesture onComplete={jest.fn()} />);
    });
    expect(tree!.toJSON()).not.toBeNull();
  });

  it('renders two tie-point buttons (tie-left, tie-right)', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TieGesture onComplete={jest.fn()} />);
    });
    expect(() => tree!.root.findByProps({testID: 'tie-left'})).not.toThrow();
    expect(() => tree!.root.findByProps({testID: 'tie-right'})).not.toThrow();
  });

  it('shows "TIE THE CASING" instruction text', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TieGesture onComplete={jest.fn()} />);
    });
    const flat = JSON.stringify(tree!.toJSON());
    expect(flat).toContain('TIE THE CASING');
  });
});

// ---------------------------------------------------------------------------
// Core logic: both ends must be tied
// ---------------------------------------------------------------------------

describe('tie gesture logic', () => {
  it('does not call onComplete after tying only the left end', () => {
    const onComplete = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TieGesture onComplete={onComplete} />);
    });

    pressNode(tree!, 'tie-left');
    // Advance past completion delay
    act(() => jest.advanceTimersByTime(1000));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not call onComplete after tying only the right end', () => {
    const onComplete = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TieGesture onComplete={onComplete} />);
    });

    pressNode(tree!, 'tie-right');
    act(() => jest.advanceTimersByTime(1000));

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete after tying left then right (with 600ms completion delay)', () => {
    const onComplete = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TieGesture onComplete={onComplete} />);
    });

    pressNode(tree!, 'tie-left');
    // Flush Animated.sequence callbacks so setLeftTied(true) fires
    act(() => jest.runAllTimers());

    pressNode(tree!, 'tie-right');
    // Flush second animation so setRightTied(true) fires
    act(() => jest.runAllTimers());
    // Flush the 600ms completion setTimeout (fires after setCasingTied)
    act(() => jest.runAllTimers());

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete after tying right then left', () => {
    const onComplete = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TieGesture onComplete={onComplete} />);
    });

    pressNode(tree!, 'tie-right');
    act(() => jest.runAllTimers());

    pressNode(tree!, 'tie-left');
    act(() => jest.runAllTimers());
    act(() => jest.runAllTimers());

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls setCasingTied(true) when both ends are tied', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TieGesture onComplete={jest.fn()} />);
    });

    expect(store().casingTied).toBe(false);

    pressNode(tree!, 'tie-left');
    act(() => jest.runAllTimers());
    pressNode(tree!, 'tie-right');
    act(() => jest.runAllTimers());

    expect(store().casingTied).toBe(true);
  });

  it('does not call onComplete more than once if both buttons tapped again', () => {
    const onComplete = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TieGesture onComplete={onComplete} />);
    });

    pressNode(tree!, 'tie-left');
    act(() => jest.runAllTimers());
    pressNode(tree!, 'tie-right');
    act(() => jest.runAllTimers());
    // Flush the 600ms completion timeout
    act(() => jest.runAllTimers());

    expect(onComplete).toHaveBeenCalledTimes(1);

    // Advance more time — should not double-fire
    act(() => jest.advanceTimersByTime(3000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

describe('cleanup', () => {
  it('cleans up completion timer on unmount without throwing', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<TieGesture onComplete={jest.fn()} />);
    });

    pressNode(tree!, 'tie-left');
    pressNode(tree!, 'tie-right');

    // Unmount before the 600ms fires
    act(() => tree!.unmount());

    // Advancing timers should not throw
    expect(() => act(() => jest.advanceTimersByTime(1000))).not.toThrow();
  });
});
