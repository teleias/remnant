// Programmatic texture generation utilities for REMNANT
// Generates PZ-quality isometric tiles, object sprites, and character sprites
// All textures are created on Phaser canvas textures at runtime

import { TILE } from '../config/constants.js';
import { SimplexNoise } from './noise.js';

const HALF_W = TILE.HALF_W;
const HALF_H = TILE.HALF_H;

// Check if a pixel is inside the isometric diamond
function insideDiamond(px, py) {
  return (Math.abs(px - HALF_W) / HALF_W + Math.abs(py - HALF_H) / HALF_H) <= 1;
}

// Parse hex color to RGB
function hexToRgb(hex) {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  };
}

// Lerp between two RGB colors
function lerpColor(c1, c2, t) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

// Draw the isometric diamond outline + fill
function drawDiamond(ctx, fillColor, strokeColor) {
  ctx.beginPath();
  ctx.moveTo(HALF_W, 0);
  ctx.lineTo(TILE.WIDTH, HALF_H);
  ctx.lineTo(HALF_W, TILE.HEIGHT);
  ctx.lineTo(0, HALF_H);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

// Fill diamond with simplex noise variation for natural look
function fillWithNoise(ctx, baseColor, noise, seed, scale, intensity) {
  const base = hexToRgb(baseColor);
  const imgData = ctx.getImageData(0, 0, TILE.WIDTH, TILE.HEIGHT);
  const data = imgData.data;

  for (let py = 0; py < TILE.HEIGHT; py++) {
    for (let px = 0; px < TILE.WIDTH; px++) {
      if (!insideDiamond(px, py)) continue;
      const idx = (py * TILE.WIDTH + px) * 4;
      if (data[idx + 3] === 0) continue;

      const n = noise.noise2D((px + seed) * scale, (py + seed) * scale);
      const variation = n * intensity;

      data[idx] = Math.max(0, Math.min(255, base.r + variation * 30));
      data[idx + 1] = Math.max(0, Math.min(255, base.g + variation * 25));
      data[idx + 2] = Math.max(0, Math.min(255, base.b + variation * 20));
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// Add scattered detail dots (pebbles, grass blades, etc)
function addDetails(ctx, color, count, rng) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const px = HALF_W + (rng() - 0.5) * TILE.WIDTH * 0.65;
    const py = HALF_H + (rng() - 0.5) * TILE.HEIGHT * 0.45;
    if (!insideDiamond(px, py)) continue;
    const size = 0.5 + rng() * 1.5;
    ctx.fillRect(px, py, size, size);
  }
}

// Generate all tile textures with variants
export function generateTileset(scene) {
  const noise = new SimplexNoise(42);

  const tileConfigs = {
    grass: {
      variants: 3,
      fills: ['#4a6a32', '#436228', '#4e7036'],
      stroke: '#3a5222',
      noiseScale: 0.15,
      noiseIntensity: 1.2,
      details: { color: 'rgba(60,100,40,0.4)', count: 15 },
    },
    grass_dark: {
      variants: 3,
      fills: ['#365a22', '#2e5018', '#3c6228'],
      stroke: '#264a12',
      noiseScale: 0.12,
      noiseIntensity: 1.0,
      details: { color: 'rgba(30,60,20,0.5)', count: 12 },
    },
    dirt: {
      variants: 3,
      fills: ['#7a6a4a', '#6e5e3e', '#847050'],
      stroke: '#5a4a2a',
      noiseScale: 0.18,
      noiseIntensity: 1.5,
      details: { color: 'rgba(90,70,40,0.3)', count: 10 },
    },
    stone: {
      variants: 2,
      fills: ['#7a7a72', '#6e6e68'],
      stroke: '#5a5a55',
      noiseScale: 0.2,
      noiseIntensity: 2.0,
      details: { color: 'rgba(100,100,90,0.3)', count: 8 },
    },
    sand: {
      variants: 2,
      fills: ['#c4b078', '#baa86e'],
      stroke: '#a49058',
      noiseScale: 0.1,
      noiseIntensity: 0.8,
      details: { color: 'rgba(180,160,100,0.2)', count: 6 },
    },
    water: {
      variants: 3,
      fills: ['#2a6080', '#265878', '#2e6888'],
      stroke: '#1a4a60',
      noiseScale: 0.08,
      noiseIntensity: 0.6,
      details: null,
      wave: true,
    },
    water_deep: {
      variants: 2,
      fills: ['#1a4060', '#163858'],
      stroke: '#0a2a40',
      noiseScale: 0.06,
      noiseIntensity: 0.4,
      details: null,
      wave: true,
    },
    snow: {
      variants: 2,
      fills: ['#dde8ee', '#d4e0e8'],
      stroke: '#c0d0da',
      noiseScale: 0.1,
      noiseIntensity: 0.5,
      details: { color: 'rgba(200,220,240,0.3)', count: 8 },
    },
    road: {
      variants: 2,
      fills: ['#4a4a44', '#424240'],
      stroke: '#3a3a35',
      noiseScale: 0.15,
      noiseIntensity: 1.0,
      details: { color: 'rgba(60,60,55,0.3)', count: 6 },
    },
  };

  const rng = mulberry32(12345);

  for (const [name, cfg] of Object.entries(tileConfigs)) {
    for (let v = 0; v < cfg.variants; v++) {
      const texName = `tile_${name}_${v}`;
      const canvas = scene.textures.createCanvas(texName, TILE.WIDTH, TILE.HEIGHT);
      const ctx = canvas.context;

      drawDiamond(ctx, cfg.fills[v % cfg.fills.length], cfg.stroke);
      fillWithNoise(ctx, cfg.fills[v % cfg.fills.length], noise, v * 1000, cfg.noiseScale, cfg.noiseIntensity);

      if (cfg.details) {
        addDetails(ctx, cfg.details.color, cfg.details.count, rng);
      }

      if (cfg.wave) {
        ctx.strokeStyle = 'rgba(120,180,220,0.15)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
          const y = HALF_H * 0.5 + i * 6 + v * 2;
          ctx.beginPath();
          ctx.moveTo(HALF_W * 0.4, y);
          ctx.quadraticCurveTo(HALF_W, y - 2 + i, HALF_W * 1.6, y);
          ctx.stroke();
        }
      }

      canvas.refresh();
    }
  }

  // Also generate legacy single-name textures for compatibility
  const legacyMap = {
    tile_grass: 'tile_grass_0', tile_grass_dark: 'tile_grass_dark_0',
    tile_dirt: 'tile_dirt_0', tile_stone: 'tile_stone_0',
    tile_sand: 'tile_sand_0', tile_water: 'tile_water_0',
    tile_water_deep: 'tile_water_deep_0', tile_snow: 'tile_snow_0',
    tile_road: 'tile_road_0',
  };
  // Phaser doesn't support texture aliases easily, so we skip this
  // The TileMap will use the variant naming directly

  generateBuildingTiles(scene, noise, rng);
}

function generateBuildingTiles(scene, noise, rng) {
  // Wood floor
  const wfCanvas = scene.textures.createCanvas('tile_wood_floor_0', TILE.WIDTH, TILE.HEIGHT);
  const wfCtx = wfCanvas.context;
  drawDiamond(wfCtx, '#6a5030', '#5a4020');
  // Plank lines
  wfCtx.strokeStyle = 'rgba(0,0,0,0.2)';
  wfCtx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    const y = (TILE.HEIGHT / 4) * i;
    wfCtx.beginPath();
    wfCtx.moveTo(HALF_W * 0.3, y);
    wfCtx.lineTo(TILE.WIDTH - HALF_W * 0.3, y);
    wfCtx.stroke();
  }
  fillWithNoise(wfCtx, '#6a5030', noise, 5000, 0.12, 0.8);
  wfCanvas.refresh();

  // Tile floor
  const tfCanvas = scene.textures.createCanvas('tile_tile_floor_0', TILE.WIDTH, TILE.HEIGHT);
  const tfCtx = tfCanvas.context;
  drawDiamond(tfCtx, '#8a8a7a', '#7a7a6a');
  fillWithNoise(tfCtx, '#8a8a7a', noise, 6000, 0.1, 0.5);
  tfCanvas.refresh();

  // Wall textures
  const walls = [
    { name: 'wall_wood', fill: '#5a4020', stroke: '#4a3010' },
    { name: 'wall_stone', fill: '#6a6a6a', stroke: '#5a5a5a' },
  ];
  for (const w of walls) {
    const c = scene.textures.createCanvas(`tile_${w.name}`, TILE.WIDTH, TILE.HEIGHT);
    const cx = c.context;
    drawDiamond(cx, w.fill, w.stroke);
    c.refresh();
  }

  // Roof
  const roofCanvas = scene.textures.createCanvas('tile_roof', TILE.WIDTH, TILE.HEIGHT);
  const roofCtx = roofCanvas.context;
  drawDiamond(roofCtx, '#4a3020', '#3a2010');
  roofCanvas.refresh();
}

