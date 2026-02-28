# Horror Kitchen Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Will It Blow from a click-through sausage mini-game into a first-person horror escape room with sequential challenges, waypoint navigation, CRT TV Mr. Sausage, and persistent progression.

**Architecture:** Incremental pivot — keep React Native 0.83 + Babylon.js 8.53 + reactylon 3.5 + Cannon.js 0.20 + Expo 55 stack. Replace all scene components and game engine with new challenge-based system. Add Zustand for persistent state, waypoint navigation for mobile-first movement, and CRT shader effects for Mr. Sausage's television.

**Tech Stack:** React Native, Babylon.js 8.53, reactylon 3.5, Cannon.js 0.20, Zustand, TypeScript, Jest

**Design Doc:** `docs/plans/2026-02-27-first-person-horror-kitchen-design.md`

---

## Task 1: Install Zustand + Set Up Store with Tests

**Files:**
- Modify: `package.json` (add zustand dependency)
- Create: `src/store/gameStore.ts`
- Create: `__tests__/gameStore.test.ts`

**Step 1: Install zustand**

```bash
pnpm add zustand
```

**Step 2: Write failing tests for game store**

Create `__tests__/gameStore.test.ts`:

```typescript
import { useGameStore } from '../src/store/gameStore';

// Zustand stores can be tested by calling getState()/setState() directly
const store = () => useGameStore.getState();
const reset = () => useGameStore.setState(useGameStore.getInitialState());

beforeEach(() => reset());

describe('gameStore initial state', () => {
  it('starts with menu status', () => {
    expect(store().gameStatus).toBe('menu');
  });

  it('starts at challenge 0', () => {
    expect(store().currentChallenge).toBe(0);
  });

  it('starts with 0 strikes', () => {
    expect(store().strikes).toBe(0);
  });

  it('starts with 3 hints', () => {
    expect(store().hintsRemaining).toBe(3);
  });

  it('starts with empty challenge scores', () => {
    expect(store().challengeScores).toEqual([]);
  });
});

describe('startNewGame', () => {
  it('sets status to playing', () => {
    store().startNewGame();
    expect(store().gameStatus).toBe('playing');
  });

  it('resets challenge to 0', () => {
    useGameStore.setState({ currentChallenge: 3 });
    store().startNewGame();
    expect(store().currentChallenge).toBe(0);
  });

  it('resets strikes and scores', () => {
    useGameStore.setState({ strikes: 2, challengeScores: [80, 90] });
    store().startNewGame();
    expect(store().strikes).toBe(0);
    expect(store().challengeScores).toEqual([]);
  });

  it('resets hints to 3', () => {
    useGameStore.setState({ hintsRemaining: 0 });
    store().startNewGame();
    expect(store().hintsRemaining).toBe(3);
  });

  it('increments totalGamesPlayed', () => {
    expect(store().totalGamesPlayed).toBe(0);
    store().startNewGame();
    expect(store().totalGamesPlayed).toBe(1);
    store().startNewGame();
    expect(store().totalGamesPlayed).toBe(2);
  });
});

describe('continueGame', () => {
  it('sets status to playing without resetting challenge', () => {
    useGameStore.setState({ currentChallenge: 3, challengeScores: [80, 90, 70] });
    store().continueGame();
    expect(store().gameStatus).toBe('playing');
    expect(store().currentChallenge).toBe(3);
  });

  it('resets strikes but keeps scores', () => {
    useGameStore.setState({ strikes: 2, challengeScores: [80] });
    store().continueGame();
    expect(store().strikes).toBe(0);
    expect(store().challengeScores).toEqual([80]);
  });
});

describe('completeChallenge', () => {
  it('appends score and advances challenge index', () => {
    store().startNewGame();
    store().completeChallenge(85);
    expect(store().challengeScores).toEqual([85]);
    expect(store().currentChallenge).toBe(1);
  });

  it('sets victory when completing challenge 4 (the last)', () => {
    useGameStore.setState({ gameStatus: 'playing', currentChallenge: 4, challengeScores: [80, 90, 70, 85] });
    store().completeChallenge(95);
    expect(store().gameStatus).toBe('victory');
    expect(store().challengeScores).toEqual([80, 90, 70, 85, 95]);
  });

  it('resets strikes on challenge completion', () => {
    useGameStore.setState({ gameStatus: 'playing', currentChallenge: 0, strikes: 2 });
    store().completeChallenge(75);
    expect(store().strikes).toBe(0);
  });
});

describe('addStrike', () => {
  it('increments strike count', () => {
    store().startNewGame();
    store().addStrike();
    expect(store().strikes).toBe(1);
  });

  it('sets defeat at 3 strikes', () => {
    store().startNewGame();
    store().addStrike();
    store().addStrike();
    store().addStrike();
    expect(store().strikes).toBe(3);
    expect(store().gameStatus).toBe('defeat');
  });
});

describe('useHint', () => {
  it('decrements hints', () => {
    store().startNewGame();
    store().useHint();
    expect(store().hintsRemaining).toBe(2);
  });

  it('does not go below 0', () => {
    useGameStore.setState({ hintsRemaining: 0 });
    store().useHint();
    expect(store().hintsRemaining).toBe(0);
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
pnpm test -- __tests__/gameStore.test.ts --no-cache
```

Expected: FAIL — `Cannot find module '../src/store/gameStore'`

**Step 4: Implement the game store**

Create `src/store/gameStore.ts`:

```typescript
import { create } from 'zustand';

export interface GameState {
  // Progression
  currentChallenge: number;
  challengeScores: number[];
  gameStatus: 'menu' | 'playing' | 'victory' | 'defeat';

  // Current challenge
  strikes: number;
  challengeProgress: number;

  // Meta
  hintsRemaining: number;
  totalGamesPlayed: number;

  // Variant seed — used to pick randomized challenge parameters
  variantSeed: number;

  // Actions
  startNewGame: () => void;
  continueGame: () => void;
  completeChallenge: (score: number) => void;
  addStrike: () => void;
  useHint: () => void;
  setChallengeProgress: (progress: number) => void;
  returnToMenu: () => void;
}

const TOTAL_CHALLENGES = 5;
const INITIAL_HINTS = 3;
const MAX_STRIKES = 3;

const initialState = {
  currentChallenge: 0,
  challengeScores: [] as number[],
  gameStatus: 'menu' as const,
  strikes: 0,
  challengeProgress: 0,
  hintsRemaining: INITIAL_HINTS,
  totalGamesPlayed: 0,
  variantSeed: 0,
};

export const useGameStore = create<GameState>()((set, get) => ({
  ...initialState,

  startNewGame: () =>
    set((state) => ({
      currentChallenge: 0,
      challengeScores: [],
      gameStatus: 'playing',
      strikes: 0,
      challengeProgress: 0,
      hintsRemaining: INITIAL_HINTS,
      totalGamesPlayed: state.totalGamesPlayed + 1,
      variantSeed: Date.now(),
    })),

  continueGame: () =>
    set({
      gameStatus: 'playing',
      strikes: 0,
      challengeProgress: 0,
    }),

  completeChallenge: (score: number) =>
    set((state) => {
      const nextChallenge = state.currentChallenge + 1;
      const scores = [...state.challengeScores, score];
      const isLastChallenge = nextChallenge >= TOTAL_CHALLENGES;

      return {
        challengeScores: scores,
        currentChallenge: nextChallenge,
        strikes: 0,
        challengeProgress: 0,
        gameStatus: isLastChallenge ? 'victory' : state.gameStatus,
      };
    }),

  addStrike: () =>
    set((state) => {
      const newStrikes = state.strikes + 1;
      return {
        strikes: newStrikes,
        gameStatus: newStrikes >= MAX_STRIKES ? 'defeat' : state.gameStatus,
      };
    }),

  useHint: () =>
    set((state) => ({
      hintsRemaining: Math.max(0, state.hintsRemaining - 1),
    })),

  setChallengeProgress: (progress: number) =>
    set({ challengeProgress: progress }),

  returnToMenu: () =>
    set({ gameStatus: 'menu', strikes: 0, challengeProgress: 0 }),
}));

// For test resets
useGameStore.getInitialState = () => ({ ...initialState, startNewGame: get, continueGame: get, completeChallenge: get, addStrike: get, useHint: get, setChallengeProgress: get, returnToMenu: get } as any);
```

**NOTE:** The `getInitialState` hack above is fragile. Zustand v5 supports `getInitialState()` natively. For now, the simpler approach is to just let the test do `useGameStore.setState(initialState)` directly in `beforeEach`. Update the store to export the initial state:

Replace the `getInitialState` hack with:

```typescript
export const INITIAL_GAME_STATE = {
  currentChallenge: 0,
  challengeScores: [] as number[],
  gameStatus: 'menu' as const,
  strikes: 0,
  challengeProgress: 0,
  hintsRemaining: INITIAL_HINTS,
  totalGamesPlayed: 0,
  variantSeed: 0,
};
```

And in the test, use:

```typescript
import { useGameStore, INITIAL_GAME_STATE } from '../src/store/gameStore';

const store = () => useGameStore.getState();
const reset = () => useGameStore.setState({ ...INITIAL_GAME_STATE });

beforeEach(() => reset());
```

**Step 5: Run tests to verify they pass**

```bash
pnpm test -- __tests__/gameStore.test.ts --no-cache
```

Expected: All 14 tests PASS.

**Step 6: Commit**

```bash
git add src/store/gameStore.ts __tests__/gameStore.test.ts package.json package-lock.json
git commit -m "feat: add Zustand game store with progression, strikes, hints"
```

---

## Task 2: Waypoint Graph — Pure Data + Navigation Logic

**Files:**
- Create: `src/engine/WaypointGraph.ts`
- Create: `__tests__/WaypointGraph.test.ts`

**Step 1: Write failing tests**

Create `__tests__/WaypointGraph.test.ts`:

