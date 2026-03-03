/**
 * @module threeUtils
 * Typed utility helpers for Three.js scene graph traversal.
 *
 * Provides `traverseMeshes()` as a typed alternative to the common
 * `object.traverse((child: any) => { if (child.isMesh) ... })` pattern.
 * All helpers are pure functions with no side effects.
 */

import * as THREE from 'three/webgpu';

/**
 * Walks an Object3D hierarchy and invokes `callback` for every
 * `THREE.Mesh` descendant (including the root if it is itself a Mesh).
 *
 * Replaces the idiom:
 * ```ts
 * object.traverse((child: any) => {
 *   if (child.isMesh) { ... }
 * });
 * ```
 * with a type-safe version that receives a `THREE.Mesh` directly.
 *
 * @param root - The root object to traverse
 * @param callback - Called for each Mesh found in the hierarchy
 */
export function traverseMeshes(root: THREE.Object3D, callback: (mesh: THREE.Mesh) => void): void {
  root.traverse(child => {
    if (child instanceof THREE.Mesh) {
      callback(child);
    }
  });
}
