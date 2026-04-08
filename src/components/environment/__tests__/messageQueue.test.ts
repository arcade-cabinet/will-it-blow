/**
 * Contract test for the SurrealText message queue state machine (T0.D).
 *
 * Pins the MOUNTED → SEEN → READING → DROPPING → REMOVED lifecycle
 * that governs how blood-red text appears on kitchen surfaces, gives
 * the player time to read, and then slides away.
 */
import {beforeEach, describe, expect, it} from 'vitest';
import {
  createMessage,
  createQueueEntry,
  type QueueEntry,
  resetMessageIdCounter,
  tickEntry,
  tickQueue,
} from '../surrealText/messageQueue';

beforeEach(() => {
  resetMessageIdCounter();
});

describe('messageQueue state machine', () => {
  function makeEntry(text = 'Test message'): QueueEntry {
    return createQueueEntry(createMessage(text));
  }

  it('starts in MOUNTED state with opacity 0', () => {
    const entry = makeEntry();
    expect(entry.state).toBe('MOUNTED');
    expect(entry.opacity).toBe(0);
  });

  it('stays MOUNTED while not seen, fading in', () => {
    const entry = makeEntry();
    tickEntry(entry, 100, false);
    expect(entry.state).toBe('MOUNTED');
    expect(entry.opacity).toBeGreaterThan(0);
  });

  it('transitions to SEEN when camera looks at it', () => {
    const entry = makeEntry();
    tickEntry(entry, 100, true);
    expect(entry.state).toBe('SEEN');
    expect(entry.stateElapsedMs).toBe(0); // reset on transition
  });

  it('stays SEEN until dwell timer elapses', () => {
    const entry = makeEntry('Hi'); // readDurationMs = 2 * 80 = 160
    // Move to SEEN
    tickEntry(entry, 100, true);
    expect(entry.state).toBe('SEEN');
    // Tick 100ms — still below 160ms dwell
    tickEntry(entry, 100, true);
    expect(entry.state).toBe('SEEN');
    // Tick 70ms — now past 160ms
    tickEntry(entry, 70, true);
    expect(entry.state).toBe('READING');
  });

  it('transitions from READING to DROPPING after auto-timeout', () => {
    const entry = makeEntry('Hi'); // readDurationMs = 160
    // Fast-forward through MOUNTED → SEEN → READING
    tickEntry(entry, 10, true); // MOUNTED → SEEN
    tickEntry(entry, 200, true); // SEEN → READING
    expect(entry.state).toBe('READING');
    // Wait readDurationMs more in READING state
    tickEntry(entry, 200, true);
    expect(entry.state).toBe('DROPPING');
  });

  it('DROPPING fades out and eventually becomes REMOVED', () => {
    const entry = makeEntry('Hi');
    // Fast-forward to DROPPING
    tickEntry(entry, 10, true);
    tickEntry(entry, 200, true);
    tickEntry(entry, 200, true);
    expect(entry.state).toBe('DROPPING');

    // Tick enough to fade out completely (opacity starts at 1)
    for (let i = 0; i < 100; i++) {
      const removed = tickEntry(entry, 50, false);
      if (removed) {
        expect(entry.state).toBe('REMOVED');
        return;
      }
    }
    // If we got here without removing, fail
    expect(entry.state).toBe('REMOVED');
  });

  it('tickQueue prunes REMOVED entries', () => {
    const e1 = makeEntry('Keep me');
    const e2 = makeEntry('Hi');
    // Force e2 all the way to REMOVED
    tickEntry(e2, 10, true);
    tickEntry(e2, 200, true);
    tickEntry(e2, 200, true);
    for (let i = 0; i < 200; i++) tickEntry(e2, 50, false);

    const queue = tickQueue([e1, e2], 10, () => false);
    // e2 should be pruned
    expect(queue).toHaveLength(1);
    expect(queue[0].msg.text).toBe('Keep me');
  });
});
