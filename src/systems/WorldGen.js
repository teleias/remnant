// WorldGen — Procedural world generation using seeded simplex noise
// Generates a 256x256 tile map with biome assignment, road networks, and building placement

import { WORLD, BIOME } from '../config/constants.js';
import { SimplexNoise, fbm } from '../utils/noise.js';
import { seededRandom, distance } from '../utils/math.js';
import BUILDINGS from '../config/buildings.js';

const MAP_SIZE = 256;

export default class WorldGen {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.gameEvents;
    this.width = MAP_SIZE;
    this.height = MAP_SIZE;

    this.tiles = null;        // [y][x] tile type string
    this.biomes = null;       // [y][x] biome type string
    this.objects = null;      // [y][x] object data or null
    this.walkable = null;     // [y][x] boolean
    this.tileVariants = null; // [y][x] variant index (0, 1, or 2)
    this.elevation = null;    // [y][x] elevation float (-1.0 to 1.0)
    this.buildings = [];      // Placed building instances
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

    // Initialize elevation array with Float32Array for performance
    this.elevation = new Array(this.height);
    for (let y = 0; y < this.height; y++) {
      this.elevation[y] = new Float32Array(this.width);
    }

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

        // Store elevation for later use
        this.elevation[y][x] = elevation;

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

    // Pass 2: Smooth elevation to prevent jagged cliffs
    this.smoothElevation();
    this.smoothElevation(); // Second pass for extra smoothness

    // Pass 3: Place objects (trees, rocks, bushes)
    this.placeObjects(rng);

    // Pass 4: Generate road network
    this.generateRoads(rng);

    // Pass 5: Place buildings (towns along roads, cabins in wilderness)
    this.placeBuildings(rng);

    // Pass 6: Apply world modifications from save state
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

