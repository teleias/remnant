// TileMap — Isometric tile renderer with viewport culling and sprite pooling
// Renders ground tiles and world objects (trees, rocks, bushes) as Phaser sprites

import { TILE, DEPTH } from '../config/constants.js';
import { gridToScreen, screenToGrid, isoDepth } from '../utils/math.js';

const POOL_TILES = 1400;
const POOL_OBJECTS = 500;
const TILE_PAD = 3;  // Extra tiles to render beyond viewport edge

export default class TileMap {
  constructor(scene, worldGen) {
    this.scene = scene;
    this.worldGen = worldGen;

    this.tilePool = [];
    this.objectPool = [];
    this.activeTiles = new Map();    // "x,y" -> sprite
    this.activeObjects = new Map();  // "x,y" -> sprite

    this.lastMinGX = -1;
    this.lastMinGY = -1;
    this.lastMaxGX = -1;
    this.lastMaxGY = -1;

    // Container for all tile/object sprites for efficient management
    this.groundLayer = scene.add.group();
    this.objectLayer = scene.add.group();
  }

  createPools() {
    // Pre-allocate tile sprites (reusable, never destroyed)
    for (let i = 0; i < POOL_TILES; i++) {
      const sprite = this.scene.add.image(0, 0, 'tile_grass_0')
        .setVisible(false)
        .setActive(false)
        .setOrigin(0.5, 0.5);
      this.tilePool.push(sprite);
    }

    // Pre-allocate object sprites
    for (let i = 0; i < POOL_OBJECTS; i++) {
      const sprite = this.scene.add.image(0, 0, 'obj_tree_0')
        .setVisible(false)
        .setActive(false)
        .setOrigin(0.5, 1.0);  // Bottom center for trees/rocks
      this.objectPool.push(sprite);
    }
  }