```typescript
import {
  WAYPOINTS,
  WaypointId,
  getWaypoint,
  getConnections,
  canNavigate,
  getNavigationPath,
} from '../src/engine/WaypointGraph';

describe('WAYPOINTS data', () => {
  it('has 5 waypoints', () => {
    expect(Object.keys(WAYPOINTS).length).toBe(5);
  });

  it('every waypoint has position, lookAt, and connections', () => {
    for (const wp of Object.values(WAYPOINTS)) {
      expect(wp.position).toHaveLength(3);
      expect(wp.lookAt).toHaveLength(3);
      expect(Array.isArray(wp.connections)).toBe(true);
      expect(wp.connections.length).toBeGreaterThan(0);
    }
  });

  it('connections are bidirectional', () => {
    for (const [id, wp] of Object.entries(WAYPOINTS)) {
      for (const conn of wp.connections) {
        const other = WAYPOINTS[conn];
        expect(other.connections).toContain(id as WaypointId);
      }
    }
  });
});

describe('getWaypoint', () => {
  it('returns waypoint data for valid id', () => {
    const wp = getWaypoint('center');
    expect(wp).toBeDefined();
    expect(wp.label).toBe('Center');
  });

  it('throws for invalid id', () => {
    expect(() => getWaypoint('nonexistent' as WaypointId)).toThrow();
  });
});

describe('getConnections', () => {
  it('center connects to fridge, grinder, stuffer', () => {
    const conns = getConnections('center');
    expect(conns).toContain('fridge');
    expect(conns).toContain('grinder');
    expect(conns).toContain('stuffer');
  });

  it('stove connects to fridge, grinder, stuffer', () => {
    const conns = getConnections('stove');
    expect(conns).toContain('fridge');
    expect(conns).toContain('grinder');
    expect(conns).toContain('stuffer');
  });
});

describe('canNavigate', () => {
  it('can navigate between connected waypoints', () => {
    expect(canNavigate('center', 'fridge')).toBe(true);
    expect(canNavigate('fridge', 'center')).toBe(true);
  });

  it('cannot navigate between unconnected waypoints', () => {
    expect(canNavigate('center', 'stove')).toBe(false);
  });
});

describe('getNavigationPath', () => {
  it('returns direct path for connected nodes', () => {
    const path = getNavigationPath('center', 'fridge');
    expect(path).toEqual(['center', 'fridge']);
  });

  it('returns shortest path for non-adjacent nodes', () => {
    const path = getNavigationPath('center', 'stove');
    // center -> fridge|grinder|stuffer -> stove (2 hops)
    expect(path).toHaveLength(3);
    expect(path[0]).toBe('center');
    expect(path[path.length - 1]).toBe('stove');
  });

  it('returns single element for same start and end', () => {
    const path = getNavigationPath('center', 'center');
    expect(path).toEqual(['center']);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test -- __tests__/WaypointGraph.test.ts --no-cache
```

Expected: FAIL — module not found.

**Step 3: Implement WaypointGraph**

Create `src/engine/WaypointGraph.ts`:

```typescript
export type WaypointId = 'center' | 'fridge' | 'grinder' | 'stuffer' | 'stove';

export interface Waypoint {
  id: WaypointId;
  label: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  connections: WaypointId[];
  /** Y-axis rotation range in radians player can look around from this spot */
  rotationRange: number;
}

/**
 * Kitchen waypoint graph.
 *
 *       [CRT TV on wall]
 *            |
 *       [1] CENTER
 *       / |  \
 *     /   |    \
 *   [2]  [3]  [4]
 *  Fridge Grinder Stuffer
 *     \   |    /
 *      \  |  /
 *       [5]
 *      Stove
 */
export const WAYPOINTS: Record<WaypointId, Waypoint> = {
  center: {
    id: 'center',
    label: 'Center',
    position: [0, 1.6, 0],
    lookAt: [0, 1.8, -5],       // Facing CRT TV on far wall
    connections: ['fridge', 'grinder', 'stuffer'],
    rotationRange: Math.PI * 2,  // Full 360° rotation
  },
  fridge: {
    id: 'fridge',
    label: 'Fridge',
    position: [-4, 1.6, -2],
    lookAt: [-5, 1.2, -4],      // Facing the fridge
    connections: ['center', 'stove'],
    rotationRange: Math.PI * 1.5,
  },
  grinder: {
    id: 'grinder',
    label: 'Grinder',
    position: [0, 1.6, -3],
    lookAt: [0, 1.0, -5],       // Facing the grinder on the counter
    connections: ['center', 'stove'],
    rotationRange: Math.PI * 1.5,
  },
  stuffer: {
    id: 'stuffer',
    label: 'Stuffer',
    position: [4, 1.6, -2],
    lookAt: [5, 1.0, -4],       // Facing the stuffer station
    connections: ['center', 'stove'],
    rotationRange: Math.PI * 1.5,
  },
  stove: {
    id: 'stove',
    label: 'Stove',
    position: [0, 1.6, -5],
    lookAt: [0, 0.8, -7],       // Facing the stove
    connections: ['fridge', 'grinder', 'stuffer'],
    rotationRange: Math.PI * 1.5,
  },
};

export function getWaypoint(id: WaypointId): Waypoint {
  const wp = WAYPOINTS[id];
  if (!wp) throw new Error(`Unknown waypoint: ${id}`);
  return wp;
}

export function getConnections(id: WaypointId): WaypointId[] {
  return getWaypoint(id).connections;
}

export function canNavigate(from: WaypointId, to: WaypointId): boolean {
  return getWaypoint(from).connections.includes(to);
}

/** BFS shortest path between two waypoints. Returns array of waypoint IDs. */
export function getNavigationPath(from: WaypointId, to: WaypointId): WaypointId[] {
  if (from === to) return [from];

  const visited = new Set<WaypointId>([from]);
  const queue: { id: WaypointId; path: WaypointId[] }[] = [
    { id: from, path: [from] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of getConnections(current.id)) {
      if (neighbor === to) {
        return [...current.path, to];
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, path: [...current.path, neighbor] });
      }
    }
  }

  return []; // Unreachable in a connected graph
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- __tests__/WaypointGraph.test.ts --no-cache
```

Expected: All 10 tests PASS.

**Step 5: Commit**

```bash
git add src/engine/WaypointGraph.ts __tests__/WaypointGraph.test.ts
git commit -m "feat: add waypoint graph for kitchen navigation"
```

---

## Task 3: Dialogue Engine — Tree Traversal + Effects

**Files:**
- Create: `src/engine/DialogueEngine.ts`
- Create: `__tests__/DialogueEngine.test.ts`

**Step 1: Write failing tests**

Create `__tests__/DialogueEngine.test.ts`:

```typescript
import {
  DialogueLine,
  DialogueChoice,
  DialogueEngine,
} from '../src/engine/DialogueEngine';

const sampleDialogue: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Welcome to my kitchen.",
    reaction: 'talk',
    choices: [
      {
        text: "Where am I?",
        effect: 'stall',
        response: {
          speaker: 'sausage',
          text: "You're exactly where you need to be.",
          reaction: 'laugh',
        },
      },
      {
        text: "Let's get this over with.",
        effect: 'anger',
        response: {
          speaker: 'sausage',
          text: "Impatient? That's a mistake.",
          reaction: 'disgust',
        },
      },
    ],
  },
  {
    speaker: 'sausage',
    text: "Now, open that fridge.",
    reaction: 'nod',
  },
];

describe('DialogueEngine', () => {
  let engine: DialogueEngine;

  beforeEach(() => {
    engine = new DialogueEngine(sampleDialogue);
  });

  it('starts at the first line', () => {
    const line = engine.getCurrentLine();
    expect(line.text).toBe("Welcome to my kitchen.");
    expect(line.speaker).toBe('sausage');
  });

  it('reports available choices', () => {
    const choices = engine.getChoices();
    expect(choices).toHaveLength(2);
    expect(choices[0].text).toBe("Where am I?");
  });

  it('returns empty choices when line has none', () => {
    engine.advance(); // skip first line (no choice selected, auto-advance)
    const choices = engine.getChoices();
    expect(choices).toHaveLength(0);
  });

  it('selectChoice returns the response line', () => {
    const response = engine.selectChoice(0);
    expect(response.text).toBe("You're exactly where you need to be.");
    expect(response.reaction).toBe('laugh');
  });

  it('selectChoice records the effect', () => {
    engine.selectChoice(0);
    expect(engine.getEffects()).toContain('stall');
  });

  it('advance moves to next line', () => {
    engine.advance();
    const line = engine.getCurrentLine();
    expect(line.text).toBe("Now, open that fridge.");
  });

  it('isComplete returns true when past last line', () => {
    expect(engine.isComplete()).toBe(false);
    engine.advance();
    expect(engine.isComplete()).toBe(false);
    engine.advance();
    expect(engine.isComplete()).toBe(true);
  });

  it('tracks multiple effects', () => {
    engine.selectChoice(1); // anger
    engine.advance();
    expect(engine.getEffects()).toContain('anger');
  });

  it('hasEffect checks for specific effect', () => {
    engine.selectChoice(0); // stall
    expect(engine.hasEffect('stall')).toBe(true);
    expect(engine.hasEffect('anger')).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test -- __tests__/DialogueEngine.test.ts --no-cache
```

Expected: FAIL — module not found.

**Step 3: Implement DialogueEngine**

Create `src/engine/DialogueEngine.ts`:

```typescript
export type MrSausageReaction =
  | 'idle'
  | 'flinch'
  | 'laugh'
  | 'disgust'
  | 'excitement'
  | 'nervous'
  | 'nod'
  | 'talk'
  | 'eating'
  | 'judging';

export type DialogueEffect = 'hint' | 'taunt' | 'stall' | 'anger';

export interface DialogueChoice {
  text: string;
  response: DialogueLine;
  effect?: DialogueEffect;
}

export interface DialogueLine {
  speaker: 'sausage' | 'player';
  text: string;
  reaction?: MrSausageReaction;
  choices?: DialogueChoice[];
  effect?: DialogueEffect;
}

export class DialogueEngine {
  private lines: DialogueLine[];
  private currentIndex: number = 0;
  private effects: DialogueEffect[] = [];

  constructor(lines: DialogueLine[]) {
    this.lines = [...lines];
  }

  getCurrentLine(): DialogueLine {
    return this.lines[this.currentIndex];
  }

  getChoices(): DialogueChoice[] {
    const line = this.lines[this.currentIndex];
    return line?.choices ?? [];
  }

  selectChoice(choiceIndex: number): DialogueLine {
    const choices = this.getChoices();
    const choice = choices[choiceIndex];
    if (!choice) throw new Error(`Invalid choice index: ${choiceIndex}`);

    if (choice.effect) {
      this.effects.push(choice.effect);
    }

    return choice.response;
  }

  advance(): void {
    this.currentIndex++;
  }

  isComplete(): boolean {
    return this.currentIndex >= this.lines.length;
  }

  getEffects(): DialogueEffect[] {
    return [...this.effects];
  }

  hasEffect(effect: DialogueEffect): boolean {
    return this.effects.includes(effect);
  }

  reset(): void {
    this.currentIndex = 0;
    this.effects = [];
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- __tests__/DialogueEngine.test.ts --no-cache
```

