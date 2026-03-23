// PlayerSystem — Handles player sprite, 8-directional isometric movement,
// sprint, sneak, collision detection, and camera follow

import { PLAYER, DEPTH, TILE } from '../config/constants.js';
import { gridToScreen, isoDepth, lerp, clamp, angleToDirection } from '../utils/math.js';

export default class PlayerSystem {
  constructor(scene, gameState, worldGen) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.gameEvents;
    this.worldGen = worldGen;

    this.sprite = null;
    this.currentScreenX = 0;
    this.currentScreenY = 0;
    this.inputDisabled = false;
  }

  create() {
    const pos = gridToScreen(this.gs.player.gridX, this.gs.player.gridY);
    this.currentScreenX = pos.x;
    this.currentScreenY = pos.y;

    this.sprite = this.scene.add.image(pos.x, pos.y, 'player_S')
      .setOrigin(0.5, 1.0)
      .setDepth(DEPTH.ENTITIES + isoDepth(this.gs.player.gridX, this.gs.player.gridY))
;

    // Camera follow with smooth lerp
    this.scene.cameras.main.startFollow(this.sprite, true, 0.08, 0.08);
    this.scene.cameras.main.setDeadzone(80, 50);
  }

  update(dt) {
    if (this.inputDisabled) {
      this.gs.player.moving = false;
      this.updateSpritePosition(dt);
      return;
    }

    this.handleMovement(dt);
    this.updateSpritePosition(dt);
    this.updateSpriteTexture();
  }

  handleMovement(dt) {
    const wasd = this.scene.wasd;
    const keys = this.scene.keys;

    // Read WASD input and map to isometric grid directions
    // W = move up on screen = decrease both gridX and gridY
    // S = move down on screen = increase both gridX and gridY
    // A = move left on screen = decrease gridX, increase gridY
    // D = move right on screen = increase gridX, decrease gridY
    let dx = 0, dy = 0;

    if (wasd.W.isDown) { dx -= 1; dy -= 1; }
    if (wasd.S.isDown) { dx += 1; dy += 1; }
    if (wasd.A.isDown) { dx -= 1; dy += 1; }
    if (wasd.D.isDown) { dx += 1; dy -= 1; }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    // Movement state
    const moving = dx !== 0 || dy !== 0;
    this.gs.player.moving = moving;
    this.gs.player.sprinting = keys.sprint.isDown && moving;
    this.gs.player.sneaking = keys.sneak.isDown && moving && !this.gs.player.sprinting;

    if (!moving) return;

    // Select speed
    let speed = PLAYER.WALK_SPEED;
    if (this.gs.player.sprinting && this.gs.stats.fatigue > 0) {
      speed = PLAYER.SPRINT_SPEED;
    } else if (this.gs.player.sneaking) {
      speed = PLAYER.SNEAK_SPEED;
    }

    // Convert pixel speed to grid units per second
    // One grid unit in screen space is approximately TILE.WIDTH (64px)
    const gridSpeed = speed / TILE.WIDTH;

    // Compute new grid position
    const newGX = this.gs.player.gridX + dx * gridSpeed * dt;
    const newGY = this.gs.player.gridY + dy * gridSpeed * dt;

    // Collision detection with axis sliding
    const roundNewX = Math.round(newGX);
    const roundNewY = Math.round(newGY);

    if (this.worldGen.isWalkable(roundNewX, roundNewY)) {
      // Full movement allowed
      this.gs.player.gridX = newGX;
      this.gs.player.gridY = newGY;
    } else {
      // Try sliding along X axis only
      const slideX = this.gs.player.gridX + dx * gridSpeed * dt;
      const slideXRound = Math.round(slideX);
      const curYRound = Math.round(this.gs.player.gridY);

      if (this.worldGen.isWalkable(slideXRound, curYRound)) {
        this.gs.player.gridX = slideX;
      } else {
        // Try sliding along Y axis only
        const slideY = this.gs.player.gridY + dy * gridSpeed * dt;
        const slideYRound = Math.round(slideY);
        const curXRound = Math.round(this.gs.player.gridX);

        if (this.worldGen.isWalkable(curXRound, slideYRound)) {
          this.gs.player.gridY = slideY;
        }
        // If both axes blocked, don't move
      }
    }

    // Clamp to world bounds
    this.gs.player.gridX = clamp(this.gs.player.gridX, 0.5, this.worldGen.width - 1.5);
    this.gs.player.gridY = clamp(this.gs.player.gridY, 0.5, this.worldGen.height - 1.5);

    // Update direction based on movement vector
    if (moving) {
      const angle = Math.atan2(dy, dx);
      this.gs.player.direction = angleToDirection(angle);
    }

    // Emit position update
    this.events.emit('player:moved', {
      gridX: this.gs.player.gridX,
      gridY: this.gs.player.gridY,
    });
  }

  updateSpritePosition(dt) {
    // Smooth interpolation of sprite position toward current grid position
    const target = gridToScreen(this.gs.player.gridX, this.gs.player.gridY);
    const lerpFactor = 1 - Math.pow(0.001, dt); // Smooth ~60fps

    this.currentScreenX = lerp(this.currentScreenX, target.x, lerpFactor);
    this.currentScreenY = lerp(this.currentScreenY, target.y, lerpFactor);

    this.sprite.setPosition(this.currentScreenX, this.currentScreenY);
    this.sprite.setDepth(
      DEPTH.ENTITIES + isoDepth(Math.round(this.gs.player.gridX), Math.round(this.gs.player.gridY))
    );
  }

  updateSpriteTexture() {
    // Map 8 directions to 4 sprite textures (mirror for opposite sides)
    const dir = this.gs.player.direction;
    let texKey = 'player_S';
    let flipX = false;

    switch (dir) {
      case 'S': case 'SE': texKey = 'player_S'; break;
      case 'SW': texKey = 'player_S'; flipX = true; break;
      case 'N': case 'NW': texKey = 'player_N'; break;
      case 'NE': texKey = 'player_N'; flipX = true; break;
      case 'E': texKey = 'player_E'; break;
      case 'W': texKey = 'player_W'; break;
    }

    if (this.scene.textures.exists(texKey)) {
      this.sprite.setTexture(texKey);
    }
    this.sprite.setFlipX(flipX);
  }

  setInputDisabled(disabled) {
    this.inputDisabled = disabled;
  }

  // Teleport player to grid position (for loading saves)
  teleport(gridX, gridY) {
    this.gs.player.gridX = gridX;
    this.gs.player.gridY = gridY;
    const pos = gridToScreen(gridX, gridY);
    this.currentScreenX = pos.x;
    this.currentScreenY = pos.y;
    this.sprite.setPosition(pos.x, pos.y);
  }

  destroy() {
    if (this.sprite) this.sprite.destroy();
  }
}
