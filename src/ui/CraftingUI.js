import Phaser from 'phaser';
import ITEMS from '../config/items.js';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'tools', label: 'Tools' },
  { key: 'food', label: 'Food' },
  { key: 'building', label: 'Building' },
  { key: 'medical', label: 'Medical' },
  { key: 'clothing', label: 'Clothing' },
];

export default class CraftingUI {
  constructor(scene, gameState, gameEvents, craftingSystem) {
    this.scene = scene;
    this.gameState = gameState;
    this.gameEvents = gameEvents;
    this.craftingSystem = craftingSystem;

    this.container = null;
    this.isVisible = false;
    this.selectedRecipe = null;
    this.currentCategory = 'all';
    this.scrollY = 0;
    this.maxScroll = 0;
    this.recipeElements = [];
    this.tabButtons = [];
    this.craftProgress = 0;
    this.progressBar = null;
  }

  create() {
    const { width, height } = this.scene.cameras.main;

    // Dark overlay
    this.overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.65)
      .setOrigin(0, 0)
      .setInteractive()
      .setVisible(false)
      .setDepth(900);

    // Main container
    this.container = this.scene.add.container(0, 0).setDepth(901).setVisible(false);

    // Main panel background
    const panelW = 580;
    const panelH = 440;
    const panelX = width / 2;
    const panelY = height / 2;

    this.panelBg = this.scene.add.rectangle(panelX, panelY, panelW, panelH, 0x0a0c0a, 0.94)
      .setStrokeStyle(1, 0x2a3a2a, 0.8);
    this.container.add(this.panelBg);

    // Title
    this.title = this.scene.add.text(panelX, panelY - panelH / 2 + 20, 'CRAFTING', {
      fontFamily: 'Oswald',
      fontSize: '18px',
      color: '#d4c8a0',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.container.add(this.title);

    // Close button
    const closeX = panelX + panelW / 2 - 20;
    const closeY = panelY - panelH / 2 + 20;
    this.closeBtn = this.scene.add.text(closeX, closeY, 'X', {
      fontFamily: 'Oswald',
      fontSize: '16px',
      color: '#999'
    }).setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.closeBtn.setColor('#fff'))
      .on('pointerout', () => this.closeBtn.setColor('#999'))
      .on('pointerdown', () => this.toggle());
    this.container.add(this.closeBtn);

    // Category tabs
    this.createCategoryTabs(panelX, panelY - panelH / 2 + 50, panelW);

    // Recipe list area (left side)
    this.recipeListX = panelX - panelW / 2 + 20;
    this.recipeListY = panelY - panelH / 2 + 90;
    this.recipeListW = panelW * 0.55 - 30;
    this.recipeListH = panelH - 160;

    // Create scroll mask for recipe list
    this.createRecipeListMask();

    // Recipe detail panel (right side)
    this.detailPanelX = panelX + panelW / 2 - (panelW * 0.45) / 2 - 10;
    this.detailPanelY = this.recipeListY;
    this.detailPanelW = panelW * 0.45 - 20;
    this.detailPanelH = this.recipeListH;

    this.detailContainer = this.scene.add.container(0, 0);
    this.container.add(this.detailContainer);

    // Craft button
    this.createCraftButton(panelX, panelY + panelH / 2 - 30);

    // Recipe count text
    this.recipeCountText = this.scene.add.text(
      panelX - panelW / 2 + 20,
      panelY + panelH / 2 - 20,
      '',
      {
        fontFamily: 'Courier',
        fontSize: '11px',
        color: '#666'
      }
    ).setOrigin(0, 0.5);
    this.container.add(this.recipeCountText);

    // Event listeners
    this.gameEvents.on('crafting:progress', this.onCraftingProgress, this);
    this.gameEvents.on('crafting:complete', this.onCraftingComplete, this);

    this.refreshRecipeList();
  }

