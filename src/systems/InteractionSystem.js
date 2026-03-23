// InteractionSystem — Detects nearby interactable objects and handles
// resource gathering (chop trees, mine rocks, pick bushes, collect water).

import Phaser from 'phaser';
import { PLAYER } from '../config/constants.js';
import { distance } from '../utils/math.js';
import ITEMS from '../config/items.js';

// Gathering times in seconds (modified by tool power)
const GATHER_TIMES = {
  tree: 4.0,
  rock: 5.0,
  bush: 1.5,
  water: 1.5,
  carcass: 3.0,
};

// Loot tables per object type
const LOOT = {
  tree:  [
    { itemId: 'wood_log', qty: 1, chance: 1.0 },
    { itemId: 'stick', qty: 2, chance: 1.0 },
    { itemId: 'fiber', qty: 1, chance: 0.4 },
  ],
  rock:  [
    { itemId: 'stone', qty: 2, chance: 1.0 },
    { itemId: 'flint', qty: 1, chance: 0.5 },
  ],
  bush:  [
    { itemId: 'berries', qty: 3, chance: 1.0 },
    { itemId: 'herbs', qty: 1, chance: 0.3 },
    { itemId: 'fiber', qty: 1, chance: 0.5 },
  ],
};

// Skill XP grants per object type
const XP_GRANTS = {
  tree: { skill: 'carpentry', xp: 5 },
  rock: { skill: 'strength', xp: 5 },
  bush: { skill: 'foraging', xp: 3 },
};

export default class InteractionSystem {
  constructor(scene, gameState, worldGen, inventorySystem) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.gameEvents;
    this.worldGen = worldGen;
    this.inventory = inventorySystem;