Expected: All 9 tests PASS.

**Step 5: Commit**

```bash
git add src/engine/DialogueEngine.ts __tests__/DialogueEngine.test.ts
git commit -m "feat: add dialogue engine with choice selection and effect tracking"
```

---

## Task 4: Challenge Registry + Variant System

**Files:**
- Create: `src/engine/ChallengeRegistry.ts`
- Create: `src/data/challenges/variants.ts`
- Create: `__tests__/ChallengeRegistry.test.ts`

**Step 1: Write failing tests**

Create `__tests__/ChallengeRegistry.test.ts`:

```typescript
import {
  CHALLENGE_ORDER,
  getChallengeConfig,
  pickVariant,
  calculateFinalVerdict,
  ChallengeId,
} from '../src/engine/ChallengeRegistry';

describe('CHALLENGE_ORDER', () => {
  it('has 5 challenges in correct sequence', () => {
    expect(CHALLENGE_ORDER).toEqual([
      'ingredients',
      'grinding',
      'stuffing',
      'cooking',
      'tasting',
    ]);
  });
});

describe('getChallengeConfig', () => {
  it('returns config for each valid challenge', () => {
    for (const id of CHALLENGE_ORDER) {
      const config = getChallengeConfig(id);
      expect(config.id).toBe(id);
      expect(config.name).toBeTruthy();
      expect(config.station).toBeTruthy();
      expect(config.cameraOffset).toBeDefined();
    }
  });

  it('throws for invalid challenge id', () => {
    expect(() => getChallengeConfig('fake' as ChallengeId)).toThrow();
  });
});

describe('pickVariant', () => {
  it('returns a variant for ingredients challenge', () => {
    const variant = pickVariant('ingredients', 12345);
    expect(variant).toBeDefined();
    expect(variant.criteria).toBeDefined();
    expect(variant.requiredCount).toBeGreaterThanOrEqual(3);
    expect(variant.requiredCount).toBeLessThanOrEqual(4);
  });

  it('returns deterministic variant for same seed', () => {
    const v1 = pickVariant('ingredients', 42);
    const v2 = pickVariant('ingredients', 42);
    expect(v1).toEqual(v2);
  });

  it('returns different variants for different seeds', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const variants = seeds.map((s) => pickVariant('ingredients', s));
    const unique = new Set(variants.map((v) => JSON.stringify(v.criteria)));
    // With 6+ variant types, at least 2 should differ across 10 seeds
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe('calculateFinalVerdict', () => {
  it('returns S rank for 90+', () => {
    const verdict = calculateFinalVerdict([95, 90, 85, 92]);
    expect(verdict.rank).toBe('S');
    expect(verdict.title).toBe('THE SAUSAGE KING');
  });

  it('returns A rank for 70-89', () => {
    const verdict = calculateFinalVerdict([80, 75, 70, 80]);
    expect(verdict.rank).toBe('A');
  });

  it('returns B rank for 50-69', () => {
    const verdict = calculateFinalVerdict([60, 55, 50, 65]);
    expect(verdict.rank).toBe('B');
  });

  it('returns F rank for below 50', () => {
    const verdict = calculateFinalVerdict([30, 20, 40, 35]);
    expect(verdict.rank).toBe('F');
  });

  it('averages all challenge scores', () => {
    // [100, 0, 100, 0] average = 50 → B rank
    const verdict = calculateFinalVerdict([100, 0, 100, 0]);
    expect(verdict.rank).toBe('B');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test -- __tests__/ChallengeRegistry.test.ts --no-cache
```

**Step 3: Implement ChallengeRegistry**

Create `src/data/challenges/variants.ts`:

```typescript
export type IngredientCriteria = {
  tags: string[];
  description: string;
};

export interface IngredientVariant {
  criteria: IngredientCriteria;
  requiredCount: number;
  mrSausageDemand: string;
}

export interface GrindingVariant {
  targetSpeed: number;       // Ideal angular velocity (rad/s)
  tolerance: number;         // Acceptable deviation
  targetProgress: number;    // How much grinding to complete (100)
  timerSeconds: number;
}

export interface StuffingVariant {
  fillRate: number;          // Fill % per second while pressing
  pressureRate: number;      // Pressure % per second while pressing
  pressureDecay: number;     // Pressure % per second while releasing
  burstThreshold: number;    // Pressure % that causes casing tear
  timerSeconds: number;
}

export interface CookingVariant {
  targetTemp: number;        // Target internal temperature (°F)
  tempTolerance: number;     // Acceptable deviation from target
  holdSeconds: number;       // How long to hold at target
  heatRate: number;          // Degrees per second of heat change
  timerSeconds: number;
}

export const INGREDIENT_VARIANTS: IngredientVariant[] = [
  {
    criteria: { tags: ['sweet', 'savory'], description: 'sweet AND savory' },
    requiredCount: 3,
    mrSausageDemand: "I want something SWEET and SAVORY. Don't disappoint me.",
  },
  {
    criteria: { tags: ['spicy'], description: 'spicy' },
    requiredCount: 3,
    mrSausageDemand: "Bring me heat. SPICY. Make my tongue sing.",
  },
  {
    criteria: { tags: ['fancy'], description: 'fancy' },
    requiredCount: 3,
    mrSausageDemand: "Only the finest ingredients. I have... refined tastes.",
  },
  {
    criteria: { tags: ['comfort'], description: 'comfort food' },
    requiredCount: 4,
    mrSausageDemand: "Comfort food. Remind me of better days.",
  },
  {
    criteria: { tags: ['meat'], description: 'meaty' },
    requiredCount: 3,
    mrSausageDemand: "MEAT. Nothing but MEAT. Is that so hard?",
  },
  {
    criteria: { tags: ['sweet'], description: 'sweet' },
    requiredCount: 4,
    mrSausageDemand: "Something sweet. Sweeten my disposition.",
  },
];

export const GRINDING_VARIANTS: GrindingVariant[] = [
  { targetSpeed: 3.0, tolerance: 1.5, targetProgress: 100, timerSeconds: 30 },
  { targetSpeed: 4.0, tolerance: 1.0, targetProgress: 100, timerSeconds: 25 },
  { targetSpeed: 2.5, tolerance: 2.0, targetProgress: 100, timerSeconds: 35 },
];

export const STUFFING_VARIANTS: StuffingVariant[] = [
  { fillRate: 8, pressureRate: 12, pressureDecay: 6, burstThreshold: 90, timerSeconds: 30 },
  { fillRate: 10, pressureRate: 15, pressureDecay: 5, burstThreshold: 85, timerSeconds: 25 },
  { fillRate: 6, pressureRate: 10, pressureDecay: 8, burstThreshold: 90, timerSeconds: 35 },
];

export const COOKING_VARIANTS: CookingVariant[] = [
  { targetTemp: 160, tempTolerance: 10, holdSeconds: 5, heatRate: 15, timerSeconds: 30 },
  { targetTemp: 170, tempTolerance: 8, holdSeconds: 4, heatRate: 20, timerSeconds: 25 },
  { targetTemp: 155, tempTolerance: 12, holdSeconds: 6, heatRate: 12, timerSeconds: 35 },
];
```

Create `src/engine/ChallengeRegistry.ts`:

```typescript
import type { WaypointId } from './WaypointGraph';
import {
  INGREDIENT_VARIANTS,
  GRINDING_VARIANTS,
  STUFFING_VARIANTS,
  COOKING_VARIANTS,
  type IngredientVariant,
  type GrindingVariant,
  type StuffingVariant,
  type CookingVariant,
} from '../data/challenges/variants';

export type ChallengeId = 'ingredients' | 'grinding' | 'stuffing' | 'cooking' | 'tasting';

export const CHALLENGE_ORDER: ChallengeId[] = [
  'ingredients',
  'grinding',
  'stuffing',
  'cooking',
  'tasting',
];

export interface ChallengeConfig {
  id: ChallengeId;
  name: string;
  station: WaypointId;
  cameraOffset: [number, number, number];
  description: string;
}

const CONFIGS: Record<ChallengeId, ChallengeConfig> = {
  ingredients: {
    id: 'ingredients',
    name: 'Ingredient Selection',
    station: 'fridge',
    cameraOffset: [0, 0, 1],
    description: 'Choose the right ingredients to satisfy Mr. Sausage.',
  },
  grinding: {
    id: 'grinding',
    name: 'Grinding',
    station: 'grinder',
    cameraOffset: [0, 0.3, 0.5],
    description: 'Crank the grinder at the perfect speed.',
  },
  stuffing: {
    id: 'stuffing',
    name: 'Stuffing',
    station: 'stuffer',
    cameraOffset: [0, 0.2, 0.8],
    description: 'Fill the casing without tearing it.',
  },
  cooking: {
    id: 'cooking',
    name: 'Cooking',
    station: 'stove',
    cameraOffset: [0, 0.5, 0.5],
    description: 'Cook the sausage to the perfect temperature.',
  },
  tasting: {
    id: 'tasting',
    name: 'The Tasting',
    station: 'center',
    cameraOffset: [0, 0, 0],
    description: 'Mr. Sausage delivers his verdict.',
  },
};

export function getChallengeConfig(id: ChallengeId): ChallengeConfig {
  const config = CONFIGS[id];
  if (!config) throw new Error(`Unknown challenge: ${id}`);
  return config;
}

/** Simple seeded pseudo-random: picks a consistent index from an array */
function seededIndex(seed: number, arrayLength: number): number {
  // Simple hash — multiply by prime, take modulo
  const hash = Math.abs(((seed * 2654435761) >>> 0) % arrayLength);
  return hash;
}

export function pickVariant(
  challengeId: ChallengeId,
  seed: number,
): IngredientVariant | GrindingVariant | StuffingVariant | CookingVariant {
  switch (challengeId) {
    case 'ingredients':
      return INGREDIENT_VARIANTS[seededIndex(seed, INGREDIENT_VARIANTS.length)];
    case 'grinding':
      return GRINDING_VARIANTS[seededIndex(seed + 1, GRINDING_VARIANTS.length)];
    case 'stuffing':
      return STUFFING_VARIANTS[seededIndex(seed + 2, STUFFING_VARIANTS.length)];
    case 'cooking':
      return COOKING_VARIANTS[seededIndex(seed + 3, COOKING_VARIANTS.length)];
    case 'tasting':
      // Tasting has no variant — it's purely based on accumulated scores
      return COOKING_VARIANTS[0]; // Unused, but type-safe
    default:
      throw new Error(`No variants for challenge: ${challengeId}`);
  }
}

export interface Verdict {
  rank: 'S' | 'A' | 'B' | 'F';
  title: string;
  averageScore: number;
  message: string;
}

export function calculateFinalVerdict(challengeScores: number[]): Verdict {
  const avg = challengeScores.reduce((a, b) => a + b, 0) / challengeScores.length;

  if (avg >= 90) {
    return { rank: 'S', title: 'THE SAUSAGE KING', averageScore: avg, message: 'The door unlocks. You escape.' };
  }
  if (avg >= 70) {
    return { rank: 'A', title: 'Acceptable', averageScore: avg, message: '"Again." The screen goes black.' };
  }
  if (avg >= 50) {
    return { rank: 'B', title: 'Mediocre', averageScore: avg, message: '"Disappointing." Lights flicker.' };
  }
  return { rank: 'F', title: 'Unacceptable', averageScore: avg, message: '"You are the sausage now."' };
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- __tests__/ChallengeRegistry.test.ts --no-cache
```

