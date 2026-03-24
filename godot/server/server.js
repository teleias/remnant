const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory save data storage
let saveData = {};

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// SharedArrayBuffer headers (required for multithreading if enabled)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

// Custom MIME types for Godot files
express.static.mime.define({
  'application/wasm': ['wasm'],
  'application/octet-stream': ['pck']
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Save game API endpoint
app.post('/api/save', (req, res) => {
  try {
    const { slot, data } = req.body;

    if (!slot) {
      return res.status(400).json({ error: 'Save slot is required' });
    }

    saveData[slot] = {
      data: data,
      timestamp: new Date().toISOString()
    };

    console.log(`Save data stored for slot: ${slot}`);
    res.status(200).json({ success: true, slot: slot });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Load game API endpoint
app.get('/api/load', (req, res) => {
  try {
    const slot = req.query.slot;

    if (!slot) {
      return res.status(400).json({ error: 'Save slot is required' });
    }

    const savedGame = saveData[slot];

    if (!savedGame) {
      return res.status(404).json({ error: 'Save data not found' });
    }

    console.log(`Save data loaded for slot: ${slot}`);
    res.status(200).json(savedGame);
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// List all saves API endpoint
app.get('/api/saves', (req, res) => {
  try {
    const saves = Object.keys(saveData).map(slot => ({
      slot: slot,
      timestamp: saveData[slot].timestamp
    }));

    res.status(200).json({ saves: saves });
  } catch (error) {
    console.error('List saves error:', error);
    res.status(500).json({ error: 'Failed to list saves' });
  }
});

// Serve static files from dist directory
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    } else if (filePath.endsWith('.pck')) {
      res.setHeader('Content-Type', 'application/octet-stream');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Fallback: serve index.html for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`REMNANT Godot server running on port ${PORT}`);
  console.log(`Serving files from: ${distPath}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});
