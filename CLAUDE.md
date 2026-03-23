# REMNANT — Claude Code Project Context

## What This Is
REMNANT is a top-down isometric survival game inspired by Project Zomboid's systems and quality level, but set in a post-collapse Pacific Northwest wilderness with realistic wildlife reclamation and a subtle mystery layer (Bigfoot as ambient, rare, documentary-realism phenomena — not horror, not combat).

**Creator:** Christian Claudio
**Engine:** Phaser 3 (JavaScript)
**Deployment:** Railway (Node.js + Express serving static Phaser build)
**Perspective:** Isometric top-down (PZ style)
**Art Style:** Pixel art tiles and sprites, dark naturalistic palette

## Tech Stack
- **Game Engine:** Phaser 3.80+ with isometric tile rendering
- **Language:** JavaScript (ES modules)
- **Build:** Vite for dev server and production bundling
- **Server:** Express.js (serves built game + save/load API)
- **Deployment:** Railway (auto-detect Node.js)
- **Asset Pipeline:** Tiled map editor compatible JSON tilemaps

## Project Structure
```
remnant/
├── CLAUDE.md              # This file — read first always
├── package.json
├── vite.config.js
├── server.js              # Production Express server for Railway
├── index.html             # Vite entry
├── docs/
│   ├── GAME_DESIGN.md     # Full game design document
│   ├── ARCHITECTURE.md    # Technical architecture and patterns
│   └── TASKS.md           # Prioritized build task tracker
├── src/
│   ├── main.js            # Phaser game config and boot
│   ├── config/
│   │   ├── constants.js   # All game constants
│   │   ├── items.js       # Item database (100+ items)
│   │   ├── recipes.js     # Crafting recipes
│   │   ├── animals.js     # Animal type definitions
│   │   └── buildings.js   # Building/furniture definitions
│   ├── scenes/
│   │   ├── BootScene.js   # Asset preloading
│   │   ├── MenuScene.js   # Main menu
│   │   ├── GameScene.js   # Core gameplay scene
│   │   └── UIScene.js     # HUD overlay scene (runs parallel to GameScene)
│   ├── systems/
│   │   ├── WorldGen.js    # Procedural world generation (tiles, buildings, loot)
│   │   ├── Player.js      # Player entity, movement, animation
│   │   ├── Survival.js    # Hunger, thirst, health, temperature, fatigue, sickness
│   │   ├── Inventory.js   # Inventory, weight, containers, hotbar
│   │   ├── Crafting.js    # Recipe system, workstations
│   │   ├── Building.js    # Construction, placement, upgrading
│   │   ├── Combat.js      # Melee/ranged, damage calc, injuries
│   │   ├── AnimalAI.js    # Wildlife behavior, territories, pack dynamics
│   │   ├── TimeWeather.js # Day/night cycle, seasons, weather states
│   │   ├── Skills.js      # Skill progression (foraging, cooking, carpentry, etc.)
│   │   ├── Loot.js        # Loot tables, container spawning, item distribution
│   │   ├── Mystery.js     # Bigfoot ambient layer (subtle, rare events)
│   │   └── Audio.js       # Sound manager, ambient audio, positional audio
│   ├── entities/
│   │   ├── Animal.js      # Animal base class
│   │   ├── Item.js        # Item entity (dropped items in world)
│   │   ├── Container.js   # Lootable container entity
│   │   ├── Structure.js   # Placed building/furniture entity
│   │   └── Vehicle.js     # Abandoned vehicle entity (lootable, not drivable initially)
│   ├── ui/
│   │   ├── HUD.js         # Health bars, time, compass, moodles
│   │   ├── InventoryUI.js # Full inventory panel with drag/drop
│   │   ├── CraftingUI.js  # Crafting panel with categories
│   │   ├── ContextMenu.js # Right-click context menus (PZ style)
│   │   ├── Moodles.js     # Status effect icons (PZ moodle system)
│   │   ├── SkillsUI.js    # Skills/character panel
│   │   ├── MapUI.js       # In-game map
│   │   └── Tooltip.js     # Item/object tooltips
│   ├── world/
│   │   ├── TileMap.js     # Tilemap management, chunk loading
│   │   ├── Biome.js       # Biome definitions and generation rules
│   │   ├── Building.js    # Building templates and room generation
│   │   └── Props.js       # World props (trees, rocks, bushes, debris)
│   └── utils/
│       ├── noise.js       # Simplex/Perlin noise for world gen
│       ├── pathfinding.js # A* for animal AI pathing
│       ├── math.js        # Common math utilities
│       └── save.js        # Save/load serialization
└── public/
    └── assets/
        ├── tiles/         # Tileset PNGs (generated programmatically initially)
        ├── sprites/       # Character and animal sprite sheets
        ├── ui/            # UI element graphics
        └── audio/         # Sound effects and ambient loops
```

