// CombatSystem — Handles melee combat: attack input, hit detection,
// damage calculation, knockback, weapon durability, and XP grants.

import { COMBAT, DEPTH, PLAYER } from '../config/constants.js';
import ITEMS from '../config/items.js';
import { distance, angleBetween, gridToScreen, isoDepth } from '../utils/math.js';

const ATTACK_ARC = Math.PI * 0.6; // 108 degree frontal arc

export default class CombatSystem {
  constructor(scene, gameState, inventorySystem) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.gameEvents;
    this.inventory = inventorySystem;

    this.attackCooldown = 0;
    this.swingSprite = null;
    this.swingTimer = 0;
  }

  create() {
    // Left-click to attack
    this.scene.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown() && !this.scene.playerSystem?.inputDisabled) {
        this.tryAttack(pointer);
      }
    });
  }

  tryAttack(pointer) {
    if (this.attackCooldown > 0) return;
    if (this.scene.buildingSystem?.buildMode) return;

    // Get weapon info
    const weapon = this.getEquippedWeapon();
    const damage = weapon ? (weapon.def.damage || weapon.def.toolPower * 3 || COMBAT.BASE_MELEE_DAMAGE) : COMBAT.UNARMED_DAMAGE;
    const range = weapon ? (weapon.def.range || 1) : 1;
    const cooldownMs = COMBAT.ATTACK_COOLDOWN;

    // Set cooldown
    this.attackCooldown = cooldownMs / 1000;

    // Show swing visual
    this.showSwingEffect();

    // Emit attack event (for sound aggro)
    this.events.emit('combat:attack', { damage });

    // Degrade weapon
    if (weapon && weapon.slot !== null) {
      this.inventory.degradeItem(weapon.slot, 1);
    }

    // Check hit against all animals
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;
    const dir = this.gs.player.direction;
    const attackAngle = this.dirToAngle(dir);

    // Get animals from AnimalSystem
    const animalSystem = this.scene.animalSystem;
    if (!animalSystem) return;

    let hitCount = 0;
    for (const animal of animalSystem.animals) {
      if (animal.state === 'dead') continue;

      const dist = distance(px, py, animal.gx, animal.gy);
      if (dist > range + 0.5) continue;

      // Check if animal is within attack arc
      const toAnimal = angleBetween(px, py, animal.gx, animal.gy);
      const angleDiff = Math.abs(this.normalizeAngle(toAnimal - attackAngle));
      if (angleDiff > ATTACK_ARC / 2) continue;

      // Hit confirmed
      const finalDamage = this.calculateDamage(damage, weapon);
      animalSystem.damageAnimal(animal.id, finalDamage);
      hitCount++;

      // Grant combat XP
      this.grantXP('strength', 3);
      if (weapon?.def.category === 'weapon') {
        this.grantXP('fitness', 2);
      }

      // Emit hit event
      this.events.emit('combat:hit', {
        target: animal.type,
        damage: finalDamage,
        gx: animal.gx,
        gy: animal.gy,
      });

      // Show damage number
      this.showDamageNumber(animal.gx, animal.gy, finalDamage);
    }

    if (hitCount === 0) {
      // Miss — still grant small fitness XP
      this.grantXP('fitness', 1);
    }
  }

  calculateDamage(baseDamage, weapon) {
    // Apply weapon condition modifier (lower condition = less damage)
    let modifier = 1;
    if (weapon && weapon.condition !== null) {
      const condPct = weapon.condition / (weapon.def.condition || 100);
      modifier = 0.5 + condPct * 0.5; // 50-100% based on condition
    }

    // Apply strength skill bonus (+5% per level)
    const str = this.gs.skills.strength?.level || 0;
    modifier *= 1 + str * 0.05;

    // Add small random variance
    modifier *= 0.9 + Math.random() * 0.2;

    return Math.round(baseDamage * modifier);
  }

  getEquippedWeapon() {
    const mainHand = this.gs.inventory.equipped.mainHand;
    if (!mainHand) return null;

    const itemId = mainHand.itemId;
    const def = ITEMS[itemId];
    if (!def) return null;

    // Find it in inventory slots for condition tracking
    const slotIdx = this.gs.inventory.slots.findIndex(s => s.itemId === itemId);

    return {
      id: itemId,
      def,
      condition: mainHand.condition,
      slot: slotIdx >= 0 ? slotIdx : null,
    };
  }

  showSwingEffect() {
    const player = this.scene.playerSystem?.sprite;
    if (!player) return;

    if (!this.swingSprite) {
      // Use a subtle light gray line (not bright white) so it doesn't look like a white box
      this.swingSprite = this.scene.add.rectangle(0, 0, 18, 2, 0xccccaa, 0.4);
      this.swingSprite.setDepth(DEPTH.ENTITIES + 9999);
      this.swingSprite.setVisible(false); // Start hidden
    }

    this.swingSprite.setPosition(player.x, player.y - 10);
    this.swingSprite.setVisible(true);
    this.swingSprite.setAlpha(0.5);
    this.swingTimer = 0.12;

    // Rotate to face direction
    const angle = this.dirToAngle(this.gs.player.direction);
    this.swingSprite.setRotation(angle);
  }

  showDamageNumber(gx, gy, damage) {
    const pos = gridToScreen(gx, gy);
    const txt = this.scene.add.text(pos.x, pos.y - 20, `-${damage}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 2,
    });
    txt.setOrigin(0.5);
    txt.setDepth(DEPTH.ENTITIES + 10000);

    this.scene.tweens.add({
      targets: txt,
      y: txt.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  grantXP(skill, amount) {
    const sk = this.gs.skills[skill];
    if (!sk) return;
    sk.xp += amount;
    const needed = (sk.level + 1) * 100;
    if (sk.xp >= needed && sk.level < 10) {
      sk.level++;
      sk.xp -= needed;
      this.events.emit('skill:levelup', { skill, level: sk.level });
    }
  }

  dirToAngle(dir) {
    const angles = {
      E: 0, SE: Math.PI / 4, S: Math.PI / 2, SW: (3 * Math.PI) / 4,
      W: Math.PI, NW: -(3 * Math.PI) / 4, N: -Math.PI / 2, NE: -Math.PI / 4,
    };
    return angles[dir] || 0;
  }

  normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  // Called by AnimalSystem when an animal attacks the player
  damagePlayer(amount, source) {
    const stats = this.gs.stats;
    stats.health = Math.max(0, stats.health - amount);

    this.events.emit('combat:playerHit', { damage: amount, source });

    // Screen flash
    this.scene.cameras.main.flash(150, 180, 30, 30);

    // Check for injury
    this.events.emit('combat:checkInjury', { damage: amount, source });

    if (stats.health <= 0) {
      this.events.emit('player:died', {
        cause: `Killed by ${source}`,
        day: this.gs.time.day,
        playTime: this.gs.totalPlayTime,
      });
    }
  }

  update(dt) {
    // Countdown cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    // Fade swing visual
    if (this.swingTimer > 0) {
      this.swingTimer -= dt;
      if (this.swingTimer <= 0 && this.swingSprite) {
        this.swingSprite.setVisible(false);
      }
    }
  }

  destroy() {
    this.swingSprite?.destroy();
  }
}