  update() {
    const camera = this.scene.cameras.main;
    const view = camera.worldView;

    // Convert viewport corners to grid space with padding
    const topLeft = screenToGrid(view.x - TILE.WIDTH, view.y - TILE.HEIGHT);
    const topRight = screenToGrid(view.x + view.width + TILE.WIDTH, view.y - TILE.HEIGHT);
    const bottomLeft = screenToGrid(view.x - TILE.WIDTH, view.y + view.height + TILE.HEIGHT);
    const bottomRight = screenToGrid(view.x + view.width + TILE.WIDTH, view.y + view.height + TILE.HEIGHT);

    // Compute grid bounds (iso grid is rotated, so we need min/max across all corners)
    let minGX = Math.floor(Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)) - TILE_PAD;
    let maxGX = Math.ceil(Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)) + TILE_PAD;
    let minGY = Math.floor(Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)) - TILE_PAD;
    let maxGY = Math.ceil(Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)) + TILE_PAD;

    // Clamp to world bounds
    minGX = Math.max(0, minGX);
    minGY = Math.max(0, minGY);
    maxGX = Math.min(this.worldGen.width - 1, maxGX);
    maxGY = Math.min(this.worldGen.height - 1, maxGY);

    // Skip update if bounds haven't changed
    if (minGX === this.lastMinGX && minGY === this.lastMinGY &&
        maxGX === this.lastMaxGX && maxGY === this.lastMaxGY) {
      return;
    }

    this.lastMinGX = minGX;
    this.lastMinGY = minGY;
    this.lastMaxGX = maxGX;
    this.lastMaxGY = maxGY;

    // Build set of visible tile keys
    const visibleKeys = new Set();
    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        visibleKeys.add(`${gx},${gy}`);
      }
    }

    // Return tiles that are no longer visible
    for (const [key, sprite] of this.activeTiles) {
      if (!visibleKeys.has(key)) {
        sprite.setVisible(false).setActive(false);
        this.tilePool.push(sprite);
        this.activeTiles.delete(key);
      }
    }

    // Return objects that are no longer visible
    for (const [key, sprite] of this.activeObjects) {
      if (!visibleKeys.has(key)) {
        sprite.setVisible(false).setActive(false);
        this.objectPool.push(sprite);
        this.activeObjects.delete(key);
      }
    }

    // Activate tiles that are now visible
    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        const key = `${gx},${gy}`;

        // Ground tile
        if (!this.activeTiles.has(key)) {
          const tileType = this.worldGen.getTileType(gx, gy);
          if (!tileType) continue;

          const variant = this.worldGen.getTileVariant(gx, gy);
          const textureName = this.getTextureName(tileType, variant);
          const sprite = this.getTileFromPool();
          if (!sprite) continue;

          const pos = gridToScreen(gx, gy);
          sprite.setTexture(textureName)
            .setPosition(pos.x, pos.y)
            .setDepth(DEPTH.GROUND + isoDepth(gx, gy))
            .setVisible(true)
            .setActive(true);

          this.activeTiles.set(key, sprite);
        }

        // Object sprite
        if (!this.activeObjects.has(key)) {
          const obj = this.worldGen.getObject(gx, gy);
          if (!obj) continue;

          const textureName = this.getObjectTexture(obj);
          const sprite = this.getObjectFromPool();
          if (!sprite) continue;

          const pos = gridToScreen(gx, gy);
          sprite.setTexture(textureName)
            .setPosition(pos.x, pos.y)
            .setDepth(DEPTH.OBJECTS + isoDepth(gx, gy))
            .setVisible(true)
            .setActive(true);

          this.activeObjects.set(key, sprite);
        }
      }
    }
  }

  getTextureName(tileType, variant) {
    // Try variant texture first, fallback to base
    const variantName = `tile_${tileType}_${variant}`;
    if (this.scene.textures.exists(variantName)) {
      return variantName;
    }
    // Try with variant 0
    const baseName = `tile_${tileType}_0`;
    if (this.scene.textures.exists(baseName)) {
      return baseName;
    }
    // Legacy fallback
    return `tile_${tileType}`;
  }

  getObjectTexture(obj) {
    if (obj.type === 'tree') return `obj_tree_${obj.variant || 0}`;
    if (obj.type === 'rock') return `obj_rock_${obj.variant || 0}`;
    if (obj.type === 'bush') return `obj_bush_${obj.variant || 0}`;
    if (obj.type === 'campfire') return 'obj_campfire';
    return 'obj_tree_0';
  }

  getTileFromPool() {
    return this.tilePool.pop() || null;
  }

  getObjectFromPool() {
    return this.objectPool.pop() || null;
  }

  // Force a specific tile to refresh (after object removal)
  refreshTile(gx, gy) {
    const key = `${gx},${gy}`;

    // Remove and return the old object sprite
    if (this.activeObjects.has(key)) {
      const sprite = this.activeObjects.get(key);
      sprite.setVisible(false).setActive(false);
      this.objectPool.push(sprite);
      this.activeObjects.delete(key);
    }

    // Force bounds recalculation on next frame
    this.lastMinGX = -1;
  }

  // Add a placed structure sprite (campfire, etc)
  addStructureSprite(gx, gy, type) {
    const key = `${gx},${gy}`;
    const textureName = type === 'campfire' ? 'obj_campfire' : `obj_${type}_0`;

    // If there's already an object sprite here, remove it
    if (this.activeObjects.has(key)) {
      const old = this.activeObjects.get(key);
      old.setVisible(false).setActive(false);
      this.objectPool.push(old);
      this.activeObjects.delete(key);
    }

    const sprite = this.getObjectFromPool();
    if (!sprite) return;

    const pos = gridToScreen(gx, gy);
    sprite.setTexture(textureName)
      .setPosition(pos.x, pos.y)
      .setDepth(DEPTH.OBJECTS + isoDepth(gx, gy))
      .setVisible(true)
      .setActive(true);

    this.activeObjects.set(key, sprite);
  }

  // Render all placed structures from game state (called on load)
  renderPlacedStructures() {
    const structures = this.worldGen.gs.worldMods.placedStructures;
    if (!structures) return;
    for (const s of structures) {
      this.addStructureSprite(s.x, s.y, s.type);
    }
  }

  getWorldBounds() {
    // Compute the screen-space bounding box of the entire isometric map
    const topPos = gridToScreen(0, 0);
    const rightPos = gridToScreen(this.worldGen.width - 1, 0);
    const bottomPos = gridToScreen(this.worldGen.width - 1, this.worldGen.height - 1);
    const leftPos = gridToScreen(0, this.worldGen.height - 1);

    return {
      x: leftPos.x - TILE.WIDTH,
      y: topPos.y - TILE.HEIGHT,
      width: (rightPos.x - leftPos.x) + TILE.WIDTH * 2,
      height: (bottomPos.y - topPos.y) + TILE.HEIGHT * 2,
    };
  }

  destroy() {
    // Return all active sprites to pools
    for (const [, sprite] of this.activeTiles) {
      sprite.destroy();
    }
    for (const [, sprite] of this.activeObjects) {
      sprite.destroy();
    }
    for (const sprite of this.tilePool) {
      sprite.destroy();
    }
    for (const sprite of this.objectPool) {
      sprite.destroy();
    }
    this.activeTiles.clear();
    this.activeObjects.clear();
    this.tilePool = [];
    this.objectPool = [];
  }
}