  createCategoryTabs(centerX, y, panelW) {
    const tabWidth = 80;
    const tabHeight = 24;
    const spacing = 4;
    const totalWidth = (tabWidth + spacing) * CATEGORIES.length - spacing;
    let startX = centerX - totalWidth / 2;

    CATEGORIES.forEach((cat, i) => {
      const tabX = startX + i * (tabWidth + spacing);

      const bg = this.scene.add.rectangle(tabX, y, tabWidth, tabHeight, 0x1a1c1a, 0.8)
        .setOrigin(0, 0);

      const text = this.scene.add.text(tabX + tabWidth / 2, y + tabHeight / 2, cat.label, {
        fontFamily: 'Oswald',
        fontSize: '12px',
        color: '#666'
      }).setOrigin(0.5, 0.5);

      const indicator = this.scene.add.rectangle(tabX, y + tabHeight - 2, tabWidth, 2, 0xd4c8a0, 0)
        .setOrigin(0, 0);

      const button = this.scene.add.rectangle(tabX, y, tabWidth, tabHeight, 0x000000, 0.01)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setCategory(cat.key));

      this.container.add([bg, text, indicator, button]);
      this.tabButtons.push({ key: cat.key, bg, text, indicator, button });
    });

    this.updateTabVisuals();
  }

  updateTabVisuals() {
    this.tabButtons.forEach(tab => {
      const isActive = tab.key === this.currentCategory;
      tab.bg.setFillStyle(isActive ? 0x2a3a2a : 0x1a1c1a, 0.8);
      tab.text.setColor(isActive ? '#d4c8a0' : '#666');
      tab.indicator.setAlpha(isActive ? 1 : 0);
    });
  }

  createRecipeListMask() {
    // Create mask graphics
    this.recipeMask = this.scene.add.graphics();
    this.recipeMask.fillStyle(0xffffff);
    this.recipeMask.fillRect(
      this.recipeListX,
      this.recipeListY,
      this.recipeListW,
      this.recipeListH
    );

    // Recipe list container
    this.recipeListContainer = this.scene.add.container(0, 0);
    this.container.add(this.recipeListContainer);

    // Apply mask
    const mask = this.recipeMask.createGeometryMask();
    this.recipeListContainer.setMask(mask);

    // Mouse wheel scrolling
    this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.isVisible) return;

      const bounds = new Phaser.Geom.Rectangle(
        this.recipeListX,
        this.recipeListY,
        this.recipeListW,
        this.recipeListH
      );

      if (bounds.contains(pointer.x, pointer.y)) {
        this.scrollY = Phaser.Math.Clamp(
          this.scrollY + deltaY * 0.3,
          0,
          this.maxScroll
        );
        this.updateRecipeListScroll();
      }
    });
  }

  updateRecipeListScroll() {
    this.recipeListContainer.y = -this.scrollY;
  }

  setCategory(key) {
    this.currentCategory = key;
    this.updateTabVisuals();
    this.scrollY = 0;
    this.selectedRecipe = null;
    this.refreshRecipeList();
  }

  refreshRecipeList() {
    // Clear existing recipe elements
    this.recipeElements.forEach(elem => {
      elem.bg?.destroy();
      elem.text?.destroy();
      elem.icon?.destroy();
      elem.ingredients?.destroy();
      elem.button?.destroy();
      elem.separator?.destroy();
    });
    this.recipeElements = [];

    // Get all available recipes
    const allRecipes = this.craftingSystem.getAvailableRecipes();

    // Filter by category
    const recipes = this.currentCategory === 'all'
      ? allRecipes
      : allRecipes.filter(r => this.getRecipeCategory(r) === this.currentCategory);

    const rowHeight = 46;
    const padding = 8;
    let yOffset = this.recipeListY;

    recipes.forEach((recipe, i) => {
      const y = yOffset + i * rowHeight;

      // Background
      const bg = this.scene.add.rectangle(
        this.recipeListX,
        y,
        this.recipeListW,
        rowHeight - 2,
        0x1a1c1a,
        0.4
      ).setOrigin(0, 0);

      // Output icon
      const outputItem = ITEMS[recipe.output];
      const icon = this.scene.add.text(
        this.recipeListX + padding,
        y + padding,
        outputItem?.icon || '?',
        { fontSize: '16px' }
      ).setOrigin(0, 0);

      // Recipe name
      const nameColor = recipe.craftable ? '#d4c8a0' : '#666';
      const text = this.scene.add.text(
        this.recipeListX + padding + 24,
        y + padding,
        recipe.name,
        {
          fontFamily: 'Oswald',
          fontSize: '13px',
          color: nameColor
        }
      ).setOrigin(0, 0);

      // Ingredient summary
      const ingredientSummary = this.buildIngredientSummary(recipe);
      const ingredients = this.scene.add.text(
        this.recipeListX + padding + 24,
        y + padding + 18,
        ingredientSummary.text,
        {
          fontFamily: 'Courier',
          fontSize: '10px',
          color: '#888'
        }
      ).setOrigin(0, 0);

      // Color code individual ingredients
      if (ingredientSummary.colors.length > 0) {
        const style = ingredients.style;
        ingredientSummary.colors.forEach(({ start, end, color }) => {
          style.setColor(color, start, end);
        });
      }

      // Separator line
      const separator = this.scene.add.rectangle(
        this.recipeListX,
        y + rowHeight - 2,
        this.recipeListW,
        1,
        0x2a3a2a,
        0.5
      ).setOrigin(0, 0);

      // Interactive button
      const button = this.scene.add.rectangle(
        this.recipeListX,
        y,
        this.recipeListW,
        rowHeight - 2,
        0xffffff,
        0.001
      ).setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x2a3a2a, 0.6))
        .on('pointerout', () => {
          if (this.selectedRecipe !== recipe) {
            bg.setFillStyle(0x1a1c1a, 0.4);
          }
        })
        .on('pointerdown', () => this.selectRecipe(recipe, bg));

      this.recipeListContainer.add([bg, icon, text, ingredients, separator, button]);
      this.recipeElements.push({ recipe, bg, text, icon, ingredients, button, separator });
    });

    // Calculate max scroll
    const contentHeight = recipes.length * rowHeight;
    this.maxScroll = Math.max(0, contentHeight - this.recipeListH);

    // Update recipe count
    const craftableCount = recipes.filter(r => r.craftable).length;
    this.recipeCountText.setText(`${craftableCount} / ${recipes.length} recipes available`);

    // Update detail panel
    if (this.selectedRecipe) {
      const stillExists = recipes.find(r => r.id === this.selectedRecipe.id);
      if (stillExists) {
        this.selectRecipe(stillExists);
      } else {
        this.selectedRecipe = null;
        this.updateDetailPanel();
      }
    } else {
      this.updateDetailPanel();
    }
  }

  buildIngredientSummary(recipe) {
    const parts = [];
    const colors = [];
    let currentPos = 0;

    recipe.inputs.forEach((input, i) => {
      const status = recipe.inputStatus[input.itemId];
      const item = ITEMS[input.itemId];
      const have = status?.have || 0;
      const need = input.quantity;
      const hasEnough = have >= need;

      const text = `${item?.icon || '?'} ${have}/${need}`;
      const color = hasEnough ? '#4a8a4a' : '#8a4a4a';

      colors.push({
        start: currentPos,
        end: currentPos + text.length,
        color
      });

      parts.push(text);
      currentPos += text.length;

      if (i < recipe.inputs.length - 1) {
        parts.push('  ');
        currentPos += 2;
      }
    });

    return { text: parts.join(''), colors };
  }

  selectRecipe(recipe, bg = null) {
    this.selectedRecipe = recipe;

    // Update background highlights
    this.recipeElements.forEach(elem => {
      if (elem.recipe === recipe) {
        elem.bg.setFillStyle(0x2a3a2a, 0.6);
      } else {
        elem.bg.setFillStyle(0x1a1c1a, 0.4);
      }
    });

    this.updateDetailPanel();
  }

  updateDetailPanel() {
    this.detailContainer.removeAll(true);

    if (!this.selectedRecipe) {
      const noSelection = this.scene.add.text(
        this.detailPanelX,
        this.detailPanelY + this.detailPanelH / 2,
        'Select a recipe',
        {
          fontFamily: 'Oswald',
          fontSize: '12px',
          color: '#555'
        }
      ).setOrigin(0.5, 0.5);
      this.detailContainer.add(noSelection);
      this.updateCraftButton();
      return;
    }

    const recipe = this.selectedRecipe;
    const outputItem = ITEMS[recipe.output];
    let y = this.detailPanelY + 10;

    // Recipe name
    const name = this.scene.add.text(
      this.detailPanelX,
      y,
      recipe.name,
      {
        fontFamily: 'Oswald',
        fontSize: '14px',
        color: '#d4c8a0',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5, 0);
    this.detailContainer.add(name);
    y += 28;

    // Output
    const outputText = this.scene.add.text(
      this.detailPanelX,
      y,
      `${outputItem?.icon || '?'} ${outputItem?.name || 'Unknown'} x${recipe.qty || 1}`,
      {
        fontFamily: 'Courier',
        fontSize: '12px',
        color: '#aaa'
      }
    ).setOrigin(0.5, 0);
    this.detailContainer.add(outputText);
    y += 26;

    // Separator
    const sep1 = this.scene.add.rectangle(
      this.detailPanelX,
      y,
      this.detailPanelW - 20,
      1,
      0x2a3a2a,
      0.6
    ).setOrigin(0.5, 0);
    this.detailContainer.add(sep1);
    y += 12;

    // Inputs header
    const inputsHeader = this.scene.add.text(
      this.detailPanelX,
      y,
      'REQUIRES:',
      {
        fontFamily: 'Oswald',
        fontSize: '11px',
        color: '#888'
      }
    ).setOrigin(0.5, 0);
    this.detailContainer.add(inputsHeader);
    y += 18;

    // Input items
    recipe.inputs.forEach(input => {
      const status = recipe.inputStatus[input.itemId];
      const item = ITEMS[input.itemId];
      const have = status?.have || 0;
      const need = input.quantity;
      const hasEnough = have >= need;
      const color = hasEnough ? '#4a8a4a' : '#8a4a4a';

      const inputLine = this.scene.add.text(
        this.detailPanelX,
        y,
        `${item?.icon || '?'} ${item?.name || 'Unknown'} (${have}/${need})`,
        {
          fontFamily: 'Courier',
          fontSize: '11px',
          color
        }
      ).setOrigin(0.5, 0);
      this.detailContainer.add(inputLine);
      y += 18;
    });

    y += 8;

    // Station requirement
    if (recipe.station) {
      const stationText = this.scene.add.text(
        this.detailPanelX,
        y,
        `Requires: ${recipe.station}`,
        {
          fontFamily: 'Courier',
          fontSize: '11px',
          color: '#888',
          fontStyle: 'italic'
        }
      ).setOrigin(0.5, 0);
      this.detailContainer.add(stationText);
      y += 18;
    }

    // Skill requirement
    if (recipe.skill && recipe.skillLevel > 0) {
      const skillText = this.scene.add.text(
        this.detailPanelX,
        y,
        `Skill: ${recipe.skill} Lv.${recipe.skillLevel}`,
        {
          fontFamily: 'Courier',
          fontSize: '11px',
          color: '#888',
          fontStyle: 'italic'
        }
      ).setOrigin(0.5, 0);
      this.detailContainer.add(skillText);
      y += 18;
    }

    // Crafting time
    if (recipe.time) {
      const timeText = this.scene.add.text(
        this.detailPanelX,
        y,
        `Time: ${recipe.time}s`,
        {
          fontFamily: 'Courier',
          fontSize: '11px',
          color: '#888'
        }
      ).setOrigin(0.5, 0);
      this.detailContainer.add(timeText);
      y += 18;
    }

    // Reason if not craftable
    if (!recipe.craftable && recipe.reason) {
      y += 8;
      const reasonText = this.scene.add.text(
        this.detailPanelX,
        y,
        recipe.reason,
        {
          fontFamily: 'Courier',
          fontSize: '10px',
          color: '#8a4a4a',
          wordWrap: { width: this.detailPanelW - 20 },
          align: 'center'
        }
      ).setOrigin(0.5, 0);
      this.detailContainer.add(reasonText);
      y += reasonText.height + 12;
    }

    // Progress bar (if crafting this recipe)
    if (this.craftingSystem.crafting && this.selectedRecipe) {
      y += 12;
      const progressBg = this.scene.add.rectangle(
        this.detailPanelX,
        y,
        180,
        10,
        0x1a1c1a,
        0.8
      ).setOrigin(0.5, 0);
      this.detailContainer.add(progressBg);

      const progressFill = this.scene.add.rectangle(
        this.detailPanelX - 90,
        y,
        180 * this.craftProgress,
        10,
        0x4a8a4a,
        1
      ).setOrigin(0, 0);
      this.detailContainer.add(progressFill);
      this.progressBar = progressFill;

      y += 16;
      const progressLabel = this.scene.add.text(
        this.detailPanelX,
        y,
        'Crafting...',
        {
          fontFamily: 'Courier',
          fontSize: '10px',
          color: '#888'
        }
      ).setOrigin(0.5, 0);
      this.detailContainer.add(progressLabel);
    }

    this.updateCraftButton();
  }

  createCraftButton(x, y) {
    const btnW = 100;
    const btnH = 26;

    this.craftBtnBg = this.scene.add.rectangle(x + 140, y, btnW, btnH, 0x3a5a3a, 0.8)
      .setOrigin(0.5, 0.5);
    this.container.add(this.craftBtnBg);

    this.craftBtnText = this.scene.add.text(x + 140, y, 'CRAFT', {
      fontFamily: 'Oswald',
      fontSize: '13px',
      color: '#d4c8a0',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);
    this.container.add(this.craftBtnText);

    this.craftBtn = this.scene.add.rectangle(x + 140, y, btnW, btnH, 0xffffff, 0.001)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        if (this.canCraft()) {
          this.craftBtnBg.setFillStyle(0x4a7a4a, 1);
        }
      })
      .on('pointerout', () => {
        this.updateCraftButton();
      })
      .on('pointerdown', () => {
        if (this.canCraft()) {
          this.craftingSystem.startCraft(this.selectedRecipe.id);
        }
      });
    this.container.add(this.craftBtn);
  }

  canCraft() {
    return this.selectedRecipe &&
           this.selectedRecipe.craftable &&
           !this.craftingSystem.crafting;
  }

  updateCraftButton() {
    if (!this.craftBtnBg) return;

    if (this.canCraft()) {
      this.craftBtnBg.setFillStyle(0x3a5a3a, 0.8);
      this.craftBtnText.setColor('#d4c8a0');
      this.craftBtn.input.cursor = 'pointer';
    } else {
      this.craftBtnBg.setFillStyle(0x2a2a2a, 0.6);
      this.craftBtnText.setColor('#555');
      this.craftBtn.input.cursor = 'default';
    }
  }

  getRecipeCategory(recipe) {
    const outputItem = ITEMS[recipe.output];
    if (!outputItem) return 'building';

    const cat = outputItem.category;

    if (cat === 'tool' || cat === 'weapon') return 'tools';
    if (cat === 'food' || cat === 'water' || recipe.station === 'campfire') return 'food';
    if (cat === 'medical') return 'medical';
    if (cat === 'clothing') return 'clothing';
    if (cat === 'material' || recipe.placeable) return 'building';

    return 'building';
  }

  onCraftingProgress(data) {
    this.craftProgress = data.progress;
    if (this.progressBar) {
      this.progressBar.width = 180 * this.craftProgress;
    }
  }

  onCraftingComplete(data) {
    this.craftProgress = 0;
    this.refreshRecipeList();
  }

  toggle() {
    this.isVisible = !this.isVisible;

    if (this.isVisible) {
      this.overlay.setVisible(true);
      this.container.setVisible(true);
      this.refreshRecipeList();
      this.gameEvents.emit('ui:panelOpen', 'crafting');
    } else {
      this.overlay.setVisible(false);
      this.container.setVisible(false);
      this.selectedRecipe = null;
      this.gameEvents.emit('ui:panelClosed', 'crafting');
    }
  }

  destroy() {
    this.gameEvents.off('crafting:progress', this.onCraftingProgress, this);
    this.gameEvents.off('crafting:complete', this.onCraftingComplete, this);

    this.overlay?.destroy();
    this.container?.destroy();
    this.recipeMask?.destroy();
  }
}
