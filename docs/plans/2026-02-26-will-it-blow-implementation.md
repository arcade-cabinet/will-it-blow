# Will It Blow? Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete procedurally generated cooking game based on Ordinary Sausage, using React Native + BabylonJS for 3D scenes with React Native overlay UI.

**Architecture:** Three-layer rendering — BabylonJS 3D scenes at bottom, React Native UI overlay in middle, modal overlays on top. GameEngine context manages state machine flow through 8 phases. All 3D assets are procedural geometry. Audio via Tone.js synthesis.

**Tech Stack:** React Native 0.74, BabylonJS (via reactylon), Tone.js, Vite (web), TypeScript

---

## Task 1: Data Layer — Ingredients & Constants

**Files:**
- Create: `src/engine/Ingredients.ts`
- Create: `src/engine/Constants.ts`

**Step 1: Create Ingredients.ts with full ingredient database**

Port all 25+ ingredients from `sausage-game.jsx` (lines 5-30) into a typed module:

```typescript
// src/engine/Ingredients.ts
export interface Ingredient {
  name: string;
  emoji: string;
  category: "fast food" | "canned" | "fancy" | "absurd" | "sweet" | "spicy" | "comfort" | "international";
  tasteMod: number;   // 0-5
  textureMod: number; // 0-5
  burstRisk: number;  // 0-0.9
  blowPower: number;  // 0-5
  color: string;      // hex
}

export const INGREDIENTS: Ingredient[] = [
  { name: "Big Mac", emoji: "\u{1F354}", category: "fast food", tasteMod: 3, textureMod: 3, burstRisk: 0.2, blowPower: 2, color: "#D4A017" },
  { name: "SpaghettiOs", emoji: "\u{1F35D}", category: "canned", tasteMod: 2, textureMod: 1, burstRisk: 0.5, blowPower: 4, color: "#E85D2C" },
  // ... all 25+ from sausage-game.jsx lines 5-30
];

export function getRandomIngredientPool(count: number = 12): Ingredient[] {
  const shuffled = [...INGREDIENTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const CATEGORY_COLORS: Record<string, string> = {
  "fast food": "#FF6B35", canned: "#E85D2C", fancy: "#FFD700",
  absurd: "#E040FB", sweet: "#F48FB1", spicy: "#FF1744",
  comfort: "#FFC107", international: "#4FC3F7",
};
```

**Step 2: Create Constants.ts with game data**

Port songs, fan art, Mr. Sausage lines, phase metadata from `sausage-game.jsx` (lines 32-111):

```typescript
// src/engine/Constants.ts
export const SONGS = [
  "\u{1F3B5} Don't Fear The Sausage \u{1F3B5}",
  "\u{1F3B5} Bohemian Sausage-dy \u{1F3B5}",
  // ... all 8 from sausage-game.jsx lines 32-41
];

export const FAN_ART = [
  "a sausage wearing sunglasses riding a skateboard",
  // ... all 10 from sausage-game.jsx lines 43-54
];

export type GamePhase = "title" | "select" | "grind" | "stuff" | "blow" | "cook" | "taste" | "results";

export const PHASE_STEPS: GamePhase[] = ["select", "grind", "stuff", "blow", "cook", "taste"];
export const PHASE_LABELS = ["Pick", "Grind", "Stuff", "Blow", "Cook", "Taste"];
export const PHASE_EMOJIS = ["\u{1F6D2}", "\u2699\uFE0F", "\u{1FAD9}", "\u{1F32C}\uFE0F", "\u{1F525}", "\u{1F60B}"];

export const MR_SAUSAGE_LINES: Record<string, string[]> = {
  select: [
    "Well hey 'dere folks! Pick your poison!",
    "Choose wisely... or don't. It's all sausage.",
    "Ooh, some interesting options today!",
    "What are we sausaging today, folks?",
    "Remember: there are no bad sausages... okay maybe some.",
  ],
  grind: [
    "Get in there! Into the grinder!",
    "BZZZZZZ! Love that sound!",
    "This is going to be... something!",
    "Keep grinding, we're almost there!",
    "The grinder is HUNGRY today!",
  ],
  stuff: [
    "Three... two... one... LET'S SAUSAGE!",
    "Pack it in nice and tight!",
    "Looking like a beautiful sausage!",
    "Fill 'er up! Fill 'er up!",
    "That casing is holding up great!",
  ],
  blow: [
    "So will it blow?!",
    "Mrs. Sausage is NOT gonna be happy...",
    "This is gonna be messy, I can feel it!",
    "Watch the wall! Watch the wall!",
    "Mark Ruffalo would be proud!",
  ],
  cook: [
    "HERE WE GO! Into the pan!",
    "Sizzle sizzle, baby!",
    "Oh man, please don't burst...",
    "Smells... like something cooking!",
    "The moment of truth approaches!",
  ],
  taste: [
    "Let's open it up and see how we did!",
    "Moment of truth, folks...",
    "Time for the taste test!",
    "I'm both excited and terrified!",
    "May God have mercy on my soul!",
  ],
  results: [
    "And THAT'S how you sausage!",
    "Another one for the books!",
    "I'm the goddamn sausage king!",
    "This is a special message from Corporate!",
    "Subscribe and hit that sausage bell!",
  ],
};

export const GRINDER_TURN_ON_ITEMS = [
  "his elbow", "a spatula", "a rubber duck", "his forehead",
  "a TV remote", "a banana", "his pinky toe", "a flip-flop",
  "Mrs. Sausage's keys",
];

export const TASTE_QUOTES = [
  "May God have mercy on my soul!",
  "It's... it's not great.",
  "Ehh, I've had worse.",
  "Hey, that's actually pretty decent!",
  "That's a darn good sausage!",
  "THIS IS THE GREATEST SAUSAGE EVER MADE!",
];

export const TITLE_TIERS = [
  "Sausage Disaster", "Sausage Apprentice", "Sausage Maker",
  "Sausage Chef", "Sausage Master", "THE SAUSAGE KING",
];
```

