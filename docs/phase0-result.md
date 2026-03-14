---
title: Phase 0 Result — Physics Validation on Native iOS
date: 2026-03-14
status: FAIL
---

# Phase 0 Result: FAIL

**`@react-three/rapier` cannot work on native iOS/Android.**

## What happened

1. Title screen renders correctly on iPhone 17 Pro simulator ✅
2. Difficulty selector renders correctly ✅
3. After selecting difficulty, app crashes with: **`Property 'WebAssembly' doesn't exist`**

## Root cause

`@react-three/rapier` depends on `@dimforge/rapier3d-compat` which requires `WebAssembly.instantiate()` to load the Rapier WASM binary. **Hermes (React Native's JavaScript engine) does not support WebAssembly.** This is not a timing issue or race condition — it's a fundamental platform incompatibility.

## Additional findings during Phase 0

1. **`three/webgpu` build crashes Hermes** — The Three.js WebGPU build includes TSL NodeMaterial code that calls `.clone()` on objects that don't exist in Hermes. Fixed by NOT redirecting bare `three` → `three/webgpu` in Metro config (grovekeeper doesn't do this either).

2. **`@shopify/react-native-skia` not needed** — Was causing C++ compile errors and isn't used in any source file. Removed.

3. **Metro `three/tsl` resolution** — Required explicit alias in Metro config because Metro doesn't support `exports` field in package.json.

## Decision

Per the design spec, this triggers the **react-native-filament fallback path**. A new design spec is required for the Filament migration.

react-native-filament (Margelo) includes:
- Google Filament rendering engine (PBR, Metal/Vulkan)
- Built-in Bullet physics (no WASM, no WebAssembly)
- GLB/GLTF loading
- React Native bindings

This means rewriting all R3F station components to Filament's API — a significant effort but the ONLY viable native 3D option.
