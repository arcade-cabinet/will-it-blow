<!--
title: Complete Asset Inventory — Pending Integration + Library Audit
domain: plan
status: on-hold
engine: r3f
last-verified: 2026-03-10
depends-on: [asset-pipeline, scene-architect]
agent-context: asset-pipeline, scene-architect
summary: Full inventory of all available assets for horror kitchen reskin — models, sounds, textures, mega packs
-->

# Asset Inventory — Will It Blow? Horror Kitchen Reskin

**Date:** 2026-03-10
**Status:** ON HOLD — pending playability architecture review

---

## 1. Pending Integration Directory

Location: `pending-integration/` (project root, untracked)

### GLB Models

| File | Size | Objects | Description |
|------|------|---------|-------------|
| **Misc.glb** | 4.1 MB | 57 nodes | PSX mega pack — see Section 1a |
| **Traps.glb** | 1.1 MB | 21 nodes | Spike/blade/guillotine variants — see Section 1b |
| **Flesh.glb** | 59 KB | 2 nodes | Gore decorations (Flesh_1, Flesh_2) |
| **Chainsaw.glb** | 55 KB | 1 node | Chainsaw weapon model |
| **Cleaver.glb** | 26 KB | 1 node | Meat cleaver (Meatcleaver) |
| **Machete.glb** | 47 KB | 1 node | Machete weapon model |

### Blender Project

| File | Size | Objects | Description |
|------|------|---------|-------------|
| **LowPoly_Kitchen_Interior.blend** | 3.0 MB | 93 objects | Complete low-poly kitchen scene |

#### LowPoly_Kitchen_Interior.blend Object List

**Structural (6):** Floor_1, Floor_1.001, Floor_2, Floor_2.001, Wall_1, Wall_1.001

**Furniture — Counter Units (6):** Unit_1, Unit_2, Unit_3, Unit_Corner, Unit_Sink_1, Unit_Sink_2

**Furniture — Cabinets (7):** Cabinet_1, Cabinet2, Cabinet_3, Cabinet_Corner, Cabinet_Hood, Cabinet_Small, Holder

**Furniture — Major Appliances (3):** Fridge, Stove, Table

**Furniture — Seating (3):** Chair_1, Chair_2, Chair_3

**Appliances — Small (7):** Appliance-Microwave_1-4, Appliance_Blender_1-3, Appliance_Electric_Kettle, Appliance_Toaster

**Dishes — Bowls (12):** Bowl_{Big,Medium,Small}_{Beige,Red,White,Yellow}

**Dishes — Cups (12):** Cup_{Big,Medium,Small}_{Beige,Red,White,Yellow}

**Dishes — Plates (6):** Plate_{Big,Medium,Small}_{Beige,White}

**Dishes — Cookware (5):** Dishes_Pan, Dishes_Plate_Lid (x2), Dishes_Pot, Dishes_Pot_Lid

**Cutlery (18):** Cutlery_Cleaver_{Green,Red,Yellow}, Cutlery_Fork, Cutlery_Knife_{Big,Medium,Small}_{Green,Red,Yellow}, Cutlery_Ladle_{Big,Small}, Cutlery_Spoon

**Other (8):** Bottle_1, Bottle_2, Cutting_Board (x2), Glass_Big, Glass_Small, Knife_Holder, Roller

### ZIP Archives

#### Kitchen Sound Effects.zip (27 MB → 50.8 MB uncompressed)
**147 WAV files** (duplicate ZIP exists as "Kitchen Sound Effects (1).zip"):

| Category | Count | Files |
|----------|-------|-------|
| Chop | 36 | Chop_1 through Chop_36 |
| Sizzle | 24+ | Sizzle_1-24, plus loop variants |
| Peel | 23 | Peel_1 through Peel_23 |
| Pour | 11 | Pour_1 through Pour_11 |
| Mix | ~11 | Dry and wet variants |
| Pots/Pans | 13 | Clanging/impact sounds |
| Boiling | 5 | Water boiling variants |
| Sizzle Loops | 2 | Long-form ambient loops |

#### KitchenTools.zip (55 MB → 57.5 MB uncompressed)
**7 FBX models** with full PBR textures (BaseColor + Normal + ORM):

- MOD_PotatoMesher
- MOD_RollingPin
- MOD_Skimmer
- MOD_WoodenPlate
- MOD_WoodSpatula
- MOD_Spoon
- MOD_Fork
- MOD_SovietPot

