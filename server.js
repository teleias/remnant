import express from 'express';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Gzip compression for WASM and JS (critical for 34MB WASM file)
app.use(compression());

app.use(express.json({ limit: '10mb' }));

// Required headers for SharedArrayBuffer (Godot threading)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Serve Godot HTML5 export from godot/dist/
app.use(express.static(path.join(__dirname, 'godot', 'dist'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    // WASM MIME type
    if (filePath.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
    // Godot PCK files
    if (filePath.endsWith('.pck')) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
  }
}));

// Save directory
const SAVE_DIR = path.join(__dirname, 'saves');
if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

// Save game state
app.post('/api/save', (req, res) => {
  try {
    const { slot = 'auto', data } = req.body;
    const safe = slot.replace(/[^a-zA-Z0-9_]/g, '');
    const filepath = path.join(SAVE_DIR, `save_${safe}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    res.json({ success: true, slot: safe });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Load game state
app.get('/api/load/:slot', (req, res) => {
  try {
    const safe = req.params.slot.replace(/[^a-zA-Z0-9_]/g, '');
    const filepath = path.join(SAVE_DIR, `save_${safe}.json`);
    if (fs.existsSync(filepath)) {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      res.json({ success: true, data });
    } else {
      res.json({ success: false, message: 'No save found' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// List saves
app.get('/api/saves', (req, res) => {
  try {
    const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.json'));
    const saves = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(SAVE_DIR, f), 'utf8'));
      return {
        slot: f.replace('save_', '').replace('.json', ''),
        day: data?.time?.day || 0,
        timestamp: data?.timestamp || null,
      };
    });
    res.json({ success: true, saves });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Fallback to Godot index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'godot', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`REMNANT server running on port ${PORT}`);
});
