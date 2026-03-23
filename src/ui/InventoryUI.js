// InventoryUI — Full inventory panel with equipment slots, item grid,
// tooltips, and context menu. Dark panel PZ aesthetic.

import Phaser from 'phaser';
import ITEMS from '../config/items.js';
import { formatWeight } from '../utils/math.js';

const PANEL_BG = 0x0a0c0a;
const PANEL_ALPHA = 0.92;
const BORDER_COLOR = 0x3a3f3a;
const SLOT_SIZE = 48;
const SLOT_GAP = 4;
const GRID_COLS = 5;
const GRID_ROWS = 4;

const EQUIP_SLOTS = ['head', 'torso', 'legs', 'feet', 'hands', 'back', 'mainHand', 'offHand'];
const EQUIP_LABELS = {
  head: 'Head', torso: 'Torso', legs: 'Legs', feet: 'Feet',
  hands: 'Hands', back: 'Back', mainHand: 'Main', offHand: 'Off',
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
    this.selectedSlot = -1;
  }

  create() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    this.container = this.scene.add.container(0, 0).setDepth(200).setVisible(false);

    // Dark overlay background
    const overlay = this.scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6);
    this.container.add(overlay);

    // Main panel
    const panelW = 480;
    const panelH = 380;
    const px = w / 2 - panelW / 2;
    const py = h / 2 - panelH / 2;

    const panel = this.scene.add.rectangle(w / 2, h / 2, panelW, panelH, PANEL_BG, PANEL_ALPHA);
    panel.setStrokeStyle(1, BORDER_COLOR);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(w / 2, py + 16, 'INVENTORY', {
      fontFamily: 'Oswald, sans-serif', fontSize: '18px', color: '#c8c8c0',
      letterSpacing: 3,
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Equipment panel (left side)
    const eqStartX = px + 20;
    const eqStartY = py + 50;

    for (let i = 0; i < EQUIP_SLOTS.length; i++) {
      const slotName = EQUIP_SLOTS[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = eqStartX + col * (SLOT_SIZE + SLOT_GAP + 10);
      const sy = eqStartY + row * (SLOT_SIZE + SLOT_GAP + 4);

      // Slot background
      const slotBg = this.scene.add.rectangle(sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2,
        SLOT_SIZE, SLOT_SIZE, 0x1a1c1a, 0.9);
      slotBg.setStrokeStyle(1, 0x2a2f2a);
      this.container.add(slotBg);

      // Slot label
      const label = this.scene.add.text(sx + SLOT_SIZE / 2, sy - 2,
        EQUIP_LABELS[slotName], {
          fontFamily: 'Inter, sans-serif', fontSize: '8px', color: '#666',
        }).setOrigin(0.5, 1);
      this.container.add(label);

      // Item icon (updated dynamically)
      const icon = this.scene.add.text(sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2, '', {
        fontSize: '22px',
      }).setOrigin(0.5);
      this.container.add(icon);

      this.equipSlotSprites[slotName] = { bg: slotBg, icon };

      // Click handler for unequip
      slotBg.setInteractive();
      slotBg.on('pointerdown', () => {
        if (this.inventory) this.inventory.unequipItem(slotName);
        this.refreshSlots();
      });
    }

    // Item grid (right side)
    const gridStartX = px + 160;
    const gridStartY = py + 50;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        const sx = gridStartX + col * (SLOT_SIZE + SLOT_GAP);
        const sy = gridStartY + row * (SLOT_SIZE + SLOT_GAP);

        const slotBg = this.scene.add.rectangle(sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2,
          SLOT_SIZE, SLOT_SIZE, 0x1a1c1a, 0.9);
        slotBg.setStrokeStyle(1, 0x2a2f2a);
        this.container.add(slotBg);

        const icon = this.scene.add.text(sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2, '', {
          fontSize: '22px',
        }).setOrigin(0.5);
        this.container.add(icon);

        const countText = this.scene.add.text(sx + SLOT_SIZE - 4, sy + SLOT_SIZE - 4, '', {
          fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#ccc',
        }).setOrigin(1, 1);
        this.container.add(countText);

        slotBg.setInteractive();
        const slotIdx = idx;

        slotBg.on('pointerdown', (pointer) => {
          if (pointer.rightButtonDown()) {
            this.showContextMenu(slotIdx, sx + SLOT_SIZE, sy);
          } else {
            this.handleSlotClick(slotIdx);
          }
        });

        slotBg.on('pointerover', () => {
          this.showTooltip(slotIdx, sx + SLOT_SIZE + 8, sy);
        });

        slotBg.on('pointerout', () => {
          this.hideTooltip();
        });

        this.slotSprites.push({ bg: slotBg, icon, count: countText });
      }
    }

    // Weight display
    this.weightText = this.scene.add.text(w / 2, py + panelH - 20, '', {
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#999',
    }).setOrigin(0.5);
    this.container.add(this.weightText);

    // Tooltip container
    this.tooltipContainer = this.scene.add.container(0, 0).setDepth(210).setVisible(false);

    // Context menu container
    this.contextMenu = this.scene.add.container(0, 0).setDepth(215).setVisible(false);
  }

  toggle() {
    this.visible = !this.visible;
    this.container.setVisible(this.visible);
    if (this.visible) {
      this.refreshSlots();
    } else {
      this.hideTooltip();
      this.hideContextMenu();
    }
    this.gameEvents.emit(this.visible ? 'ui:panelOpen' : 'ui:panelClosed', { panel: 'inventory' });
  }

  refreshSlots() {
    const slots = this.gs.inventory.slots;

    // Update grid slots
    for (let i = 0; i < this.slotSprites.length; i++) {
      const sprite = this.slotSprites[i];
      if (i < slots.length) {
        const slot = slots[i];
        const itemDef = ITEMS[slot.itemId];
        sprite.icon.setText(itemDef ? itemDef.icon : '?');
        sprite.count.setText(slot.quantity > 1 ? String(slot.quantity) : '');
        sprite.bg.setStrokeStyle(1, 0x3a3f3a);
      } else {
        sprite.icon.setText('');
        sprite.count.setText('');
        sprite.bg.setStrokeStyle(1, 0x2a2f2a);
      }
    }

    // Update equipment slots
    const equipped = this.gs.inventory.equipped;
    for (const slotName of EQUIP_SLOTS) {
      const eqSprite = this.equipSlotSprites[slotName];
      const eqItem = equipped[slotName];
      if (eqItem && ITEMS[eqItem.itemId]) {
        eqSprite.icon.setText(ITEMS[eqItem.itemId].icon);
      } else {
        eqSprite.icon.setText('');
      }
    }

    // Weight
    if (this.inventory) {
      const current = formatWeight(this.inventory.getCurrentWeight());
      const max = formatWeight(this.inventory.getMaxWeight());
      this.weightText.setText(`${current} / ${max}`);
    }
  }

  handleSlotClick(idx) {
    const slots = this.gs.inventory.slots;
    if (idx >= slots.length) return;

    const slot = slots[idx];
    const itemDef = ITEMS[slot.itemId];
    if (!itemDef) return;

    // Quick action: if food/water, use immediately
    if (itemDef.actions.includes('eat') || itemDef.actions.includes('drink')) {
      this.inventory.useItem(idx);
      this.refreshSlots();
    } else if (itemDef.actions.includes('equip')) {
      this.inventory.equipItem(idx);
      this.refreshSlots();
    }
  }

  showTooltip(slotIdx, x, y) {
    const slots = this.gs.inventory.slots;
    if (slotIdx >= slots.length) return;

    this.hideTooltip();

    const slot = slots[slotIdx];
    const itemDef = ITEMS[slot.itemId];
    if (!itemDef) return;

    const bg = this.scene.add.rectangle(x + 80, y + 40, 160, 80, PANEL_BG, 0.95);
    bg.setStrokeStyle(1, BORDER_COLOR);
    this.tooltipContainer.add(bg);

    const nameText = this.scene.add.text(x + 10, y + 8, itemDef.name, {
      fontFamily: 'Oswald, sans-serif', fontSize: '13px', color: '#d4c8a0',
    });
    this.tooltipContainer.add(nameText);

    const desc = this.scene.add.text(x + 10, y + 26, itemDef.desc || '', {
      fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#888',
      wordWrap: { width: 145 },
    });
    this.tooltipContainer.add(desc);

    const weight = this.scene.add.text(x + 10, y + 60, formatWeight(itemDef.weight), {
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#666',
    });
    this.tooltipContainer.add(weight);

    this.tooltipContainer.setVisible(true);
  }

  hideTooltip() {
    this.tooltipContainer.removeAll(true);
    this.tooltipContainer.setVisible(false);
  }

  showContextMenu(slotIdx, x, y) {
    const slots = this.gs.inventory.slots;
    if (slotIdx >= slots.length) return;

    this.hideContextMenu();

    const slot = slots[slotIdx];
    const itemDef = ITEMS[slot.itemId];
    if (!itemDef) return;

    const actions = [];
    if (itemDef.actions.includes('eat')) actions.push({ label: 'Eat', action: 'eat' });
    if (itemDef.actions.includes('drink')) actions.push({ label: 'Drink', action: 'drink' });
    if (itemDef.actions.includes('equip')) actions.push({ label: 'Equip', action: 'equip' });
    actions.push({ label: 'Drop', action: 'drop' });

    const menuH = actions.length * 22 + 8;
    const bg = this.scene.add.rectangle(x + 40, y + menuH / 2, 80, menuH, PANEL_BG, 0.95);
    bg.setStrokeStyle(1, BORDER_COLOR);
    this.contextMenu.add(bg);

    actions.forEach((a, i) => {
      const txt = this.scene.add.text(x + 8, y + 4 + i * 22, a.label, {
        fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#c8c8c0',
      }).setInteractive();

      txt.on('pointerover', () => txt.setColor('#fff'));
      txt.on('pointerout', () => txt.setColor('#c8c8c0'));
      txt.on('pointerdown', () => {
        this.executeAction(slotIdx, a.action);
        this.hideContextMenu();
      });

      this.contextMenu.add(txt);
    });

    this.contextMenu.setVisible(true);
  }

  hideContextMenu() {
    this.contextMenu.removeAll(true);
    this.contextMenu.setVisible(false);
  }

  executeAction(slotIdx, action) {
    switch (action) {
      case 'eat':
      case 'drink':
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
  }
}
