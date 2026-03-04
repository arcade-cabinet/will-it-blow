/**
 * @module InputManager
 * Universal input manager that reads bindings from JSON config and
 * normalizes keyboard, gamepad, and touch inputs into a unified API.
 *
 * FPSController and other consumers read from this instead of
 * handling raw platform events directly.
 *
 * Usage:
 * ```ts
 * const input = InputManager.getInstance();
 * input.init(gl.domElement);
 * // In useFrame:
 * const move = input.getMovement();  // { x: -1..1, z: -1..1 }
 * const look = input.getLookDelta(); // { yaw: radians, pitch: radians }
 * ```
 */

import bindings from '../config/input/bindings.json';

/** Normalized movement vector with components in [-1, 1]. */
export interface MovementInput {
  x: number;
  z: number;
}

/** Look delta in radians since last frame. */
export interface LookDelta {
  yaw: number;
  pitch: number;
}

/** XR controller input state pushed by XRInputSystem each frame. */
export interface XRInputState {
  moveX: number;
  moveZ: number;
  lookX: number;
  lookY: number;
  triggerValue: number;
  squeezeValue: number;
}

/** Tuning constants from the input config. */
export const INPUT_TUNING = bindings.tuning;

/**
 * Singleton input manager that aggregates keyboard, mouse, gamepad,
 * and touch inputs into platform-agnostic movement/look/action values.
 */
export class InputManager {
  private static instance: InputManager | null = null;

  // Keyboard state
  private keys = new Set<string>();
  private pointerLocked = false;

  // Mouse look accumulator (drained each frame)
  private mouseDx = 0;
  private mouseDy = 0;

  // Touch/joystick refs (set by MobileJoystick)
  private joystickRef: {x: number; y: number} | null = null;
  private lookDeltaRef: {dx: number; dy: number} | null = null;

  // Gamepad state
  private gamepadIndex: number | null = null;

  // XR controller state (set by XRInputSystem each frame)
  private xrInput: XRInputState | null = null;
  private xrActions = new Map<string, boolean>();

  // Touch gesture actions (set by SwipeFPSControls)
  private touchActions = new Map<string, boolean>();

  // Action press tracking (edge detection)
  private actionPressed = new Map<string, boolean>();

  // Cleanup functions
  private cleanups: Array<() => void> = [];

  private constructor() {}

