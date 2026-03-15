# Basement Room Architecture & Intro Sequence

## Scale & Dimensions
- **Standard Scale:** 1 Unit = 1 Meter
- **Player Height:** ~1.9 meters (6'4")
- **Room Height:** 3.0 meters (~10 feet)
- **Countertop Height:** 1.5 meters (~5 feet)
- **Room Width (X):** 6 meters (-3 to +3)
- **Room Depth (Z):** 8 meters (-4 to +4)

## Coordinates (Compass / Corners)
*Center of room is (0, 0, 0). Floor is Y=0.*
- **Near-Right (Start / Mattress):** X: 2.0, Z: 3.0
- **Near-Left:** X: -2.0, Z: 3.0
- **Far-Right:** X: 2.0, Z: -3.0
- **Far-Left:** X: -2.0, Z: -3.0
- **Middle-Left (TV / Mr. Sausage):** X: -3.0, Z: 0.0

## Intro Camera Sequence ("Waking Up")
The player starts in the Near-Right corner on a mattress (Y=0.5).

1. **Blinking (0.0s - 3.0s)**
   - Start completely black.
   - Camera positioned at `(2.0, 0.5, 3.0)`, pitched 90 degrees straight up at the ceiling.
   - Fade from black to clear, back to black, back to clear (simulating heavy eyelids).
2. **Groggily Looking Around (3.0s - 6.0s)**
   - Pan camera rotation from ceiling -> Near-Left corner -> ceiling -> Near-Right corner.
3. **Sitting Up (6.0s - 8.0s)**
   - Smooth FOV change and position shift.
   - Y moves from `0.5` to `1.0`.
   - Rotation pans to look across the room towards Far-Right.
4. **Standing Up & Shakiness (8.0s - 12.0s)**
   - Y moves from `1.0` to `1.9`.
   - Camera quickly looks down at the mattress, then darts around wildly (simulating panic/disorientation) with added noise/shake.
5. **Walking to Position (12.0s - 15.0s)**
   - Move from Near-Right `(2.0, 1.9, 3.0)` to Middle-Right `(2.0, 1.9, 0.0)`.
   - Slowly pivot camera to face Middle-Left `(-3.0, 1.9, 0.0)` where the CRT TV will be.

## Materials & Textures
Using AmbientCG textures mapped to the room structure:
- **Floor:** `tile_floor_*`
- **Walls:** `tile_wall_*` with `grime_base_*` layered or decals.
- **Ceiling:** `concrete_*`