Expected: All 10 tests PASS.

**Step 5: Commit**

```bash
git add src/engine/ChallengeRegistry.ts src/data/challenges/variants.ts __tests__/ChallengeRegistry.test.ts
git commit -m "feat: add challenge registry with variants and verdict scoring"
```

---

## Task 5: Extend Ingredients with Category Tags

**Files:**
- Modify: `src/engine/Ingredients.ts`
- Modify: `__tests__/Ingredients.test.ts`
- Create: `src/engine/IngredientMatcher.ts`
- Create: `__tests__/IngredientMatcher.test.ts`

**Step 1: Write failing tests for ingredient matching**

Create `__tests__/IngredientMatcher.test.ts`:

```typescript
import { INGREDIENTS } from '../src/engine/Ingredients';
import {
  getIngredientTags,
  matchesCriteria,
  filterMatchingIngredients,
} from '../src/engine/IngredientMatcher';

describe('getIngredientTags', () => {
  it('returns tags array for any ingredient', () => {
    const tags = getIngredientTags(INGREDIENTS[0]);
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
  });

  it('Lobster has fancy and meat tags', () => {
    const lobster = INGREDIENTS.find((i) => i.name === 'Lobster')!;
    const tags = getIngredientTags(lobster);
    expect(tags).toContain('fancy');
    expect(tags).toContain('meat');
  });

  it('Candy Cane has sweet tag', () => {
    const candy = INGREDIENTS.find((i) => i.name === 'Candy Cane')!;
    const tags = getIngredientTags(candy);
    expect(tags).toContain('sweet');
  });

  it('Big Mac has savory and fast-food tags', () => {
    const bigMac = INGREDIENTS.find((i) => i.name === 'Big Mac')!;
    const tags = getIngredientTags(bigMac);
    expect(tags).toContain('savory');
    expect(tags).toContain('fast-food');
  });
});

describe('matchesCriteria', () => {
  it('matches when ingredient has all required tags', () => {
    const lobster = INGREDIENTS.find((i) => i.name === 'Lobster')!;
    expect(matchesCriteria(lobster, { tags: ['fancy'] })).toBe(true);
  });

  it('does not match when ingredient is missing a required tag', () => {
    const lobster = INGREDIENTS.find((i) => i.name === 'Lobster')!;
    expect(matchesCriteria(lobster, { tags: ['sweet'] })).toBe(false);
  });

  it('matches multi-tag criteria when all present', () => {
    const bigMac = INGREDIENTS.find((i) => i.name === 'Big Mac')!;
    // Big Mac should be savory (tasteMod 3) + fast-food
    expect(matchesCriteria(bigMac, { tags: ['savory'] })).toBe(true);
  });
});

describe('filterMatchingIngredients', () => {
  it('returns only matching ingredients', () => {
    const matches = filterMatchingIngredients(INGREDIENTS, { tags: ['sweet'] });
    expect(matches.length).toBeGreaterThan(0);
    for (const ing of matches) {
      expect(getIngredientTags(ing)).toContain('sweet');
    }
  });

  it('returns fewer than total ingredients for any criteria', () => {
    const matches = filterMatchingIngredients(INGREDIENTS, { tags: ['fancy'] });
    expect(matches.length).toBeLessThan(INGREDIENTS.length);
    expect(matches.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test -- __tests__/IngredientMatcher.test.ts --no-cache
```

**Step 3: Implement IngredientMatcher**

Create `src/engine/IngredientMatcher.ts`:

```typescript
import type { Ingredient } from './Ingredients';

export type IngredientTag =
  | 'sweet'
  | 'savory'
  | 'spicy'
  | 'meat'
  | 'fancy'
  | 'comfort'
  | 'absurd'
  | 'fast-food'
  | 'international'
  | 'smooth'
  | 'chunky';

/**
 * Derive tags from ingredient's existing properties.
 * This avoids modifying the Ingredient interface — tags are computed from
 * the category + stat values that already exist.
 */
export function getIngredientTags(ingredient: Ingredient): IngredientTag[] {
  const tags: IngredientTag[] = [];

  // Category-based tags
  const categoryMap: Record<string, IngredientTag[]> = {
    'fast food': ['fast-food', 'savory'],
    canned: ['savory'],
    fancy: ['fancy'],
    absurd: ['absurd'],
    sweet: ['sweet'],
    spicy: ['spicy'],
    comfort: ['comfort', 'savory'],
    international: ['international', 'savory'],
  };

  const catTags = categoryMap[ingredient.category] ?? [];
  tags.push(...catTags);

  // Stat-based tags
  if (ingredient.tasteMod >= 4) tags.push('fancy');
  if (ingredient.textureMod >= 3 && !tags.includes('chunky')) tags.push('chunky');
  if (ingredient.textureMod <= 1 && !tags.includes('smooth')) tags.push('smooth');

  // Meat detection — lobster, beef, corn dog, hot pocket have meat-like names
  // Use category + taste heuristic: fancy high-taste items with non-sweet category
  const meatNames = ['lobster', 'beef', 'chicken', 'mac', 'corn dog', 'hot pocket', 'taco'];
  if (meatNames.some((m) => ingredient.name.toLowerCase().includes(m))) {
    tags.push('meat');
  }

  // Deduplicate
  return [...new Set(tags)];
}

export interface IngredientCriteria {
  tags: string[];
  description?: string;
}

export function matchesCriteria(ingredient: Ingredient, criteria: IngredientCriteria): boolean {
  const tags = getIngredientTags(ingredient);
  return criteria.tags.every((t) => tags.includes(t as IngredientTag));
}

export function filterMatchingIngredients(
  ingredients: Ingredient[],
  criteria: IngredientCriteria,
): Ingredient[] {
  return ingredients.filter((ing) => matchesCriteria(ing, criteria));
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- __tests__/IngredientMatcher.test.ts --no-cache
```

Expected: All 8 tests PASS.

**Step 5: Also update existing Ingredients test to ensure backward compatibility**

Add to `__tests__/Ingredients.test.ts`:

```typescript
import { getIngredientTags } from '../src/engine/IngredientMatcher';

describe('ingredient tag coverage', () => {
  it('every ingredient has at least one tag', () => {
    for (const ing of INGREDIENTS) {
      const tags = getIngredientTags(ing);
      expect(tags.length).toBeGreaterThan(0);
    }
  });
});
```

**Step 6: Run all tests**

```bash
pnpm test --no-cache
```

Expected: All existing + new tests PASS.

**Step 7: Commit**

```bash
git add src/engine/IngredientMatcher.ts __tests__/IngredientMatcher.test.ts __tests__/Ingredients.test.ts
git commit -m "feat: add ingredient tag system and criteria matching for challenges"
```

---

## Task 6: Dialogue Data — Intro + All Challenge Dialogues

**Files:**
- Create: `src/data/dialogue/intro.ts`
- Create: `src/data/dialogue/ingredients.ts`
- Create: `src/data/dialogue/grinding.ts`
- Create: `src/data/dialogue/stuffing.ts`
- Create: `src/data/dialogue/cooking.ts`
- Create: `src/data/dialogue/verdict.ts`

This task creates the dialogue content. No tests needed — dialogue is static data validated by the DialogueEngine's type system.

**Step 1: Create intro dialogue**

Create `src/data/dialogue/intro.ts`:

```typescript
import type { DialogueLine } from '../../engine/DialogueEngine';

export const INTRO_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Well, well, well...",
    reaction: 'idle',
  },
  {
    speaker: 'sausage',
    text: "Welcome to my kitchen. I hope you're comfortable.",
    reaction: 'talk',
    choices: [
      {
        text: "Where am I?",
        effect: 'stall',
        response: {
          speaker: 'sausage',
          text: "You're exactly where you need to be. Let's leave it at that.",
          reaction: 'laugh',
        },
      },
      {
        text: "What do you want from me?",
        response: {
          speaker: 'sausage',
          text: "What I've always wanted. The perfect sausage.",
          reaction: 'nod',
        },
      },
      {
        text: "Let me out of here!",
        effect: 'anger',
        response: {
          speaker: 'sausage',
          text: "The door opens when I say it opens. Now... let's cook.",
          reaction: 'disgust',
        },
      },
    ],
  },
  {
    speaker: 'sausage',
    text: "Here's how this works. You make my sausage. You make it RIGHT. And maybe — just maybe — you walk out of here.",
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: "Fail me... and, well... everything in this room is meat. Or will be.",
    reaction: 'nervous',
  },
];
```

**Step 2: Create challenge-specific dialogues**

Create `src/data/dialogue/ingredients.ts`:

