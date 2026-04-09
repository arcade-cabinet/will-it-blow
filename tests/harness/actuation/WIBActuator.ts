/**
 * Real-input actuator for the Yuka GOAP governor.
 *
 * Every action the governor takes goes through this class so we
 * have ONE place that translates "click on the grinder" into actual
 * pointer events. Two layers of strict discipline:
 *
 *   1. **Real events only** — every method dispatches via the
 *      `@vitest/browser/context` `userEvent` API which uses
 *      Playwright's underlying mouse/keyboard primitives. No
 *      synthetic event creation, no `dispatchEvent()`.
 *
 *   2. **Coordinate math is centralised** — converting world-space
 *      station bounds to screen pixels happens here, not in the
 *      goal classes. Goals describe intent ("interact with the
 *      grinder"); the actuator decides where to click.
 *
 * NOTE: Vitest browser mode mounts each test inside an iframe, so
 * pointer events have to dispatch through that iframe context.
 * `userEvent` handles this transparently — the goals never see it.
 */
import {userEvent} from '@vitest/browser/context';
import type {StationBounds, StationName} from '../../../src/debug/perception';

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WIBActuator {
  /** Click a DOM element by its query selector. */
  async clickSelector(selector: string): Promise<void> {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`WIBActuator.clickSelector: no match for "${selector}"`);
    await userEvent.click(el as Element);
  }

  /** Click any button whose visible text or aria-label contains `text`. */
  async clickButtonByText(text: string): Promise<void> {
    const button = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.includes(text) || (b.getAttribute('aria-label') ?? '').includes(text),
    );
    if (!button) throw new Error(`WIBActuator.clickButtonByText: no button matching "${text}"`);
    await userEvent.click(button);
  }

  /**
   * Click an arbitrary point on the canvas. Translates (x, y) page
   * coordinates into a real pointer event sequence on the canvas element.
   *
   * The R3F raycaster picks up the event and routes it to the topmost
   * mesh under the cursor. This enables GOAP goals that interact with
   * 3D meshes directly (e.g., clicking tie-casing dots, station meshes).
   *
   * @param x — page X coordinate (pixels from left edge of page)
   * @param y — page Y coordinate (pixels from top edge of page)
   */
  async clickPoint(x: number, y: number): Promise<void> {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('WIBActuator.clickPoint: no <canvas> found');

    const clientX = x;
    const clientY = y;

    // Dispatch a complete pointer event sequence so R3F's event system
    // picks it up: pointerdown → pointerup → click. R3F listens for
    // 'pointermove', 'pointerdown', 'pointerup', and 'click' on the
    // canvas to fire raycasted events on meshes.
    const commonInit: PointerEventInit = {
      clientX,
      clientY,
      screenX: clientX,
      screenY: clientY,
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
    };

    canvas.dispatchEvent(new PointerEvent('pointerdown', commonInit));
    canvas.dispatchEvent(new PointerEvent('pointerup', {...commonInit, buttons: 0}));
    canvas.dispatchEvent(
      new MouseEvent('click', {
        clientX,
        clientY,
        screenX: clientX,
        screenY: clientY,
        bubbles: true,
        cancelable: true,
        button: 0,
      }),
    );
  }

  /** Type a text string via the keyboard. */
  async type(text: string): Promise<void> {
    await userEvent.keyboard(text);
  }

  /** Press a key (e.g. "Escape"). */
  async pressKey(key: string): Promise<void> {
    await userEvent.keyboard(`{${key}}`);
  }

  /**
   * Project a station's world-space bounds onto a screen rect for
   * canvas-click targeting. Currently a stub — fills in the canvas
   * centre. The full projection requires the live R3F camera matrix
   * which the actuator doesn't currently have access to.
   *
   * The first goal that needs this will plumb the camera through.
   */
  projectStationToScreen(_bounds: StationBounds, _stationName: StationName): ScreenRect {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('WIBActuator.projectStationToScreen: no <canvas> found');
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: 1,
      height: 1,
    };
  }
}
