// WorldGen — Procedural world generation using seeded simplex noise
// Generates a 128x128 tile map with biome assignment and object placement

import { WORLD, BIOME } from '../config/constants.js';
import { SimplexNoise, fbm } from '../utils/noise.js';
import { seededRandom, distance } from '../utils/math.js';

const MAP_SIZE = 128;

export default class WorldGen {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.events;
    this.width = MAP_SIZE;
    this.height = MAP_SIZE;

    this.tiles = null;        // [y][x] tile type string
    this.biomes = null;       // [y][x] biome type string
    this.objects = null;      // [y][x] object data or null
    this.walkable = null;     // [y][x] boolean
    this.tileVariants = null; // [y][x] variant index (0, 1, or 2)
  }

  generate() {
    const seed = this.gs.worldSeed;
    const terrainNoise = new SimplexNoise(seed);
    const moistureNoise = new SimplexNoise(seed + 500);
    const riverNoise = new SimplexNoise(seed + 1000);
    const rng = seededRandom(seed);

    this.tiles = [];
    this.biomes = [];
    this.objects = [];
    this.walkable = [];
    this.tileVariants = [];

    // Pass 1: Generate terrain and biomes
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      this.biomes[y] = [];
      this.objects[y] = [];
      this.walkable[y] = [];
      this.tileVariants[y] = [];

      for (let x = 0; x < this.width; x++) {
        const elevation = fbm(terrainNoise, x * WORLD.TERRAIN_SCALE, y * WORLD.TERRAIN_SCALE, 5);
        const moisture = fbm(moistureNoise, x * WORLD.MOISTURE_SCALE, y * WORLD.MOISTURE_SCALE, 3);

        // River channels
        const riverVal = Math.abs(fbm(riverNoise, x * 0.003, y * 0.003 + 100, 2));
        const isRiver = riverVal < 0.04;

        const { tile, biome } = this.assignBiome(elevation, moisture, isRiver);
        this.tiles[y][x] = tile;
        this.biomes[y][x] = biome;
        this.objects[y][x] = null;
        this.walkable[y][x] = biome !== BIOME.WATER && biome !== BIOME.MOUNTAIN;

        // Tile variant for visual variety
        const variantRng = seededRandom(x * 7919 + y * 104729 + seed);
        this.tileVariants[y][x] = Math.floor(variantRng() * 3);
      }
    }

    // Pass 2: Place objects (trees, rocks, bushes)
    this.placeObjects(rng);

    // Pass 3: Apply world modifications from save state
    this.applyWorldMods();

    // Set player start position at nearest walkable grass tile to center
    this.setPlayerStart();

    return this;
  }

  assignBiome(elevation, moisture, isRiver) {
    if (isRiver || elevation < -0.2) {
      return { tile: elevation < -0.3 ? 'water_deep' : 'water', biome: BIOME.WATER };
    }
    if (elevation > 0.5) {
      return { tile: 'stone', biome: BIOME.MOUNTAIN };
    }
    if (elevation > 0.2 && moisture > 0.3) {
      return { tile: 'grass_dark', biome: BIOME.DENSE_FOREST };
    }
    if (elevation > 0.0 && moisture > 0.1) {
      return { tile: 'grass_dark', biome: BIOME.FOREST };
    }
    if (elevation > 0.0 && moisture <= 0.1) {
      return { tile: 'dirt', biome: BIOME.MEADOW };
    }
    if (elevation > -0.2 && moisture > 0.0) {
      return { tile: 'grass', biome: BIOME.MEADOW };
    }
    return { tile: 'sand', biome: BIOME.MEADOW };
  }

  placeObjects(rng) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const biome = this.biomes[y][x];
        if (biome === BIOME.WATER || biome === BIOME.MOUNTAIN) continue;

        // Check minimum spacing from existing objects
        if (this.hasNearbyObject(x, y, 2)) continue;

        const roll = rng();

        if ((biome === BIOME.FOREST || biome === BIOME.DENSE_FOREST) && roll < WORLD.TREE_DENSITY) {
          const variant = Math.floor(rng() * 3);
          this.objects[y][x] = { type: 'tree', hp: 30, maxHp: 30, variant };
          this.walkable[y][x] = false;
        } else if (biome === BIOME.MOUNTAIN && roll < WORLD.ROCK_DENSITY) {
          const variant = Math.floor(rng() * 2);
          this.objects[y][x] = { type: 'rock', hp: 20, maxHp: 20, variant };
          this.walkable[y][x] = false;
        } else if (biome === BIOME.MEADOW && roll < WORLD.BUSH_DENSITY) {
          const variant = Math.floor(rng() * 2);
          this.objects[y][x] = { type: 'bush', hp: 5, maxHp: 5, variant };
          // Bushes are walkable (player can push through)
        } else if (biome === BIOME.FOREST && roll < WORLD.ROCK_DENSITY * 0.5) {
          const variant = Math.floor(rng() * 2);
          this.objects[y][x] = { type: 'rock', hp: 20, maxHp: 20, variant };
          this.walkable[y][x] = false;
        }
      }
    }

    // Also scatter some rocks on mountain edges and trees in meadow edges
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.objects[y][x]) continue;
        const biome = this.biomes[y][x];

        // Rocks near mountains
        if (biome === BIOME.MEADOW || biome === BIOME.FOREST) {
          if (this.hasAdjacentBiome(x, y, BIOME.MOUNTAIN) && rng() < 0.12) {
            this.objects[y][x] = { type: 'rock', hp: 20, maxHp: 20, variant: Math.floor(rng() * 2) };
            this.walkable[y][x] = false;
          }
        }

        // Bushes near forests
        if (biome === BIOME.MEADOW && !this.objects[y][x]) {
          if (this.hasAdjacentBiome(x, y, BIOME.FOREST) && rng() < 0.1) {
            this.objects[y][x] = { type: 'bush', hp: 5, maxHp: 5, variant: Math.floor(rng() * 2) };
          }
        }
      }
    }
  }

  hasNearbyObject(x, y, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue;
        if (dx === 0 && dy === 0) continue;
        if (this.objects[ny] && this.objects[ny][nx]) return true;
      }
    }
    return false;
  }

  hasAdjacentBiome(x, y, biome) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < this.width && ny < this.height) {
          if (this.biomes[ny][nx] === biome) return true;
        }
      }
    }
    return false;
  }

  applyWorldMods() {
    const mods = this.gs.worldMods;

    // Remove harvested objects
    if (mods.harvestedTiles) {
      for (const h of mods.harvestedTiles) {
        if (h.x >= 0 && h.x < this.width && h.y >= 0 && h.y < this.height) {
          this.objects[h.y][h.x] = null;
          this.walkable[h.y][h.x] = true;
        }
      }
    }

    // Add placed structures
    if (mods.placedStructures) {
      for (const s of mods.placedStructures) {
        if (s.x >= 0 && s.x < this.width && s.y >= 0 && s.y < this.height) {
          this.objects[s.y][s.x] = { type: s.type, hp: s.hp, maxHp: 100, placed: true };
          // Structures are walkable (player placed them near their path)
        }
      }
    }
  }

  setPlayerStart() {
    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);

    // If current position is walkable, keep it
    if (this.isWalkable(this.gs.player.gridX, this.gs.player.gridY)) return;

    // Spiral outward from center to find walkable grass tile
    for (let r = 0; r < 30; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = cx + dx, y = cy + dy;
          if (this.isWalkable(x, y) && this.getTileType(x, y) === 'grass') {
            this.gs.player.gridX = x;
            this.gs.player.gridY = y;
            return;
          }
        }
      }
    }

    // Fallback: any walkable tile near center
    this.gs.player.gridX = cx;
    this.gs.player.gridY = cy;
  }

  // Public API
  isWalkable(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return false;
    return this.walkable[Math.floor(gy)][Math.floor(gx)];
  }

  getTileType(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return null;
    return this.tiles[Math.floor(gy)][Math.floor(gx)];
  }

  getTileVariant(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return 0;
    return this.tileVariants[Math.floor(gy)][Math.floor(gx)];
  }

  getBiome(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return null;
    return this.biomes[Math.floor(gy)][Math.floor(gx)];
  }

  getObject(gx, gy) {
    const ix = Math.floor(gx), iy = Math.floor(gy);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return null;
    return this.objects[iy][ix];
  }

  removeObject(gx, gy) {
    const ix = Math.floor(gx), iy = Math.floor(gy);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    this.objects[iy][ix] = null;
    this.walkable[iy][ix] = true;

    // Record in world mods for save/load
    this.gs.worldMods.harvestedTiles.push({ x: ix, y: iy, timestamp: Date.now() });
  }

  placeObject(gx, gy, type) {
    const ix = Math.floor(gx), iy = Math.floor(gy);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    this.objects[iy][ix] = { type, hp: 100, maxHp: 100, placed: true };
  }

  destroy() {
    this.tiles = null;
    this.biomes = null;
    this.objects = null;
    this.walkable = null;
    this.tileVariants = null;
  }
}
