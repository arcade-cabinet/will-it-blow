import {useFrame} from '@react-three/fiber';
import type {Entity} from '../types';
import {fillDriven} from '../world';

export function updateFillDriven(entities: Entity[]): void {
  for (const e of entities) {
    const {fillDriven: fd, three} = e;
    if (!fd || !three) continue;
    three.position.y = fd.minY + (1 - fd.fillLevel) * (fd.maxY - fd.minY);
  }
}

export function FillDrivenSystem() {
  useFrame(() => {
    updateFillDriven([...fillDriven]);
  });
  return null;
}
