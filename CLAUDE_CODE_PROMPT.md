# REMNANT — Claude Code Build Directive

## STEP 0: PROJECT EXTRACTION AND ENVIRONMENT SETUP

There is a zip file at `C:\Users\chris\Documents\REMNANT\REMNANT_project.zip`. Execute the following:

```
cd C:\Users\chris\Documents\REMNANT
```

Extract the zip. It contains a nested `remnant/` subfolder. Flatten the structure: move ALL contents from inside `remnant/` directly into `C:\Users\chris\Documents\REMNANT\` so that `package.json`, `CLAUDE.md`, `server.js`, `src/`, `docs/`, `public/` are at the root. Delete the empty `remnant/` subfolder and the zip when done.

Verify this structure exists:

```
C:\Users\chris\Documents\REMNANT\
├── CLAUDE.md
├── package.json
├── vite.config.js
├── server.js
├── index.html
├── .gitignore
├── SETUP.bat
├── PLAY.bat
├── BUILD.bat
├── docs/
│   ├── GAME_DESIGN.md
│   ├── ARCHITECTURE.md
│   └── TASKS.md
├── src/
│   ├── main.js
│   ├── config/
│   │   ├── constants.js
│   │   ├── items.js
│   │   ├── recipes.js
│   │   ├── animals.js
│   │   └── buildings.js
│   ├── scenes/
│   │   ├── BootScene.js
│   │   ├── MenuScene.js
│   │   ├── GameScene.js
│   │   └── UIScene.js
│   ├── systems/        (empty, you build these)
│   ├── entities/       (empty, you build these)
│   ├── ui/             (empty, you build these)
│   ├── world/          (empty, you build these)
│   └── utils/
│       ├── noise.js
│       ├── pathfinding.js
│       ├── math.js
│       ├── save.js
│       └── state.js
├── public/
│   └── assets/
│       ├── tiles/
│       ├── sprites/
│       ├── ui/
│       └── audio/
└── server.js
```

Then run:

```
npm install
npx vite build
```

Confirm zero errors before proceeding. If vite build fails, diagnose and fix. Do not proceed until the build is clean.

---

## STEP 1: READ ALL CONTEXT FILES

Before writing a single line of code, read these files in this order and internalize the full architecture:

1. `CLAUDE.md` — master project context (tech stack, patterns, decisions, standards)
2. `docs/GAME_DESIGN.md` — complete GDD (core loop, stats, wildlife, items, crafting, buildings, weather, mystery layer, UI layout, controls)
3. `docs/ARCHITECTURE.md` — technical architecture (game state schema, tilemap layers, isometric projection math, depth sorting, AI state machines, event bus patterns, performance constraints)
4. `docs/TASKS.md` — phased build plan with task dependencies

Then read all existing source files to understand what is built:

5. `src/config/constants.js` — tile dimensions, world params, survival rates, combat values, depth layers, biome types, direction vectors
6. `src/config/items.js` — 100+ item definitions with weight, stacking, durability, effects, actions, clothing slots, tool power, damage
7. `src/config/recipes.js` — 40+ recipes with station requirements, skill gates, tool requirements, output quantities
8. `src/config/animals.js` — 8 animal types with HP, speed, detection ranges, aggro behavior, drops, pack sizes, biome affinity, damage, sound hooks
9. `src/config/buildings.js` — 8 building templates with room layouts, door positions, container types; container loot table mappings; 20+ weighted loot pools
10. `src/scenes/BootScene.js` — programmatic tileset generation (isometric diamond tiles, player sprite, animal sprites)
11. `src/scenes/MenuScene.js` — main menu with new game, continue, controls
12. `src/scenes/GameScene.js` — orchestrator stub with input bindings, system hooks, auto save timer
13. `src/scenes/UIScene.js` — HUD overlay stub with notification system, event listeners
14. `src/utils/noise.js` — seeded SimplexNoise class, fbm(), ridgedNoise(), normalizedNoise()
15. `src/utils/pathfinding.js` — A* with binary heap, directPath(), tileDistance()
16. `src/utils/math.js` — gridToScreen(), screenToGrid(), isoDepth(), seededRandom(), weightedRandom(), formatTime(), formatWeight(), angleToDirection()
17. `src/utils/state.js` — createDefaultGameState() factory with full schema, starting inventory
18. `src/utils/save.js` — saveGame(), loadGame(), listSaves() with server + localStorage fallback
19. `server.js` — Express with POST /api/save, GET /api/load/:slot, GET /api/saves

---

## STEP 2: BUILD PHASE 1 — SEQUENTIALLY, FULLY, PRODUCTION QUALITY

Work through `docs/TASKS.md` Phase 1, tasks 1.3 through 1.13. Tasks 1.1 (Phaser boot) and 1.2 (programmatic tileset) are complete. Build each task fully before moving to the next. After completing each task, mark it done in `TASKS.md` with `[x]`.

Run `npx vite build` after each task to confirm zero errors.

### TASK 1.3 — Isometric World Rendering
Create `src/world/TileMap.js` and `src/systems/WorldGen.js`.

**WorldGen requirements:**
- Use seeded SimplexNoise from `src/utils/noise.js` with `gameState.worldSeed`
- Generate a 128x128 tile world (expandable later via chunk loading)
- Biome assignment: use two noise layers — elevation (fbm, scale 0.02, 5 octaves) and moisture (fbm, scale 0.015, 3 octaves, offset +500)
- Biome thresholds from elevation+moisture:
  - elevation < -0.2: WATER
  - elevation > 0.5: MOUNTAIN
  - elevation 0.2 to 0.5 + moisture > 0.5: DENSE_FOREST
  - elevation 0.0 to 0.5 + moisture 0.2 to 0.5: FOREST
  - elevation 0.0 to 0.3 + moisture < 0.2: MEADOW
  - River channels: where abs(fbm(x*0.003, z*0.003+100, 2)) < 0.04, force WATER
- Store as 2D array of tile type strings matching BootScene texture keys (tile_grass, tile_dirt, tile_stone, tile_water, etc.)
- Scatter props per biome: trees (tile_grass/forest), rocks (tile_stone/mountain), bushes (meadow/forest) — store as separate array of {gridX, gridY, type, hp, maxHp}

**TileMap rendering requirements:**
- Render isometric tiles using Phaser sprites, NOT Phaser.Tilemaps (those do not support true isometric well)
- For each visible tile, create a Phaser.GameObjects.Image positioned at gridToScreen(x, y)
- CRITICAL: Depth sort every frame using `sprite.setDepth(gridY * 100 + gridX)` per the DEPTH constants
- Only render tiles within camera viewport + 2 tile buffer (frustum culling). On camera move, add/remove tile sprites.
- Use an object pool to reuse sprites instead of creating/destroying every frame
- Props (trees, rocks, bushes) rendered as sprites on top of ground tiles at higher depth

**Integration:**
- Instantiate WorldGen in GameScene.create(), store tile data on gameState
- Instantiate TileMap in GameScene.create(), pass it the tile data
- Call tilemap.update() each frame to handle viewport culling

### TASK 1.4 — Player Entity
Create `src/systems/PlayerSystem.js`.

**Requirements:**
- Create Phaser sprite using `player` texture from BootScene
- Position at gridToScreen(gameState.player.gridX, gameState.player.gridY)
- 8 directional movement using WASD (read from GameScene.wasd keys)
- Movement is tile based but smooth: lerp between tile positions at PLAYER.WALK_SPEED
- Sprint: hold Shift = PLAYER.SPRINT_SPEED, drains fatigue
- Sneak: hold Ctrl = PLAYER.SNEAK_SPEED
- Update gameState.player.x, y, gridX, gridY, direction, moving, sneaking, sprinting
- Depth sort: player sprite depth = DEPTH.ENTITIES + gridY * 10 + gridX
- Camera follows player: `scene.cameras.main.startFollow(playerSprite, true, 0.08, 0.08)`
- Collision: cannot walk on WATER or MOUNTAIN tiles (check tile type before moving)
- Emit `player:moved` event with new position

### TASK 1.5 — Survival Stats System
Create `src/systems/SurvivalSystem.js`.

**Requirements:**
- update(dt) called each frame from GameScene
- Drain hunger at SURVIVAL.HUNGER_DRAIN per game hour (convert using TIME.SECONDS_PER_HOUR)
- Drain thirst at SURVIVAL.THIRST_DRAIN per game hour
- Drain fatigue at SURVIVAL.FATIGUE_DRAIN per game hour
- If hunger <= 0: drain health at SURVIVAL.STARVE_DAMAGE per hour
- If thirst <= 0: drain health at SURVIVAL.DEHYDRATE_DAMAGE per hour
- Temperature calculation: base from weather.temperature, modified by time of day (+10 midday, -15 night), weather penalties (WEATHER constants), clothing warmth sum, fire proximity (+30 within 3 tiles of campfire), shelter (+15)
- If temperature < SURVIVAL.COLD_THRESHOLD: drain health at SURVIVAL.COLD_DAMAGE per hour
- Health regen: if hunger > 80 AND thirst > 80, regen SURVIVAL.HEALTH_REGEN per hour
- Clamp all stats 0 to 100
- Emit `stat:changed` with stat name and new value on every change
- Emit `player:died` with cause string when health reaches 0

### TASK 1.6 — Time and Day/Night System
Create `src/systems/TimeSystem.js`.

**Requirements:**
- Advance gameState.time.hour by dt / TIME.SECONDS_PER_HOUR each frame
- When hour >= 24, reset to 0, increment day, increment dayOfSeason
- When dayOfSeason > TIME.DAYS_PER_SEASON, advance season (spring>summer>autumn>winter>spring), reset dayOfSeason
- Emit `time:hourChanged` each whole hour change
- Emit `time:dayChanged` on new day
- Emit `time:seasonChanged` on new season
- Lighting: modify scene ambient via camera tint or overlay
  - Dawn (5 to 7): warm orange tint, gradually brightening
  - Day (7 to 18): full brightness, no tint
  - Dusk (18 to 20): warm orange, gradually darkening
  - Night (20 to 5): dark blue overlay at 40 to 60% opacity, significantly reduced visibility
- Use a full screen semi transparent rectangle in the UIScene or GameScene overlay layer for night darkening. Alpha based on how deep into night we are.

### TASK 1.7 — Resource Gathering (Interaction System)
Create `src/systems/InteractionSystem.js`.

**Requirements:**
- Track nearest interactable object within PLAYER.INTERACT_RANGE tiles
- When E key pressed, interact with nearest object
- Tree interaction: reduce tree HP by 5 (15 with axe equipped), when HP <= 0 remove tree prop, add wood_log x2 + stick x3 to inventory, emit particle effect, earn carpentry XP
- Rock interaction: reduce rock HP by 3 (10 with pickaxe equipped), when HP <= 0 remove rock prop, add stone x3 + flint x1 (50% chance), earn strength XP
- Bush interaction: if berry bush, add berries x3; else add fiber x3. Remove bush or mark depleted. Earn foraging XP
- Water tile (player standing adjacent): add water_dirty x2
- Show interaction prompt in UIScene: "[E] Chop Tree", "[E] Mine Rock", etc. based on nearest interactable
- Emit `item:added` with item name for UI notification
- Tool check: look at gameState.inventory.equipped.mainHand

### TASK 1.8 — Inventory System
Create `src/systems/InventorySystem.js` and `src/ui/InventoryUI.js`.

**InventorySystem requirements:**
- addItem(itemId, quantity): stack into existing slots if possible, else add new slot. Respect stack limits from items.js. Return false if inventory full.
- removeItem(itemId, quantity): remove from slots, clean up empty slots. Return false if insufficient.
- countItem(itemId): total count across all slots
- hasItems(requirements): check object of {itemId: qty} — used by crafting
- getWeight(): sum of all items weight * quantity
- isOverweight(): getWeight() > inventory.weightCapacity (+ equipped backpack carryBonus)
- useItem(slotIndex): execute item action (eat/drink/heal/read) based on ITEMS[id].actions and effects. Apply stat changes. Remove 1 from stack. Emit events.
- equipItem(slotIndex, slot): move item to equipped[slot], handle swapping

**InventoryUI requirements:**
- Toggle with Tab or I key
- Full screen dark overlay (rgba 0,0,0,0.85)
- Grid layout: 4 columns x 5 rows (20 slots) matching maxSlots
- Each slot shows item icon (emoji for now), stack count bottom right, item name below
- Click item to use (eat/drink/heal)
- Right click item to open mini context menu: Use, Equip, Drop, Examine
- Equipped panel on the left showing 8 equipment slots with currently equipped items
- Weight display: "12.5 / 15.0 kg" at bottom
- Hover tooltip: item name, description, weight, condition, actions
- Close on Tab/I/Escape
- PZ style: dark panel backgrounds, thin borders, monospace font for values, Oswald for headers

### TASK 1.9 — Hotbar
Extend UIScene with hotbar rendering.

**Requirements:**
- 6 slots across bottom center of screen
- Number keys 1 through 6 select active slot (highlight with brighter border)
- Drag items from inventory to hotbar slots
- Shows item icon and stack count
- Active slot item is "equipped" — affects interaction (axe for chopping, etc.)
- Clicking hotbar slot uses that item (eat/drink if consumable)
- Auto sync: if a hotbar item's inventory count reaches 0, clear that hotbar slot
- Thin border, dark background, consistent with PZ aesthetic

### TASK 1.10 — Basic Crafting
Create `src/systems/CraftingSystem.js` and `src/ui/CraftingUI.js`.

**CraftingSystem requirements:**
- canCraft(recipe): check hasItems(recipe.inputs), check skill requirements, check station requirements (campfire nearby, workbench nearby, etc.), check toolRequired in inventory
- craft(recipe): remove inputs, add outputs, degrade tool condition if toolRequired, grant skill XP, emit `craft:complete`
- getAvailableRecipes(): return all recipes where at least some inputs are met (show locked ones grayed out)
- getNearbyStations(): check placedStructures within 3 tiles for campfire, workbench, sewing station

**CraftingUI requirements:**
- Toggle with C key
- Category tabs: Basic, Tools, Cooking, Building, Gear (from recipe.cat field)
- List of recipes in selected category
- Each recipe shows: output icon + name, required inputs with have/need counts, station requirement, skill requirement
- Craftable recipes: bright, clickable. Uncraftable: grayed out with missing requirements highlighted in red
- Click recipe to craft, show brief crafting progress (recipe.time seconds), then complete
- PZ reference: simple list layout, not grid. Clear visual hierarchy.

### TASK 1.11 — Campfire Placement
Create `src/systems/BuildingSystem.js` (basic version, expanded in Phase 4).

**Requirements:**
- When player has campfire_kit in inventory and presses B or selects it from crafting
- Enter build mode: show ghost preview at cursor position, snapped to tile grid
- Ghost preview: semi transparent campfire sprite following mouse (screenToGrid conversion)
- Click to place if valid location (not on water, not on existing structure, not inside building)
- On placement: remove campfire_kit from inventory, add structure to gameState.worldMods.placedStructures
- Render placed campfire as sprite with animated fire glow (pulsing orange PointLight or tinted sprite)
- Campfire effects: tiles within 3 tile radius get warmth bonus (detected by SurvivalSystem)
- Campfire enables cooking recipes when player is within 3 tiles (detected by CraftingSystem.getNearbyStations())
- Press B or Escape to exit build mode
- Emit `build:placed` event

### TASK 1.12 — Save/Load Integration
Wire up the save/load system fully.

**Requirements:**
- Q key triggers quickSave() (already stubbed in GameScene)
- Save serializes ENTIRE gameState including: player position, all stats, full inventory, equipped items, hotbar, time, weather, worldMods (harvested tiles, placed structures, opened containers, dropped items), skills, conditions, mystery state, totalPlayTime
- Load restores all of the above and rebuilds visual state: re render world with harvested tiles removed, re place structures, restore player position
- Auto save every 5 minutes (already timed in GameScene)
- MenuScene "Continue" button loads auto save
- Show "Game Saved" notification via UIScene on save
- Save to server first (POST /api/save), localStorage fallback
- Test: save, refresh browser, continue — everything should be exactly as left

### TASK 1.13 — Death Screen
Create death handling.

**Requirements:**
- When SurvivalSystem emits `player:died`, GameScene pauses all systems
- Show death overlay: full screen dark red tint (rgba 15,5,5,0.95)
- "YOU PERISHED" in large Oswald font, letter spacing 12px
- Cause of death below (Starvation, Dehydration, Hypothermia, Injuries, Animal Attack)
- "Survived X days" stat
- "Total play time: X hours X minutes"
- "Try Again" button returns to MenuScene
- Fade in the death screen over 1 second

---

## TECHNICAL STANDARDS (ENFORCE THESE ON EVERY FILE)

**Isometric Math (use these exact formulas everywhere):**
```javascript
// Grid to screen (from src/utils/math.js)
screenX = (gridX - gridY) * 32   // TILE.HALF_W = 32
screenY = (gridX + gridY) * 16   // TILE.HALF_H = 16