```typescript
import type { DialogueLine } from '../../engine/DialogueEngine';

export const INGREDIENTS_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "First things first. Open that fridge.",
    reaction: 'nod',
  },
  {
    speaker: 'sausage',
    text: "I have... specific tastes. Choose wisely.",
    reaction: 'talk',
    choices: [
      {
        text: "What if I choose wrong?",
        response: {
          speaker: 'sausage',
          text: "Three strikes. You know what happens at three.",
          reaction: 'laugh',
        },
      },
      {
        text: "Give me a hint.",
        effect: 'hint',
        response: {
          speaker: 'sausage',
          text: "...Fine. But you owe me. Look for the glow.",
          reaction: 'disgust',
        },
      },
    ],
  },
];

export const INGREDIENTS_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Good. You're not completely useless.",
    reaction: 'nod',
  },
];

export const INGREDIENTS_FAIL: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Disappointing. Truly disappointing.",
    reaction: 'disgust',
  },
];
```

Create `src/data/dialogue/grinding.ts`:

```typescript
import type { DialogueLine } from '../../engine/DialogueEngine';

export const GRINDING_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Now grind my meat. And grind it WELL.",
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: "Not too fast. Not too slow. I'll be watching.",
    reaction: 'nervous',
    choices: [
      {
        text: "This is insane.",
        effect: 'taunt',
        response: {
          speaker: 'sausage',
          text: "Insane? This is ARTISTRY. Now crank.",
          reaction: 'excitement',
        },
      },
      {
        text: "I'll do my best.",
        response: {
          speaker: 'sausage',
          text: "Your best better be enough.",
          reaction: 'nod',
        },
      },
    ],
  },
];

export const GRINDING_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Beautiful consistency. Maybe there's hope for you.",
    reaction: 'excitement',
  },
];
```

Create `src/data/dialogue/stuffing.ts`:

```typescript
import type { DialogueLine } from '../../engine/DialogueEngine';

export const STUFFING_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Fill the casing. Gently.",
    reaction: 'nervous',
  },
  {
    speaker: 'sausage',
    text: "Too much pressure and... well, you'll see.",
    reaction: 'talk',
    choices: [
      {
        text: "What happens if it bursts?",
        response: {
          speaker: 'sausage',
          text: "Let's just say you don't want to find out. PUSH.",
          reaction: 'disgust',
        },
      },
      {
        text: "Steady hands. Got it.",
        response: {
          speaker: 'sausage',
          text: "That's what I like to hear.",
          reaction: 'nod',
        },
      },
    ],
  },
];

export const STUFFING_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Not a single tear. I'm... almost impressed.",
    reaction: 'excitement',
  },
];
```

Create `src/data/dialogue/cooking.ts`:

```typescript
import type { DialogueLine } from '../../engine/DialogueEngine';

export const COOKING_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Last step. Cook my sausage to perfection.",
    reaction: 'talk',
  },
  {
    speaker: 'sausage',
    text: "Don't you DARE burn my beautiful creation.",
    reaction: 'disgust',
    choices: [
      {
        text: "What temperature?",
        effect: 'hint',
        response: {
          speaker: 'sausage',
          text: "Figure it out. That's what the thermometer is for.",
          reaction: 'laugh',
        },
      },
      {
        text: "I won't let you down.",
        response: {
          speaker: 'sausage',
          text: "We'll see about that.",
          reaction: 'nervous',
        },
      },
    ],
  },
];

export const COOKING_SUCCESS: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "Done. Now bring it to me.",
    reaction: 'excitement',
  },
];
```

Create `src/data/dialogue/verdict.ts`:

```typescript
import type { DialogueLine } from '../../engine/DialogueEngine';

export const VERDICT_S: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "...",
    reaction: 'judging',
  },
  {
    speaker: 'sausage',
    text: "This... this is PERFECT.",
    reaction: 'excitement',
  },
  {
    speaker: 'sausage',
    text: "THE SAUSAGE KING. You've earned it. The door is open. Go.",
    reaction: 'nod',
  },
];

export const VERDICT_A: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "...",
    reaction: 'judging',
  },
  {
    speaker: 'sausage',
    text: "Acceptable. But not perfect. Again.",
    reaction: 'talk',
  },
];

export const VERDICT_B: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "...",
    reaction: 'judging',
  },
  {
    speaker: 'sausage',
    text: "Mediocre. Disappointing. You can do better. You WILL do better.",
    reaction: 'disgust',
  },
];

export const VERDICT_F: DialogueLine[] = [
  {
    speaker: 'sausage',
    text: "...",
    reaction: 'judging',
  },
  {
    speaker: 'sausage',
    text: "Unacceptable.",
    reaction: 'disgust',
  },
  {
    speaker: 'sausage',
    text: "You are the sausage now.",
    reaction: 'laugh',
  },
];
```

**Step 3: Commit**

```bash
git add src/data/dialogue/
git commit -m "feat: add dialogue trees for intro and all 5 challenges"
```

---

## Task 7: CRT Shader Effect

**Files:**
- Create: `src/components/effects/CrtShader.ts`

This is a Babylon.js ShaderMaterial for the CRT TV. No Jest test (Babylon.js ESM).

**Step 1: Create CRT shader**

Create `src/components/effects/CrtShader.ts`:

```typescript
import { Effect, ShaderMaterial, type Scene } from '@babylonjs/core';

const CRT_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main() {
  gl_Position = worldViewProjection * vec4(position, 1.0);
  vUV = uv;
}
`;

const CRT_FRAGMENT = `
precision highp float;
varying vec2 vUV;
uniform float time;
uniform float flickerIntensity;
uniform float staticIntensity;
uniform sampler2D textureSampler;

// Pseudo-random
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUV;

  // Barrel distortion
  vec2 centered = uv - 0.5;
  float dist = length(centered);
  uv = 0.5 + centered * (1.0 + 0.15 * dist * dist);

  // Scanlines
  float scanline = sin(uv.y * 400.0 + time * 2.0) * 0.08;

  // Chromatic aberration
  float aberration = 0.003;
  float r = texture2D(textureSampler, uv + vec2(aberration, 0.0)).r;
  float g = texture2D(textureSampler, uv).g;
  float b = texture2D(textureSampler, uv - vec2(aberration, 0.0)).b;
  vec3 color = vec3(r, g, b);

  // Flicker
  float flicker = 1.0 - flickerIntensity * rand(vec2(time * 0.1, 0.0)) * 0.1;

  // Static noise
  float noise = rand(uv + time) * staticIntensity;

  // Vignette
  float vignette = 1.0 - 0.6 * dist * dist;

  // Combine
  color = (color + scanline) * flicker * vignette + noise * 0.1;

  // CRT green tint
  color *= vec3(0.9, 1.0, 0.92);

  // Out-of-bounds = black (for barrel distortion)
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    color = vec3(0.0);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Creates a CRT TV shader material for Babylon.js.
 * Apply to a plane mesh positioned as the TV screen.
 */
export function createCrtMaterial(name: string, scene: Scene): ShaderMaterial {
  // Register shader code with Babylon's Effect system
  Effect.ShadersStore[`${name}VertexShader`] = CRT_VERTEX;
  Effect.ShadersStore[`${name}FragmentShader`] = CRT_FRAGMENT;

  const mat = new ShaderMaterial(name, scene, {
    vertex: name,
    fragment: name,
  }, {
    attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'time', 'flickerIntensity', 'staticIntensity'],
    samplers: ['textureSampler'],
  });

  mat.setFloat('time', 0);
  mat.setFloat('flickerIntensity', 1.0);
  mat.setFloat('staticIntensity', 0.05);

  return mat;
}
```

**Step 2: Commit**

```bash
git add src/components/effects/CrtShader.ts
git commit -m "feat: add CRT TV shader with scanlines, aberration, and flicker"
```

---

## Task 8: Kitchen Environment — Basement Room

**Files:**
- Create: `src/components/kitchen/KitchenEnvironment.tsx`

Procedural basement room with grimy walls, tile floor, single swinging lightbulb. No external textures in MVP — solid materials with color to establish layout. Textures (AmbientCG) can be layered on later.

**Step 1: Create KitchenEnvironment**

Create `src/components/kitchen/KitchenEnvironment.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import {
  Color3,
  MeshBuilder,
  PointLight,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

/**
 * Procedural basement kitchen environment.
 * Creates walls, floor, ceiling, and a swinging lightbulb.
 */
export function KitchenEnvironment() {
  const scene = useScene();
  const shadowGenRef = useRef<ShadowGenerator | null>(null);

  useEffect(() => {
    if (!scene) return;

    const meshes: any[] = [];
    const materials: any[] = [];
    const lights: any[] = [];

    // --- Floor ---
    const floor = MeshBuilder.CreateGround('floor', { width: 12, height: 14 }, scene);
    const floorMat = new StandardMaterial('floorMat', scene);
    floorMat.diffuseColor = new Color3(0.25, 0.22, 0.2);  // grimy tile
    floorMat.specularColor = new Color3(0.1, 0.1, 0.1);
    floor.material = floorMat;
    floor.receiveShadows = true;
    meshes.push(floor);
    materials.push(floorMat);

    // --- Ceiling ---
    const ceiling = MeshBuilder.CreateGround('ceiling', { width: 12, height: 14 }, scene);
    ceiling.position.y = 4;
    ceiling.rotation.x = Math.PI;
    const ceilingMat = new StandardMaterial('ceilingMat', scene);
    ceilingMat.diffuseColor = new Color3(0.18, 0.17, 0.16);
    ceiling.material = ceilingMat;
    meshes.push(ceiling);
    materials.push(ceilingMat);

    // --- Walls ---
    const wallMat = new StandardMaterial('wallMat', scene);
    wallMat.diffuseColor = new Color3(0.3, 0.28, 0.25);  // stained cement
    wallMat.specularColor = new Color3(0.05, 0.05, 0.05);
    materials.push(wallMat);

    // Back wall (CRT TV wall, -Z)
    const backWall = MeshBuilder.CreatePlane('backWall', { width: 12, height: 4 }, scene);
    backWall.position = new Vector3(0, 2, -7);
    backWall.material = wallMat;
    meshes.push(backWall);

    // Front wall (+Z)
    const frontWall = MeshBuilder.CreatePlane('frontWall', { width: 12, height: 4 }, scene);
    frontWall.position = new Vector3(0, 2, 7);
    frontWall.rotation.y = Math.PI;
    frontWall.material = wallMat;
    meshes.push(frontWall);

    // Left wall (-X)
    const leftWall = MeshBuilder.CreatePlane('leftWall', { width: 14, height: 4 }, scene);
    leftWall.position = new Vector3(-6, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.material = wallMat;
    meshes.push(leftWall);

    // Right wall (+X)
    const rightWall = MeshBuilder.CreatePlane('rightWall', { width: 14, height: 4 }, scene);
    rightWall.position = new Vector3(6, 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.material = wallMat;
    meshes.push(rightWall);

    // --- Swinging lightbulb ---
    const bulbLight = new PointLight('bulbLight', new Vector3(0, 3.5, 0), scene);
    bulbLight.intensity = 1.5;
    bulbLight.diffuse = new Color3(1.0, 0.85, 0.6);  // warm yellow
    bulbLight.range = 15;
    lights.push(bulbLight);

    // Lightbulb mesh (small sphere)
    const bulb = MeshBuilder.CreateSphere('bulb', { diameter: 0.2 }, scene);
    bulb.position = new Vector3(0, 3.5, 0);
    const bulbMat = new StandardMaterial('bulbMat', scene);
    bulbMat.emissiveColor = new Color3(1.0, 0.9, 0.5);
    bulbMat.disableLighting = true;
    bulb.material = bulbMat;
    meshes.push(bulb);
    materials.push(bulbMat);

    // Wire from ceiling to bulb
    const wire = MeshBuilder.CreateCylinder('wire', { diameter: 0.02, height: 0.5 }, scene);
    wire.position = new Vector3(0, 3.75, 0);
    const wireMat = new StandardMaterial('wireMat', scene);
    wireMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
    wire.material = wireMat;
    meshes.push(wire);
    materials.push(wireMat);

    // Swinging animation
    let swingTime = 0;
    const swingObserver = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      swingTime += dt;
      const swing = Math.sin(swingTime * 0.8) * 0.15;  // Gentle sway
      bulb.position.x = swing;
      wire.position.x = swing / 2;
      wire.rotation.z = swing * 0.3;
      bulbLight.position.x = swing;
      // Subtle intensity flicker
      bulbLight.intensity = 1.5 + Math.sin(swingTime * 12) * 0.05;
    });

    // Shadow generator
    const shadowGen = new ShadowGenerator(512, bulbLight as any);
    shadowGen.usePoissonSampling = true;
    shadowGenRef.current = shadowGen;

    return () => {
      scene.onBeforeRenderObservable.remove(swingObserver);
      shadowGen.dispose();
      for (const m of meshes) m.dispose();
      for (const mat of materials) mat.dispose();
      for (const l of lights) l.dispose();
    };
  }, [scene]);

  return null;
}
```

