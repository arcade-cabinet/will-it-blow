import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {toggles} from '../world';

export function updateToggles(entities: Entity[]): void {
  for (const e of entities) {
    const {toggle} = e;
    if (!toggle || !toggle.pendingTap || !toggle.enabled) continue;

    toggle.isOn = !toggle.isOn;
    toggle.pendingTap = false;
  }
}

export function ToggleSystem() {
  useFrame(() => {
    updateToggles([...toggles]);
  });
  return null;
}
