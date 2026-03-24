// Common math utilities for REMNANT

import { TILE } from '../config/constants.js';

// Convert grid coordinates to isometric screen coordinates
export function gridToScreen(gridX, gridY) {
  return {
    x: (gridX - gridY) * TILE.HALF_W,
    y: (gridX + gridY) * TILE.HALF_H,
  };
}

// Convert screen coordinates to grid coordinates
export function screenToGrid(screenX, screenY) {
  return {
    x: Math.floor((screenX / TILE.HALF_W + screenY / TILE.HALF_H) / 2),
    y: Math.floor((screenY / TILE.HALF_H - screenX / TILE.HALF_W) / 2),
  };
}

// Get isometric depth value for sorting (higher Y = rendered later)
// In isometric view, tiles further south (higher gridX+gridY) render on top.
// Elevation adds a small bump so higher tiles sort above same-row lower tiles.
// Values scaled to stay within 0-99 range (DEPTH layer gaps are 100).
export function isoDepth(gridX, gridY, elevation = 0) {
  // Max gridX+gridY for 256x256 map = 510; scale to ~0-90 range
  return (gridX + gridY) * 0.18 + elevation * 0.05;
}

// Clamp value between min and max
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Linear interpolation
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Random integer between min and max (inclusive)
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random float between min and max
export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Seeded random using mulberry32
export function seededRandom(seed) {
  let s = seed | 0;
  return function() {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Distance between two points
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Manhattan distance on grid
export function manhattanDist(x1, y1, x2, y2) {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

// Angle between two points (radians)
export function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Direction string from angle
export function angleToDirection(angle) {
  // Normalize to 0..2PI
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const eighth = Math.PI / 4;
  if (a < eighth * 0.5 || a >= eighth * 7.5) return 'E';
  if (a < eighth * 1.5) return 'SE';
  if (a < eighth * 2.5) return 'S';
  if (a < eighth * 3.5) return 'SW';
  if (a < eighth * 4.5) return 'W';
  if (a < eighth * 5.5) return 'NW';
  if (a < eighth * 6.5) return 'N';
  return 'NE';
}

// Weighted random selection from array of { item, weight }
export function weightedRandom(items, rng = Math.random) {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let roll = rng() * total;
  for (const entry of items) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return items[items.length - 1].item;
}

// Shuffle array in place (Fisher-Yates)
export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Format game time (hour float to HH:MM string)
export function formatTime(hour) {
  const h = Math.floor(hour);
  const m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Format weight (grams to readable string)
export function formatWeight(grams) {
  if (grams >= 1000) return (grams / 1000).toFixed(1) + ' kg';
  return grams + ' g';
}
