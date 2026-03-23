# REMNANT — Technical Architecture

## Overview
REMNANT uses a systems-based architecture where the GameScene acts as the orchestrator and each game system is a standalone class responsible for one domain. Systems communicate through a shared game state object and an event bus.

## Core Architecture Pattern

```
GameScene (Phaser Scene)
  ├── Creates and owns all Systems
  ├── Calls system.update(dt) each frame
  ├── Manages Phaser tilemap and camera
  └── Delegates input to appropriate systems

Systems (standalone classes)
  ├── Receive gameState reference on construction
  ├── Have update(dt) method called each frame
  ├── Emit events through shared EventEmitter
  └── Never directly reference other systems (communicate via state + events)

UIScene (parallel Phaser Scene)
  ├── Listens to events from game systems
  ├── Renders all HUD elements
  ├── Handles UI-specific input (inventory drag/drop, menu clicks)
  └── Never modifies game state directly (sends events back)
```

## Game State Object
Central serializable state. All systems read/write to this. This is what gets saved/loaded.

```javascript
const gameState = {
  // Player
  player: {
    x: 0, y: 0,
    direction: 'S',       // N, NE, E, SE, S, SW, W, NW
    moving: false,
    sneaking: false,
    sprinting: false,
  },

  // Survival stats (0-100)
  stats: {
    health: 100,
    hunger: 100,
    thirst: 100,
    fatigue: 100,         // 100 = fully rested
    temperature: 70,      // target varies by environment
    stress: 0,
  },

  // Conditions (active debuffs/buffs)
  conditions: [],         // ['bleeding', 'wet', 'well_fed', etc.]

  // Skills
  skills: {
    foraging:   { level: 0, xp: 0 },
    cooking:    { level: 0, xp: 0 },
    carpentry:  { level: 0, xp: 0 },
    fitness:    { level: 0, xp: 0 },
    strength:   { level: 0, xp: 0 },
    tracking:   { level: 0, xp: 0 },
    firstAid:   { level: 0, xp: 0 },
    stealth:    { level: 0, xp: 0 },
    tailoring:  { level: 0, xp: 0 },
  },

  // Inventory
  inventory: {
    slots: [],            // Array of { itemId, quantity, condition }
    maxSlots: 20,         // Increased by backpack
    weightCapacity: 15000,// grams, increased by fitness/bags
    equipped: {           // Currently worn/held items
      head: null,
      torso: null,
      legs: null,
      feet: null,
      hands: null,
      back: null,         // Backpack slot
      mainHand: null,
      offHand: null,
    },
    hotbar: [null, null, null, null, null, null],
  },

  // Time
  time: {
    day: 1,
    hour: 6,              // 0-23.99 float
    season: 'summer',     // spring, summer, autumn, winter
    dayOfSeason: 1,       // 1-30 per season
  },

  // Weather
  weather: {
    current: 'clear',     // clear, overcast, rain, heavy_rain, fog, wind, storm, snow
    temperature: 65,      // Fahrenheit ambient
    windSpeed: 5,         // mph
    nextChange: 120,      // seconds until weather change
  },

  // World modifications (player changes to world)
  worldMods: {
    harvestedTiles: [],   // [{x, y, type, timestamp}]
    placedStructures: [], // [{x, y, type, hp, rotation, data}]
    openedContainers: [], // [{id, remainingItems}]
    movedItems: [],       // Items dropped in world
  },

  // Animals (active in loaded chunks)
  animals: [],            // [{type, x, y, hp, state, stateData}]

  // Mystery layer
  mystery: {
    eventsTriggered: 0,
    lastEventTime: 0,
    tier: 0,
    structures: [],       // Placed mystery structures
  },

  // Meta
  totalPlayTime: 0,       // Seconds
  timestamp: null,        // Last save time
};
```

## Tilemap Architecture

### Tile Layers (bottom to top)
1. **Ground** — grass, dirt, sand, stone, water
2. **Floor** — wood floor, tile floor, concrete (inside buildings)
3. **Objects** — furniture, containers, props
4. **Walls** — building walls, fences
5. **Roof** — building roofs (hidden when player enters)
6. **Overlay** — weather effects, lighting