**Note:** FBX format — needs Blender conversion to GLB for web deployment.

#### kitchen.zip (76 MB → 79.6 MB uncompressed)
- `kitchen.blend` (20.7 MB) — Another Blender kitchen scene
- `kitchen.png`, `kitchen1.png` (~9 MB each) — Reference images/UV maps
- PBR textures: Denim, Red Leather, Wood023, Wood027, WoodFloor064
- Mix of PNG and EXR (high-quality PBR)

---

## 1a. Misc.glb — 57-Object Mega Pack (Node Extraction Map)

All objects have embedded textures. Use hybrid extraction per `HYBRID_PROCEDURAL_CC0.md`.

### Horror/Tool Props (14)
| Node Name | Description | Use Case |
|-----------|-------------|----------|
| Saw | Hand saw | Horror prop, wall mount |
| Crowbar | Crowbar | Horror prop, weapon |
| Drill | Power drill | Horror prop |
| Plier | Pliers | Horror prop |
| Wrench | Wrench | Horror prop |
| Screwdriver | Screwdriver | Horror prop |
| Toolbox | Toolbox | Scene dressing |
| Pickaxe | Pickaxe | Horror prop |
| Shovel_1 | Shovel variant 1 | Horror prop |
| Shovel_2 | Shovel variant 2 | Horror prop |
| Nail | Nail | Detail prop |
| Brick | Brick | Scene dressing |
| Blunt | Blunt weapon | Horror prop, weapon |
| Torch_4 | Torch (box style) | Lighting prop |

### Kitchen/Food Items (12)
| Node Name | Description | Use Case |
|-----------|-------------|----------|
| Pot | Cooking pot | Kitchen counter |
| Pan | Frying pan | Kitchen counter |
| Gas_Stove | Gas stove | Could replace procedural stove |
| Hotdog | Hotdog | Food prop |
| Burger | Burger | Food prop |
| Pizza | Full pizza | Food prop |
| Pizza_Slice | Pizza slice | Food prop |
| Donut | Donut | Food prop |
| Lasagna | Lasagna | Food prop |
| Lasagna_Tray | Lasagna tray | Kitchen prop |
| Bottle_1 | Bottle | Kitchen counter |
| Cube (PizzaBox) | Pizza box | Scene dressing |

### Atmospheric/Story Props (18)
| Node Name | Description | Use Case |
|-----------|-------------|----------|
| Radio | Radio | Atmosphere |
| Radio.001 | Radio variant 2 | Atmosphere |
| PS1 | PlayStation 1 console | Atmosphere (PSX theme!) |
| Camera | Camera | Story prop |
| Polaroid | Polaroid photo | Story prop |
| Phone_1 | Phone variant 1 | Story prop |
| Phone_2 | Phone variant 2 | Story prop |
| Poster_Missing | Missing person poster | Horror atmosphere |
| Cigarette_Pack | Cigarettes | Scene dressing |
| Zippo | Zippo lighter | Scene dressing |
| Meds | Medicine bottles | Scene dressing |
| Battery | Battery | Utility prop |
| Toilet_Paper | Toilet paper | Scene dressing |
| Pen | Pen | Scene dressing |
| CD | CD disc | Atmosphere |
| Harddrive | Hard drive | Atmosphere |

### Utility/Interactive (13)
| Node Name | Description | Use Case |
|-----------|-------------|----------|
| Key_1 | Key variant 1 | Hidden object |
| Key_2 | Key variant 2 | Hidden object |
| Key_3 | Key variant 3 | Hidden object |
| Lock_1 | Lock variant 1 | Hidden object |
| Lock_2 | Lock variant 2 | Hidden object |
| Money | Cash bills | Reward/story |
| Money_Case | Money briefcase | Reward/story |
| Case | Carrying case | Prop |
| Guitar | Guitar | Atmosphere |
| Cylinder (Torch_1) | Flashlight | Utility |
| Torch_2 | Flashlight variant | Utility |
| Torch_3 | Flashlight variant | Utility |
| Gas_V1/V2/V3 | Gas canisters (3 sizes) | Hazard prop |

---

## 1b. Traps.glb — 21 Trap Variants (Node Extraction Map)

