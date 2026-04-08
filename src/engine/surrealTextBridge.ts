/**
 * @module surrealTextBridge
 * Global event bus for the SurrealText message queue (T0.D).
 *
 * Any module in the codebase can call `enqueueSurrealMessage(text)`
 * to display a blood-red message on a nearby wall. The SurrealText
 * component subscribes to this bus via `useEffect` and drains messages
 * into its internal queue.
 *
 * This lives outside of Koota/ECS because the message queue is a
 * transient UI concern (not save-persisted state), and because the
 * messages are consumed-and-destroyed rather than long-lived entities.
 */

export interface SurrealMessageRequest {
  readonly id: number;
  readonly text: string;
  /** Named surface or 'auto' for camera-aware placement. */
  readonly surface: string;
  readonly priority: number;
  readonly readDurationMs: number;
}

type MessageListener = (msg: SurrealMessageRequest) => void;

const listeners = new Set<MessageListener>();
let nextId = 0;

/** Subscribe to incoming surreal messages. Returns unsubscribe function. */
export function onSurrealMessage(listener: MessageListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Enqueue a surreal message for display on a kitchen surface.
 *
 * This is the public API that any module (ClueGenerator, flair events,
 * Mr. Sausage dialogue, etc.) calls to push text into the 3D scene.
 * The SurrealText component drains these into its internal queue and
 * runs the MOUNTED→SEEN→READING→DROPPING→REMOVED state machine.
 *
 * @param text — the text to display (blood-red 3D text)
 * @param surface — named surface ('wall-N', 'ceiling', etc.) or 'auto'
 * @param priority — higher priority displaces lower on the same surface
 */
export function enqueueSurrealMessage(text: string, surface = 'auto', priority = 0): void {
  const id = nextId++;
  const msg: SurrealMessageRequest = {
    id,
    text,
    surface,
    priority,
    readDurationMs: text.length * 80,
  };
  for (const listener of listeners) {
    listener(msg);
  }
}