**Step 3: Commit**

```bash
git add src/engine/Ingredients.ts src/engine/Constants.ts
git commit -m "feat: add ingredient database and game constants from POC"
```

---

## Task 2: Enhanced Game Engine — State Machine

**Files:**
- Rewrite: `src/engine/GameEngine.tsx`
- Create: `src/engine/SausagePhysics.ts`

**Step 1: Create SausagePhysics.ts**

```typescript
// src/engine/SausagePhysics.ts
import type { Ingredient } from "./Ingredients";

export function calculateBlowRuffalos(
  holdDurationSec: number,
  ingredients: Ingredient[],
): number {
  const avgBlow = ingredients.reduce((a, i) => a + i.blowPower, 0) / ingredients.length;
  const dur = Math.min(holdDurationSec, 3);
  const pow = Math.min((dur / 3) * avgBlow + Math.random() * 1.5, 5);
  return Math.round(Math.max(0, Math.min(5, pow)));
}

export function checkBurst(ingredients: Ingredient[]): boolean {
  const avgRisk = ingredients.reduce((a, i) => a + i.burstRisk, 0) / ingredients.length;
  return Math.random() < avgRisk;
}

export function calculateTasteRating(
  ingredients: Ingredient[],
  hasBurst: boolean,
): number {
  const avgTaste = ingredients.reduce((a, i) => a + i.tasteMod, 0) / ingredients.length;
  const avgTexture = ingredients.reduce((a, i) => a + i.textureMod, 0) / ingredients.length;
  let base = avgTaste * 0.6 + avgTexture * 0.4;
  if (hasBurst) base -= 0.5;
  base += (Math.random() - 0.5) * 1.5;
  return Math.round(Math.max(0, Math.min(5, base)));
}

export function calculateFinalScore(
  sausageRating: number,
  ruffalos: number,
  hasBurst: boolean,
  bonusPoints: number,
): number {
  const tasteScore = (sausageRating / 5) * 60;
  const blowScore = (ruffalos / 5) * 20;
  const burstBonus = hasBurst ? 0 : 20;
  return Math.min(Math.round(tasteScore + blowScore + burstBonus + bonusPoints), 100);
}

export function getTitleTier(score: number): string {
  const tiers = [
    "Sausage Disaster", "Sausage Apprentice", "Sausage Maker",
    "Sausage Chef", "Sausage Master", "THE SAUSAGE KING",
  ];
  return tiers[Math.min(Math.floor(score / 20), 5)];
}
```

**Step 2: Rewrite GameEngine.tsx**

Replace the existing GameEngine with a proper state machine matching the POC's flow. See `sausage-game.jsx` lines 1181-1272 for the flow logic:

