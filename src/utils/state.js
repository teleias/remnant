// Game state factory and serialization utilities
// This creates the master game state object that all systems read/write to.
// The entire object is serializable to JSON for save/load.

export function createDefaultGameState() {
  return {
    // Player position and state
    player: {
      x: 0,
      y: 0,
      gridX: 128,        // Starting tile position (center of 256x256 map)
      gridY: 128,
      direction: 'S',
      moving: false,
      sneaking: false,
      sprinting: false,
    },

    // Survival stats (0 to 100)
    stats: {
      health: 100,
      hunger: 85,         // Start slightly hungry to teach the mechanic
      thirst: 80,
      fatigue: 100,
      temperature: 70,
      stress: 0,
    },

    // Active conditions
    conditions: [],

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
      slots: [
        // Starting items
        { itemId: 'stone', quantity: 3, condition: null },
        { itemId: 'stick', quantity: 5, condition: null },
        { itemId: 'fiber', quantity: 4, condition: null },
        { itemId: 'berries', quantity: 8, condition: null },
        { itemId: 'water_dirty', quantity: 2, condition: null },
      ],
      maxSlots: 20,
      weightCapacity: 15000,
      equipped: {
        head: null,
        torso: null,
        legs: null,
        feet: null,
        hands: null,
        back: null,
        mainHand: null,
        offHand: null,
      },
      hotbar: [null, null, null, null, null, null],
    },

    // Time
    time: {
      day: 1,
      hour: 6.0,
      season: 'summer',
      dayOfSeason: 1,
    },

    // Weather
    weather: {
      current: 'clear',
      temperature: 68,
      windSpeed: 5,
      nextChange: 180,
    },

    // World modifications
    worldMods: {
      harvestedTiles: [],
      placedStructures: [],
      openedContainers: [],
      droppedItems: [],
    },

    // Active animals
    animals: [],

    // Mystery layer
    mystery: {
      eventsTriggered: 0,
      lastEventTime: 0,
      tier: 0,
      structures: [],
    },

    // Meta
    totalPlayTime: 0,
    timestamp: null,
    worldSeed: Math.floor(Math.random() * 999999),
  };
}

// Deep clone game state for saving (avoid reference issues)
export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}