// Screen to grid
gridX = Math.floor((screenX / 32 + screenY / 16) / 2)
gridY = Math.floor((screenY / 16 - screenX / 32) / 2)

// Depth sorting
depth = DEPTH.ENTITIES + gridY * 10 + gridX
```

**System Pattern (follow this for every system):**
```javascript
export default class ExampleSystem {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.events;  // Shared event bus
  }
  
  update(dt) {
    // Called every frame. dt is seconds.
  }
  
  destroy() {
    // Cleanup
  }
}
```

**GameScene Integration (how systems get wired in GameScene.js):**
```javascript
// In GameScene.create():
this.worldGen = new WorldGen(this, this.gameState);
this.tileMap = new TileMap(this, this.gameState, this.worldGen);
this.playerSystem = new PlayerSystem(this, this.gameState);
this.survivalSystem = new SurvivalSystem(this, this.gameState);
this.timeSystem = new TimeSystem(this, this.gameState);
this.interactionSystem = new InteractionSystem(this, this.gameState);
this.inventorySystem = new InventorySystem(this, this.gameState);
this.craftingSystem = new CraftingSystem(this, this.gameState);
this.buildingSystem = new BuildingSystem(this, this.gameState);

// In GameScene.update(time, delta):
const dt = delta / 1000;
this.timeSystem.update(dt);
this.playerSystem.update(dt);
this.survivalSystem.update(dt);
this.interactionSystem.update(dt);
this.tileMap.update();
this.buildingSystem.update(dt);
this.gameState.totalPlayTime += dt;
```

**Event Bus Pattern:**
```javascript
// Emit from any system:
this.events.emit('item:added', { itemId: 'wood_log', name: 'Wood Log', quantity: 2 });

