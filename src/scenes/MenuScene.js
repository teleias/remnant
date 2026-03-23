// MenuScene — Main menu with new game, continue, controls

import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // Title
    this.add.text(w / 2, h * 0.32, 'REMNANT', {
      fontFamily: 'Oswald, sans-serif',
      fontSize: '80px',
      fontStyle: 'bold',
      color: 'rgba(220, 210, 190, 0.85)',
      letterSpacing: 20,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(w / 2, h * 0.32 + 55, 'NATURE RECLAIMS', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.2)',
      letterSpacing: 8,
    }).setOrigin(0.5);

    // Menu buttons
    const buttonY = h * 0.55;
    const buttonGap = 50;

    this.createButton(w / 2, buttonY, 'NEW GAME', () => this.startNewGame());
    this.createButton(w / 2, buttonY + buttonGap, 'CONTINUE', () => this.continueGame());
    this.createButton(w / 2, buttonY + buttonGap * 2, 'CONTROLS', () => this.showControls());

    // Credit
    this.add.text(w / 2, h - 30, 'A game by Christian Claudio', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: 'rgba(255, 255, 255, 0.12)',
      letterSpacing: 3,
    }).setOrigin(0.5);

    // Version
    this.add.text(w - 20, h - 30, 'v0.1.0', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: 'rgba(255, 255, 255, 0.08)',
    }).setOrigin(1, 0.5);
  }

  createButton(x, y, text, callback) {
    const btn = this.add.text(x, y, text, {
      fontFamily: 'Oswald, sans-serif',
      fontSize: '15px',
      color: 'rgba(255, 255, 255, 0.5)',
      letterSpacing: 5,
      padding: { x: 40, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Border (using graphics)
    const gfx = this.add.graphics();
    const bw = btn.width + 80;
    const bh = btn.height + 24;
    gfx.lineStyle(1, 0xffffff, 0.1);
    gfx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);

    btn.on('pointerover', () => {
      btn.setColor('rgba(255, 255, 255, 0.9)');
      gfx.clear();
      gfx.lineStyle(1, 0xffffff, 0.25);
      gfx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
      gfx.fillStyle(0xffffff, 0.03);
      gfx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
    });

    btn.on('pointerout', () => {
      btn.setColor('rgba(255, 255, 255, 0.5)');
      gfx.clear();
      gfx.lineStyle(1, 0xffffff, 0.1);
      gfx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
    });

    btn.on('pointerdown', callback);
    return btn;
  }

  startNewGame() {
    this.scene.start('GameScene', { newGame: true });
  }

  async continueGame() {
    try {
      const res = await fetch('/api/load/auto');
      const json = await res.json();
      if (json.success) {
        this.scene.start('GameScene', { newGame: false, saveData: json.data });
      } else {
        // No save found, start new game
        this.startNewGame();
      }
    } catch (e) {
      // Server unavailable, try localStorage
      const saved = localStorage.getItem('remnant_save');
      if (saved) {
        this.scene.start('GameScene', { newGame: false, saveData: JSON.parse(saved) });
      } else {
        this.startNewGame();
      }
    }
  }

  showControls() {
    // TODO: Create a proper controls overlay scene
    // For now, simple alert
    const controls = [
      'WASD — Move',
      'SHIFT — Sprint',
      'CTRL — Sneak',
      'E — Interact',
      'TAB / I — Inventory',
      'C — Crafting',
      'B — Build Mode',
      'Q — Quick Save',
      '1 through 6 — Hotbar',
      'Right Click — Context Menu',
      'Scroll — Zoom',
    ].join('\n');
    alert('REMNANT CONTROLS\n\n' + controls);
  }
}
