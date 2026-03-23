import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Serve built game from dist/
app.use(express.static(path.join(__dirname, 'dist')));

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

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`REMNANT server running on port ${PORT}`);
});
