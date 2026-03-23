// CraftingSystem — Validates recipes, checks inputs/skills/stations,
// executes crafting, consumes inputs, grants outputs and XP.

import RECIPES from '../config/recipes.js';
import ITEMS from '../config/items.js';
import { PLAYER } from '../config/constants.js';
import { distance } from '../utils/math.js';

export default class CraftingSystem {
  constructor(scene, gameState, inventorySystem, worldGen) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.gameEvents;
    this.inventory = inventorySystem;
    this.worldGen = worldGen;

    this.crafting = false;
    this.craftProgress = 0;
    this.craftRecipe = null;
  }

  update(dt) {
    if (!this.crafting || !this.craftRecipe) return;

    this.craftProgress += dt;
    const progress = Math.min(this.craftProgress / this.craftRecipe.time, 1);

    this.events.emit('crafting:progress', { progress, recipe: this.craftRecipe });

    if (progress >= 1) {
      this.completeCraft();
    }
  }

  // Check if a recipe can be crafted
  canCraft(recipe) {
    // Check input items
    for (const [itemId, qty] of Object.entries(recipe.inputs)) {
      if (qty > 0 && !this.inventory.hasItem(itemId, qty)) {
        return { craftable: false, reason: `Missing ${ITEMS[itemId]?.name || itemId}` };
      }
    }

    // Check skill requirement
    if (recipe.skill) {
      for (const [skillName, minLevel] of Object.entries(recipe.skill)) {
        const playerSkill = this.gs.skills[skillName];
        if (!playerSkill || playerSkill.level < minLevel) {
          return { craftable: false, reason: `Requires ${skillName} level ${minLevel}` };
        }
      }
    }

    // Check station requirement
    if (recipe.station) {
      if (!this.isNearStation(recipe.station)) {
        return { craftable: false, reason: `Requires ${recipe.station}` };
      }
    }

    // Check tool requirement
    if (recipe.toolRequired) {
      const mainHand = this.gs.inventory.equipped.mainHand;
      const hasTool = mainHand && mainHand.itemId === recipe.toolRequired;
      const hasInInv = this.inventory.hasItem(recipe.toolRequired);
      if (!hasTool && !hasInInv) {
        return { craftable: false, reason: `Requires ${ITEMS[recipe.toolRequired]?.name || recipe.toolRequired}` };
      }
    }

    // Check weight capacity for output
    const outputDef = ITEMS[recipe.output];
    if (outputDef) {
      const outputWeight = outputDef.weight * recipe.qty;
      // Subtract input weights
      let inputWeight = 0;
      for (const [itemId, qty] of Object.entries(recipe.inputs)) {
        if (ITEMS[itemId]) inputWeight += ITEMS[itemId].weight * qty;
      }
      const netWeight = outputWeight - inputWeight;
      if (netWeight > 0) {
        const remaining = this.inventory.getMaxWeight() - this.inventory.getCurrentWeight();
        if (netWeight > remaining) {
          return { craftable: false, reason: 'Too heavy' };
        }
      }
    }

    return { craftable: true, reason: null };
  }

  // Start crafting a recipe
  startCraft(recipeId) {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;

    const check = this.canCraft(recipe);
    if (!check.craftable) return false;

    if (this.crafting) return false;

    this.crafting = true;
    this.craftProgress = 0;
    this.craftRecipe = recipe;

    this.events.emit('crafting:started', { recipe });
    return true;
  }

  completeCraft() {
    const recipe = this.craftRecipe;
    if (!recipe) return;

    // Consume inputs
    this.inventory.consumeItems(recipe.inputs);

    // Degrade tool if required
    if (recipe.toolRequired) {
      const mainHand = this.gs.inventory.equipped.mainHand;
      if (mainHand && mainHand.itemId === recipe.toolRequired && mainHand.condition !== null) {
        mainHand.condition -= 2;
        if (mainHand.condition <= 0) {
          this.events.emit('item:broken', { itemId: mainHand.itemId });
          this.gs.inventory.equipped.mainHand = null;
        }
      }
    }

    // Grant output
    this.inventory.addItem(recipe.output, recipe.qty);
    this.events.emit('item:added', {
      itemId: recipe.output,
      name: ITEMS[recipe.output]?.name || recipe.output,
      quantity: recipe.qty,
    });

    // Grant skill XP
    if (recipe.skill) {
      for (const [skillName] of Object.entries(recipe.skill)) {
        const skill = this.gs.skills[skillName];
        if (skill) {
          skill.xp += 10;
          const xpNeeded = (skill.level + 1) * 100;
          if (skill.xp >= xpNeeded && skill.level < 10) {
            skill.xp -= xpNeeded;
            skill.level += 1;
            this.events.emit('skill:levelup', { skill: skillName, level: skill.level });
          }
        }
      }
    }

    this.events.emit('crafting:complete', { recipe });

    this.crafting = false;
    this.craftProgress = 0;
    this.craftRecipe = null;
  }

  cancelCraft() {
    this.crafting = false;
    this.craftProgress = 0;
    this.craftRecipe = null;
    this.events.emit('crafting:cancelled');
  }

  // Check if player is near a specific station type
  isNearStation(stationType) {
    const structures = this.gs.worldMods.placedStructures;
    if (!structures) return false;

    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;

    for (const s of structures) {
      if (s.type === stationType) {
        const d = distance(px, py, s.x, s.y);
        if (d <= PLAYER.INTERACT_RANGE + 0.5) return true;
      }
    }
    return false;
  }

  // Get all recipes with their craftability status
  getAvailableRecipes() {
    return RECIPES.map(recipe => {
      const check = this.canCraft(recipe);
      // Count inputs the player has
      const inputStatus = {};
      for (const [itemId, qty] of Object.entries(recipe.inputs)) {
        inputStatus[itemId] = {
          need: qty,
          have: this.inventory.countItem(itemId),
          name: ITEMS[itemId]?.name || itemId,
        };
      }
      return {
        ...recipe,
        craftable: check.craftable,
        reason: check.reason,
        inputStatus,
      };
    });
  }

  destroy() {}
}