  generateRoads(rng) {
    const roadCount = 3 + Math.floor(rng() * 2); // 3-4 main roads

    for (let r = 0; r < roadCount; r++) {
      // Pick start and end on different edges
      const edge1 = Math.floor(rng() * 4); // 0=top, 1=right, 2=bottom, 3=left
      let edge2 = (edge1 + 1 + Math.floor(rng() * 2)) % 4; // different edge

      const start = this.getEdgePoint(edge1, rng);
      const end = this.getEdgePoint(edge2, rng);

      // 1-2 control points for bezier curve
      const cp1 = {
        x: this.width * (0.2 + rng() * 0.6),
        y: this.height * (0.2 + rng() * 0.6)
      };
      const cp2 = {
        x: this.width * (0.2 + rng() * 0.6),
        y: this.height * (0.2 + rng() * 0.6)
      };

      // Trace bezier curve, stamping road tiles
      const steps = 200;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = Math.round(this.cubicBezier(t, start.x, cp1.x, cp2.x, end.x));
        const y = Math.round(this.cubicBezier(t, start.y, cp1.y, cp2.y, end.y));

        // Stamp road (2 tiles wide)
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const rx = x + dx, ry = y + dy;
            if (rx >= 0 && ry >= 0 && rx < this.width && ry < this.height) {
              if (this.biomes[ry][rx] !== BIOME.WATER) {
                this.tiles[ry][rx] = 'dirt_road';
                this.biomes[ry][rx] = BIOME.ROAD;
                this.walkable[ry][rx] = true;
                this.objects[ry][rx] = null; // Clear any objects on road
                this.elevation[ry][rx] = 0.05; // Flatten road to ground level
              }
            }
          }
        }
      }
    }
  }

  getEdgePoint(edge, rng) {
    const margin = 10;
    const range = (edge % 2 === 0) ? this.width : this.height;
    const pos = margin + rng() * (range - margin * 2);
    switch (edge) {
      case 0: return { x: pos, y: margin }; // top
      case 1: return { x: this.width - margin, y: pos }; // right
      case 2: return { x: pos, y: this.height - margin }; // bottom
      case 3: return { x: margin, y: pos }; // left
    }
  }

  cubicBezier(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
  }

  placeBuildings(rng) {
    const buildingTypes = Object.keys(BUILDINGS);
    const placed = []; // Track placed building centers for spacing

    // Attempt to place buildings
    const maxAttempts = 500;
    let totalPlaced = 0;
    const targetCount = 40 + Math.floor(rng() * 20); // 40-60 buildings

    for (let attempt = 0; attempt < maxAttempts && totalPlaced < targetCount; attempt++) {
      // Pick a random building type
      const typeKey = buildingTypes[Math.floor(rng() * buildingTypes.length)];
      const template = BUILDINGS[typeKey];

      // Skip based on frequency (rarer buildings placed less often)
      if (rng() > template.frequency * 2) continue;

      // Pick a random position
      const margin = 15;
      const px = margin + Math.floor(rng() * (this.width - margin * 2 - template.width));
      const py = margin + Math.floor(rng() * (this.height - margin * 2 - template.height));

      // Check biome compatibility
      const centerBiome = this.biomes[py + Math.floor(template.height/2)]?.[px + Math.floor(template.width/2)];
      const biomeName = centerBiome?.toLowerCase() || '';

      // Map internal biome names to building biome tags
      const biomeMatch = template.biomes.some(b => {
        if (b === 'town' || b === 'road') return biomeName === 'road' || this.isNearRoad(px, py, 8);
        if (b === 'forest') return biomeName === 'forest' || biomeName === 'dense_forest';
        if (b === 'dense_forest') return biomeName === 'dense_forest';
        if (b === 'meadow') return biomeName === 'meadow';
        if (b === 'mountain') return biomeName === 'mountain';
        return false;
      });
      if (!biomeMatch) continue;

      // Check minimum spacing from other buildings
      const minSpacing = 12;
      const tooClose = placed.some(p => {
        const dx = Math.abs(p.x - px);
        const dy = Math.abs(p.y - py);
        return dx < minSpacing && dy < minSpacing;
      });
      if (tooClose) continue;

      // Check footprint is valid (no water, within bounds)
      let valid = true;
      for (let by = 0; by < template.height && valid; by++) {
        for (let bx = 0; bx < template.width && valid; bx++) {
          const wx = px + bx, wy = py + by;
          if (wx >= this.width || wy >= this.height) { valid = false; break; }
          if (this.biomes[wy][wx] === BIOME.WATER) { valid = false; break; }
        }
      }
      if (!valid) continue;

      // PLACE THE BUILDING
      this.stampBuilding(px, py, typeKey, template, rng);
      placed.push({ x: px, y: py, type: typeKey });
      totalPlaced++;
    }

    this.buildings = placed;
    console.log(`Placed ${totalPlaced} buildings`);
  }

  isNearRoad(x, y, range) {
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < this.width && ny < this.height) {
          if (this.biomes[ny][nx] === BIOME.ROAD) return true;
        }
      }
    }
    return false;
  }

  stampBuilding(px, py, typeKey, template, rng) {
    const isVehicle = !!template.isVehicle;

    if (isVehicle) {
      // Vehicles: place a single object sprite, no walls/floors
      const cx = px + Math.floor(template.width / 2);
      const cy = py + Math.floor(template.height / 2);
      if (cx < this.width && cy < this.height) {
        this.objects[cy][cx] = {
          type: typeKey,
          isVehicle: true,
          variant: 0
        };
        // Vehicle tile is not walkable
        this.walkable[cy][cx] = false;
      }
      // Place container in adjacent tile for lootable trunk
      if (template.rooms?.[0]?.containers?.length > 0) {
        const tx = cx + 1 < this.width ? cx + 1 : cx - 1;
        if (tx >= 0 && tx < this.width && !this.objects[cy][tx]) {
          this.objects[cy][tx] = {
            type: 'container',
            containerType: template.rooms[0].containers[0],
            looted: false,
            variant: 0
          };
        }
      }
      return;
    }

    // Step 1: Floor - fill interior with wood_floor or tile_floor
    const floorType = rng() > 0.5 ? 'wood_floor' : 'tile_floor';
    for (let by = 0; by < template.height; by++) {
      for (let bx = 0; bx < template.width; bx++) {
        const wx = px + bx, wy = py + by;
        if (wx < this.width && wy < this.height) {
          this.tiles[wy][wx] = floorType;
          this.walkable[wy][wx] = true;
          this.objects[wy][wx] = null; // Clear trees/rocks
        }
      }
    }

    // Step 2: Walls - perimeter
    const wallVariant = rng() > 0.6 ? 'stone' : 'wood';
    for (let bx = 0; bx < template.width; bx++) {
      this.setWall(px + bx, py, wallVariant); // top
      this.setWall(px + bx, py + template.height - 1, wallVariant); // bottom
    }
    for (let by = 0; by < template.height; by++) {
      this.setWall(px, py + by, wallVariant); // left
      this.setWall(px + template.width - 1, py + by, wallVariant); // right
    }

    // Interior walls between rooms
    for (let i = 1; i < template.rooms.length; i++) {
      const room = template.rooms[i];
      // Draw walls along room boundaries (only if they're interior)
      if (room.x > 0) {
        for (let by = room.y; by < room.y + room.h; by++) {
          this.setWall(px + room.x, py + by, wallVariant);
        }
      }
      if (room.y > 0) {
        for (let bx = room.x; bx < room.x + room.w; bx++) {
          this.setWall(px + bx, py + room.y, wallVariant);
        }
      }
    }

    // Step 3: Doors (make walkable, set door object)
    for (const door of template.doors) {
      const dx = px + door.x, dy = py + door.y;
      if (dx < this.width && dy < this.height) {
        this.objects[dy][dx] = { type: 'door', open: true, variant: 0 };
        this.walkable[dy][dx] = true;
      }
    }

    // Step 4: Containers (place 1-2 per room on interior tiles)
    for (const room of template.rooms) {
      if (!room.containers) continue;
      const containerCount = Math.min(room.containers.length, Math.floor(room.w * room.h * 0.3));

      for (let c = 0; c < containerCount; c++) {
        // Find a free interior tile in this room
        for (let tries = 0; tries < 10; tries++) {
          const rx = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
          const ry = room.y + 1 + Math.floor(rng() * Math.max(1, room.h - 2));
          const wx = px + rx, wy = py + ry;

          if (wx > 0 && wy > 0 && wx < this.width - 1 && wy < this.height - 1) {
            if (!this.objects[wy][wx] || this.objects[wy][wx].type === undefined) {
              const containerType = room.containers[c % room.containers.length];
              this.objects[wy][wx] = {
                type: 'container',
                containerType,
                looted: false,
                variant: 0
              };
              // Containers are walkable (player can interact)
              this.walkable[wy][wx] = true;
              break;
            }
          }
        }
      }
    }
  }

  setWall(x, y, variant) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      this.objects[y][x] = { type: 'wall', variant, hp: 100, maxHp: 100 };
      this.walkable[y][x] = false;
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
    if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return 'water_deep';
    return this.tiles[Math.floor(gy)][Math.floor(gx)];
  }

  getTileVariant(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return 0;
    return this.tileVariants[Math.floor(gy)][Math.floor(gx)];
  }

  getBiome(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.width || gy >= this.height) return BIOME.WATER;
    return this.biomes[Math.floor(gy)][Math.floor(gx)];
  }

  // Note: getElevationStep defined below near getElevation

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

  smoothElevation() {
    const smoothed = new Array(this.height);
    for (let y = 0; y < this.height; y++) {
      smoothed[y] = new Float32Array(this.width);
      for (let x = 0; x < this.width; x++) {
        let sum = this.elevation[y][x] * 2; // center weighted double
        let count = 2;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width) {
              sum += this.elevation[ny][nx];
              count++;
            }
          }
        }
        smoothed[y][x] = sum / count;
      }
    }
    this.elevation = smoothed;
  }

  getElevation(gx, gy) {
    const x = Math.floor(gx);
    const y = Math.floor(gy);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.elevation[y][x];
  }

  getElevationStep(gx, gy) {
    const e = this.getElevation(gx, gy);
    if (e < -0.1) return 0;   // low/water
    if (e < 0.15) return 1;   // ground
    if (e < 0.35) return 2;   // hills
    return 3;                  // mountains
  }

  destroy() {
    this.tiles = null;
    this.biomes = null;
    this.objects = null;
    this.walkable = null;
    this.tileVariants = null;
    this.elevation = null;
    this.buildings = null;
  }
}