```typescript
// src/engine/GameEngine.tsx
import React, { createContext, type ReactNode, useContext, useRef, useState } from "react";
import type { Ingredient } from "./Ingredients";
import { audioEngine } from "./AudioEngine";

export type GamePhase = "title" | "select" | "grind" | "stuff" | "blow" | "cook" | "taste" | "results";

interface GameContextType {
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;
  ingredients: Ingredient[];
  setIngredients: (ingredients: Ingredient[]) => void;
  grindProgress: number;
  setGrindProgress: (v: number | ((p: number) => number)) => void;
  stuffProgress: number;
  setStuffProgress: (v: number | ((p: number) => number)) => void;
  ruffalos: number;
  setRuffalos: (v: number) => void;
  hasBurst: boolean;
  setHasBurst: (v: boolean) => void;
  sausageRating: number;
  setSausageRating: (v: number) => void;
  bonusPoints: number;
  setBonusPoints: (v: number | ((p: number) => number)) => void;
  showButFirst: boolean;
  setShowButFirst: (v: boolean) => void;
  pendingPhase: GamePhase | null;
  setPendingPhase: (v: GamePhase | null) => void;
  butFirstUsed: React.MutableRefObject<boolean>;
  cookProgress: number;
  setCookProgress: (v: number | ((p: number) => number)) => void;
  tryButFirst: (nextPhase: GamePhase) => void;
  handleButFirstComplete: (bonus: number) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [phase, setPhaseRaw] = useState<GamePhase>("title");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [grindProgress, setGrindProgress] = useState(0);
  const [stuffProgress, setStuffProgress] = useState(0);
  const [ruffalos, setRuffalos] = useState(0);
  const [hasBurst, setHasBurst] = useState(false);
  const [sausageRating, setSausageRating] = useState(0);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [showButFirst, setShowButFirst] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<GamePhase | null>(null);
  const [cookProgress, setCookProgress] = useState(0);
  const butFirstUsed = useRef(false);

  const setPhase = (newPhase: GamePhase) => {
    if (phase === "title" && newPhase !== "title") {
      audioEngine.initTone();
    }
    setPhaseRaw(newPhase);
  };

  const tryButFirst = (nextPhase: GamePhase) => {
    if (
      !butFirstUsed.current &&
      (nextPhase === "blow" || nextPhase === "cook") &&
      Math.random() > 0.4
    ) {
      butFirstUsed.current = true;
      setPendingPhase(nextPhase);
      setShowButFirst(true);
    } else {
      setPhase(nextPhase);
    }
  };

  const handleButFirstComplete = (bonus: number) => {
    setBonusPoints((b) => b + bonus);
    setShowButFirst(false);
    if (pendingPhase) {
      setPhase(pendingPhase);
      setPendingPhase(null);
    }
  };

  const resetGame = () => {
    setPhaseRaw("title");
    setIngredients([]);
    setGrindProgress(0);
    setStuffProgress(0);
    setRuffalos(0);
    setHasBurst(false);
    setSausageRating(0);
    setBonusPoints(0);
    setShowButFirst(false);
    setPendingPhase(null);
    butFirstUsed.current = false;
    audioEngine.stopEngine();
  };

  return (
    <GameContext.Provider value={{
      phase, setPhase, ingredients, setIngredients,
      grindProgress, setGrindProgress, stuffProgress, setStuffProgress,
      ruffalos, setRuffalos, hasBurst, setHasBurst,
      sausageRating, setSausageRating, bonusPoints, setBonusPoints,
      showButFirst, setShowButFirst, pendingPhase, setPendingPhase,
      butFirstUsed, cookProgress, setCookProgress,
      tryButFirst, handleButFirstComplete, resetGame,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};
```

**Step 3: Commit**

```bash
git add src/engine/GameEngine.tsx src/engine/SausagePhysics.ts
git commit -m "feat: enhanced game engine with full state machine and physics"
```

---

## Task 3: Enhanced Audio Engine

**Files:**
- Rewrite: `src/engine/AudioEngine.ts`

**Step 1: Enhance AudioEngine.ts**

Add blow whoosh, countdown beeps, BUT FIRST slam, title jingle. Keep all existing synths (grinder, stuffer, pressure, burst, rating songs):