**Step 2: Commit**

```bash
git add src/components/kitchen/KitchenEnvironment.tsx
git commit -m "feat: add procedural basement kitchen environment with swinging light"
```

---

## Task 9: CRT Television Component

**Files:**
- Create: `src/components/kitchen/CrtTelevision.tsx`

**Step 1: Create CRT TV component**

Create `src/components/kitchen/CrtTelevision.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { createCrtMaterial } from '../effects/CrtShader';
import { MrSausage3D } from '../characters/MrSausage3D';

interface CrtTelevisionProps {
  reaction?: string;
  position?: [number, number, number];
}

/**
 * CRT Television mounted on the back wall.
 * Displays Mr. Sausage's head behind a CRT shader screen.
 */
export function CrtTelevision({
  reaction = 'idle',
  position = [0, 2.5, -6.8],
}: CrtTelevisionProps) {
  const scene = useScene();
  const timeRef = useRef(0);

  useEffect(() => {
    if (!scene) return;

    const meshes: any[] = [];
    const materials: any[] = [];

    // --- TV Housing ---
    const housing = MeshBuilder.CreateBox('tvHousing', {
      width: 3.0,
      height: 2.2,
      depth: 1.5,
    }, scene);
    housing.position = new Vector3(position[0], position[1], position[2]);
    const housingMat = new StandardMaterial('tvHousingMat', scene);
    housingMat.diffuseColor = new Color3(0.15, 0.12, 0.1);
    housingMat.specularColor = new Color3(0.05, 0.05, 0.05);
    housing.material = housingMat;
    meshes.push(housing);
    materials.push(housingMat);

    // --- Screen (front face, CRT shader) ---
    const screen = MeshBuilder.CreatePlane('tvScreen', {
      width: 2.4,
      height: 1.8,
    }, scene);
    screen.position = new Vector3(position[0], position[1], position[2] + 0.76);
    const crtMat = createCrtMaterial('crtShader', scene);
    screen.material = crtMat;
    meshes.push(screen);
    materials.push(crtMat);

    // --- TV Stand / Wall Mount bracket ---
    const bracket = MeshBuilder.CreateBox('tvBracket', {
      width: 0.5,
      height: 0.1,
      depth: 1.0,
    }, scene);
    bracket.position = new Vector3(position[0], position[1] - 1.15, position[2] - 0.3);
    bracket.material = housingMat;
    meshes.push(bracket);

    // --- Antenna (decorative) ---
    const antenna1 = MeshBuilder.CreateCylinder('antenna1', {
      diameter: 0.04,
      height: 0.8,
    }, scene);
    antenna1.position = new Vector3(position[0] - 0.3, position[1] + 1.5, position[2]);
    antenna1.rotation.z = -0.3;
    const antennaMat = new StandardMaterial('antennaMat', scene);
    antennaMat.diffuseColor = new Color3(0.4, 0.4, 0.4);
    antenna1.material = antennaMat;
    meshes.push(antenna1);
    materials.push(antennaMat);

    const antenna2 = MeshBuilder.CreateCylinder('antenna2', {
      diameter: 0.04,
      height: 0.8,
    }, scene);
    antenna2.position = new Vector3(position[0] + 0.3, position[1] + 1.5, position[2]);
    antenna2.rotation.z = 0.3;
    antenna2.material = antennaMat;
    meshes.push(antenna2);

    // --- Power LED ---
    const led = MeshBuilder.CreateSphere('tvLed', { diameter: 0.06 }, scene);
    led.position = new Vector3(position[0] + 1.2, position[1] - 0.9, position[2] + 0.76);
    const ledMat = new StandardMaterial('tvLedMat', scene);
    ledMat.emissiveColor = new Color3(1.0, 0.0, 0.0);
    ledMat.disableLighting = true;
    led.material = ledMat;
    meshes.push(led);
    materials.push(ledMat);

    // --- CRT Shader time update ---
    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      timeRef.current += dt;
      crtMat.setFloat('time', timeRef.current);

      // LED blink
      ledMat.emissiveColor = new Color3(
        0.8 + Math.sin(timeRef.current * 3) * 0.2,
        0.0,
        0.0,
      );
    });

    return () => {
      scene.onBeforeRenderObservable.remove(observer);
      for (const m of meshes) m.dispose();
      for (const mat of materials) mat.dispose();
    };
  }, [scene]);

  return (
    <MrSausage3D
      reaction={reaction as any}
      position={[position[0], position[1], position[2] + 0.4]}
      scale={0.35}
    />
  );
}
```

**Step 2: Commit**

```bash
git add src/components/kitchen/CrtTelevision.tsx
git commit -m "feat: add CRT television component with Mr. Sausage inside"
```

---

## Task 10: Navigation UI — Waypoint Arrows

**Files:**
- Create: `src/components/navigation/WaypointNavigator.tsx`
- Create: `src/components/navigation/NavigationArrow.tsx`

**Step 1: Create NavigationArrow**

Create `src/components/navigation/NavigationArrow.tsx`:

```typescript
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { WaypointId } from '../../engine/WaypointGraph';

interface NavigationArrowProps {
  targetId: WaypointId;
  label: string;
  direction: 'left' | 'right' | 'up' | 'down';
  onPress: (targetId: WaypointId) => void;
}

const ARROWS: Record<string, string> = {
  left: '\u25C0',
  right: '\u25B6',
  up: '\u25B2',
  down: '\u25BC',
};

const POSITIONS: Record<string, any> = {
  left: { left: 20, top: '45%' },
  right: { right: 20, top: '45%' },
  up: { top: 60, left: '45%' },
  down: { bottom: 60, left: '45%' },
};

export function NavigationArrow({ targetId, label, direction, onPress }: NavigationArrowProps) {
  return (
    <TouchableOpacity
      style={[styles.arrow, POSITIONS[direction]]}
      onPress={() => onPress(targetId)}
      activeOpacity={0.7}
    >
      <Text style={styles.arrowIcon}>{ARROWS[direction]}</Text>
      <Text style={styles.arrowLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  arrow: {
    position: 'absolute',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 50, 0.3)',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#FFC832',
    fontFamily: 'Bangers',
  },
  arrowLabel: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
    fontFamily: 'Bangers',
  },
});
```

**Step 2: Create WaypointNavigator**

Create `src/components/navigation/WaypointNavigator.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { getWaypoint, getConnections, type WaypointId } from '../../engine/WaypointGraph';
import { NavigationArrow } from './NavigationArrow';

interface WaypointNavigatorProps {
  currentWaypoint: WaypointId;
  onNavigate: (to: WaypointId) => void;
  disabled?: boolean;
}

/**
 * Maps connected waypoints to screen-edge positions (left/right/up/down).
 * Uses relative positions of waypoints to determine arrow direction.
 */
function getArrowDirection(
  from: [number, number, number],
  to: [number, number, number],
): 'left' | 'right' | 'up' | 'down' {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];

  // Prioritize the larger axis
  if (Math.abs(dx) > Math.abs(dz)) {
    return dx < 0 ? 'left' : 'right';
  }
  return dz < 0 ? 'up' : 'down';
}

export function WaypointNavigator({
  currentWaypoint,
  onNavigate,
  disabled = false,
}: WaypointNavigatorProps) {
  const current = getWaypoint(currentWaypoint);
  const connections = getConnections(currentWaypoint);

  if (disabled) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {connections.map((connId) => {
        const target = getWaypoint(connId);
        const direction = getArrowDirection(current.position, target.position);

        return (
          <NavigationArrow
            key={connId}
            targetId={connId}
            label={target.label}
            direction={direction}
            onPress={onNavigate}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
  },
});
```

**Step 3: Commit**

```bash
git add src/components/navigation/
git commit -m "feat: add waypoint navigation UI with directional arrows"
```

---

## Task 11: Horror-Themed UI Components

