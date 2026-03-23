// SurvivalSystem — Manages player survival stats: hunger, thirst, fatigue,
// temperature, health. Applies damage from critical stat levels and triggers death.

import { SURVIVAL, TIME, PLAYER } from '../config/constants.js';
import { clamp, distance } from '../utils/math.js';
import ITEMS from '../config/items.js';

export default class SurvivalSystem {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.events;
    this.lastEmittedStats = {};
  }

  update(dt) {
    const stats = this.gs.stats;
    const player = this.gs.player;
    const gameHours = dt / TIME.SECONDS_PER_HOUR;

    // Hunger drain
    let hungerDrain = SURVIVAL.HUNGER_DRAIN * gameHours;
    if (player.sprinting) hungerDrain *= 1.5;
    stats.hunger = clamp(stats.hunger - hungerDrain, 0, 100);

    // Thirst drain
    let thirstDrain = SURVIVAL.THIRST_DRAIN * gameHours;
    if (player.sprinting) thirstDrain *= 1.3;
    stats.thirst = clamp(stats.thirst - thirstDrain, 0, 100);

    // Fatigue drain
    let fatigueDrain = SURVIVAL.FATIGUE_DRAIN * gameHours;
    if (player.sprinting) fatigueDrain *= 2;
    else if (player.sneaking) fatigueDrain *= 0.7;
    stats.fatigue = clamp(stats.fatigue - fatigueDrain, 0, 100);

    // Temperature calculation
    stats.temperature = this.calculateTemperature();

    // Health damage from critical conditions
    if (stats.hunger <= 0) {
      stats.health -= SURVIVAL.STARVE_DAMAGE * gameHours;
    }
    if (stats.thirst <= 0) {
      stats.health -= SURVIVAL.DEHYDRATE_DAMAGE * gameHours;
    }
    if (stats.temperature < SURVIVAL.COLD_THRESHOLD) {
      stats.health -= SURVIVAL.COLD_DAMAGE * gameHours;
    }

    // Health regeneration when well fed and hydrated
    if (stats.hunger > 80 && stats.thirst > 80 && stats.fatigue > 20) {
      stats.health = clamp(stats.health + SURVIVAL.HEALTH_REGEN * gameHours, 0, 100);
    }

    // Clamp health
    stats.health = clamp(stats.health, 0, 100);

    // Emit stat changes for UI updates
    this.events.emit('stat:changed', { ...stats });

    // Check for death
    if (stats.health <= 0) {
      const cause = this.determineCauseOfDeath();
      this.events.emit('player:died', { cause });
    }
  }

  calculateTemperature() {
    let temp = this.gs.weather.temperature;
    const hour = this.gs.time.hour;

    // Time of day modifier
    if (hour >= 20 || hour < 5) {
      // Night: coldest
      temp -= 15;
    } else if (hour >= 5 && hour < 7) {
      // Dawn: warming up
      temp -= 8;
    } else if (hour >= 11 && hour < 15) {
      // Midday: warmest
      temp += 10;
    } else if (hour >= 18 && hour < 20) {
      // Dusk: cooling down
      temp -= 5;
    }

    // Weather penalties
    const weather = this.gs.weather.current;
    if (weather === 'rain') temp -= 10;
    else if (weather === 'heavy_rain') temp -= 15;
    else if (weather === 'wind') temp -= 8;
    else if (weather === 'storm') temp -= 18;
    else if (weather === 'snow') temp -= 25;

    // Clothing warmth
    const equipped = this.gs.inventory.equipped;
    for (const slot of Object.keys(equipped)) {
      const item = equipped[slot];
      if (item && ITEMS[item.itemId] && ITEMS[item.itemId].warmth) {
        temp += ITEMS[item.itemId].warmth;
      }
    }

    // Campfire proximity bonus
    const structures = this.gs.worldMods.placedStructures;
    if (structures) {
      for (const s of structures) {
        if (s.type === 'campfire') {
          const dist = distance(this.gs.player.gridX, this.gs.player.gridY, s.x, s.y);
          if (dist <= 3) {
            temp += 20;
            break;
          }
        }
      }
    }

    // Season modifier
    const season = this.gs.time.season;
    if (season === 'winter') temp -= 20;
    else if (season === 'autumn') temp -= 8;
    else if (season === 'spring') temp -= 3;

    return temp;
  }

  determineCauseOfDeath() {
    const stats = this.gs.stats;
    if (stats.hunger <= 0 && stats.thirst <= 0) return 'Starvation and Dehydration';
    if (stats.hunger <= 0) return 'Starvation';
    if (stats.thirst <= 0) return 'Dehydration';
    if (stats.temperature < SURVIVAL.COLD_THRESHOLD) return 'Hypothermia';
    return 'Injuries';
  }

  destroy() {}
}