### Tile Size
- 64x32 pixel isometric tiles (standard isometric ratio)
- World grid: each cell is one tile
- Chunk size: 32x32 tiles
- Active chunks: 3x3 around player (loaded/unloaded as player moves)

### World Generation Pipeline
1. Generate heightmap using simplex noise
2. Assign biomes based on elevation + moisture noise
3. Place road network (connect settlement nodes)
4. Generate building footprints at settlement nodes
5. Fill buildings with rooms and loot containers
6. Scatter trees, rocks, bushes by biome rules
7. Place animal spawn points by biome
8. Store chunk data for save/load

## Rendering Pipeline

### Isometric Projection
```javascript
// World (grid) to screen
screenX = (gridX - gridY) * TILE_WIDTH_HALF
screenY = (gridX + gridY) * TILE_HEIGHT_HALF

// Screen to world (for mouse picking)
gridX = (screenX / TILE_WIDTH_HALF + screenY / TILE_HEIGHT_HALF) / 2
gridY = (screenY / TILE_HEIGHT_HALF - screenX / TILE_WIDTH_HALF) / 2
```

### Depth Sorting
Isometric requires proper depth sorting so objects in front render over objects behind.
- Sort by gridY primarily (higher Y = rendered later = on top)
- Secondary sort by gridX
- Entities (player, animals) sorted dynamically each frame
- Use Phaser's depth system: `sprite.setDepth(gridY * 1000 + gridX)`

### Camera
- Phaser camera follows player with smooth lerp
- Zoom: 0.5x to 2x
- Camera bounds match world bounds
- Smooth pan with dead zone around player

## AI Architecture (Animals)

### State Machine
Each animal runs a finite state machine updated each frame.

```
┌──────┐   detect player   ┌───────┐
│ IDLE │ ────────────────→  │ ALERT │
└──┬───┘                    └───┬───┘
   │ timer                      │
   ▼                            │ (prey)──→ FLEE
┌────────┐                      │ (predator, not aggressive) → WATCH
│ WANDER │                      │ (predator, aggressive) → STALK/APPROACH
└────────┘                      │ (territorial) → WARN
                                ▼
                          ┌──────────┐
                          │  ACTION  │ → ATTACK / RETREAT / FLEE
                          └──────────┘
```

### Pathfinding
- A* on tile grid
- Animals path around obstacles (trees, buildings, water)
- Recalculate path every 0.5 seconds (not every frame)
- Pack animals share target, approach from different angles

## Event Bus
Systems communicate through a simple EventEmitter pattern.

```javascript
// System emits
this.events.emit('player:damaged', { amount: 15, source: 'wolf_bite' });

// Other system listens
this.events.on('player:damaged', (data) => {
  this.addCondition('bleeding');
  this.gameState.stats.health -= data.amount;
});

// UI listens
this.events.on('player:damaged', (data) => {
  this.flashScreen('red');
  this.showNotification(`Hit by ${data.source}!`);
});
```

### Key Events
- `player:damaged`, `player:healed`
- `player:ate`, `player:drank`
- `stat:changed` (any stat update)
- `condition:added`, `condition:removed`
- `skill:xp` (skill gained XP)
- `skill:levelup`
- `item:added`, `item:removed`, `item:used`
- `craft:complete`
- `build:placed`, `build:destroyed`
- `animal:killed`, `animal:fled`
- `time:hourChanged`, `time:dayChanged`, `time:seasonChanged`
- `weather:changed`
- `mystery:event`
- `game:saved`, `game:loaded`

## Performance Considerations
- Only update animals in loaded chunks (3x3 around player)
- Tile rendering uses Phaser's built-in culling (only visible tiles)
- Weather particles limited to viewport area
- A* pathfinding throttled (max 5 paths calculated per frame)
- World gen runs during loading screen, not during gameplay
- Save/load is async, doesn't block game loop

## File Size Targets
- No single source file over 400 lines
- Split large systems into sub-modules if needed
- Config files (items, recipes) can be longer since they're data
- Total JS bundle target: under 500KB minified (Phaser is ~1MB separate)

---

*Update this document as architecture decisions are made or changed.*