```typescript
// src/engine/AudioEngine.ts
import * as Tone from "tone";

class AudioEngine {
  private synths: any[] = [];
  private currentSong: Tone.Part | null = null;
  private sfxSynths: Record<string, any> = {};
  private isInitialized = false;

  async initTone() {
    if (this.isInitialized) return;
    await Tone.start();
    Tone.Transport.start();

    // Grinder (Brown noise with rapid tremolo)
    this.sfxSynths.grinder = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: { attack: 0.1, decay: 0, sustain: 1, release: 0.2 },
      volume: -10,
    }).toDestination();
    this.sfxSynths.grinderLfo = new Tone.LFO(15, -20, -10).start();
    this.sfxSynths.grinderLfo.connect(this.sfxSynths.grinder.volume);

    // Stuffing squelch
    this.sfxSynths.stuffer = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 10,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: "exponential" },
    }).toDestination();

    // Pressure (Rising Pitch)
    this.sfxSynths.pressure = new Tone.Oscillator(50, "sine").toDestination();
    this.sfxSynths.pressure.volume.value = -20;

    // Countdown beep
    this.sfxSynths.beep = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -8,
    }).toDestination();

    // Blow whoosh (filtered noise)
    const blowFilter = new Tone.Filter(200, "lowpass").toDestination();
    this.sfxSynths.blowNoise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.3 },
      volume: -12,
    }).connect(blowFilter);
    this.sfxSynths.blowFilter = blowFilter;

    // Impact slam (for BUT FIRST)
    this.sfxSynths.slam = new Tone.MembraneSynth({
      pitchDecay: 0.02, octaves: 6,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 },
      volume: -4,
    }).toDestination();

    // Sizzle (for cooking)
    this.sfxSynths.sizzle = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.4 },
      volume: -15,
    }).toDestination();

    this.isInitialized = true;
  }

  startGrinder() {
    if (!this.isInitialized) return;
    this.sfxSynths.grinder.triggerAttack();
  }

  stopGrinder() {
    if (!this.isInitialized) return;
    this.sfxSynths.grinder.triggerRelease();
  }

  playStuffingSquelch() {
    if (!this.isInitialized) return;
    this.sfxSynths.stuffer.triggerAttackRelease("C2", "8n");
  }

  playCountdownBeep(final: boolean = false) {
    if (!this.isInitialized) return;
    this.sfxSynths.beep.triggerAttackRelease(final ? "C5" : "C4", "16n");
  }

  startBlowWhoosh() {
    if (!this.isInitialized) return;
    this.sfxSynths.blowNoise.triggerAttack();
    this.sfxSynths.blowFilter.frequency.rampTo(2000, 2);
  }

  stopBlowWhoosh() {
    if (!this.isInitialized) return;
    this.sfxSynths.blowNoise.triggerRelease();
    this.sfxSynths.blowFilter.frequency.value = 200;
  }

  playSlam() {
    if (!this.isInitialized) return;
    this.sfxSynths.slam.triggerAttackRelease("C1", "8n");
  }

  playSizzle() {
    if (!this.isInitialized) return;
    this.sfxSynths.sizzle.triggerAttackRelease("8n");
  }

  updatePressure(intensity: number) {
    if (!this.isInitialized) return;
    if (this.sfxSynths.pressure.state !== "started") {
      this.sfxSynths.pressure.start();
    }
    const freq = 50 + intensity * 7.5;
    this.sfxSynths.pressure.frequency.rampTo(freq, 0.1);
    const vol = -20 + intensity * 0.15;
    this.sfxSynths.pressure.volume.rampTo(vol, 0.1);
  }

  stopPressure() {
    if (!this.isInitialized) return;
    this.sfxSynths.pressure.stop();
  }

  playBurst() {
    if (!this.isInitialized) return;
    const burst = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.1 },
      volume: -5,
    }).toDestination();
    burst.triggerAttackRelease("8n");
  }

  playTitleJingle() {
    if (!this.isInitialized) return;
    this.stopEngine();
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    this.synths.push(synth);
    const melody: [string, string][] = [
      ["0:0", "E4"], ["0:0:2", "G4"], ["0:1", "A4"],
      ["0:1:2", "G4"], ["0:2", "E4"], ["0:2:2", "C4"],
      ["0:3", "E4"], ["0:3:2", "G4"],
    ];
    this.currentSong = new Tone.Part((time, note) => {
      synth.triggerAttackRelease(note, "8n", time);
    }, melody).start(0);
    Tone.Transport.start();
  }

  playRatingSong(markRuffalos: number) {
    if (!this.isInitialized) return;
    this.stopEngine();
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    this.synths.push(synth);
    let melody: [string, string][];
    if (markRuffalos >= 4) {
      melody = [["0:0","C4"],["0:1","E4"],["0:2","G4"],["0:3","C5"]];
    } else if (markRuffalos > 0) {
      melody = [["0:0","C4"],["0:1","D4"],["0:2","E4"],["0:3","C4"]];
    } else {
      melody = [["0:0","C4"],["0:1","G3"],["0:2","E3"],["0:3","C3"]];
    }
    this.currentSong = new Tone.Part((time, note) => {
      synth.triggerAttackRelease(note, "8n", time);
    }, melody).start(0);
    Tone.Transport.start();
  }

  stopEngine() {
    if (this.currentSong) { this.currentSong.dispose(); this.currentSong = null; }
    this.synths.forEach((s) => s.dispose());
    this.synths = [];
    if (this.isInitialized) {
      this.stopGrinder();
      this.stopPressure();
    }
  }
}

export const audioEngine = new AudioEngine();
```

**Step 2: Commit**

```bash
git add src/engine/AudioEngine.ts
git commit -m "feat: enhanced audio engine with blow whoosh, countdown, slam, sizzle, jingle"
```

---

## Task 4: UI Components — Shared Widgets

**Files:**
- Create: `src/components/ui/ProgressBar.tsx`
- Create: `src/components/ui/SausageRating.tsx`
- Create: `src/components/ui/RuffaloRating.tsx`
- Create: `src/components/ui/PhaseTracker.tsx`
- Create: `src/components/ui/SfxText.tsx`

**Step 1: Create all shared UI components**

These are React Native ports of the POC's utility components (`sausage-game.jsx` lines 115-217, 377-417). Use React Native `View`, `Text`, `Animated` instead of HTML divs. Style with `StyleSheet.create`.

Key adaptation: Replace CSS animations with React Native `Animated` API or `useEffect` + state for simple oscillations.

Each component follows the POC's visual design but uses RN primitives:

- `ProgressBar.tsx`: `View` with inner colored `View` at `width: ${pct}%`
- `SausageRating.tsx`: Row of hot dog text emojis, grayed out beyond count
- `RuffaloRating.tsx`: Row of "MR" circle `View`s, green if active
- `PhaseTracker.tsx`: Horizontal step indicator with circles and connector lines
- `SfxText.tsx`: Floating text overlays using `Animated.View` with fade/translate

Reference: `sausage-game.jsx` lines 115-417 for exact visual specs.

**Step 2: Commit**

```bash
git add src/components/ui/
git commit -m "feat: shared UI widgets - progress bar, ratings, phase tracker, SFX text"
```