// Generate tree sprites (3 variants)
export function generateTreeSprites(scene) {
  const rng = mulberry32(7777);

  for (let v = 0; v < 3; v++) {
    const w = 40, h = 56;
    const canvas = scene.textures.createCanvas(`obj_tree_${v}`, w, h);
    const ctx = canvas.context;

    // Trunk
    const trunkW = 4 + v;
    const trunkH = 18 + v * 2;
    const trunkX = w / 2 - trunkW / 2;
    const trunkY = h - trunkH;
    ctx.fillStyle = `rgb(${70 + v * 5}, ${45 + v * 3}, ${20 + v * 2})`;
    ctx.fillRect(trunkX, trunkY, trunkW, trunkH);

    // Canopy: 2-3 overlapping ellipses
    const canopyLayers = 2 + (v % 2);
    const greens = ['#2a5a1a', '#336622', '#2e6020', '#3a7028'];
    for (let i = 0; i < canopyLayers; i++) {
      const cx = w / 2 + (rng() - 0.5) * 8;
      const cy = trunkY - 4 + i * 4 - canopyLayers * 3;
      const rx = 12 + rng() * 6;
      const ry = 8 + rng() * 5;
      ctx.fillStyle = greens[(v + i) % greens.length];
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Leaf detail dots
    for (let i = 0; i < 20; i++) {
      const dx = w / 2 + (rng() - 0.5) * 24;
      const dy = trunkY - 15 + rng() * 18 - 8;
      ctx.fillStyle = rng() > 0.5 ? 'rgba(50,90,30,0.6)' : 'rgba(80,120,50,0.4)';
      ctx.fillRect(dx, dy, 1 + rng(), 1 + rng());
    }

    canvas.refresh();
  }
}

// Generate rock sprites (2 variants)
export function generateRockSprites(scene) {
  const rng = mulberry32(8888);

  for (let v = 0; v < 2; v++) {
    const w = 24, h = 20;
    const canvas = scene.textures.createCanvas(`obj_rock_${v}`, w, h);
    const ctx = canvas.context;

    // Irregular rock shape using multiple overlapping ellipses
    const grays = ['#6a6a62', '#7a7a70', '#5e5e58'];
    ctx.fillStyle = grays[v];
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 2, w / 2.5, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = grays[(v + 1) % grays.length];
    ctx.beginPath();
    ctx.ellipse(w / 2 - 2, h / 2 - 1, w / 3, h / 3.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Highlight edge
    ctx.strokeStyle = 'rgba(200,200,190,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2.5 - 1, h / 3 - 1, 0, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();

    // Dark cracks
    ctx.strokeStyle = 'rgba(30,30,25,0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.4);
    ctx.lineTo(w * 0.5, h * 0.6);
    ctx.stroke();

    canvas.refresh();
  }
}

// Generate bush sprites (2 variants)
export function generateBushSprites(scene) {
  const rng = mulberry32(9999);

  for (let v = 0; v < 2; v++) {
    const w = 22, h = 18;
    const canvas = scene.textures.createCanvas(`obj_bush_${v}`, w, h);
    const ctx = canvas.context;

    // Base bush shape
    const greens = ['#3a6a28', '#2e5a20'];
    ctx.fillStyle = greens[v];
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 2, w / 2.3, h / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darker center
    ctx.fillStyle = 'rgba(20,40,15,0.3)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 3, w / 4, h / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Berry dots (red/blue for berry bushes)
    const berryColors = ['#cc3344', '#4466cc'];
    for (let i = 0; i < 5 + v * 2; i++) {
      const bx = w / 2 + (rng() - 0.5) * w * 0.6;
      const by = h / 2 + (rng() - 0.5) * h * 0.4;
      ctx.fillStyle = berryColors[Math.floor(rng() * 2)];
      ctx.beginPath();
      ctx.arc(bx, by, 1 + rng() * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Leaf highlights
    for (let i = 0; i < 8; i++) {
      const lx = w / 2 + (rng() - 0.5) * w * 0.5;
      const ly = h / 2 + (rng() - 0.5) * h * 0.4;
      ctx.fillStyle = 'rgba(80,130,50,0.4)';
      ctx.fillRect(lx, ly, 1.5, 1);
    }

    canvas.refresh();
  }
}

// Generate campfire sprite
export function generateCampfireSprite(scene) {
  const w = 32, h = 36;
  const canvas = scene.textures.createCanvas('obj_campfire', w, h);
  const ctx = canvas.context;

  // Stone ring (8 small stones in a circle)
  const stoneColor = '#6a6a60';
  const ringR = 10;
  const cx = w / 2, cy = h / 2 + 4;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const sx = cx + Math.cos(angle) * ringR;
    const sy = cy + Math.sin(angle) * ringR * 0.5; // Flatten for iso
    ctx.fillStyle = stoneColor;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wood logs
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(cx - 6, cy - 1, 12, 3);
  ctx.fillRect(cx - 2, cy - 4, 3, 10);

  // Flame
  ctx.fillStyle = '#ff8822';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 14);
  ctx.lineTo(cx + 5, cy - 2);
  ctx.lineTo(cx - 5, cy - 2);
  ctx.closePath();
  ctx.fill();

  // Inner flame
  ctx.fillStyle = '#ffcc44';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx + 3, cy - 3);
  ctx.lineTo(cx - 3, cy - 3);
  ctx.closePath();
  ctx.fill();

  // Glow circle
  ctx.fillStyle = 'rgba(255,140,40,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  canvas.refresh();
}

// Generate improved player sprite with 4 directional frames
export function generatePlayerSprites(scene) {
  const dirs = ['S', 'W', 'N', 'E'];
  const size = 32;

  for (let d = 0; d < dirs.length; d++) {
    const canvas = scene.textures.createCanvas(`player_${dirs[d]}`, size, size + 8);
    const ctx = canvas.context;
    const cx = size / 2;

    // Body colors
    const skinColor = '#ddbb99';
    const hairColor = '#3a2a1a';
    const shirtColor = '#445566';
    const pantsColor = '#334455';
    const bootColor = '#2a1a0a';

    if (dirs[d] === 'S' || dirs[d] === 'N') {
      // Front/back facing
      // Head
      ctx.fillStyle = dirs[d] === 'S' ? skinColor : hairColor;
      ctx.beginPath();
      ctx.arc(cx, 9, 5, 0, Math.PI * 2);
      ctx.fill();

      if (dirs[d] === 'S') {
        // Hair on top for front
        ctx.fillStyle = hairColor;
        ctx.fillRect(cx - 5, 4, 10, 4);
      }

      // Body
      ctx.fillStyle = shirtColor;
      ctx.fillRect(cx - 6, 14, 12, 10);

      // Arms
      ctx.fillStyle = shirtColor;
      ctx.fillRect(cx - 8, 14, 3, 8);
      ctx.fillRect(cx + 5, 14, 3, 8);

      // Hands
      ctx.fillStyle = skinColor;
      ctx.fillRect(cx - 8, 22, 3, 2);
      ctx.fillRect(cx + 5, 22, 3, 2);

      // Legs
      ctx.fillStyle = pantsColor;
      ctx.fillRect(cx - 5, 24, 4, 7);
      ctx.fillRect(cx + 1, 24, 4, 7);

      // Boots
      ctx.fillStyle = bootColor;
      ctx.fillRect(cx - 6, 30, 5, 3);
      ctx.fillRect(cx + 1, 30, 5, 3);
    } else {
      // Side facing (W or E)
      const flip = dirs[d] === 'E' ? 1 : -1;
      const ox = dirs[d] === 'E' ? 0 : 2;

      // Head
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(cx + ox, 9, 5, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = hairColor;
      if (dirs[d] === 'W') {
        ctx.fillRect(cx + ox - 5, 4, 8, 4);
        ctx.fillRect(cx + ox + 2, 5, 3, 6);
      } else {
        ctx.fillRect(cx + ox - 3, 4, 8, 4);
        ctx.fillRect(cx + ox - 5, 5, 3, 6);
      }

      // Body
      ctx.fillStyle = shirtColor;
      ctx.fillRect(cx + ox - 4, 14, 8, 10);

      // Arm (visible side)
      ctx.fillStyle = shirtColor;
      const armX = dirs[d] === 'E' ? cx + ox + 3 : cx + ox - 6;
      ctx.fillRect(armX, 15, 3, 7);
      ctx.fillStyle = skinColor;
      ctx.fillRect(armX, 22, 3, 2);

      // Legs
      ctx.fillStyle = pantsColor;
      ctx.fillRect(cx + ox - 3, 24, 3, 7);
      ctx.fillRect(cx + ox + 1, 24, 3, 7);

      // Boots
      ctx.fillStyle = bootColor;
      ctx.fillRect(cx + ox - 4, 30, 4, 3);
      ctx.fillRect(cx + ox + 1, 30, 4, 3);
    }

    canvas.refresh();
  }

  // Also keep a default 'player' texture (south facing) for compatibility
  const defaultCanvas = scene.textures.createCanvas('player', size, size + 8);
  const dCtx = defaultCanvas.context;
  const existingCanvas = scene.textures.getCanvas('player_S');
  if (existingCanvas) {
    dCtx.drawImage(existingCanvas.canvas, 0, 0);
  }
  defaultCanvas.refresh();
}

// Generate UI textures
export function generateUITextures(scene) {
  // Panel background
  const panelCanvas = scene.textures.createCanvas('ui_panel', 4, 4);
  const pCtx = panelCanvas.context;
  pCtx.fillStyle = 'rgba(10, 12, 10, 0.92)';
  pCtx.fillRect(0, 0, 4, 4);
  panelCanvas.refresh();

  // Slot background
  const slotCanvas = scene.textures.createCanvas('ui_slot', 48, 48);
  const sCtx = slotCanvas.context;
  sCtx.fillStyle = 'rgba(20, 22, 20, 0.8)';
  sCtx.fillRect(0, 0, 48, 48);
  sCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  sCtx.lineWidth = 1;
  sCtx.strokeRect(0.5, 0.5, 47, 47);
  slotCanvas.refresh();

  // Slot highlight
  const slotHCanvas = scene.textures.createCanvas('ui_slot_active', 48, 48);
  const shCtx = slotHCanvas.context;
  shCtx.fillStyle = 'rgba(30, 35, 30, 0.85)';
  shCtx.fillRect(0, 0, 48, 48);
  shCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  shCtx.lineWidth = 1;
  shCtx.strokeRect(0.5, 0.5, 47, 47);
  slotHCanvas.refresh();
}

// Generate simple animal silhouettes
export function generateAnimalSprites(scene) {
  const animals = {
    deer:    { color: '#8B6914', w: 24, h: 16 },
    rabbit:  { color: '#AA9988', w: 12, h: 10 },
    wolf:    { color: '#555555', w: 20, h: 14 },
    bear:    { color: '#3B2508', w: 28, h: 22 },
    cougar:  { color: '#AA8844', w: 22, h: 12 },
    raven:   { color: '#222222', w: 10, h: 8 },
  };

  for (const [name, cfg] of Object.entries(animals)) {
    const canvas = scene.textures.createCanvas(`animal_${name}`, cfg.w, cfg.h);
    const ctx = canvas.context;

    // Body ellipse
    ctx.fillStyle = cfg.color;
    ctx.beginPath();
    ctx.ellipse(cfg.w / 2, cfg.h / 2, cfg.w / 2.2, cfg.h / 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(cfg.w * 0.8, cfg.h * 0.3, cfg.w / 6, cfg.h / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs for non-flying
    if (name !== 'raven') {
      ctx.fillStyle = cfg.color;
      const legW = Math.max(1, cfg.w / 10);
      ctx.fillRect(cfg.w * 0.25, cfg.h * 0.7, legW, cfg.h * 0.3);
      ctx.fillRect(cfg.w * 0.65, cfg.h * 0.7, legW, cfg.h * 0.3);
    }

    canvas.refresh();
  }
}

// Mulberry32 seeded RNG
function mulberry32(seed) {
  let s = seed;
  return function() {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