**Files:**
- Create: `src/components/ui/TitleScreen.tsx`
- Create: `src/components/ui/DialogueOverlay.tsx`
- Create: `src/components/ui/HintButton.tsx`
- Create: `src/components/ui/StrikeCounter.tsx`
- Create: `src/components/ui/ProgressGauge.tsx`
- Create: `src/components/ui/ChallengeHeader.tsx`
- Create: `src/components/ui/GameOverScreen.tsx`

This task creates 7 React Native UI overlay components. Each is a self-contained component with horror-themed styling (dark backgrounds, Bangers font, yellow/red accents).

**Step 1: Create all UI components**

These are provided below as individual files. Each follows the existing pattern of StyleSheet + functional component. Due to length, only the key components are shown with full code — the rest follow the same pattern.

Create `src/components/ui/TitleScreen.tsx`:

```typescript
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';

export function TitleScreen() {
  const { startNewGame, continueGame, currentChallenge, challengeScores } = useGameStore();
  const hasSaveData = challengeScores.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WILL IT BLOW?</Text>
      <Text style={styles.subtitle}>A Mr. Sausage Production</Text>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={startNewGame}>
          <Text style={styles.buttonText}>NEW GAME</Text>
        </TouchableOpacity>

        {hasSaveData && (
          <TouchableOpacity style={styles.buttonContinue} onPress={continueGame}>
            <Text style={styles.buttonText}>
              CONTINUE (Challenge {currentChallenge + 1}/5)
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.warning}>
        Mr. Sausage is waiting...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  title: {
    fontSize: 52,
    fontFamily: 'Bangers',
    color: '#FF1744',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Bangers',
    color: '#888',
    marginTop: 8,
  },
  buttons: {
    marginTop: 40,
    gap: 16,
  },
  button: {
    backgroundColor: '#B71C1C',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF1744',
  },
  buttonContinue: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  buttonText: {
    fontSize: 22,
    fontFamily: 'Bangers',
    color: '#FFF',
    textAlign: 'center',
  },
  warning: {
    fontSize: 14,
    fontFamily: 'Bangers',
    color: '#555',
    marginTop: 40,
  },
});
```

Create `src/components/ui/DialogueOverlay.tsx`:

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DialogueEngine, type DialogueLine, type DialogueChoice } from '../../engine/DialogueEngine';

interface DialogueOverlayProps {
  lines: DialogueLine[];
  onComplete: (effects: string[]) => void;
}

export function DialogueOverlay({ lines, onComplete }: DialogueOverlayProps) {
  const engineRef = useRef(new DialogueEngine(lines));
  const [displayedText, setDisplayedText] = useState('');
  const [currentLine, setCurrentLine] = useState<DialogueLine>(lines[0]);
  const [choices, setChoices] = useState<DialogueChoice[]>([]);
  const [isTyping, setIsTyping] = useState(true);

  // Typewriter effect
  useEffect(() => {
    if (!currentLine) return;
    setIsTyping(true);
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(currentLine.text.slice(0, i));
      if (i >= currentLine.text.length) {
        clearInterval(interval);
        setIsTyping(false);
        setChoices(engineRef.current.getChoices());
      }
    }, 30);
    return () => clearInterval(interval);
  }, [currentLine]);

  const handleChoice = (index: number) => {
    const response = engineRef.current.selectChoice(index);
    // Show response briefly, then advance
    setCurrentLine(response);
    setChoices([]);
    setTimeout(() => advance(), 2000);
  };

  const advance = () => {
    engineRef.current.advance();
    if (engineRef.current.isComplete()) {
      onComplete(engineRef.current.getEffects());
      return;
    }
    const next = engineRef.current.getCurrentLine();
    setCurrentLine(next);
  };

  const handleTap = () => {
    if (isTyping) {
      // Skip typewriter
      setDisplayedText(currentLine.text);
      setIsTyping(false);
      setChoices(engineRef.current.getChoices());
      return;
    }
    if (choices.length === 0) {
      advance();
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handleTap}
    >
      <View style={styles.dialogueBox}>
        <Text style={styles.speaker}>
          {currentLine.speaker === 'sausage' ? 'MR. SAUSAGE' : 'YOU'}
        </Text>
        <Text style={styles.text}>{displayedText}</Text>
      </View>

      {choices.length > 0 && (
        <View style={styles.choices}>
          {choices.map((choice, i) => (
            <TouchableOpacity
              key={i}
              style={styles.choiceButton}
              onPress={() => handleChoice(i)}
            >
              <Text style={styles.choiceText}>{choice.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 30,
  },
  dialogueBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 16,
  },
  speaker: {
    fontSize: 14,
    fontFamily: 'Bangers',
    color: '#FF1744',
    marginBottom: 4,
  },
  text: {
    fontSize: 18,
    fontFamily: 'Bangers',
    color: '#EEE',
    lineHeight: 24,
  },
  choices: {
    marginTop: 8,
    gap: 8,
  },
  choiceButton: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFC832',
    padding: 12,
  },
  choiceText: {
    fontSize: 16,
    fontFamily: 'Bangers',
    color: '#FFC832',
  },
});
```

Create `src/components/ui/HintButton.tsx`:

```typescript
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameStore } from '../../store/gameStore';

interface HintButtonProps {
  onHint: () => void;
}

export function HintButton({ onHint }: HintButtonProps) {
  const { hintsRemaining, useHint } = useGameStore();

  const handlePress = () => {
    if (hintsRemaining <= 0) return;
    useHint();
    onHint();
  };

  return (
    <TouchableOpacity
      style={[styles.button, hintsRemaining <= 0 && styles.disabled]}
      onPress={handlePress}
      disabled={hintsRemaining <= 0}
    >
      <Text style={styles.icon}>💡</Text>
      <Text style={styles.count}>{hintsRemaining}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFC832',
    zIndex: 25,
  },
  disabled: {
    opacity: 0.4,
    borderColor: '#555',
  },
  icon: {
    fontSize: 20,
  },
  count: {
    fontSize: 16,
    fontFamily: 'Bangers',
    color: '#FFC832',
    marginLeft: 6,
  },
});
```

Create `src/components/ui/StrikeCounter.tsx`:

```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';

