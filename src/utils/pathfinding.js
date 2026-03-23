// A* pathfinding on tile grid for animal AI
// Optimized with binary heap priority queue

class MinHeap {
  constructor() { this.data = []; }
  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }
  get size() { return this.data.length; }
  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].f < this.data[parent].f) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }
  _sinkDown(i) {
    const len = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < len && this.data[l].f < this.data[smallest].f) smallest = l;
      if (r < len && this.data[r].f < this.data[smallest].f) smallest = r;
      if (smallest !== i) {
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      } else break;
    }
  }
}

// Check if a tile is walkable
// isWalkable(x, y) should be provided by the world/tilemap system
export function findPath(startX, startY, endX, endY, isWalkable, maxSteps = 200) {
  const key = (x, y) => `${x},${y}`;
  const open = new MinHeap();
  const closed = new Set();
  const cameFrom = new Map();
  const gScore = new Map();

  const startKey = key(startX, startY);
  gScore.set(startKey, 0);
  open.push({
    x: startX, y: startY,
    f: heuristic(startX, startY, endX, endY),
  });

  let steps = 0;
  while (open.size > 0 && steps < maxSteps) {
    steps++;
    const current = open.pop();
    const ck = key(current.x, current.y);

    if (current.x === endX && current.y === endY) {
      return reconstructPath(cameFrom, current.x, current.y);
    }

    closed.add(ck);

    // 8 directional neighbors
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
      { x: current.x + 1, y: current.y + 1 },
      { x: current.x - 1, y: current.y - 1 },
      { x: current.x + 1, y: current.y - 1 },
      { x: current.x - 1, y: current.y + 1 },
    ];

    for (const n of neighbors) {
      const nk = key(n.x, n.y);
      if (closed.has(nk)) continue;
      if (!isWalkable(n.x, n.y)) continue;

      // Diagonal movement costs more
      const isDiag = n.x !== current.x && n.y !== current.y;
      const moveCost = isDiag ? 1.414 : 1;
      const tentativeG = (gScore.get(ck) || 0) + moveCost;

      if (!gScore.has(nk) || tentativeG < gScore.get(nk)) {
        gScore.set(nk, tentativeG);
        cameFrom.set(nk, { x: current.x, y: current.y });
        open.push({
          x: n.x, y: n.y,
          f: tentativeG + heuristic(n.x, n.y, endX, endY),
        });
      }
    }
  }

  // No path found, return partial path toward goal
  return null;
}

function heuristic(ax, ay, bx, by) {
  // Octile distance (8 directional heuristic)
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
}

function reconstructPath(cameFrom, endX, endY) {
  const path = [{ x: endX, y: endY }];
  let current = `${endX},${endY}`;
  while (cameFrom.has(current)) {
    const prev = cameFrom.get(current);
    path.unshift(prev);
    current = `${prev.x},${prev.y}`;
  }
  return path;
}

// Get a direct line path (no obstacle avoidance, for short distances)
export function directPath(startX, startY, endX, endY) {
  const path = [];
  const dx = endX - startX;
  const dy = endY - startY;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return [{ x: startX, y: startY }];
  for (let i = 0; i <= steps; i++) {
    path.push({
      x: Math.round(startX + (dx / steps) * i),
      y: Math.round(startY + (dy / steps) * i),
    });
  }
  return path;
}

// Get distance between two tile positions
export function tileDistance(ax, ay, bx, by) {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
}
