// CraftingUI — Crafting panel with category tabs, recipe list,
// ingredient status, and craft button. Dark panel PZ aesthetic.

import Phaser from 'phaser';
import ITEMS from '../config/items.js';

const PANEL_BG = 0x0a0c0a;
const PANEL_ALPHA = 0.92;
const BORDER_COLOR = 0x3a3f3a;

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'tools', label: 'Tools' },
  { key: 'food', label: 'Food' },
  { key: 'building', label: 'Building' },
  { key: 'medical', label: 'Medical' },
  { key: 'clothing', label: 'Clothing' },
];

// Map recipe output categories
function getRecipeCategory(recipe) {
  const outputDef = ITEMS[recipe.output];
  if (!outputDef) return 'misc';

  if (recipe.station === 'campfire') return 'food';
  if (recipe.placeable) return 'building';

  const cat = outputDef.category;
  if (cat === 'tool' || cat === 'weapon') return 'tools';
  if (cat === 'food' || cat === 'water') return 'food';
  if (cat === 'medical') return 'medical';
  if (cat === 'clothing') return 'clothing';
  if (cat === 'material') return 'building';
  return 'tools';
}

export default class CraftingUI {
  constructor(scene, gameState, gameEvents, craftingSystem) {
    this.scene = scene;
    this.gs = gameState;
    this.gameEvents = gameEvents;
    this.crafting = craftingSystem;

    this.visible = false;
    this.container = null;
    this.recipeContainer = null;
    this.selectedCategory = 'all';
    this.selectedRecipe = null;
    this.recipeElements = [];

    this.detailContainer = null;
    this.craftButton = null;
    this.progressBar = null;
  }

  create() {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    this.container = this.scene.add.container(0, 0).setDepth(200).setVisible(false);

    // Dark overlay
    const overlay = this.scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6);
    this.container.add(overlay);

    // Main panel
    const panelW = 520;
    const panelH = 400;
    const px = w / 2 - panelW / 2;
    const py = h / 2 - panelH / 2;

