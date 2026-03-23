// GameScene — Core gameplay scene.
// Orchestrates all game systems, manages the tilemap, and runs the main game loop.
// Each system is a standalone class updated each frame.

import Phaser from 'phaser';
import { TILE, DEPTH } from '../config/constants.js';
import ANIMALS from '../config/animals.js';
import { createDefaultGameState } from '../utils/state.js';

import WorldGen from '../systems/WorldGen.js';
import TileMap from '../world/TileMap.js';
import PlayerSystem from '../systems/PlayerSystem.js';
import SurvivalSystem from '../systems/SurvivalSystem.js';
import TimeSystem from '../systems/TimeSystem.js';
import InteractionSystem from '../systems/InteractionSystem.js';
import InventorySystem from '../systems/InventorySystem.js';
import CraftingSystem from '../systems/CraftingSystem.js';
import BuildingSystem from '../systems/BuildingSystem.js';
import AnimalSystem from '../systems/AnimalSystem.js';
import CombatSystem from '../systems/CombatSystem.js';
import InjurySystem from '../systems/InjurySystem.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.gameOver = false;
  }

  init(data) {
    this.isNewGame = data.newGame !== false;
    this.saveData = data.saveData || null;
  }

  create() {
    this.gameOver = false;

    // Initialize game state
    if (this.isNewGame) {
      this.gameState = createDefaultGameState();
    } else {
      this.gameState = this.saveData;
    }

    // Event bus for inter-system communication
    // Note: cannot use this.events (reserved by Phaser Scene)
    this.gameEvents = new Phaser.Events.EventEmitter();

    // === Initialize systems in dependency order ===

    // 1. World generation
    this.worldGen = new WorldGen(this, this.gameState);
    this.worldGen.generate();

    // 2. Tile map renderer
    this.tileMap = new TileMap(this, this.worldGen);
    this.tileMap.createPools();

    // 3. Inventory system (needed by interaction and crafting)
    this.inventorySystem = new InventorySystem(this, this.gameState);

    // 4. Player system
    this.playerSystem = new PlayerSystem(this, this.gameState, this.worldGen);
    this.playerSystem.create();

    // 5. Survival system
    this.survivalSystem = new SurvivalSystem(this, this.gameState);

    // 6. Time system (day/night, weather)
    this.timeSystem = new TimeSystem(this, this.gameState);
    this.timeSystem.create();

    // 7. Interaction system (gathering)
    this.interactionSystem = new InteractionSystem(
      this, this.gameState, this.worldGen, this.inventorySystem
    );
    this.interactionSystem.create();

    // 8. Crafting system
    this.craftingSystem = new CraftingSystem(
      this, this.gameState, this.inventorySystem, this.worldGen
    );

    // 9. Building system
    this.buildingSystem = new BuildingSystem(
      this, this.gameState, this.worldGen, this.tileMap, this.inventorySystem
    );
    this.buildingSystem.create();

    // 10. Animal system (Phase 2)
    this.animalSystem = new AnimalSystem(this, this.gameState, this.worldGen);
    this.animalSystem.create();

    // 11. Combat system (Phase 2)
    this.combatSystem = new CombatSystem(this, this.gameState, this.inventorySystem);
    this.combatSystem.create();

    // 12. Injury system (Phase 2)
    this.injurySystem = new InjurySystem(this, this.gameState, this.inventorySystem);
    this.injurySystem.create();

    // Render placed structures from save
    this.tileMap.renderPlacedStructures();

    // === Camera setup ===
    const bounds = this.tileMap.getWorldBounds();
    this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.cameras.main.setZoom(1);

    // === Launch UI overlay scene ===
    this.scene.launch('UIScene', {
      gameState: this.gameState,
      gameEvents: this.gameEvents,
      inventorySystem: this.inventorySystem,
      craftingSystem: this.craftingSystem,
      buildingSystem: this.buildingSystem,
    });

    // === Input setup ===
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.keys = this.input.keyboard.addKeys({
      interact: Phaser.Input.Keyboard.KeyCodes.E,
      inventory: Phaser.Input.Keyboard.KeyCodes.I,
      tab: Phaser.Input.Keyboard.KeyCodes.TAB,
      craft: Phaser.Input.Keyboard.KeyCodes.C,
      build: Phaser.Input.Keyboard.KeyCodes.B,
      save: Phaser.Input.Keyboard.KeyCodes.Q,
      sprint: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      sneak: Phaser.Input.Keyboard.KeyCodes.CTRL,
    });

    // Number keys 1-6 for hotbar
    this.hotbarKeys = [];
    for (let i = 0; i < 6; i++) {
      this.hotbarKeys.push(
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE + i)
      );
    }

    // Zoom with scroll wheel
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const cam = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.5, 2);
      cam.setZoom(newZoom);
    });

    // Quick save
    this.keys.save.on('down', () => this.quickSave());

    // Auto save timer (every 5 minutes)
    this.time.addEvent({
      delay: 300000,
      callback: () => this.quickSave(),
      loop: true,
    });

    // === Event listeners ===

    // Handle panel open/close to disable player input
    this.gameEvents.on('ui:panelOpen', () => {
      this.playerSystem.setInputDisabled(true);
    });
    this.gameEvents.on('ui:panelClosed', () => {
      this.playerSystem.setInputDisabled(false);
    });

    // Handle object removal (refresh tilemap)
    this.gameEvents.on('world:objectRemoved', (data) => {
      this.tileMap.refreshTile(data.gx, data.gy);
    });

    // Handle animal attacks on player
    this.gameEvents.on('animal:attack', (data) => {
      this.combatSystem.damagePlayer(data.damage, ANIMALS[data.type]?.name || data.type);
    });

    // Handle death
    this.gameEvents.on('player:died', (data) => {
      this.gameOver = true;
      this.playerSystem.setInputDisabled(true);
    });

    // Handle crafting placeable items (enter build mode)
    this.gameEvents.on('crafting:complete', (data) => {
      const recipe = data.recipe;
      if (recipe.placeable) {
        // Find the output item and determine build type
        const buildType = recipe.output.replace('_kit', '');
        this.buildingSystem.enterBuildMode(buildType, recipe.output);
      }
    });

    // Hotbar selection
    for (let i = 0; i < 6; i++) {
      const idx = i;
      this.hotbarKeys[i].on('down', () => {
        this.gameEvents.emit('hotbar:select', { slot: idx });
        // Equip hotbar item if it references a tool/weapon
        const itemId = this.gameState.inventory.hotbar[idx];
        if (itemId) {
          const slotIdx = this.gameState.inventory.slots.findIndex(s => s.itemId === itemId);
          if (slotIdx >= 0) {
            this.inventorySystem.equipItem(slotIdx);
          }
        }
      });
    }

    console.log('REMNANT GameScene initialized');
  }

  update(time, delta) {
    if (!this.gameState || this.gameOver) return;
    const dt = delta / 1000;

    // Update all active systems in correct order
    this.timeSystem.update(dt);
    this.playerSystem.update(dt);
    this.survivalSystem.update(dt);
    this.interactionSystem.update(dt);
    this.craftingSystem.update(dt);
    this.buildingSystem.update();
    this.animalSystem.update(dt);
    this.combatSystem.update(dt);
    this.injurySystem.update(dt);
    this.tileMap.update();

    // Track total play time
    this.gameState.totalPlayTime += dt;
  }

  async quickSave() {
    const data = { ...this.gameState, timestamp: Date.now() };
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot: 'auto', data }),
      });
      if (res.ok) {
        this.gameEvents.emit('game:saved');
      }
    } catch (e) {
      // Fallback to localStorage
      localStorage.setItem('remnant_save', JSON.stringify(data));
      this.gameEvents.emit('game:saved');
    }
  }

  shutdown() {
    this.worldGen?.destroy();
    this.tileMap?.destroy();
    this.playerSystem?.destroy();
    this.timeSystem?.destroy();
    this.buildingSystem?.destroy();
    this.animalSystem?.destroy();
    this.combatSystem?.destroy();
    this.injurySystem?.destroy();
  }
}
