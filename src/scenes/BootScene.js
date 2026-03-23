// BootScene — Loads/generates all assets before the game starts.
// Delegates programmatic texture generation to utils/textures.js

import Phaser from 'phaser';
import {
  generateTileset,
  generateTreeSprites,
  generateRockSprites,
  generateBushSprites,
  generateCampfireSprite,
  generatePlayerSprites,
  generateAnimalSprites,
  generateUITextures,
} from '../utils/textures.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const barW = 300;
    const barH = 6;
    const barX = (w - barW) / 2;
    const barY = h / 2 + 30;

    // Title
    this.add.text(w / 2, h / 2 - 20, 'REMNANT', {
      fontFamily: 'Oswald, sans-serif',
      fontSize: '48px',
      color: 'rgba(220, 210, 190, 0.8)',
      letterSpacing: 12,
    }).setOrigin(0.5);

    // Loading text
    const loadingText = this.add.text(w / 2, barY + 20, 'Generating world...', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.3)',
    }).setOrigin(0.5);

    // Progress bar background
    this.add.rectangle(w / 2, barY, barW, barH, 0x222222).setOrigin(0.5);
    const progressBar = this.add.rectangle(barX, barY, 0, barH, 0x667755).setOrigin(0, 0.5);

    this.load.on('progress', (value) => {
      progressBar.width = barW * value;
    });

    this.load.on('complete', () => {
      loadingText.setText('Ready');
    });
  }

  create() {
    try {
      // Generate all programmatic textures via the texture utility module
      generateTileset(this);
      generateTreeSprites(this);
      generateRockSprites(this);
      generateBushSprites(this);
      generateCampfireSprite(this);
      generatePlayerSprites(this);
      generateAnimalSprites(this);
      generateUITextures(this);

      // Proceed to menu
      this.scene.start('MenuScene');
    } catch (e) {
      console.error('BootScene.create() CRASH:', e);
      this.add.text(20, 20, 'BOOT ERROR: ' + e.message, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ff4444',
        wordWrap: { width: this.cameras.main.width - 40 },
      });
    }
  }
}
