// BuildingSystem — Handles building mode: ghost preview placement,
// grid snapping, validation, and campfire/structure placement.

import { DEPTH, TILE } from '../config/constants.js';
import { gridToScreen, screenToGrid, isoDepth } from '../utils/math.js';

export default class BuildingSystem {
  constructor(scene, gameState, worldGen, tileMap, inventorySystem) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.gameEvents;
    this.worldGen = worldGen;
    this.tileMap = tileMap;
    this.inventory = inventorySystem;

    this.buildMode = false;
    this.buildType = null;       // 'campfire', 'wall_log', etc.
    this.buildItemId = null;     // Inventory item to consume
    this.ghostSprite = null;
    this.ghostGX = 0;
    this.ghostGY = 0;
    this.canPlace = false;
  }

  create() {
    // Create ghost sprite (invisible until build mode)
    this.ghostSprite = this.scene.add.image(0, 0, 'obj_campfire')
      .setOrigin(0.5, 1.0)
      .setAlpha(0.5)
      .setVisible(false)
      .setDepth(DEPTH.ROOF);

    // Listen for build mode toggle
    this.scene.keys.build.on('down', () => {
      if (this.buildMode) {
        this.exitBuildMode();
      }
    });

    // Place on click
    this.scene.input.on('pointerdown', (pointer) => {
      if (!this.buildMode || pointer.rightButtonDown()) return;
      if (this.canPlace) {
        this.placeStructure();
      }
    });
  }

  update() {
    if (!this.buildMode) return;

    // Get mouse position in world space
    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Convert to grid coordinates
    const grid = screenToGrid(worldPoint.x, worldPoint.y);
    this.ghostGX = Math.round(grid.x);
    this.ghostGY = Math.round(grid.y);

    // Update ghost position
    const screenPos = gridToScreen(this.ghostGX, this.ghostGY);
    this.ghostSprite.setPosition(screenPos.x, screenPos.y);
    this.ghostSprite.setDepth(DEPTH.ROOF + isoDepth(this.ghostGX, this.ghostGY));

    // Validate placement
    this.canPlace = this.isValidPlacement(this.ghostGX, this.ghostGY);

    // Tint based on validity
    if (this.canPlace) {
      this.ghostSprite.setTint(0x44ff44);
    } else {
      this.ghostSprite.setTint(0xff4444);
    }
  }

  enterBuildMode(buildType, itemId) {
    this.buildMode = true;
    this.buildType = buildType;
    this.buildItemId = itemId;

    // Set ghost texture based on type
    const texKey = buildType === 'campfire' ? 'obj_campfire' : `obj_${buildType}_0`;
    if (this.scene.textures.exists(texKey)) {
      this.ghostSprite.setTexture(texKey);
    }
    this.ghostSprite.setVisible(true);

    this.events.emit('building:modeEntered', { type: buildType });
  }

  exitBuildMode() {
    this.buildMode = false;
    this.buildType = null;
    this.buildItemId = null;
    this.ghostSprite.setVisible(false);
    this.events.emit('building:modeExited');
  }

  isValidPlacement(gx, gy) {
    // Must be within world bounds
    if (gx < 0 || gy < 0 || gx >= this.worldGen.width || gy >= this.worldGen.height) {
      return false;
    }

    // Must be on walkable tile
    if (!this.worldGen.isWalkable(gx, gy)) {
      return false;
    }

    // Must not have existing object
    if (this.worldGen.getObject(gx, gy)) {
      return false;
    }

    // Must not be on player tile
    const px = Math.round(this.gs.player.gridX);
    const py = Math.round(this.gs.player.gridY);
    if (gx === px && gy === py) {
      return false;
    }

    // Must be within reasonable range of player
    const dx = Math.abs(gx - this.gs.player.gridX);
    const dy = Math.abs(gy - this.gs.player.gridY);
    if (dx > 4 || dy > 4) {
      return false;
    }

    return true;
  }

  placeStructure() {
    if (!this.canPlace || !this.buildType) return;

    // Remove the kit item from inventory
    if (this.buildItemId && this.inventory) {
      const slotIdx = this.gs.inventory.slots.findIndex(
        s => s.itemId === this.buildItemId
      );
      if (slotIdx >= 0) {
        this.inventory.removeItem(slotIdx, 1);
      }
    }

    // Add to world
    this.worldGen.placeObject(this.ghostGX, this.ghostGY, this.buildType);

    // Record in world mods
    this.gs.worldMods.placedStructures.push({
      type: this.buildType,
      x: this.ghostGX,
      y: this.ghostGY,
      hp: 100,
      timestamp: Date.now(),
    });

    // Add visual sprite
    this.tileMap.addStructureSprite(this.ghostGX, this.ghostGY, this.buildType);

    this.events.emit('building:placed', {
      type: this.buildType,
      gx: this.ghostGX,
      gy: this.ghostGY,
    });

    // Exit build mode after placing
    this.exitBuildMode();
  }

  destroy() {
    if (this.ghostSprite) this.ghostSprite.destroy();
  }
}
