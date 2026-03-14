# Capacitor + R3F Pivot Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kill Expo/RN/Filament/Metro, restore the proven R3F stack, wrap in Capacitor + Vite, wire Tone.js audio and dual-driver SQLite persistence.

**Architecture:** Vite builds a React + R3F + Three.js + Rapier web app. Capacitor wraps it in a native WebView shell for iOS/Android. Koota ECS manages state. sql.js provides SQLite in-browser; capacitor-community/sqlite provides native SQLite. Tone.js handles all audio (samples + procedural + effects).

**Tech Stack:** Vite, React 19, R3F, Three.js, Rapier, Capacitor 6, Tone.js, sql.js, Drizzle ORM, Koota ECS, Vitest, Playwright, Biome

**Spec:** `docs/superpowers/specs/2026-03-14-capacitor-r3f-pivot-design.md`

---

## Chunk 1: Phase 1 — Scaffold

### Task 1: Nuke RN/Expo/Filament infrastructure

**Files:**
- Delete: `babel.config.js`, `metro.config.js`, `.npmrc`, `app.json`, `jest.config.js`, `jest.setup.js`
- Delete: `src/scene/` (entire directory — 20 Filament components)
- Delete: `src/audio/AudioEngine.ts` (expo-audio version)
- Delete: `src/assets/registry.ts` (Filament asset registry)
- Delete: `__mocks__/react-native-filament.js`, `__mocks__/react-native-worklets-core.js`, `__mocks__/expo-haptics.js`, `__mocks__/@op-engineering/`
- Delete: `ios/`, `android/` (Expo-generated)
- Delete: `.maestro/` (Maestro flows)
- Delete: `assets/` (duplicated from public/)
- Delete: `patches/` (Filament fog patch)
- Delete: `scripts/dev.sh`, `scripts/test-e2e.sh` (RN-specific)

- [ ] **Step 1: Delete all Filament/RN infrastructure files**

```bash
rm -rf src/scene/ src/audio/ src/assets/ ios/ android/ .maestro/ assets/ patches/
rm -f babel.config.js metro.config.js .npmrc app.json jest.config.js jest.setup.js
rm -f __mocks__/react-native-filament.js __mocks__/react-native-worklets-core.js __mocks__/expo-haptics.js
rm -rf __mocks__/@op-engineering/
rm -f scripts/dev.sh scripts/test-e2e.sh
```

- [ ] **Step 2: Verify no RN imports remain in kept files**

```bash
grep -r "react-native" src/engine/ src/ecs/ src/config/ src/data/ src/input/ src/db/ --include="*.ts" --include="*.tsx" -l
```

