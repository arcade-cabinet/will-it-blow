# Memory Bank — Agent Instructions

This directory contains persistent context files that agents read at the start of each session. The memory bank provides a shared understanding of the project so agents can work effectively without re-discovering the codebase from scratch.

## Read Order

Agents should read files in this order:

1. **AGENTS.md** (this file) — How to use the memory bank
2. **projectbrief.md** — Core project identity (what this is, why it exists)
3. **systemPatterns.md** — Architecture patterns and conventions
4. **techContext.md** — Technology stack and dependencies
5. **activeContext.md** — Current session context (what's being worked on now)
6. **progress.md** — What works, what doesn't, what's next

Optional deep-dive: `productContext.md` for user experience goals and platform details.

## Update Protocol

Files have different update frequencies:

| File | When to Update |
|------|----------------|
| `activeContext.md` | At the **start and end** of each work session. Record what you're working on, decisions made, and blockers encountered. |
| `progress.md` | When **milestones are reached** — features completed, tests added, bugs fixed, deployments done. |
| `systemPatterns.md` | When **new patterns are established** — new architectural decisions, new component patterns, new conventions. |
| `techContext.md` | When **dependencies change** — packages added/removed, versions bumped, build config changes. |
| `projectbrief.md` | **Rarely** — only when the core project identity changes (new premise, new target platforms). |
| `productContext.md` | **Rarely** — only when product requirements or user experience goals change. |

## Multi-Agent Coordination

Different agents need different files. Read the files relevant to your role:

| Agent Role | Required Files | Optional Files |
|------------|---------------|----------------|
| **ALL agents** | projectbrief, activeContext | — |
| **scene-architect** | systemPatterns, techContext | 3d-rendering.md, architecture.md |
| **challenge-dev** | systemPatterns, progress | game-design.md, state-management.md |
| **store-warden** | systemPatterns, techContext | state-management.md |
| **asset-pipeline** | techContext, progress | 3d-rendering.md, deployment.md |
| **doc-keeper** | ALL files | ALL docs/ files |

## Relationship to Other Documentation

The memory bank is a **summary layer** on top of the detailed docs:

- `CLAUDE.md` — Claude Code-specific instructions (commands, pitfalls, key files)
- `docs/` — Deep technical documentation (architecture, game design, rendering, etc.)
- `memory-bank/` — Persistent agent context (session state, progress, patterns)

The memory bank is designed to be read quickly at session start. For deep dives, follow the references into `docs/` or source code.

## Rules

1. **Never delete content** from memory bank files — append or update in place.
2. **Timestamp updates** in activeContext.md so other agents know when context was last refreshed.
3. **Keep entries concise** — bullet points over paragraphs, tables over prose.
4. **Cross-reference** source files when mentioning patterns (e.g., "see `src/store/gameStore.ts`").
5. **Flag contradictions** — if you find the memory bank disagrees with the source code, update the memory bank and note the discrepancy.
