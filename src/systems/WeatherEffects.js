// WeatherEffects — Visual weather particle effects (rain, snow, fog, wind).
// Runs as a system in GameScene, listening for weather:changed events
// and spawning/despawning Phaser particle emitters accordingly.

import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';

// Weather particle configs
const RAIN_CONFIG = {
  speed: { min: 280, max: 420 },
  angle: { min: 78, max: 82 },
  quantity: 3,
  frequency: 16,
  lifespan: 1200,
  alpha: { start: 0.5, end: 0.15 },
  scaleX: { min: 0.3, max: 0.5 },
  scaleY: { min: 2.5, max: 4.0 },
  tint: 0x8ab4d8,
};

const HEAVY_RAIN_CONFIG = {
  speed: { min: 380, max: 550 },
  angle: { min: 75, max: 80 },
  quantity: 6,
  frequency: 12,
  lifespan: 1000,
  alpha: { start: 0.6, end: 0.2 },
  scaleX: { min: 0.4, max: 0.6 },
  scaleY: { min: 3.0, max: 5.0 },
  tint: 0x7aa0c8,
};

const SNOW_CONFIG = {
  speed: { min: 30, max: 80 },
  angle: { min: 85, max: 95 },
  quantity: 2,
  frequency: 40,
  lifespan: 4000,
  alpha: { start: 0.7, end: 0.1 },
  scale: { min: 0.8, max: 2.0 },
  tint: 0xe8eef4,
};

const STORM_CONFIG = {
  speed: { min: 450, max: 650 },
  angle: { min: 68, max: 75 },
  quantity: 8,
  frequency: 10,
  lifespan: 900,
  alpha: { start: 0.65, end: 0.2 },
  scaleX: { min: 0.4, max: 0.7 },
  scaleY: { min: 3.5, max: 5.5 },
  tint: 0x6a90b0,
};

export default class WeatherEffects {
  constructor(scene) {
    this.scene = scene;
    this.events = scene.gameEvents;
    this.currentWeather = 'clear';
    this.emitter = null;
    this.fogOverlay = null;
    this.windLines = null;
    this.lightningTimer = null;
    this.lightningOverlay = null;
  }

  create() {
    // Create a small white rectangle texture for particles
    if (!this.scene.textures.exists('particle_dot')) {
      const canvas = this.scene.textures.createCanvas('particle_dot', 4, 4);
      const ctx = canvas.context;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 4, 4);
      canvas.refresh();
    }

    // Create a round snow particle
    if (!this.scene.textures.exists('particle_snow')) {
      const canvas = this.scene.textures.createCanvas('particle_snow', 6, 6);
      const ctx = canvas.context;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(3, 3, 3, 0, Math.PI * 2);
      ctx.fill();
      canvas.refresh();
    }

