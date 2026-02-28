# Deployment & CI/CD

## Live URL

**GitHub Pages:** https://arcade-cabinet.github.io/will-it-blow/

## CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:** Push to `main`, push to `feat/**`, PRs to `main`

**Steps:**
1. Checkout code
2. Setup Node 22
3. `pnpm install --frozen-lockfile`
4. `pnpm test:ci`

**Concurrency:** Cancels in-progress runs for the same git ref.

**What's missing from CI:**
- `npx tsc --noEmit` — type errors not caught
- Lint step (ESLint or Biome)
- Android debug APK build

## CD Pipeline (`.github/workflows/cd.yml`)

**Triggers:** Push to `main`, manual dispatch

**Two-job pipeline:**

### Job 1: Build

1. Checkout code
2. Setup Node 22
3. `pnpm install --frozen-lockfile`
4. `npx expo export --platform web --output-dir dist`
5. Upload `dist/` as artifact

### Job 2: Deploy

1. Download build artifact
2. Deploy to GitHub Pages

**Concurrency:** `pages` group, does NOT cancel in-progress (ensures deployments complete).

**Base URL:** Configured in `app.json`:

```json
{
  "experiments": {
    "baseUrl": "/will-it-blow"
  }
}
```

The `getAssetRootUrl()` function in `KitchenEnvironment.tsx` detects the `<base>` tag to resolve model/texture paths correctly in production.

## Local Development

```bash
# Web (primary development target)
npx expo start --web

# Default port: 8081 (or next available: 8082, 8083...)
# Hot reload enabled
```

```bash
# iOS (requires Xcode)
npx expo start --ios

# Android (requires Android Studio)
npx expo start --android
```

## Building for Production

### Web (Static Export)

```bash
npx expo export --platform web --output-dir dist
```

Produces a static site in `dist/` ready for any static hosting.

### Android (Debug APK)

```bash
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### iOS

```bash
npx expo run:ios --configuration Release
```

## Asset Dependencies

The `public/` directory contains models and textures required for the game to run:

| Asset | Size | Status |
|-------|------|--------|
| `public/models/kitchen.glb` | 15.5 MB | **Not committed to git** |
| `public/models/kitchen-original.glb` | 970 KB | **Not committed to git** |
| `public/models/sausage.glb` | 1 MB | **Not committed to git** |
| `public/textures/*.jpg` | ~10 MB | **Not committed to git** |
| `public/textures/environment.env` | ~1 MB | **Not committed to git** |

**Important:** The game will not render correctly without these assets. They must be committed or hosted separately. The kitchen.glb alone is 15.5 MB — consider Git LFS for large binary assets.

## Environment Requirements

- **Node.js:** ≥ 20
- **pnpm:** `corepack enable && corepack prepare`
- **Browser:** Chrome/Edge (WebGPU), Firefox/Safari (WebGL fallback)
- **Mobile:** iOS 15+, Android API 24+ (via Expo)

## Git Branch Strategy

- **`main`** — Protected. Merges trigger CD deployment.
- **`feat/*`** — Feature branches. PRs to main. CI runs on push.
- **Squash merge** preferred.

Current active branches:
- `feat/fix-visibility-and-lighting` — Lighting/material fixes (not pushed)
- `feat/3d-fridge-selection` — 3D ingredient selection (in worktree, not pushed)