| Node Name | Description |
|-----------|-------------|
| Base | Trap base platform |
| Blade_Guillotine | Guillotine blade (vertical drop) |
| Blades_Rotating | Rotating blade assembly |
| Lever / Lever.001 | Activation levers (2 variants) |
| Leverbase_Variant_1 | Lever mount base |
| Log_Spiked_Variant1/2/3 | Spiked log traps (3 variants) |
| Spike_Variant_1/2/3 | Individual spikes (3 variants) |
| Spikes_1/2/3 | Spike clusters (3 variants) |
| Spikes_Variant1 | Spike cluster variant |
| Spinningblade_Variant_1/2 | Spinning blade traps (2 variants) |
| Stone_Ball_Spiked | Spiked ball trap |
| Trap_SpinningBlade_Upgraded_Variant_1/2 | Enhanced spinning blades (2 variants) |

---

## 2. PSX Horror Asset Library (/Volumes/home/assets/3DPSX/)

~750+ GLBs, ~110 MB total. Must be mounted at `/Volumes/home`.

### Kitchen Props (48 files, 5.5 MB)
Path: `/Volumes/home/assets/3DPSX/Props/Kitchen/`

Complete kitchen equipment: fridges, knives, cookware, dishes, food items, containers, furniture.

### Weapons (31 files, 1.2 MB)
Path: `/Volumes/home/assets/3DPSX/Props/Weapons/`

Axes, chainsaws, cleavers, knives, guns, swords — all PSX style.

### Traps (20 files, 600 KB)
Path: Various within 3DPSX

Spikes, rotating blades, guillotines, spiked logs.

### Farm Props (90 files, 7.5 MB)
Path: `/Volumes/home/assets/3DPSX/Props/Farm/`

Food crops, processing tools, barrels, baskets, campfires, fences.

### Fantasy/Dungeon (15 files, 2 MB)
Skeleton props, bones, dungeon containers, weapons.

### PSX Mega Pack II v1.8 (549 files, 90 MB)
Path: `/Volumes/home/assets/3DPSX/PSX Mega Pack II v1.8/`

Massive survival/industrial pack: machinery, pipes, distillery equipment, tanks, shipping containers, lighting, doors, barricades.

Key items for horror kitchen:
- `distillery_mx_1.glb` — industrial processing machine
- `pipes_hr_1.glb` + variants — modular pipe system
- `gas_cylinder_mx_1.glb` (506K) — pressure/cooking element
- `melee_fish_skewer_mx_1.glb` (526K) — thematic food weapon
- `rolling_pin_mx_1.glb` (343K) — kitchen tool

---

## 3. LowPoly Kitchen Library (/Volumes/home/assets/3DLowPoly/)

### Dedicated Kitchen Collection (179 GLBs, ~1.85 MB)
Path: `/Volumes/home/assets/3DLowPoly/Environment/City/kitchen/models/`

**Food (51 GLBs):** sausage_raw/cooked, bacon variants (uncooked/cooked/burned), burgerpatty variants, steak/steak_burned, egg variants (whole/white/fried/burned), vegetables (carrot, broccoli, lettuce, tomato, pepper, mushroom, eggplant, pumpkin), processed foods (burger, hotdog, corndog, cake, donut, pizza, soda)

**Furniture (48 GLBs):** kitchen_fridge, kitchen_oven/large, kitchen_sink, washing_machine, kitchen_cabinet1/2, drawers (1/2/3), shelves, chairs/barchairs/stools, tables, doors, workplans

**Utensils & Cookware (48 GLBs):** cookingpot variants, fryingpan, fork/knife/spoon, plates, jars, bottles, glasses, rolling pin, potato mesher, skimmer, spatula, whisk, cheese slicer, strainers, faucet

**Props (32 GLBs):** Horror items (worm, blobfish, piranha, anglerfish, beartrap), matches, bandages, knife, trashcan, shovel, lamps

### Kenney Food Kit (200+ GLBs, ~4 MB)
Path: `/Volumes/home/assets/3DLowPoly/Props/Food/Food Kit/`

Comprehensive culinary collection including cooking utensils (knife, fork, spatula, spoon, cutting boards, mortar/pestle).

### Quaternius Ultimate Food Pack (100+ GLBs, ~3 MB)
Path: `/Volumes/home/assets/3DLowPoly/Props/Food/Ultimate Food Pack/`

PBR-textured food variants with cook states.

---

