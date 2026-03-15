---
title: Memory Bank Protocol
domain: memory-bank
status: current
last-verified: 2026-03-13
depends-on: []
agent-context: all
summary: Session context protocol — read order, update rules, multi-agent coordination
---

# Memory Bank — Agent Protocol

This directory contains persistent context that survives between agent sessions. After each session reset, agents rely ENTIRELY on these files to understand the project and continue work effectively.

**Every agent MUST read all memory bank files at the start of EVERY task.** This is not optional.

## Why This Exists

Agent memory resets completely between sessions. The Memory Bank is the ONLY persistent link between work sessions. Without reading these files, agents will:
- Re-discover patterns that are already documented
- Make architectural decisions that contradict established conventions
- Duplicate or conflict with prior work

## File Hierarchy

Files build on each other. Read in this order:

```
projectbrief.md      Foundation — core identity, scope, design pillars
    ↓
productContext.md    Why this exists, who it's for, UX goals
    ↓
systemPatterns.md    Architecture patterns and conventions (LEAN — points to domain docs)
    ↓
techContext.md        Tech stack, dependencies, known pitfalls
    ↓
activeContext.md     Current focus, recent changes, decisions, next steps
    ↓
progress.md          What works, what doesn't, milestones
```

## Read Order (MANDATORY)

1. **AGENTS.md** (this file) — How to use the memory bank
2. **projectbrief.md** — Core project identity (what this is, why it exists)
3. **productContext.md** — User experience goals and platform details
4. **systemPatterns.md** — Architecture patterns and conventions
5. **techContext.md** — Technology stack, dependencies, and pitfalls
6. **activeContext.md** — Current session context (what's being worked on now)
7. **progress.md** — What works, what doesn't, what's next

## Session Start Protocol (MANDATORY)

Every agent session MUST begin with:

1. Read ALL memory bank files in order above
2. Read `AGENTS.md` (project root) for commands and rules
3. Verify understanding against the codebase before making changes
4. Check `src/config/*.json` files before hardcoding any constants

## Session End Protocol (MANDATORY)

Every agent session MUST end with:

1. Update `activeContext.md` with what was accomplished, decisions made, and blockers
2. Update `progress.md` if implementation status changed
3. Update other files if new patterns, tech changes, or architectural decisions were made

## Update Protocol

| File | When to Update | Frequency |
|------|----------------|-----------|
| `activeContext.md` | Start and end of each session. Record what you're working on, decisions made, blockers. | Every session |
| `progress.md` | When milestones are reached — features completed, tests added, bugs fixed. | Per milestone |
| `systemPatterns.md` | When new architectural patterns are established or existing patterns change. | Rare |
| `techContext.md` | When dependencies change — packages added/removed, versions bumped, build config changes. | Rare |
| `projectbrief.md` | Only when core project identity changes (new premise, new target platforms). | Very rare |
| `productContext.md` | Only when product requirements or UX goals change. | Very rare |

## Multi-Agent Coordination

| Agent Role | Required Files | Optional Deep Dives |
|------------|---------------|---------------------|
| **ALL agents** | projectbrief, activeContext | — |
| **scene-architect** | systemPatterns, techContext | `docs/3d-rendering.md`, `docs/architecture.md` |
| **challenge-dev** | systemPatterns, progress | `docs/game-design.md`, `docs/state-management.md` |
| **store-warden** | systemPatterns, techContext | `docs/state-management.md` |
| **asset-pipeline** | techContext, progress | `docs/deployment.md` |
| **doc-keeper** | ALL files | ALL `docs/` files |

## Relationship to Other Documentation

```
AGENTS.md (project root)          ← Lean entry point for all agents
    ↓
docs/AGENTS.md                    ← Full documentation index, frontmatter schema
    ↓
docs/memory-bank/AGENTS.md       ← THIS FILE — session context protocol
docs/memory-bank/*.md             ← Persistent agent context files
    ↓
docs/*.md                         ← Deep domain documentation
```

- **Root `AGENTS.md`**: Quick orientation — architecture, commands, rules
- **`docs/AGENTS.md`**: Documentation index — what docs exist, who reads what
- **`docs/memory-bank/`** (this dir): Session-persistent context that all agents read
- **`docs/*.md`**: Authoritative deep dives per domain (architecture, game design, etc.)
- **`CLAUDE.md`**: Claude Code-specific behavior only (slash commands, tool preferences)

## Rules

1. **Never delete content** from memory bank files — append or update in place
2. **Timestamp updates** in activeContext.md so other agents know when context was last refreshed
3. **Keep entries concise** — bullet points over paragraphs, tables over prose
4. **Cross-reference** source files when mentioning patterns (e.g., "see `src/store/gameStore.ts`")
5. **Flag contradictions** — if the memory bank disagrees with source code, update the memory bank and note the discrepancy
6. **Memory bank is LEAN** — detailed explanations belong in `docs/*.md`, not here. Memory bank files should summarize and point to domain docs for depth.
