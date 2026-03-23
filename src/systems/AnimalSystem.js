// AnimalSystem — Spawns and manages wildlife with AI behaviors.
// Handles prey (flee), predator (hunt/territorial/ambush), pack coordination,
// sound aggro, death, and harvesting.

import ANIMALS from '../config/animals.js';
import { DEPTH, TILE, BIOME, PLAYER } from '../config/constants.js';
import { distance, gridToScreen, isoDepth, seededRandom } from '../utils/math.js';
import ITEMS from '../config/items.js';

const MAX_ANIMALS = 40;
const SPAWN_INTERVAL = 8;       // Seconds between spawn attempts
const DESPAWN_RANGE = 50;       // Grid tiles — remove animals beyond this
const SPAWN_MIN_RANGE = 20;     // Minimum spawn distance from player
const SPAWN_MAX_RANGE = 40;     // Maximum spawn distance from player
const AI_UPDATE_INTERVAL = 0.25; // Seconds between AI ticks (performance)
const WANDER_RANGE = 8;         // Grid tiles for wander radius

// AI states
const STATE = {
  IDLE: 'idle',
  WANDER: 'wander',
  FLEE: 'flee',
  STALK: 'stalk',
  CHARGE: 'charge',
  ATTACK: 'attack',
  WARN: 'warn',
  DEAD: 'dead',
  RETURN: 'return',
};

export default class AnimalSystem {
  constructor(scene, gameState, worldGen) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.gameEvents;
    this.worldGen = worldGen;

