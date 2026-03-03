/**
 * @module XRInputSystem
 * ECS system that bridges @react-three/xr v6 controller state into
 * the InputManager and dispatches InputActions for VR interactions.
 *
 * Left controller  = movement (thumbstick → walk)
 * Right controller = interaction (trigger → grab/release, squeeze → press,
 *                                 thumbstick → look, A/B buttons → interact/pause)
 *
 * When no XR session is active, this system is a no-op.
 */

import {useFrame} from '@react-three/fiber';
import type {XRControllerState} from '@react-three/xr';
import {useXR, useXRInputSourceEvent, useXRInputSourceState} from '@react-three/xr';
import {useCallback, useRef} from 'react';
import {InputManager} from '../../input/InputManager';
import {useGameStore} from '../../store/gameStore';

/** Deadzone for XR thumbstick axes. Below this threshold, input is zero. */
const THUMBSTICK_DEADZONE = 0.15;

/** Thumbstick component ID on standard XR controllers. */
const THUMBSTICK_ID = 'xr-standard-thumbstick';
/** Trigger component ID on standard XR controllers. */
const TRIGGER_ID = 'xr-standard-trigger';
/** Squeeze (grip) component ID on standard XR controllers. */
const SQUEEZE_ID = 'xr-standard-squeeze';

/**
 * Read thumbstick axes from a controller's gamepad state.
 * Returns [x, y] with deadzone applied, or [0, 0] if unavailable.
 */
export function readThumbstick(
  controller: XRControllerState | undefined,
  deadzone: number = THUMBSTICK_DEADZONE,
): [number, number] {
  if (!controller?.gamepad) return [0, 0];
  const stick = controller.gamepad[THUMBSTICK_ID];
  if (!stick) return [0, 0];
  const x = Math.abs(stick.xAxis ?? 0) > deadzone ? (stick.xAxis ?? 0) : 0;
  const y = Math.abs(stick.yAxis ?? 0) > deadzone ? (stick.yAxis ?? 0) : 0;
  return [x, y];
}

/**
 * Check if a gamepad component is currently pressed.
 */
export function isComponentPressed(
  controller: XRControllerState | undefined,
  componentId: string,
): boolean {
  if (!controller?.gamepad) return false;
  return controller.gamepad[componentId]?.state === 'pressed';
}

/**
 * Get the analog button value (0-1) from a gamepad component.
 */
export function getComponentValue(
  controller: XRControllerState | undefined,
  componentId: string,
): number {
  if (!controller?.gamepad) return 0;
  return controller.gamepad[componentId]?.button ?? 0;
}

/**
 * Pure update function for XR input processing.
 * Maps left thumbstick to movement and right thumbstick to look,
 * then pushes values into InputManager.
 *
 * Exported for unit testing.
 */
export function updateXRInput(
  leftController: XRControllerState | undefined,
  rightController: XRControllerState | undefined,
  inputManager: InputManager,
): void {
  // Left thumbstick → movement
  const [mx, my] = readThumbstick(leftController);
  // Right thumbstick → look (rate-based; sensitivity handled by InputManager)
  const [lx, ly] = readThumbstick(rightController);

  // Right trigger → analog grab force (0-1)
  const triggerValue = getComponentValue(rightController, TRIGGER_ID);
  // Right squeeze → analog press force (0-1)
  const squeezeValue = getComponentValue(rightController, SQUEEZE_ID);

  inputManager.setXRInput({
    moveX: mx,
    moveZ: my, // thumbstick Y-forward maps to Z-forward
    lookX: lx,
    lookY: ly,
    triggerValue,
    squeezeValue,
  });
}

/**
 * XRInputSystem — React component that runs inside the ECS SystemsProvider.
 *
 * Hooks into @react-three/xr v6 for controller state and XR events.
 * Falls back gracefully (no-op) when no XR session is active, because
 * `useXRInputSourceState` returns `undefined` outside XR.
 */
export function XRInputSystem() {
  const session = useXR(s => s.session);
  const leftController = useXRInputSourceState('controller', 'left');
  const rightController = useXRInputSourceState('controller', 'right');

  // Track trigger/squeeze edge detection for actions
  const prevTriggerPressed = useRef(false);
  const prevSqueezePressed = useRef(false);
  const prevAPressed = useRef(false);

  // Handle select events (trigger press/release → grab/release nearest)
  const handleSelectStart = useCallback((event: XRInputSourceEvent) => {
    if (event.inputSource.handedness !== 'right') return;
    const store = useGameStore.getState();
    if (store.gameStatus !== 'playing') return;
    // The GrabSystem handles actual grab logic; we just ensure InputManager
    // reflects the XR trigger state (done in updateXRInput via setXRInput)
  }, []);

  const handleSelectEnd = useCallback((event: XRInputSourceEvent) => {
    if (event.inputSource.handedness !== 'right') return;
    // Release handled via InputManager XR state
  }, []);

  // Handle squeeze events (grip press → interact action)
  const handleSqueezeStart = useCallback((event: XRInputSourceEvent) => {
    if (event.inputSource.handedness !== 'right') return;
    const store = useGameStore.getState();
    if (store.gameStatus !== 'playing') return;
    // Squeeze used for press/interact — analog value handled in updateXRInput
  }, []);

  // Bind XR events when session is active
  useXRInputSourceEvent(session ? 'all' : undefined, 'selectstart', handleSelectStart, [
    handleSelectStart,
  ]);
  useXRInputSourceEvent(session ? 'all' : undefined, 'selectend', handleSelectEnd, [
    handleSelectEnd,
  ]);
  useXRInputSourceEvent(session ? 'all' : undefined, 'squeezestart', handleSqueezeStart, [
    handleSqueezeStart,
  ]);

  useFrame(() => {
    // No-op outside XR
    if (!session) return;

    const input = InputManager.getInstance();
    updateXRInput(leftController, rightController, input);

    // Edge detection for action buttons (A-button on right controller)
    const aPressed = isComponentPressed(rightController, 'a-button');
    if (aPressed && !prevAPressed.current) {
      // Rising edge → interact action (same as pressing 'E' on keyboard)
      // InputManager handles this via the XR action flags
      input.setXRActionPressed('interact', true);
    } else if (!aPressed && prevAPressed.current) {
      input.setXRActionPressed('interact', false);
    }
    prevAPressed.current = aPressed;

    // Trigger edge detection for grab/release
    const triggerPressed = isComponentPressed(rightController, TRIGGER_ID);
    if (triggerPressed !== prevTriggerPressed.current) {
      input.setXRActionPressed('grab', triggerPressed);
    }
    prevTriggerPressed.current = triggerPressed;

    // Squeeze edge detection for press action
    const squeezePressed = isComponentPressed(rightController, SQUEEZE_ID);
    if (squeezePressed !== prevSqueezePressed.current) {
      input.setXRActionPressed('press', squeezePressed);
    }
    prevSqueezePressed.current = squeezePressed;
  });

  return null;
}
