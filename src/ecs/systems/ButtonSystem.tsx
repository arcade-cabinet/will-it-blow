import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {buttons} from '../world';

export function updateButtons(entities: Entity[]): void {
  // Reset all fired flags first
  for (const e of entities) {
    if (e.button) {
      e.button.fired = false;
    }
  }

  // Then process pending taps
  for (const e of entities) {
    const {button} = e;
    if (!button || !button.pendingTap || !button.enabled) continue;

    button.fired = true;
    button.pendingTap = false;
  }
}

export function ButtonSystem() {
  useFrame(() => {
    updateButtons([...buttons]);
  });
  return null;
}
