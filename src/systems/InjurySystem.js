// InjurySystem — Manages injuries (bleeding, fractures, infection),
// moodles (status condition icons), and medical treatment.

import { clamp } from '../utils/math.js';
import ITEMS from '../config/items.js';

// Injury definitions
const INJURIES = {
  bleeding: {
    name: 'Bleeding',
    icon: '🩸',
    color: '#cc2222',
    healthDrain: 3,        // Per game hour
    chance: 0.35,          // Base chance per hit
    damageThreshold: 8,    // Min damage to trigger
    treatment: 'bandage',
    duration: null,        // Lasts until treated
  },
  fractured: {
    name: 'Fracture',
    icon: '🦴',
    color: '#ccaa44',
    speedPenalty: 0.5,     // Halves movement speed
    chance: 0.15,
    damageThreshold: 15,
    treatment: 'splint',
    duration: null,
  },
  infected: {
    name: 'Infection',
    icon: '🦠',
    color: '#44aa44',
    healthDrain: 1.5,
    chance: 0.2,
    triggerDelay: 3600,    // Seconds before untreated wound infects
    treatment: 'disinfectant',
    duration: null,
  },
  pain: {
    name: 'Pain',
    icon: '⚡',
    color: '#eeee44',
    aimPenalty: 0.3,
    chance: 0.5,
    damageThreshold: 5,
    treatment: 'painkillers',
    duration: 600,         // Fades after 10 min real time
  },
  sick: {
    name: 'Sick',
    icon: '🤢',
    color: '#66cc66',
    hungerDrain: 2,        // Extra per game hour
    thirstDrain: 1.5,
    treatment: 'antibiotics',
    duration: 1800,        // 30 min real time
  },
  hypothermia: {
    name: 'Hypothermia',
    icon: '🥶',
    color: '#4488cc',
    speedPenalty: 0.3,
    healthDrain: 2,
    duration: null,        // Clears when warm
  },
  exhausted: {
    name: 'Exhausted',
    icon: '😴',
    color: '#8888aa',
    speedPenalty: 0.2,
    duration: null,        // Clears when fatigue > 20
  },
  starving: {
    name: 'Starving',
    icon: '🍽',
    color: '#cc8844',
    duration: null,        // Clears when hunger > 10
  },
  dehydrated: {
    name: 'Dehydrated',
    icon: '🏜',
    color: '#4466cc',
    duration: null,        // Clears when thirst > 10
  },
};

export default class InjurySystem {
  constructor(scene, gameState, inventorySystem) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.gameEvents;
    this.inventory = inventorySystem;

