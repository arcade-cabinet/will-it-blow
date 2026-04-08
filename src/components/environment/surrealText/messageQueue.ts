/**
 * @module messageQueue
 * State machine and queue management for the reactive SurrealText
 * slide-down system (T0.D).
 *
 * Each surreal message follows a lifecycle:
 *   MOUNTED → SEEN → READING → DROPPING → REMOVED
 *
 * The camera-awareness logic (checking if the player is looking at the
 * surface the message is mounted on) drives MOUNTED→SEEN. A dwell
 * timer drives SEEN→READING. A slide-down animation drives READING→
 * DROPPING. Cleanup drives DROPPING→REMOVED.
 *
 * This module is pure (no React, no Three.js) so the state transitions
 * can be unit-tested independently of the renderer.
 */

// ─── Message states ──────────────────────────────────────────────────

export type MessageState = 'MOUNTED' | 'SEEN' | 'READING' | 'DROPPING' | 'REMOVED';

// ─── Message definition ──────────────────────────────────────────────

export interface SurrealMessage {
  /** Unique ID for React keys and dedup. */
  readonly id: number;
  /** The text to display. */
  readonly text: string;
  /**
   * Where to mount: a named surface ('wall-N', 'wall-S', 'ceiling',
   * 'floor') or a world-space position vector.
   */
  readonly surface: string;
  /**
   * How long the message dwells once SEEN, in ms.
   * Default: `text.length * 80` (roughly 80ms per character).
   */
  readonly readDurationMs: number;
  /** Higher-priority messages displace lower ones on the same surface. */
  readonly priority: number;
  /** When the message was created (performance.now or Date.now). */
  readonly mountedAt: number;
}

// ─── Queue entry (message + runtime state) ────────────────────────────

export interface QueueEntry {
  readonly msg: SurrealMessage;
  state: MessageState;
  /** Accumulated time in current state (ms). */
  stateElapsedMs: number;
  /** Opacity for the slide-down animation (0-1). */
  opacity: number;
  /** Y-offset for the drop animation (0 = mounted position). */
  dropOffset: number;
}

// ─── Queue management ────────────────────────────────────────────────

let nextId = 0;

/** Generate a unique message ID. */
export function allocateMessageId(): number {
  return nextId++;
}

/** Reset the ID counter (test utility). */
export function resetMessageIdCounter(): void {
  nextId = 0;
}

/**
 * Create a SurrealMessage with sensible defaults.
 * `readDurationMs` defaults to `text.length * 80`.
 */
export function createMessage(text: string, surface = 'auto', priority = 0): SurrealMessage {
  return {
    id: allocateMessageId(),
    text,
    surface,
    readDurationMs: text.length * 80,
    priority,
    mountedAt: Date.now(),
  };
}

/**
 * Create a QueueEntry wrapping a SurrealMessage in its initial state.
 */
export function createQueueEntry(msg: SurrealMessage): QueueEntry {
  return {
    msg,
    state: 'MOUNTED',
    stateElapsedMs: 0,
    opacity: 0,
    dropOffset: 0,
  };
}

// ─── State machine tick ──────────────────────────────────────────────

/** Drop animation speed in units/ms. */
const DROP_SPEED = 0.002;
/** Fade-in speed in opacity/ms. */
const FADE_IN_SPEED = 0.003;
/** Fade-out speed in opacity/ms. */
const FADE_OUT_SPEED = 0.002;

/**
 * Advance a single queue entry by `dtMs` milliseconds.
 *
 * @param entry — the entry to advance (mutated in place)
 * @param isSeen — whether the camera is currently looking at this
 *   message's surface (drives MOUNTED→SEEN)
 * @returns `true` if the entry is now REMOVED and should be pruned
 */
export function tickEntry(entry: QueueEntry, dtMs: number, isSeen: boolean): boolean {
  entry.stateElapsedMs += dtMs;

  switch (entry.state) {
    case 'MOUNTED':
      // Fade in
      entry.opacity = Math.min(1, entry.opacity + dtMs * FADE_IN_SPEED);
      if (isSeen) {
        entry.state = 'SEEN';
        entry.stateElapsedMs = 0;
      }
      break;

    case 'SEEN':
      entry.opacity = Math.min(1, entry.opacity + dtMs * FADE_IN_SPEED);
      // Wait for the dwell timer
      if (entry.stateElapsedMs >= entry.msg.readDurationMs) {
        entry.state = 'READING';
        entry.stateElapsedMs = 0;
      }
      break;

    case 'READING':
      // Fully visible, waiting for acknowledgement (or auto-drop
      // after a generous timeout so messages don't stick forever).
      entry.opacity = 1;
      // Auto-drop after 2x the read duration
      if (entry.stateElapsedMs >= entry.msg.readDurationMs) {
        entry.state = 'DROPPING';
        entry.stateElapsedMs = 0;
      }
      break;

    case 'DROPPING':
      // Slide down + fade out
      entry.dropOffset += dtMs * DROP_SPEED;
      entry.opacity = Math.max(0, entry.opacity - dtMs * FADE_OUT_SPEED);
      if (entry.opacity <= 0) {
        entry.state = 'REMOVED';
      }
      break;

    case 'REMOVED':
      return true;
  }

  return false;
}

/**
 * Tick all entries in a queue, pruning REMOVED entries.
 * Returns the pruned queue (may be shorter than the input).
 */
export function tickQueue(
  queue: QueueEntry[],
  dtMs: number,
  isSeenFn: (entry: QueueEntry) => boolean,
): QueueEntry[] {
  const live: QueueEntry[] = [];
  for (const entry of queue) {
    const removed = tickEntry(entry, dtMs, isSeenFn(entry));
    if (!removed) {
      live.push(entry);
    }
  }
  return live;
}
