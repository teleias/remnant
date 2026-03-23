// Save/load system
// Tries server first, falls back to localStorage

const SAVE_ENDPOINT = '/api/save';
const LOAD_ENDPOINT = '/api/load';

export async function saveGame(gameState, slot = 'auto') {
  const data = {
    ...gameState,
    timestamp: Date.now(),
  };

  // Try server
  try {
    const res = await fetch(SAVE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, data }),
    });
    if (res.ok) return { success: true, location: 'server' };
  } catch (e) {
    // Server unavailable
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(`remnant_save_${slot}`, JSON.stringify(data));
    return { success: true, location: 'local' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function loadGame(slot = 'auto') {
  // Try server
  try {
    const res = await fetch(`${LOAD_ENDPOINT}/${slot}`);
    const json = await res.json();
    if (json.success) return { success: true, data: json.data, location: 'server' };
  } catch (e) {
    // Server unavailable
  }

  // Fallback to localStorage
  try {
    const saved = localStorage.getItem(`remnant_save_${slot}`);
    if (saved) return { success: true, data: JSON.parse(saved), location: 'local' };
  } catch (e) {
    // No local save
  }

  return { success: false };
}

export async function listSaves() {
  try {
    const res = await fetch('/api/saves');
    const json = await res.json();
    if (json.success) return json.saves;
  } catch (e) {
    // Server unavailable
  }

  // Check localStorage
  const saves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('remnant_save_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        saves.push({
          slot: key.replace('remnant_save_', ''),
          day: data?.time?.day || 0,
          timestamp: data?.timestamp || null,
        });
      } catch (e) { /* skip corrupt saves */ }
    }
  }
  return saves;
}
