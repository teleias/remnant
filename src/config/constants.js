// All game constants in one place. Tune these to balance the game.

export const TILE = {
  WIDTH: 64,
  HEIGHT: 32,
  HALF_W: 32,
  HALF_H: 16,
};

export const WORLD = {
  CHUNK_SIZE: 32,       // Tiles per chunk edge
  ACTIVE_CHUNKS: 3,     // 3x3 grid of active chunks around player
  TERRAIN_SCALE: 0.02,  // Noise scale for terrain generation
  MOISTURE_SCALE: 0.015,// Noise scale for moisture/biome
  TREE_DENSITY: 0.15,   // Probability per forest tile
  ROCK_DENSITY: 0.05,
  BUSH_DENSITY: 0.08,
};

export const PLAYER = {
  WALK_SPEED: 80,       // Pixels per second
  SPRINT_SPEED: 140,
  SNEAK_SPEED: 40,
  SPRINT_DRAIN: 15,     // Fatigue per minute while sprinting
  INTERACT_RANGE: 1.5,  // Tiles
  BASE_CARRY: 15000,    // Grams
};

export const SURVIVAL = {
  HUNGER_DRAIN: 1.8,    // Per game hour
  THIRST_DRAIN: 2.5,    // Per game hour
  FATIGUE_DRAIN: 4.2,   // Per game hour (awake)
  FATIGUE_RECOVER: 12,  // Per game hour (sleeping)
  HEALTH_REGEN: 0.5,    // Per game hour (if well fed and hydrated)
  STARVE_DAMAGE: 3,     // Health per hour at 0 hunger
  DEHYDRATE_DAMAGE: 5,  // Health per hour at 0 thirst
  COLD_DAMAGE: 2,       // Health per hour below temp threshold
  COLD_THRESHOLD: 35,   // Below this temp, take cold damage
};

export const TIME = {
  SECONDS_PER_HOUR: 60, // 60 real seconds = 1 game hour (24 min full day)
  DAWN_START: 5,
  DAWN_END: 7,
  DUSK_START: 18,
  DUSK_END: 20,
  DAYS_PER_SEASON: 30,
};

export const WEATHER = {
  MIN_DURATION: 60,     // Seconds minimum for a weather state
  MAX_DURATION: 300,    // Seconds maximum
  RAIN_TEMP_PENALTY: 10,
  WIND_TEMP_PENALTY: 8,
  STORM_TEMP_PENALTY: 18,
};

export const COMBAT = {
  BASE_MELEE_DAMAGE: 5,
  UNARMED_DAMAGE: 2,
  ATTACK_COOLDOWN: 800, // Milliseconds between swings
  KNOCKBACK: 20,        // Pixels
};

export const SKILLS = {
  // XP required per level: level * 100
  XP_PER_LEVEL: 100,
  MAX_LEVEL: 10,
};

export const DEPTH = {
  GROUND: 0,
  FLOOR: 100,
  OBJECTS: 200,
  WALLS: 300,
  ENTITIES: 1000,       // Dynamic: ENTITIES + gridY * 10 + gridX
  ROOF: 5000,
  WEATHER: 8000,
  UI: 10000,
};

// Biome types
export const BIOME = {
  WATER: 'water',
  MEADOW: 'meadow',
  FOREST: 'forest',
  DENSE_FOREST: 'dense_forest',
  MOUNTAIN: 'mountain',
  ROAD: 'road',
  TOWN: 'town',
};

// Direction vectors for 8-way movement
export const DIRS = {
  N:  { x: 0,  y: -1 },
  NE: { x: 1,  y: -1 },
  E:  { x: 1,  y: 0  },
  SE: { x: 1,  y: 1  },
  S:  { x: 0,  y: 1  },
  SW: { x: -1, y: 1  },
  W:  { x: -1, y: 0  },
  NW: { x: -1, y: -1 },
};