Expected: only `src/engine/GameOrchestrator.tsx` (has the `window.addEventListener` guard — fixed in Task 5). If others appear, remove the RN-specific code.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chainsaw: delete all Expo/RN/Filament/Metro infrastructure"
```

---

### Task 2: Write new package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Rewrite package.json with new deps**

```json
{
  "name": "will-it-blow",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "format": "biome check --write .",
    "cap:ios": "cap sync ios && cap open ios",
    "cap:android": "cap sync android && cap open android"
  },
  "dependencies": {
    "@capacitor-community/keep-awake": "^6.0.0",
    "@capacitor-community/sqlite": "^6.0.0",
    "@capacitor/android": "^6.0.0",
    "@capacitor/core": "^6.0.0",
    "@capacitor/haptics": "^6.0.0",
    "@capacitor/ios": "^6.0.0",
    "@capacitor/screen-orientation": "^6.0.0",
    "@react-three/drei": "^9.0.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/postprocessing": "^3.0.0",
    "@react-three/rapier": "^2.0.0",
    "@use-gesture/react": "^10.0.0",
    "drizzle-orm": "^0.45.1",
    "koota": "^0.6.5",
    "postprocessing": "^6.38.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sql.js": "^1.11.0",
    "three": "^0.172.0",
    "tone": "^15.0.0",
    "zod": "^4.3.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.4",
    "@capacitor/cli": "^6.0.0",
    "@playwright/test": "^1.50.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/three": "^0.172.0",
    "@vitejs/plugin-react": "^4.0.0",
    "drizzle-kit": "^0.31.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.9.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Install deps**

```bash
rm -rf node_modules pnpm-lock.yaml && pnpm install
```

Expected: clean install, no hoisting hacks needed.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml && git commit -m "feat: new package.json — Vite + R3F + Capacitor + Tone.js"
```

---

### Task 3: Create Vite + Vitest config

**Files:**
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/vite-env.d.ts`
- Modify: `tsconfig.json`

- [ ] **Step 1: Create vite.config.ts**

```typescript
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {port: 3000, open: true},
  build: {outDir: 'dist', sourcemap: true},
  assetsInclude: ['**/*.glb', '**/*.gltf'],
});
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', '__tests__/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>Will It Blow?</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body, #root { width: 100%; height: 100%; overflow: hidden; background: #000; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Update tsconfig.json for Vite**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "src/vite-env.d.ts"],
  "exclude": ["node_modules", "dist", "ios", "android"]
}
```

- [ ] **Step 5: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
declare module '*.glb' {
  const src: string;
  export default src;
}
```

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts vitest.config.ts index.html tsconfig.json src/vite-env.d.ts && git commit -m "feat: Vite + Vitest config, index.html entry point"
```

---

### Task 4: Create minimal main.tsx with blank R3F canvas

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: Create src/main.tsx**

```typescript
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 2: Create src/App.tsx (blank canvas checkpoint)**

```typescript
import {Canvas} from '@react-three/fiber';

export function App() {
  return (
    <div style={{width: '100vw', height: '100vh', background: '#000'}}>
      <Canvas>
        <ambientLight intensity={0.4} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 3: Verify — blank R3F canvas renders**

Run: `pnpm dev`

Expected: browser opens at `http://localhost:3000` showing a red cube on black background. **Phase 1 checkpoint.**

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/App.tsx && git commit -m "feat: Phase 1 checkpoint — blank R3F canvas renders in browser"
```

---

### Task 5: Move assets/ into public/

**Files:**
- Move: `assets/audio/*` -> `public/audio/`
- Move: `assets/models/*` -> `public/models/`
- Delete: `assets/` (empty after move)

The `assets/` directory was created during the Filament pivot as a copy of `public/`. Some files may exist in both. The canonical location is `public/` (Vite serves it at root).

- [ ] **Step 1: Merge assets/ into public/, overwriting duplicates**

```bash
# Copy any files from assets/ that don't exist in public/ (or are newer)
cp -n assets/audio/* public/audio/ 2>/dev/null || true
cp -n assets/models/* public/models/ 2>/dev/null || true
cp -rn assets/models/horror/* public/models/horror/ 2>/dev/null || true
cp -rn assets/models/ingredients/* public/models/ingredients/ 2>/dev/null || true
```

- [ ] **Step 2: Verify public/ has all assets**

```bash
find public/models -name "*.glb" | wc -l    # Should be 90+
find public/audio -name "*.ogg" | wc -l     # Should be 40+
```

- [ ] **Step 3: Delete assets/ directory**

```bash
rm -rf assets/
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: merge assets/ into public/, delete assets/"
```

---

### Task 6: Fix GameOrchestrator RN guard (was Task 5)

**Files:**
- Modify: `src/engine/GameOrchestrator.tsx`

- [ ] **Step 1: Find and remove the RN guard**

```bash
grep -n "typeof window.addEventListener" src/engine/GameOrchestrator.tsx
```

Remove the guard, keep the `window.addEventListener(...)` call — it always exists in a browser.

- [ ] **Step 2: Verify engine tests still pass**

Run: `pnpm test -- src/engine/`

Expected: all engine tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/engine/GameOrchestrator.tsx && git commit -m "fix: remove RN window.addEventListener guard"
```

---

## Chunk 2: Phase 2 — Restore R3F Components

### Task 7: Restore all deleted source files from git

**Files:**
- Restore: 78 source files from commit `6acdb4a~1`
- Restore: 8 E2E specs + Playwright config
- Restore: R3F mocks

- [ ] **Step 1: Restore R3F components, HUDs, player system, engine files**

```bash
git checkout 6acdb4a~1 -- \
  src/components/camera/ \
  src/components/challenges/ \
  src/components/characters/ \
  src/components/controls/ \
  src/components/effects/ \
  src/components/environment/ \
  src/components/kitchen/ \
  src/components/sausage/ \
  src/components/stations/ \
  src/components/ui/BlowoutHUD.tsx \
  src/components/ui/ChallengeHeader.tsx \
  src/components/ui/CookingHUD.tsx \
  src/components/ui/DialogueOverlay.tsx \
  src/components/ui/GameOverScreen.tsx \
  src/components/ui/GrindingHUD.tsx \
  src/components/ui/IngredientChallenge.tsx \
  src/components/ui/LoadingScreen.tsx \
  src/components/ui/ProgressGauge.tsx \
  src/components/ui/RoundTransition.tsx \
  src/components/ui/SettingsScreen.tsx \
  src/components/ui/StrikeCounter.tsx \
  src/components/ui/StuffingHUD.tsx \
  src/components/ui/TastingChallenge.tsx \
  src/components/ui/__tests__/ \
  src/player/ \
  src/engine/AudioEngine.ts \
  src/engine/AudioEngine.web.ts \
  src/engine/assetUrl.ts \
  src/engine/__tests__/AudioEngine.test.ts \
  src/engine/__tests__/assetUrl.test.ts \
  src/config/__tests__/ \
  src/db/usePersistence.ts
```

- [ ] **Step 2: Restore Playwright config + E2E specs**

```bash
git checkout 6acdb4a~1 -- playwright.config.ts e2e/
```

- [ ] **Step 3: Restore R3F mocks**

```bash
git checkout 6acdb4a~1 -- __mocks__/postprocessing.js __mocks__/three_tsl.js __mocks__/three_webgpu.js
```

- [ ] **Step 4: Verify file count**

```bash
find src/components -name "*.tsx" -o -name "*.ts" | wc -l
find src/player -name "*.tsx" -o -name "*.ts" | wc -l
```

Expected: ~55 component files, ~7 player files.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: restore all R3F components + player system + tests from pre-chainsaw"
```

---

### Task 8: Rewire Zustand imports to Koota ECS hooks

**Files:**
- Modify: ~30 files across `src/components/`, `src/player/`, `src/engine/`

- [ ] **Step 1: Find all Zustand store imports**

```bash
grep -rn "from.*store/gameStore" src/ --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 2: Replace all imports**

Change every occurrence of:
```typescript
import {useGameStore} from '../../store/gameStore';
```
to:
```typescript
import {useGameStore} from '../../ecs/hooks';
```

Use sed for bulk replacement, then manually verify relative paths are correct for each file depth.

- [ ] **Step 3: Remove assetUrl imports**

```bash
grep -rn "assetUrl" src/components/ src/player/ --include="*.ts" --include="*.tsx" -l
```

For each file, replace `assetUrl('/models/foo.glb')` with just `'/models/foo.glb'` (Vite serves `public/` at root).

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck 2>&1 | head -30`

Fix any remaining import path issues.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: rewire Zustand -> Koota ECS hooks, remove assetUrl"
```

---

### Task 9: Wire R3F scene into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace blank canvas with full game scene**

Wire up all restored R3F components. Reference `docs/port-reference/App.tsx.ref` for the complete component tree. Key elements:

- `<Canvas>` with PCF shadows, fog, exposure
- `<Physics>` wrapper from `@react-three/rapier`
- `<BasementRoom />`, `<Kitchen />`, `<FirstPersonControls />`
- All 9 station components
- `<MrSausage3D />`, `<Sausage />`, `<PlayerHands />`
- `<SurrealText />`, `<IntroSequence />`
- `<CrtShader />` post-processing
- Lighting: ambient (0.4) + directional (ceiling, shadows) + point (warm white)
- `<GameOrchestrator />` outside Canvas
- `<TitleScreen />` conditional on `appPhase === 'title'`

- [ ] **Step 2: Verify — kitchen renders in browser**

Run: `pnpm dev`

Expected: browser shows R3F kitchen with furniture, horror props, PBR textured walls/floor. **Phase 2 checkpoint.**

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx && git commit -m "feat: Phase 2 checkpoint — R3F kitchen renders with furniture + horror props"
```

---

## Chunk 3: Phase 3 — Rewrite RN UI + Persistence + Audio

### Task 10: Rewrite TitleScreen + DifficultySelector for web

**Files:**
- Modify: `src/components/ui/TitleScreen.tsx`
- Modify: `src/components/ui/DifficultySelector.tsx`

- [ ] **Step 1: Rewrite TitleScreen.tsx**

Replace all RN primitives with HTML/CSS:
- `View` -> `div`
- `Text` -> `span`/`h1`/`p`
- `TouchableOpacity` -> `button`
- `Animated` -> CSS `@keyframes` for swing animation
- `StyleSheet.create({...})` -> inline style objects or CSS modules
- `accessibilityRole` -> `role`
- `accessibilityLabel` -> `aria-label`

Keep the same visual design: butcher shop sign, chains, swing animation, gold button.

- [ ] **Step 2: Rewrite DifficultySelector.tsx**

Same RN-to-HTML mapping. `Pressable` -> `button`, etc.

- [ ] **Step 3: Verify title screen renders and is clickable**

Run: `pnpm dev`

Expected: title screen shows sign, START COOKING button works, difficulty selector works with mouse.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/TitleScreen.tsx src/components/ui/DifficultySelector.tsx && git commit -m "feat: rewrite TitleScreen + DifficultySelector from RN to HTML/CSS"
```

---

### Task 11: Rewrite db/client.ts — dual SQLite driver

**Files:**
- Modify: `src/db/client.ts`
- Create: `src/db/capacitorAdapter.ts`
- Modify: `src/db/drizzleQueries.ts` (make async-aware)
- Test: `src/db/__tests__/client.test.ts`

- [ ] **Step 1: Create capacitorAdapter.ts**

Thin adapter wrapping `@capacitor-community/sqlite` to match sql.js interface for Drizzle:

```typescript
import {CapacitorSQLite, SQLiteConnection} from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);

export async function createCapacitorDb(dbName: string) {
  const db = await sqlite.createConnection(dbName, false, 'no-encryption', 1, false);
  await db.open();
  return {
    exec(sql: string) { return db.execute(sql); },
    run(sql: string, params?: unknown[]) { return db.run(sql, params as any[]); },
    prepare(sql: string) {
      return { bind() {}, step() { return false; }, getAsObject() { return {}; }, free() {} };
    },
  };
}
```

- [ ] **Step 2: Rewrite client.ts with platform detection**

```typescript
import {Capacitor} from '@capacitor/core';
import {drizzle} from 'drizzle-orm/sql-js';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  if (Capacitor.isNativePlatform()) {
    const {createCapacitorDb} = await import('./capacitorAdapter');
    const sqliteDb = await createCapacitorDb('willitblow');
    dbInstance = drizzle(sqliteDb as any, {schema});
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    dbInstance = drizzle(new SQL.Database(), {schema});
  }
  return dbInstance;
}
```

- [ ] **Step 3: Update drizzleQueries.ts to use async getDb()**

- [ ] **Step 4: Write and run test**

Run: `pnpm test -- src/db/`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/ && git commit -m "feat: dual SQLite driver — sql.js web + capacitor-sqlite native"
```

---

### Task 12: Rewrite AudioEngine with Tone.js

**Files:**
- Modify: `src/engine/AudioEngine.ts`
- Delete: `src/engine/AudioEngine.web.ts`
- Modify: `src/engine/__tests__/AudioEngine.test.ts`

- [ ] **Step 1: Rewrite AudioEngine.ts with Tone.js**

Key features:
- `Tone.Player` for all 14 sample sounds (chop, grind, sizzle, etc.)
- `Tone.FMSynth` + `Tone.NoiseSynth` for procedural horror drone
- `Tone.Reverb` (decay 3s, wet 0.3) + `Tone.Filter` (lowpass 8kHz) effects chain
- `setMuffled(boolean)` — ramps filter to 400Hz for intro sequence
- `startDrone()` / `stopDrone()` — procedural basement ambience
- Same public API: `play(sound)`, `loop(sound)`, `stop(sound)`, `stopAll()`

- [ ] **Step 2: Delete AudioEngine.web.ts** (no longer needed — single platform)

- [ ] **Step 3: Update AudioEngine test with Tone.js mocks**

Mock `tone` module, verify `initialize()`, `play()`, `startDrone()`, `setMuffled()`.

- [ ] **Step 4: Run test**

Run: `pnpm test -- src/engine/__tests__/AudioEngine.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/AudioEngine.ts src/engine/__tests__/AudioEngine.test.ts
git rm -f src/engine/AudioEngine.web.ts
git commit -m "feat: Tone.js AudioEngine — samples + procedural drone + reverb + muffle"
```

---

### Task 13: Verify full game loop in browser (Phase 3 checkpoint)

- [ ] **Step 1: Run dev server and play through**

Run: `pnpm dev`

Manual verification:
1. Title screen shows "WILL IT BLOW?" sign
2. Click START COOKING -> difficulty selector
3. Select Medium -> kitchen loads
4. FPS camera: mouse drag to look, WASD to move
5. Kitchen furniture + horror props visible
6. SurrealText on surfaces
7. Station interactions work
8. Audio plays

- [ ] **Step 2: Fix any issues**

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: Phase 3 checkpoint — full game loop works in browser"
```

---

## Chunk 4: Phase 4 — Capacitor + Phase 5 — Tests & Docs

### Task 14: Initialize Capacitor

**Files:**
- Create: `capacitor.config.ts`
- Create: `ios/` (generated)
- Create: `android/` (generated)

- [ ] **Step 1: Build web app**

Run: `pnpm build`

- [ ] **Step 2: Init Capacitor**

```bash
npx cap init "Will It Blow" com.jbcom.willitblow --web-dir dist
```

- [ ] **Step 3: Add platforms**

```bash
npx cap add ios && npx cap add android
```

- [ ] **Step 4: Sync**

```bash
npx cap sync
```

- [ ] **Step 5: Commit**

```bash
git add capacitor.config.ts ios/ android/ && git commit -m "feat: Capacitor init — iOS + Android native shells"
```

---

### Task 15: Wire Capacitor plugins

**Files:**
- Create: `src/platform/haptics.ts`
- Create: `src/platform/screenOrientation.ts`
- Create: `src/platform/keepAwake.ts`
- Modify: `src/App.tsx` (wire keepAwake + haptics)

- [ ] **Step 1: Create platform wrappers**

Each wrapper checks `Capacitor.isNativePlatform()` and no-ops on web. See spec for API.

- `haptics.ts`: `hapticImpact(style)`, `hapticNotification()`
- `screenOrientation.ts`: `lockLandscape()`, `unlock()`
- `keepAwake.ts`: `enableKeepAwake()`, `disableKeepAwake()`

- [ ] **Step 2: Wire into App.tsx**

Call `enableKeepAwake()` when `appPhase` transitions to `'playing'`. Call `hapticImpact('light')` in station interaction handlers.

- [ ] **Step 3: Build, sync, verify iOS**

```bash
pnpm build && npx cap sync ios && npx cap open ios
```

Build in Xcode, run on simulator.

- [ ] **Step 4: Verify Android**

```bash
npx cap sync android && npx cap open android
```

Build in Android Studio, run on emulator.

- [ ] **Step 5: Commit**

```bash
git add src/platform/ src/App.tsx && git commit -m "feat: Phase 4 — Capacitor native shell with haptics, orientation, keepAwake"
```

---

### Task 16: Migrate tests Jest to Vitest

**Files:**
- Modify: all `*.test.ts` and `*.test.tsx` files

- [ ] **Step 1: Bulk replace Jest globals**

`jest.fn()` -> `vi.fn()`, `jest.mock()` -> `vi.mock()`, `jest.spyOn()` -> `vi.spyOn()`, etc.

- [ ] **Step 2: Add `import {vi} from 'vitest'` where needed**

Files using `vi.*` need the import. `describe`/`it`/`expect` are globals (configured in vitest.config.ts).

- [ ] **Step 3: Run all tests, fix failures**

Run: `pnpm test`

Common fixes: timer mocking, module mock syntax, missing jsdom APIs.

- [ ] **Step 4: Run E2E tests**

Run: `pnpm test:e2e`

Update `playwright.config.ts` base URL to `http://localhost:3000` if needed.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: migrate all tests Jest -> Vitest, all passing"
```

---

### Task 17: Update documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `docs/memory-bank/techContext.md`
- Modify: `docs/memory-bank/activeContext.md`

- [ ] **Step 1: Update AGENTS.md**

Remove: native-first, Filament, Bullet3, Maestro, Metro, Expo, RN, op-sqlite, expo-audio.
Replace with: Vite + R3F + Capacitor, Tone.js, sql.js + capacitor-sqlite, Playwright, Vitest.

- [ ] **Step 2: Update CLAUDE.md**

New commands: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, `pnpm cap:ios`, `pnpm cap:android`.

- [ ] **Step 3: Update memory bank docs**

Update `techContext.md` and `activeContext.md` with new stack.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md CLAUDE.md docs/memory-bank/ && git commit -m "docs: update all docs for Capacitor + R3F architecture"
```

---

### Task 18: Final verification

- [ ] **Step 1: Run full suite**

```bash
pnpm typecheck    # Zero errors
pnpm lint         # Zero errors
pnpm test         # All unit tests pass
pnpm test:e2e     # All E2E tests pass
pnpm dev          # Visual check — kitchen renders, game plays
pnpm build        # Production build succeeds
pnpm cap:ios      # iOS app launches
pnpm cap:android  # Android app launches
```

- [ ] **Step 2: Verify all success criteria from spec**

1. R3F kitchen scene with FPS camera, stations, horror props, PBR textures, physics
2. All unit tests pass via Vitest
3. Playwright E2E specs pass
4. iOS app works via Capacitor
5. Android app works via Capacitor
6. SQLite persistence works (web + native)
7. Tone.js audio plays samples + procedural sounds
8. Zero Expo/RN/Filament in dependency tree

- [ ] **Step 3: Final commit + push**

```bash
git add -A && git commit -m "feat: Phase 5 complete — Capacitor + R3F pivot done"
git push origin feat/greenfield-complete
```
