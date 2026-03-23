// Programmatic texture generation utilities for REMNANT
// Project Zomboid-quality isometric tiles, object sprites, and character sprites
// All textures are created on Phaser canvas textures at runtime

import { TILE } from '../config/constants.js';
import { SimplexNoise } from './noise.js';

const HALF_W = TILE.HALF_W;
const HALF_H = TILE.HALF_H;

// Mulberry32 seeded RNG for deterministic random generation
function mulberry32(seed) {
  let s = seed;
  return function() {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

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
function drawDiamond(ctx, fillColor, strokeColor = null) {
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

// Advanced multi-layer noise fill with isometric shading
function fillWithAdvancedNoise(ctx, baseColor, noise, seed, variant) {
  const base = hexToRgb(baseColor);
  const imgData = ctx.getImageData(0, 0, TILE.WIDTH, TILE.HEIGHT);
  const data = imgData.data;

  for (let py = 0; py < TILE.HEIGHT; py++) {
    for (let px = 0; px < TILE.WIDTH; px++) {
      if (!insideDiamond(px, py)) continue;
      const idx = (py * TILE.WIDTH + px) * 4;
      if (data[idx + 3] === 0) continue;

      // Multi-octave noise for organic texture
      const n1 = noise.noise2D((px + seed) * 0.08, (py + seed) * 0.08);
      const n2 = noise.noise2D((px + seed * 2) * 0.15, (py + seed * 2) * 0.15) * 0.5;
      const n3 = noise.noise2D((px + seed * 3) * 0.3, (py + seed * 3) * 0.3) * 0.25;
      const noise_combined = (n1 + n2 + n3) / 1.75;

      // Isometric shading: left face lighter, right face darker
      const dx = px - HALF_W;
      const dy = py - HALF_H;
      const leftFace = dx < 0 && Math.abs(dy / HALF_H) < Math.abs(dx / HALF_W);
      const rightFace = dx > 0 && Math.abs(dy / HALF_H) < Math.abs(dx / HALF_W);

      let shadingBoost = 0;
      if (leftFace) shadingBoost = 8;
      if (rightFace) shadingBoost = -8;

      // Apply noise and shading
      const variation = noise_combined * 25 + shadingBoost;
      data[idx] = Math.max(0, Math.min(255, base.r + variation));
      data[idx + 1] = Math.max(0, Math.min(255, base.g + variation));
      data[idx + 2] = Math.max(0, Math.min(255, base.b + variation));
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// Add scattered detail dots (grass blades, pebbles, etc)
function addScatteredDetails(ctx, colors, count, rng, sizeRange = [0.5, 2]) {
  for (let i = 0; i < count; i++) {
    const px = HALF_W + (rng() - 0.5) * TILE.WIDTH * 0.7;
    const py = HALF_H + (rng() - 0.5) * TILE.HEIGHT * 0.5;
    if (!insideDiamond(px, py)) continue;

    const colorChoice = Array.isArray(colors)
      ? colors[Math.floor(rng() * colors.length)]
      : colors;
    ctx.fillStyle = colorChoice;

    const size = sizeRange[0] + rng() * (sizeRange[1] - sizeRange[0]);
    ctx.fillRect(Math.floor(px), Math.floor(py), Math.ceil(size), Math.ceil(size));
  }
}

// Add crack lines for stone textures
function addCracks(ctx, noise, seed, count, rng) {
  ctx.strokeStyle = 'rgba(30, 30, 25, 0.4)';
  ctx.lineWidth = 0.5;

  for (let i = 0; i < count; i++) {
    const startX = HALF_W + (rng() - 0.5) * TILE.WIDTH * 0.5;
    const startY = HALF_H + (rng() - 0.5) * TILE.HEIGHT * 0.3;
    const length = 8 + rng() * 12;
    const angle = rng() * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);

    // Jagged crack line
    let cx = startX, cy = startY;
    for (let j = 0; j < 3; j++) {
      cx += Math.cos(angle) * (length / 3) + (rng() - 0.5) * 3;
      cy += Math.sin(angle) * (length / 3) + (rng() - 0.5) * 3;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
}

// Add water ripples
function addWaterRipples(ctx, variant) {
  ctx.strokeStyle = 'rgba(140, 200, 240, 0.15)';
  ctx.lineWidth = 0.5;

  for (let i = 0; i < 4; i++) {
    const y = HALF_H * 0.4 + i * 5 + variant * 2;
    const amplitude = 2 + i * 0.5;

    ctx.beginPath();
    ctx.moveTo(HALF_W * 0.3, y);
    ctx.quadraticCurveTo(HALF_W, y - amplitude, HALF_W * 1.7, y);
    ctx.stroke();
  }

  // Add shimmer dots
  ctx.fillStyle = 'rgba(200, 230, 255, 0.2)';
  const rng = mulberry32(variant * 999);
  for (let i = 0; i < 8; i++) {
    const px = HALF_W + (rng() - 0.5) * TILE.WIDTH * 0.6;
    const py = HALF_H + (rng() - 0.5) * TILE.HEIGHT * 0.4;
    if (insideDiamond(px, py)) {
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

// Generate all tile textures with variants
export function generateTileset(scene) {
  const noise = new SimplexNoise(42);
  const rng = mulberry32(12345);

  // GRASS TILES (3 variants)
  const grassColors = ['#4a6a32', '#456228', '#4e7038'];
  for (let v = 0; v < 3; v++) {
    const texName = `tile_grass_${v}`;
    const canvas = scene.textures.createCanvas(texName, TILE.WIDTH, TILE.HEIGHT);
    const ctx = canvas.context;

    drawDiamond(ctx, grassColors[v], '#3a5222');
    fillWithAdvancedNoise(ctx, grassColors[v], noise, v * 1000, v);

    // Grass blade details - multiple shades
    addScatteredDetails(ctx, [
      'rgba(60, 100, 40, 0.5)',
      'rgba(50, 90, 35, 0.4)',
      'rgba(70, 110, 45, 0.3)',
      'rgba(40, 80, 30, 0.6)'
    ], 18 + v * 2, rng, [0.5, 1.5]);

    canvas.refresh();
  }

  // GRASS DARK TILES (3 variants)
  const grassDarkColors = ['#365a22', '#2e5018', '#3c6228'];
  for (let v = 0; v < 3; v++) {
    const texName = `tile_grass_dark_${v}`;
    const canvas = scene.textures.createCanvas(texName, TILE.WIDTH, TILE.HEIGHT);
    const ctx = canvas.context;

    drawDiamond(ctx, grassDarkColors[v], '#264a12');
    fillWithAdvancedNoise(ctx, grassDarkColors[v], noise, v * 2000, v);

    addScatteredDetails(ctx, [
      'rgba(30, 60, 20, 0.6)',
      'rgba(25, 55, 18, 0.5)',
      'rgba(35, 65, 22, 0.4)'
    ], 15 + v * 2, rng, [0.5, 1.2]);

    canvas.refresh();
  }

  // DIRT TILES (3 variants)
  const dirtColors = ['#7a6a4a', '#6e5e3e', '#847050'];
  for (let v = 0; v < 3; v++) {
    const texName = `tile_dirt_${v}`;
    const canvas = scene.textures.createCanvas(texName, TILE.WIDTH, TILE.HEIGHT);
    const ctx = canvas.context;

    drawDiamond(ctx, dirtColors[v], '#5a4a2a');
    fillWithAdvancedNoise(ctx, dirtColors[v], noise, v * 3000, v);

    // Pebble details
    addScatteredDetails(ctx, [
      'rgba(90, 70, 40, 0.4)',
      'rgba(100, 80, 50, 0.3)',
      'rgba(80, 60, 35, 0.5)'
    ], 12 + v * 2, rng, [0.8, 2.5]);

    // Subtle wear lines
    ctx.strokeStyle = 'rgba(100, 80, 50, 0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 2; i++) {
      const y = HALF_H + (rng() - 0.5) * HALF_H;
      ctx.beginPath();
      ctx.moveTo(HALF_W * 0.4, y);
      ctx.lineTo(HALF_W * 1.6, y);
      ctx.stroke();
    }

    canvas.refresh();
  }

  // STONE TILES (2 variants)
  const stoneColors = ['#7a7a72', '#6e6e68'];
  for (let v = 0; v < 2; v++) {
    const texName = `tile_stone_${v}`;
    const canvas = scene.textures.createCanvas(texName, TILE.WIDTH, TILE.HEIGHT);
    const ctx = canvas.context;

    drawDiamond(ctx, stoneColors[v], '#5a5a55');
    fillWithAdvancedNoise(ctx, stoneColors[v], noise, v * 4000, v);

    // Stone pebbles
    addScatteredDetails(ctx, [
      'rgba(100, 100, 90, 0.4)',
      'rgba(110, 110, 100, 0.3)',
      'rgba(90, 90, 80, 0.5)'
    ], 10, rng, [0.8, 2]);

    // Crack lines
    addCracks(ctx, noise, v * 5000, 3 + v, rng);

    canvas.refresh();
  }

  // SAND TILES (2 variants)
  const sandColors = ['#c4b078', '#baa86e'];
  for (let v = 0; v < 2; v++) {
    const texName = `tile_sand_${v}`;
    const canvas = scene.textures.createCanvas(texName, TILE.WIDTH, TILE.HEIGHT);
    const ctx = canvas.context;

    drawDiamond(ctx, sandColors[v], '#a49058');
    fillWithAdvancedNoise(ctx, sandColors[v], noise, v * 5000, v);

    // Fine grain details
    addScatteredDetails(ctx, [
      'rgba(180, 160, 100, 0.25)',
      'rgba(190, 170, 110, 0.2)',
      'rgba(170, 150, 90, 0.3)'
    ], 20 + v * 3, rng, [0.3, 0.8]);

    canvas.refresh();
  }

  // WATER TILES (3 variants with ripples)
  const waterColors = ['#2a6080', '#265878', '#2e6888'];
  for (let v = 0; v < 3; v++) {
    const texName = `tile_water_${v}`;
    const canvas = scene.textures.createCanvas(texName, TILE.WIDTH, TILE.HEIGHT);
    const ctx = canvas.context;

    drawDiamond(ctx, waterColors[v], '#1a4a60');
    fillWithAdvancedNoise(ctx, waterColors[v], noise, v * 6000, v);
    addWaterRipples(ctx, v);

    canvas.refresh();
  }

  // DEEP WATER TILES (2 variants)
  const deepWaterColors = ['#1a4060', '#163858'];
  for (let v = 0; v < 2; v++) {
    const texName = `tile_water_deep_${v}`;
    const canvas = scene.textures.createCanvas(texName, TILE.WIDTH, TILE.HEIGHT);
    const ctx = canvas.context;

    drawDiamond(ctx, deepWaterColors[v], '#0a2a40');
    fillWithAdvancedNoise(ctx, deepWaterColors[v], noise, v * 7000, v);
    addWaterRipples(ctx, v + 3);

    canvas.refresh();
  }

  // SNOW TILES (2 variants)
  const snowColors = ['#dde8ee', '#d4e0e8'];
  for (let v = 0; v < 2; v++) {
    const texName = `tile_snow_${v}`;
    const canvas = scene.textures.createCanvas(texName, TILE.WIDTH, TILE.HEIGHT);
    const ctx = canvas.context;

    drawDiamond(ctx, snowColors[v], '#c0d0da');
    fillWithAdvancedNoise(ctx, snowColors[v], noise, v * 8000, v);

    // Sparkle dots and subtle blue-gray shadows
    addScatteredDetails(ctx, [
      'rgba(220, 235, 245, 0.5)',
      'rgba(210, 225, 235, 0.4)',
      'rgba(190, 210, 230, 0.3)'
    ], 12, rng, [0.5, 1.5]);

    canvas.refresh();
  }

  // ROAD TILES (2 variants)
  const roadColors = ['#4a4a44', '#424240'];
  for (let v = 0; v < 2; v++) {
    const texName = `tile_road_${v}`;
    const canvas = scene.textures.createCanvas(texName, TILE.WIDTH, TILE.HEIGHT);
    const ctx = canvas.context;

    drawDiamond(ctx, roadColors[v], '#3a3a35');
    fillWithAdvancedNoise(ctx, roadColors[v], noise, v * 9000, v);

    addScatteredDetails(ctx, [
      'rgba(60, 60, 55, 0.4)',
      'rgba(70, 70, 65, 0.3)'
    ], 8, rng, [0.8, 2]);

    canvas.refresh();
  }

  generateBuildingTiles(scene, noise, rng);
}

function generateBuildingTiles(scene, noise, rng) {
  // Wood floor
  const wfCanvas = scene.textures.createCanvas('tile_wood_floor_0', TILE.WIDTH, TILE.HEIGHT);
  const wfCtx = wfCanvas.context;
  drawDiamond(wfCtx, '#6a5030', '#5a4020');
  fillWithAdvancedNoise(wfCtx, '#6a5030', noise, 5000, 0);

  // Wood plank lines
  wfCtx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  wfCtx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    const y = (TILE.HEIGHT / 4) * i;
    wfCtx.beginPath();
    wfCtx.moveTo(HALF_W * 0.3, y);
    wfCtx.lineTo(TILE.WIDTH - HALF_W * 0.3, y);
    wfCtx.stroke();
  }
  wfCanvas.refresh();

  // Tile floor
  const tfCanvas = scene.textures.createCanvas('tile_tile_floor_0', TILE.WIDTH, TILE.HEIGHT);
  const tfCtx = tfCanvas.context;
  drawDiamond(tfCtx, '#8a8a7a', '#7a7a6a');
  fillWithAdvancedNoise(tfCtx, '#8a8a7a', noise, 6000, 0);
  tfCanvas.refresh();

  // Wall textures
  const wallWoodCanvas = scene.textures.createCanvas('tile_wall_wood', TILE.WIDTH, TILE.HEIGHT);
  const wwCtx = wallWoodCanvas.context;
  drawDiamond(wwCtx, '#5a4020', '#4a3010');
  fillWithAdvancedNoise(wwCtx, '#5a4020', noise, 7000, 0);
  wallWoodCanvas.refresh();

  const wallStoneCanvas = scene.textures.createCanvas('tile_wall_stone', TILE.WIDTH, TILE.HEIGHT);
  const wsCtx = wallStoneCanvas.context;
  drawDiamond(wsCtx, '#6a6a6a', '#5a5a5a');
  fillWithAdvancedNoise(wsCtx, '#6a6a6a', noise, 8000, 0);
  wallStoneCanvas.refresh();

  // Roof
  const roofCanvas = scene.textures.createCanvas('tile_roof', TILE.WIDTH, TILE.HEIGHT);
  const roofCtx = roofCanvas.context;
  drawDiamond(roofCtx, '#4a3020', '#3a2010');
  fillWithAdvancedNoise(roofCtx, '#4a3020', noise, 9000, 0);
  roofCanvas.refresh();

  // Dirt road tiles
  const drCanvas = scene.textures.createCanvas('tile_dirt_road_0', TILE.WIDTH, TILE.HEIGHT);
  const drCtx = drCanvas.context;
  drawDiamond(drCtx, '#7a6040', '#6a5030');
  fillWithAdvancedNoise(drCtx, '#7a6040', noise, 10000, 0);
  // Tire track lines
  drCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  drCtx.lineWidth = 1;
  drCtx.beginPath();
  drCtx.moveTo(HALF_W * 0.4, HALF_H * 0.6);
  drCtx.lineTo(HALF_W * 1.6, HALF_H * 1.4);
  drCtx.stroke();
  drCtx.beginPath();
  drCtx.moveTo(HALF_W * 0.5, HALF_H * 0.8);
  drCtx.lineTo(HALF_W * 1.5, HALF_H * 1.6);
  drCtx.stroke();
  drCanvas.refresh();

  const dr2Canvas = scene.textures.createCanvas('tile_dirt_road_1', TILE.WIDTH, TILE.HEIGHT);
  const dr2Ctx = dr2Canvas.context;
  drawDiamond(dr2Ctx, '#6a5535', '#5a4525');
  fillWithAdvancedNoise(dr2Ctx, '#6a5535', noise, 11000, 0);
  // Gravel dots
  for (let i = 0; i < 12; i++) {
    const gx = HALF_W + (rng() - 0.5) * HALF_W;
    const gy = HALF_H + (rng() - 0.5) * HALF_H * 0.6;
    if (insideDiamond(gx, gy)) {
      dr2Ctx.fillStyle = `rgba(${100 + rng()*40}, ${90 + rng()*30}, ${70 + rng()*20}, 0.5)`;
      dr2Ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  }
  dr2Canvas.refresh();

  // 3D isometric wall - wood
  const owwCanvas = scene.textures.createCanvas('obj_wall_wood', TILE.WIDTH, TILE.HEIGHT + 16);
  const owwCtx = owwCanvas.context;
  // Wall face (top portion - vertical surface)
  owwCtx.fillStyle = '#5a4020';
  owwCtx.beginPath();
  owwCtx.moveTo(0, HALF_H);          // left
  owwCtx.lineTo(HALF_W, 0);          // top
  owwCtx.lineTo(TILE.WIDTH, HALF_H); // right
  owwCtx.lineTo(TILE.WIDTH, HALF_H + 16); // right bottom
  owwCtx.lineTo(HALF_W, TILE.HEIGHT + 16); // bottom center
  owwCtx.lineTo(0, HALF_H + 16);     // left bottom
  owwCtx.closePath();
  owwCtx.fill();
  // Front face darker
  owwCtx.fillStyle = '#4a3515';
  owwCtx.beginPath();
  owwCtx.moveTo(0, HALF_H);
  owwCtx.lineTo(HALF_W, TILE.HEIGHT);
  owwCtx.lineTo(HALF_W, TILE.HEIGHT + 16);
  owwCtx.lineTo(0, HALF_H + 16);
  owwCtx.closePath();
  owwCtx.fill();
  // Side face slightly lighter
  owwCtx.fillStyle = '#6a5030';
  owwCtx.beginPath();
  owwCtx.moveTo(HALF_W, TILE.HEIGHT);
  owwCtx.lineTo(TILE.WIDTH, HALF_H);
  owwCtx.lineTo(TILE.WIDTH, HALF_H + 16);
  owwCtx.lineTo(HALF_W, TILE.HEIGHT + 16);
  owwCtx.closePath();
  owwCtx.fill();
  // Plank lines on front face
  owwCtx.strokeStyle = 'rgba(0,0,0,0.15)';
  owwCtx.lineWidth = 0.5;
  for (let i = 1; i <= 3; i++) {
    const y = HALF_H + i * 4;
    owwCtx.beginPath();
    owwCtx.moveTo(2, y);
    owwCtx.lineTo(HALF_W - 2, y + 8);
    owwCtx.stroke();
  }
  // Top edge highlight
  owwCtx.strokeStyle = 'rgba(255,255,255,0.1)';
  owwCtx.beginPath();
  owwCtx.moveTo(0, HALF_H);
  owwCtx.lineTo(HALF_W, 0);
  owwCtx.lineTo(TILE.WIDTH, HALF_H);
  owwCtx.stroke();
  owwCanvas.refresh();

  // 3D isometric wall - stone
  const owsCanvas = scene.textures.createCanvas('obj_wall_stone', TILE.WIDTH, TILE.HEIGHT + 16);
  const owsCtx = owsCanvas.context;
  owsCtx.fillStyle = '#6a6a6a';
  owsCtx.beginPath();
  owsCtx.moveTo(0, HALF_H);
  owsCtx.lineTo(HALF_W, 0);
  owsCtx.lineTo(TILE.WIDTH, HALF_H);
  owsCtx.lineTo(TILE.WIDTH, HALF_H + 16);
  owsCtx.lineTo(HALF_W, TILE.HEIGHT + 16);
  owsCtx.lineTo(0, HALF_H + 16);
  owsCtx.closePath();
  owsCtx.fill();
  owsCtx.fillStyle = '#555555';
  owsCtx.beginPath();
  owsCtx.moveTo(0, HALF_H);
  owsCtx.lineTo(HALF_W, TILE.HEIGHT);
  owsCtx.lineTo(HALF_W, TILE.HEIGHT + 16);
  owsCtx.lineTo(0, HALF_H + 16);
  owsCtx.closePath();
  owsCtx.fill();
  owsCtx.fillStyle = '#757575';
  owsCtx.beginPath();
  owsCtx.moveTo(HALF_W, TILE.HEIGHT);
  owsCtx.lineTo(TILE.WIDTH, HALF_H);
  owsCtx.lineTo(TILE.WIDTH, HALF_H + 16);
  owsCtx.lineTo(HALF_W, TILE.HEIGHT + 16);
  owsCtx.closePath();
  owsCtx.fill();
  // Brick lines
  owsCtx.strokeStyle = 'rgba(0,0,0,0.2)';
  owsCtx.lineWidth = 0.5;
  for (let i = 1; i <= 3; i++) {
    const y = HALF_H + i * 4;
    owsCtx.beginPath();
    owsCtx.moveTo(2, y);
    owsCtx.lineTo(HALF_W - 2, y + 8);
    owsCtx.stroke();
    owsCtx.beginPath();
    owsCtx.moveTo(HALF_W + 2, y + 8);
    owsCtx.lineTo(TILE.WIDTH - 2, y);
    owsCtx.stroke();
  }
  owsCtx.strokeStyle = 'rgba(255,255,255,0.08)';
  owsCtx.beginPath();
  owsCtx.moveTo(0, HALF_H);
  owsCtx.lineTo(HALF_W, 0);
  owsCtx.lineTo(TILE.WIDTH, HALF_H);
  owsCtx.stroke();
  owsCanvas.refresh();

  // Door sprite (opening in wall)
  const doorCanvas = scene.textures.createCanvas('obj_door', TILE.WIDTH, TILE.HEIGHT + 16);
  const doorCtx = doorCanvas.context;
  // Draw like wall but with a dark opening in center
  doorCtx.fillStyle = '#5a4020';
  doorCtx.beginPath();
  doorCtx.moveTo(0, HALF_H);
  doorCtx.lineTo(HALF_W, 0);
  doorCtx.lineTo(TILE.WIDTH, HALF_H);
  doorCtx.lineTo(TILE.WIDTH, HALF_H + 16);
  doorCtx.lineTo(HALF_W, TILE.HEIGHT + 16);
  doorCtx.lineTo(0, HALF_H + 16);
  doorCtx.closePath();
  doorCtx.fill();
  // Dark opening in front face
  doorCtx.fillStyle = '#1a1510';
  doorCtx.beginPath();
  doorCtx.moveTo(8, HALF_H + 4);
  doorCtx.lineTo(HALF_W - 4, TILE.HEIGHT + 2);
  doorCtx.lineTo(HALF_W - 4, TILE.HEIGHT + 14);
  doorCtx.lineTo(8, HALF_H + 14);
  doorCtx.closePath();
  doorCtx.fill();
  // Door frame
  doorCtx.strokeStyle = '#3a2a10';
  doorCtx.lineWidth = 1;
  doorCtx.stroke();
  doorCanvas.refresh();

  // Container (crate/shelf)
  const contCanvas = scene.textures.createCanvas('obj_container', 24, 28);
  const contCtx = contCanvas.context;
  // Crate body
  contCtx.fillStyle = '#6a5030';
  contCtx.fillRect(2, 8, 20, 18);
  // Top face
  contCtx.fillStyle = '#7a6040';
  contCtx.beginPath();
  contCtx.moveTo(2, 8);
  contCtx.lineTo(12, 2);
  contCtx.lineTo(22, 8);
  contCtx.lineTo(12, 14);
  contCtx.closePath();
  contCtx.fill();
  // Cross boards
  contCtx.strokeStyle = '#4a3520';
  contCtx.lineWidth = 1;
  contCtx.beginPath();
  contCtx.moveTo(4, 10);
  contCtx.lineTo(20, 24);
  contCtx.moveTo(20, 10);
  contCtx.lineTo(4, 24);
  contCtx.stroke();
  // Outline
  contCtx.strokeStyle = 'rgba(0,0,0,0.3)';
  contCtx.strokeRect(2, 8, 20, 18);
  contCanvas.refresh();

  // Bed furniture
  const bedCanvas = scene.textures.createCanvas('obj_furniture_bed', 32, 20);
  const bedCtx = bedCanvas.context;
  bedCtx.fillStyle = '#3a2a1a';
  bedCtx.fillRect(0, 4, 32, 16); // frame
  bedCtx.fillStyle = '#8a8a7a';
  bedCtx.fillRect(2, 2, 28, 14); // mattress
  bedCtx.fillStyle = '#6a7a6a';
  bedCtx.fillRect(2, 2, 8, 14); // pillow
  bedCtx.strokeStyle = 'rgba(0,0,0,0.2)';
  bedCtx.strokeRect(2, 2, 28, 14);
  bedCanvas.refresh();

  // Table furniture
  const tableCanvas = scene.textures.createCanvas('obj_furniture_table', 24, 16);
  const tableCtx = tableCanvas.context;
  tableCtx.fillStyle = '#5a4530';
  tableCtx.fillRect(2, 0, 20, 10); // top
  tableCtx.fillStyle = '#4a3520';
  tableCtx.fillRect(3, 10, 2, 6); // leg
  tableCtx.fillRect(19, 10, 2, 6); // leg
  tableCtx.strokeStyle = 'rgba(0,0,0,0.2)';
  tableCtx.strokeRect(2, 0, 20, 10);
  tableCanvas.refresh();

  // Vehicle sprites
  // Sedan
  const sedanCanvas = scene.textures.createCanvas('obj_car_sedan', 48, 28);
  const sedanCtx = sedanCanvas.context;
  // Body
  sedanCtx.fillStyle = '#3a5a7a';
  sedanCtx.beginPath();
  sedanCtx.moveTo(4, 18);
  sedanCtx.lineTo(8, 8);
  sedanCtx.lineTo(16, 4);
  sedanCtx.lineTo(32, 4);
  sedanCtx.lineTo(40, 8);
  sedanCtx.lineTo(44, 14);
  sedanCtx.lineTo(44, 22);
  sedanCtx.lineTo(4, 22);
  sedanCtx.closePath();
  sedanCtx.fill();
  // Windows
  sedanCtx.fillStyle = '#1a2a3a';
  sedanCtx.fillRect(12, 6, 10, 8);
  sedanCtx.fillRect(24, 6, 10, 8);
  // Wheels
  sedanCtx.fillStyle = '#1a1a1a';
  sedanCtx.beginPath(); sedanCtx.arc(12, 22, 4, 0, Math.PI*2); sedanCtx.fill();
  sedanCtx.beginPath(); sedanCtx.arc(36, 22, 4, 0, Math.PI*2); sedanCtx.fill();
  // Rust patches
  sedanCtx.fillStyle = 'rgba(120, 60, 30, 0.3)';
  sedanCtx.fillRect(20, 16, 6, 4);
  sedanCtx.fillRect(38, 12, 4, 6);
  sedanCanvas.refresh();

  // Truck
  const truckCanvas = scene.textures.createCanvas('obj_car_truck', 52, 30);
  const truckCtx = truckCanvas.context;
  truckCtx.fillStyle = '#4a3a2a';
  // Cab
  truckCtx.fillRect(2, 8, 18, 16);
  truckCtx.fillStyle = '#1a2a3a';
  truckCtx.fillRect(6, 10, 10, 8); // window
  // Bed
  truckCtx.fillStyle = '#3a2a1a';
  truckCtx.fillRect(20, 12, 28, 14);
  truckCtx.fillStyle = '#2a1a0a';
  truckCtx.fillRect(20, 12, 28, 2); // bed rail
  // Wheels
  truckCtx.fillStyle = '#1a1a1a';
  truckCtx.beginPath(); truckCtx.arc(12, 24, 4, 0, Math.PI*2); truckCtx.fill();
  truckCtx.beginPath(); truckCtx.arc(40, 24, 4, 0, Math.PI*2); truckCtx.fill();
  truckCanvas.refresh();

  // Van
  const vanCanvas = scene.textures.createCanvas('obj_car_van', 50, 32);
  const vanCtx = vanCanvas.context;
  vanCtx.fillStyle = '#5a5050';
  vanCtx.fillRect(2, 4, 46, 22);
  vanCtx.fillStyle = '#1a2a3a';
  vanCtx.fillRect(6, 6, 10, 8); // front window
  vanCtx.fillRect(18, 6, 6, 6); // side window
  vanCtx.fillRect(26, 6, 6, 6);
  vanCtx.fillStyle = '#1a1a1a';
  vanCtx.beginPath(); vanCtx.arc(14, 26, 4, 0, Math.PI*2); vanCtx.fill();
  vanCtx.beginPath(); vanCtx.arc(38, 26, 4, 0, Math.PI*2); vanCtx.fill();
  vanCanvas.refresh();

  // Wreck
  const wreckCanvas = scene.textures.createCanvas('obj_car_wreck', 40, 24);
  const wreckCtx = wreckCanvas.context;
  wreckCtx.fillStyle = '#6a3a2a';
  // Mangled body
  wreckCtx.beginPath();
  wreckCtx.moveTo(4, 16);
  wreckCtx.lineTo(6, 6);
  wreckCtx.lineTo(14, 2);
  wreckCtx.lineTo(28, 4);
  wreckCtx.lineTo(36, 10);
  wreckCtx.lineTo(36, 20);
  wreckCtx.lineTo(4, 20);
  wreckCtx.closePath();
  wreckCtx.fill();
  // Burn marks
  wreckCtx.fillStyle = 'rgba(20, 15, 10, 0.5)';
  wreckCtx.fillRect(10, 8, 12, 8);
  wreckCtx.fillRect(26, 6, 6, 10);
  // Broken window
  wreckCtx.strokeStyle = '#1a2a3a';
  wreckCtx.lineWidth = 1;
  wreckCtx.strokeRect(12, 4, 8, 6);
  // Wheels (one missing)
  wreckCtx.fillStyle = '#1a1a1a';
  wreckCtx.beginPath(); wreckCtx.arc(10, 20, 3, 0, Math.PI*2); wreckCtx.fill();
  wreckCanvas.refresh();
}

// Generate tree sprites (3 variants: round deciduous, tall pine, wide oak)
export function generateTreeSprites(scene) {
  const rng = mulberry32(7777);

  // Variant 0: Round deciduous tree
  const canvas0 = scene.textures.createCanvas('obj_tree_0', 44, 60);
  const ctx0 = canvas0.context;

  // Shadow
  ctx0.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx0.beginPath();
  ctx0.ellipse(22, 56, 8, 4, 0, 0, Math.PI * 2);
  ctx0.fill();

  // Trunk with bark texture
  const gradient0 = ctx0.createLinearGradient(18, 35, 26, 35);
  gradient0.addColorStop(0, '#5a3a20');
  gradient0.addColorStop(0.5, '#6a4a28');
  gradient0.addColorStop(1, '#4a2a18');
  ctx0.fillStyle = gradient0;
  ctx0.fillRect(18, 35, 8, 22);

  // Bark detail lines
  ctx0.strokeStyle = 'rgba(30, 20, 10, 0.5)';
  ctx0.lineWidth = 0.5;
  for (let i = 0; i < 5; i++) {
    const y = 38 + i * 4;
    ctx0.beginPath();
    ctx0.moveTo(18, y);
    ctx0.lineTo(26, y + 1);
    ctx0.stroke();
  }

  // Bark knots
  ctx0.fillStyle = 'rgba(20, 15, 10, 0.6)';
  ctx0.fillRect(20, 42, 2, 2);
  ctx0.fillRect(23, 48, 1, 1);

  // Canopy - multiple overlapping ellipses in different greens
  const greens0 = ['#2a5a1a', '#336622', '#2e6020', '#3a7028'];
  ctx0.fillStyle = greens0[2];
  ctx0.beginPath();
  ctx0.ellipse(22, 22, 16, 14, 0, 0, Math.PI * 2);
  ctx0.fill();

  ctx0.fillStyle = greens0[0];
  ctx0.beginPath();
  ctx0.ellipse(18, 18, 13, 11, 0, 0, Math.PI * 2);
  ctx0.fill();

  ctx0.fillStyle = greens0[1];
  ctx0.beginPath();
  ctx0.ellipse(26, 20, 12, 10, 0, 0, Math.PI * 2);
  ctx0.fill();

  ctx0.fillStyle = greens0[3];
  ctx0.beginPath();
  ctx0.ellipse(22, 16, 10, 9, 0, 0, Math.PI * 2);
  ctx0.fill();

  // Leaf detail dots - highlights and shadows
  for (let i = 0; i < 35; i++) {
    const lx = 22 + (rng() - 0.5) * 30;
    const ly = 20 + (rng() - 0.5) * 22;
    const dist = Math.sqrt(Math.pow(lx - 22, 2) + Math.pow(ly - 20, 2));
    if (dist < 16) {
      ctx0.fillStyle = rng() > 0.5 ? 'rgba(50, 90, 30, 0.5)' : 'rgba(80, 130, 50, 0.4)';
      ctx0.fillRect(lx, ly, 1, 1);
    }
  }
  canvas0.refresh();

  // Variant 1: Tall pine/conifer tree
  const canvas1 = scene.textures.createCanvas('obj_tree_1', 44, 60);
  const ctx1 = canvas1.context;

  // Shadow
  ctx1.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx1.beginPath();
  ctx1.ellipse(22, 56, 7, 3, 0, 0, Math.PI * 2);
  ctx1.fill();

  // Trunk
  const gradient1 = ctx1.createLinearGradient(19, 30, 25, 30);
  gradient1.addColorStop(0, '#6a4a28');
  gradient1.addColorStop(0.5, '#7a5a38');
  gradient1.addColorStop(1, '#5a3a20');
  ctx1.fillStyle = gradient1;
  ctx1.fillRect(19, 30, 6, 26);

  // Bark lines
  ctx1.strokeStyle = 'rgba(30, 20, 10, 0.5)';
  ctx1.lineWidth = 0.5;
  for (let i = 0; i < 6; i++) {
    ctx1.beginPath();
    ctx1.moveTo(19, 32 + i * 4);
    ctx1.lineTo(25, 33 + i * 4);
    ctx1.stroke();
  }

  // Pine foliage - triangular layers
  const pineGreens = ['#2e5a1e', '#2a5018', '#325a22'];

  // Bottom layer
  ctx1.fillStyle = pineGreens[0];
  ctx1.beginPath();
  ctx1.moveTo(22, 26);
  ctx1.lineTo(6, 38);
  ctx1.lineTo(38, 38);
  ctx1.closePath();
  ctx1.fill();

  // Middle layer
  ctx1.fillStyle = pineGreens[1];
  ctx1.beginPath();
  ctx1.moveTo(22, 16);
  ctx1.lineTo(8, 30);
  ctx1.lineTo(36, 30);
  ctx1.closePath();
  ctx1.fill();

  // Top layer
  ctx1.fillStyle = pineGreens[2];
  ctx1.beginPath();
  ctx1.moveTo(22, 6);
  ctx1.lineTo(12, 22);
  ctx1.lineTo(32, 22);
  ctx1.closePath();
  ctx1.fill();

  // Pine needle texture
  for (let i = 0; i < 40; i++) {
    const nx = 22 + (rng() - 0.5) * 26;
    const ny = 10 + rng() * 28;
    // Check if within triangular bounds
    const relY = ny - 6;
    const maxX = 10 + (relY / 32) * 16;
    if (Math.abs(nx - 22) < maxX) {
      ctx1.fillStyle = rng() > 0.6 ? 'rgba(40, 70, 25, 0.4)' : 'rgba(60, 100, 35, 0.3)';
      ctx1.fillRect(nx, ny, 1, 1);
    }
  }
  canvas1.refresh();

  // Variant 2: Wide spreading oak
  const canvas2 = scene.textures.createCanvas('obj_tree_2', 44, 60);
  const ctx2 = canvas2.context;

  // Shadow
  ctx2.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx2.beginPath();
  ctx2.ellipse(22, 56, 10, 5, 0, 0, Math.PI * 2);
  ctx2.fill();

  // Trunk - thicker for oak
  const gradient2 = ctx2.createLinearGradient(16, 32, 28, 32);
  gradient2.addColorStop(0, '#5a3a20');
  gradient2.addColorStop(0.5, '#6a4a28');
  gradient2.addColorStop(1, '#4a2a18');
  ctx2.fillStyle = gradient2;
  ctx2.fillRect(16, 32, 12, 24);

  // Bark texture
  ctx2.strokeStyle = 'rgba(30, 20, 10, 0.5)';
  ctx2.lineWidth = 0.5;
  for (let i = 0; i < 6; i++) {
    ctx2.beginPath();
    ctx2.moveTo(16, 34 + i * 4);
    ctx2.lineTo(28, 35 + i * 4);
    ctx2.stroke();
  }
  ctx2.fillStyle = 'rgba(20, 15, 10, 0.6)';
  ctx2.fillRect(18, 40, 2, 2);
  ctx2.fillRect(24, 46, 2, 2);
  ctx2.fillRect(20, 51, 1, 1);

  // Wide bushy canopy
  const oakGreens = ['#3a6a28', '#2e5a20', '#336622', '#2a5218'];

  // Outer canopy layers
  ctx2.fillStyle = oakGreens[0];
  ctx2.beginPath();
  ctx2.ellipse(10, 20, 12, 10, 0, 0, Math.PI * 2);
  ctx2.fill();

  ctx2.fillStyle = oakGreens[1];
  ctx2.beginPath();
  ctx2.ellipse(34, 22, 11, 9, 0, 0, Math.PI * 2);
  ctx2.fill();

  ctx2.fillStyle = oakGreens[2];
  ctx2.beginPath();
  ctx2.ellipse(22, 14, 14, 11, 0, 0, Math.PI * 2);
  ctx2.fill();

  ctx2.fillStyle = oakGreens[3];
  ctx2.beginPath();
  ctx2.ellipse(22, 20, 12, 10, 0, 0, Math.PI * 2);
  ctx2.fill();

  ctx2.fillStyle = oakGreens[0];
  ctx2.beginPath();
  ctx2.ellipse(16, 26, 10, 8, 0, 0, Math.PI * 2);
  ctx2.fill();

  ctx2.fillStyle = oakGreens[2];
  ctx2.beginPath();
  ctx2.ellipse(28, 24, 11, 9, 0, 0, Math.PI * 2);
  ctx2.fill();

  // Leaf detail
  for (let i = 0; i < 45; i++) {
    const lx = 22 + (rng() - 0.5) * 36;
    const ly = 20 + (rng() - 0.5) * 26;
    const dist = Math.sqrt(Math.pow(lx - 22, 2) + Math.pow(ly - 20, 2));
    if (dist < 18) {
      ctx2.fillStyle = rng() > 0.5 ? 'rgba(50, 90, 30, 0.6)' : 'rgba(80, 130, 50, 0.4)';
      ctx2.fillRect(lx, ly, 1, 1);
    }
  }
  canvas2.refresh();
}

// Generate rock sprites (2 variants with facets and moss)
export function generateRockSprites(scene) {
  const rng = mulberry32(8888);

  for (let v = 0; v < 2; v++) {
    const w = 28, h = 22;
    const canvas = scene.textures.createCanvas(`obj_rock_${v}`, w, h);
    const ctx = canvas.context;

    // Shadow underneath
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 2, w / 2.5, h / 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Irregular rock shape with multiple facets
    const grays = ['#6a6a62', '#7a7a70', '#5e5e58', '#6e6e68'];

    // Base shape
    ctx.fillStyle = grays[v];
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2.5, h / 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Secondary facet
    ctx.fillStyle = grays[(v + 1) % grays.length];
    ctx.beginPath();
    ctx.ellipse(w / 2 - 3, h / 2 - 2, w / 3.5, h / 3.2, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Third facet
    ctx.fillStyle = grays[(v + 2) % grays.length];
    ctx.beginPath();
    ctx.ellipse(w / 2 + 4, h / 2 + 1, w / 4, h / 3.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Highlight on top-left
    ctx.strokeStyle = 'rgba(200, 200, 190, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w / 2 - 2, h / 2 - 3, w / 6, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();

    // Shadow on bottom-right
    ctx.fillStyle = 'rgba(30, 30, 25, 0.25)';
    ctx.beginPath();
    ctx.ellipse(w / 2 + 3, h / 2 + 3, w / 6, h / 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crack lines
    ctx.strokeStyle = 'rgba(30, 30, 25, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.4);
    ctx.lineTo(w * 0.45, h * 0.55);
    ctx.lineTo(w * 0.5, h * 0.65);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.6, h * 0.35);
    ctx.lineTo(w * 0.7, h * 0.5);
    ctx.stroke();

    // Moss/lichen spots (subtle green specks)
    for (let i = 0; i < 5 + v * 2; i++) {
      const mx = w / 2 + (rng() - 0.5) * w * 0.5;
      const my = h / 2 + (rng() - 0.5) * h * 0.4;
      ctx.fillStyle = 'rgba(80, 100, 60, 0.4)';
      ctx.fillRect(mx, my, 1 + rng(), 1);
    }

    canvas.refresh();
  }
}

// Generate bush sprites (2 variants with berries and leaf clusters)
export function generateBushSprites(scene) {
  const rng = mulberry32(9999);

  for (let v = 0; v < 2; v++) {
    const w = 24, h = 20;
    const canvas = scene.textures.createCanvas(`obj_bush_${v}`, w, h);
    const ctx = canvas.context;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 2, w / 2.5, h / 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Multiple leaf cluster ellipses
    const greens = ['#3a6a28', '#2e5a20', '#336622', '#2a5218'];

    // Base cluster
    ctx.fillStyle = greens[v];
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 2, w / 2.3, h / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left cluster
    ctx.fillStyle = greens[(v + 1) % greens.length];
    ctx.beginPath();
    ctx.ellipse(w / 2 - 4, h / 2, w / 3.5, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right cluster
    ctx.fillStyle = greens[(v + 2) % greens.length];
    ctx.beginPath();
    ctx.ellipse(w / 2 + 4, h / 2 + 1, w / 3.5, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Top cluster
    ctx.fillStyle = greens[(v + 3) % greens.length];
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 - 2, w / 3.8, h / 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darker center shadow
    ctx.fillStyle = 'rgba(20, 40, 15, 0.4)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2 + 3, w / 5, h / 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Berry dots (alternating red and blue for variety)
    const berryColors = v === 0 ? ['#cc3344', '#dd4455'] : ['#4466cc', '#5577dd'];
    for (let i = 0; i < 7 + v * 3; i++) {
      const bx = w / 2 + (rng() - 0.5) * w * 0.6;
      const by = h / 2 + (rng() - 0.5) * h * 0.5;
      const dist = Math.sqrt(Math.pow(bx - w/2, 2) + Math.pow(by - h/2, 2));
      if (dist < w / 3) {
        ctx.fillStyle = berryColors[Math.floor(rng() * 2)];
        ctx.beginPath();
        ctx.arc(bx, by, 1 + rng() * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Berry highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(bx - 0.3, by - 0.3, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Leaf highlight details
    for (let i = 0; i < 12; i++) {
      const lx = w / 2 + (rng() - 0.5) * w * 0.5;
      const ly = h / 2 + (rng() - 0.5) * h * 0.4;
      const dist = Math.sqrt(Math.pow(lx - w/2, 2) + Math.pow(ly - h/2, 2));
      if (dist < w / 3) {
        ctx.fillStyle = 'rgba(80, 130, 50, 0.5)';
        ctx.fillRect(lx, ly, 1.5, 1);
      }
    }

    // Leaf shadow details
    for (let i = 0; i < 8; i++) {
      const lx = w / 2 + (rng() - 0.5) * w * 0.5;
      const ly = h / 2 + (rng() - 0.5) * h * 0.4;
      const dist = Math.sqrt(Math.pow(lx - w/2, 2) + Math.pow(ly - h/2, 2));
      if (dist < w / 3) {
        ctx.fillStyle = 'rgba(30, 50, 20, 0.4)';
        ctx.fillRect(lx, ly, 1.5, 1);
      }
    }

    canvas.refresh();
  }
}

// Generate campfire sprite with stone ring, logs, and layered flame
export function generateCampfireSprite(scene) {
  const w = 36, h = 40;
  const canvas = scene.textures.createCanvas('obj_campfire', w, h);
  const ctx = canvas.context;

  const cx = w / 2, cy = h / 2 + 6;

  // Ground glow circle (warm orange tint)
  const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
  glowGradient.addColorStop(0, 'rgba(255, 140, 40, 0.2)');
  glowGradient.addColorStop(1, 'rgba(255, 140, 40, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone ring (8-10 individual rounded stones in isometric perspective)
  const ringRadius = 11;
  const stoneCount = 9;
  for (let i = 0; i < stoneCount; i++) {
    const angle = (i / stoneCount) * Math.PI * 2;
    const sx = cx + Math.cos(angle) * ringRadius;
    const sy = cy + Math.sin(angle) * ringRadius * 0.4; // Flatten for iso view

    // Stone with gradient for depth
    const stoneGrad = ctx.createRadialGradient(sx - 1, sy - 0.5, 0, sx, sy, 3);
    stoneGrad.addColorStop(0, '#7a7a6a');
    stoneGrad.addColorStop(1, '#5a5a52');
    ctx.fillStyle = stoneGrad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 3.5, 2.5, angle, 0, Math.PI * 2);
    ctx.fill();

    // Stone highlight
    ctx.fillStyle = 'rgba(140, 140, 130, 0.4)';
    ctx.beginPath();
    ctx.arc(sx - 1, sy - 1, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wood logs crossed in center with bark texture
  const logGrad1 = ctx.createLinearGradient(cx - 8, cy, cx + 8, cy);
  logGrad1.addColorStop(0, '#4a2a18');
  logGrad1.addColorStop(0.5, '#5a3a20');
  logGrad1.addColorStop(1, '#4a2a18');
  ctx.fillStyle = logGrad1;
  ctx.fillRect(cx - 8, cy - 1, 16, 3.5);

  const logGrad2 = ctx.createLinearGradient(cx, cy - 6, cx, cy + 6);
  logGrad2.addColorStop(0, '#4a2a18');
  logGrad2.addColorStop(0.5, '#5a3a20');
  logGrad2.addColorStop(1, '#4a2a18');
  ctx.fillStyle = logGrad2;
  ctx.fillRect(cx - 1.5, cy - 6, 3.5, 12);

  // Bark lines on logs
  ctx.strokeStyle = 'rgba(20, 15, 10, 0.5)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy);
  ctx.lineTo(cx - 4, cy + 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 4, cy);
  ctx.lineTo(cx + 6, cy + 1);
  ctx.stroke();

  // Ember dots below flame
  const rng = mulberry32(6666);
  ctx.fillStyle = '#ff6622';
  for (let i = 0; i < 8; i++) {
    const ex = cx + (rng() - 0.5) * 12;
    const ey = cy + (rng() - 0.5) * 6;
    ctx.fillRect(ex, ey, 1, 1);
  }

  // Flame with 3 layers: outer red-orange, middle orange, inner yellow-white
  // Outer flame (red-orange)
  ctx.fillStyle = '#ff4422';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 18);
  ctx.quadraticCurveTo(cx - 2, cy - 14, cx - 7, cy - 4);
  ctx.lineTo(cx - 6, cy);
  ctx.quadraticCurveTo(cx - 3, cy - 2, cx, cy - 3);
  ctx.quadraticCurveTo(cx + 3, cy - 2, cx + 6, cy);
  ctx.lineTo(cx + 7, cy - 4);
  ctx.quadraticCurveTo(cx + 2, cy - 14, cx, cy - 18);
  ctx.closePath();
  ctx.fill();

  // Middle flame (orange)
  ctx.fillStyle = '#ff8822';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 15);
  ctx.quadraticCurveTo(cx - 1.5, cy - 12, cx - 5, cy - 4);
  ctx.lineTo(cx - 4, cy - 1);
  ctx.quadraticCurveTo(cx - 2, cy - 2, cx, cy - 2.5);
  ctx.quadraticCurveTo(cx + 2, cy - 2, cx + 4, cy - 1);
  ctx.lineTo(cx + 5, cy - 4);
  ctx.quadraticCurveTo(cx + 1.5, cy - 12, cx, cy - 15);
  ctx.closePath();
  ctx.fill();

  // Inner flame (yellow-white)
  ctx.fillStyle = '#ffdd44';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12);
  ctx.quadraticCurveTo(cx - 1, cy - 10, cx - 3, cy - 4);
  ctx.lineTo(cx - 2, cy - 2);
  ctx.quadraticCurveTo(cx - 1, cy - 2.5, cx, cy - 3);
  ctx.quadraticCurveTo(cx + 1, cy - 2.5, cx + 2, cy - 2);
  ctx.lineTo(cx + 3, cy - 4);
  ctx.quadraticCurveTo(cx + 1, cy - 10, cx, cy - 12);
  ctx.closePath();
  ctx.fill();

  // Bright core
  ctx.fillStyle = '#ffffaa';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx - 1.5, cy - 4);
  ctx.lineTo(cx + 1.5, cy - 4);
  ctx.closePath();
  ctx.fill();

  canvas.refresh();
}

// Generate improved player sprite with 4 directional frames
export function generatePlayerSprites(scene) {
  const dirs = ['S', 'W', 'N', 'E'];
  const size = 48;

  for (let d = 0; d < dirs.length; d++) {
    const canvas = scene.textures.createCanvas(`player_${dirs[d]}`, size, size + 16);
    const ctx = canvas.context;
    const cx = size / 2;

    // Body colors
    const skinColor = '#ddbb99';
    const hairColor = '#3a2a1a';
    const shirtColor = '#4a5a6a';
    const shirtShadow = '#3a4a5a';
    const pantsColor = '#334455';
    const bootColor = '#2a1a0a';

    if (dirs[d] === 'S') {
      // SOUTH - front facing

      // Head with gradient for depth
      const headGrad = ctx.createRadialGradient(cx - 1.5, 12, 1.5, cx, 14, 9);
      headGrad.addColorStop(0, '#eeccaa');
      headGrad.addColorStop(1, skinColor);
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(cx, 14, 9, 0, Math.PI * 2);
      ctx.fill();

      // Hair on top
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(cx, 8, 9, 0, Math.PI);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - 4.5, 12, 2.25, 2.25);
      ctx.fillRect(cx + 2.25, 12, 2.25, 2.25);

      // Torso with shading
      ctx.fillStyle = shirtColor;
      ctx.fillRect(cx - 9, 23, 18, 15);
      ctx.fillStyle = shirtShadow;
      ctx.fillRect(cx - 9, 23, 3, 15);
      ctx.fillRect(cx + 6, 23, 3, 15);

      // Collar detail
      ctx.fillStyle = shirtShadow;
      ctx.fillRect(cx - 3, 23, 6, 1.5);

      // Arms with rounded shoulders
      ctx.fillStyle = shirtColor;
      ctx.beginPath();
      ctx.arc(cx - 10.5, 26, 3.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 13.5, 26, 4.5, 10.5);

      ctx.beginPath();
      ctx.arc(cx + 10.5, 26, 3.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx + 9, 26, 4.5, 10.5);

      // Hands
      ctx.fillStyle = skinColor;
      ctx.fillRect(cx - 13.5, 36, 4.5, 3.75);
      ctx.fillRect(cx + 9, 36, 4.5, 3.75);

      // Legs
      ctx.fillStyle = pantsColor;
      ctx.fillRect(cx - 7.5, 38, 6, 12);
      ctx.fillRect(cx + 1.5, 38, 6, 12);

      // Boots with sole detail
      ctx.fillStyle = bootColor;
      ctx.fillRect(cx - 9, 48, 7.5, 6);
      ctx.fillRect(cx + 1.5, 48, 7.5, 6);

      // Boot soles
      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(cx - 9, 53, 7.5, 1.5);
      ctx.fillRect(cx + 1.5, 53, 7.5, 1.5);

    } else if (dirs[d] === 'N') {
      // NORTH - back facing

      // Head (mostly hair from back)
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(cx, 14, 9, 0, Math.PI * 2);
      ctx.fill();

      // Neck
      ctx.fillStyle = skinColor;
      ctx.fillRect(cx - 3, 20, 6, 3);

      // Torso
      ctx.fillStyle = shirtColor;
      ctx.fillRect(cx - 9, 23, 18, 15);
      ctx.fillStyle = shirtShadow;
      ctx.fillRect(cx - 1.5, 23, 3, 15);

      // Arms
      ctx.fillStyle = shirtColor;
      ctx.beginPath();
      ctx.arc(cx - 10.5, 26, 3.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 13.5, 26, 4.5, 10.5);

      ctx.beginPath();
      ctx.arc(cx + 10.5, 26, 3.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx + 9, 26, 4.5, 10.5);

      // Hands
      ctx.fillStyle = skinColor;
      ctx.fillRect(cx - 13.5, 36, 4.5, 3.75);
      ctx.fillRect(cx + 9, 36, 4.5, 3.75);

      // Legs
      ctx.fillStyle = pantsColor;
      ctx.fillRect(cx - 7.5, 38, 6, 12);
      ctx.fillRect(cx + 1.5, 38, 6, 12);

      // Boots
      ctx.fillStyle = bootColor;
      ctx.fillRect(cx - 9, 48, 7.5, 6);
      ctx.fillRect(cx + 1.5, 48, 7.5, 6);
      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(cx - 9, 53, 7.5, 1.5);
      ctx.fillRect(cx + 1.5, 53, 7.5, 1.5);

    } else {
      // WEST or EAST - side facing
      const flip = dirs[d] === 'E' ? 1 : -1;
      const ox = dirs[d] === 'E' ? 3 : -3;

      // Head
      const headGradSide = ctx.createRadialGradient(cx + ox - flip * 1.5, 12, 1.5, cx + ox, 14, 9);
      headGradSide.addColorStop(0, '#eeccaa');
      headGradSide.addColorStop(1, skinColor);
      ctx.fillStyle = headGradSide;
      ctx.beginPath();
      ctx.arc(cx + ox, 14, 9, 0, Math.PI * 2);
      ctx.fill();

      // Hair profile
      ctx.fillStyle = hairColor;
      if (dirs[d] === 'W') {
        ctx.beginPath();
        ctx.arc(cx + ox - 4.5, 9, 7.5, 0, Math.PI);
        ctx.fill();
        ctx.fillRect(cx + ox - 9, 9, 9, 6);
        ctx.fillRect(cx + ox + 1.5, 9, 4.5, 9);
      } else {
        ctx.beginPath();
        ctx.arc(cx + ox + 4.5, 9, 7.5, 0, Math.PI);
        ctx.fill();
        ctx.fillRect(cx + ox, 9, 9, 6);
        ctx.fillRect(cx + ox - 6, 9, 4.5, 9);
      }

      // Eye
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx + ox + flip * 3, 14, 2.25, 1.5);

      // Torso
      ctx.fillStyle = shirtColor;
      ctx.fillRect(cx + ox - 7.5, 23, 15, 15);
      ctx.fillStyle = shirtShadow;
      ctx.fillRect(cx + ox + (flip > 0 ? 4.5 : -7.5), 23, 3, 15);

      // Visible arm
      ctx.fillStyle = shirtColor;
      const armX = dirs[d] === 'E' ? cx + ox + 6 : cx + ox - 10.5;
      ctx.beginPath();
      ctx.arc(armX + 1.5, 26, 3.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(armX, 26, 4.5, 10.5);

      // Hand
      ctx.fillStyle = skinColor;
      ctx.fillRect(armX, 36, 4.5, 3.75);

      // Legs
      ctx.fillStyle = pantsColor;
      ctx.fillRect(cx + ox - 6, 38, 5.25, 12);
      ctx.fillRect(cx + ox + 1.5, 38, 5.25, 12);

      // Boots
      ctx.fillStyle = bootColor;
      ctx.fillRect(cx + ox - 7.5, 48, 6, 6);
      ctx.fillRect(cx + ox + 1.5, 48, 6, 6);
      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(cx + ox - 7.5, 53, 6, 1.5);
      ctx.fillRect(cx + ox + 1.5, 53, 6, 1.5);
    }

    canvas.refresh();
  }

  // Default 'player' texture (south facing)
  const defaultCanvas = scene.textures.createCanvas('player', size, size + 16);
  const dCtx = defaultCanvas.context;
  const southTexture = scene.textures.get('player_S');
  if (southTexture) {
    const srcCanvas = southTexture.getSourceImage();
    if (srcCanvas) {
      dCtx.drawImage(srcCanvas, 0, 0);
    }
  }
  defaultCanvas.refresh();
}

// Generate detailed animal silhouettes (10 species)
export function generateAnimalSprites(scene) {
  const rng = mulberry32(5555);

  // DEER - slender with antlers
  const deerCanvas = scene.textures.createCanvas('animal_deer', 28, 20);
  const deerCtx = deerCanvas.context;
  deerCtx.fillStyle = '#8B6914';
  // Body
  deerCtx.beginPath();
  deerCtx.ellipse(14, 11, 10, 6, 0, 0, Math.PI * 2);
  deerCtx.fill();
  // Head
  deerCtx.beginPath();
  deerCtx.ellipse(23, 8, 4, 3.5, 0, 0, Math.PI * 2);
  deerCtx.fill();
  // Neck
  deerCtx.fillRect(18, 9, 5, 3);
  // Legs
  deerCtx.fillRect(10, 15, 1.5, 5);
  deerCtx.fillRect(17, 15, 1.5, 5);
  // Antlers
  deerCtx.strokeStyle = '#8B6914';
  deerCtx.lineWidth = 1;
  deerCtx.beginPath();
  deerCtx.moveTo(24, 6);
  deerCtx.lineTo(24, 3);
  deerCtx.moveTo(24, 4);
  deerCtx.lineTo(26, 2);
  deerCtx.moveTo(24, 4);
  deerCtx.lineTo(22, 2);
  deerCtx.stroke();
  // Eye
  deerCtx.fillStyle = '#000000';
  deerCtx.fillRect(24, 8, 1, 1);
  // Light underbelly
  deerCtx.fillStyle = 'rgba(200, 180, 140, 0.4)';
  deerCtx.beginPath();
  deerCtx.ellipse(14, 13, 8, 3, 0, 0, Math.PI * 2);
  deerCtx.fill();
  deerCanvas.refresh();

  // ELK - larger, bulkier
  const elkCanvas = scene.textures.createCanvas('animal_elk', 32, 24);
  const elkCtx = elkCanvas.context;
  elkCtx.fillStyle = '#6B4914';
  // Body
  elkCtx.beginPath();
  elkCtx.ellipse(16, 13, 12, 7, 0, 0, Math.PI * 2);
  elkCtx.fill();
  // Head
  elkCtx.beginPath();
  elkCtx.ellipse(26, 10, 5, 4, 0, 0, Math.PI * 2);
  elkCtx.fill();
  // Neck
  elkCtx.fillRect(20, 11, 6, 4);
  // Legs
  elkCtx.fillRect(11, 18, 2, 6);
  elkCtx.fillRect(19, 18, 2, 6);
  // Antlers (larger)
  elkCtx.strokeStyle = '#6B4914';
  elkCtx.lineWidth = 1.5;
  elkCtx.beginPath();
  elkCtx.moveTo(27, 7);
  elkCtx.lineTo(27, 3);
  elkCtx.moveTo(27, 5);
  elkCtx.lineTo(29, 2);
  elkCtx.moveTo(27, 5);
  elkCtx.lineTo(25, 2);
  elkCtx.moveTo(27, 4);
  elkCtx.lineTo(30, 4);
  elkCtx.stroke();
  // Eye
  elkCtx.fillStyle = '#000000';
  elkCtx.fillRect(27, 10, 1, 1);
  elkCanvas.refresh();

  // RABBIT - round body, long ears
  const rabbitCanvas = scene.textures.createCanvas('animal_rabbit', 14, 12);
  const rabbitCtx = rabbitCanvas.context;
  rabbitCtx.fillStyle = '#AA9988';
  // Body
  rabbitCtx.beginPath();
  rabbitCtx.ellipse(7, 8, 5, 4, 0, 0, Math.PI * 2);
  rabbitCtx.fill();
  // Head
  rabbitCtx.beginPath();
  rabbitCtx.ellipse(10, 5, 3, 2.5, 0, 0, Math.PI * 2);
  rabbitCtx.fill();
  // Ears
  rabbitCtx.fillRect(9, 1, 1.5, 4);
  rabbitCtx.fillRect(11, 1, 1.5, 4);
  // Eye
  rabbitCtx.fillStyle = '#000000';
  rabbitCtx.fillRect(11, 5, 1, 1);
  // White tail
  rabbitCtx.fillStyle = '#ffffff';
  rabbitCtx.beginPath();
  rabbitCtx.arc(4, 8, 1.5, 0, Math.PI * 2);
  rabbitCtx.fill();
  rabbitCanvas.refresh();

  // SQUIRREL - small with bushy tail
  const squirrelCanvas = scene.textures.createCanvas('animal_squirrel', 12, 10);
  const squirrelCtx = squirrelCanvas.context;
  squirrelCtx.fillStyle = '#886644';
  // Body
  squirrelCtx.beginPath();
  squirrelCtx.ellipse(6, 6, 3, 2.5, 0, 0, Math.PI * 2);
  squirrelCtx.fill();
  // Head
  squirrelCtx.beginPath();
  squirrelCtx.ellipse(9, 4, 2, 2, 0, 0, Math.PI * 2);
  squirrelCtx.fill();
  // Bushy tail
  squirrelCtx.beginPath();
  squirrelCtx.ellipse(3, 4, 3, 4, 0.5, 0, Math.PI * 2);
  squirrelCtx.fill();
  // Eye
  squirrelCtx.fillStyle = '#000000';
  squirrelCtx.fillRect(10, 4, 0.8, 0.8);
  squirrelCanvas.refresh();

  // WOLF - gray with pointy ears
  const wolfCanvas = scene.textures.createCanvas('animal_wolf', 24, 16);
  const wolfCtx = wolfCanvas.context;
  const wolfGrad = wolfCtx.createLinearGradient(0, 0, 0, 16);
  wolfGrad.addColorStop(0, '#666666');
  wolfGrad.addColorStop(1, '#444444');
  wolfCtx.fillStyle = wolfGrad;
  // Body
  wolfCtx.beginPath();
  wolfCtx.ellipse(12, 9, 9, 5, 0, 0, Math.PI * 2);
  wolfCtx.fill();
  // Head
  wolfCtx.beginPath();
  wolfCtx.ellipse(20, 7, 4, 3.5, 0, 0, Math.PI * 2);
  wolfCtx.fill();
  // Neck
  wolfCtx.fillRect(16, 8, 4, 3);
  // Pointy ears
  wolfCtx.beginPath();
  wolfCtx.moveTo(19, 5);
  wolfCtx.lineTo(18, 2);
  wolfCtx.lineTo(20, 5);
  wolfCtx.fill();
  wolfCtx.beginPath();
  wolfCtx.moveTo(21, 5);
  wolfCtx.lineTo(20, 2);
  wolfCtx.lineTo(22, 5);
  wolfCtx.fill();
  // Legs
  wolfCtx.fillRect(8, 12, 1.5, 4);
  wolfCtx.fillRect(15, 12, 1.5, 4);
  // Bushy tail
  wolfCtx.beginPath();
  wolfCtx.ellipse(5, 9, 4, 3, 0, 0, Math.PI * 2);
  wolfCtx.fill();
  // Eye
  wolfCtx.fillStyle = '#ffcc00';
  wolfCtx.fillRect(21, 7, 1, 1);
  wolfCanvas.refresh();

  // BEAR - bulky, dark brown
  const bearCanvas = scene.textures.createCanvas('animal_bear', 30, 24);
  const bearCtx = bearCanvas.context;
  bearCtx.fillStyle = '#3B2508';
  // Body (bulky)
  bearCtx.beginPath();
  bearCtx.ellipse(15, 14, 12, 8, 0, 0, Math.PI * 2);
  bearCtx.fill();
  // Head
  bearCtx.beginPath();
  bearCtx.ellipse(24, 10, 5, 4.5, 0, 0, Math.PI * 2);
  bearCtx.fill();
  // Rounded ears
  bearCtx.beginPath();
  bearCtx.arc(22, 7, 2, 0, Math.PI * 2);
  bearCtx.fill();
  bearCtx.beginPath();
  bearCtx.arc(26, 7, 2, 0, Math.PI * 2);
  bearCtx.fill();
  // Legs
  bearCtx.fillRect(10, 20, 2.5, 4);
  bearCtx.fillRect(18, 20, 2.5, 4);
  // Eye
  bearCtx.fillStyle = '#000000';
  bearCtx.fillRect(25, 10, 1, 1);
  bearCanvas.refresh();

  // COUGAR - sleek, tan
  const cougarCanvas = scene.textures.createCanvas('animal_cougar', 26, 14);
  const cougarCtx = cougarCanvas.context;
  cougarCtx.fillStyle = '#AA8844';
  // Body
  cougarCtx.beginPath();
  cougarCtx.ellipse(13, 8, 10, 4, 0, 0, Math.PI * 2);
  cougarCtx.fill();
  // Head
  cougarCtx.beginPath();
  cougarCtx.ellipse(22, 6, 4, 3, 0, 0, Math.PI * 2);
  cougarCtx.fill();
  // Ears
  cougarCtx.beginPath();
  cougarCtx.moveTo(21, 4);
  cougarCtx.lineTo(20, 2);
  cougarCtx.lineTo(22, 4);
  cougarCtx.fill();
  cougarCtx.beginPath();
  cougarCtx.moveTo(23, 4);
  cougarCtx.lineTo(22, 2);
  cougarCtx.lineTo(24, 4);
  cougarCtx.fill();
  // Legs
  cougarCtx.fillRect(10, 10, 1.5, 4);
  cougarCtx.fillRect(16, 10, 1.5, 4);
  // Long tail
  cougarCtx.strokeStyle = '#AA8844';
  cougarCtx.lineWidth = 2;
  cougarCtx.beginPath();
  cougarCtx.moveTo(5, 8);
  cougarCtx.quadraticCurveTo(3, 10, 1, 8);
  cougarCtx.stroke();
  // Eye
  cougarCtx.fillStyle = '#88ff44';
  cougarCtx.fillRect(23, 6, 1, 1);
  cougarCanvas.refresh();

  // COYOTE - similar to wolf but smaller, tan
  const coyoteCanvas = scene.textures.createCanvas('animal_coyote', 20, 14);
  const coyoteCtx = coyoteCanvas.context;
  coyoteCtx.fillStyle = '#887766';
  // Body
  coyoteCtx.beginPath();
  coyoteCtx.ellipse(10, 8, 7, 4, 0, 0, Math.PI * 2);
  coyoteCtx.fill();
  // Head
  coyoteCtx.beginPath();
  coyoteCtx.ellipse(16, 6, 3.5, 3, 0, 0, Math.PI * 2);
  coyoteCtx.fill();
  // Ears
  coyoteCtx.beginPath();
  coyoteCtx.moveTo(15, 4);
  coyoteCtx.lineTo(14, 2);
  coyoteCtx.lineTo(16, 4);
  coyoteCtx.fill();
  coyoteCtx.beginPath();
  coyoteCtx.moveTo(17, 4);
  coyoteCtx.lineTo(16, 2);
  coyoteCtx.lineTo(18, 4);
  coyoteCtx.fill();
  // Legs
  coyoteCtx.fillRect(7, 10, 1.5, 4);
  coyoteCtx.fillRect(12, 10, 1.5, 4);
  // Tail
  coyoteCtx.beginPath();
  coyoteCtx.ellipse(4, 8, 3, 2, 0, 0, Math.PI * 2);
  coyoteCtx.fill();
  // Eye
  coyoteCtx.fillStyle = '#ffaa00';
  coyoteCtx.fillRect(17, 6, 1, 1);
  coyoteCanvas.refresh();

  // RAVEN - wing shape with beak
  const ravenCanvas = scene.textures.createCanvas('animal_raven', 12, 10);
  const ravenCtx = ravenCanvas.context;
  ravenCtx.fillStyle = '#222222';
  // Body
  ravenCtx.beginPath();
  ravenCtx.ellipse(6, 6, 3, 2.5, 0, 0, Math.PI * 2);
  ravenCtx.fill();
  // Head
  ravenCtx.beginPath();
  ravenCtx.ellipse(9, 4, 2, 2, 0, 0, Math.PI * 2);
  ravenCtx.fill();
  // Beak
  ravenCtx.fillStyle = '#444444';
  ravenCtx.beginPath();
  ravenCtx.moveTo(10.5, 4);
  ravenCtx.lineTo(12, 4);
  ravenCtx.lineTo(10.5, 5);
  ravenCtx.fill();
  // Wing
  ravenCtx.fillStyle = '#222222';
  ravenCtx.beginPath();
  ravenCtx.ellipse(4, 6, 4, 2, -0.3, 0, Math.PI * 2);
  ravenCtx.fill();
  // Eye
  ravenCtx.fillStyle = '#ffffff';
  ravenCtx.fillRect(9.5, 4, 0.5, 0.5);
  ravenCanvas.refresh();

  // FISH - simple fish shape
  const fishCanvas = scene.textures.createCanvas('animal_fish', 12, 8);
  const fishCtx = fishCanvas.context;
  fishCtx.fillStyle = '#4488AA';
  // Body
  fishCtx.beginPath();
  fishCtx.ellipse(6, 4, 4, 2.5, 0, 0, Math.PI * 2);
  fishCtx.fill();
  // Tail
  fishCtx.beginPath();
  fishCtx.moveTo(2, 4);
  fishCtx.lineTo(0, 2);
  fishCtx.lineTo(0, 6);
  fishCtx.closePath();
  fishCtx.fill();
  // Fin
  fishCtx.beginPath();
  fishCtx.moveTo(6, 2);
  fishCtx.lineTo(7, 0);
  fishCtx.lineTo(8, 2);
  fishCtx.fill();
  // Eye
  fishCtx.fillStyle = '#000000';
  fishCtx.fillRect(8, 3.5, 1, 1);
  // Scales detail
  fishCtx.strokeStyle = 'rgba(100, 150, 180, 0.4)';
  fishCtx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    fishCtx.beginPath();
    fishCtx.arc(5 + i * 1.5, 4, 1, 0, Math.PI * 2);
    fishCtx.stroke();
  }
  fishCanvas.refresh();
}

// Generate UI textures
export function generateUITextures(scene) {
  // Panel background - dark green-black with subtle noise
  const panelCanvas = scene.textures.createCanvas('ui_panel', 4, 4);
  const pCtx = panelCanvas.context;
  const noise = new SimplexNoise(9999);

  const imgData = pCtx.createImageData(4, 4);
  const data = imgData.data;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const idx = (y * 4 + x) * 4;
      const n = noise.noise2D(x * 0.5, y * 0.5) * 5;
      data[idx] = Math.max(0, Math.min(255, 10 + n));
      data[idx + 1] = Math.max(0, Math.min(255, 12 + n));
      data[idx + 2] = Math.max(0, Math.min(255, 10 + n));
      data[idx + 3] = 235;
    }
  }
  pCtx.putImageData(imgData, 0, 0);
  panelCanvas.refresh();

  // Slot background - dark recessed with inner shadow
  const slotCanvas = scene.textures.createCanvas('ui_slot', 48, 48);
  const sCtx = slotCanvas.context;

  // Base dark fill
  sCtx.fillStyle = 'rgba(20, 22, 20, 0.85)';
  sCtx.fillRect(0, 0, 48, 48);

  // Inner shadow effect
  const shadowGrad = sCtx.createLinearGradient(0, 0, 6, 6);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = shadowGrad;
  sCtx.fillRect(0, 0, 6, 48);
  sCtx.fillRect(0, 0, 48, 6);

  // Subtle border
  sCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  sCtx.lineWidth = 1;
  sCtx.strokeRect(0.5, 0.5, 47, 47);
  slotCanvas.refresh();

  // Active slot - slightly lighter with gold tint
  const slotActiveCanvas = scene.textures.createCanvas('ui_slot_active', 48, 48);
  const saCtx = slotActiveCanvas.context;

  // Lighter base
  saCtx.fillStyle = 'rgba(35, 38, 30, 0.9)';
  saCtx.fillRect(0, 0, 48, 48);

  // Gold-tinted border
  saCtx.strokeStyle = 'rgba(255, 220, 120, 0.4)';
  saCtx.lineWidth = 1.5;
  saCtx.strokeRect(1, 1, 46, 46);

  // Inner highlight
  saCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  saCtx.lineWidth = 1;
  saCtx.strokeRect(0.5, 0.5, 47, 47);
  slotActiveCanvas.refresh();
}