## Design Reference: Project Zomboid Systems to Replicate

### CRITICAL — These are what make PZ feel like PZ:
1. **Isometric tile-based world** with enterable buildings, multiple floors (start with single floor)
2. **Right-click context menus** for all interactions (examine, take, eat, equip, drop, etc.)
3. **Moodle system** — status icons on screen edge showing conditions (hungry, thirsty, cold, anxious, sick, tired, in pain, wet, etc.)
4. **Inventory with weight** — items have weight, player has carry capacity, containers in world have capacity
5. **Skill progression** — actions level up skills (chopping trees levels carpentry, cooking food levels cooking, etc.)
6. **Time system** — real day/night with hours displayed, seasons that affect temperature and daylight
7. **Zombie replacement: Wildlife** — wolves, bears, cougars fill the threat role with realistic AI (territory, pack behavior, stalking, ambush)
8. **Lootable buildings** — houses, stores, gas stations, ranger stations with procedural loot
9. **Crafting at stations** — some recipes need campfire, workbench, etc.
10. **Character conditions** — injuries (cuts, fractures, bites), sickness, infection, all tracked individually
11. **Clothing system** — layered clothing with warmth, protection, and weight values
12. **Foraging system** — search ground in forest areas for berries, mushrooms, herbs, insects
13. **Sound attracts wildlife** — loud actions (chopping, fighting) increase animal attention radius
14. **Barricading and base building** — walls, doors, windows, furniture crafting

### DEFERRED (build later):
- Multiplayer
- Vehicles (drivable)
- NPCs
- Electricity/plumbing systems
- Multiple floors
- Farming (crops)

## Art Strategy
Since we don't have an artist, generate tile and sprite assets programmatically:
- Use canvas to generate tileset PNGs at build time (grass, dirt, stone, wood floor, walls, roofs, water, roads)
- Character sprites as simple but readable pixel art (8-directional, walk/idle/action animations)
- Animal sprites similarly generated
- UI elements drawn with canvas or simple geometric shapes
- This is the same approach many indie games use in early development

## The Mystery Layer (Bigfoot)
This is NOT a horror game. This is NOT a creature feature. The Bigfoot element is:
- **Documentary realism** — think Less Than Lethal, Missing 411
- **Ambient only** — subtle environmental anomalies that don't quite add up
- **Extremely rare** — player may go 10+ real hours before anything notable
- **Never confirmed** — the player should always be left with "was that real?"
- **Events:** distant wood knocks at night, tree structures that appear between sessions, a single oversized footprint, an object moved from where you left it, a brief silhouette at extreme render distance that disappears
- **NO:** jump scares, chase sequences, combat with Bigfoot, Bigfoot as enemy, horror music stings
- **Implementation:** Mystery.js system with long cooldown timers, day-gated progression, and weighted random event selection

## Code Standards
- ES module imports/exports throughout
- Phaser 3 scene lifecycle (preload, create, update)
- Systems are classes instantiated in GameScene, updated each frame
- Game state is centralized, serializable for save/load
- No global mutable state outside the game state object
- Comments on complex logic, especially AI and world gen
- Keep files under 400 lines — split when larger

## Save System
- Server endpoint POST /api/save, GET /api/load/:slot
- Full game state serialized to JSON: player stats, inventory, world modifications, time, weather, skill levels, placed structures, container states
- Auto-save every 5 minutes
- localStorage fallback when server unavailable

## Build Commands
```bash
npm install          # Install dependencies
npm run dev          # Vite dev server with hot reload
npm run build        # Production build to dist/
npm start            # Start Express server (serves dist/ + save API)
```

## Railway Deployment
1. Push repo to GitHub
2. Connect in Railway dashboard
3. Railway auto-detects Node.js, runs `npm run build` then `npm start`
4. Generate domain — game is live

## Current Build Phase
Check docs/TASKS.md for the current phase and what to build next. Always read TASKS.md before starting work to know what's been completed and what's next.

## Key Decisions Made
- **Phaser 3 over raw Three.js** — PZ is 2D isometric, not 3D. Phaser gives us tilemaps, sprite animation, camera, input, physics out of the box.
- **Isometric over true 3D** — matches PZ's look and feel, dramatically simpler to build at quality
- **Vite over Webpack** — faster dev experience, simpler config
- **Programmatic art over placeholder** — generates real tiles so the game looks presentable from day one
- **Systems architecture** — each game system is a standalone class, easy to build and test independently