// Listen from UIScene or other systems:
this.gameEvents.on('item:added', (data) => this.showNotification(`+${data.quantity} ${data.name}`));
```

**UI Style Constants (PZ aesthetic, use everywhere in UI code):**
```javascript
const UI_STYLE = {
  PANEL_BG: 'rgba(10, 12, 10, 0.92)',
  PANEL_BORDER: 'rgba(255, 255, 255, 0.06)',
  FONT_HEADER: { fontFamily: 'Oswald, sans-serif', fontSize: '16px', color: 'rgba(255,255,255,0.7)', letterSpacing: 4 },
  FONT_BODY: { fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.5)' },
  FONT_MONO: { fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)' },
  FONT_VALUE: { fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.6)' },
  STAT_COLORS: {
    health:      { from: '#8b2020', to: '#cc4444' },
    hunger:      { from: '#8b6914', to: '#cc9a22' },
    thirst:      { from: '#14548b', to: '#2288cc' },
    temperature: { from: '#cc6622', to: '#ccaa22' },
    fatigue:     { from: '#2d6b2d', to: '#44aa44' },
    stress:      { from: '#6b2d6b', to: '#aa44aa' },
  },
};
```

**File Size Rule:** No file over 400 lines. Split into sub modules when needed.

**Import Style:** ES modules only. No require(). No global mutable state outside gameState.

**No Hyphens:** In ALL user facing text, notifications, UI labels, comments, and documentation: never use hyphens. Restructure the sentence or use alternative punctuation. This is a hard rule.

**Positive Framing:** In all notifications and UI text, tell the player what IS happening, not what is not. Frame everything in terms of capability and action.

---

## WHAT SUCCESS LOOKS LIKE AT PHASE 1 COMPLETE

The player launches the game in a browser. They see a clean main menu with REMNANT title. They click New Game. An isometric world generates with visible biome variety: grass tiles, forests of trees, rocky outcrops, water bodies, bushes with berries. The player character appears and moves smoothly in 8 directions with WASD. Camera follows with gentle lerp. Day/night cycle runs with visible lighting changes (warm dawn, bright day, orange dusk, dark blue night). A clock ticks in the HUD corner showing time and day count. Stat bars (health, hunger, thirst, warmth, fatigue) are visible and draining over time. The player walks to a tree, sees "[E] Chop Tree" prompt, presses E, the tree takes hits and particles fly, it falls and drops wood and sticks into inventory. They open inventory with Tab, see their items in a grid, hover for detailed tooltips, right click for PZ style context menus. They open crafting with C, see categorized recipe lists, craft a campfire kit from stones and sticks, enter build mode with B, place the campfire on the ground, stand near it for warmth. The fire glows. They cook raw meat by opening crafting near the fire. Night falls, the world darkens dramatically, temperature drops, the campfire's glow becomes the only light. They press Q to save, refresh the browser, hit Continue, and every single piece of state is restored exactly. If they ignore hunger and thirst, stats drain to zero, health follows, and a death screen fades in showing cause and survival stats.

That is the minimum bar. Every interaction should feel intentional. Every UI element should look like it belongs in Project Zomboid. Every system should function correctly under edge cases (empty inventory, zero stats, boundary tiles, rapid input).

---

## ABOUT THIS PROJECT

**REMNANT** is a top down isometric survival game created by **Christian Claudio**. Inspired by Project Zomboid's depth and polish, but replacing zombies with realistic wildlife reclamation in a post collapse Pacific Northwest setting. Wolves den in gas stations. Bears own grocery stores. Mountain lions ambush from ridgelines. Elk herds block highways. You are the trespasser in nature's world now.

There is a subtle Bigfoot mystery layer built into the game (implemented in Phase 5). This is NOT horror. This is documentary realism — think Less Than Lethal meets Missing 411. Distant wood knocks at night. Tree structures that appear between play sessions. A footprint you might not notice. The player should always be left asking "was that real?" Never a clear sighting. Never combat. Never confirmation.

**Tech Stack:** Phaser 3.80+ | Vite 5 | Express.js | Railway deployment
**Engine:** Phaser 3 with custom isometric rendering (not Phaser tilemap)
**Art:** Programmatically generated pixel art tiles and sprites (BootScene)
**Architecture:** Systems based (standalone classes orchestrated by GameScene)
**State:** Centralized serializable gameState object
**Save:** Server API + localStorage fallback
**Target:** Browser based, playable at a Railway URL

---

## AFTER PHASE 1

When all Phase 1 tasks are complete and tested, read `docs/TASKS.md` Phase 2 (Wildlife and Combat). Same approach: sequential, fully built, production quality. But Phase 1 is the foundation. Every system built here gets extended in later phases. Get it right.