---

## Task 5: UI Components — Mr. Sausage Avatar

**Files:**
- Create: `src/components/ui/MrSausageAvatar.tsx`

**Step 1: Build Mr. Sausage avatar**

Port from `sausage-game.jsx` lines 266-374. React Native version with:
- Fixed position bottom-left (use `position: "absolute"`)
- Bobbing animation via `Animated.Value` sine wave
- Speech bubble with phase-appropriate lines from `MR_SAUSAGE_LINES`
- Mood-based emoji face (happy, excited, nervous, disgusted, shocked, singing, proud, thinking)
- Chef hat rendered as nested `View`s
- Auto-cycles lines every 5 seconds

**Step 2: Commit**

```bash
git add src/components/ui/MrSausageAvatar.tsx
git commit -m "feat: Mr. Sausage avatar with speech bubbles and mood system"
```

---

## Task 6: UI Components — Title & Select Screens

**Files:**
- Create: `src/components/ui/TitleOverlay.tsx`
- Create: `src/components/ui/IngredientSelect.tsx`

**Step 1: Build TitleOverlay**

Port from `sausage-game.jsx` lines 528-568. Full-screen overlay with:
- Large sausage emoji with rotation animation
- "ORDINARY SAUSAGE" title with glow
- "THE GAME" subtitle
- "LET'S SAUSAGE!" button
- Calls `setPhase("select")` on press

**Step 2: Build IngredientSelect**

Port from `sausage-game.jsx` lines 570-636. Grid of ingredient cards:
- Call `getRandomIngredientPool(12)` on mount
- Each card: emoji, name, category tag colored by category
- Toggle selection (max 3)
- "GRIND [emojis] -> sausage" confirm button
- Calls `setIngredients(selected); setPhase("grind")` on confirm

**Step 3: Commit**

```bash
git add src/components/ui/TitleOverlay.tsx src/components/ui/IngredientSelect.tsx
git commit -m "feat: title screen and ingredient selection UI"
```

---

## Task 7: 3D Scene — Grinder

**Files:**
- Create: `src/components/scenes/GrinderScene.tsx`

**Step 1: Build GrinderScene**

Replace existing `GrindingPhase.tsx`. Enhanced 3D grinder with:
- Hopper: `MeshBuilder.CreateCylinder` inverted cone (diameterTop: 4, diameterBottom: 1, height: 3), semi-transparent gray material
- Blade: `MeshBuilder.CreateBox` that spins on Y-axis per tap
- Ingredient chunks: `ParticleSystem` with ingredient colors, emit on tap
- Camera positioned to see full grinder
- Grinder shakes more as progress increases (via scene render loop)
- Tapping triggers: blade spin animation, particle burst, `audioEngine.startGrinder()` then `stopGrinder()` after 300ms

Interactions come from overlay UI (Task 8 handles the grind button/progress), but the scene responds to `grindProgress` from context to drive visual intensity.

**Step 2: Commit**

```bash
git add src/components/scenes/GrinderScene.tsx
git commit -m "feat: 3D grinder scene with particles and shake"
```

---

## Task 8: UI Overlay — Grind Phase

**Files:**
- Create: `src/components/ui/GrindOverlay.tsx`

**Step 1: Build grind phase overlay**

Port interaction logic from `sausage-game.jsx` lines 638-720:
- "GRIND PHASE" title
- First: "Turn on grinder with [random item]" button (from `GRINDER_TURN_ON_ITEMS`)
- Then: Large circular tap button with conic gradient progress
- `ProgressBar` for grind progress
- `SfxText` with ["BZZZZZ!", "GRRRND!", "CRUNCH!", "*grinding*", "WHIRRRR!"]
- Each tap: increment progress by 2.5 + random*2, play grinder sound
- At 100%: "FULLY GROUND!" text, auto-advance to "stuff" phase after 600ms

**Step 2: Commit**

```bash
git add src/components/ui/GrindOverlay.tsx
git commit -m "feat: grind phase UI overlay with tap mechanic"
```

---

## Task 9: 3D Scene + UI — Stuff Phase

**Files:**
- Create: `src/components/scenes/StufferScene.tsx`
- Create: `src/components/ui/StuffOverlay.tsx`
- Create: `src/components/ui/CountdownOverlay.tsx`

**Step 1: Build StufferScene**

Enhanced version of existing `StuffingPhase.tsx`:
- Horizontal stuffer pipe: `MeshBuilder.CreateCylinder` rotated 90 degrees
- Casing growing out the end: second cylinder that scales on Y-axis based on `stuffProgress`
- Casing colored with ingredient gradient
- Tie knots at ends when done (small spheres)

**Step 2: Build CountdownOverlay**

The iconic "3... 2... 1... LET'S SAUSAGE!" from `sausage-game.jsx` lines 723-742:
- Countdown numbers with scale-in animation
- `audioEngine.playCountdownBeep()` per number, final beep on "LET'S SAUSAGE!"
- Then random parody song display (fade in/out over 2.5s)
- Then transitions to active stuffing