    this.nearest = null;       // { type, gx, gy, dist }
    this.gathering = false;
    this.gatherProgress = 0;
    this.gatherTarget = null;  // { type, gx, gy, time }
    this.gatherKey = null;
  }

  create() {
    // Listen for interact key
    this.gatherKey = this.scene.keys.interact;
  }

  update(dt) {
    this.scanNearby();

    if (this.gathering) {
      this.updateGathering(dt);
      return;
    }

    // Start gathering when E is pressed
    if (this.gatherKey && Phaser.Input.Keyboard.JustDown(this.gatherKey) && this.nearest) {
      this.startGathering();
    }
  }

  scanNearby() {
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;
    const range = PLAYER.INTERACT_RANGE;
    let best = null;
    let bestDist = Infinity;

    // Scan grid cells in range
    const minX = Math.floor(px - range - 1);
    const maxX = Math.ceil(px + range + 1);
    const minY = Math.floor(py - range - 1);
    const maxY = Math.ceil(py + range + 1);

    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const obj = this.worldGen.getObject(gx, gy);
        if (!obj) continue;

        const d = distance(px, py, gx, gy);
        if (d <= range && d < bestDist) {
          bestDist = d;
          best = { type: obj.type, gx, gy, dist: d };
        }
      }
    }

    // Check for water tiles nearby
    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const tile = this.worldGen.getTileType(gx, gy);
        if (tile === 'water' || tile === 'water_deep') {
          const d = distance(px, py, gx, gy);
          if (d <= range && d < bestDist) {
            bestDist = d;
            best = { type: 'water', gx, gy, dist: d };
          }
        }
      }
    }

    // Check for dead animals nearby (harvestable)
    const animalSystem = this.scene.animalSystem;
    if (animalSystem) {
      const deadNearby = animalSystem.getDeadAnimalsNear(px, py, range);
      for (const dead of deadNearby) {
        const d = distance(px, py, dead.gx, dead.gy);
        if (d < bestDist) {
          bestDist = d;
          best = { type: 'carcass', gx: dead.gx, gy: dead.gy, dist: d, animalId: dead.id, animalType: dead.type };
        }
      }
    }

    // Emit nearest interactable for UI prompt
    if (best !== this.nearest) {
      this.nearest = best;
      this.events.emit('interaction:nearest', best);
    }
  }

  startGathering() {
    if (!this.nearest) return;

    const type = this.nearest.type;
    const baseTime = GATHER_TIMES[type] || 3;

    // Tool power reduces gather time
    let toolPower = 1;
    const equipped = this.gs.inventory.equipped;
    const mainHand = equipped.mainHand;
    if (mainHand && ITEMS[mainHand.itemId] && ITEMS[mainHand.itemId].toolPower) {
      toolPower = ITEMS[mainHand.itemId].toolPower;
    }

    const gatherTime = Math.max(0.5, baseTime / toolPower);

    this.gathering = true;
    this.gatherProgress = 0;
    this.gatherTarget = {
      type,
      gx: this.nearest.gx,
      gy: this.nearest.gy,
      time: gatherTime,
      animalId: this.nearest.animalId || null,
    };

    this.events.emit('gathering:started', {
      type,
      totalTime: gatherTime,
    });
  }

  updateGathering(dt) {
    if (!this.gatherTarget) {
      this.gathering = false;
      return;
    }

    // Cancel if player moves too far
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;
    const d = distance(px, py, this.gatherTarget.gx, this.gatherTarget.gy);
    if (d > PLAYER.INTERACT_RANGE + 0.5) {
      this.cancelGathering();
      return;
    }

    // Cancel if E released (hold to gather)
    if (this.gatherKey && !this.gatherKey.isDown) {
      this.cancelGathering();
      return;
    }

    this.gatherProgress += dt;
    const progress = Math.min(this.gatherProgress / this.gatherTarget.time, 1);

    this.events.emit('gathering:progress', { progress });

    if (progress >= 1) {
      this.completeGathering();
    }
  }

  completeGathering() {
    const target = this.gatherTarget;
    if (!target) return;

    // Grant loot
    if (target.type === 'carcass') {
      // Harvest dead animal via AnimalSystem
      const animalSystem = this.scene.animalSystem;
      if (animalSystem && target.animalId) {
        animalSystem.harvestAnimal(target.animalId, this.inventory);
        this.grantXP('tracking', 5);
      }
      this.events.emit('gathering:complete', { type: target.type });
      this.gathering = false;
      this.gatherProgress = 0;
      this.gatherTarget = null;
      this.nearest = null;
      return;
    } else if (target.type === 'water') {
      this.grantItem('water_dirty', 1);
    } else {
      const lootTable = LOOT[target.type];
      if (lootTable) {
        for (const loot of lootTable) {
          if (Math.random() < loot.chance) {
            this.grantItem(loot.itemId, loot.qty);
          }
        }
      }
    }

    // Grant skill XP
    const xpGrant = XP_GRANTS[target.type];
    if (xpGrant) {
      this.grantXP(xpGrant.skill, xpGrant.xp);
    }

    // Degrade equipped tool condition
    const mainHand = this.gs.inventory.equipped.mainHand;
    if (mainHand && mainHand.condition !== null && mainHand.condition !== undefined) {
      mainHand.condition -= 1;
      if (mainHand.condition <= 0) {
        this.events.emit('item:broken', { itemId: mainHand.itemId });
        this.gs.inventory.equipped.mainHand = null;
      }
    }

    // Remove object from world (not water)
    if (target.type !== 'water') {
      this.worldGen.removeObject(target.gx, target.gy);
      this.events.emit('world:objectRemoved', {
        gx: target.gx,
        gy: target.gy,
        type: target.type,
      });
    }

    this.events.emit('gathering:complete', { type: target.type });

    this.gathering = false;
    this.gatherProgress = 0;
    this.gatherTarget = null;
    this.nearest = null;
  }

  cancelGathering() {
    this.gathering = false;
    this.gatherProgress = 0;
    this.gatherTarget = null;
    this.events.emit('gathering:cancelled');
  }

  grantItem(itemId, qty) {
    if (this.inventory) {
      const added = this.inventory.addItem(itemId, qty);
      if (added) {
        const item = ITEMS[itemId];
        this.events.emit('item:added', {
          itemId,
          name: item ? item.name : itemId,
          quantity: qty,
        });
      }
    }
  }

  grantXP(skillName, amount) {
    const skill = this.gs.skills[skillName];
    if (!skill) return;

    skill.xp += amount;
    const xpNeeded = (skill.level + 1) * 100;
    if (skill.xp >= xpNeeded && skill.level < 10) {
      skill.xp -= xpNeeded;
      skill.level += 1;
      this.events.emit('skill:levelup', {
        skill: skillName,
        level: skill.level,
      });
    }
  }

  getPromptText() {
    if (!this.nearest) return null;
    if (this.gathering) return null;
    const type = this.nearest.type;
    switch (type) {
      case 'tree': return '[E] Chop Tree';
      case 'rock': return '[E] Mine Rock';
      case 'bush': return '[E] Forage Bush';
      case 'water': return '[E] Collect Water';
      case 'campfire': return '[E] Use Campfire';
      case 'carcass': return '[E] Harvest Carcass';
      default: return `[E] Interact`;
    }
  }

  destroy() {}
}