    const panel = this.scene.add.rectangle(w / 2, h / 2, panelW, panelH, PANEL_BG, PANEL_ALPHA);
    panel.setStrokeStyle(1, BORDER_COLOR);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(w / 2, py + 16, 'CRAFTING', {
      fontFamily: 'Oswald, sans-serif', fontSize: '18px', color: '#c8c8c0',
      letterSpacing: 3,
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Category tabs
    let tabX = px + 20;
    const tabY = py + 46;

    for (const cat of CATEGORIES) {
      const isActive = cat.key === this.selectedCategory;
      const tab = this.scene.add.text(tabX, tabY, cat.label, {
        fontFamily: 'Inter, sans-serif', fontSize: '11px',
        color: isActive ? '#d4c8a0' : '#666',
        backgroundColor: isActive ? '#1a1c1a' : undefined,
        padding: { x: 8, y: 4 },
      }).setInteractive();

      tab.on('pointerdown', () => {
        this.selectedCategory = cat.key;
        this.refreshRecipes();
      });
      tab.on('pointerover', () => tab.setColor('#c8c8c0'));
      tab.on('pointerout', () => tab.setColor(cat.key === this.selectedCategory ? '#d4c8a0' : '#666'));

      this.container.add(tab);
      tabX += tab.width + 6;
    }

    // Recipe list area (left)
    this.recipeContainer = this.scene.add.container(0, 0);
    this.container.add(this.recipeContainer);

    // Detail panel (right)
    this.detailContainer = this.scene.add.container(0, 0);
    this.container.add(this.detailContainer);

    // Craft button
    const btnX = px + panelW - 100;
    const btnY = py + panelH - 40;
    this.craftButton = this.scene.add.text(btnX, btnY, 'CRAFT', {
      fontFamily: 'Oswald, sans-serif', fontSize: '14px', color: '#d4c8a0',
      backgroundColor: '#1a2a1a',
      padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setInteractive();

    this.craftButton.on('pointerdown', () => this.startCraft());
    this.craftButton.on('pointerover', () => this.craftButton.setColor('#fff'));
    this.craftButton.on('pointerout', () => this.craftButton.setColor('#d4c8a0'));
    this.container.add(this.craftButton);

    // Progress bar
    const barX = px + 20;
    const barY = py + panelH - 40;
    this.progressBg = this.scene.add.rectangle(barX + 80, barY, 160, 12, 0x1a1c1a);
    this.progressBg.setStrokeStyle(1, 0x2a2f2a);
    this.container.add(this.progressBg);

    this.progressFill = this.scene.add.rectangle(barX + 2, barY, 0, 10, 0x4a8a4a);
    this.progressFill.setOrigin(0, 0.5);
    this.container.add(this.progressFill);

    // Listen for crafting progress
    this.gameEvents.on('crafting:progress', (data) => {
      if (this.visible) {
        this.progressFill.width = 156 * data.progress;
      }
    });

    this.gameEvents.on('crafting:complete', () => {
      this.progressFill.width = 0;
      if (this.visible) this.refreshRecipes();
    });
  }

  toggle() {
    this.visible = !this.visible;
    this.container.setVisible(this.visible);
    if (this.visible) {
      this.refreshRecipes();
    }
    this.gameEvents.emit(this.visible ? 'ui:panelOpen' : 'ui:panelClosed', { panel: 'crafting' });
  }

  refreshRecipes() {
    this.recipeContainer.removeAll(true);
    this.recipeElements = [];

    if (!this.crafting) return;

    const recipes = this.crafting.getAvailableRecipes();
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const panelW = 520;
    const px = w / 2 - panelW / 2;
    const py = h / 2 - 200;

    let listY = py + 72;
    const listX = px + 20;

    const filtered = this.selectedCategory === 'all'
      ? recipes
      : recipes.filter(r => getRecipeCategory(r) === this.selectedCategory);

    for (const recipe of filtered) {
      if (listY > py + 330) break; // Clip to panel

      const color = recipe.craftable ? '#c8c8c0' : '#555';
      const nameText = this.scene.add.text(listX, listY, recipe.name, {
        fontFamily: 'Inter, sans-serif', fontSize: '12px', color,
      }).setInteractive();

      // Input summary
      const inputParts = [];
      for (const [itemId, status] of Object.entries(recipe.inputStatus)) {
        const c = status.have >= status.need ? '#4a8a4a' : '#8a4a4a';
        inputParts.push(`${status.name}: ${status.have}/${status.need}`);
      }
      const inputStr = inputParts.join('  ');
      const inputText = this.scene.add.text(listX + 200, listY + 2, inputStr, {
        fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#777',
      });

      nameText.on('pointerdown', () => {
        this.selectedRecipe = recipe;
        this.showRecipeDetail(recipe);
      });
      nameText.on('pointerover', () => nameText.setColor('#fff'));
      nameText.on('pointerout', () => nameText.setColor(color));

      this.recipeContainer.add(nameText);
      this.recipeContainer.add(inputText);
      this.recipeElements.push({ nameText, inputText, recipe });

      listY += 22;
    }
  }

  showRecipeDetail(recipe) {
    this.detailContainer.removeAll(true);

    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;
    const panelW = 520;
    const px = w / 2 + panelW / 2 - 160;
    const py = h / 2 - 200 + 72;

    // Recipe name
    const name = this.scene.add.text(px, py, recipe.name, {
      fontFamily: 'Oswald, sans-serif', fontSize: '14px', color: '#d4c8a0',
    });
    this.detailContainer.add(name);

    // Output
    const outputDef = ITEMS[recipe.output];
    const outputStr = `${outputDef?.icon || '?'} ${outputDef?.name || recipe.output} x${recipe.qty}`;
    const output = this.scene.add.text(px, py + 22, outputStr, {
      fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#aaa',
    });
    this.detailContainer.add(output);

    // Time
    const timeStr = `Time: ${recipe.time}s`;
    const time = this.scene.add.text(px, py + 40, timeStr, {
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#666',
    });
    this.detailContainer.add(time);

    // Reason if not craftable
    if (!recipe.craftable && recipe.reason) {
      const reason = this.scene.add.text(px, py + 58, recipe.reason, {
        fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#8a4a4a',
      });
      this.detailContainer.add(reason);
    }

    // Update craft button
    this.craftButton.setColor(recipe.craftable ? '#d4c8a0' : '#444');
  }

  startCraft() {
    if (!this.selectedRecipe || !this.selectedRecipe.craftable) return;
    if (this.crafting.crafting) return;

    this.crafting.startCraft(this.selectedRecipe.id);
  }

  destroy() {
    if (this.container) this.container.destroy();
  }
}
