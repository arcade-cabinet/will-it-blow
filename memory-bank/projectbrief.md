# Project Brief — Will It Blow?

## Identity

**Will It Blow?** is a first-person horror sausage-making mini-game. SAW meets cooking show. Dark humor with genuinely unsettling atmosphere.

## Premise

You're trapped in a filthy basement kitchen. **Mr. Sausage** — a sentient, menacing sausage wearing sunglasses and a chef hat — watches from a CRT television mounted on the wall. He demands you make him the perfect sausage. If you fail, things go badly for you.

## Core Loop

5 sequential challenges, each at a different kitchen station:

1. **Ingredients** (fridge) — Pick 3 ingredients matching Mr. Sausage's criteria from a pool of 10
2. **Grinding** (grinder) — Control grind speed in the "good zone" via drag/fling
3. **Stuffing** (stuffer) — Hold to fill casing, manage pressure to avoid bursts
4. **Cooking** (stove) — Control heat to keep temperature in target range
5. **Tasting** (CRT TV) — Mr. Sausage delivers his verdict with dramatic score reveals

## Victory Condition

Average of all 5 challenge scores determines rank:

| Rank | Score | Title | Outcome |
|------|-------|-------|---------|
| **S** | >= 90 | THE SAUSAGE KING | The ONLY true victory — "Perfection. You have earned my respect." |
| **A** | >= 70 | Acceptable | Defeat (close but not enough) — "Not bad. You may live... for now." |
| **B** | >= 50 | Mediocre | Defeat — "I've had worse. But not by much." |
| **F** | < 50 | Unacceptable | Defeat — "You call this a sausage? DISGRACEFUL." |

All outcomes except S-rank are forms of defeat. The game is designed so that S-rank is genuinely difficult to achieve.

## Strike System

- Maximum 3 strikes per challenge
- 3rd strike = immediate defeat (game over)
- Strikes reset between challenges

## Mr. Sausage

The antagonist and host. Procedural 3D character (no external model) displayed on an in-game CRT television with chromatic aberration shader. Provides commentary, demands, and judgment throughout the game. 9 reaction animations: idle, flinch, laugh, disgust, excitement, nervous, nod, talk.

## Design Tension

High-taste ingredients have low blowPower and vice versa. This forces trade-offs in ingredient selection. The S-rank is intentionally hard to reach through base scoring alone.
