// UIScene — HUD overlay that renders on top of the game world.
// Runs as a parallel scene to GameScene.
// Contains: stat bars, time display, hotbar, interaction prompt,
// gathering progress, inventory/crafting panels, and death screen.

import Phaser from 'phaser';
import { formatTime } from '../utils/math.js';
import ITEMS from '../config/items.js';
import InventoryUI from '../ui/InventoryUI.js';
import CraftingUI from '../ui/CraftingUI.js';

const BAR_W = 140;
const BAR_H = 10;
const BAR_GAP = 18;
const BAR_X = 20;
const BAR_Y_OFFSET = 100; // From bottom

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  init(data) {
    this.gameState = data.gameState;
    this.gameEvents = data.gameEvents;
    this.inventorySystem = data.inventorySystem;
    this.craftingSystem = data.craftingSystem;
    this.buildingSystem = data.buildingSystem;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // === HUD STAT BARS (bottom left) ===
    this.statBars = {};
    const barStartY = h - BAR_Y_OFFSET;
    const stats = [
      { key: 'health',  label: 'HP',      color: 0xc44040 },
      { key: 'hunger',  label: 'Hunger',  color: 0xd49040 },
      { key: 'thirst',  label: 'Thirst',  color: 0x4080c4 },
      { key: 'fatigue', label: 'Energy',  color: 0x40a050 },
    ];

    stats.forEach((stat, i) => {
      const y = barStartY + i * BAR_GAP;

      // Label
      const label = this.add.text(BAR_X, y - 1, stat.label, {
        fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#888',
      }).setOrigin(0, 1).setDepth(100);

      // Background bar
      const bg = this.add.rectangle(BAR_X + 50, y, BAR_W, BAR_H, 0x1a1c1a)
        .setOrigin(0, 0.5).setDepth(100);
      bg.setStrokeStyle(1, 0x2a2f2a);

      // Fill bar
      const fill = this.add.rectangle(BAR_X + 51, y, BAR_W - 2, BAR_H - 2, stat.color)
        .setOrigin(0, 0.5).setDepth(101);

      // Value text
      const value = this.add.text(BAR_X + 50 + BAR_W + 6, y, '100', {
        fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#999',
      }).setOrigin(0, 0.5).setDepth(100);

      this.statBars[stat.key] = { bg, fill, value, label, baseColor: stat.color };
    });

    // === TIME DISPLAY (top right) ===
    this.dayText = this.add.text(w - 20, 16, 'Day 1', {
      fontFamily: 'Oswald, sans-serif', fontSize: '14px', color: '#c8c8c0',
    }).setOrigin(1, 0).setDepth(100);

    this.timeText = this.add.text(w - 20, 34, '06:00', {
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#aaa',
    }).setOrigin(1, 0).setDepth(100);

    this.seasonText = this.add.text(w - 20, 52, 'Summer', {
      fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#777',
    }).setOrigin(1, 0).setDepth(100);

    // === HOTBAR (bottom center, 6 slots) ===
    this.hotbarSlots = [];
    const hotbarY = h - 30;
    const hotbarStartX = w / 2 - (6 * 52) / 2;

    for (let i = 0; i < 6; i++) {
      const sx = hotbarStartX + i * 52;

      const bg = this.add.rectangle(sx + 24, hotbarY, 48, 48, 0x0a0c0a, 0.85)
        .setStrokeStyle(1, 0x2a2f2a).setDepth(100);

      const numLabel = this.add.text(sx + 4, hotbarY - 22, String(i + 1), {
        fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#555',
      }).setDepth(101);

      const icon = this.add.text(sx + 24, hotbarY, '', {
        fontSize: '22px',
      }).setOrigin(0.5).setDepth(101);

      const count = this.add.text(sx + 44, hotbarY + 18, '', {
        fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#ccc',
      }).setOrigin(1, 1).setDepth(101);

      this.hotbarSlots.push({ bg, icon, count, numLabel });
    }

    this.activeHotbarSlot = 0;

    // === INTERACTION PROMPT (bottom center, above hotbar) ===
    this.interactPrompt = this.add.text(w / 2, h - 70, '', {
      fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#c8c8c0',
      backgroundColor: 'rgba(10, 12, 10, 0.8)',
      padding: { x: 12, y: 4 },
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    // === GATHERING PROGRESS BAR ===
    this.gatherBarBg = this.add.rectangle(w / 2, h - 90, 120, 8, 0x1a1c1a)
      .setStrokeStyle(1, 0x2a2f2a).setDepth(100).setVisible(false);

    this.gatherBarFill = this.add.rectangle(w / 2 - 58, h - 90, 0, 6, 0x4a8a4a)
      .setOrigin(0, 0.5).setDepth(101).setVisible(false);

    // === NOTIFICATION TEXT ===
    this.notifText = this.add.text(w / 2, 60, '', {
      fontFamily: 'Oswald, sans-serif', fontSize: '13px',
      color: 'rgba(255, 255, 255, 0.85)', letterSpacing: 2,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setAlpha(0).setDepth(100);

    // === DEATH SCREEN ELEMENTS (hidden) ===
    this.deathContainer = this.add.container(0, 0).setDepth(300).setVisible(false);

    const deathOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0x0f0505, 0);
    this.deathContainer.add(deathOverlay);
    this.deathOverlay = deathOverlay;

    const deathTitle = this.add.text(w / 2, h / 2 - 60, 'YOU PERISHED', {
      fontFamily: 'Oswald, sans-serif', fontSize: '52px', color: '#8a2020',
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);
    this.deathContainer.add(deathTitle);
    this.deathTitle = deathTitle;

    this.deathCause = this.add.text(w / 2, h / 2, '', {
      fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#aa6060',
    }).setOrigin(0.5).setAlpha(0);
    this.deathContainer.add(this.deathCause);

    this.deathSurvived = this.add.text(w / 2, h / 2 + 30, '', {
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: '#886060',
    }).setOrigin(0.5).setAlpha(0);
    this.deathContainer.add(this.deathSurvived);

    const tryAgain = this.add.text(w / 2, h / 2 + 80, 'TRY AGAIN', {
      fontFamily: 'Oswald, sans-serif', fontSize: '18px', color: '#c44040',
      backgroundColor: 'rgba(20, 8, 8, 0.8)',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setAlpha(0).setInteractive();

    tryAgain.on('pointerover', () => tryAgain.setColor('#ff6060'));
    tryAgain.on('pointerout', () => tryAgain.setColor('#c44040'));
    tryAgain.on('pointerdown', () => {
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });

    this.deathContainer.add(tryAgain);
    this.tryAgainBtn = tryAgain;

    // === INVENTORY UI ===
    this.inventoryUI = new InventoryUI(
      this, this.gameState, this.gameEvents, this.inventorySystem
    );
    this.inventoryUI.create();

    // === CRAFTING UI ===
    this.craftingUI = new CraftingUI(
      this, this.gameState, this.gameEvents, this.craftingSystem
    );
    this.craftingUI.create();

    // === MOODLE STATUS ICONS (right side) ===
    this.moodleIcons = [];
    this.moodleContainer = this.add.container(w - 40, 80).setDepth(100);

    // === EVENT LISTENERS ===
    if (this.gameEvents) {
      // Stat changes
      this.gameEvents.on('stat:changed', (stats) => {
        this.updateStatBars(stats);
      });

      // Notifications
      this.gameEvents.on('game:saved', () => this.showNotification('Game Saved'));
      this.gameEvents.on('item:added', (data) => this.showNotification(`+${data.quantity} ${data.name}`));
      this.gameEvents.on('skill:levelup', (data) => this.showNotification(`${data.skill} leveled up!`));
      this.gameEvents.on('item:broken', (data) => {
        this.showNotification(`${data.name || data.itemId} broke!`);
      });

      // Combat notifications
      this.gameEvents.on('combat:playerHit', (data) => {
        this.showNotification(`Hit! -${data.damage} HP`);
      });
      this.gameEvents.on('injury:added', (data) => {
        this.showNotification(`${data.name}!`);
      });
      this.gameEvents.on('injury:treated', (data) => {
        this.showNotification(`Treated ${data.type}`);
      });
      this.gameEvents.on('animal:died', (data) => {
        this.showNotification(`${data.type} killed`);
      });

      // Moodle system
      this.gameEvents.on('moodle:added', (data) => {
        this.addMoodleIcon(data);
      });
      this.gameEvents.on('moodle:removed', (data) => {
        this.removeMoodleIcon(data.type);
      });

      // Interaction prompt
      this.gameEvents.on('interaction:nearest', (target) => {
        if (target) {
          let text = '[E] Interact';
          switch (target.type) {
            case 'tree': text = '[E] Chop Tree'; break;
            case 'rock': text = '[E] Mine Rock'; break;
            case 'bush': text = '[E] Forage Bush'; break;
            case 'water': text = '[E] Collect Water'; break;
            case 'campfire': text = '[E] Use Campfire'; break;
            case 'carcass': text = '[E] Harvest Carcass'; break;
          }
          this.interactPrompt.setText(text).setAlpha(1);
        } else {
          this.interactPrompt.setAlpha(0);
        }
      });

      // Gathering progress
      this.gameEvents.on('gathering:started', () => {
        this.gatherBarBg.setVisible(true);
        this.gatherBarFill.setVisible(true);
        this.gatherBarFill.width = 0;
      });
      this.gameEvents.on('gathering:progress', (data) => {
        this.gatherBarFill.width = 116 * data.progress;
      });
      this.gameEvents.on('gathering:complete', () => {
        this.gatherBarBg.setVisible(false);
        this.gatherBarFill.setVisible(false);
      });
      this.gameEvents.on('gathering:cancelled', () => {
        this.gatherBarBg.setVisible(false);
        this.gatherBarFill.setVisible(false);
      });

      // Death
      this.gameEvents.on('player:died', (data) => {
        this.showDeathScreen(data.cause);
      });

      // Hotbar selection
      this.gameEvents.on('hotbar:select', (data) => {
        this.activeHotbarSlot = data.slot;
        this.updateHotbar();
      });

      // Weather display (optional)
      this.gameEvents.on('weather:changed', (data) => {
        const weatherNames = {
          clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain',
          heavy_rain: 'Heavy Rain', wind: 'Windy', storm: 'Storm', snow: 'Snow',
        };
        this.showNotification(weatherNames[data.weather] || data.weather);
      });
    }

    // Keyboard toggles for inventory and crafting
    this.input.keyboard.on('keydown-I', () => {
      if (this.craftingUI.visible) this.craftingUI.toggle();
      this.inventoryUI.toggle();
    });
    this.input.keyboard.on('keydown-TAB', (e) => {
      e.preventDefault();
      if (this.craftingUI.visible) this.craftingUI.toggle();
      this.inventoryUI.toggle();
    });
    this.input.keyboard.on('keydown-C', () => {
      if (this.inventoryUI.visible) this.inventoryUI.toggle();
      this.craftingUI.toggle();
    });
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.inventoryUI.visible) this.inventoryUI.toggle();
      if (this.craftingUI.visible) this.craftingUI.toggle();
    });

    console.log('REMNANT UIScene initialized');
  }

  update(time, delta) {
    if (!this.gameState) return;

    // Update time display
    this.dayText.setText(`Day ${this.gameState.time.day}`);
    this.timeText.setText(formatTime(this.gameState.time.hour));
    const seasonName = this.gameState.time.season.charAt(0).toUpperCase()
      + this.gameState.time.season.slice(1);
    this.seasonText.setText(seasonName);

    // Update hotbar
    this.updateHotbar();
  }

  updateStatBars(stats) {
    for (const [key, bar] of Object.entries(this.statBars)) {
      const val = stats[key] !== undefined ? stats[key] : 0;
      const pct = Math.max(0, Math.min(100, val)) / 100;

      bar.fill.width = (BAR_W - 2) * pct;
      bar.value.setText(Math.round(val));

      // Color warning states
      if (key === 'health') {
        if (val < 15) {
          // Blink effect
          bar.fill.setFillStyle(0xff2020, Math.sin(Date.now() * 0.008) * 0.3 + 0.7);
        } else if (val < 30) {
          bar.fill.setFillStyle(0xd43030);
        } else {
          bar.fill.setFillStyle(bar.baseColor);
        }
      }
    }
  }

  updateHotbar() {
    const hotbar = this.gameState.inventory.hotbar;

    for (let i = 0; i < 6; i++) {
      const slot = this.hotbarSlots[i];
      const itemId = hotbar[i];

      // Highlight active slot
      if (i === this.activeHotbarSlot) {
        slot.bg.setStrokeStyle(2, 0x8a8a40);
      } else {
        slot.bg.setStrokeStyle(1, 0x2a2f2a);
      }

      if (itemId && ITEMS[itemId]) {
        const itemDef = ITEMS[itemId];
        slot.icon.setText(itemDef.icon);

        // Count from inventory
        let total = 0;
        for (const s of this.gameState.inventory.slots) {
          if (s.itemId === itemId) total += s.quantity;
        }
        slot.count.setText(total > 0 ? String(total) : '');

        // Clear if no longer in inventory
        if (total === 0) {
          hotbar[i] = null;
          slot.icon.setText('');
          slot.count.setText('');
        }
      } else {
        slot.icon.setText('');
        slot.count.setText('');
      }
    }
  }

  showDeathScreen(cause) {
    const w = this.cameras.main.width;

    this.deathContainer.setVisible(true);

    // Fade in overlay
    this.tweens.add({
      targets: this.deathOverlay,
      fillAlpha: 0.9,
      duration: 1500,
    });

    // Fade in title
    this.tweens.add({
      targets: this.deathTitle,
      alpha: 1,
      delay: 500,
      duration: 1000,
    });

    // Show cause
    this.deathCause.setText(`Cause: ${cause}`);
    this.tweens.add({
      targets: this.deathCause,
      alpha: 1,
      delay: 1200,
      duration: 800,
    });

    // Show survival stats
    const days = this.gameState.time.day;
    this.deathSurvived.setText(`Survived ${days} day${days !== 1 ? 's' : ''}`);
    this.tweens.add({
      targets: this.deathSurvived,
      alpha: 1,
      delay: 1600,
      duration: 800,
    });

    // Show try again button
    this.tweens.add({
      targets: this.tryAgainBtn,
      alpha: 1,
      delay: 2200,
      duration: 600,
    });
  }

  showNotification(text) {
    this.notifText.setText(text).setAlpha(1);
    this.tweens.add({
      targets: this.notifText,
      alpha: 0,
      delay: 2000,
      duration: 500,
    });
  }

  addMoodleIcon(data) {
    // Avoid duplicates
    if (this.moodleIcons.find(m => m.type === data.type)) return;

    const idx = this.moodleIcons.length;
    const y = idx * 28;

    const bg = this.add.rectangle(0, y, 28, 24, 0x0a0c0a, 0.85)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(data.color).color);

    const icon = this.add.text(0, y, data.icon, {
      fontSize: '14px',
    }).setOrigin(0.5);

    this.moodleContainer.add(bg);
    this.moodleContainer.add(icon);

    this.moodleIcons.push({ type: data.type, bg, icon });
  }

  removeMoodleIcon(type) {
    const idx = this.moodleIcons.findIndex(m => m.type === type);
    if (idx < 0) return;

    const moodle = this.moodleIcons[idx];
    moodle.bg.destroy();
    moodle.icon.destroy();
    this.moodleIcons.splice(idx, 1);

    // Reposition remaining moodles
    this.moodleIcons.forEach((m, i) => {
      const y = i * 28;
      m.bg.setY(y);
      m.icon.setY(y);
    });
  }
}
