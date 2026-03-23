// InventorySystem — Manages player inventory slots, equipment, weight,
// item usage (eat/drink/heal), and hotbar references.

import ITEMS from '../config/items.js';
import { PLAYER } from '../config/constants.js';

export default class InventorySystem {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.gameEvents;
  }

  // Add items to inventory, stacking where possible
  // Returns true if any items were added
  addItem(itemId, qty) {
    const inv = this.gs.inventory;
    const itemDef = ITEMS[itemId];
    if (!itemDef) return false;

    let remaining = qty;

    // Try to stack onto existing slots first
    for (const slot of inv.slots) {
      if (slot.itemId === itemId && slot.quantity < itemDef.stack) {
        const canAdd = Math.min(remaining, itemDef.stack - slot.quantity);
        slot.quantity += canAdd;
        remaining -= canAdd;
        if (remaining <= 0) return true;
      }
    }

    // Add to new slots
    while (remaining > 0 && inv.slots.length < inv.maxSlots) {
      // Weight check
      if (this.getCurrentWeight() + itemDef.weight > this.getMaxWeight()) {
        break;
      }
      const stackQty = Math.min(remaining, itemDef.stack);
      inv.slots.push({
        itemId,
        quantity: stackQty,
        condition: itemDef.condition !== undefined ? itemDef.condition : null,
      });
      remaining -= stackQty;
    }

    return remaining < qty;
  }

  // Remove quantity from a specific slot
  removeItem(slotIndex, qty) {
    const inv = this.gs.inventory;
    if (slotIndex < 0 || slotIndex >= inv.slots.length) return false;

    const slot = inv.slots[slotIndex];
    slot.quantity -= qty;

    if (slot.quantity <= 0) {
      inv.slots.splice(slotIndex, 1);
      // Clear hotbar references pointing to this slot
      this.cleanHotbarRefs();
    }

    return true;
  }

  // Use an item (eat, drink, heal, etc.)
  useItem(slotIndex) {
    const inv = this.gs.inventory;
    if (slotIndex < 0 || slotIndex >= inv.slots.length) return false;

    const slot = inv.slots[slotIndex];
    const itemDef = ITEMS[slot.itemId];
    if (!itemDef) return false;

    // Check if item has use effects
    if (!itemDef.effects) return false;

    // Apply effects to stats
    const stats = this.gs.stats;
    for (const [stat, value] of Object.entries(itemDef.effects)) {
      if (stats[stat] !== undefined) {
        stats[stat] = Math.max(0, Math.min(100, stats[stat] + value));
      }
    }

    // Remove one from stack
    this.removeItem(slotIndex, 1);

    this.events.emit('item:used', { itemId: slot.itemId, effects: itemDef.effects });
    return true;
  }

  // Equip an item to the appropriate slot
  equipItem(slotIndex) {
    const inv = this.gs.inventory;
    if (slotIndex < 0 || slotIndex >= inv.slots.length) return false;

    const slot = inv.slots[slotIndex];
    const itemDef = ITEMS[slot.itemId];
    if (!itemDef) return false;

    // Determine equipment slot
    let eqSlot = null;
    if (itemDef.category === 'tool' || itemDef.category === 'weapon') {
      eqSlot = 'mainHand';
    } else if (itemDef.slot) {
      eqSlot = itemDef.slot;
    } else if (itemDef.category === 'clothing') {
      // Infer from item properties
      if (itemDef.slot) eqSlot = itemDef.slot;
      else return false;
    }

    if (!eqSlot) return false;

    // Swap: unequip current, equip new
    const current = inv.equipped[eqSlot];
    if (current) {
      // Put current back in inventory
      this.addItem(current.itemId, 1);
    }

    // Set equipped
    inv.equipped[eqSlot] = {
      itemId: slot.itemId,
      condition: slot.condition,
    };

    // Remove from inventory
    this.removeItem(slotIndex, 1);

    this.events.emit('item:equipped', { itemId: slot.itemId, slot: eqSlot });
    return true;
  }

  // Unequip from slot back to inventory
  unequipItem(eqSlot) {
    const inv = this.gs.inventory;
    const current = inv.equipped[eqSlot];
    if (!current) return false;

    const added = this.addItem(current.itemId, 1);
    if (added) {
      inv.equipped[eqSlot] = null;
      this.events.emit('item:unequipped', { slot: eqSlot });
      return true;
    }
    return false;
  }

  // Drop item from slot
  dropItem(slotIndex, qty) {
    const inv = this.gs.inventory;
    if (slotIndex < 0 || slotIndex >= inv.slots.length) return false;

    const slot = inv.slots[slotIndex];
    const dropQty = qty || slot.quantity;

    // Add to dropped items in world
    this.gs.worldMods.droppedItems.push({
      itemId: slot.itemId,
      quantity: dropQty,
      x: Math.round(this.gs.player.gridX),
      y: Math.round(this.gs.player.gridY),
    });

    this.removeItem(slotIndex, dropQty);
    return true;
  }

  // Check if player has at least qty of itemId
  hasItem(itemId, qty = 1) {
    let total = 0;
    for (const slot of this.gs.inventory.slots) {
      if (slot.itemId === itemId) {
        total += slot.quantity;
        if (total >= qty) return true;
      }
    }
    return false;
  }

  // Count total quantity of an item
  countItem(itemId) {
    let total = 0;
    for (const slot of this.gs.inventory.slots) {
      if (slot.itemId === itemId) {
        total += slot.quantity;
      }
    }
    return total;
  }

  // Consume specific quantities of items (for crafting)
  consumeItems(requirements) {
    for (const [itemId, qty] of Object.entries(requirements)) {
      let remaining = qty;
      const inv = this.gs.inventory;

      for (let i = inv.slots.length - 1; i >= 0 && remaining > 0; i--) {
        if (inv.slots[i].itemId === itemId) {
          const take = Math.min(remaining, inv.slots[i].quantity);
          inv.slots[i].quantity -= take;
          remaining -= take;
          if (inv.slots[i].quantity <= 0) {
            inv.slots.splice(i, 1);
          }
        }
      }
    }
    this.cleanHotbarRefs();
  }

  // Assign item to hotbar slot
  assignToHotbar(slotIndex, hotbarIndex) {
    if (hotbarIndex < 0 || hotbarIndex >= 6) return;
    const inv = this.gs.inventory;
    if (slotIndex < 0 || slotIndex >= inv.slots.length) return;

    inv.hotbar[hotbarIndex] = inv.slots[slotIndex].itemId;
  }

  // Get current inventory weight in grams
  getCurrentWeight() {
    let weight = 0;
    for (const slot of this.gs.inventory.slots) {
      const itemDef = ITEMS[slot.itemId];
      if (itemDef) {
        weight += itemDef.weight * slot.quantity;
      }
    }
    // Add equipped items
    for (const eqSlot of Object.values(this.gs.inventory.equipped)) {
      if (eqSlot && ITEMS[eqSlot.itemId]) {
        weight += ITEMS[eqSlot.itemId].weight;
      }
    }
    return weight;
  }

  // Get max weight capacity
  getMaxWeight() {
    let capacity = PLAYER.BASE_CARRY;
    // Backpack bonus
    const back = this.gs.inventory.equipped.back;
    if (back && ITEMS[back.itemId] && ITEMS[back.itemId].carryBonus) {
      capacity += ITEMS[back.itemId].carryBonus;
    }
    return capacity;
  }

  // Degrade an equipped weapon/tool condition
  degradeItem(slotIndex, amount) {
    const inv = this.gs.inventory;
    if (slotIndex < 0 || slotIndex >= inv.slots.length) return;
    const slot = inv.slots[slotIndex];
    if (slot.condition === null || slot.condition === undefined) return;

    slot.condition -= amount;

    // Also sync equipped item condition
    const mainHand = inv.equipped.mainHand;
    if (mainHand && mainHand.itemId === slot.itemId) {
      mainHand.condition = slot.condition;
    }

    if (slot.condition <= 0) {
      const itemDef = ITEMS[slot.itemId];
      this.events.emit('item:broken', {
        itemId: slot.itemId,
        name: itemDef ? itemDef.name : slot.itemId,
      });
      // Unequip if equipped
      if (mainHand && mainHand.itemId === slot.itemId) {
        inv.equipped.mainHand = null;
      }
      // Remove from inventory
      inv.slots.splice(slotIndex, 1);
      this.cleanHotbarRefs();
    }
  }

  // Clean up hotbar references to items no longer in inventory
  cleanHotbarRefs() {
    const inv = this.gs.inventory;
    for (let i = 0; i < inv.hotbar.length; i++) {
      if (inv.hotbar[i] && !this.hasItem(inv.hotbar[i])) {
        inv.hotbar[i] = null;
      }
    }
  }

  // Get slot data for UI rendering
  getSlots() {
    return this.gs.inventory.slots.map((slot, index) => {
      const itemDef = ITEMS[slot.itemId];
      return {
        index,
        itemId: slot.itemId,
        quantity: slot.quantity,
        condition: slot.condition,
        name: itemDef ? itemDef.name : slot.itemId,
        icon: itemDef ? itemDef.icon : '?',
        weight: itemDef ? itemDef.weight * slot.quantity : 0,
        actions: itemDef ? itemDef.actions : [],
        category: itemDef ? itemDef.category : 'misc',
      };
    });
  }

  destroy() {}
}
