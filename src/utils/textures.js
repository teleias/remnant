// Programmatic texture generation utilities for REMNANT
// Project Zomboid-quality isometric tiles, object sprites, and character sprites
// All textures use Phaser's native scene.textures.createCanvas() + .refresh() pattern
// This ensures proper WebGL GPU upload and eliminates white box rendering issues

import { TILE } from '../config/constants.js';
import { SimplexNoise } from './noise.js';

const HALF_W = TILE.HALF_W;
const HALF_H = TILE.HALF_H;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// Create texture by drawing on an offscreen canvas, then uploading to Phaser's TextureManager.
//
// NUCLEAR FIX for persistent white box issue:
// We draw on an offscreen <canvas>, extract pixel data, then write it into a
// Phaser-managed CanvasTexture pixel-by-pixel using putImageData. This guarantees
// the pixel data is physically present in Phaser's canvas before refresh() uploads to GPU.
//
// Previous approaches that FAILED (all produced white boxes):
// 1. addCanvas(name, canvas) — WebGL didn't upload
// 2. addCanvas(name, canvas) + refresh() — Still white
// 3. createCanvas(name, w, h) + draw on .context + refresh() — Still white
// 4. createCanvas + drawImage(offscreen) + refresh() — Still white
//
// This approach: offscreen draw → getImageData → putImageData → refresh()
function createTexture(scene, name, w, h, drawFn) {
  // Remove existing texture if present (prevents duplicate key errors)
  if (scene.textures.exists(name)) {
    scene.textures.remove(name);
  }

  // Step 1: Draw on a plain offscreen canvas using standard Canvas 2D API
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const offCtx = offscreen.getContext('2d');
  drawFn(offCtx, w, h);

  // Step 2: Extract the raw pixel data
  const imageData = offCtx.getImageData(0, 0, w, h);

  // Step 3: Create Phaser's managed CanvasTexture and write pixels directly
  const ct = scene.textures.createCanvas(name, w, h);
  ct.context.putImageData(imageData, 0, 0);

  // Step 4: Upload to WebGL GPU
  ct.refresh();
}

// Project Zomboid-style muted earth-tone palette
const PZ_PALETTE = {
  grass: {
    light: '#5a7a3a',
    mid: '#4a6630',
    dark: '#3a5225',
    shadow: '#2a3a1a'
  },
  dirt: {
    light: '#8a7a5a',
    mid: '#6e5e42',
    dark: '#5a4a32'
  },
  wood: {
    light: '#7a6040',
    mid: '#5a4028',
    dark: '#3a2a18'
  },
  stone: {
    light: '#8a8a80',
    mid: '#6a6a62',
    dark: '#4a4a44'
  },
  skin: {
    light: '#e0c8a8',
    mid: '#ccb090',
    shadow: '#aa8a68'
  },
  rust: '#8a4a2a',
  moss: '#4a6a3a',
  grime: '#3a3a2a'
};

// Enhanced multi-octave noise fill with isometric shading (4 octaves + NW lighting)
function fillWithPZNoise(ctx, baseHex, noise, seed, variant) {
  const base = hexToRgb(baseHex);
  const imgData = ctx.getImageData(0, 0, TILE.WIDTH, TILE.HEIGHT);
  const data = imgData.data;

  for (let py = 0; py < TILE.HEIGHT; py++) {
    for (let px = 0; px < TILE.WIDTH; px++) {
      if (!insideDiamond(px, py)) continue;
      const idx = (py * TILE.WIDTH + px) * 4;
      if (data[idx + 3] === 0) continue;

      // 4-octave noise for organic texture
      const n1 = noise.noise2D((px + seed) * 0.06, (py + seed) * 0.06);
      const n2 = noise.noise2D((px + seed * 2) * 0.12, (py + seed * 2) * 0.12) * 0.5;
      const n3 = noise.noise2D((px + seed * 3) * 0.24, (py + seed * 3) * 0.24) * 0.25;
      const n4 = noise.noise2D((px + seed * 4) * 0.48, (py + seed * 4) * 0.48) * 0.125;
      const noise_combined = (n1 + n2 + n3 + n4) / 1.875;

      // Isometric shading: NW light source (top-left brighter, bottom-right darker)
      const dx = px - HALF_W;
      const dy = py - HALF_H;

      // Left face (NW side) gets highlight
      const leftFace = dx < 0;
      // Right face (SE side) gets shadow
      const rightFace = dx > 0;
      // Top edge gets slight highlight
      const topEdge = dy < 0;

      let shadingBoost = 0;
      if (leftFace && topEdge) shadingBoost = 12;
      else if (leftFace) shadingBoost = 8;
      else if (rightFace && !topEdge) shadingBoost = -10;
      else if (rightFace) shadingBoost = -6;

      // Apply noise and shading
      const variation = noise_combined * 22 + shadingBoost;
      data[idx] = Math.max(0, Math.min(255, base.r + variation));
      data[idx + 1] = Math.max(0, Math.min(255, base.g + variation));
      data[idx + 2] = Math.max(0, Math.min(255, base.b + variation));
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

// 4x4 Bayer ordered dithering matrix
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

// Apply Bayer dithering to image data
function applyDither(imgData, w, h, intensity = 8) {
  const data = imgData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] === 0) continue;

      const threshold = (BAYER_4X4[y % 4][x % 4] / 16 - 0.5) * intensity;
      data[idx] = Math.max(0, Math.min(255, data[idx] + threshold));
      data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + threshold));
      data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + threshold));
    }
  }
}

// Add individual grass blade strokes (1-3px)
function addGrassBlades(ctx, rng, count) {
  const bladeColors = [
    'rgba(70, 100, 50, 0.6)',
    'rgba(50, 80, 35, 0.5)',
    'rgba(90, 120, 60, 0.4)',
    'rgba(40, 70, 25, 0.7)',
    'rgba(60, 90, 45, 0.5)'
  ];

  for (let i = 0; i < count; i++) {
    const px = HALF_W + (rng() - 0.5) * TILE.WIDTH * 0.75;
    const py = HALF_H + (rng() - 0.5) * TILE.HEIGHT * 0.6;
    if (!insideDiamond(px, py)) continue;

    ctx.strokeStyle = bladeColors[Math.floor(rng() * bladeColors.length)];
    ctx.lineWidth = 0.5 + rng() * 0.5;

    const bladeHeight = 1 + rng() * 2;
    const bendAngle = (rng() - 0.5) * 0.4;

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + bendAngle * 2, py - bladeHeight);
    ctx.stroke();
  }
}

// Add weathering effects (dirt splotches, stain streaks)
function addWeathering(ctx, rng, w, h) {
  // Dirt splotches
  for (let i = 0; i < 5; i++) {
    const sx = rng() * w;
    const sy = rng() * h;
    const size = 2 + rng() * 4;
    ctx.fillStyle = `rgba(60, 50, 40, ${0.1 + rng() * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy, size, size * 0.6, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stain streaks
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(40, 35, 30, ${0.1 + rng() * 0.1})`;
    ctx.lineWidth = 0.5 + rng();
    ctx.beginPath();
    const startX = rng() * w;
    const startY = rng() * h;
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + (rng() - 0.5) * 8, startY + rng() * 6);
    ctx.stroke();
  }
}