    // Create fog overlay (full-screen semi-transparent rectangle)
    this.fogOverlay = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      this.scene.cameras.main.width * 3,
      this.scene.cameras.main.height * 3,
      0xbbccbb, 0
    );
    this.fogOverlay.setScrollFactor(0);
    this.fogOverlay.setDepth(DEPTH.WEATHER - 1);

    // Lightning flash overlay
    this.lightningOverlay = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      this.scene.cameras.main.width * 3,
      this.scene.cameras.main.height * 3,
      0xffffff, 0
    );
    this.lightningOverlay.setScrollFactor(0);
    this.lightningOverlay.setDepth(DEPTH.WEATHER + 1);

    // Listen for weather changes
    this.events.on('weather:changed', (data) => {
      this.setWeather(data.weather);
    });

    // Handle resize
    this.scene.scale.on('resize', (gameSize) => {
      if (this.fogOverlay) {
        this.fogOverlay.setPosition(gameSize.width / 2, gameSize.height / 2);
        this.fogOverlay.setSize(gameSize.width * 3, gameSize.height * 3);
      }
      if (this.lightningOverlay) {
        this.lightningOverlay.setPosition(gameSize.width / 2, gameSize.height / 2);
        this.lightningOverlay.setSize(gameSize.width * 3, gameSize.height * 3);
      }
    });
  }

  setWeather(type) {
    // Stop any current effects
    this.stopAll();
    this.currentWeather = type;

    switch (type) {
      case 'rain':
        this.startRain(RAIN_CONFIG);
        break;
      case 'heavy_rain':
        this.startRain(HEAVY_RAIN_CONFIG);
        break;
      case 'snow':
        this.startSnow();
        break;
      case 'wind':
        this.startWind();
        break;
      case 'storm':
        this.startRain(STORM_CONFIG);
        this.startLightning();
        break;
      case 'cloudy':
        this.startFog(0.08);
        break;
      case 'clear':
      default:
        // No effects
        break;
    }
  }

  startRain(config) {
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    this.emitter = this.scene.add.particles(0, 0, 'particle_dot', {
      x: { min: -w * 0.3, max: w * 1.3 },
      y: -20,
      speed: config.speed,
      angle: config.angle,
      quantity: config.quantity,
      frequency: config.frequency,
      lifespan: config.lifespan,
      alpha: config.alpha,
      scaleX: config.scaleX,
      scaleY: config.scaleY,
      tint: config.tint,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.emitter.setScrollFactor(0);
    this.emitter.setDepth(DEPTH.WEATHER + 2);

    // Add slight fog with rain
    if (config === HEAVY_RAIN_CONFIG || config === STORM_CONFIG) {
      this.startFog(0.12);
    } else {
      this.startFog(0.04);
    }
  }

  startSnow() {
    const cam = this.scene.cameras.main;
    const w = cam.width;

    this.emitter = this.scene.add.particles(0, 0, 'particle_snow', {
      x: { min: -w * 0.2, max: w * 1.2 },
      y: -10,
      speed: SNOW_CONFIG.speed,
      angle: SNOW_CONFIG.angle,
      quantity: SNOW_CONFIG.quantity,
      frequency: SNOW_CONFIG.frequency,
      lifespan: SNOW_CONFIG.lifespan,
      alpha: SNOW_CONFIG.alpha,
      scale: SNOW_CONFIG.scale,
      tint: SNOW_CONFIG.tint,
      // Gentle lateral wobble
      accelerationX: { min: -15, max: 15 },
    });

    this.emitter.setScrollFactor(0);
    this.emitter.setDepth(DEPTH.WEATHER + 2);

    // Light fog with snow
    this.startFog(0.06);
  }

  startWind() {
    // Wind uses horizontal streaks
    const cam = this.scene.cameras.main;
    const h = cam.height;

    this.emitter = this.scene.add.particles(0, 0, 'particle_dot', {
      x: -20,
      y: { min: 0, max: h },
      speed: { min: 300, max: 500 },
      angle: { min: -5, max: 5 },
      quantity: 1,
      frequency: 60,
      lifespan: 2000,
      alpha: { start: 0.12, end: 0 },
      scaleX: { min: 4.0, max: 8.0 },
      scaleY: { min: 0.2, max: 0.3 },
      tint: 0xaabbaa,
    });

    this.emitter.setScrollFactor(0);
    this.emitter.setDepth(DEPTH.WEATHER + 2);
  }

  startFog(intensity) {
    if (this.fogOverlay) {
      this.fogOverlay.setFillStyle(0x889988, intensity);
    }
  }

  startLightning() {
    // Random lightning flashes during storms
    const flashLightning = () => {
      if (this.currentWeather !== 'storm') return;

      // Flash the overlay white
      this.lightningOverlay.setFillStyle(0xffffff, 0.6);

      this.scene.tweens.add({
        targets: this.lightningOverlay,
        fillAlpha: 0,
        duration: 150,
        ease: 'Power2',
        onComplete: () => {
          // Optional double flash
          if (Math.random() > 0.5) {
            this.scene.time.delayedCall(80, () => {
              if (this.currentWeather !== 'storm') return;
              this.lightningOverlay.setFillStyle(0xffffff, 0.3);
              this.scene.tweens.add({
                targets: this.lightningOverlay,
                fillAlpha: 0,
                duration: 100,
                ease: 'Power2',
              });
            });
          }
        },
      });

      // Schedule next flash
      const nextDelay = 3000 + Math.random() * 12000;
      this.lightningTimer = this.scene.time.delayedCall(nextDelay, flashLightning);
    };

    // First flash after a short delay
    this.lightningTimer = this.scene.time.delayedCall(
      1000 + Math.random() * 4000,
      flashLightning
    );
  }

  stopAll() {
    // Stop particle emitter
    if (this.emitter) {
      this.emitter.destroy();
      this.emitter = null;
    }

    // Clear fog
    if (this.fogOverlay) {
      this.fogOverlay.setFillStyle(0x889988, 0);
    }

    // Clear lightning
    if (this.lightningTimer) {
      this.lightningTimer.remove(false);
      this.lightningTimer = null;
    }
    if (this.lightningOverlay) {
      this.lightningOverlay.setFillStyle(0xffffff, 0);
    }
  }

  destroy() {
    this.stopAll();
    if (this.fogOverlay) {
      this.fogOverlay.destroy();
      this.fogOverlay = null;
    }
    if (this.lightningOverlay) {
      this.lightningOverlay.destroy();
      this.lightningOverlay = null;
    }
  }
}