  static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  /** Bind to a canvas element for pointer-lock and keyboard events. */
  init(canvas: HTMLCanvasElement): void {
    const onClick = () => canvas.requestPointerLock?.();
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      this.mouseDx += e.movementX;
      this.mouseDy += e.movementY;
    };
    const onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };
    const onGamepadConnected = (e: GamepadEvent) => {
      this.gamepadIndex = e.gamepad.index;
    };
    const onGamepadDisconnected = () => {
      this.gamepadIndex = null;
    };

    canvas.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);

    this.cleanups.push(() => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('gamepadconnected', onGamepadConnected);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
      this.keys.clear();
    });
  }

  /** Set touch input refs from MobileJoystick. */
  setTouchRefs(joystick: {x: number; y: number}, lookDelta: {dx: number; dy: number}): void {
    this.joystickRef = joystick;
    this.lookDeltaRef = lookDelta;
  }

  /** Push XR controller analog state from XRInputSystem. Called each frame during XR. */
  setXRInput(state: XRInputState): void {
    this.xrInput = state;
  }

  /** Set XR action button state (edge-detected by XRInputSystem). */
  setXRActionPressed(action: string, pressed: boolean): void {
    this.xrActions.set(action, pressed);
  }

  /** Set touch gesture action state (e.g., tap-to-interact from SwipeFPSControls). */
  setTouchActionPressed(action: string, pressed: boolean): void {
    this.touchActions.set(action, pressed);
  }

  /** Read the current XR trigger value (0-1). Useful for grab force. */
  getXRTriggerValue(): number {
    return this.xrInput?.triggerValue ?? 0;
  }

  /** Read the current XR squeeze/grip value (0-1). Useful for press force. */
  getXRSqueezeValue(): number {
    return this.xrInput?.squeezeValue ?? 0;
  }

  /** True when XR controller data is being fed in. */
  isXRActive(): boolean {
    return this.xrInput !== null;
  }

  /** Read normalized movement input from all sources. */
  getMovement(): MovementInput {
    let x = 0;
    let z = 0;

    // Keyboard
    const moveCfg = bindings.movement;
    for (const key of moveCfg.forward.keyboard) {
      if (this.keys.has(key.toLowerCase())) z -= 1;
    }
    for (const key of moveCfg.backward.keyboard) {
      if (this.keys.has(key.toLowerCase())) z += 1;
    }
    for (const key of moveCfg.strafeLeft.keyboard) {
      if (this.keys.has(key.toLowerCase())) x -= 1;
    }
    for (const key of moveCfg.strafeRight.keyboard) {
      if (this.keys.has(key.toLowerCase())) x += 1;
    }

    // Gamepad (additive)
    const gp = this.getGamepad();
    if (gp) {
      const dz = moveCfg.forward.gamepad.deadzone;
      const lx = gp.axes[0] ?? 0;
      const ly = gp.axes[1] ?? 0;
      if (Math.abs(lx) > dz) x += lx;
      if (Math.abs(ly) > dz) z += ly;
    }

    // Touch joystick (additive)
    if (this.joystickRef) {
      const j = this.joystickRef;
      if (Math.abs(j.x) > 0.1) x += j.x;
      if (Math.abs(j.y) > 0.1) z += -j.y; // Joystick Y-up = forward = -Z
    }

    // XR left thumbstick (additive)
    if (this.xrInput) {
      if (Math.abs(this.xrInput.moveX) > 0) x += this.xrInput.moveX;
      if (Math.abs(this.xrInput.moveZ) > 0) z += this.xrInput.moveZ;
    }

    // Normalize diagonal
    const len = Math.sqrt(x * x + z * z);
    if (len > 1) {
      x /= len;
      z /= len;
    }

    return {x, z};
  }

  /** Drain accumulated look deltas from all sources (call once per frame). */
  getLookDelta(): LookDelta {
    let yaw = 0;
    let pitch = 0;

    // Mouse pointer-lock
    if (this.pointerLocked) {
      const sens = bindings.look.yaw.keyboard.sensitivity;
      yaw = -this.mouseDx * sens;
      pitch = -this.mouseDy * (bindings.look.pitch.keyboard.sensitivity ?? sens);
    }
    this.mouseDx = 0;
    this.mouseDy = 0;

    // Gamepad right stick (rate-based, needs dt multiplication by caller)
    const gp = this.getGamepad();
    if (gp) {
      const rx = gp.axes[2] ?? 0;
      const ry = gp.axes[3] ?? 0;
      const dz = bindings.look.yaw.gamepad.deadzone;
      if (Math.abs(rx) > dz) yaw += -rx * bindings.look.yaw.gamepad.sensitivity;
      if (Math.abs(ry) > dz) pitch += -ry * bindings.look.pitch.gamepad.sensitivity;
    }

    // Touch drag
    if (this.lookDeltaRef) {
      const ld = this.lookDeltaRef;
      if (Math.abs(ld.dx) > 0.01 || Math.abs(ld.dy) > 0.01) {
        const sens = bindings.look.yaw.touch.sensitivity;
        yaw += -ld.dx * sens;
        pitch += -ld.dy * sens;
        ld.dx = 0;
        ld.dy = 0;
      }
    }

    // XR right thumbstick (rate-based, like gamepad)
    if (this.xrInput) {
      const xrLookSens = bindings.look.yaw.xr?.sensitivity ?? bindings.look.yaw.gamepad.sensitivity;
      const xrPitchSens =
        bindings.look.pitch.xr?.sensitivity ?? bindings.look.pitch.gamepad.sensitivity;
      if (Math.abs(this.xrInput.lookX) > 0) yaw += -this.xrInput.lookX * xrLookSens;
      if (Math.abs(this.xrInput.lookY) > 0) pitch += -this.xrInput.lookY * xrPitchSens;
    }

    return {yaw, pitch};
  }

  /** Check if an action key is currently pressed (any binding). */
  isActionHeld(action: 'interact' | 'pause' | 'flip'): boolean {
    const cfg = bindings.actions[action];
    for (const key of cfg.keyboard) {
      if (this.keys.has(key.toLowerCase())) return true;
    }
    const gp = this.getGamepad();
    if (gp) {
      const btnIndex = this.gamepadButtonIndex(cfg.gamepad.button);
      if (btnIndex !== -1 && gp.buttons[btnIndex]?.pressed) return true;
    }
    // XR action buttons (edge-detected by XRInputSystem)
    if (this.xrActions.get(action)) return true;
    // Touch gesture actions (tap-to-interact from SwipeFPSControls)
    if (this.touchActions.get(action)) return true;
    return false;
  }

  /** Check for rising edge (pressed this frame, not last). */
  isActionJustPressed(action: 'interact' | 'pause' | 'flip'): boolean {
    const held = this.isActionHeld(action);
    const wasHeld = this.actionPressed.get(action) ?? false;
    this.actionPressed.set(action, held);
    return held && !wasHeld;
  }

  /** Clean up all event listeners. */
  dispose(): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.joystickRef = null;
    this.lookDeltaRef = null;
    this.gamepadIndex = null;
    this.xrInput = null;
    this.xrActions.clear();
    this.touchActions.clear();
    InputManager.instance = null;
  }

  private getGamepad(): Gamepad | null {
    if (this.gamepadIndex === null) return null;
    return navigator.getGamepads?.()[this.gamepadIndex] ?? null;
  }

  private gamepadButtonIndex(name: string): number {
    const map: Record<string, number> = {
      a: 0,
      b: 1,
      x: 2,
      y: 3,
      lb: 4,
      rb: 5,
      lt: 6,
      rt: 7,
      back: 8,
      start: 9,
      leftStick: 10,
      rightStick: 11,
      up: 12,
      down: 13,
      left: 14,
      right: 15,
    };
    return map[name] ?? -1;
  }
}