**Step 3: Build StuffOverlay**

Port from `sausage-game.jsx` lines 722-812:
- "STUFF THE CASING" title
- Shows countdown, then song, then stuff button
- "STUFF!" tap button, each tap adds 4 + random*3 to stuffProgress
- `ProgressBar` for "SAUSAGE FULLNESS"
- `SfxText` with ["SQUISH!", "SQUELCH!", "*stuffing*", "PACK!", "SQUEEZE!"]
- At 100%: "PERFECTLY STUFFED!", advance via `tryButFirst("blow")`

**Step 4: Commit**

```bash
git add src/components/scenes/StufferScene.tsx src/components/ui/StuffOverlay.tsx src/components/ui/CountdownOverlay.tsx
git commit -m "feat: stuff phase with 3-2-1 countdown, song, and casing fill"
```

---

## Task 10: 3D Scene + UI — Will It Blow

**Files:**
- Create: `src/components/scenes/BlowScene.tsx`
- Create: `src/components/ui/BlowOverlay.tsx`

**Step 1: Build BlowScene**

3D scene for the blow phase:
- Tube end viewed head-on: `MeshBuilder.CreateCylinder` facing camera
- Wall behind camera: flat `MeshBuilder.CreatePlane`
- Splat particles: `ParticleSystem` that fires toward the wall on release
- Particle colors from ingredients

**Step 2: Build BlowOverlay**

Port from `sausage-game.jsx` lines 814-909:
- "WILL IT BLOW?!" title
- "HOLD TO BLOW!" button (onPressIn starts, onPressOut releases)
- Blow power meter (`ProgressBar`) fills while holding
- On release: calculate ruffalos via `calculateBlowRuffalos()`
- Show splat wall result (colored circles on dark background View)
- "X MARK RUFFALOS!" text + `RuffaloRating` component
- "TIME TO COOK!" button -> `tryButFirst("cook")`
- Audio: `audioEngine.startBlowWhoosh()` on hold, `stopBlowWhoosh()` on release

**Step 3: Commit**

```bash
git add src/components/scenes/BlowScene.tsx src/components/ui/BlowOverlay.tsx
git commit -m "feat: Will It Blow phase with hold mechanic and Mark Ruffalo rating"
```

---

## Task 11: 3D Scene + UI — Cook Phase

**Files:**
- Create: `src/components/scenes/CookScene.tsx`
- Create: `src/components/ui/CookOverlay.tsx`

**Step 1: Build CookScene**

Enhanced version of existing `CookingPhase.tsx`:
- Frying pan: `MeshBuilder.CreateTorus` for rim + `MeshBuilder.CreateDisc` for base
- Sausage inside: cylinder with ingredient-colored gradient material
- Spark particles from `ParticleSystem` (small yellow dots)
- Sausage swells/shakes on burst (scaling + position jitter in render loop)
- Color shifts redder as cooking progresses
- Pan handle: `MeshBuilder.CreateBox` extending from rim

**Step 2: Build CookOverlay**

Port from `sausage-game.jsx` lines 911-1016:
- "COOK THE SAUSAGE" title
- "HERE WE GO!" slam text (1.5s display)
- "START COOKING!" button
- Auto-cooking: interval that increments `cookProgress` by 1 every 80ms
- At 40%: burst check via `checkBurst()`. If burst: "BURST!" alert, cosmetic damage
- `ProgressBar` for cook progress (red if burst, orange if not)
- `SfxText` with ["SIZZLE!", "CRACKLE!", "*sizzling*", "POP!", "TSSSSS!"]
- At 100%: advance to "taste"
- Audio: `audioEngine.playSizzle()` periodically during cooking

**Step 3: Commit**

```bash
git add src/components/scenes/CookScene.tsx src/components/ui/CookOverlay.tsx
git commit -m "feat: cook phase with burst risk, sizzle, and pan scene"
```

---

## Task 12: 3D Scene + UI — Taste Test

**Files:**
- Create: `src/components/scenes/TasteScene.tsx`
- Create: `src/components/ui/TasteOverlay.tsx`

**Step 1: Build TasteScene**

3D taste test scene:
- Whole sausage on a plate (disc + cylinder)
- On "cut": sausage splits into two halves (two half-cylinders slide apart)
- Cross-section shows ingredient colors (flat disc with colored material)

**Step 2: Build TasteOverlay**

Port from `sausage-game.jsx` lines 1018-1106:
- "TASTE TEST" title
- "Let's open it up..." text
- Sausage visual (colored View)
- "CUT IT OPEN!" button -> split animation
- After split: calculate rating via `calculateTasteRating()`
- Show quote from `TASTE_QUOTES[rating]`
- `SausageRating` component
- Rating number display
- "SEE FINAL RESULTS" button -> `setPhase("results")`

**Step 3: Commit**

```bash
git add src/components/scenes/TasteScene.tsx src/components/ui/TasteOverlay.tsx
git commit -m "feat: taste test phase with cut animation and rating"
```

---

## Task 13: UI — Results Screen & BUT FIRST Event

