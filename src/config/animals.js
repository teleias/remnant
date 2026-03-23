// Animal type definitions for the wildlife system

const ANIMALS = {
  deer: {
    name: 'Deer',
    category: 'prey',
    hp: 40,
    speed: 100,
    detectRange: 15,    // Tiles — distance at which it notices player
    fleeRange: 12,      // Tiles — distance at which it starts fleeing
    behavior: 'flee',
    groupSize: [2, 5],  // Min/max group size
    biomes: ['meadow', 'forest'],
    drops: { raw_venison: 3, pelt_deer: 1, fat: 1 },
    spriteColor: 0x8B6914,
    size: { w: 1.2, h: 1.0 },
  },
  elk: {
    name: 'Elk',
    category: 'prey',
    hp: 60,
    speed: 85,
    detectRange: 18,
    fleeRange: 14,
    behavior: 'flee_charge', // Flees but can charge if cornered
    groupSize: [3, 8],
    biomes: ['meadow', 'forest'],
    drops: { raw_venison: 5, pelt_deer: 2, fat: 2 },
    chargeThreshold: 0.3, // HP percentage to switch to charge
    chargeDamage: 20,
    spriteColor: 0x6B4914,
    size: { w: 1.6, h: 1.4 },
  },
  rabbit: {
    name: 'Rabbit',
    category: 'prey',
    hp: 10,
    speed: 140,
    detectRange: 8,
    fleeRange: 6,
    behavior: 'flee',
    groupSize: [1, 2],
    biomes: ['meadow', 'forest', 'dense_forest'],
    drops: { raw_rabbit: 1 },
    spriteColor: 0xAA9988,
    size: { w: 0.4, h: 0.3 },
  },
  squirrel: {
    name: 'Squirrel',
    category: 'prey',
    hp: 5,
    speed: 120,
    detectRange: 6,
    fleeRange: 5,
    behavior: 'flee',
    groupSize: [1, 1],
    biomes: ['forest', 'dense_forest'],
    drops: { raw_rabbit: 1 },
    spriteColor: 0x886644,
    size: { w: 0.3, h: 0.2 },
  },
  wolf: {
    name: 'Wolf',
    category: 'predator',
    hp: 50,
    speed: 110,
    detectRange: 25,
    aggroRange: 20,     // Tiles — distance at which it starts pursuing
    behavior: 'pack_hunt',
    groupSize: [3, 5],
    biomes: ['forest', 'dense_forest', 'meadow'],
    drops: { raw_meat: 2, pelt_wolf: 1 },
    damage: 12,
    attackCooldown: 2000,
    attackRange: 1.5,
    spriteColor: 0x555555,
    size: { w: 1.0, h: 0.7 },
    sounds: {
      idle: 'wolf_idle',
      alert: 'wolf_growl',
      attack: 'wolf_bark',
      howl: 'wolf_howl',       // Long range audio cue
    },
  },
  bear: {
    name: 'Black Bear',
    category: 'predator',
    hp: 120,
    speed: 70,
    detectRange: 15,
    aggroRange: 8,      // Short aggro range — territorial, not hunter
    behavior: 'territorial',
    groupSize: [1, 1],
    biomes: ['forest', 'dense_forest'],
    drops: { raw_meat: 6, pelt_bear: 1, fat: 3 },
    damage: 25,
    attackCooldown: 3000,
    attackRange: 2,
    warnDistance: 12,    // Distance at which bear stands and huffs
    chargeDistance: 6,   // Distance at which bear charges
    spriteColor: 0x3B2508,
    size: { w: 2.0, h: 1.8 },
    sounds: {
      idle: 'bear_idle',
      warn: 'bear_huff',
      attack: 'bear_roar',
    },
    territorial: true,
    territoryRadius: 20, // Tiles — area bear considers its own
  },
  cougar: {
    name: 'Mountain Lion',
    category: 'predator',
    hp: 60,
    speed: 130,
    detectRange: 30,    // Excellent detection range
    aggroRange: 15,
    behavior: 'ambush',
    groupSize: [1, 1],
    biomes: ['mountain', 'forest', 'dense_forest'],
    drops: { raw_meat: 3, leather: 2 },
    damage: 20,
    attackCooldown: 1500,
    attackRange: 2,
    stalkSpeed: 30,     // Very slow approach before pounce
    pounceRange: 4,     // Distance at which it launches attack
    spriteColor: 0xAA8844,
    size: { w: 1.3, h: 0.8 },
    sounds: {
      alert: 'cougar_scream',
      attack: 'cougar_hiss',
    },
    ambush: true,       // Attacks from behind, bonus first strike damage
    ambushMultiplier: 2,
  },
  coyote: {
    name: 'Coyote',
    category: 'predator',
    hp: 30,
    speed: 100,
    detectRange: 20,
    aggroRange: 10,
    behavior: 'opportunistic', // Only attacks injured/low health players
    groupSize: [1, 3],
    biomes: ['meadow', 'forest'],
    drops: { raw_meat: 1, leather: 1 },
    damage: 6,
    attackCooldown: 1500,
    attackRange: 1.5,
    aggroHealthThreshold: 40, // Only aggros if player health below this
    spriteColor: 0x887766,
    size: { w: 0.8, h: 0.6 },
  },
  raven: {
    name: 'Raven',
    category: 'ambient',
    hp: 5,
    speed: 60,
    behavior: 'scavenger', // Circles above dead animals
    groupSize: [2, 6],
    biomes: ['meadow', 'forest', 'mountain'],
    drops: { feathers: 2 },
    spriteColor: 0x111111,
    size: { w: 0.3, h: 0.3 },
    flying: true,
  },
  fish: {
    name: 'Fish',
    category: 'aquatic',
    hp: 5,
    speed: 40,
    behavior: 'swim',
    groupSize: [3, 8],
    biomes: ['water'],
    drops: { raw_fish: 1 },
    spriteColor: 0x4488AA,
    size: { w: 0.3, h: 0.1 },
    aquatic: true,
  },
};

export default ANIMALS;
