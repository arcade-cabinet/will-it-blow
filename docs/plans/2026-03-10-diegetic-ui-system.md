# Diegetic Surreal Text System (DS-Text)

## Core Philosophy
The game does not use traditional non-diegetic 2D HUDs for player instruction. Instead, the game communicates with the player through "Surreal Text" (messages written in substances like dried blood, grease, or grime) physically painted onto the room's surfaces (ceiling, walls, floor).

## System Rules

### 1. Contextual Surface Awareness
Text must intelligently anchor to the surface the player is currently focusing on or stationed at.
- **Prone State:** Text defaults to the ceiling directly above the player.
- **Sitting/Standing States:** Text dynamically anchors to the dominant wall in the player's Field of View (FOV).
- **Workstations:** Text can project onto the floor or countertops depending on the active challenge.

### 2. View & Perspective Centering
The text must always center-align itself based on two factors:
- **Surface Coordinates:** It must find the geometric center of the available surface area.
- **Player FOV Constraint:** It must wrap (using `maxWidth`) to ensure it never bleeds out of the player's active viewport, even if the surface is large.
- **Alignment:** Text content is strictly center-aligned (`textAlign="center"`).

### 3. Document Composition (Obstacle Avoidance)
Surfaces are not empty canvases. They have interactive obstacles (e.g., the Wall-mounted CRT TV, Ceiling-mounted Trap Door, Kitchen Cabinets). 
- The DS-Text system must treat these objects as exclusionary zones (like `float: left/right` in CSS or text-wrapping in print).
- **Available Display Area = Total Surface Area - Excluded Object Areas.**
- Text will flow around or stop above/below these objects rather than rendering "through" or "under" them. 

### 4. The "Sliding Dismissal" Mechanic
When a new message is queued, the old message does not simply fade out. It physically slides along the surface it is attached to, wraps around the nearest 90-degree corner, and slides *down* or *away* out of view as it fades into the darkness.
- *Example (Ceiling):* Text slides backwards, hits the corner connecting the ceiling and wall, rotates 90 degrees to lay flat on the wall, and slides down into the shadows.

## Technical Implementation Plan
- Create a `SurrealOrchestrator` that calculates Raycasts from the camera to determine the current dominant surface.
- Surface components will register "exclusion bounding boxes" (e.g., the TV registers a 2x2 meter exclusion zone on the West wall).
- The text layout engine dynamically calculates `maxWidth` and `position` based on the surface normal and exclusion zones.