**Files:**
- Create: `src/components/ui/ResultsScreen.tsx`
- Create: `src/components/ui/ButFirstEvent.tsx`

**Step 1: Build ResultsScreen**

Port from `sausage-game.jsx` lines 1108-1177:
- "SAUSAGE REPORT CARD" title
- Sausage name: "[Ingredient] & [Ingredient] Sausage"
- Ingredient emojis -> sausage emoji
- Taste rating (`SausageRating` + number)
- Will It Blow rating (`RuffaloRating` + Mark Ruffalo count)
- Burst status (burst or no burst)
- BUT FIRST bonus (if any)
- Overall score % (calculated via `calculateFinalScore()`)
- Title tier (via `getTitleTier()`)
- "MAKE ANOTHER SAUSAGE!" button -> `resetGame()`
- Audio: `audioEngine.playRatingSong(sausageRating)`

**Step 2: Build ButFirstEvent**

Port from `sausage-game.jsx` lines 421-524:
- Full-screen modal overlay
- "BUT FIRST!" slam title (scale-in animation)
- Smash-the-sausage: tap button 5 times to crack it (visual cracks appear)
- After 5 smashes: reveal random fan art description from `FAN_ART`
- Show bonus points (3-10% random)
- "BACK TO THE SAUSAGE!" button -> `handleButFirstComplete(bonus)`
- Audio: `audioEngine.playSlam()` on "BUT FIRST!" appearance

**Step 3: Commit**

```bash
git add src/components/ui/ResultsScreen.tsx src/components/ui/ButFirstEvent.tsx
git commit -m "feat: results screen with report card and BUT FIRST mini-game"
```

---

## Task 14: Scene Orchestrator — Wire Everything Together

**Files:**
- Rewrite: `src/components/GameWorld.web.tsx`
- Rewrite: `App.tsx`
- Modify: `src/index.web.tsx`

**Step 1: Rewrite GameWorld.web.tsx**

The main scene orchestrator now renders the correct 3D scene per phase:

```typescript
// src/components/GameWorld.web.tsx
import * as BABYLON from "@babylonjs/core";
import { Camera, Color4, HemisphericLight, DirectionalLight, Vector3 } from "@babylonjs/core";
import React, { useState } from "react";
import { Scene } from "reactylon";
import { Engine } from "reactylon/web";
import { useGame } from "../engine/GameEngine";
import { TitleScene } from "./scenes/TitleScene";
import { GrinderScene } from "./scenes/GrinderScene";
import { StufferScene } from "./scenes/StufferScene";
import { BlowScene } from "./scenes/BlowScene";
import { CookScene } from "./scenes/CookScene";
import { TasteScene } from "./scenes/TasteScene";

export const GameWorld = () => {
  const { phase } = useGame();
  const [camera, setCamera] = useState<Camera>();

  const onSceneReady = (scene: any) => {
    scene.clearColor = new Color4(0.06, 0.06, 0.06, 1);
    const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.4;
    ambient.groundColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    const dir = new DirectionalLight("dir", new Vector3(-1, -2, -1), scene);
    dir.position = new Vector3(20, 40, 20);
    dir.intensity = 0.8;
    scene.createDefaultCameraOrLight(true, undefined, true);
    const cam = scene.activeCamera as BABYLON.ArcRotateCamera;
    cam.alpha = -Math.PI / 2;
    cam.beta = Math.PI / 2.5;
    cam.radius = 10;
    setCamera(cam);
  };

  return (
    <Engine antialias engineOptions={{ preserveDrawingBuffer: true, stencil: true }} style={{ width: "100%", height: "100%" }}>
      <Scene onSceneReady={onSceneReady}>
        {camera && (
          <>
            {phase === "title" && <TitleScene />}
            {phase === "select" && <TitleScene />}
            {phase === "grind" && <GrinderScene />}
            {phase === "stuff" && <StufferScene />}
            {phase === "blow" && <BlowScene />}
            {phase === "cook" && <CookScene />}
            {phase === "taste" && <TasteScene />}
            {phase === "results" && <TitleScene />}
          </>
        )}
      </Scene>
    </Engine>
  );
};
```

**Step 2: Rewrite App.tsx**

The main app now layers 3D scene + UI overlays:

