// REMNANT — Main Entry Point
// A survival game by Christian Claudio

// Global error handler to surface runtime crashes
window.addEventListener('error', (e) => {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:20px;left:20px;right:20px;color:#ff4444;font:12px monospace;z-index:99999;white-space:pre-wrap;background:#111;padding:16px;border:1px solid #ff4444';
  div.textContent = 'RUNTIME ERROR: ' + e.message + '\n' + (e.filename || '') + ':' + (e.lineno || '') + '\n\n' + (e.error?.stack || '');
  document.body.appendChild(div);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});

import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0a0a0a',
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

export default game;