// Draw 1px pixel outline around non-transparent pixels
function drawPixelOutline(ctx, w, h, color = 'rgba(20, 15, 10, 0.9)') {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const outline = new Uint8ClampedArray(w * h);

  // Find edge pixels (pixels adjacent to transparent pixels)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] > 0) continue; // Skip non-transparent

      // Check if adjacent to non-transparent pixel
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nidx = (ny * w + nx) * 4;
          if (data[nidx + 3] > 128) {
            outline[y * w + x] = 1;
            break;
          }
        }
        if (outline[y * w + x]) break;
      }
    }
  }

  // Draw outline pixels
  const outlineColor = hexToRgb(color.startsWith('rgba') ? '#141510' : color);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (outline[y * w + x]) {
        const idx = (y * w + x) * 4;
        data[idx] = outlineColor.r;
        data[idx + 1] = outlineColor.g;
        data[idx + 2] = outlineColor.b;
        data[idx + 3] = 230;
      }
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
function addWaterRipples(ctx, variant, rng) {
  ctx.strokeStyle = 'rgba(100, 160, 200, 0.12)';
  ctx.lineWidth = 0.5;

  for (let i = 0; i < 4; i++) {
    const y = HALF_H * 0.4 + i * 5 + variant * 2;
    const amplitude = 2 + i * 0.5;

    ctx.beginPath();
    ctx.moveTo(HALF_W * 0.3, y);
    ctx.quadraticCurveTo(HALF_W, y - amplitude, HALF_W * 1.7, y);
    ctx.stroke();
  }

  // Caustic shimmer dots
  ctx.fillStyle = 'rgba(180, 220, 255, 0.15)';
  for (let i = 0; i < 10; i++) {
    const px = HALF_W + (rng() - 0.5) * TILE.WIDTH * 0.6;
    const py = HALF_H + (rng() - 0.5) * TILE.HEIGHT * 0.4;
    if (insideDiamond(px, py)) {
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

// ============================================================================
// TILESET GENERATION
// ============================================================================

export function generateTileset(scene) {
  const noise = new SimplexNoise(42);
  const rng = mulberry32(12345);

  // GRASS TILES (3 variants) - muted green with grass blades, dead patches, dithering
  const grassColors = [PZ_PALETTE.grass.mid, PZ_PALETTE.grass.dark, PZ_PALETTE.grass.light];
  for (let v = 0; v < 3; v++) {
    createTexture(scene, `tile_grass_${v}`, TILE.WIDTH, TILE.HEIGHT, (ctx) => {
      drawDiamond(ctx, grassColors[v], PZ_PALETTE.grass.shadow);
      fillWithPZNoise(ctx, grassColors[v], noise, v * 1000, v);

      // Grass blade strokes
      addGrassBlades(ctx, mulberry32(v * 111), 20 + v * 3);

      // Dead patches (yellowed spots)
      const patchRng = mulberry32(v * 222);
      for (let i = 0; i < 2; i++) {
        const px = HALF_W + (patchRng() - 0.5) * TILE.WIDTH * 0.5;
        const py = HALF_H + (patchRng() - 0.5) * TILE.HEIGHT * 0.3;
        if (insideDiamond(px, py)) {
          ctx.fillStyle = 'rgba(120, 110, 70, 0.25)';
          ctx.beginPath();
          ctx.ellipse(px, py, 4 + patchRng() * 3, 2 + patchRng() * 2, patchRng() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Apply dithering
      const imgData = ctx.getImageData(0, 0, TILE.WIDTH, TILE.HEIGHT);
      applyDither(imgData, TILE.WIDTH, TILE.HEIGHT, 10);
      ctx.putImageData(imgData, 0, 0);
    });
  }

  // GRASS DARK TILES (3 variants) - darker forest green with shadow dappling
  const grassDarkColors = [PZ_PALETTE.grass.dark, PZ_PALETTE.grass.shadow, '#3a5a22'];
  for (let v = 0; v < 3; v++) {
    createTexture(scene, `tile_grass_dark_${v}`, TILE.WIDTH, TILE.HEIGHT, (ctx) => {
      drawDiamond(ctx, grassDarkColors[v], '#1a2a10');
      fillWithPZNoise(ctx, grassDarkColors[v], noise, v * 2000, v);

      // Shadow dappling (darker spots simulating tree cover)
      const shadowRng = mulberry32(v * 333);
      for (let i = 0; i < 4; i++) {
        const px = HALF_W + (shadowRng() - 0.5) * TILE.WIDTH * 0.6;
        const py = HALF_H + (shadowRng() - 0.5) * TILE.HEIGHT * 0.4;
        if (insideDiamond(px, py)) {
          ctx.fillStyle = 'rgba(20, 35, 15, 0.3)';
          ctx.beginPath();
          ctx.ellipse(px, py, 5 + shadowRng() * 4, 3 + shadowRng() * 2, shadowRng() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      addGrassBlades(ctx, mulberry32(v * 444), 15 + v * 2);

      const imgData = ctx.getImageData(0, 0, TILE.WIDTH, TILE.HEIGHT);
      applyDither(imgData, TILE.WIDTH, TILE.HEIGHT, 8);
      ctx.putImageData(imgData, 0, 0);
    });
  }

  // DIRT TILES (3 variants) - brown with pebbles, rut marks
  const dirtColors = [PZ_PALETTE.dirt.mid, PZ_PALETTE.dirt.dark, PZ_PALETTE.dirt.light];
  for (let v = 0; v < 3; v++) {
    createTexture(scene, `tile_dirt_${v}`, TILE.WIDTH, TILE.HEIGHT, (ctx) => {
      drawDiamond(ctx, dirtColors[v], '#4a3a22');
      fillWithPZNoise(ctx, dirtColors[v], noise, v * 3000, v);

      // Pebble details
      const pebbleRng = mulberry32(v * 555);
      addScatteredDetails(ctx, [
        'rgba(100, 85, 60, 0.5)',
        'rgba(80, 65, 45, 0.4)',
        'rgba(110, 95, 70, 0.3)'
      ], 14 + v * 2, pebbleRng, [0.8, 2.5]);

      // Rut marks (wheel tracks, footprints)
      ctx.strokeStyle = 'rgba(70, 55, 35, 0.2)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 2; i++) {
        const y = HALF_H + (pebbleRng() - 0.5) * HALF_H * 0.6;
        ctx.beginPath();
        ctx.moveTo(HALF_W * 0.35, y);
        ctx.lineTo(HALF_W * 1.65, y + (pebbleRng() - 0.5) * 3);
        ctx.stroke();
      }

      const imgData = ctx.getImageData(0, 0, TILE.WIDTH, TILE.HEIGHT);
      applyDither(imgData, TILE.WIDTH, TILE.HEIGHT, 10);
      ctx.putImageData(imgData, 0, 0);
    });
  }

  // STONE TILES (2 variants) - gray flagstone with cracks, lichen
  const stoneColors = [PZ_PALETTE.stone.mid, PZ_PALETTE.stone.dark];
  for (let v = 0; v < 2; v++) {
    createTexture(scene, `tile_stone_${v}`, TILE.WIDTH, TILE.HEIGHT, (ctx) => {
      drawDiamond(ctx, stoneColors[v], '#3a3a35');
      fillWithPZNoise(ctx, stoneColors[v], noise, v * 4000, v);

      const stoneRng = mulberry32(v * 666);
      addScatteredDetails(ctx, [
        'rgba(110, 110, 100, 0.4)',
        'rgba(90, 90, 80, 0.5)'
      ], 8, stoneRng, [0.8, 2]);

      // Crack lines
      addCracks(ctx, noise, v * 5000, 4 + v, stoneRng);

      // Lichen spots (greenish-yellow)
      for (let i = 0; i < 3; i++) {
        const lx = HALF_W + (stoneRng() - 0.5) * TILE.WIDTH * 0.5;
        const ly = HALF_H + (stoneRng() - 0.5) * TILE.HEIGHT * 0.3;
        if (insideDiamond(lx, ly)) {
          ctx.fillStyle = 'rgba(90, 100, 60, 0.25)';
          ctx.beginPath();
          ctx.ellipse(lx, ly, 2 + stoneRng() * 2, 1 + stoneRng(), stoneRng() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const imgData = ctx.getImageData(0, 0, TILE.WIDTH, TILE.HEIGHT);
      applyDither(imgData, TILE.WIDTH, TILE.HEIGHT, 8);
      ctx.putImageData(imgData, 0, 0);
    });
  }

  // SAND TILES (2 variants) - warm beige with fine grain
  const sandColors = ['#b4a068', '#a89860'];
  for (let v = 0; v < 2; v++) {
    createTexture(scene, `tile_sand_${v}`, TILE.WIDTH, TILE.HEIGHT, (ctx) => {
      drawDiamond(ctx, sandColors[v], '#8a7848');
      fillWithPZNoise(ctx, sandColors[v], noise, v * 5000, v);

      // Fine grain details
      const sandRng = mulberry32(v * 777);
      addScatteredDetails(ctx, [
        'rgba(200, 180, 140, 0.2)',
        'rgba(180, 160, 120, 0.25)',
        'rgba(160, 140, 100, 0.2)'
      ], 25 + v * 4, sandRng, [0.3, 0.8]);

      const imgData = ctx.getImageData(0, 0, TILE.WIDTH, TILE.HEIGHT);
      applyDither(imgData, TILE.WIDTH, TILE.HEIGHT, 6);
      ctx.putImageData(imgData, 0, 0);
    });
  }

  // WATER TILES (3 variants) - dark blue-green with ripples, caustic dots
  const waterColors = ['#2a5a70', '#265065', '#2e6278'];
  for (let v = 0; v < 3; v++) {
    createTexture(scene, `tile_water_${v}`, TILE.WIDTH, TILE.HEIGHT, (ctx) => {
      drawDiamond(ctx, waterColors[v], '#1a3a50');
      fillWithPZNoise(ctx, waterColors[v], noise, v * 6000, v);
      addWaterRipples(ctx, v, mulberry32(v * 888));
    });
  }

  // DEEP WATER TILES (2 variants)
  const deepWaterColors = ['#1a3a50', '#142e45'];
  for (let v = 0; v < 2; v++) {
    createTexture(scene, `tile_water_deep_${v}`, TILE.WIDTH, TILE.HEIGHT, (ctx) => {
      drawDiamond(ctx, deepWaterColors[v], '#0a2030');
      fillWithPZNoise(ctx, deepWaterColors[v], noise, v * 7000, v);
      addWaterRipples(ctx, v + 3, mulberry32(v * 999));
    });
  }

  // SNOW TILES (2 variants) - white with blue shadows
  const snowColors = ['#dce8ee', '#d0dce4'];
  for (let v = 0; v < 2; v++) {
    createTexture(scene, `tile_snow_${v}`, TILE.WIDTH, TILE.HEIGHT, (ctx) => {
      drawDiamond(ctx, snowColors[v], '#b0c8d8');
      fillWithPZNoise(ctx, snowColors[v], noise, v * 8000, v);

      const snowRng = mulberry32(v * 1010);
      // Blue shadow patches
      for (let i = 0; i < 3; i++) {
        const px = HALF_W + (snowRng() - 0.5) * TILE.WIDTH * 0.5;
        const py = HALF_H + (snowRng() - 0.5) * TILE.HEIGHT * 0.3;
        if (insideDiamond(px, py)) {
          ctx.fillStyle = 'rgba(160, 180, 210, 0.2)';
          ctx.beginPath();
          ctx.ellipse(px, py, 4 + snowRng() * 3, 2 + snowRng() * 2, snowRng() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Sparkle dots
      addScatteredDetails(ctx, [
        'rgba(255, 255, 255, 0.5)',
        'rgba(240, 250, 255, 0.4)'
      ], 10, snowRng, [0.5, 1.2]);

      const imgData = ctx.getImageData(0, 0, TILE.WIDTH, TILE.HEIGHT);
      applyDither(imgData, TILE.WIDTH, TILE.HEIGHT, 6);
      ctx.putImageData(imgData, 0, 0);
    });
  }

  // ROAD TILES (2 variants) - gray asphalt with dashed lines, potholes
  const roadColors = ['#4a4a44', '#3e3e3a'];
  for (let v = 0; v < 2; v++) {
    createTexture(scene, `tile_road_${v}`, TILE.WIDTH, TILE.HEIGHT, (ctx) => {
      drawDiamond(ctx, roadColors[v], '#2a2a28');
      fillWithPZNoise(ctx, roadColors[v], noise, v * 9000, v);

      const roadRng = mulberry32(v * 1111);
      addScatteredDetails(ctx, [
        'rgba(60, 60, 55, 0.4)',
        'rgba(70, 70, 65, 0.3)'
      ], 8, roadRng, [0.8, 2]);

      // Road marking dash (yellow center line)
      if (v === 0) {
        ctx.strokeStyle = 'rgba(200, 180, 80, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(HALF_W * 0.6, HALF_H * 0.8);
        ctx.lineTo(HALF_W * 1.4, HALF_H * 1.2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Pothole
      const phx = HALF_W + (roadRng() - 0.5) * TILE.WIDTH * 0.3;
      const phy = HALF_H + (roadRng() - 0.5) * TILE.HEIGHT * 0.2;
      if (insideDiamond(phx, phy)) {
        ctx.fillStyle = 'rgba(30, 30, 28, 0.4)';
        ctx.beginPath();
        ctx.ellipse(phx, phy, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const imgData = ctx.getImageData(0, 0, TILE.WIDTH, TILE.HEIGHT);
      applyDither(imgData, TILE.WIDTH, TILE.HEIGHT, 10);
      ctx.putImageData(imgData, 0, 0);
    });
  }

  generateBuildingTiles(scene, noise, rng);
}

// ============================================================================
// BUILDING TILES GENERATION
// ============================================================================

function generateBuildingTiles(scene, noise, rng) {
  // Wood floor - plank pattern
  createTexture(scene, 'tile_wood_floor_0', TILE.WIDTH, TILE.HEIGHT, (ctx) => {
    drawDiamond(ctx, PZ_PALETTE.wood.mid, PZ_PALETTE.wood.dark);
    fillWithPZNoise(ctx, PZ_PALETTE.wood.mid, noise, 5000, 0);

    // Wood plank lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const y = (TILE.HEIGHT / 4) * i;
      ctx.beginPath();
      ctx.moveTo(HALF_W * 0.25, y);
      ctx.lineTo(TILE.WIDTH - HALF_W * 0.25, y);
      ctx.stroke();
    }

    // Wood grain highlights
    ctx.strokeStyle = 'rgba(120, 100, 70, 0.15)';
    for (let i = 0; i < 6; i++) {
      const y = 4 + i * 5;
      ctx.beginPath();
      ctx.moveTo(HALF_W * 0.3, y);
      ctx.lineTo(HALF_W * 1.7, y + 1);
      ctx.stroke();
    }
  });

  // Tile floor - checkered pattern
  createTexture(scene, 'tile_tile_floor_0', TILE.WIDTH, TILE.HEIGHT, (ctx) => {
    drawDiamond(ctx, '#7a7a6a', '#5a5a52');
    fillWithPZNoise(ctx, '#7a7a6a', noise, 6000, 0);

    // Checkered pattern
    const checkSize = 8;
    for (let y = 0; y < TILE.HEIGHT; y += checkSize) {
      for (let x = 0; x < TILE.WIDTH; x += checkSize) {
        if ((Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0) {
          const cx = x + checkSize / 2;
          const cy = y + checkSize / 2;
          if (insideDiamond(cx, cy)) {
            ctx.fillStyle = 'rgba(100, 100, 90, 0.3)';
            ctx.fillRect(x, y, checkSize, checkSize);
          }
        }
      }
    }
  });

  // Wall wood (flat tile version)
  createTexture(scene, 'tile_wall_wood', TILE.WIDTH, TILE.HEIGHT, (ctx) => {
    drawDiamond(ctx, PZ_PALETTE.wood.dark, '#3a2510');
    fillWithPZNoise(ctx, PZ_PALETTE.wood.dark, noise, 7000, 0);
  });

  // Wall stone (flat tile version)
  createTexture(scene, 'tile_wall_stone', TILE.WIDTH, TILE.HEIGHT, (ctx) => {
    drawDiamond(ctx, PZ_PALETTE.stone.mid, PZ_PALETTE.stone.dark);
    fillWithPZNoise(ctx, PZ_PALETTE.stone.mid, noise, 8000, 0);
  });

  // Roof
  createTexture(scene, 'tile_roof', TILE.WIDTH, TILE.HEIGHT, (ctx) => {
    drawDiamond(ctx, '#4a3020', '#3a2010');
    fillWithPZNoise(ctx, '#4a3020', noise, 9000, 0);

    // Shingle lines
    ctx.strokeStyle = 'rgba(30, 20, 10, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 6; i++) {
      const y = TILE.HEIGHT * 0.15 * i;
      ctx.beginPath();
      ctx.moveTo(HALF_W * 0.3, y);
      ctx.lineTo(HALF_W * 1.7, y + 2);
      ctx.stroke();
    }
  });

  // Dirt road tiles
  createTexture(scene, 'tile_dirt_road_0', TILE.WIDTH, TILE.HEIGHT, (ctx) => {
    drawDiamond(ctx, '#7a6040', '#6a5030');
    fillWithPZNoise(ctx, '#7a6040', noise, 10000, 0);

    // Tire track lines
    ctx.strokeStyle = 'rgba(50, 40, 25, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(HALF_W * 0.35, HALF_H * 0.55);
    ctx.lineTo(HALF_W * 1.65, HALF_H * 1.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(HALF_W * 0.45, HALF_H * 0.75);
    ctx.lineTo(HALF_W * 1.55, HALF_H * 1.65);
    ctx.stroke();
  });

  createTexture(scene, 'tile_dirt_road_1', TILE.WIDTH, TILE.HEIGHT, (ctx) => {
    drawDiamond(ctx, '#6a5535', '#5a4525');
    fillWithPZNoise(ctx, '#6a5535', noise, 11000, 0);

    // Gravel dots
    for (let i = 0; i < 15; i++) {
      const gx = HALF_W + (rng() - 0.5) * HALF_W;
      const gy = HALF_H + (rng() - 0.5) * HALF_H * 0.6;
      if (insideDiamond(gx, gy)) {
        ctx.fillStyle = `rgba(${90 + rng()*40}, ${80 + rng()*30}, ${60 + rng()*20}, 0.5)`;
        ctx.fillRect(gx, gy, 1.5, 1.5);
      }
    }
  });

  // 3D isometric wall - wood (64x48, diamond top + 16px vertical face)
  createTexture(scene, 'obj_wall_wood', TILE.WIDTH, TILE.HEIGHT + 16, (ctx, w, h) => {
    // Top face (diamond)
    ctx.fillStyle = PZ_PALETTE.wood.light;
    ctx.beginPath();
    ctx.moveTo(0, HALF_H);
    ctx.lineTo(HALF_W, 0);
    ctx.lineTo(TILE.WIDTH, HALF_H);
    ctx.lineTo(HALF_W, TILE.HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Left face (darker)
    ctx.fillStyle = PZ_PALETTE.wood.dark;
    ctx.beginPath();
    ctx.moveTo(0, HALF_H);
    ctx.lineTo(HALF_W, TILE.HEIGHT);
    ctx.lineTo(HALF_W, TILE.HEIGHT + 16);
    ctx.lineTo(0, HALF_H + 16);
    ctx.closePath();
    ctx.fill();

    // Right face (mid tone)
    ctx.fillStyle = PZ_PALETTE.wood.mid;
    ctx.beginPath();
    ctx.moveTo(HALF_W, TILE.HEIGHT);
    ctx.lineTo(TILE.WIDTH, HALF_H);
    ctx.lineTo(TILE.WIDTH, HALF_H + 16);
    ctx.lineTo(HALF_W, TILE.HEIGHT + 16);
    ctx.closePath();
    ctx.fill();

    // Plank lines on left face
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 4; i++) {
      const y = HALF_H + i * 4;
      ctx.beginPath();
      ctx.moveTo(2, y);
      ctx.lineTo(HALF_W - 2, y + 8);
      ctx.stroke();
    }

    // Nails
    ctx.fillStyle = 'rgba(80, 80, 80, 0.5)';
    ctx.fillRect(6, HALF_H + 4, 1, 1);
    ctx.fillRect(12, HALF_H + 10, 1, 1);
    ctx.fillRect(8, HALF_H + 18, 1, 1);

    // Top edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, HALF_H);
    ctx.lineTo(HALF_W, 0);
    ctx.lineTo(TILE.WIDTH, HALF_H);
    ctx.stroke();
  });

  // 3D isometric wall - stone (brick pattern, mortar lines, moss)
  createTexture(scene, 'obj_wall_stone', TILE.WIDTH, TILE.HEIGHT + 16, (ctx, w, h) => {
    // Top face
    ctx.fillStyle = PZ_PALETTE.stone.light;
    ctx.beginPath();
    ctx.moveTo(0, HALF_H);
    ctx.lineTo(HALF_W, 0);
    ctx.lineTo(TILE.WIDTH, HALF_H);
    ctx.lineTo(HALF_W, TILE.HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Left face
    ctx.fillStyle = PZ_PALETTE.stone.dark;
    ctx.beginPath();
    ctx.moveTo(0, HALF_H);
    ctx.lineTo(HALF_W, TILE.HEIGHT);
    ctx.lineTo(HALF_W, TILE.HEIGHT + 16);
    ctx.lineTo(0, HALF_H + 16);
    ctx.closePath();
    ctx.fill();

    // Right face
    ctx.fillStyle = PZ_PALETTE.stone.mid;
    ctx.beginPath();
    ctx.moveTo(HALF_W, TILE.HEIGHT);
    ctx.lineTo(TILE.WIDTH, HALF_H);
    ctx.lineTo(TILE.WIDTH, HALF_H + 16);
    ctx.lineTo(HALF_W, TILE.HEIGHT + 16);
    ctx.closePath();
    ctx.fill();

    // Brick/mortar lines on both faces
    ctx.strokeStyle = 'rgba(40, 38, 35, 0.35)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 4; i++) {
      const y = HALF_H + i * 4;
      // Left face
      ctx.beginPath();
      ctx.moveTo(2, y);
      ctx.lineTo(HALF_W - 2, y + 8);
      ctx.stroke();
      // Right face
      ctx.beginPath();
      ctx.moveTo(HALF_W + 2, y + 8);
      ctx.lineTo(TILE.WIDTH - 2, y);
      ctx.stroke();
    }

    // Vertical mortar lines
    for (let i = 0; i < 3; i++) {
      const x = 8 + i * 8;
      ctx.beginPath();
      ctx.moveTo(x, HALF_H + 2 + i * 2);
      ctx.lineTo(x + 2, HALF_H + 18);
      ctx.stroke();
    }

    // Moss patches
    ctx.fillStyle = 'rgba(70, 100, 60, 0.25)';
    ctx.fillRect(4, HALF_H + 14, 3, 2);
    ctx.fillRect(HALF_W + 10, HALF_H + 8, 2, 2);

    // Top edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(0, HALF_H);
    ctx.lineTo(HALF_W, 0);
    ctx.lineTo(TILE.WIDTH, HALF_H);
    ctx.stroke();
  });

  // Door sprite (wall with dark opening, door handle)
  createTexture(scene, 'obj_door', TILE.WIDTH, TILE.HEIGHT + 16, (ctx, w, h) => {
    // Wall base
    ctx.fillStyle = PZ_PALETTE.wood.mid;
    ctx.beginPath();
    ctx.moveTo(0, HALF_H);
    ctx.lineTo(HALF_W, 0);
    ctx.lineTo(TILE.WIDTH, HALF_H);
    ctx.lineTo(TILE.WIDTH, HALF_H + 16);
    ctx.lineTo(HALF_W, TILE.HEIGHT + 16);
    ctx.lineTo(0, HALF_H + 16);
    ctx.closePath();
    ctx.fill();

    // Dark opening (doorway)
    ctx.fillStyle = '#0a0808';
    ctx.beginPath();
    ctx.moveTo(10, HALF_H + 5);
    ctx.lineTo(HALF_W - 3, TILE.HEIGHT + 3);
    ctx.lineTo(HALF_W - 3, TILE.HEIGHT + 15);
    ctx.lineTo(10, HALF_H + 15);
    ctx.closePath();
    ctx.fill();

    // Door frame
    ctx.strokeStyle = PZ_PALETTE.wood.dark;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Door handle
    ctx.fillStyle = '#6a5a4a';
    ctx.fillRect(HALF_W - 8, TILE.HEIGHT + 6, 2, 3);
  });

  // Container (crate with cross boards, iso box shape)
  createTexture(scene, 'obj_container', 24, 28, (ctx, w, h) => {
    // Crate body (front face)
    ctx.fillStyle = '#6a5030';
    ctx.fillRect(2, 10, 20, 16);

    // Top face (isometric diamond-ish)
    ctx.fillStyle = '#7a6040';
    ctx.beginPath();
    ctx.moveTo(2, 10);
    ctx.lineTo(12, 4);
    ctx.lineTo(22, 10);
    ctx.lineTo(12, 16);
    ctx.closePath();
    ctx.fill();

    // Side face (darker)
    ctx.fillStyle = '#5a4020';
    ctx.beginPath();
    ctx.moveTo(22, 10);
    ctx.lineTo(22, 26);
    ctx.lineTo(12, 32);
    ctx.lineTo(12, 16);
    ctx.closePath();
    ctx.fill();

    // Cross boards
    ctx.strokeStyle = '#4a3018';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.lineTo(20, 24);
    ctx.moveTo(20, 12);
    ctx.lineTo(4, 24);
    ctx.stroke();

    // Outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(2, 10, 20, 16);
  });

  // Bed furniture
  createTexture(scene, 'obj_furniture_bed', 32, 20, (ctx, w, h) => {
    // Frame
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(0, 4, 32, 16);

    // Mattress
    ctx.fillStyle = '#8a8a7a';
    ctx.fillRect(2, 2, 28, 14);

    // Pillow
    ctx.fillStyle = '#9a9a8a';
    ctx.fillRect(2, 2, 10, 14);

    // Blanket fold line
    ctx.strokeStyle = 'rgba(60, 60, 55, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.lineTo(14, 16);
    ctx.stroke();

    // Frame outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.strokeRect(2, 2, 28, 14);
  });

  // Table furniture
  createTexture(scene, 'obj_furniture_table', 24, 16, (ctx, w, h) => {
    // Tabletop
    ctx.fillStyle = '#5a4530';
    ctx.fillRect(2, 0, 20, 10);

    // Legs
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(3, 10, 2, 6);
    ctx.fillRect(19, 10, 2, 6);

    // Tabletop highlight
    ctx.strokeStyle = 'rgba(100, 85, 60, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(3, 2);
    ctx.lineTo(21, 2);
    ctx.stroke();

    // Outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.strokeRect(2, 0, 20, 10);
  });

  // Vehicle sprites
  // Sedan (iso 3/4 view, blue with rust, broken windows)
  createTexture(scene, 'obj_car_sedan', 48, 28, (ctx, w, h) => {
    // Body
    ctx.fillStyle = '#3a5a7a';
    ctx.beginPath();
    ctx.moveTo(4, 18);
    ctx.lineTo(8, 8);
    ctx.lineTo(16, 4);
    ctx.lineTo(32, 4);
    ctx.lineTo(40, 8);
    ctx.lineTo(44, 14);
    ctx.lineTo(44, 22);
    ctx.lineTo(4, 22);
    ctx.closePath();
    ctx.fill();

    // Windows
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(12, 6, 10, 8);
    ctx.fillRect(24, 6, 10, 8);

    // Window crack
    ctx.strokeStyle = 'rgba(150, 180, 200, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(14, 7);
    ctx.lineTo(18, 12);
    ctx.lineTo(16, 13);
    ctx.stroke();

    // Wheels
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(12, 22, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(36, 22, 4, 0, Math.PI * 2); ctx.fill();

    // Hubcaps
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath(); ctx.arc(12, 22, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(36, 22, 2, 0, Math.PI * 2); ctx.fill();

    // Rust patches
    ctx.fillStyle = PZ_PALETTE.rust;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(20, 16, 6, 4);
    ctx.fillRect(38, 10, 4, 6);
    ctx.fillRect(6, 14, 3, 5);
    ctx.globalAlpha = 1.0;

    // Headlights
    ctx.fillStyle = 'rgba(200, 200, 180, 0.5)';
    ctx.fillRect(42, 14, 2, 3);
  });

  // Truck (iso 3/4 view, brown pickup)
  createTexture(scene, 'obj_car_truck', 52, 30, (ctx, w, h) => {
    // Cab
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(2, 8, 18, 16);

    // Cab window
    ctx.fillStyle = '#1a2530';
    ctx.fillRect(6, 10, 10, 8);

    // Truck bed
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(20, 12, 28, 14);

    // Bed rail
    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(20, 12, 28, 2);

    // Bed floor detail
    ctx.strokeStyle = 'rgba(20, 15, 10, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(22 + i * 6, 14);
      ctx.lineTo(22 + i * 6, 24);
      ctx.stroke();
    }

    // Wheels
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(12, 24, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(40, 24, 4, 0, Math.PI * 2); ctx.fill();

    // Hubcaps
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath(); ctx.arc(12, 24, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(40, 24, 2, 0, Math.PI * 2); ctx.fill();
  });

  // Van (iso 3/4 view, gray)
  createTexture(scene, 'obj_car_van', 50, 32, (ctx, w, h) => {
    // Body
    ctx.fillStyle = '#5a5050';
    ctx.fillRect(2, 4, 46, 22);

    // Windows
    ctx.fillStyle = '#1a2530';
    ctx.fillRect(6, 6, 10, 8);
    ctx.fillRect(18, 6, 6, 6);
    ctx.fillRect(26, 6, 6, 6);

    // Side door line
    ctx.strokeStyle = 'rgba(30, 30, 30, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(34, 6);
    ctx.lineTo(34, 24);
    ctx.stroke();

    // Wheels
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(14, 26, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(38, 26, 4, 0, Math.PI * 2); ctx.fill();

    // Hubcaps
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath(); ctx.arc(14, 26, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(38, 26, 2, 0, Math.PI * 2); ctx.fill();
  });

  // Wreck (mangled, burn marks)
  createTexture(scene, 'obj_car_wreck', 40, 24, (ctx, w, h) => {
    // Mangled body
    ctx.fillStyle = '#5a3a2a';
    ctx.beginPath();
    ctx.moveTo(4, 16);
    ctx.lineTo(6, 6);
    ctx.lineTo(14, 2);
    ctx.lineTo(28, 4);
    ctx.lineTo(36, 10);
    ctx.lineTo(36, 20);
    ctx.lineTo(4, 20);
    ctx.closePath();
    ctx.fill();

    // Burn marks
    ctx.fillStyle = 'rgba(15, 12, 8, 0.6)';
    ctx.fillRect(10, 8, 12, 8);
    ctx.fillRect(26, 6, 6, 10);

    // Broken window frame
    ctx.strokeStyle = '#1a2530';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 4, 8, 6);

    // Remaining wheel (damaged)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(10, 20, 3, 0, Math.PI * 2); ctx.fill();

    // Debris
    ctx.fillStyle = 'rgba(60, 40, 30, 0.5)';
    ctx.fillRect(24, 18, 3, 2);
    ctx.fillRect(30, 16, 2, 3);
  });
}

// ============================================================================
// TREE SPRITES GENERATION
// ============================================================================

export function generateTreeSprites(scene) {
  const rng = mulberry32(7777);

  // Tree variant 0: Round deciduous - clustered canopy with 8+ small ellipses
  createTexture(scene, 'obj_tree_0', 52, 72, (ctx, w, h) => {
    const cx = w / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, h - 4, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk with bark texture and root flare
    const trunkGrad = ctx.createLinearGradient(cx - 5, 45, cx + 5, 45);
    trunkGrad.addColorStop(0, '#5a3a20');
    trunkGrad.addColorStop(0.5, '#6a4a28');
    trunkGrad.addColorStop(1, '#4a2a18');
    ctx.fillStyle = trunkGrad;

    // Main trunk
    ctx.fillRect(cx - 4, 40, 8, 28);

    // Root flare (wider at bottom)
    ctx.beginPath();
    ctx.moveTo(cx - 4, 64);
    ctx.lineTo(cx - 7, 68);
    ctx.lineTo(cx + 7, 68);
    ctx.lineTo(cx + 4, 64);
    ctx.closePath();
    ctx.fill();

    // Bark detail lines
    ctx.strokeStyle = 'rgba(30, 20, 10, 0.5)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 7; i++) {
      const y = 42 + i * 4;
      ctx.beginPath();
      ctx.moveTo(cx - 4, y);
      ctx.lineTo(cx + 4, y + 1);
      ctx.stroke();
    }

    // Bark knots
    ctx.fillStyle = 'rgba(20, 15, 10, 0.6)';
    ctx.fillRect(cx - 2, 48, 2, 2);
    ctx.fillRect(cx + 1, 56, 2, 2);

    // Canopy - 8+ clustered ellipses in varying greens (NW-lit)
    const canopyColors = ['#3a6a28', '#2e5a1e', '#366520', '#2a5418', '#407030', '#325a22', '#3a7028', '#2e5a20'];
    const clusters = [
      { x: cx - 10, y: 22, rx: 14, ry: 12 },
      { x: cx + 8, y: 24, rx: 13, ry: 11 },
      { x: cx - 2, y: 16, rx: 15, ry: 13 },
      { x: cx - 14, y: 28, rx: 10, ry: 9 },
      { x: cx + 12, y: 30, rx: 11, ry: 10 },
      { x: cx, y: 26, rx: 12, ry: 10 },
      { x: cx - 8, y: 32, rx: 11, ry: 9 },
      { x: cx + 6, y: 18, rx: 10, ry: 9 },
    ];

    clusters.forEach((c, i) => {
      ctx.fillStyle = canopyColors[i % canopyColors.length];
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // NW highlight on canopy
    ctx.fillStyle = 'rgba(100, 140, 70, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - 8, 18, 8, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // SE shadow on canopy
    ctx.fillStyle = 'rgba(20, 35, 15, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx + 6, 30, 9, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Leaf detail dots
    for (let i = 0; i < 45; i++) {
      const lx = cx + (rng() - 0.5) * 34;
      const ly = 24 + (rng() - 0.5) * 26;
      const dist = Math.sqrt(Math.pow(lx - cx, 2) + Math.pow(ly - 24, 2));
      if (dist < 18) {
        ctx.fillStyle = rng() > 0.5 ? 'rgba(50, 90, 30, 0.5)' : 'rgba(80, 130, 50, 0.4)';
        ctx.fillRect(lx, ly, 1, 1);
      }
    }
  });

  // Tree variant 1: Tall pine - layered triangular foliage with needle dots
  createTexture(scene, 'obj_tree_1', 52, 72, (ctx, w, h) => {
    const cx = w / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, h - 4, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    const trunkGrad = ctx.createLinearGradient(cx - 3, 35, cx + 3, 35);
    trunkGrad.addColorStop(0, '#6a4a28');
    trunkGrad.addColorStop(0.5, '#7a5a38');
    trunkGrad.addColorStop(1, '#5a3a20');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(cx - 3, 35, 6, 33);

    // Bark lines
    ctx.strokeStyle = 'rgba(30, 20, 10, 0.5)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 3, 37 + i * 4);
      ctx.lineTo(cx + 3, 38 + i * 4);
      ctx.stroke();
    }

    // Pine foliage - 4 triangular layers
    const pineColors = ['#2e5a1e', '#2a5018', '#325a22', '#2e5820'];

    // Layer 1 (bottom, widest)
    ctx.fillStyle = pineColors[0];
    ctx.beginPath();
    ctx.moveTo(cx, 32);
    ctx.lineTo(cx - 18, 48);
    ctx.lineTo(cx + 18, 48);
    ctx.closePath();
    ctx.fill();

    // Layer 2
    ctx.fillStyle = pineColors[1];
    ctx.beginPath();
    ctx.moveTo(cx, 22);
    ctx.lineTo(cx - 15, 38);
    ctx.lineTo(cx + 15, 38);
    ctx.closePath();
    ctx.fill();

    // Layer 3
    ctx.fillStyle = pineColors[2];
    ctx.beginPath();
    ctx.moveTo(cx, 12);
    ctx.lineTo(cx - 12, 28);
    ctx.lineTo(cx + 12, 28);
    ctx.closePath();
    ctx.fill();

    // Layer 4 (top)
    ctx.fillStyle = pineColors[3];
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx - 8, 18);
    ctx.lineTo(cx + 8, 18);
    ctx.closePath();
    ctx.fill();

    // Pine needle texture dots
    for (let i = 0; i < 60; i++) {
      const nx = cx + (rng() - 0.5) * 32;
      const ny = 10 + rng() * 38;
      const relY = ny - 4;
      const maxX = 8 + (relY / 44) * 14;
      if (Math.abs(nx - cx) < maxX && ny > 6) {
        ctx.fillStyle = rng() > 0.6 ? 'rgba(40, 70, 25, 0.4)' : 'rgba(60, 100, 35, 0.3)';
        ctx.fillRect(nx, ny, 1, 1);
      }
    }

    // NW highlight
    ctx.fillStyle = 'rgba(70, 110, 50, 0.2)';
    ctx.beginPath();
    ctx.moveTo(cx - 4, 8);
    ctx.lineTo(cx - 10, 24);
    ctx.lineTo(cx, 20);
    ctx.closePath();
    ctx.fill();
  });

  // Tree variant 2: Wide oak - bushy canopy with multiple cluster groups
  createTexture(scene, 'obj_tree_2', 52, 72, (ctx, w, h) => {
    const cx = w / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, h - 4, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk - thicker for oak
    const trunkGrad = ctx.createLinearGradient(cx - 6, 40, cx + 6, 40);
    trunkGrad.addColorStop(0, '#5a3a20');
    trunkGrad.addColorStop(0.5, '#6a4a28');
    trunkGrad.addColorStop(1, '#4a2a18');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(cx - 6, 38, 12, 30);

    // Root flare
    ctx.beginPath();
    ctx.moveTo(cx - 6, 64);
    ctx.lineTo(cx - 10, 68);
    ctx.lineTo(cx + 10, 68);
    ctx.lineTo(cx + 6, 64);
    ctx.closePath();
    ctx.fill();

    // Bark texture
    ctx.strokeStyle = 'rgba(30, 20, 10, 0.5)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 6, 40 + i * 4);
      ctx.lineTo(cx + 6, 41 + i * 4);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(20, 15, 10, 0.6)';
    ctx.fillRect(cx - 3, 46, 2, 2);
    ctx.fillRect(cx + 2, 54, 2, 2);
    ctx.fillRect(cx - 1, 60, 2, 2);

    // Wide bushy canopy - multiple cluster groups
    const oakColors = ['#3a6a28', '#2e5a20', '#336622', '#2a5218', '#407030', '#3a7028'];
    const oakClusters = [
      { x: cx - 16, y: 24, rx: 14, ry: 12 },
      { x: cx + 16, y: 26, rx: 13, ry: 11 },
      { x: cx, y: 18, rx: 16, ry: 14 },
      { x: cx - 10, y: 30, rx: 12, ry: 10 },
      { x: cx + 10, y: 32, rx: 12, ry: 10 },
      { x: cx, y: 26, rx: 14, ry: 12 },
      { x: cx - 18, y: 32, rx: 10, ry: 9 },
      { x: cx + 18, y: 30, rx: 11, ry: 9 },
      { x: cx - 6, y: 20, rx: 12, ry: 10 },
      { x: cx + 6, y: 22, rx: 11, ry: 10 },
    ];

    oakClusters.forEach((c, i) => {
      ctx.fillStyle = oakColors[i % oakColors.length];
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // NW highlight
    ctx.fillStyle = 'rgba(90, 130, 60, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - 10, 20, 10, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // SE shadow
    ctx.fillStyle = 'rgba(20, 35, 15, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx + 10, 30, 12, 9, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Leaf detail
    for (let i = 0; i < 55; i++) {
      const lx = cx + (rng() - 0.5) * 42;
      const ly = 24 + (rng() - 0.5) * 28;
      const dist = Math.sqrt(Math.pow(lx - cx, 2) + Math.pow(ly - 24, 2));
      if (dist < 22) {
        ctx.fillStyle = rng() > 0.5 ? 'rgba(50, 90, 30, 0.6)' : 'rgba(80, 130, 50, 0.4)';
        ctx.fillRect(lx, ly, 1, 1);
      }
    }
  });

  // Tree variant 3: Dead/bare tree - trunk with branch stubs only
  createTexture(scene, 'obj_tree_3', 52, 72, (ctx, w, h) => {
    const cx = w / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, h - 4, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dead trunk - gray-brown
    const trunkGrad = ctx.createLinearGradient(cx - 4, 20, cx + 4, 20);
    trunkGrad.addColorStop(0, '#5a5048');
    trunkGrad.addColorStop(0.5, '#6a6058');
    trunkGrad.addColorStop(1, '#4a4038');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(cx - 4, 18, 8, 50);

    // Broken top
    ctx.beginPath();
    ctx.moveTo(cx - 4, 18);
    ctx.lineTo(cx - 2, 14);
    ctx.lineTo(cx + 1, 16);
    ctx.lineTo(cx + 4, 18);
    ctx.closePath();
    ctx.fill();

    // Branch stubs
    ctx.fillStyle = '#5a5048';
    // Left branches
    ctx.beginPath();
    ctx.moveTo(cx - 4, 26);
    ctx.lineTo(cx - 14, 20);
    ctx.lineTo(cx - 12, 22);
    ctx.lineTo(cx - 4, 28);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - 4, 38);
    ctx.lineTo(cx - 10, 34);
    ctx.lineTo(cx - 8, 36);
    ctx.lineTo(cx - 4, 40);
    ctx.closePath();
    ctx.fill();

    // Right branches
    ctx.beginPath();
    ctx.moveTo(cx + 4, 32);
    ctx.lineTo(cx + 12, 26);
    ctx.lineTo(cx + 10, 28);
    ctx.lineTo(cx + 4, 34);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 4, 46);
    ctx.lineTo(cx + 8, 42);
    ctx.lineTo(cx + 6, 44);
    ctx.lineTo(cx + 4, 48);
    ctx.closePath();
    ctx.fill();

    // Bark cracks
    ctx.strokeStyle = 'rgba(30, 28, 25, 0.5)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 10; i++) {
      const y = 20 + i * 5;
      ctx.beginPath();
      ctx.moveTo(cx - 4, y);
      ctx.lineTo(cx + 4, y + 1);
      ctx.stroke();
    }
  });
}

// ============================================================================
// ROCK SPRITES GENERATION
// ============================================================================

export function generateRockSprites(scene) {
  const rng = mulberry32(8888);

  for (let v = 0; v < 2; v++) {
    createTexture(scene, `obj_rock_${v}`, 28, 22, (ctx, w, h) => {
      // Shadow underneath
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 2, w / 2.3, h / 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Irregular rock shape with angular facets
      const grays = ['#6a6a62', '#7a7a70', '#5e5e58', '#6e6e68'];

      // Base shape
      ctx.fillStyle = grays[v];
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w / 2.4, h / 2.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Secondary facet (different shape per variant)
      ctx.fillStyle = grays[(v + 1) % grays.length];
      ctx.beginPath();
      ctx.ellipse(w / 2 - 3 + v * 2, h / 2 - 2, w / 3.2, h / 3, 0.4 - v * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Third facet
      ctx.fillStyle = grays[(v + 2) % grays.length];
      ctx.beginPath();
      ctx.ellipse(w / 2 + 4 - v * 3, h / 2 + 1, w / 3.8, h / 3.3, -0.3 + v * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // NW highlight (top-left)
      ctx.strokeStyle = 'rgba(200, 200, 190, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w / 2 - 3, h / 2 - 3, w / 5, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();

      // SE shadow (bottom-right)
      ctx.fillStyle = 'rgba(30, 30, 25, 0.3)';
      ctx.beginPath();
      ctx.ellipse(w / 2 + 4, h / 2 + 3, w / 5.5, h / 7, 0, 0, Math.PI * 2);
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
      ctx.lineTo(w * 0.72, h * 0.52);
      ctx.stroke();

      // Lichen/moss spots
      const mossRng = mulberry32(v * 8899);
      for (let i = 0; i < 4 + v * 2; i++) {
        const mx = w / 2 + (mossRng() - 0.5) * w * 0.5;
        const my = h / 2 + (mossRng() - 0.5) * h * 0.4;
        ctx.fillStyle = 'rgba(75, 95, 55, 0.4)';
        ctx.fillRect(mx, my, 1 + mossRng(), 1);
      }

      // 1px outline
      drawPixelOutline(ctx, w, h, '#2a2a25');
    });
  }
}

// ============================================================================
// BUSH SPRITES GENERATION
// ============================================================================

export function generateBushSprites(scene) {
  const rng = mulberry32(9999);

  for (let v = 0; v < 2; v++) {
    createTexture(scene, `obj_bush_${v}`, 24, 20, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 2, w / 2.4, h / 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Multiple leaf cluster ellipses
      const greens = ['#3a6a28', '#2e5a20', '#336622', '#2a5218'];

      // Base cluster
      ctx.fillStyle = greens[v];
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 2, w / 2.2, h / 2.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Left cluster
      ctx.fillStyle = greens[(v + 1) % greens.length];
      ctx.beginPath();
      ctx.ellipse(w / 2 - 4, h / 2, w / 3.3, h / 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Right cluster
      ctx.fillStyle = greens[(v + 2) % greens.length];
      ctx.beginPath();
      ctx.ellipse(w / 2 + 4, h / 2 + 1, w / 3.3, h / 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top cluster
      ctx.fillStyle = greens[(v + 3) % greens.length];
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 - 2, w / 3.6, h / 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Darker center shadow
      ctx.fillStyle = 'rgba(20, 40, 15, 0.4)';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 3, w / 4.5, h / 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Berry dots (red for v=0, blue for v=1)
      const berryRng = mulberry32(v * 9988);
      const berryColors = v === 0 ? ['#cc3344', '#dd4455'] : ['#4466cc', '#5577dd'];
      for (let i = 0; i < 8 + v * 3; i++) {
        const bx = w / 2 + (berryRng() - 0.5) * w * 0.55;
        const by = h / 2 + (berryRng() - 0.5) * h * 0.45;
        const dist = Math.sqrt(Math.pow(bx - w / 2, 2) + Math.pow(by - h / 2, 2));
        if (dist < w / 3) {
          ctx.fillStyle = berryColors[Math.floor(berryRng() * 2)];
          ctx.beginPath();
          ctx.arc(bx, by, 1 + berryRng() * 0.6, 0, Math.PI * 2);
          ctx.fill();

          // Berry highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.arc(bx - 0.3, by - 0.3, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Leaf highlight details
      const leafRng = mulberry32(v * 9977);
      for (let i = 0; i < 14; i++) {
        const lx = w / 2 + (leafRng() - 0.5) * w * 0.5;
        const ly = h / 2 + (leafRng() - 0.5) * h * 0.4;
        const dist = Math.sqrt(Math.pow(lx - w / 2, 2) + Math.pow(ly - h / 2, 2));
        if (dist < w / 3) {
          ctx.fillStyle = leafRng() > 0.5 ? 'rgba(80, 130, 50, 0.5)' : 'rgba(30, 50, 20, 0.4)';
          ctx.fillRect(lx, ly, 1.5, 1);
        }
      }
    });
  }
}

// ============================================================================
// CAMPFIRE SPRITE GENERATION
// ============================================================================

export function generateCampfireSprite(scene) {
  createTexture(scene, 'obj_campfire', 36, 40, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2 + 6;

    // Ground glow circle (warm orange tint)
    const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    glowGradient.addColorStop(0, 'rgba(255, 130, 40, 0.25)');
    glowGradient.addColorStop(1, 'rgba(255, 130, 40, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone ring (individual rounded stones in isometric perspective)
    const ringRadius = 12;
    const stoneCount = 10;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      const sx = cx + Math.cos(angle) * ringRadius;
      const sy = cy + Math.sin(angle) * ringRadius * 0.4;

      const stoneGrad = ctx.createRadialGradient(sx - 1, sy - 0.5, 0, sx, sy, 3.5);
      stoneGrad.addColorStop(0, '#8a8a7a');
      stoneGrad.addColorStop(1, '#5a5a52');
      ctx.fillStyle = stoneGrad;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 3.5, 2.5, angle * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Stone highlight
      ctx.fillStyle = 'rgba(140, 140, 130, 0.4)';
      ctx.beginPath();
      ctx.arc(sx - 1, sy - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wood logs crossed in center with bark texture
    const logGrad1 = ctx.createLinearGradient(cx - 9, cy, cx + 9, cy);
    logGrad1.addColorStop(0, '#4a2a18');
    logGrad1.addColorStop(0.5, '#5a3a20');
    logGrad1.addColorStop(1, '#4a2a18');
    ctx.fillStyle = logGrad1;
    ctx.fillRect(cx - 9, cy - 1.5, 18, 4);

    const logGrad2 = ctx.createLinearGradient(cx, cy - 7, cx, cy + 7);
    logGrad2.addColorStop(0, '#4a2a18');
    logGrad2.addColorStop(0.5, '#5a3a20');
    logGrad2.addColorStop(1, '#4a2a18');
    ctx.fillStyle = logGrad2;
    ctx.fillRect(cx - 2, cy - 7, 4, 14);

    // Bark lines
    ctx.strokeStyle = 'rgba(20, 15, 10, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx - 5, cy + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy);
    ctx.lineTo(cx + 7, cy + 1);
    ctx.stroke();

    // Ember dots below flame
    const emberRng = mulberry32(6666);
    ctx.fillStyle = '#ff6622';
    for (let i = 0; i < 10; i++) {
      const ex = cx + (emberRng() - 0.5) * 14;
      const ey = cy + (emberRng() - 0.5) * 7;
      ctx.fillRect(ex, ey, 1 + emberRng() * 0.5, 1);
    }

    // Flame layers: outer red-orange, middle orange, inner yellow-white
    // Outer flame
    ctx.fillStyle = '#ff4422';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20);
    ctx.quadraticCurveTo(cx - 2, cy - 15, cx - 8, cy - 5);
    ctx.lineTo(cx - 7, cy + 1);
    ctx.quadraticCurveTo(cx - 3, cy - 1, cx, cy - 2);
    ctx.quadraticCurveTo(cx + 3, cy - 1, cx + 7, cy + 1);
    ctx.lineTo(cx + 8, cy - 5);
    ctx.quadraticCurveTo(cx + 2, cy - 15, cx, cy - 20);
    ctx.closePath();
    ctx.fill();

    // Middle flame
    ctx.fillStyle = '#ff8822';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 16);
    ctx.quadraticCurveTo(cx - 1.5, cy - 12, cx - 6, cy - 4);
    ctx.lineTo(cx - 5, cy);
    ctx.quadraticCurveTo(cx - 2, cy - 1, cx, cy - 2);
    ctx.quadraticCurveTo(cx + 2, cy - 1, cx + 5, cy);
    ctx.lineTo(cx + 6, cy - 4);
    ctx.quadraticCurveTo(cx + 1.5, cy - 12, cx, cy - 16);
    ctx.closePath();
    ctx.fill();

    // Inner flame
    ctx.fillStyle = '#ffdd44';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.quadraticCurveTo(cx - 1, cy - 10, cx - 4, cy - 4);
    ctx.lineTo(cx - 3, cy - 1);
    ctx.quadraticCurveTo(cx - 1, cy - 2, cx, cy - 2.5);
    ctx.quadraticCurveTo(cx + 1, cy - 2, cx + 3, cy - 1);
    ctx.lineTo(cx + 4, cy - 4);
    ctx.quadraticCurveTo(cx + 1, cy - 10, cx, cy - 12);
    ctx.closePath();
    ctx.fill();

    // Bright core
    ctx.fillStyle = '#ffffaa';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9);
    ctx.lineTo(cx - 2, cy - 4);
    ctx.lineTo(cx + 2, cy - 4);
    ctx.closePath();
    ctx.fill();
  });
}

// ============================================================================
// PLAYER SPRITES GENERATION - THE WHITE BOX FIX
// ============================================================================

export function generatePlayerSprites(scene) {
  const dirs = ['S', 'N', 'E', 'W'];
  const w = 48, h = 64;

  // PZ-style survivor colors
  const colors = {
    shirt: '#5a5a4a',       // Olive shirt
    shirtShadow: '#4a4a3a',
    pants: '#3a3a30',       // Dark olive pants
    pantsShadow: '#2a2a22',
    boots: '#2a2018',       // Brown boots
    bootSole: '#1a1008',
    skin: '#ccb090',
    skinLight: '#ddc0a0',
    skinShadow: '#aa8a68',
    hair: '#2a1a0a',        // Dark brown hair
    capTop: '#3a4a3a',      // Baseball cap
    capVisor: '#2a3a2a',
    backpack: '#4a4038',    // Backpack
  };

  function drawSurvivor(ctx, dir) {
    const cx = w / 2;
    ctx.clearRect(0, 0, w, h);

    if (dir === 'S') {
      // SOUTH - front facing

      // Boots with laces
      ctx.fillStyle = colors.boots;
      ctx.fillRect(cx - 10, 50, 8, 8);
      ctx.fillRect(cx + 2, 50, 8, 8);
      ctx.fillStyle = colors.bootSole;
      ctx.fillRect(cx - 10, 56, 8, 2);
      ctx.fillRect(cx + 2, 56, 8, 2);
      // Boot laces
      ctx.strokeStyle = '#1a1510';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - 7, 52);
      ctx.lineTo(cx - 5, 54);
      ctx.moveTo(cx + 5, 52);
      ctx.lineTo(cx + 7, 54);
      ctx.stroke();

      // Cargo pants with side pockets
      ctx.fillStyle = colors.pants;
      ctx.fillRect(cx - 9, 38, 8, 14);
      ctx.fillRect(cx + 1, 38, 8, 14);
      // Pocket rectangles
      ctx.strokeStyle = colors.pantsShadow;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx - 8, 42, 4, 5);
      ctx.strokeRect(cx + 4, 42, 4, 5);

      // Stocky torso (wider)
      ctx.fillStyle = colors.shirt;
      ctx.fillRect(cx - 10, 22, 20, 18);
      // Shirt shadow on sides
      ctx.fillStyle = colors.shirtShadow;
      ctx.fillRect(cx - 10, 22, 3, 18);
      ctx.fillRect(cx + 7, 22, 3, 18);
      // Zipper line down center
      ctx.strokeStyle = '#4a4a3a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, 23);
      ctx.lineTo(cx, 38);
      ctx.stroke();
      // Collar
      ctx.fillStyle = colors.shirtShadow;
      ctx.fillRect(cx - 4, 22, 8, 2);
      // Chest pockets
      ctx.strokeStyle = colors.shirtShadow;
      ctx.strokeRect(cx - 7, 26, 4, 4);
      ctx.strokeRect(cx + 3, 26, 4, 4);

      // Arms with rounded shoulders
      ctx.fillStyle = colors.shirt;
      ctx.beginPath();
      ctx.arc(cx - 12, 25, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 15, 25, 5, 12);
      ctx.beginPath();
      ctx.arc(cx + 12, 25, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx + 10, 25, 5, 12);

      // Hands
      ctx.fillStyle = colors.skin;
      ctx.fillRect(cx - 15, 36, 5, 4);
      ctx.fillRect(cx + 10, 36, 5, 4);

      // Stocky head (bigger)
      const headGrad = ctx.createRadialGradient(cx - 2, 12, 2, cx, 14, 10);
      headGrad.addColorStop(0, colors.skinLight);
      headGrad.addColorStop(1, colors.skin);
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(cx, 14, 10, 0, Math.PI * 2);
      ctx.fill();

      // 5 o'clock shadow
      ctx.fillStyle = 'rgba(40, 30, 20, 0.15)';
      ctx.beginPath();
      ctx.arc(cx, 18, 7, 0.3, Math.PI - 0.3);
      ctx.fill();

      // Baseball cap
      ctx.fillStyle = colors.capTop;
      ctx.beginPath();
      ctx.arc(cx, 8, 10, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10, 8, 20, 4);
      // Cap visor
      ctx.fillStyle = colors.capVisor;
      ctx.fillRect(cx - 8, 11, 16, 3);

      // Eyes with brow shadow
      ctx.fillStyle = 'rgba(30, 25, 20, 0.3)';
      ctx.fillRect(cx - 6, 12, 12, 2);
      ctx.fillStyle = '#1a1510';
      ctx.fillRect(cx - 5, 13, 2, 2);
      ctx.fillRect(cx + 3, 13, 2, 2);

    } else if (dir === 'N') {
      // NORTH - back facing

      // Boots
      ctx.fillStyle = colors.boots;
      ctx.fillRect(cx - 10, 50, 8, 8);
      ctx.fillRect(cx + 2, 50, 8, 8);
      ctx.fillStyle = colors.bootSole;
      ctx.fillRect(cx - 10, 56, 8, 2);
      ctx.fillRect(cx + 2, 56, 8, 2);

      // Cargo pants
      ctx.fillStyle = colors.pants;
      ctx.fillRect(cx - 9, 38, 8, 14);
      ctx.fillRect(cx + 1, 38, 8, 14);
      ctx.strokeStyle = colors.pantsShadow;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx - 8, 42, 4, 5);
      ctx.strokeRect(cx + 4, 42, 4, 5);

      // Torso
      ctx.fillStyle = colors.shirt;
      ctx.fillRect(cx - 10, 22, 20, 18);
      ctx.fillStyle = colors.shirtShadow;
      ctx.fillRect(cx - 1, 22, 2, 18);

      // Backpack (visible on back)
      ctx.fillStyle = colors.backpack;
      ctx.fillRect(cx - 7, 25, 14, 12);
      ctx.strokeStyle = '#3a3028';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx - 7, 25, 14, 12);
      // Backpack straps
      ctx.strokeStyle = '#4a4038';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, 25);
      ctx.lineTo(cx - 8, 22);
      ctx.moveTo(cx + 5, 25);
      ctx.lineTo(cx + 8, 22);
      ctx.stroke();

      // Arms
      ctx.fillStyle = colors.shirt;
      ctx.beginPath();
      ctx.arc(cx - 12, 25, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 15, 25, 5, 12);
      ctx.beginPath();
      ctx.arc(cx + 12, 25, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx + 10, 25, 5, 12);

      // Hands
      ctx.fillStyle = colors.skin;
      ctx.fillRect(cx - 15, 36, 5, 4);
      ctx.fillRect(cx + 10, 36, 5, 4);

      // Head (mostly hair from back)
      ctx.fillStyle = colors.hair;
      ctx.beginPath();
      ctx.arc(cx, 14, 10, 0, Math.PI * 2);
      ctx.fill();

      // Neck
      ctx.fillStyle = colors.skin;
      ctx.fillRect(cx - 3, 20, 6, 4);

      // Baseball cap (back view)
      ctx.fillStyle = colors.capTop;
      ctx.beginPath();
      ctx.arc(cx, 8, 10, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10, 8, 20, 6);

    } else {
      // EAST or WEST - side facing
      const flip = dir === 'E' ? 1 : -1;
      const ox = flip * 3;

      // Boots
      ctx.fillStyle = colors.boots;
      ctx.fillRect(cx + ox - 7, 50, 7, 8);
      ctx.fillRect(cx + ox + 1, 50, 7, 8);
      ctx.fillStyle = colors.bootSole;
      ctx.fillRect(cx + ox - 7, 56, 7, 2);
      ctx.fillRect(cx + ox + 1, 56, 7, 2);

      // Cargo pants
      ctx.fillStyle = colors.pants;
      ctx.fillRect(cx + ox - 6, 38, 6, 14);
      ctx.fillRect(cx + ox + 1, 38, 6, 14);
      ctx.strokeStyle = colors.pantsShadow;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx + ox + (flip > 0 ? 2 : -5), 42, 3, 5);

      // Torso
      ctx.fillStyle = colors.shirt;
      ctx.fillRect(cx + ox - 8, 22, 16, 18);
      ctx.fillStyle = colors.shirtShadow;
      ctx.fillRect(cx + ox + (flip > 0 ? 5 : -8), 22, 3, 18);
      // Zipper
      ctx.strokeStyle = '#4a4a3a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + ox + flip * 2, 23);
      ctx.lineTo(cx + ox + flip * 2, 38);
      ctx.stroke();

      // Visible arm
      ctx.fillStyle = colors.shirt;
      const armX = dir === 'E' ? cx + ox + 6 : cx + ox - 12;
      ctx.beginPath();
      ctx.arc(armX + 2, 25, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(armX, 25, 5, 12);

      // Hand
      ctx.fillStyle = colors.skin;
      ctx.fillRect(armX, 36, 5, 4);

      // Head (side profile)
      const headGradSide = ctx.createRadialGradient(cx + ox - flip * 2, 12, 2, cx + ox, 14, 10);
      headGradSide.addColorStop(0, colors.skinLight);
      headGradSide.addColorStop(1, colors.skin);
      ctx.fillStyle = headGradSide;
      ctx.beginPath();
      ctx.arc(cx + ox, 14, 10, 0, Math.PI * 2);
      ctx.fill();

      // 5 o'clock shadow (profile)
      ctx.fillStyle = 'rgba(40, 30, 20, 0.15)';
      ctx.beginPath();
      if (dir === 'E') {
        ctx.arc(cx + ox + 3, 17, 5, -0.5, Math.PI * 0.5);
      } else {
        ctx.arc(cx + ox - 3, 17, 5, Math.PI * 0.5, Math.PI + 0.5);
      }
      ctx.fill();

      // Hair profile
      ctx.fillStyle = colors.hair;
      if (dir === 'W') {
        ctx.beginPath();
        ctx.arc(cx + ox - 5, 9, 8, 0, Math.PI);
        ctx.fill();
        ctx.fillRect(cx + ox - 10, 9, 10, 6);
        ctx.fillRect(cx + ox + 2, 9, 5, 8);
      } else {
        ctx.beginPath();
        ctx.arc(cx + ox + 5, 9, 8, 0, Math.PI);
        ctx.fill();
        ctx.fillRect(cx + ox, 9, 10, 6);
        ctx.fillRect(cx + ox - 7, 9, 5, 8);
      }

      // Baseball cap with visor (side view)
      ctx.fillStyle = colors.capTop;
      ctx.beginPath();
      ctx.arc(cx + ox, 8, 10, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx + ox - 10, 8, 20, 5);
      // Visor
      ctx.fillStyle = colors.capVisor;
      if (dir === 'E') {
        ctx.fillRect(cx + ox + 5, 11, 8, 3);
      } else {
        ctx.fillRect(cx + ox - 13, 11, 8, 3);
      }

      // Eye (side)
      ctx.fillStyle = '#1a1510';
      ctx.fillRect(cx + ox + flip * 4, 13, 2, 2);
    }

    // Draw 1px pixel outline around the character
    drawPixelOutline(ctx, w, h, '#141510');
  }

  // Draw a walking variant with leg offset for animation
  function drawSurvivorWalk(ctx, dir, frame) {
    const cx = w / 2;
    // frame 1 = left leg forward, frame 2 = right leg forward
    const legOffset = frame === 1 ? 3 : -3;

    ctx.clearRect(0, 0, w, h);

    if (dir === 'S' || dir === 'N') {
      // For S/N directions, offset legs forward/back
      const leftLegY = 50 + (frame === 1 ? -legOffset : legOffset);
      const rightLegY = 50 + (frame === 1 ? legOffset : -legOffset);
      const leftBootY = leftLegY;
      const rightBootY = rightLegY;

      if (dir === 'S') {
        // Boots with offset
        ctx.fillStyle = colors.boots;
        ctx.fillRect(cx - 10, leftBootY, 8, 8);
        ctx.fillRect(cx + 2, rightBootY, 8, 8);
        ctx.fillStyle = colors.bootSole;
        ctx.fillRect(cx - 10, leftBootY + 6, 8, 2);
        ctx.fillRect(cx + 2, rightBootY + 6, 8, 2);

        // Cargo pants with offset
        ctx.fillStyle = colors.pants;
        ctx.fillRect(cx - 9, 38, 8, leftBootY - 38);
        ctx.fillRect(cx + 1, 38, 8, rightBootY - 38);
        ctx.strokeStyle = colors.pantsShadow;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - 8, 42, 4, 5);
        ctx.strokeRect(cx + 4, 42, 4, 5);

        // Torso (same as idle)
        ctx.fillStyle = colors.shirt;
        ctx.fillRect(cx - 10, 22, 20, 18);
        ctx.fillStyle = colors.shirtShadow;
        ctx.fillRect(cx - 10, 22, 3, 18);
        ctx.fillRect(cx + 7, 22, 3, 18);
        ctx.strokeStyle = '#4a4a3a';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, 23);
        ctx.lineTo(cx, 38);
        ctx.stroke();
        ctx.fillStyle = colors.shirtShadow;
        ctx.fillRect(cx - 4, 22, 8, 2);
        ctx.strokeStyle = colors.shirtShadow;
        ctx.strokeRect(cx - 7, 26, 4, 4);
        ctx.strokeRect(cx + 3, 26, 4, 4);

        // Arms swinging (opposite to legs)
        const armSwing = frame === 1 ? 2 : -2;
        ctx.fillStyle = colors.shirt;
        ctx.beginPath();
        ctx.arc(cx - 12, 25, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 15, 25 - armSwing, 5, 12);
        ctx.beginPath();
        ctx.arc(cx + 12, 25, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx + 10, 25 + armSwing, 5, 12);
        // Hands
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 15, 36 - armSwing, 5, 4);
        ctx.fillRect(cx + 10, 36 + armSwing, 5, 4);

        // Head (same as idle)
        const headGrad = ctx.createRadialGradient(cx - 2, 12, 2, cx, 14, 10);
        headGrad.addColorStop(0, colors.skinLight);
        headGrad.addColorStop(1, colors.skin);
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(cx, 14, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(40, 30, 20, 0.15)';
        ctx.beginPath();
        ctx.arc(cx, 18, 7, 0.3, Math.PI - 0.3);
        ctx.fill();
        ctx.fillStyle = colors.capTop;
        ctx.beginPath();
        ctx.arc(cx, 8, 10, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 10, 8, 20, 4);
        ctx.fillStyle = colors.capVisor;
        ctx.fillRect(cx - 8, 11, 16, 3);
        ctx.fillStyle = 'rgba(30, 25, 20, 0.3)';
        ctx.fillRect(cx - 6, 12, 12, 2);
        ctx.fillStyle = '#1a1510';
        ctx.fillRect(cx - 5, 13, 2, 2);
        ctx.fillRect(cx + 3, 13, 2, 2);

      } else {
        // NORTH walk
        ctx.fillStyle = colors.boots;
        ctx.fillRect(cx - 10, leftBootY, 8, 8);
        ctx.fillRect(cx + 2, rightBootY, 8, 8);
        ctx.fillStyle = colors.bootSole;
        ctx.fillRect(cx - 10, leftBootY + 6, 8, 2);
        ctx.fillRect(cx + 2, rightBootY + 6, 8, 2);

        ctx.fillStyle = colors.pants;
        ctx.fillRect(cx - 9, 38, 8, leftBootY - 38);
        ctx.fillRect(cx + 1, 38, 8, rightBootY - 38);
        ctx.strokeStyle = colors.pantsShadow;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - 8, 42, 4, 5);
        ctx.strokeRect(cx + 4, 42, 4, 5);

        ctx.fillStyle = colors.shirt;
        ctx.fillRect(cx - 10, 22, 20, 18);
        ctx.fillStyle = colors.shirtShadow;
        ctx.fillRect(cx - 1, 22, 2, 18);

        // Backpack
        ctx.fillStyle = colors.backpack;
        ctx.fillRect(cx - 7, 25, 14, 12);
        ctx.strokeStyle = '#3a3028';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - 7, 25, 14, 12);
        ctx.strokeStyle = '#4a4038';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 5, 25);
        ctx.lineTo(cx - 8, 22);
        ctx.moveTo(cx + 5, 25);
        ctx.lineTo(cx + 8, 22);
        ctx.stroke();

        // Arms swinging
        const armSwing2 = frame === 1 ? 2 : -2;
        ctx.fillStyle = colors.shirt;
        ctx.beginPath();
        ctx.arc(cx - 12, 25, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 15, 25 + armSwing2, 5, 12);
        ctx.beginPath();
        ctx.arc(cx + 12, 25, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx + 10, 25 - armSwing2, 5, 12);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 15, 36 + armSwing2, 5, 4);
        ctx.fillRect(cx + 10, 36 - armSwing2, 5, 4);

        // Head (back)
        ctx.fillStyle = colors.hair;
        ctx.beginPath();
        ctx.arc(cx, 14, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 3, 20, 6, 4);
        ctx.fillStyle = colors.capTop;
        ctx.beginPath();
        ctx.arc(cx, 8, 10, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 10, 8, 20, 6);
      }
    } else {
      // EAST/WEST walk — shift legs forward/back along x
      const flip = dir === 'E' ? 1 : -1;
      const ox = flip * 3;
      const legShift1 = frame === 1 ? 2 : -2;
      const legShift2 = frame === 1 ? -2 : 2;

      // Boot 1 (shifted)
      ctx.fillStyle = colors.boots;
      ctx.fillRect(cx + ox - 7 + legShift1, 50, 7, 8);
      ctx.fillRect(cx + ox + 1 + legShift2, 50, 7, 8);
      ctx.fillStyle = colors.bootSole;
      ctx.fillRect(cx + ox - 7 + legShift1, 56, 7, 2);
      ctx.fillRect(cx + ox + 1 + legShift2, 56, 7, 2);

      // Cargo pants (shifted)
      ctx.fillStyle = colors.pants;
      ctx.fillRect(cx + ox - 6 + legShift1, 38, 6, 14);
      ctx.fillRect(cx + ox + 1 + legShift2, 38, 6, 14);
      ctx.strokeStyle = colors.pantsShadow;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx + ox + (flip > 0 ? 2 : -5), 42, 3, 5);

      // Torso (same)
      ctx.fillStyle = colors.shirt;
      ctx.fillRect(cx + ox - 8, 22, 16, 18);
      ctx.fillStyle = colors.shirtShadow;
      ctx.fillRect(cx + ox + (flip > 0 ? 5 : -8), 22, 3, 18);
      ctx.strokeStyle = '#4a4a3a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + ox + flip * 2, 23);
      ctx.lineTo(cx + ox + flip * 2, 38);
      ctx.stroke();

      // Arm swinging
      const armSwingS = frame === 1 ? 2 : -2;
      ctx.fillStyle = colors.shirt;
      const armX = dir === 'E' ? cx + ox + 6 : cx + ox - 12;
      ctx.beginPath();
      ctx.arc(armX + 2, 25, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(armX, 25 + armSwingS, 5, 12);
      ctx.fillStyle = colors.skin;
      ctx.fillRect(armX, 36 + armSwingS, 5, 4);

      // Head (side profile — same as idle)
      const headGradSide = ctx.createRadialGradient(cx + ox - flip * 2, 12, 2, cx + ox, 14, 10);
      headGradSide.addColorStop(0, colors.skinLight);
      headGradSide.addColorStop(1, colors.skin);
      ctx.fillStyle = headGradSide;
      ctx.beginPath();
      ctx.arc(cx + ox, 14, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(40, 30, 20, 0.15)';
      ctx.beginPath();
      if (dir === 'E') {
        ctx.arc(cx + ox + 3, 17, 5, -0.5, Math.PI * 0.5);
      } else {
        ctx.arc(cx + ox - 3, 17, 5, Math.PI * 0.5, Math.PI + 0.5);
      }
      ctx.fill();

      ctx.fillStyle = colors.hair;
      if (dir === 'W') {
        ctx.beginPath();
        ctx.arc(cx + ox - 5, 9, 8, 0, Math.PI);
        ctx.fill();
        ctx.fillRect(cx + ox - 10, 9, 10, 6);
        ctx.fillRect(cx + ox + 2, 9, 5, 8);
      } else {
        ctx.beginPath();
        ctx.arc(cx + ox + 5, 9, 8, 0, Math.PI);
        ctx.fill();
        ctx.fillRect(cx + ox, 9, 10, 6);
        ctx.fillRect(cx + ox - 7, 9, 5, 8);
      }

      ctx.fillStyle = colors.capTop;
      ctx.beginPath();
      ctx.arc(cx + ox, 8, 10, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx + ox - 10, 8, 20, 5);
      ctx.fillStyle = colors.capVisor;
      if (dir === 'E') {
        ctx.fillRect(cx + ox + 5, 11, 8, 3);
      } else {
        ctx.fillRect(cx + ox - 13, 11, 8, 3);
      }

      ctx.fillStyle = '#1a1510';
      ctx.fillRect(cx + ox + flip * 4, 13, 2, 2);
    }

    // Pixel outline
    drawPixelOutline(ctx, w, h, '#141510');
  }

  // Generate idle frames (standing)
  for (const dir of dirs) {
    createTexture(scene, `player_${dir}`, w, h, (ctx) => {
      drawSurvivor(ctx, dir);
    });
  }

  // Generate walk frames (2 per direction for alternating step animation)
  for (const dir of dirs) {
    for (let frame = 1; frame <= 2; frame++) {
      createTexture(scene, `player_${dir}_walk_${frame}`, w, h, (ctx) => {
        drawSurvivorWalk(ctx, dir, frame);
      });
    }
  }

  // Default 'player' texture (copy of S)
  createTexture(scene, 'player', w, h, (ctx) => {
    drawSurvivor(ctx, 'S');
  });
}

// ============================================================================
// ANIMAL SPRITES GENERATION - 10 species with outlines
// ============================================================================

export function generateAnimalSprites(scene) {
  const rng = mulberry32(5555);

  // DEER - brown with white spots, antlers
  createTexture(scene, 'animal_deer', 28, 20, (ctx, w, h) => {
    ctx.fillStyle = '#8B6914';
    // Body
    ctx.beginPath();
    ctx.ellipse(14, 11, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(23, 8, 4, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Neck
    ctx.fillRect(18, 9, 5, 3);
    // Legs
    ctx.fillRect(10, 15, 1.5, 5);
    ctx.fillRect(17, 15, 1.5, 5);
    // Antlers
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 6);
    ctx.lineTo(24, 3);
    ctx.moveTo(24, 4);
    ctx.lineTo(26, 2);
    ctx.moveTo(24, 4);
    ctx.lineTo(22, 2);
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(24, 8, 1, 1);
    // White spots
    ctx.fillStyle = 'rgba(240, 230, 210, 0.6)';
    ctx.fillRect(10, 10, 1.5, 1.5);
    ctx.fillRect(14, 8, 1, 1);
    ctx.fillRect(16, 12, 1.5, 1.5);
    // Light underbelly
    ctx.fillStyle = 'rgba(200, 180, 140, 0.4)';
    ctx.beginPath();
    ctx.ellipse(14, 13, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fur texture
    const furRng = mulberry32(5501);
    for (let i = 0; i < 8; i++) {
      const fx = 8 + furRng() * 14;
      const fy = 8 + furRng() * 8;
      ctx.fillStyle = 'rgba(100, 80, 30, 0.3)';
      ctx.fillRect(fx, fy, 1, 1);
    }
    drawPixelOutline(ctx, w, h, '#1a1510');
  });

  // ELK - darker brown, large antlers
  createTexture(scene, 'animal_elk', 32, 24, (ctx, w, h) => {
    ctx.fillStyle = '#6B4914';
    // Body
    ctx.beginPath();
    ctx.ellipse(16, 13, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(26, 10, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Neck
    ctx.fillRect(20, 11, 6, 4);
    // Legs
    ctx.fillRect(11, 18, 2, 6);
    ctx.fillRect(19, 18, 2, 6);
    // Large antlers
    ctx.strokeStyle = '#6B4914';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(27, 7);
    ctx.lineTo(27, 2);
    ctx.moveTo(27, 4);
    ctx.lineTo(30, 1);
    ctx.moveTo(27, 4);
    ctx.lineTo(24, 1);
    ctx.moveTo(27, 3);
    ctx.lineTo(31, 3);
    ctx.moveTo(27, 5);
    ctx.lineTo(23, 3);
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(27, 10, 1.5, 1.5);
    // Fur texture
    const furRng = mulberry32(5502);
    for (let i = 0; i < 10; i++) {
      const fx = 8 + furRng() * 18;
      const fy = 8 + furRng() * 10;
      ctx.fillStyle = 'rgba(80, 60, 20, 0.3)';
      ctx.fillRect(fx, fy, 1, 1);
    }
    drawPixelOutline(ctx, w, h, '#1a1510');
  });

  // RABBIT - small brown/gray
  createTexture(scene, 'animal_rabbit', 14, 12, (ctx, w, h) => {
    ctx.fillStyle = '#AA9988';
    // Body
    ctx.beginPath();
    ctx.ellipse(7, 8, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(10, 5, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.fillRect(9, 1, 1.5, 4);
    ctx.fillRect(11, 1, 1.5, 4);
    // Eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(11, 5, 1, 1);
    // White tail
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Fur texture
    const furRng = mulberry32(5503);
    for (let i = 0; i < 5; i++) {
      const fx = 5 + furRng() * 6;
      const fy = 5 + furRng() * 5;
      ctx.fillStyle = 'rgba(150, 130, 110, 0.4)';
      ctx.fillRect(fx, fy, 0.8, 0.8);
    }
    drawPixelOutline(ctx, w, h, '#1a1510');
  });

  // SQUIRREL - orange-brown, bushy tail
  createTexture(scene, 'animal_squirrel', 12, 10, (ctx, w, h) => {
    ctx.fillStyle = '#886644';
    // Body
    ctx.beginPath();
    ctx.ellipse(6, 6, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(9, 4, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bushy tail
    ctx.fillStyle = '#996655';
    ctx.beginPath();
    ctx.ellipse(3, 4, 3, 4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Tail highlight
    ctx.fillStyle = 'rgba(180, 140, 100, 0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 1.5, 2, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(10, 4, 0.8, 0.8);
    drawPixelOutline(ctx, w, h, '#1a1510');
  });

  // WOLF - gray, sharp snout
  createTexture(scene, 'animal_wolf', 24, 16, (ctx, w, h) => {
    const wolfGrad = ctx.createLinearGradient(0, 0, 0, 16);
    wolfGrad.addColorStop(0, '#707070');
    wolfGrad.addColorStop(1, '#505050');
    ctx.fillStyle = wolfGrad;
    // Body
    ctx.beginPath();
    ctx.ellipse(12, 9, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(20, 7, 4, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Neck
    ctx.fillRect(16, 8, 4, 3);
    // Pointy ears
    ctx.beginPath();
    ctx.moveTo(19, 5);
    ctx.lineTo(18, 2);
    ctx.lineTo(20, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(21, 5);
    ctx.lineTo(20, 2);
    ctx.lineTo(22, 5);
    ctx.fill();
    // Legs
    ctx.fillRect(8, 12, 1.5, 4);
    ctx.fillRect(15, 12, 1.5, 4);
    // Bushy tail
    ctx.beginPath();
    ctx.ellipse(5, 9, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(21, 7, 1, 1);
    // Fur texture
    const furRng = mulberry32(5504);
    for (let i = 0; i < 8; i++) {
      const fx = 6 + furRng() * 12;
      const fy = 6 + furRng() * 6;
      ctx.fillStyle = 'rgba(90, 90, 90, 0.4)';
      ctx.fillRect(fx, fy, 1, 1);
    }
    drawPixelOutline(ctx, w, h, '#1a1510');
  });

  // BEAR - massive, dark brown/black
  createTexture(scene, 'animal_bear', 30, 24, (ctx, w, h) => {
    ctx.fillStyle = '#3B2508';
    // Bulky body
    ctx.beginPath();
    ctx.ellipse(15, 14, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(24, 10, 5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rounded ears
    ctx.beginPath();
    ctx.arc(22, 7, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(26, 7, 2, 0, Math.PI * 2);
    ctx.fill();
    // Snout
    ctx.fillStyle = '#4a3010';
    ctx.beginPath();
    ctx.ellipse(27, 11, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs (thick)
    ctx.fillStyle = '#3B2508';
    ctx.fillRect(10, 20, 3, 4);
    ctx.fillRect(18, 20, 3, 4);
    // Eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(25, 10, 1, 1);
    // Fur texture
    const furRng = mulberry32(5505);
    for (let i = 0; i < 12; i++) {
      const fx = 8 + furRng() * 16;
      const fy = 8 + furRng() * 12;
      ctx.fillStyle = 'rgba(30, 20, 5, 0.3)';
      ctx.fillRect(fx, fy, 1, 1);
    }
    drawPixelOutline(ctx, w, h, '#1a1510');
  });

  // COUGAR - tawny/tan, long body
  createTexture(scene, 'animal_cougar', 26, 16, (ctx, w, h) => {
    ctx.fillStyle = '#AA8844';
    // Body
    ctx.beginPath();
    ctx.ellipse(13, 8, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(22, 6, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(21, 4);
    ctx.lineTo(20, 2);
    ctx.lineTo(22, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(23, 4);
    ctx.lineTo(22, 2);
    ctx.lineTo(24, 4);
    ctx.fill();
    // Legs
    ctx.fillRect(10, 10, 1.5, 4);
    ctx.fillRect(16, 10, 1.5, 4);
    // Long tail
    ctx.strokeStyle = '#AA8844';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, 8);
    ctx.quadraticCurveTo(3, 10, 1, 8);
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#88ff44';
    ctx.fillRect(23, 6, 1, 1);
    // Fur texture
    const furRng = mulberry32(5506);
    for (let i = 0; i < 8; i++) {
      const fx = 6 + furRng() * 14;
      const fy = 5 + furRng() * 6;
      ctx.fillStyle = 'rgba(150, 120, 60, 0.3)';
      ctx.fillRect(fx, fy, 1, 1);
    }
    drawPixelOutline(ctx, w, h, '#1a1510');
  });

  // COYOTE - gray-tan, pointed ears
  createTexture(scene, 'animal_coyote', 20, 14, (ctx, w, h) => {
    ctx.fillStyle = '#887766';
    // Body
    ctx.beginPath();
    ctx.ellipse(10, 8, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(16, 6, 3.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pointed ears
    ctx.beginPath();
    ctx.moveTo(15, 4);
    ctx.lineTo(14, 2);
    ctx.lineTo(16, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(17, 4);
    ctx.lineTo(16, 2);
    ctx.lineTo(18, 4);
    ctx.fill();
    // Legs
    ctx.fillRect(7, 10, 1.5, 4);
    ctx.fillRect(12, 10, 1.5, 4);
    // Tail
    ctx.beginPath();
    ctx.ellipse(4, 8, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(17, 6, 1, 1);
    // Fur texture
    const furRng = mulberry32(5507);
    for (let i = 0; i < 6; i++) {
      const fx = 5 + furRng() * 10;
      const fy = 5 + furRng() * 5;
      ctx.fillStyle = 'rgba(100, 90, 80, 0.3)';
      ctx.fillRect(fx, fy, 1, 1);
    }
    drawPixelOutline(ctx, w, h, '#1a1510');
  });

  // FOX - orange-red, white-tipped tail
  createTexture(scene, 'animal_fox', 18, 14, (ctx, w, h) => {
    ctx.fillStyle = '#CC6622';
    // Body
    ctx.beginPath();
    ctx.ellipse(9, 8, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(14, 6, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pointed ears
    ctx.beginPath();
    ctx.moveTo(13, 4);
    ctx.lineTo(12, 2);
    ctx.lineTo(14, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(15, 4);
    ctx.lineTo(14, 2);
    ctx.lineTo(16, 4);
    ctx.fill();
    // Legs
    ctx.fillStyle = '#1a1510';
    ctx.fillRect(6, 10, 1.5, 4);
    ctx.fillRect(11, 10, 1.5, 4);
    // Bushy tail
    ctx.fillStyle = '#CC6622';
    ctx.beginPath();
    ctx.ellipse(4, 7, 4, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // White tail tip
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(2, 6, 2, 1.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // White chest/underbelly
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(10, 10, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(15, 5.5, 1, 1);
    drawPixelOutline(ctx, w, h, '#1a1510');
  });

  // MOOSE - dark brown, paddle antlers
  createTexture(scene, 'animal_moose', 34, 26, (ctx, w, h) => {
    ctx.fillStyle = '#3a2a1a';
    // Massive body
    ctx.beginPath();
    ctx.ellipse(17, 15, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(28, 11, 5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Neck
    ctx.fillRect(22, 12, 6, 5);
    // Snout/nose
    ctx.fillStyle = '#4a3a2a';
    ctx.beginPath();
    ctx.ellipse(31, 13, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Paddle antlers
    ctx.fillStyle = '#5a4a3a';
    // Left paddle
    ctx.beginPath();
    ctx.moveTo(26, 8);
    ctx.lineTo(22, 2);
    ctx.lineTo(18, 3);
    ctx.lineTo(20, 8);
    ctx.closePath();
    ctx.fill();
    // Right paddle
    ctx.beginPath();
    ctx.moveTo(30, 8);
    ctx.lineTo(32, 2);
    ctx.lineTo(28, 1);
    ctx.lineTo(28, 8);
    ctx.closePath();
    ctx.fill();
    // Antler points
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 4);
    ctx.lineTo(18, 1);
    ctx.moveTo(22, 3);
    ctx.lineTo(21, 0);
    ctx.moveTo(30, 3);
    ctx.lineTo(31, 0);
    ctx.stroke();
    // Legs
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(12, 22, 2.5, 4);
    ctx.fillRect(20, 22, 2.5, 4);
    // Eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(29, 10, 1.5, 1.5);
    // Fur texture
    const furRng = mulberry32(5508);
    for (let i = 0; i < 12; i++) {
      const fx = 8 + furRng() * 18;
      const fy = 10 + furRng() * 10;
      ctx.fillStyle = 'rgba(50, 40, 25, 0.3)';
      ctx.fillRect(fx, fy, 1, 1);
    }
    drawPixelOutline(ctx, w, h, '#1a1510');
  });
}

// ============================================================================
// UI TEXTURES GENERATION
// ============================================================================

export function generateUITextures(scene) {
  const noise = new SimplexNoise(9999);

  // Button normal
  createTexture(scene, 'ui_button', 120, 40, (ctx, w, h) => {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#3a3a32');
    grad.addColorStop(0.5, '#2a2a24');
    grad.addColorStop(1, '#1a1a16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Add subtle noise
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = noise.noise2D(x * 0.15, y * 0.15) * 5;
        data[idx] = Math.max(0, Math.min(255, data[idx] + n));
        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + n));
        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + n));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    // Inner highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(2, h - 2);
    ctx.lineTo(2, 2);
    ctx.lineTo(w - 2, 2);
    ctx.stroke();
  });

  // Button hover
  createTexture(scene, 'ui_button_hover', 120, 40, (ctx, w, h) => {
    // Lighter background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#4a4a40');
    grad.addColorStop(0.5, '#3a3a32');
    grad.addColorStop(1, '#2a2a24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Add subtle noise
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const n = noise.noise2D(x * 0.15, y * 0.15) * 5;
        data[idx] = Math.max(0, Math.min(255, data[idx] + n));
        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + n));
        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + n));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Gold-tinted border
    ctx.strokeStyle = 'rgba(200, 180, 100, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    // Inner highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(2, h - 2);
    ctx.lineTo(2, 2);
    ctx.lineTo(w - 2, 2);
    ctx.stroke();
  });

  // Slot normal
  createTexture(scene, 'ui_slot', 48, 48, (ctx, w, h) => {
    // Base dark fill
    ctx.fillStyle = 'rgba(20, 22, 20, 0.85)';
    ctx.fillRect(0, 0, w, h);

    // Inner shadow effect
    const shadowGrad = ctx.createLinearGradient(0, 0, 6, 6);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, 6, h);
    ctx.fillRect(0, 0, w, 6);

    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  });

  // Slot selected (gold highlight)
  createTexture(scene, 'ui_slot_selected', 48, 48, (ctx, w, h) => {
    // Lighter base
    ctx.fillStyle = 'rgba(35, 38, 30, 0.9)';
    ctx.fillRect(0, 0, w, h);

    // Gold glow effect
    const glowGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    glowGrad.addColorStop(0, 'rgba(200, 180, 100, 0.15)');
    glowGrad.addColorStop(1, 'rgba(200, 180, 100, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Gold border
    ctx.strokeStyle = 'rgba(255, 220, 120, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    // Inner highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  });
}