```typescript
// App.tsx
import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { GameWorld } from "./src/components/GameWorld";
import { GameProvider, useGame } from "./src/engine/GameEngine";
import { TitleOverlay } from "./src/components/ui/TitleOverlay";
import { IngredientSelect } from "./src/components/ui/IngredientSelect";
import { GrindOverlay } from "./src/components/ui/GrindOverlay";
import { StuffOverlay } from "./src/components/ui/StuffOverlay";
import { BlowOverlay } from "./src/components/ui/BlowOverlay";
import { CookOverlay } from "./src/components/ui/CookOverlay";
import { TasteOverlay } from "./src/components/ui/TasteOverlay";
import { ResultsScreen } from "./src/components/ui/ResultsScreen";
import { MrSausageAvatar } from "./src/components/ui/MrSausageAvatar";
import { ButFirstEvent } from "./src/components/ui/ButFirstEvent";
import { PhaseTracker } from "./src/components/ui/PhaseTracker";

const GameUI = () => {
  const { phase, showButFirst } = useGame();
  const isPlaying = phase !== "title" && phase !== "results";

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Phase tracker */}
      {isPlaying && <PhaseTracker />}

      {/* Phase-specific overlays */}
      {phase === "title" && <TitleOverlay />}
      {phase === "select" && <IngredientSelect />}
      {phase === "grind" && <GrindOverlay />}
      {phase === "stuff" && <StuffOverlay />}
      {phase === "blow" && <BlowOverlay />}
      {phase === "cook" && <CookOverlay />}
      {phase === "taste" && <TasteOverlay />}
      {phase === "results" && <ResultsScreen />}

      {/* Mr. Sausage avatar (all phases except title) */}
      {phase !== "title" && !showButFirst && <MrSausageAvatar />}

      {/* BUT FIRST modal */}
      {showButFirst && <ButFirstEvent />}
    </View>
  );
};

export default function App() {
  return (
    <GameProvider>
      <SafeAreaView style={styles.container}>
        <GameWorld />
        <GameUI />
      </SafeAreaView>
    </GameProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  overlay: { ...StyleSheet.absoluteFillObject },
});
```

**Step 3: Commit**

```bash
git add src/components/GameWorld.web.tsx App.tsx
git commit -m "feat: wire all phases together in scene orchestrator and app shell"
```

---

## Task 15: Title Scene (3D)

**Files:**
- Create: `src/components/scenes/TitleScene.tsx`

**Step 1: Build TitleScene**

Enhanced version of existing `IntroPhase.tsx`:
- Sausage body: `MeshBuilder.CreateCylinder` with hemisphere caps
- Peter Griffin glasses: two flat cylinders + bridge box
- Mustache: curved box with brown material
- Chef hat: stacked cylinders in white
- Bobbing animation on render loop
- Rotating ingredient box below (for select phase context)
- Warm spotlight for dramatic effect

**Step 2: Commit**

```bash
git add src/components/scenes/TitleScene.tsx
git commit -m "feat: enhanced title scene with Mr. Sausage mascot"
```

---

## Task 16: Cleanup & Polish

**Files:**
- Delete: `src/components/IntroPhase.tsx` (replaced by TitleScene)
- Delete: `src/components/GrindingPhase.tsx` (replaced by GrinderScene)
- Delete: `src/components/StuffingPhase.tsx` (replaced by StufferScene)
- Delete: `src/components/CookingPhase.tsx` (replaced by CookScene)
- Delete: `src/components/RatingPhase.tsx` (replaced by ResultsScreen)
- Modify: `index.html` - update title, set dark background

**Step 1: Remove old phase components**

```bash
rm src/components/IntroPhase.tsx src/components/GrindingPhase.tsx
rm src/components/StuffingPhase.tsx src/components/CookingPhase.tsx
rm src/components/RatingPhase.tsx
```

**Step 2: Update index.html**

Change background-color from white to #0a0a0a, ensure title says "Will It Blow? - Ordinary Sausage: The Game"

**Step 3: Verify build**

```bash
pnpm dev
```

Open http://localhost:3000, play through all 8 phases, verify:
- Title screen displays with mascot
- Ingredient selection works (pick 1-3)
- Grind phase responds to taps, particles fly, progress fills
- Stuff phase has countdown, song, tap-to-stuff
- Will It Blow has hold mechanic, splat wall, Mark Ruffalos
- Cook phase auto-cooks, burst check works
- Taste test cuts open, shows rating
- Results shows full report card
- BUT FIRST can interrupt (random)
- Mr. Sausage appears with contextual commentary
- Audio works throughout

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Will It Blow? - complete Ordinary Sausage game"
```

---

## Dependency Order

```
Task 1 (data) ──┐
                 ├──> Task 2 (engine) ──> Task 3 (audio) ──┐
                 │                                          │
                 ├──> Task 4 (shared UI) ──────────────────>├──> Task 14 (wiring)
                 │                                          │
                 ├──> Task 5 (Mr. Sausage) ────────────────>│
                 │                                          │
                 ├──> Task 6 (title/select UI) ────────────>│
                 │                                          │
                 ├──> Task 7 (grinder 3D) + Task 8 (grind UI) ──>│
                 │                                          │
                 ├──> Task 9 (stuff 3D+UI) ────────────────>│
                 │                                          │
                 ├──> Task 10 (blow 3D+UI) ────────────────>│
                 │                                          │
                 ├──> Task 11 (cook 3D+UI) ────────────────>│
                 │                                          │
                 ├──> Task 12 (taste 3D+UI) ───────────────>│
                 │                                          │
                 └──> Task 13 (results+butfirst UI) ───────>│
                                                            │
                                        Task 15 (title 3D) >│
                                                            │
                                        Task 16 (cleanup) <─┘
```

Tasks 4-13 and 15 can run in parallel after Tasks 1-3 complete.
