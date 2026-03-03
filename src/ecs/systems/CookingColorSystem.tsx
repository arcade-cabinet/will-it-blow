import {useFrame} from '@react-three/fiber';
import type * as THREE from 'three';
import type {Entity, RGB} from '../types';
import {cookable} from '../world';

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function computeCookColor(
  cookLevel: number,
  colorRaw: RGB,
  colorCooked: RGB,
  colorCharred: RGB,
  colorBurnt: RGB,
): RGB {
  if (cookLevel <= 0) return colorRaw;
  if (cookLevel <= 0.35) return lerpRGB(colorRaw, colorCooked, cookLevel / 0.35);
  if (cookLevel <= 0.85) return lerpRGB(colorCooked, colorCharred, (cookLevel - 0.35) / 0.5);
  if (cookLevel <= 1.0) return lerpRGB(colorCharred, colorBurnt, (cookLevel - 0.85) / 0.15);
  return colorBurnt;
}

export function updateCookingColor(entities: Entity[]): void {
  for (const e of entities) {
    const {cookAppearance, three} = e;
    if (!cookAppearance || !three) continue;

    const [r, g, b] = computeCookColor(
      cookAppearance.cookLevel,
      cookAppearance.colorRaw,
      cookAppearance.colorCooked,
      cookAppearance.colorCharred,
      cookAppearance.colorBurnt,
    );

    const mesh = three as THREE.Mesh;
    if (mesh.material && 'color' in mesh.material) {
      (mesh.material as THREE.MeshStandardMaterial).color.setRGB(r, g, b);
    }
  }
}

export function CookingColorSystem() {
  useFrame(() => {
    updateCookingColor([...cookable]);
  });
  return null;
}