## 4. 2D Photorealistic PBR Textures (/Volumes/home/assets/2DPhotorealistic/)

All from AmbientCG — CC0 licensed. Must be mounted at `/Volumes/home`.

### Material Library (1,945 PBR sets)
Path: `/Volumes/home/assets/2DPhotorealistic/MATERIAL/1K-JPG/`

Each set includes: Color, NormalGL, NormalDX, Roughness, Displacement. Metals add Metalness. Rust/decay add AO.

#### Horror Kitchen Priority Materials

| Category | Count | Horror Rating | Use |
|----------|-------|---------------|-----|
| **Rust** | 10 | CRITICAL | Corroded appliances, pipes |
| **Concrete** | 61 | CRITICAL | Grimy walls, floor |
| **Metal** | 100 | HIGH | Appliances, industrial surfaces |
| **Tiles** | 158 | HIGH | Floors, walls (worn/cracked) |
| **MetalPlates** | 17 | HIGH | Industrial kitchen equipment |
| **PaintedMetal** | 18 | HIGH | Weathered appliances |
| **CorrugatedSteel** | 8 | HIGH | Industrial walls/siding |
| **Bricks** | 114 | MEDIUM | Old kitchen walls |
| **Wood** | 100 | MEDIUM | Rotting counters/shelves |
| **Leather** | 50 | MEDIUM | Organic stain effect |
| **Asphalt** | 45 | MEDIUM | Industrial grime |
| **PaintedPlaster** | 18 | MEDIUM | Peeling/crumbling walls |
| **SurfaceImperfections** | 20 | MEDIUM | Scratch/damage overlays |
| **Moss** | 4 | LOW | Damp/decay accents |

### Decal Library (48 sets)
Path: `/Volumes/home/assets/2DPhotorealistic/DECAL/1K-JPG/`

**CRITICAL — Leaking Series (15 variants):**
- Leaking001-009 (9 variants)
- Leaking010A/B/C (3 sub-variants)
- Leaking011A/B/C (3 sub-variants)
- Each includes: Color, NormalGL/DX, Opacity (alpha), Roughness, Displacement
- Perfect for blood drips, stains, humidity marks

Other decals: AsphaltDamage001, Door001/002, ChewingGum001/002

### HDRI Environment Library (382 environments)
Path: `/Volumes/home/assets/2DPhotorealistic/HDRI/1K/`

Key categories for horror kitchen:
- NightEnvironmentHDRI — Dark, moody
- IndoorEnvironmentHDRI — Kitchen-style lighting
- EveningEnvironmentHDRI — Amber/shadow tones

Each includes: .exr (HDR) + _TONEMAPPED.jpg (LDR fallback)

---

## 5. Hybrid Extraction Approach

Per `/Volumes/home/assets/HYBRID_PROCEDURAL_CC0.md`:

1. Load mega pack GLB once via `useGLTF`
2. Access `nodes` object — each named mesh is extractable
3. Render individual meshes via `<mesh geometry={nodes.Name.geometry} material={materials.Name_Material} />`
4. Or clone sub-trees: `nodes.Name.clone()` → `<primitive object={cloned} />`
5. Deterministic selection via seed: `variants[seed % variants.length]`

Benefits: One HTTP request, cached geometry, high-fidelity CC0 assets.

---

## 6. Conversion Pipeline Notes

### FBX → GLB (KitchenTools.zip)
```bash
BLENDER=/opt/homebrew/bin/blender
SCRIPTS=/Volumes/home/assets/scripts
bash $SCRIPTS/batch_convert_fbx.sh <pack_dir> --recursive
```

### GLB Optimization
```bash
gltf-transform optimize input.glb output.glb    # Direct CLI, not npx
gltf-transform inspect model.glb                 # Inspect structure
```

### Blender MCP for Reskinning
Available tools: `execute_blender_code`, `get_scene_info`, `get_object_info`, `set_texture`, `get_viewport_screenshot`

**CAUTION:** Do NOT use `bpy.ops.wm.open_mainfile()` — it crashes the MCP addon. Import models instead:
```python
bpy.ops.import_scene.gltf(filepath="path.glb")   # GLB import
bpy.ops.import_scene.fbx(filepath="path.fbx")     # FBX import
```

---

## Status

**ON HOLD** — All assets cataloged. Pending fundamental playability architecture review before integration work begins. The core question: how does the scene need to be restructured for mobile-first gameplay?
