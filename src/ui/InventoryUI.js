// InventoryUI — Project Zomboid quality full-screen inventory panel
// with body silhouette equipment layout, 24-slot grid, condition bars,
// tooltips, context menu, hotbar assignment, and weight management.

import Phaser from 'phaser';
import ITEMS from '../config/items.js';
import { formatWeight } from '../utils/math.js';

const PANEL_BG = 0x0a0c0a;
const PANEL_ALPHA = 0.94;
const BORDER_COLOR = 0x3a3f3a;
const OVERLAY_COLOR = 0x000000;
const OVERLAY_ALPHA = 0.65;

const SLOT_SIZE = 46;
const SLOT_GAP = 3;
const GRID_COLS = 6;
const GRID_ROWS = 4;
const EQUIP_SLOT_SIZE = 44;

const EQUIP_LAYOUT = {
  head: { row: 0, col: 1.5, label: 'Head' },
  mainHand: { row: 1, col: 0.5, label: 'Main' },
  torso: { row: 1, col: 1.5, label: 'Torso' },
  offHand: { row: 1, col: 2.5, label: 'Off' },
  hands: { row: 2, col: 0.5, label: 'Hands' },
  legs: { row: 2, col: 1.5, label: 'Legs' },
  back: { row: 2, col: 2.5, label: 'Back' },
  feet: { row: 3, col: 1.5, label: 'Feet' },
};

export default class InventoryUI {
  constructor(scene, gameState, gameEvents, inventorySystem) {
    this.scene = scene;
    this.gs = gameState;
    this.gameEvents = gameEvents;
    this.inventory = inventorySystem;

    this.visible = false;
    this.container = null;
    this.slotSprites = [];
    this.equipSlotSprites = {};
    this.tooltipContainer = null;
    this.contextMenu = null;
    this.hotbarSubmenu = null;
    this.weightBar = null;
    this.weightBarFill = null;
    this.weightText = null;
  }

  create() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    this.container = this.scene.add.container(0, 0).setDepth(200).setVisible(false);

    // Full-screen dark overlay
    const overlay = this.scene.add.rectangle(w / 2, h / 2, w, h, OVERLAY_COLOR, OVERLAY_ALPHA);
    overlay.setInteractive();
    overlay.on('pointerdown', () => {
      if (this.visible && !this.contextMenu?.visible && !this.hotbarSubmenu?.visible) {
        this.toggle();
      }
    });
    this.container.add(overlay);

    // Main panel (560x440)
    const panelW = 560;
    const panelH = 440;
    const px = w / 2 - panelW / 2;
    const py = h / 2 - panelH / 2;