    // Active conditions: [{ type, startTime, treated }]
    if (!this.gs.conditions) this.gs.conditions = [];
  }

  create() {
    // Listen for combat damage to check for injuries
    this.events.on('combat:checkInjury', (data) => {
      this.rollInjuries(data.damage, data.source);
    });

    // Listen for item use to treat injuries
    this.events.on('item:used', (data) => {
      this.checkTreatment(data.itemId);
    });
  }

  rollInjuries(damage, source) {
    for (const [type, def] of Object.entries(INJURIES)) {
      if (def.damageThreshold && damage < def.damageThreshold) continue;
      if (def.chance && Math.random() > def.chance) continue;
      // Don't stack same injury type (except pain)
      if (type !== 'pain' && this.hasCondition(type)) continue;

      this.addCondition(type);
    }
  }

  addCondition(type) {
    if (!INJURIES[type]) return;

    const condition = {
      type,
      startTime: this.gs.totalPlayTime,
      treated: false,
    };

    this.gs.conditions.push(condition);

    this.events.emit('moodle:added', {
      type,
      name: INJURIES[type].name,
      icon: INJURIES[type].icon,
      color: INJURIES[type].color,
    });

    this.events.emit('injury:added', {
      type,
      name: INJURIES[type].name,
    });
  }

  removeCondition(type) {
    const idx = this.gs.conditions.findIndex(c => c.type === type);
    if (idx >= 0) {
      this.gs.conditions.splice(idx, 1);
      this.events.emit('moodle:removed', { type });
    }
  }

  hasCondition(type) {
    return this.gs.conditions.some(c => c.type === type);
  }

  checkTreatment(itemId) {
    const itemDef = ITEMS[itemId];
    if (!itemDef?.heals) return;

    for (const healType of itemDef.heals) {
      const idx = this.gs.conditions.findIndex(c => c.type === healType);
      if (idx >= 0) {
        this.gs.conditions[idx].treated = true;
        // Some treatments remove immediately, others mark as treated
        if (healType === 'bleeding' || healType === 'pain') {
          this.removeCondition(healType);
        }
        this.events.emit('injury:treated', { type: healType });
      }
    }
  }

  // Get movement speed modifier from all active conditions
  getSpeedModifier() {
    let mod = 1;
    for (const c of this.gs.conditions) {
      const def = INJURIES[c.type];
      if (def?.speedPenalty) {
        mod *= (1 - def.speedPenalty);
      }
    }
    return mod;
  }

  // Get all active moodle data for UI rendering
  getMoodles() {
    return this.gs.conditions.map(c => ({
      type: c.type,
      ...INJURIES[c.type],
    }));
  }

  update(dt) {
    const stats = this.gs.stats;
    const gameHours = dt / 60; // TIME.SECONDS_PER_HOUR = 60

    // Apply injury effects
    for (let i = this.gs.conditions.length - 1; i >= 0; i--) {
      const c = this.gs.conditions[i];
      const def = INJURIES[c.type];
      if (!def) continue;

      // Health drain
      if (def.healthDrain && !c.treated) {
        stats.health = clamp(stats.health - def.healthDrain * gameHours, 0, 100);
      }

      // Extra hunger/thirst drain
      if (def.hungerDrain) {
        stats.hunger = clamp(stats.hunger - def.hungerDrain * gameHours, 0, 100);
      }
      if (def.thirstDrain) {
        stats.thirst = clamp(stats.thirst - def.thirstDrain * gameHours, 0, 100);
      }

      // Timed conditions expire
      if (def.duration) {
        const elapsed = this.gs.totalPlayTime - c.startTime;
        if (elapsed >= def.duration || c.treated) {
          this.gs.conditions.splice(i, 1);
          this.events.emit('moodle:removed', { type: c.type });
          continue;
        }
      }

      // Infection trigger from untreated bleeding
      if (c.type === 'bleeding' && !c.treated) {
        const elapsed = this.gs.totalPlayTime - c.startTime;
        if (elapsed > INJURIES.infected.triggerDelay && !this.hasCondition('infected')) {
          this.addCondition('infected');
        }
      }
    }

    // Auto-add/remove stat-based moodles
    this.updateStatMoodles();

    // Check death from injuries
    if (stats.health <= 0) {
      const cause = this.hasCondition('bleeding')
        ? 'Bled out'
        : this.hasCondition('infected')
          ? 'Died of infection'
          : 'Succumbed to injuries';
      this.events.emit('player:died', {
        cause,
        day: this.gs.time.day,
        playTime: this.gs.totalPlayTime,
      });
    }
  }

  updateStatMoodles() {
    const stats = this.gs.stats;

    // Exhausted
    if (stats.fatigue <= 10 && !this.hasCondition('exhausted')) {
      this.addCondition('exhausted');
    } else if (stats.fatigue > 20 && this.hasCondition('exhausted')) {
      this.removeCondition('exhausted');
    }

    // Starving
    if (stats.hunger <= 5 && !this.hasCondition('starving')) {
      this.addCondition('starving');
    } else if (stats.hunger > 10 && this.hasCondition('starving')) {
      this.removeCondition('starving');
    }

    // Dehydrated
    if (stats.thirst <= 5 && !this.hasCondition('dehydrated')) {
      this.addCondition('dehydrated');
    } else if (stats.thirst > 10 && this.hasCondition('dehydrated')) {
      this.removeCondition('dehydrated');
    }

    // Hypothermia
    if (stats.temperature < 30 && !this.hasCondition('hypothermia')) {
      this.addCondition('hypothermia');
    } else if (stats.temperature >= 35 && this.hasCondition('hypothermia')) {
      this.removeCondition('hypothermia');
    }
  }

  destroy() {
    // Cleanup
  }
}