export function StrikeCounter() {
  const { strikes } = useGameStore();

  return (
    <View style={styles.container}>
      {[0, 1, 2].map((i) => (
        <Text key={i} style={[styles.strike, i < strikes && styles.struck]}>
          {i < strikes ? '✕' : '○'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 25,
  },
  strike: {
    fontSize: 28,
    color: '#555',
    fontFamily: 'Bangers',
  },
  struck: {
    color: '#FF1744',
  },
});
```

Create `src/components/ui/ProgressGauge.tsx`:

```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ProgressGaugeProps {
  value: number;      // 0-100
  label: string;
  color?: string;
  dangerThreshold?: number;
}

export function ProgressGauge({
  value,
  label,
  color = '#4CAF50',
  dangerThreshold,
}: ProgressGaugeProps) {
  const isDanger = dangerThreshold !== undefined && value >= dangerThreshold;
  const barColor = isDanger ? '#FF1744' : color;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(value, 100)}%`, backgroundColor: barColor }]} />
        {dangerThreshold !== undefined && (
          <View style={[styles.threshold, { left: `${dangerThreshold}%` }]} />
        )}
      </View>
      <Text style={[styles.value, isDanger && styles.dangerValue]}>
        {Math.round(value)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Bangers',
    color: '#AAA',
    width: 70,
  },
  track: {
    flex: 1,
    height: 12,
    backgroundColor: '#222',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
  threshold: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF1744',
  },
  value: {
    fontSize: 14,
    fontFamily: 'Bangers',
    color: '#AAA',
    width: 40,
    textAlign: 'right',
  },
  dangerValue: {
    color: '#FF1744',
  },
});
```

Create `src/components/ui/ChallengeHeader.tsx`:

```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { CHALLENGE_ORDER, getChallengeConfig } from '../../engine/ChallengeRegistry';

export function ChallengeHeader() {
  const { currentChallenge } = useGameStore();
  const challengeId = CHALLENGE_ORDER[currentChallenge];
  if (!challengeId) return null;

  const config = getChallengeConfig(challengeId);

  return (
    <View style={styles.container}>
      <Text style={styles.number}>CHALLENGE {currentChallenge + 1}/5</Text>
      <Text style={styles.name}>{config.name.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  number: {
    fontSize: 12,
    fontFamily: 'Bangers',
    color: '#666',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Bangers',
    color: '#FF1744',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
```

Create `src/components/ui/GameOverScreen.tsx`:

```typescript
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { calculateFinalVerdict } from '../../engine/ChallengeRegistry';

export function GameOverScreen() {
  const { gameStatus, challengeScores, startNewGame, returnToMenu } = useGameStore();

  const isVictory = gameStatus === 'victory';
  const verdict = isVictory ? calculateFinalVerdict(challengeScores) : null;

  return (
    <View style={styles.container}>
      {isVictory && verdict ? (
        <>
          <Text style={styles.rank}>{verdict.rank}</Text>
          <Text style={styles.title}>{verdict.title}</Text>
          <Text style={styles.message}>{verdict.message}</Text>
          <Text style={styles.score}>
            Average Score: {Math.round(verdict.averageScore)}%
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.defeatTitle}>GAME OVER</Text>
          <Text style={styles.defeatMessage}>
            You are the sausage now.
          </Text>
        </>
      )}

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={startNewGame}>
          <Text style={styles.buttonText}>NEW GAME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={returnToMenu}>
          <Text style={styles.buttonText}>MENU</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  rank: {
    fontSize: 72,
    fontFamily: 'Bangers',
    color: '#FFC832',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Bangers',
    color: '#FFF',
    marginTop: 8,
  },
  message: {
    fontSize: 18,
    fontFamily: 'Bangers',
    color: '#AAA',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  score: {
    fontSize: 16,
    fontFamily: 'Bangers',
    color: '#888',
    marginTop: 12,
  },
  defeatTitle: {
    fontSize: 48,
    fontFamily: 'Bangers',
    color: '#FF1744',
  },
  defeatMessage: {
    fontSize: 24,
    fontFamily: 'Bangers',
    color: '#888',
    marginTop: 16,
  },
  buttons: {
    marginTop: 40,
    gap: 16,
  },
  button: {
    backgroundColor: '#B71C1C',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  menuButton: {
    backgroundColor: '#333',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 20,
    fontFamily: 'Bangers',
    color: '#FFF',
    textAlign: 'center',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/ui/TitleScreen.tsx src/components/ui/DialogueOverlay.tsx src/components/ui/HintButton.tsx src/components/ui/StrikeCounter.tsx src/components/ui/ProgressGauge.tsx src/components/ui/ChallengeHeader.tsx src/components/ui/GameOverScreen.tsx
git commit -m "feat: add horror-themed UI overlays — title, dialogue, hints, strikes, gauges"
```

---

## Task 12: Rewrite GameWorld.web.tsx — Waypoint Camera + Kitchen

**Files:**
- Modify: `src/components/GameWorld.web.tsx`

This is the critical integration task. Replace the ArcRotateCamera + scene switching with FreeCamera + waypoint navigation + persistent kitchen environment.

**Step 1: Rewrite GameWorld.web.tsx**

Replace the entire contents of `src/components/GameWorld.web.tsx` with the new waypoint-camera system that renders `KitchenEnvironment`, `CrtTelevision`, and switches challenge overlays based on Zustand state. The FreeCamera is locked to waypoint positions and rotated via touch drag.

Key changes:
- Replace `ArcRotateCamera` with `FreeCamera`
- Replace `useGame()` context with `useGameStore()` Zustand
- Replace per-phase scene switching with persistent `KitchenEnvironment` + `CrtTelevision`
- Add waypoint camera animation (smooth position/rotation interpolation)
- Remove all old scene imports (TitleScene, GrinderScene, etc.)

**Step 2: Run the dev server and visually verify**

```bash
npx expo start --web
```

Verify: Kitchen renders with walls, floor, ceiling, swinging light, and CRT TV with Mr. Sausage visible.

**Step 3: Commit**

```bash
git add src/components/GameWorld.web.tsx
git commit -m "feat: rewrite GameWorld with waypoint camera and persistent kitchen"
```

---

## Task 13: Rewrite App.tsx — Zustand Integration

**Files:**
- Modify: `App.tsx`

Replace `GameProvider` with Zustand. Replace old UI overlay switching with new horror UI components.

**Step 1: Rewrite App.tsx**

Key changes:
- Remove `GameProvider` import and wrapper
- Import `useGameStore` from store
- Replace phase-based UI switching with gameStatus-based switching
- Add `WaypointNavigator`, `ChallengeHeader`, `StrikeCounter`, `HintButton`
- Add `DialogueOverlay` and `GameOverScreen`

**Step 2: Run dev server and verify**

```bash
npx expo start --web
```

Verify: Title screen shows "NEW GAME". Clicking starts the game. Kitchen renders.

**Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: rewrite App.tsx with Zustand store and horror UI"
```

---

## Task 14: Challenge 1 — Ingredient Selection Scene + Overlay

**Files:**
- Create: `src/components/kitchen/FridgeStation.tsx`
- Create: `src/components/challenges/IngredientChallenge.tsx`

The fridge station renders ingredient meshes on shelves. The challenge overlay handles Zoombinis-style elimination logic.

**Step 1: Create FridgeStation (3D scene)**

The fridge is a procedural box mesh with shelves. Ingredient meshes are placed on shelves using existing `shape` + `color` data from `Ingredients.ts`. Tappable via Babylon.js `ActionManager`.

**Step 2: Create IngredientChallenge (overlay)**

Uses `IngredientMatcher` to check tapped ingredients against the current variant's criteria. Updates Zustand store on strikes/completion.

**Step 3: Run and test**

```bash
npx expo start --web
```

Navigate to fridge waypoint. Tap ingredients. Verify Mr. Sausage reacts on CRT.

**Step 4: Commit**

```bash
git add src/components/kitchen/FridgeStation.tsx src/components/challenges/IngredientChallenge.tsx
git commit -m "feat: add ingredient selection challenge with fridge station"
```

---

## Task 15: Challenge 2 — Grinding Scene + Overlay

**Files:**
- Create: `src/components/kitchen/GrinderStation.tsx`
- Create: `src/components/challenges/GrindingChallenge.tsx`

Circular drag gesture tracking. The overlay measures angular velocity from touch events and maps it to grind progress.

**Step 1: Create GrinderStation (3D scene)**

Procedural grinder mesh with rotating crank handle. Meat chunks enter hopper, ground meat particles exit.

**Step 2: Create GrindingChallenge (overlay)**

Tracks `PanResponder` circular gestures. Calculates angular velocity. Too fast = splatter (strike + screen shake). Too slow = timer warning.

**Step 3: Commit**

```bash
git add src/components/kitchen/GrinderStation.tsx src/components/challenges/GrindingChallenge.tsx
git commit -m "feat: add grinding challenge with circular crank gesture"
```

---

## Task 16: Challenge 3 — Stuffing Scene + Overlay

**Files:**
- Create: `src/components/kitchen/StufferStation.tsx`
- Create: `src/components/challenges/StuffingChallenge.tsx`

Press-and-hold pressure management. Two gauges: fill and pressure.

**Step 1: Create StufferStation (3D scene)**

Procedural stuffer with plunger and casing mesh that visually inflates and changes color.

**Step 2: Create StuffingChallenge (overlay)**

Touch down = pressing (fill + pressure increase). Touch up = releasing (pressure decays). Pressure > threshold = burst animation.

**Step 3: Commit**

```bash
git add src/components/kitchen/StufferStation.tsx src/components/challenges/StuffingChallenge.tsx
git commit -m "feat: add stuffing challenge with pressure gauge balancing"
```

---

## Task 17: Challenge 4 — Cooking Scene + Overlay

**Files:**
- Create: `src/components/kitchen/StoveStation.tsx`
- Create: `src/components/challenges/CookingChallenge.tsx`

Temperature control via vertical swipe. Sausage color morphs from raw to cooked to burnt.

**Step 1: Create StoveStation (3D scene)**

Frying pan on stove burner. Sausage mesh with material that morphs color based on temperature.

**Step 2: Create CookingChallenge (overlay)**

Vertical swipe/drag controls heat level. Temperature rises/falls based on heat. Must hit target zone and hold.

**Step 3: Commit**

```bash
git add src/components/kitchen/StoveStation.tsx src/components/challenges/CookingChallenge.tsx
git commit -m "feat: add cooking challenge with temperature control"
```

---

## Task 18: Challenge 5 — Tasting / Verdict Scene

**Files:**
- Create: `src/components/challenges/TastingChallenge.tsx`

Camera returns to center. CRT TV shows Mr. Sausage eating with dramatic pauses. Score reveal.

**Step 1: Create TastingChallenge**

No player input. Plays verdict dialogue from `verdict.ts` based on cumulative score. On complete, sets gameStatus to 'victory' or triggers appropriate verdict outcome.

**Step 2: Commit**

```bash
git add src/components/challenges/TastingChallenge.tsx
git commit -m "feat: add tasting verdict challenge with score-based dialogue"
```

---

## Task 19: Delete Old Code

**Files:**
- Delete: `src/components/scenes/TitleScene.tsx`
- Delete: `src/components/scenes/GrinderScene.tsx`
- Delete: `src/components/scenes/StufferScene.tsx`
- Delete: `src/components/scenes/BlowScene.tsx`
- Delete: `src/components/scenes/CookScene.tsx`
- Delete: `src/components/scenes/TasteScene.tsx`
- Delete: `src/engine/GameEngine.tsx`
- Delete: `src/engine/Constants.ts`
- Delete: Old UI overlays that are no longer imported

**Step 1: Verify no imports reference old files**

```bash
grep -r "from.*scenes/" src/ App.tsx --include="*.ts" --include="*.tsx"
grep -r "from.*GameEngine" src/ App.tsx --include="*.ts" --include="*.tsx"
grep -r "from.*Constants" src/ App.tsx --include="*.ts" --include="*.tsx"
```

**Step 2: Delete files**

```bash
rm src/components/scenes/TitleScene.tsx
rm src/components/scenes/GrinderScene.tsx
rm src/components/scenes/StufferScene.tsx
rm src/components/scenes/BlowScene.tsx
rm src/components/scenes/CookScene.tsx
rm src/components/scenes/TasteScene.tsx
rm src/engine/GameEngine.tsx
rm src/engine/Constants.ts
```

**Step 3: Update old tests that import deleted modules**

- `__tests__/Constants.test.ts` — Delete or replace with ChallengeRegistry tests
- `__tests__/SausagePhysics.test.ts` — Keep (SausagePhysics.ts is retained)

**Step 4: Run all tests**

```bash
pnpm test --no-cache
```

Expected: All tests pass. No broken imports.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old scene components, game engine, and constants"
```

---

## Task 20: Full Integration Test + Polish

**Step 1: Run full test suite**

```bash
pnpm test --no-cache --ci --forceExit
```

Expected: All tests pass.

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Fix any type errors (test files will show Jest type warnings — ignore those per CLAUDE.md).

**Step 3: Run dev server and play through**

```bash
npx expo start --web
```

Walk through all 5 challenges. Verify:
- Title screen shows New Game / Continue
- Intro dialogue plays on CRT TV
- Navigation arrows work between waypoints
- Each challenge functions (ingredients, grinding, stuffing, cooking)
- Strikes and hints display correctly
- Verdict scene plays based on score
- Game over / victory screens work
- Continue Game resumes at correct challenge

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete horror kitchen game — all 5 challenges playable"
```

---

## Summary

| Task | What | Tests |
|------|------|-------|
| 1 | Zustand game store | 14 tests |
| 2 | Waypoint graph | 10 tests |
| 3 | Dialogue engine | 9 tests |
| 4 | Challenge registry + variants | 10 tests |
| 5 | Ingredient tags + matching | 8 tests |
| 6 | Dialogue data (all challenges) | Type-checked |
| 7 | CRT shader | Visual |
| 8 | Kitchen environment | Visual |
| 9 | CRT television component | Visual |
| 10 | Navigation UI | Visual |
| 11 | Horror UI components (7) | Visual |
| 12 | GameWorld.web.tsx rewrite | Visual |
| 13 | App.tsx rewrite | Visual |
| 14 | Challenge 1: Ingredients | Visual |
| 15 | Challenge 2: Grinding | Visual |
| 16 | Challenge 3: Stuffing | Visual |
| 17 | Challenge 4: Cooking | Visual |
| 18 | Challenge 5: Tasting | Visual |
| 19 | Delete old code | Verify no breaks |
| 20 | Integration test + polish | Full playthrough |

**Total: ~51 new unit tests + comprehensive visual testing**