    const panel = this.scene.add.rectangle(w / 2, h / 2, panelW, panelH, PANEL_BG, PANEL_ALPHA);
    panel.setStrokeStyle(1, BORDER_COLOR);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(w / 2, py + 20, 'INVENTORY', {
      fontFamily: 'Oswald, sans-serif',
      fontSize: '20px',
      color: '#c8c8c0',
      letterSpacing: 4,
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Close button
    const closeBtn = this.scene.add.text(px + panelW - 20, py + 12, '✕', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '18px',
      color: '#888',
    }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerover', () => closeBtn.setColor('#fff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#888'));
    closeBtn.on('pointerdown', () => this.toggle());
    this.container.add(closeBtn);

    // Equipment panel (left side) - body silhouette layout
    const eqStartX = px + 30;
    const eqStartY = py + 60;
    const eqSpacingX = EQUIP_SLOT_SIZE + 8;
    const eqSpacingY = EQUIP_SLOT_SIZE + 10;

    for (const [slotName, layout] of Object.entries(EQUIP_LAYOUT)) {
      const sx = eqStartX + layout.col * eqSpacingX;
      const sy = eqStartY + layout.row * eqSpacingY;

      // Slot label
      const label = this.scene.add.text(sx + EQUIP_SLOT_SIZE / 2, sy - 2, layout.label, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '8px',
        color: '#666',
      }).setOrigin(0.5, 1);
      this.container.add(label);

      // Slot background (recessed dark)
      const slotBg = this.scene.add.rectangle(
        sx + EQUIP_SLOT_SIZE / 2,
        sy + EQUIP_SLOT_SIZE / 2,
        EQUIP_SLOT_SIZE,
        EQUIP_SLOT_SIZE,
        0x141614,
        0.95
      );
      slotBg.setStrokeStyle(1, 0x28292a);
      this.container.add(slotBg);

      // Item icon
      const icon = this.scene.add.text(
        sx + EQUIP_SLOT_SIZE / 2,
        sy + EQUIP_SLOT_SIZE / 2 - 2,
        '',
        { fontSize: '24px' }
      ).setOrigin(0.5);
      this.container.add(icon);

      // Condition bar (2px tall, at bottom of slot)
      const condBarBg = this.scene.add.rectangle(
        sx + EQUIP_SLOT_SIZE / 2,
        sy + EQUIP_SLOT_SIZE - 4,
        EQUIP_SLOT_SIZE - 6,
        2,
        0x222,
        0.8
      );
      this.container.add(condBarBg);

      const condBarFill = this.scene.add.rectangle(
        sx + 3,
        sy + EQUIP_SLOT_SIZE - 4,
        0,
        2,
        0x4ade80,
        1
      );
      condBarFill.setOrigin(0, 0.5);
      this.container.add(condBarFill);

      this.equipSlotSprites[slotName] = {
        bg: slotBg,
        icon,
        condBarBg,
        condBarFill,
      };

      // Click to unequip
      slotBg.setInteractive();
      slotBg.on('pointerdown', () => {
        if (this.inventory && this.gs.inventory.equipped[slotName]) {
          this.inventory.unequipItem(slotName);
          this.refreshSlots();
        }
      });
    }

    // Item grid (right side) - 6x4 = 24 slots
    const gridStartX = px + 270;
    const gridStartY = py + 60;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        const sx = gridStartX + col * (SLOT_SIZE + SLOT_GAP);
        const sy = gridStartY + row * (SLOT_SIZE + SLOT_GAP);

        // Slot background (recessed)
        const slotBg = this.scene.add.rectangle(
          sx + SLOT_SIZE / 2,
          sy + SLOT_SIZE / 2,
          SLOT_SIZE,
          SLOT_SIZE,
          0x141614,
          0.95
        );
        slotBg.setStrokeStyle(1, 0x28292a);
        this.container.add(slotBg);

        // Item icon
        const icon = this.scene.add.text(
          sx + SLOT_SIZE / 2,
          sy + SLOT_SIZE / 2 - 2,
          '',
          { fontSize: '24px' }
        ).setOrigin(0.5);
        this.container.add(icon);

        // Stack count (bottom-right)
        const countText = this.scene.add.text(sx + SLOT_SIZE - 4, sy + SLOT_SIZE - 4, '', {
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '9px',
          color: '#ccc',
        }).setOrigin(1, 1);
        this.container.add(countText);

        // Condition bar (2px tall, only shown for items with condition)
        const condBarBg = this.scene.add.rectangle(
          sx + SLOT_SIZE / 2,
          sy + SLOT_SIZE - 4,
          SLOT_SIZE - 6,
          2,
          0x222,
          0.8
        );
        condBarBg.setVisible(false);
        this.container.add(condBarBg);

        const condBarFill = this.scene.add.rectangle(
          sx + 3,
          sy + SLOT_SIZE - 4,
          0,
          2,
          0x4ade80,
          1
        );
        condBarFill.setOrigin(0, 0.5);
        condBarFill.setVisible(false);
        this.container.add(condBarFill);

        this.slotSprites.push({
          bg: slotBg,
          icon,
          count: countText,
          condBarBg,
          condBarFill,
          x: sx,
          y: sy,
        });

        // Interactivity
        slotBg.setInteractive();

        slotBg.on('pointerdown', (pointer) => {
          if (pointer.rightButtonDown()) {
            this.showContextMenu(idx, sx + SLOT_SIZE + 5, sy);
          } else {
            this.handleSlotClick(idx);
          }
        });

        slotBg.on('pointerover', () => {
          const tooltipX = sx + SLOT_SIZE + 10;
          const tooltipY = sy;
          this.showTooltip(idx, tooltipX, tooltipY);
        });

        slotBg.on('pointerout', () => {
          this.hideTooltip();
        });
      }
    }

    // Weight display (bottom of panel)
    const weightY = py + panelH - 40;

    const weightLabel = this.scene.add.text(w / 2, weightY - 10, 'CARRY WEIGHT', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '8px',
      color: '#666',
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.container.add(weightLabel);

    // Weight bar background
    this.weightBar = this.scene.add.rectangle(w / 2, weightY + 6, 200, 8, 0x1a1c1a, 0.9);
    this.weightBar.setStrokeStyle(1, 0x2a2f2a);
    this.container.add(this.weightBar);

    // Weight bar fill
    this.weightBarFill = this.scene.add.rectangle(w / 2 - 100, weightY + 6, 0, 8, 0x4ade80, 1);
    this.weightBarFill.setOrigin(0, 0.5);
    this.container.add(this.weightBarFill);

    // Weight text
    this.weightText = this.scene.add.text(w / 2, weightY + 20, '', {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '10px',
      color: '#999',
    }).setOrigin(0.5);
    this.container.add(this.weightText);

    // Tooltip container
    this.tooltipContainer = this.scene.add.container(0, 0).setDepth(210).setVisible(false);

    // Context menu container
    this.contextMenu = this.scene.add.container(0, 0).setDepth(215).setVisible(false);

    // Hotbar submenu container
    this.hotbarSubmenu = this.scene.add.container(0, 0).setDepth(220).setVisible(false);

    // Close context/hotbar menu on outside click
    this.scene.input.on('pointerdown', (pointer) => {
      if (this.contextMenu?.visible || this.hotbarSubmenu?.visible) {
        this.hideContextMenu();
        this.hideHotbarSubmenu();
      }
    });
  }

  toggle() {
    this.visible = !this.visible;
    this.container.setVisible(this.visible);

    if (this.visible) {
      this.refreshSlots();
      this.gameEvents.emit('ui:panelOpen', { panel: 'inventory' });
    } else {
      this.hideTooltip();
      this.hideContextMenu();
      this.hideHotbarSubmenu();
      this.gameEvents.emit('ui:panelClosed', { panel: 'inventory' });
    }
  }

  refreshSlots() {
    if (!this.visible) return;

    const slots = this.gs.inventory.slots || [];

    // Update grid slots
    for (let i = 0; i < this.slotSprites.length; i++) {
      const sprite = this.slotSprites[i];

      if (i < slots.length) {
        const slot = slots[i];
        const itemDef = ITEMS[slot.itemId];

        if (itemDef) {
          sprite.icon.setText(itemDef.icon);
          sprite.count.setText(slot.quantity > 1 ? String(slot.quantity) : '');

          // Condition bar (only if item has condition)
          if (slot.condition !== undefined && itemDef.condition) {
            const ratio = slot.condition / itemDef.condition;
            const barWidth = (SLOT_SIZE - 6) * ratio;
            sprite.condBarFill.setSize(barWidth, 2);
            sprite.condBarFill.setFillStyle(this.getConditionColor(ratio));
            sprite.condBarBg.setVisible(true);
            sprite.condBarFill.setVisible(true);
          } else {
            sprite.condBarBg.setVisible(false);
            sprite.condBarFill.setVisible(false);
          }
        } else {
          sprite.icon.setText('?');
          sprite.count.setText('');
          sprite.condBarBg.setVisible(false);
          sprite.condBarFill.setVisible(false);
        }
      } else {
        sprite.icon.setText('');
        sprite.count.setText('');
        sprite.condBarBg.setVisible(false);
        sprite.condBarFill.setVisible(false);
      }
    }

    // Update equipment slots
    const equipped = this.gs.inventory.equipped || {};

    for (const [slotName, sprite] of Object.entries(this.equipSlotSprites)) {
      const eqItem = equipped[slotName];

      if (eqItem && ITEMS[eqItem.itemId]) {
        const itemDef = ITEMS[eqItem.itemId];
        sprite.icon.setText(itemDef.icon);

        // Condition bar
        if (eqItem.condition !== undefined && itemDef.condition) {
          const ratio = eqItem.condition / itemDef.condition;
          const barWidth = (EQUIP_SLOT_SIZE - 6) * ratio;
          sprite.condBarFill.setSize(barWidth, 2);
          sprite.condBarFill.setFillStyle(this.getConditionColor(ratio));
          sprite.condBarFill.setVisible(true);
        } else {
          sprite.condBarFill.setVisible(false);
        }
      } else {
        sprite.icon.setText('');
        sprite.condBarFill.setVisible(false);
      }
    }

    // Update weight bar
    if (this.inventory) {
      const current = this.inventory.getCurrentWeight();
      const max = this.inventory.getMaxWeight();
      const ratio = current / max;

      const barWidth = 200 * Math.min(ratio, 1);
      this.weightBarFill.setSize(barWidth, 8);

      // Color: green < 50%, yellow 50-80%, red > 80%
      let color = 0x4ade80; // green
      if (ratio > 0.8) color = 0xef4444; // red
      else if (ratio > 0.5) color = 0xfbbf24; // yellow

      this.weightBarFill.setFillStyle(color);

      this.weightText.setText(`${formatWeight(current)} / ${formatWeight(max)}`);
    }
  }

  getConditionColor(ratio) {
    if (ratio > 0.75) return 0x4ade80; // green
    if (ratio > 0.5) return 0xfbbf24; // yellow
    if (ratio > 0.25) return 0xfb923c; // orange
    return 0xef4444; // red
  }

  handleSlotClick(idx) {
    const slots = this.gs.inventory.slots || [];
    if (idx >= slots.length) return;

    const slot = slots[idx];
    const itemDef = ITEMS[slot.itemId];
    if (!itemDef) return;

    // Quick action: eat/drink food, equip equipment
    if (itemDef.actions.includes('eat') || itemDef.actions.includes('drink')) {
      this.inventory.useItem(idx);
      this.refreshSlots();
    } else if (itemDef.actions.includes('equip')) {
      this.inventory.equipItem(idx);
      this.refreshSlots();
    }
  }

  showTooltip(slotIdx, x, y) {
    const slots = this.gs.inventory.slots || [];
    if (slotIdx >= slots.length) return;

    this.hideTooltip();

    const slot = slots[slotIdx];
    const itemDef = ITEMS[slot.itemId];
    if (!itemDef) return;

    const tooltipW = 180;
    const tooltipH = 100;

    // Background
    const bg = this.scene.add.rectangle(x + tooltipW / 2, y + tooltipH / 2, tooltipW, tooltipH, PANEL_BG, 0.96);
    bg.setStrokeStyle(1, BORDER_COLOR);
    this.tooltipContainer.add(bg);

    // Item name (gold, Oswald 13px)
    const nameText = this.scene.add.text(x + 8, y + 8, itemDef.name, {
      fontFamily: 'Oswald, sans-serif',
      fontSize: '13px',
      color: '#d4c8a0',
    });
    this.tooltipContainer.add(nameText);

    // Description (gray, Inter 9px)
    const desc = this.scene.add.text(x + 8, y + 28, itemDef.desc || '', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '9px',
      color: '#888',
      wordWrap: { width: tooltipW - 16 },
    });
    this.tooltipContainer.add(desc);

    let yOffset = y + 50;

    // Weight
    const weightText = this.scene.add.text(x + 8, yOffset, `Weight: ${formatWeight(itemDef.weight)}`, {
      fontFamily: 'Inter, sans-serif',
      fontSize: '9px',
      color: '#666',
    });
    this.tooltipContainer.add(weightText);
    yOffset += 12;

    // Condition
    if (slot.condition !== undefined && itemDef.condition) {
      const condText = this.scene.add.text(x + 8, yOffset, `Condition: ${slot.condition}/${itemDef.condition}`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '9px',
        color: '#666',
      });
      this.tooltipContainer.add(condText);
      yOffset += 12;
    }

    // Equipment stats
    if (itemDef.warmth !== undefined) {
      const warmthText = this.scene.add.text(x + 8, yOffset, `Warmth: ${itemDef.warmth}`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '9px',
        color: '#666',
      });
      this.tooltipContainer.add(warmthText);
      yOffset += 12;
    }

    if (itemDef.protection !== undefined) {
      const protText = this.scene.add.text(x + 8, yOffset, `Protection: ${itemDef.protection}`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '9px',
        color: '#666',
      });
      this.tooltipContainer.add(protText);
      yOffset += 12;
    }

    if (itemDef.damage !== undefined) {
      const dmgText = this.scene.add.text(x + 8, yOffset, `Damage: ${itemDef.damage}`, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '9px',
        color: '#666',
      });
      this.tooltipContainer.add(dmgText);
      yOffset += 12;
    }

    // Food effects
    if (itemDef.effects) {
      const effectLines = [];
      if (itemDef.effects.hunger) effectLines.push(`Hunger ${itemDef.effects.hunger > 0 ? '+' : ''}${itemDef.effects.hunger}`);
      if (itemDef.effects.thirst) effectLines.push(`Thirst ${itemDef.effects.thirst > 0 ? '+' : ''}${itemDef.effects.thirst}`);
      if (itemDef.effects.health) effectLines.push(`Health ${itemDef.effects.health > 0 ? '+' : ''}${itemDef.effects.health}`);

      effectLines.forEach(line => {
        const effText = this.scene.add.text(x + 8, yOffset, line, {
          fontFamily: 'Inter, sans-serif',
          fontSize: '9px',
          color: '#4ade80',
        });
        this.tooltipContainer.add(effText);
        yOffset += 12;
      });
    }

    this.tooltipContainer.setVisible(true);
  }

  hideTooltip() {
    this.tooltipContainer.removeAll(true);
    this.tooltipContainer.setVisible(false);
  }

  showContextMenu(slotIdx, x, y) {
    const slots = this.gs.inventory.slots || [];
    if (slotIdx >= slots.length) return;

    this.hideContextMenu();
    this.hideHotbarSubmenu();

    const slot = slots[slotIdx];
    const itemDef = ITEMS[slot.itemId];
    if (!itemDef) return;

    const actions = [];
    if (itemDef.actions.includes('eat')) actions.push({ label: 'Eat', action: 'eat', slotIdx });
    if (itemDef.actions.includes('drink')) actions.push({ label: 'Drink', action: 'drink', slotIdx });
    if (itemDef.actions.includes('equip')) actions.push({ label: 'Equip', action: 'equip', slotIdx });
    if (itemDef.actions.includes('use')) actions.push({ label: 'Use', action: 'use', slotIdx });
    actions.push({ label: 'Assign to Hotbar >', action: 'hotbar', slotIdx });
    actions.push({ label: 'Drop', action: 'drop', slotIdx });

    const menuW = 140;
    const menuH = actions.length * 24 + 8;

    // Background
    const bg = this.scene.add.rectangle(x + menuW / 2, y + menuH / 2, menuW, menuH, PANEL_BG, 0.96);
    bg.setStrokeStyle(1, BORDER_COLOR);
    bg.setInteractive(); // Prevent clicks from passing through
    this.contextMenu.add(bg);

    actions.forEach((a, i) => {
      const txt = this.scene.add.text(x + 8, y + 4 + i * 24, a.label, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        color: '#c8c8c0',
      }).setInteractive();

      txt.on('pointerover', () => txt.setColor('#fff'));
      txt.on('pointerout', () => txt.setColor('#c8c8c0'));
      txt.on('pointerdown', (pointer) => {
        pointer.stopPropagation();
        if (a.action === 'hotbar') {
          this.showHotbarSubmenu(a.slotIdx, x + menuW, y + i * 24);
        } else {
          this.executeAction(a.slotIdx, a.action);
          this.hideContextMenu();
        }
      });

      this.contextMenu.add(txt);
    });

    this.contextMenu.setVisible(true);
  }

  hideContextMenu() {
    this.contextMenu.removeAll(true);
    this.contextMenu.setVisible(false);
  }

  showHotbarSubmenu(slotIdx, x, y) {
    this.hideHotbarSubmenu();

    const slots = this.gs.inventory.slots || [];
    if (slotIdx >= slots.length) return;

    const slot = slots[slotIdx];
    const hotbar = this.gs.inventory.hotbar || [];

    const menuW = 80;
    const menuH = 6 * 24 + 8;

    // Background
    const bg = this.scene.add.rectangle(x + menuW / 2, y + menuH / 2, menuW, menuH, PANEL_BG, 0.96);
    bg.setStrokeStyle(1, BORDER_COLOR);
    bg.setInteractive();
    this.hotbarSubmenu.add(bg);

    for (let i = 0; i < 6; i++) {
      const assigned = hotbar[i] === slot.itemId;
      const label = `Slot ${i + 1}${assigned ? ' ✓' : ''}`;
      const color = assigned ? '#4ade80' : '#c8c8c0';

      const txt = this.scene.add.text(x + 8, y + 4 + i * 24, label, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        color,
      }).setInteractive();

      txt.on('pointerover', () => txt.setColor('#fff'));
      txt.on('pointerout', () => txt.setColor(color));
      txt.on('pointerdown', (pointer) => {
        pointer.stopPropagation();
        this.assignToHotbar(slotIdx, i);
        this.hideHotbarSubmenu();
        this.hideContextMenu();
      });

      this.hotbarSubmenu.add(txt);
    }

    this.hotbarSubmenu.setVisible(true);
  }

  hideHotbarSubmenu() {
    this.hotbarSubmenu.removeAll(true);
    this.hotbarSubmenu.setVisible(false);
  }

  assignToHotbar(slotIdx, hotbarSlot) {
    const slots = this.gs.inventory.slots || [];
    if (slotIdx >= slots.length) return;

    const slot = slots[slotIdx];
    this.gs.inventory.hotbar[hotbarSlot] = slot.itemId;

    // Emit event for UI updates
    this.gameEvents.emit('hotbar:updated', { slot: hotbarSlot, itemId: slot.itemId });
  }

  executeAction(slotIdx, action) {
    switch (action) {
      case 'eat':
      case 'drink':
      case 'use':
        this.inventory.useItem(slotIdx);
        break;
      case 'equip':
        this.inventory.equipItem(slotIdx);
        break;
      case 'drop':
        this.inventory.dropItem(slotIdx);
        break;
    }
    this.refreshSlots();
  }

  destroy() {
    if (this.container) this.container.destroy();
    if (this.tooltipContainer) this.tooltipContainer.destroy();
    if (this.contextMenu) this.contextMenu.destroy();
    if (this.hotbarSubmenu) this.hotbarSubmenu.destroy();
  }
}