    this.animals = [];          // Active animal instances
    this.sprites = new Map();   // id -> Phaser.Image
    this.nextId = 1;
    this.spawnTimer = 2;        // Initial delay before first spawn
    this.aiTimer = 0;
    this.noiseLevel = 0;        // Current player noise level (0-1)
    this.noiseDecay = 0.15;     // Noise decay per second
  }

  create() {
    // Listen for noise-generating events
    this.events.on('gathering:started', () => this.addNoise(0.4));
    this.events.on('combat:attack', () => this.addNoise(0.6));
    this.events.on('building:placed', () => this.addNoise(0.3));
  }

  update(dt) {
    // Decay noise
    this.noiseLevel = Math.max(0, this.noiseLevel - this.noiseDecay * dt);

    // Spawn timer
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = SPAWN_INTERVAL;
      this.trySpawn();
    }

    // Despawn far-away animals
    this.despawnDistant();

    // AI update (throttled for performance)
    this.aiTimer -= dt;
    if (this.aiTimer <= 0) {
      this.aiTimer = AI_UPDATE_INTERVAL;
      this.updateAI(AI_UPDATE_INTERVAL);
    }

    // Move sprites smoothly every frame
    this.updateSprites(dt);
  }

  // === SPAWNING ===

  trySpawn() {
    if (this.animals.length >= MAX_ANIMALS) return;

    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;

    // Pick random spawn location in ring around player
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_MIN_RANGE + Math.random() * (SPAWN_MAX_RANGE - SPAWN_MIN_RANGE);
    const sx = Math.round(px + Math.cos(angle) * dist);
    const sy = Math.round(py + Math.sin(angle) * dist);

    // Check bounds and walkability
    if (!this.worldGen.isWalkable(sx, sy)) return;

    // Get biome at spawn point
    const biome = this.worldGen.getBiome(sx, sy);
    if (!biome) return;

    // Find eligible animal types for this biome
    const eligible = Object.entries(ANIMALS).filter(([, def]) => {
      if (def.aquatic || def.flying) return false;
      return def.biomes && def.biomes.includes(biome);
    });

    if (eligible.length === 0) return;

    // Weighted random selection (rarer predators)
    const weights = eligible.map(([, def]) => {
      if (def.category === 'predator') return 0.15;
      return 0.5;
    });
    const totalW = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalW;
    let chosen = eligible[0];
    for (let i = 0; i < eligible.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { chosen = eligible[i]; break; }
    }

    const [type, def] = chosen;

    // Spawn group
    const [minGroup, maxGroup] = def.groupSize || [1, 1];
    const groupSize = minGroup + Math.floor(Math.random() * (maxGroup - minGroup + 1));
    const groupId = this.nextId++;

    for (let i = 0; i < groupSize; i++) {
      if (this.animals.length >= MAX_ANIMALS) break;

      const offsetX = (Math.random() - 0.5) * 4;
      const offsetY = (Math.random() - 0.5) * 4;
      const ax = sx + offsetX;
      const ay = sy + offsetY;

      if (!this.worldGen.isWalkable(Math.round(ax), Math.round(ay))) continue;

      this.spawnAnimal(type, ax, ay, groupId);
    }
  }

  spawnAnimal(type, gx, gy, groupId) {
    const def = ANIMALS[type];
    if (!def) return null;

    const id = this.nextId++;
    const animal = {
      id,
      type,
      groupId,
      gx, gy,
      homeX: gx, homeY: gy,
      hp: def.hp,
      maxHp: def.hp,
      state: STATE.IDLE,
      stateTimer: 1 + Math.random() * 3,
      targetX: gx, targetY: gy,
      attackCooldown: 0,
      speed: def.speed,
      direction: 1, // 1 = right, -1 = left
    };

    this.animals.push(animal);

    // Create sprite
    const texKey = `animal_${type}`;
    const pos = gridToScreen(gx, gy);
    const sprite = this.scene.add.image(pos.x, pos.y, texKey)
      .setOrigin(0.5, 1.0)
      .setDepth(DEPTH.ENTITIES + isoDepth(Math.round(gx), Math.round(gy)))
      .setScale(def.size ? Math.max(def.size.w, 1) : 1);

    this.sprites.set(id, sprite);
    return animal;
  }

  despawnDistant() {
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;

    for (let i = this.animals.length - 1; i >= 0; i--) {
      const a = this.animals[i];
      const d = distance(px, py, a.gx, a.gy);
      if (d > DESPAWN_RANGE && a.state !== STATE.DEAD) {
        this.removeAnimal(i);
      }
    }
  }

  removeAnimal(index) {
    const a = this.animals[index];
    const sprite = this.sprites.get(a.id);
    if (sprite) {
      sprite.destroy();
      this.sprites.delete(a.id);
    }
    this.animals.splice(index, 1);
  }

  // === AI ===

  updateAI(dt) {
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;
    const playerHealth = this.gs.stats.health;

    for (const animal of this.animals) {
      if (animal.state === STATE.DEAD) continue;

      const def = ANIMALS[animal.type];
      if (!def) continue;

      animal.stateTimer -= dt;
      animal.attackCooldown = Math.max(0, animal.attackCooldown - dt);

      const dist = distance(px, py, animal.gx, animal.gy);

      // Effective detect range (expanded by player noise)
      const effectiveDetect = def.detectRange + this.noiseLevel * 15;

      switch (def.category) {
        case 'prey':
          this.updatePrey(animal, def, dist, effectiveDetect, dt);
          break;
        case 'predator':
          this.updatePredator(animal, def, dist, effectiveDetect, playerHealth, dt);
          break;
        default:
          this.updateAmbient(animal, def, dt);
          break;
      }
    }
  }

  updatePrey(animal, def, dist, detectRange, dt) {
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;

    switch (animal.state) {
      case STATE.IDLE:
        if (dist < detectRange) {
          // Detected player — flee
          animal.state = STATE.FLEE;
          animal.stateTimer = 4 + Math.random() * 3;
        } else if (animal.stateTimer <= 0) {
          // Start wandering
          animal.state = STATE.WANDER;
          this.setWanderTarget(animal);
          animal.stateTimer = 3 + Math.random() * 4;
        }
        break;

      case STATE.WANDER:
        this.moveToward(animal, animal.targetX, animal.targetY, def.speed * 0.3, dt);
        if (dist < detectRange) {
          animal.state = STATE.FLEE;
          animal.stateTimer = 4 + Math.random() * 3;
        } else if (animal.stateTimer <= 0 || this.reachedTarget(animal)) {
          animal.state = STATE.IDLE;
          animal.stateTimer = 2 + Math.random() * 4;
        }
        break;

      case STATE.FLEE:
        // Run away from player
        const fleeAngle = Math.atan2(animal.gy - py, animal.gx - px);
        animal.targetX = animal.gx + Math.cos(fleeAngle) * 10;
        animal.targetY = animal.gy + Math.sin(fleeAngle) * 10;
        this.moveToward(animal, animal.targetX, animal.targetY, def.speed, dt);

        if (dist > detectRange * 1.5 || animal.stateTimer <= 0) {
          animal.state = STATE.WANDER;
          animal.homeX = animal.gx;
          animal.homeY = animal.gy;
          this.setWanderTarget(animal);
          animal.stateTimer = 3 + Math.random() * 3;
        }
        break;
    }

    // Elk charge when low HP
    if (def.behavior === 'flee_charge' && animal.hp < def.hp * (def.chargeThreshold || 0.3)) {
      if (dist < 5 && animal.state === STATE.FLEE) {
        animal.state = STATE.CHARGE;
        animal.stateTimer = 3;
      }
    }

    if (animal.state === STATE.CHARGE) {
      this.moveToward(animal, px, py, def.speed * 1.5, dt);
      if (dist < 1.5 && animal.attackCooldown <= 0) {
        this.attackPlayer(animal, def.chargeDamage || 15);
        animal.attackCooldown = 2;
      }
      if (animal.stateTimer <= 0 || dist > 10) {
        animal.state = STATE.FLEE;
        animal.stateTimer = 5;
      }
    }
  }

  updatePredator(animal, def, dist, detectRange, playerHealth, dt) {
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;

    switch (def.behavior) {
      case 'pack_hunt':
        this.aiPackHunt(animal, def, dist, detectRange, dt);
        break;
      case 'territorial':
        this.aiTerritorial(animal, def, dist, detectRange, dt);
        break;
      case 'ambush':
        this.aiAmbush(animal, def, dist, detectRange, dt);
        break;
      case 'opportunistic':
        this.aiOpportunistic(animal, def, dist, detectRange, playerHealth, dt);
        break;
      default:
        this.aiPackHunt(animal, def, dist, detectRange, dt);
    }
  }

  // Wolf pack hunt AI
  aiPackHunt(animal, def, dist, detectRange, dt) {
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;

    switch (animal.state) {
      case STATE.IDLE:
      case STATE.WANDER:
        if (dist < detectRange) {
          animal.state = STATE.STALK;
          animal.stateTimer = 5;
          // Alert pack members
          this.alertGroup(animal.groupId, STATE.STALK);
        } else if (animal.stateTimer <= 0) {
          if (animal.state === STATE.IDLE) {
            animal.state = STATE.WANDER;
            this.setWanderTarget(animal);
            animal.stateTimer = 4 + Math.random() * 3;
          } else {
            animal.state = STATE.IDLE;
            animal.stateTimer = 3 + Math.random() * 3;
          }
        }
        if (animal.state === STATE.WANDER) {
          this.moveToward(animal, animal.targetX, animal.targetY, def.speed * 0.3, dt);
        }
        break;

      case STATE.STALK:
        // Approach slowly from pack angles
        const packOffset = this.getPackOffset(animal);
        const stalkX = px + packOffset.x;
        const stalkY = py + packOffset.y;
        this.moveToward(animal, stalkX, stalkY, def.speed * 0.5, dt);

        if (dist < (def.attackRange || 2) + 1) {
          animal.state = STATE.CHARGE;
          animal.stateTimer = 8;
          this.alertGroup(animal.groupId, STATE.CHARGE);
        }
        if (dist > detectRange * 1.5) {
          animal.state = STATE.RETURN;
          animal.stateTimer = 5;
        }
        break;

      case STATE.CHARGE:
        this.moveToward(animal, px, py, def.speed, dt);
        if (dist < (def.attackRange || 1.5) && animal.attackCooldown <= 0) {
          this.attackPlayer(animal, def.damage);
          animal.attackCooldown = (def.attackCooldown || 2000) / 1000;
        }
        if (animal.stateTimer <= 0 || dist > detectRange * 1.5) {
          animal.state = STATE.RETURN;
          animal.stateTimer = 5;
        }
        break;

      case STATE.RETURN:
        this.moveToward(animal, animal.homeX, animal.homeY, def.speed * 0.5, dt);
        if (this.reachedTarget(animal, animal.homeX, animal.homeY) || animal.stateTimer <= 0) {
          animal.state = STATE.IDLE;
          animal.stateTimer = 3 + Math.random() * 3;
        }
        if (dist < def.aggroRange) {
          animal.state = STATE.CHARGE;
          animal.stateTimer = 6;
        }
        break;
    }
  }

  // Bear territorial AI
  aiTerritorial(animal, def, dist, detectRange, dt) {
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;

    switch (animal.state) {
      case STATE.IDLE:
      case STATE.WANDER:
        if (dist < (def.warnDistance || 12)) {
          animal.state = STATE.WARN;
          animal.stateTimer = 3;
        } else if (animal.stateTimer <= 0) {
          if (animal.state === STATE.IDLE) {
            animal.state = STATE.WANDER;
            this.setWanderTarget(animal);
            animal.stateTimer = 5 + Math.random() * 4;
          } else {
            animal.state = STATE.IDLE;
            animal.stateTimer = 4 + Math.random() * 4;
          }
        }
        if (animal.state === STATE.WANDER) {
          this.moveToward(animal, animal.targetX, animal.targetY, def.speed * 0.3, dt);
        }
        break;

      case STATE.WARN:
        // Stand ground, face player
        if (dist < (def.chargeDistance || 6)) {
          animal.state = STATE.CHARGE;
          animal.stateTimer = 6;
        }
        if (dist > (def.warnDistance || 12) * 1.3 || animal.stateTimer <= 0) {
          animal.state = STATE.IDLE;
          animal.stateTimer = 3;
        }
        break;

      case STATE.CHARGE:
        this.moveToward(animal, px, py, def.speed * 1.3, dt);
        if (dist < (def.attackRange || 2) && animal.attackCooldown <= 0) {
          this.attackPlayer(animal, def.damage);
          animal.attackCooldown = (def.attackCooldown || 3000) / 1000;
        }
        if (animal.stateTimer <= 0 || dist > (def.territoryRadius || 20)) {
          animal.state = STATE.RETURN;
          animal.stateTimer = 8;
        }
        break;

      case STATE.RETURN:
        this.moveToward(animal, animal.homeX, animal.homeY, def.speed * 0.5, dt);
        if (this.reachedTarget(animal, animal.homeX, animal.homeY) || animal.stateTimer <= 0) {
          animal.state = STATE.IDLE;
          animal.stateTimer = 5;
        }
        break;
    }
  }

  // Cougar ambush AI
  aiAmbush(animal, def, dist, detectRange, dt) {
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;

    switch (animal.state) {
      case STATE.IDLE:
        if (dist < detectRange) {
          animal.state = STATE.STALK;
          animal.stateTimer = 10;
        } else if (animal.stateTimer <= 0) {
          animal.state = STATE.WANDER;
          this.setWanderTarget(animal);
          animal.stateTimer = 5 + Math.random() * 5;
        }
        break;

      case STATE.WANDER:
        this.moveToward(animal, animal.targetX, animal.targetY, def.speed * 0.3, dt);
        if (dist < detectRange) {
          animal.state = STATE.STALK;
          animal.stateTimer = 10;
        }
        if (animal.stateTimer <= 0 || this.reachedTarget(animal)) {
          animal.state = STATE.IDLE;
          animal.stateTimer = 4;
        }
        break;

      case STATE.STALK:
        // Creep toward player very slowly
        this.moveToward(animal, px, py, def.stalkSpeed || (def.speed * 0.4), dt);
        if (dist < (def.pounceRange || 4)) {
          animal.state = STATE.CHARGE;
          animal.stateTimer = 4;
          // Ambush bonus: first attack deals extra damage
          animal._ambushReady = true;
        }
        if (animal.stateTimer <= 0 || dist > detectRange * 1.5) {
          animal.state = STATE.IDLE;
          animal.stateTimer = 5;
        }
        break;

      case STATE.CHARGE:
        this.moveToward(animal, px, py, def.speed * 1.3, dt);
        if (dist < (def.attackRange || 2) && animal.attackCooldown <= 0) {
          let dmg = def.damage;
          if (animal._ambushReady) {
            dmg *= (def.ambushMultiplier || 2);
            animal._ambushReady = false;
          }
          this.attackPlayer(animal, dmg);
          animal.attackCooldown = (def.attackCooldown || 1500) / 1000;
        }
        if (animal.stateTimer <= 0 || dist > detectRange) {
          animal.state = STATE.RETURN;
          animal.stateTimer = 6;
        }
        break;

      case STATE.RETURN:
        this.moveToward(animal, animal.homeX, animal.homeY, def.speed * 0.5, dt);
        if (this.reachedTarget(animal, animal.homeX, animal.homeY) || animal.stateTimer <= 0) {
          animal.state = STATE.IDLE;
          animal.stateTimer = 5;
        }
        break;
    }
  }

  // Coyote opportunistic AI
  aiOpportunistic(animal, def, dist, detectRange, playerHealth, dt) {
    const px = this.gs.player.gridX;
    const py = this.gs.player.gridY;
    const threshold = def.aggroHealthThreshold || 40;

    switch (animal.state) {
      case STATE.IDLE:
      case STATE.WANDER:
        // Only aggro if player health is low
        if (dist < detectRange && playerHealth < threshold) {
          animal.state = STATE.STALK;
          animal.stateTimer = 5;
          this.alertGroup(animal.groupId, STATE.STALK);
        } else if (animal.stateTimer <= 0) {
          if (animal.state === STATE.IDLE) {
            animal.state = STATE.WANDER;
            this.setWanderTarget(animal);
            animal.stateTimer = 4 + Math.random() * 3;
          } else {
            animal.state = STATE.IDLE;
            animal.stateTimer = 3 + Math.random() * 4;
          }
        }
        if (animal.state === STATE.WANDER) {
          this.moveToward(animal, animal.targetX, animal.targetY, def.speed * 0.3, dt);
        }
        break;

      case STATE.STALK:
        this.moveToward(animal, px, py, def.speed * 0.5, dt);
        if (dist < (def.attackRange || 1.5) + 1) {
          animal.state = STATE.CHARGE;
          animal.stateTimer = 5;
        }
        if (playerHealth >= threshold || dist > detectRange * 1.5) {
          animal.state = STATE.FLEE;
          animal.stateTimer = 4;
        }
        break;

      case STATE.CHARGE:
        this.moveToward(animal, px, py, def.speed, dt);
        if (dist < (def.attackRange || 1.5) && animal.attackCooldown <= 0) {
          this.attackPlayer(animal, def.damage);
          animal.attackCooldown = (def.attackCooldown || 1500) / 1000;
        }
        if (playerHealth >= 60 || animal.stateTimer <= 0) {
          animal.state = STATE.FLEE;
          animal.stateTimer = 5;
        }
        break;

      case STATE.FLEE:
        const fleeAngle = Math.atan2(animal.gy - py, animal.gx - px);
        this.moveToward(animal,
          animal.gx + Math.cos(fleeAngle) * 10,
          animal.gy + Math.sin(fleeAngle) * 10,
          def.speed, dt);
        if (animal.stateTimer <= 0) {
          animal.state = STATE.IDLE;
          animal.stateTimer = 4;
        }
        break;
    }
  }

  updateAmbient(animal, def, dt) {
    if (animal.stateTimer <= 0) {
      if (animal.state === STATE.IDLE) {
        animal.state = STATE.WANDER;
        this.setWanderTarget(animal);
        animal.stateTimer = 4 + Math.random() * 5;
      } else {
        animal.state = STATE.IDLE;
        animal.stateTimer = 3 + Math.random() * 5;
      }
    }
    if (animal.state === STATE.WANDER) {
      this.moveToward(animal, animal.targetX, animal.targetY, def.speed * 0.3, dt);
    }
  }

  // === MOVEMENT HELPERS ===

  moveToward(animal, tx, ty, speed, dt) {
    const dx = tx - animal.gx;
    const dy = ty - animal.gy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.1) return;

    const gridSpeed = speed / TILE.WIDTH;
    const step = Math.min(gridSpeed * dt, d);
    const nx = animal.gx + (dx / d) * step;
    const ny = animal.gy + (dy / d) * step;

    // Collision check
    if (this.worldGen.isWalkable(Math.round(nx), Math.round(ny))) {
      animal.gx = nx;
      animal.gy = ny;
    }

    // Update facing direction
    if (dx > 0.1) animal.direction = 1;
    else if (dx < -0.1) animal.direction = -1;
  }

  setWanderTarget(animal) {
    const range = WANDER_RANGE;
    animal.targetX = animal.homeX + (Math.random() - 0.5) * range * 2;
    animal.targetY = animal.homeY + (Math.random() - 0.5) * range * 2;
  }

  reachedTarget(animal, tx, ty) {
    const targetX = tx !== undefined ? tx : animal.targetX;
    const targetY = ty !== undefined ? ty : animal.targetY;
    return distance(animal.gx, animal.gy, targetX, targetY) < 0.5;
  }

  // === PACK COORDINATION ===

  alertGroup(groupId, newState) {
    for (const a of this.animals) {
      if (a.groupId === groupId && a.state !== STATE.DEAD && a.state !== newState) {
        a.state = newState;
        a.stateTimer = 5 + Math.random() * 3;
      }
    }
  }

  getPackOffset(animal) {
    // Give each pack member a different approach angle
    const members = this.animals.filter(a => a.groupId === animal.groupId && a.state !== STATE.DEAD);
    const idx = members.indexOf(animal);
    const count = members.length;
    if (count <= 1) return { x: 0, y: 0 };

    const angle = (idx / count) * Math.PI * 2;
    const radius = 3;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  }

  // === COMBAT ===

  attackPlayer(animal, damage) {
    this.events.emit('animal:attack', {
      animalId: animal.id,
      type: animal.type,
      damage,
      gx: animal.gx,
      gy: animal.gy,
    });
  }

  damageAnimal(animalId, damage) {
    const animal = this.animals.find(a => a.id === animalId);
    if (!animal || animal.state === STATE.DEAD) return null;

    animal.hp -= damage;

    // Flash sprite red
    const sprite = this.sprites.get(animalId);
    if (sprite) {
      sprite.setTint(0xff4444);
      this.scene.time.delayedCall(150, () => {
        if (sprite.active) sprite.clearTint();
      });
    }

    if (animal.hp <= 0) {
      animal.hp = 0;
      animal.state = STATE.DEAD;
      this.onAnimalDeath(animal);
      return animal;
    }

    // Prey: force flee. Predator: force charge if not already
    const def = ANIMALS[animal.type];
    if (def.category === 'prey') {
      animal.state = STATE.FLEE;
      animal.stateTimer = 5;
    } else if (animal.state !== STATE.CHARGE) {
      animal.state = STATE.CHARGE;
      animal.stateTimer = 8;
      this.alertGroup(animal.groupId, STATE.CHARGE);
    }

    return animal;
  }

  onAnimalDeath(animal) {
    const sprite = this.sprites.get(animal.id);
    if (sprite) {
      sprite.setTint(0x666666);
      sprite.setAlpha(0.7);
    }

    this.events.emit('animal:died', {
      animalId: animal.id,
      type: animal.type,
      gx: animal.gx,
      gy: animal.gy,
    });
  }

  // Harvest a dead animal (called from InteractionSystem)
  harvestAnimal(animalId, inventorySystem) {
    const animal = this.animals.find(a => a.id === animalId);
    if (!animal || animal.state !== STATE.DEAD) return false;

    const def = ANIMALS[animal.type];
    if (!def || !def.drops) return false;

    // Grant drops
    for (const [itemId, qty] of Object.entries(def.drops)) {
      if (ITEMS[itemId]) {
        inventorySystem.addItem(itemId, qty);
        this.events.emit('item:added', {
          itemId,
          name: ITEMS[itemId].name,
          quantity: qty,
        });
      }
    }

    // Grant foraging/tracking XP
    const xpSkill = def.category === 'prey' ? 'tracking' : 'strength';
    this.events.emit('skill:xp', { skill: xpSkill, amount: 8 });

    // Remove animal
    const idx = this.animals.indexOf(animal);
    if (idx >= 0) this.removeAnimal(idx);

    return true;
  }

  // === SOUND AGGRO ===

  addNoise(level) {
    this.noiseLevel = Math.min(1, this.noiseLevel + level);
  }

  // === SPRITES ===

  updateSprites(dt) {
    for (const animal of this.animals) {
      const sprite = this.sprites.get(animal.id);
      if (!sprite) continue;

      const pos = gridToScreen(animal.gx, animal.gy);
      sprite.setPosition(pos.x, pos.y);
      sprite.setDepth(DEPTH.ENTITIES + isoDepth(Math.round(animal.gx), Math.round(animal.gy)));
      sprite.setFlipX(animal.direction < 0);
    }
  }

  // === QUERY ===

  getAnimalsNear(gx, gy, range) {
    return this.animals.filter(a => {
      if (a.state === STATE.DEAD) return false;
      return distance(a.gx, a.gy, gx, gy) <= range;
    });
  }

  getDeadAnimalsNear(gx, gy, range) {
    return this.animals.filter(a => {
      if (a.state !== STATE.DEAD) return false;
      return distance(a.gx, a.gy, gx, gy) <= range;
    });
  }

  getAnimalById(id) {
    return this.animals.find(a => a.id === id);
  }

  destroy() {
    for (const [, sprite] of this.sprites) {
      sprite.destroy();
    }
    this.sprites.clear();
    this.animals = [];
  }
}
