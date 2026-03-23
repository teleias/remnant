// TimeSystem — Advances game clock, manages day/night lighting overlay,
// triggers season changes, and controls weather transitions.

import { TIME, DEPTH } from '../config/constants.js';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

// Color presets for day/night cycle
const NIGHT_COLOR = 0x1a2844;    // Cold blue
const DAWN_COLOR = 0xd4884a;     // Warm orange
const DUSK_COLOR = 0xc46a30;     // Deep orange
const NIGHT_ALPHA = 0.62;
const DAWN_ALPHA = 0.25;
const DUSK_ALPHA = 0.3;

export default class TimeSystem {
  constructor(scene, gameState) {
    this.scene = scene;
    this.gs = gameState;
    this.events = scene.gameEvents;
    this.overlay = null;
    this.lastHour = -1;
    this.weatherTimer = 0;
  }

  create() {
    // Full-screen overlay for day/night tinting
    // Must be in the GameScene at DEPTH.WEATHER with scrollFactor 0
    this.overlay = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      this.scene.cameras.main.width * 3,
      this.scene.cameras.main.height * 3,
      NIGHT_COLOR, 0
    );
    this.overlay.setScrollFactor(0);
    this.overlay.setDepth(DEPTH.WEATHER);
    this.overlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Apply initial lighting
    this.updateLighting();

    // Resize handler
    this.scene.scale.on('resize', (gameSize) => {
      this.overlay.setPosition(gameSize.width / 2, gameSize.height / 2);
      this.overlay.setSize(gameSize.width * 3, gameSize.height * 3);
    });
  }

  update(dt) {
    const time = this.gs.time;
    const prevHour = Math.floor(time.hour);

    // Advance clock
    time.hour += dt / TIME.SECONDS_PER_HOUR;

    // Day rollover
    if (time.hour >= 24) {
      time.hour -= 24;
      time.day += 1;
      time.dayOfSeason += 1;

      // Season rollover
      if (time.dayOfSeason > TIME.DAYS_PER_SEASON) {
        time.dayOfSeason = 1;
        const currentIdx = SEASONS.indexOf(time.season);
        time.season = SEASONS[(currentIdx + 1) % SEASONS.length];
        this.events.emit('time:seasonChanged', { season: time.season });
      }

      this.events.emit('time:dayChanged', { day: time.day });
    }

    // Emit hourly event
    const currentHour = Math.floor(time.hour);
    if (currentHour !== prevHour) {
      this.events.emit('time:hourChanged', { hour: currentHour });
    }

    // Update weather timer
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.advanceWeather();
    }

    // Update lighting overlay
    this.updateLighting();
  }

  updateLighting() {
    if (!this.overlay) return;
    const hour = this.gs.time.hour;

    let color = 0x000000;
    let alpha = 0;

    if (hour >= 7 && hour < TIME.DUSK_START) {
      // Full day: no overlay
      alpha = 0;
      color = 0xffffff;
    } else if (hour >= TIME.DAWN_START && hour < TIME.DAWN_END) {
      // Dawn transition: warm orange fading out
      const t = (hour - TIME.DAWN_START) / (TIME.DAWN_END - TIME.DAWN_START);
      color = this.lerpColor(DAWN_COLOR, 0xffffff, t);
      alpha = DAWN_ALPHA * (1 - t);
    } else if (hour >= TIME.DUSK_START && hour < TIME.DUSK_END) {
      // Dusk transition: warm to cold blue
      const t = (hour - TIME.DUSK_START) / (TIME.DUSK_END - TIME.DUSK_START);
      color = this.lerpColor(DUSK_COLOR, NIGHT_COLOR, t);
      alpha = DUSK_ALPHA + (NIGHT_ALPHA - DUSK_ALPHA) * t;
    } else {
      // Night
      color = NIGHT_COLOR;
      alpha = NIGHT_ALPHA;
    }

    this.overlay.setFillStyle(color, alpha);
  }

  advanceWeather() {
    const weather = this.gs.weather;
    const season = this.gs.time.season;

    // Weather probability based on season
    const weatherPool = this.getWeatherPool(season);
    const roll = Math.random();
    let cumulative = 0;

    for (const entry of weatherPool) {
      cumulative += entry.weight;
      if (roll < cumulative) {
        weather.current = entry.type;
        break;
      }
    }

    // Update temperature based on season and weather
    weather.temperature = this.getBaseTemperature(season);

    // Set next weather change timer
    const minDur = 60;
    const maxDur = 300;
    this.weatherTimer = minDur + Math.random() * (maxDur - minDur);

    this.events.emit('weather:changed', {
      weather: weather.current,
      temperature: weather.temperature,
    });
  }

  getWeatherPool(season) {
    switch (season) {
      case 'summer':
        return [
          { type: 'clear', weight: 0.55 },
          { type: 'cloudy', weight: 0.2 },
          { type: 'rain', weight: 0.15 },
          { type: 'wind', weight: 0.07 },
          { type: 'storm', weight: 0.03 },
        ];
      case 'autumn':
        return [
          { type: 'clear', weight: 0.3 },
          { type: 'cloudy', weight: 0.25 },
          { type: 'rain', weight: 0.2 },
          { type: 'heavy_rain', weight: 0.1 },
          { type: 'wind', weight: 0.1 },
          { type: 'storm', weight: 0.05 },
        ];
      case 'winter':
        return [
          { type: 'clear', weight: 0.2 },
          { type: 'cloudy', weight: 0.2 },
          { type: 'snow', weight: 0.3 },
          { type: 'wind', weight: 0.15 },
          { type: 'storm', weight: 0.15 },
        ];
      case 'spring':
      default:
        return [
          { type: 'clear', weight: 0.4 },
          { type: 'cloudy', weight: 0.2 },
          { type: 'rain', weight: 0.25 },
          { type: 'wind', weight: 0.1 },
          { type: 'storm', weight: 0.05 },
        ];
    }
  }

  getBaseTemperature(season) {
    switch (season) {
      case 'summer': return 75 + Math.random() * 15;
      case 'autumn': return 55 + Math.random() * 15;
      case 'winter': return 25 + Math.random() * 15;
      case 'spring': return 55 + Math.random() * 20;
      default: return 65;
    }
  }

  lerpColor(c1, c2, t) {
    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }

  destroy() {
    if (this.overlay) this.overlay.destroy();
  }
}
