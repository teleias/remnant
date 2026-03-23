import Phaser from 'phaser';
import { formatTime } from '../utils/math.js';
import ITEMS from '../config/items.js';
import InventoryUI from '../ui/InventoryUI.js';
import CraftingUI from '../ui/CraftingUI.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });

    this.gameState = null;
    this.gameEvents = null;
    this.inventorySystem = null;
    this.craftingSystem = null;
    this.buildingSystem = null;

    // UI elements
    this.statBars = {};
    this.timeDisplay = null;
    this.weatherDisplay = null;
    this.hotbarSlots = [];
    this.notifications = [];
    this.moodleIcons = [];
    this.interactionPrompt = null;
    this.gatheringBar = null;
    this.deathScreen = null;

    // UI panels
    this.inventoryUI = null;
    this.craftingUI = null;
  }

  init(data) {
    this.gameState = data.gameState;
    this.gameEvents = data.gameEvents;
    this.inventorySystem = data.inventorySystem;
    this.craftingSystem = data.craftingSystem;
    this.buildingSystem = data.buildingSystem;
  }

  create() {
    // Create all UI elements
    this.createStatBars();
    this.createTimeWeatherDisplay();
    this.createHotbar();
    this.createInteractionPrompt();
    this.createGatheringBar();
    this.createMoodleContainer();

    // Create UI panels
    this.inventoryUI = new InventoryUI(this, this.gameState, this.gameEvents, this.inventorySystem);
    this.inventoryUI.create();

    this.craftingUI = new CraftingUI(this, this.gameState, this.gameEvents, this.craftingSystem);
    this.craftingUI.create();

    // Set up event listeners
    this.setupEventListeners();
    this.setupKeyboardInput();
    this.setupResizeHandler();
  }

  createStatBars() {
    const x = 20;
    const startY = this.scale.height - 120;
    const barWidth = 160;
    const barHeight = 14;
    const spacing = 22;

    const stats = [
      { key: 'health', label: 'Health', icon: '❤️', color: 0xff0000, darkColor: 0x990000 },
      { key: 'hunger', label: 'Hunger', icon: '🍖', color: 0xff8800, darkColor: 0xaa5500 },
      { key: 'thirst', label: 'Thirst', icon: '💧', color: 0x0088ff, darkColor: 0x0055aa },
      { key: 'fatigue', label: 'Fatigue', icon: '⚡', color: 0x00ff00, darkColor: 0x00aa00 }
    ];

    stats.forEach((stat, index) => {
      const y = startY + (index * spacing);

      // Create container for this stat bar
      const container = this.add.container(x, y);

      // Icon
      const icon = this.add.text(0, 0, stat.icon, {
        fontSize: '12px',
        align: 'center'
      }).setOrigin(0, 0.5);

      // Background bar (dark with inner shadow effect)
      const bgGraphics = this.add.graphics();
      bgGraphics.fillStyle(0x1a1a1a, 0.8);
      bgGraphics.fillRoundedRect(25, -barHeight/2, barWidth, barHeight, 3);
      bgGraphics.lineStyle(1, 0x0a0a0a, 0.6);
      bgGraphics.strokeRoundedRect(25, -barHeight/2, barWidth, barHeight, 3);

      // Fill bar (gradient effect using multiple rectangles)
      const fillGraphics = this.add.graphics();

      // Value text
      const valueText = this.add.text(barWidth + 30, 0, '100%', {
        fontSize: '11px',
        fontFamily: 'IBM Plex Mono, monospace',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0, 0.5);

      container.add([icon, bgGraphics, fillGraphics, valueText]);

      this.statBars[stat.key] = {
        container,
        fillGraphics,
        valueText,
        color: stat.color,
        darkColor: stat.darkColor,
        value: 100,
        pulseTimer: 0
      };
    });
  }

  updateStatBar(key, value) {
    const bar = this.statBars[key];
    if (!bar) return;

    bar.value = Phaser.Math.Clamp(value, 0, 100);
    bar.valueText.setText(`${Math.floor(bar.value)}%`);

    const barWidth = 160;
    const barHeight = 14;
    const fillWidth = (bar.value / 100) * barWidth;

    // Redraw fill with gradient effect
    bar.fillGraphics.clear();

    if (fillWidth > 0) {
      // Determine color based on value (health gets darker when low)
      let baseColor = bar.color;
      let darkColor = bar.darkColor;

      if (key === 'health' && bar.value < 30) {
        baseColor = 0x880000;
        darkColor = 0x440000;
      }

      // Draw gradient using multiple segments
      const segments = Math.ceil(fillWidth / 2);
      for (let i = 0; i < segments; i++) {
        const segX = 25 + (i * 2);
        const segWidth = Math.min(2, fillWidth - (i * 2));
        const gradient = i / segments;
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(darkColor),
          Phaser.Display.Color.IntegerToColor(baseColor),
          segments,
          i
        );
        const hexColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);

        bar.fillGraphics.fillStyle(hexColor, 0.9);
        bar.fillGraphics.fillRoundedRect(segX, -barHeight/2, segWidth, barHeight, 3);
      }
    }
  }

  createTimeWeatherDisplay() {
    const x = this.scale.width - 20;
    const y = 20;

    const container = this.add.container(x, y);

    // Day text
    const dayText = this.add.text(0, 0, 'Day 1', {
      fontSize: '20px',
      fontFamily: 'Oswald, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(1, 0);

    // Time text
    const timeText = this.add.text(0, 26, '06:00', {
      fontSize: '18px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: '#ffcc88',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0);

    // Season text
    const seasonText = this.add.text(0, 48, 'Spring', {
      fontSize: '14px',
      fontFamily: 'Oswald, sans-serif',
      color: '#88ff88',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0);

    // Weather icon and text
    const weatherIcon = this.add.text(0, 68, '☀️', {
      fontSize: '16px'
    }).setOrigin(1, 0);

    const weatherText = this.add.text(-20, 70, 'Clear', {
      fontSize: '13px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0);

    // Temperature
    const tempText = this.add.text(0, 90, '72°F', {
      fontSize: '13px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: '#ffaa66',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0);

    container.add([dayText, timeText, seasonText, weatherIcon, weatherText, tempText]);

    this.timeDisplay = {
      container,
      dayText,
      timeText,
      seasonText,
      weatherIcon,
      weatherText,
      tempText
    };
  }

  createHotbar() {
    const slotSize = 50;
    const gap = 4;
    const totalWidth = (slotSize * 6) + (gap * 5);
    const startX = (this.scale.width / 2) - (totalWidth / 2);
    const y = this.scale.height - 80;

    for (let i = 0; i < 6; i++) {
      const x = startX + (i * (slotSize + gap));

      const container = this.add.container(x, y);

      // Slot background
      const bg = this.add.graphics();
      bg.fillStyle(0x2a2a2a, 0.85);
      bg.fillRoundedRect(0, 0, slotSize, slotSize, 4);
      bg.lineStyle(2, 0x1a1a1a, 0.9);
      bg.strokeRoundedRect(0, 0, slotSize, slotSize, 4);

      // Highlight border (hidden by default)
      const highlight = this.add.graphics();
      highlight.lineStyle(2, 0xffaa00, 1);
      highlight.strokeRoundedRect(-1, -1, slotSize + 2, slotSize + 2, 4);
      highlight.setVisible(false);

      // Number label
      const numberText = this.add.text(4, 4, String(i + 1), {
        fontSize: '11px',
        fontFamily: 'IBM Plex Mono, monospace',
        color: '#888888',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0, 0);

      // Item icon (emoji)
      const iconText = this.add.text(slotSize / 2, slotSize / 2 - 4, '', {
        fontSize: '24px'
      }).setOrigin(0.5, 0.5);

      // Stack count
      const countText = this.add.text(slotSize - 4, slotSize - 4, '', {
        fontSize: '11px',
        fontFamily: 'IBM Plex Mono, monospace',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(1, 1);

      // Condition bar
      const conditionBg = this.add.graphics();
      conditionBg.fillStyle(0x1a1a1a, 0.7);
      conditionBg.fillRect(2, slotSize - 6, slotSize - 4, 2);

      const conditionFill = this.add.graphics();

      container.add([bg, highlight, numberText, iconText, countText, conditionBg, conditionFill]);

      this.hotbarSlots.push({
        container,
        highlight,
        iconText,
        countText,
        conditionFill,
        slotSize
      });
    }
  }

  updateHotbar() {
    if (!this.gameState || !this.gameState.inventory) return;

    const hotbar = this.gameState.inventory.hotbar || [];

    this.hotbarSlots.forEach((slot, index) => {
      const itemId = hotbar[index]; // hotbar stores string itemIds or null

      if (itemId) {
        const itemDef = ITEMS[itemId];
        // Find the inventory slot for this item to get quantity/condition
        const invSlot = this.gameState.inventory.slots.find(s => s.itemId === itemId);

        if (itemDef) {
          slot.iconText.setText(itemDef.icon || '?');
          slot.countText.setText(invSlot && invSlot.quantity > 1 ? String(invSlot.quantity) : '');

          // Update condition bar
          const condition = invSlot?.condition !== undefined && invSlot?.condition !== null
            ? invSlot.condition : -1;

          slot.conditionFill.clear();
          if (condition >= 0) {
            const maxCond = itemDef.condition || 100;
            const conditionWidth = ((slot.slotSize - 4) * condition) / maxCond;

            let color = 0x00ff00; // green
            if (condition / maxCond < 0.3) color = 0xff0000; // red
            else if (condition / maxCond < 0.6) color = 0xffaa00; // yellow

            slot.conditionFill.fillStyle(color, 0.8);
            slot.conditionFill.fillRect(2, slot.slotSize - 6, conditionWidth, 2);
          }
        } else {
          slot.iconText.setText('');
          slot.countText.setText('');
          slot.conditionFill.clear();
        }
      } else {
        slot.iconText.setText('');
        slot.countText.setText('');
        slot.conditionFill.clear();
      }

      // Update highlight
      const isSelected = this.gameState.inventory.selectedSlot === index;
      slot.highlight.setVisible(isSelected);
    });
  }

  createInteractionPrompt() {
    const container = this.add.container(this.scale.width / 2, this.scale.height - 120);
    container.setAlpha(0);
    container.setVisible(false);

    const bg = this.add.graphics();
    const text = this.add.text(0, 0, '', {
      fontSize: '14px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5);

    container.add([bg, text]);

    this.interactionPrompt = { container, bg, text };
  }

  showInteractionPrompt(message) {
    if (!this.interactionPrompt) return;

    this.interactionPrompt.text.setText(message);

    const padding = 12;
    const width = this.interactionPrompt.text.width + (padding * 2);
    const height = this.interactionPrompt.text.height + (padding * 2);

    this.interactionPrompt.bg.clear();
    this.interactionPrompt.bg.fillStyle(0x000000, 0.7);
    this.interactionPrompt.bg.fillRoundedRect(-width/2, -height/2, width, height, 8);
    this.interactionPrompt.bg.lineStyle(1, 0x444444, 0.8);
    this.interactionPrompt.bg.strokeRoundedRect(-width/2, -height/2, width, height, 8);

    this.interactionPrompt.container.setVisible(true);
    this.tweens.add({
      targets: this.interactionPrompt.container,
      alpha: 1,
      duration: 200,
      ease: 'Power2'
    });
  }

  hideInteractionPrompt() {
    if (!this.interactionPrompt) return;

    this.tweens.add({
      targets: this.interactionPrompt.container,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.interactionPrompt.container.setVisible(false);
      }
    });
  }

  createGatheringBar() {
    const width = 140;
    const height = 10;
    const container = this.add.container(this.scale.width / 2, this.scale.height - 140);
    container.setAlpha(0);
    container.setVisible(false);

    const labelText = this.add.text(0, -16, '', {
      fontSize: '12px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 0.85);
    bg.fillRoundedRect(-width/2, -height/2, width, height, 3);
    bg.lineStyle(1, 0x444444, 0.9);
    bg.strokeRoundedRect(-width/2, -height/2, width, height, 3);

    const fill = this.add.graphics();

    container.add([labelText, bg, fill]);

    this.gatheringBar = { container, labelText, fill, width, height, progress: 0 };
  }

  updateGatheringBar(progress, label) {
    if (!this.gatheringBar) return;

    this.gatheringBar.progress = Phaser.Math.Clamp(progress, 0, 1);
    this.gatheringBar.labelText.setText(label || 'Gathering...');

    const fillWidth = this.gatheringBar.width * this.gatheringBar.progress;

    this.gatheringBar.fill.clear();
    if (fillWidth > 0) {
      this.gatheringBar.fill.fillStyle(0x00ff00, 0.8);
      this.gatheringBar.fill.fillRoundedRect(
        -this.gatheringBar.width/2,
        -this.gatheringBar.height/2,
        fillWidth,
        this.gatheringBar.height,
        3
      );
    }
  }

  showGatheringBar() {
    if (!this.gatheringBar) return;

    this.gatheringBar.container.setVisible(true);
    this.tweens.add({
      targets: this.gatheringBar.container,
      alpha: 1,
      duration: 200,
      ease: 'Power2'
    });
  }

  hideGatheringBar() {
    if (!this.gatheringBar) return;

    this.tweens.add({
      targets: this.gatheringBar.container,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.gatheringBar.container.setVisible(false);
        this.gatheringBar.progress = 0;
      }
    });
  }

  createMoodleContainer() {
    this.moodleContainer = this.add.container(this.scale.width - 20, 130);
  }

  addNotification(message, color = '#ffffff') {
    const maxNotifications = 5;

    // Remove oldest notification if at max
    if (this.notifications.length >= maxNotifications) {
      const oldest = this.notifications.shift();
      this.tweens.add({
        targets: oldest.container,
        alpha: 0,
        duration: 200,
        onComplete: () => oldest.container.destroy()
      });
    }

    // Shift existing notifications down
    this.notifications.forEach((notif, index) => {
      this.tweens.add({
        targets: notif.container,
        y: 60 + (index * 40),
        duration: 300,
        ease: 'Power2'
      });
    });

    // Create new notification
    const y = 60 + (this.notifications.length * 40);
    const container = this.add.container(this.scale.width / 2, 20);
    container.setAlpha(0);

    const text = this.add.text(0, 0, message, {
      fontSize: '14px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5);

    const padding = 10;
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRoundedRect(
      -text.width/2 - padding,
      -text.height/2 - padding,
      text.width + padding * 2,
      text.height + padding * 2,
      6
    );

    container.add([bg, text]);

    // Slide in from top
    this.tweens.add({
      targets: container,
      y: y,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    const notification = { container, text, bg };
    this.notifications.push(notification);

    // Auto-fade after 3 seconds
    this.time.delayedCall(3000, () => {
      const index = this.notifications.indexOf(notification);
      if (index !== -1) {
        this.notifications.splice(index, 1);

        // Shift remaining notifications
        this.notifications.forEach((notif, i) => {
          this.tweens.add({
            targets: notif.container,
            y: 60 + (i * 40),
            duration: 300,
            ease: 'Power2'
          });
        });
      }

      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        onComplete: () => container.destroy()
      });
    });
  }

  addMoodle(type, name, icon, color) {
    // Check if moodle already exists
    const existing = this.moodleIcons.find(m => m.type === type);
    if (existing) return;

    const y = this.moodleIcons.length * 38;
    const container = this.add.container(0, y);
    container.setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x2a2a2a, 0.85);
    bg.fillRoundedRect(-36, -16, 32, 32, 4);
    bg.lineStyle(2, color, 0.9);
    bg.strokeRoundedRect(-36, -16, 32, 32, 4);

    const iconText = this.add.text(-20, 0, icon, {
      fontSize: '18px'
    }).setOrigin(0.5, 0.5);

    container.add([bg, iconText]);
    this.moodleContainer.add(container);

    // Fade in
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });

    this.moodleIcons.push({ type, container, name });
  }

  removeMoodle(type) {
    const index = this.moodleIcons.findIndex(m => m.type === type);
    if (index === -1) return;

    const moodle = this.moodleIcons[index];

    // Fade out and remove
    this.tweens.add({
      targets: moodle.container,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        moodle.container.destroy();
      }
    });

    this.moodleIcons.splice(index, 1);

    // Reposition remaining moodles
    this.moodleIcons.forEach((m, i) => {
      this.tweens.add({
        targets: m.container,
        y: i * 38,
        duration: 300,
        ease: 'Power2'
      });
    });
  }

  showDeathScreen(deathData) {
    // Create full-screen overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x440000, 0);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);
    overlay.setDepth(1000);

    // Fade in overlay
    this.tweens.add({
      targets: overlay,
      alpha: 0.85,
      duration: 1500,
      ease: 'Power2'
    });

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // "YOU PERISHED" text
    const titleText = this.add.text(centerX, centerY - 80, 'YOU PERISHED', {
      fontSize: '64px',
      fontFamily: 'Oswald, sans-serif',
      color: '#aa0000',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5, 0.5).setAlpha(0).setDepth(1001);

    this.time.delayedCall(500, () => {
      this.tweens.add({
        targets: titleText,
        alpha: 1,
        duration: 1000,
        ease: 'Power2'
      });
    });

    // Death details
    const causeText = this.add.text(centerX, centerY, `Cause: ${deathData.cause || 'Unknown'}`, {
      fontSize: '20px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5).setAlpha(0).setDepth(1001);

    const daysText = this.add.text(centerX, centerY + 35, `Survived ${deathData.day || 1} days`, {
      fontSize: '18px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: '#cccccc',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5).setAlpha(0).setDepth(1001);

    const timeText = this.add.text(centerX, centerY + 60, `Total time: ${Math.floor((deathData.playTime || 0) / 60)} minutes`, {
      fontSize: '16px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5).setAlpha(0).setDepth(1001);

    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: [causeText, daysText, timeText],
        alpha: 1,
        duration: 800,
        ease: 'Power2'
      });
    });

    // Try Again button
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x880000, 0.9);
    buttonBg.fillRoundedRect(centerX - 100, centerY + 110, 200, 50, 8);
    buttonBg.lineStyle(2, 0xff0000, 0.8);
    buttonBg.strokeRoundedRect(centerX - 100, centerY + 110, 200, 50, 8);
    buttonBg.setAlpha(0).setDepth(1001).setInteractive(
      new Phaser.Geom.Rectangle(centerX - 100, centerY + 110, 200, 50),
      Phaser.Geom.Rectangle.Contains
    );

    const buttonText = this.add.text(centerX, centerY + 135, 'TRY AGAIN', {
      fontSize: '20px',
      fontFamily: 'Oswald, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5).setAlpha(0).setDepth(1002);

    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: [buttonBg, buttonText],
        alpha: 1,
        duration: 600,
        ease: 'Power2'
      });
    });

    // Button hover effect
    buttonBg.on('pointerover', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0xaa0000, 1);
      buttonBg.fillRoundedRect(centerX - 100, centerY + 110, 200, 50, 8);
      buttonBg.lineStyle(2, 0xff4444, 1);
      buttonBg.strokeRoundedRect(centerX - 100, centerY + 110, 200, 50, 8);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x880000, 0.9);
      buttonBg.fillRoundedRect(centerX - 100, centerY + 110, 200, 50, 8);
      buttonBg.lineStyle(2, 0xff0000, 0.8);
      buttonBg.strokeRoundedRect(centerX - 100, centerY + 110, 200, 50, 8);
    });

    // Button click - return to menu
    buttonBg.on('pointerdown', () => {
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });

    this.deathScreen = {
      overlay,
      titleText,
      causeText,
      daysText,
      timeText,
      buttonBg,
      buttonText
    };
  }

  setupEventListeners() {
    if (!this.gameEvents) return;

    this.gameEvents.on('stat:changed', (stats) => {
      if (stats.health !== undefined) this.updateStatBar('health', stats.health);
      if (stats.hunger !== undefined) this.updateStatBar('hunger', stats.hunger);
      if (stats.thirst !== undefined) this.updateStatBar('thirst', stats.thirst);
      if (stats.fatigue !== undefined) this.updateStatBar('fatigue', stats.fatigue);
    });

    this.gameEvents.on('game:saved', () => {
      this.addNotification('Game Saved', '#44ff88');
    });

    this.gameEvents.on('item:added', (data) => {
      this.addNotification(`+${data.quantity} ${data.name}`, '#ffffff');
    });

    this.gameEvents.on('skill:levelup', (data) => {
      this.addNotification(`${data.skill} Level Up!`, '#ffcc44');
    });

    this.gameEvents.on('item:broken', (data) => {
      this.addNotification(`${data.name} broke!`, '#ff8844');
    });

    this.gameEvents.on('combat:playerHit', (data) => {
      this.addNotification(`-${data.damage} HP`, '#ff4444');
    });

    this.gameEvents.on('injury:added', (data) => {
      this.addNotification(`Injury: ${data.name}`, '#ff8844');
    });

    this.gameEvents.on('injury:treated', (data) => {
      this.addNotification(`Treated ${data.type}`, '#44ff88');
    });

    this.gameEvents.on('animal:died', (data) => {
      this.addNotification(`Killed ${data.type}`, '#ffcc44');
    });

    this.gameEvents.on('moodle:added', (data) => {
      this.addMoodle(data.type, data.name, data.icon, data.color);
    });

    this.gameEvents.on('moodle:removed', (data) => {
      this.removeMoodle(data.type);
    });

    this.gameEvents.on('interaction:nearest', (target) => {
      if (target && target.type) {
        const actionMap = {
          tree: 'Chop Tree',
          rock: 'Mine Rock',
          bush: 'Gather Berries',
          water: 'Collect Water',
          campfire: 'Use Campfire',
          carcass: 'Harvest Carcass'
        };
        const action = actionMap[target.type] || 'Interact';
        this.showInteractionPrompt(`[E] ${action}`);
      } else {
        this.hideInteractionPrompt();
      }
    });

    this.gameEvents.on('gathering:started', () => {
      this.showGatheringBar();
    });

    this.gameEvents.on('gathering:progress', (data) => {
      const actionMap = {
        tree: 'Chopping Tree...',
        rock: 'Mining Rock...',
        bush: 'Gathering...',
        water: 'Collecting Water...',
        carcass: 'Harvesting...'
      };
      const label = actionMap[data.type] || 'Gathering...';
      this.updateGatheringBar(data.progress, label);
    });

    this.gameEvents.on('gathering:complete', () => {
      this.hideGatheringBar();
    });

    this.gameEvents.on('gathering:cancelled', () => {
      this.hideGatheringBar();
    });

    this.gameEvents.on('player:died', (data) => {
      this.showDeathScreen(data);
    });

    this.gameEvents.on('hotbar:select', (data) => {
      if (this.gameState && this.gameState.inventory) {
        this.gameState.inventory.selectedSlot = data.slot;
        this.updateHotbar();
      }
    });

    this.gameEvents.on('weather:changed', (data) => {
      this.updateWeather(data.weather, data.temperature);
    });
  }

  setupKeyboardInput() {
    this.input.keyboard.on('keydown-I', () => {
      this.toggleInventory();
    });

    this.input.keyboard.on('keydown-TAB', (e) => {
      e.preventDefault();
      this.toggleInventory();
    });

    this.input.keyboard.on('keydown-C', () => {
      this.toggleCrafting();
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.inventoryUI && this.inventoryUI.visible) {
        this.inventoryUI.toggle();
        this.gameEvents.emit('ui:panelClosed');
      }
      if (this.craftingUI && this.craftingUI.isVisible) {
        this.craftingUI.toggle();
        this.gameEvents.emit('ui:panelClosed');
      }
    });
  }

  toggleInventory() {
    if (!this.inventoryUI) return;

    // Close crafting if open
    if (this.craftingUI && this.craftingUI.isVisible) {
      this.craftingUI.toggle();
    }

    this.inventoryUI.toggle();

    if (this.inventoryUI.visible) {
      this.gameEvents.emit('ui:panelOpen');
    } else {
      this.gameEvents.emit('ui:panelClosed');
    }
  }

  toggleCrafting() {
    if (!this.craftingUI) return;

    // Close inventory if open
    if (this.inventoryUI && this.inventoryUI.visible) {
      this.inventoryUI.toggle();
    }

    this.craftingUI.toggle();

    if (this.craftingUI.isVisible) {
      this.gameEvents.emit('ui:panelOpen');
    } else {
      this.gameEvents.emit('ui:panelClosed');
    }
  }

  setupResizeHandler() {
    this.scale.on('resize', this.handleResize, this);
  }

  handleResize(gameSize) {
    const { width, height } = gameSize;

    // Reposition stat bars (bottom-left)
    const startY = height - 120;
    Object.values(this.statBars).forEach((bar, index) => {
      bar.container.setPosition(20, startY + (index * 22));
    });

    // Reposition time/weather display (top-right)
    if (this.timeDisplay) {
      this.timeDisplay.container.setPosition(width - 20, 20);
    }

    // Reposition hotbar (bottom-center)
    const slotSize = 50;
    const gap = 4;
    const totalWidth = (slotSize * 6) + (gap * 5);
    const startX = (width / 2) - (totalWidth / 2);
    this.hotbarSlots.forEach((slot, index) => {
      slot.container.setPosition(startX + (index * (slotSize + gap)), height - 80);
    });

    // Reposition interaction prompt
    if (this.interactionPrompt) {
      this.interactionPrompt.container.setPosition(width / 2, height - 120);
    }

    // Reposition gathering bar
    if (this.gatheringBar) {
      this.gatheringBar.container.setPosition(width / 2, height - 140);
    }

    // Reposition moodle container
    if (this.moodleContainer) {
      this.moodleContainer.setPosition(width - 20, 130);
    }

    // Reposition death screen if visible
    if (this.deathScreen) {
      const centerX = width / 2;
      const centerY = height / 2;

      this.deathScreen.overlay.clear();
      this.deathScreen.overlay.fillStyle(0x440000, 0.85);
      this.deathScreen.overlay.fillRect(0, 0, width, height);

      this.deathScreen.titleText.setPosition(centerX, centerY - 80);
      this.deathScreen.causeText.setPosition(centerX, centerY);
      this.deathScreen.daysText.setPosition(centerX, centerY + 35);
      this.deathScreen.timeText.setPosition(centerX, centerY + 60);

      this.deathScreen.buttonBg.setPosition(centerX - 100, centerY + 110);
      this.deathScreen.buttonText.setPosition(centerX, centerY + 135);
    }
  }

  updateWeather(weather, temperature) {
    if (!this.timeDisplay) return;

    const weatherIcons = {
      clear: '☀️',
      cloudy: '☁️',
      rain: '🌧️',
      heavy_rain: '🌧️',
      snow: '❄️',
      wind: '💨',
      storm: '⛈️'
    };

    const weatherNames = {
      clear: 'Clear',
      cloudy: 'Cloudy',
      rain: 'Rain',
      heavy_rain: 'Heavy Rain',
      snow: 'Snow',
      wind: 'Windy',
      storm: 'Storm'
    };

    this.timeDisplay.weatherIcon.setText(weatherIcons[weather] || '☀️');
    this.timeDisplay.weatherText.setText(weatherNames[weather] || 'Clear');
    this.timeDisplay.tempText.setText(`${Math.round(temperature)}°F`);
  }

  update(time, delta) {
    // Update time display
    if (this.gameState && this.timeDisplay) {
      const day = this.gameState.time?.day || 1;
      const currentTime = formatTime(this.gameState.time?.hour ?? 6);
      const season = this.gameState.time?.season || 'Summer';

      this.timeDisplay.dayText.setText(`Day ${day}`);
      this.timeDisplay.timeText.setText(currentTime);
      this.timeDisplay.seasonText.setText(season);
    }

    // Update hotbar
    this.updateHotbar();

    // Health bar pulse effect when low
    if (this.statBars.health && this.statBars.health.value < 15) {
      this.statBars.health.pulseTimer += delta;
      if (this.statBars.health.pulseTimer > 500) {
        this.statBars.health.pulseTimer = 0;
        const currentAlpha = this.statBars.health.fillGraphics.alpha;
        this.tweens.add({
          targets: this.statBars.health.fillGraphics,
          alpha: currentAlpha > 0.7 ? 0.4 : 1,
          duration: 250,
          ease: 'Sine.easeInOut'
        });
      }
    }
  }
}
