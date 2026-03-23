// Complete item database. Every item in the game is defined here.
// Properties:
//   name: Display name
//   category: food|water|tool|weapon|material|medical|clothing|container|misc
//   weight: Weight in grams
//   stack: Max stack size
//   condition: Max condition (null if no durability)
//   desc: Description text
//   icon: Emoji for UI (will be replaced with sprite coords later)
//   actions: Array of possible actions
//   effects: Object of stat effects when used

const ITEMS = {

  // === FOOD (Raw) ===
  raw_venison:    { name: 'Raw Venison',     category: 'food', weight: 500, stack: 5,  icon: '🥩', desc: 'Uncooked deer meat. Must be cooked to eat safely.', actions: ['cook', 'drop'], effects: { hunger: 5, health: -8 } },
  raw_meat:       { name: 'Raw Meat',        category: 'food', weight: 300, stack: 5,  icon: '🥩', desc: 'Uncooked animal meat. Cook before eating.', actions: ['cook', 'drop'], effects: { hunger: 3, health: -5 } },
  raw_fish:       { name: 'Raw Fish',        category: 'food', weight: 250, stack: 5,  icon: '🐟', desc: 'Fresh caught fish. Cook it.', actions: ['cook', 'drop'], effects: { hunger: 3, health: -3 } },
  raw_rabbit:     { name: 'Raw Rabbit',      category: 'food', weight: 200, stack: 5,  icon: '🥩', desc: 'Small game meat. Cook before eating.', actions: ['cook', 'drop'], effects: { hunger: 2, health: -5 } },

  // === FOOD (Cooked) ===
  cooked_venison: { name: 'Cooked Venison',  category: 'food', weight: 450, stack: 5,  icon: '🍖', desc: 'Well cooked deer meat. Excellent nutrition.', actions: ['eat', 'drop'], effects: { hunger: 35, health: 3 } },
  cooked_meat:    { name: 'Cooked Meat',     category: 'food', weight: 270, stack: 5,  icon: '🍖', desc: 'Cooked animal meat. Good nutrition.', actions: ['eat', 'drop'], effects: { hunger: 25, health: 2 } },
  cooked_fish:    { name: 'Cooked Fish',     category: 'food', weight: 220, stack: 5,  icon: '🐠', desc: 'Grilled fish. Solid meal.', actions: ['eat', 'drop'], effects: { hunger: 20, health: 2 } },
  cooked_rabbit:  { name: 'Cooked Rabbit',   category: 'food', weight: 180, stack: 5,  icon: '🍖', desc: 'Roasted small game. Decent meal.', actions: ['eat', 'drop'], effects: { hunger: 15, health: 1 } },

  // === FOOD (Foraged) ===
  berries:        { name: 'Wild Berries',    category: 'food', weight: 50,  stack: 20, icon: '🫐', desc: 'Edible wild berries. Small hunger relief.', actions: ['eat', 'drop'], effects: { hunger: 5, thirst: 2 } },
  mushroom:       { name: 'Mushroom',        category: 'food', weight: 30,  stack: 20, icon: '🍄', desc: 'Forest mushroom. Edible when cooked.', actions: ['cook', 'eat', 'drop'], effects: { hunger: 3 } },
  herbs:          { name: 'Wild Herbs',      category: 'food', weight: 20,  stack: 20, icon: '🌿', desc: 'Medicinal herbs. Brew into tea or use in poultice.', actions: ['drop'] },
  pine_nuts:      { name: 'Pine Nuts',       category: 'food', weight: 40,  stack: 20, icon: '🌰', desc: 'Nutritious pine nuts.', actions: ['eat', 'drop'], effects: { hunger: 4 } },
  insects:        { name: 'Insects',         category: 'food', weight: 10,  stack: 30, icon: '🦗', desc: 'Protein rich insects. Desperate times.', actions: ['eat', 'drop'], effects: { hunger: 3, stress: 5 } },

  // === FOOD (Canned/Preserved) ===
  canned_beans:   { name: 'Canned Beans',   category: 'food', weight: 350, stack: 5,  icon: '🥫', desc: 'Canned beans. Ready to eat, better heated.', actions: ['eat', 'cook', 'drop'], effects: { hunger: 30 } },
  canned_soup:    { name: 'Canned Soup',    category: 'food', weight: 400, stack: 5,  icon: '🥫', desc: 'Canned soup. Warms you up if heated.', actions: ['eat', 'cook', 'drop'], effects: { hunger: 25, thirst: 5 } },
  canned_fruit:   { name: 'Canned Fruit',   category: 'food', weight: 300, stack: 5,  icon: '🥫', desc: 'Preserved fruit. Sweet and filling.', actions: ['eat', 'drop'], effects: { hunger: 20, thirst: 8 } },
  jerky:          { name: 'Dried Jerky',     category: 'food', weight: 100, stack: 10, icon: '🥓', desc: 'Dried meat strips. Long lasting, lightweight.', actions: ['eat', 'drop'], effects: { hunger: 15 } },
  granola_bar:    { name: 'Granola Bar',     category: 'food', weight: 60,  stack: 10, icon: '🍫', desc: 'Compact trail food.', actions: ['eat', 'drop'], effects: { hunger: 12 } },
  chips:          { name: 'Potato Chips',    category: 'food', weight: 80,  stack: 5,  icon: '🍟', desc: 'Salty snack. Makes you thirsty.', actions: ['eat', 'drop'], effects: { hunger: 8, thirst: -5 } },

  // === WATER ===
  water_dirty:    { name: 'Dirty Water',     category: 'water', weight: 500, stack: 3, icon: '💧', desc: 'Unpurified water. Risk of sickness.', actions: ['drink', 'boil', 'drop'], effects: { thirst: 20, health: -5 } },
  water_boiled:   { name: 'Boiled Water',    category: 'water', weight: 500, stack: 3, icon: '💦', desc: 'Boiled water. Safe to drink.', actions: ['drink', 'drop'], effects: { thirst: 35 } },
  water_bottle:   { name: 'Water Bottle',    category: 'water', weight: 550, stack: 2, icon: '🍶', desc: 'Sealed water bottle. Clean.', actions: ['drink', 'drop'], effects: { thirst: 40 } },
  soda:           { name: 'Soda Can',        category: 'water', weight: 350, stack: 5, icon: '🥤', desc: 'Sugary soda. Quenches thirst, minor energy.', actions: ['drink', 'drop'], effects: { thirst: 25, hunger: 3 } },
  coffee:         { name: 'Instant Coffee',  category: 'water', weight: 30,  stack: 10, icon: '☕', desc: 'Needs hot water to brew. Reduces fatigue.', actions: ['drop'] },

  // === TOOLS ===
  stone_axe:      { name: 'Stone Axe',      category: 'tool', weight: 800,  stack: 1, condition: 100, icon: '🪓', desc: 'Crude axe. Chops trees, usable as weapon.', actions: ['equip', 'drop'], toolPower: 2 },
  stone_pickaxe:  { name: 'Stone Pickaxe',  category: 'tool', weight: 900,  stack: 1, condition: 100, icon: '⛏', desc: 'Crude pickaxe. Mines stone.', actions: ['equip', 'drop'], toolPower: 2 },
  stone_knife:    { name: 'Stone Knife',    category: 'tool', weight: 200,  stack: 1, condition: 80,  icon: '🔪', desc: 'Sharp stone blade. Skins animals, cuts materials.', actions: ['equip', 'drop'], toolPower: 1 },
  metal_axe:      { name: 'Hatchet',        category: 'tool', weight: 1200, stack: 1, condition: 200, icon: '🪓', desc: 'Metal hatchet. Efficient wood chopping.', actions: ['equip', 'drop'], toolPower: 5 },
  metal_knife:    { name: 'Hunting Knife',  category: 'tool', weight: 300,  stack: 1, condition: 200, icon: '🔪', desc: 'Quality steel knife. Essential survival tool.', actions: ['equip', 'drop'], toolPower: 3 },
  saw:            { name: 'Hand Saw',       category: 'tool', weight: 600,  stack: 1, condition: 150, icon: '🪚', desc: 'Cuts planks from logs.', actions: ['equip', 'drop'], toolPower: 3 },
  hammer:         { name: 'Hammer',         category: 'tool', weight: 700,  stack: 1, condition: 200, icon: '🔨', desc: 'Drives nails. Required for construction.', actions: ['equip', 'drop'], toolPower: 2 },
  shovel:         { name: 'Shovel',         category: 'tool', weight: 1500, stack: 1, condition: 150, icon: '⚒', desc: 'Digs earth.', actions: ['equip', 'drop'], toolPower: 3 },
  fishing_rod:    { name: 'Fishing Rod',    category: 'tool', weight: 400,  stack: 1, condition: 100, icon: '🎣', desc: 'For catching fish near water.', actions: ['equip', 'drop'] },
  pot:            { name: 'Cooking Pot',    category: 'tool', weight: 800,  stack: 1, condition: null, icon: '🍳', desc: 'Required for boiling water and cooking stews.', actions: ['drop'] },

  // === WEAPONS ===
  wooden_spear:   { name: 'Wooden Spear',   category: 'weapon', weight: 600,  stack: 1, condition: 60,  icon: '🔱', desc: 'Sharpened stick. Basic reach weapon.', actions: ['equip', 'drop'], damage: 8, range: 1.5 },
  bat:            { name: 'Baseball Bat',   category: 'weapon', weight: 900,  stack: 1, condition: 150, icon: '🏏', desc: 'Solid wooden bat. Reliable melee weapon.', actions: ['equip', 'drop'], damage: 12, range: 1 },
  crowbar:        { name: 'Crowbar',        category: 'weapon', weight: 1200, stack: 1, condition: 300, icon: '🔧', desc: 'Heavy metal bar. Weapon and prying tool.', actions: ['equip', 'drop'], damage: 15, range: 1 },
  bow:            { name: 'Bow',            category: 'weapon', weight: 500,  stack: 1, condition: 100, icon: '🏹', desc: 'Handmade bow. Requires arrows.', actions: ['equip', 'drop'], damage: 18, range: 8, ranged: true },
  arrow:          { name: 'Arrow',          category: 'weapon', weight: 30,   stack: 20, icon: '➳', desc: 'Crude arrow. Ammunition for bow.', actions: ['drop'] },

  // === MATERIALS ===
  wood_log:       { name: 'Wood Log',       category: 'material', weight: 2000, stack: 5,  icon: '🪵', desc: 'Heavy timber log.', actions: ['drop'] },
  plank:          { name: 'Plank',          category: 'material', weight: 500,  stack: 10, icon: '🪵', desc: 'Sawn wooden plank. Used in construction.', actions: ['drop'] },
  stick:          { name: 'Stick',          category: 'material', weight: 100,  stack: 20, icon: '/', desc: 'Sturdy branch.', actions: ['drop'] },
  stone:          { name: 'Stone',          category: 'material', weight: 400,  stack: 10, icon: '🪨', desc: 'Hard rock.', actions: ['drop'] },
  flint:          { name: 'Flint',          category: 'material', weight: 150,  stack: 10, icon: '🔶', desc: 'Sharp stone. Fire starting and tool edges.', actions: ['drop'] },
  fiber:          { name: 'Plant Fiber',    category: 'material', weight: 20,   stack: 30, icon: '🌾', desc: 'Flexible plant material.', actions: ['drop'] },
  cordage:        { name: 'Cordage',        category: 'material', weight: 50,   stack: 15, icon: '〰', desc: 'Twisted plant fiber rope.', actions: ['drop'] },
  nails:          { name: 'Nails',          category: 'material', weight: 100,  stack: 50, icon: '📌', desc: 'Box of nails. Essential for construction.', actions: ['drop'] },
  scrap_metal:    { name: 'Scrap Metal',    category: 'material', weight: 600,  stack: 10, icon: '⚙', desc: 'Salvaged metal pieces.', actions: ['drop'] },
  cloth:          { name: 'Cloth',          category: 'material', weight: 50,   stack: 20, icon: '🧵', desc: 'Fabric scraps. Bandages, patches, cordage.', actions: ['drop'] },
  leather:        { name: 'Leather',        category: 'material', weight: 200,  stack: 10, icon: '🟫', desc: 'Tanned animal hide.', actions: ['drop'] },
  pelt_wolf:      { name: 'Wolf Pelt',      category: 'material', weight: 800,  stack: 3,  icon: '🐺', desc: 'Heavy wolf pelt. Warm.', actions: ['drop'] },
  pelt_bear:      { name: 'Bear Pelt',      category: 'material', weight: 2000, stack: 1,  icon: '🐻', desc: 'Massive bear pelt. Very warm.', actions: ['drop'] },
  pelt_deer:      { name: 'Deer Hide',      category: 'material', weight: 500,  stack: 3,  icon: '🦌', desc: 'Soft deer hide.', actions: ['drop'] },
  feathers:       { name: 'Feathers',       category: 'material', weight: 10,   stack: 30, icon: '🪶', desc: 'Bird feathers. Arrow fletching.', actions: ['drop'] },
  fat:            { name: 'Animal Fat',     category: 'material', weight: 300,  stack: 5,  icon: '🧈', desc: 'Rendered animal fat. Fuel, waterproofing, cooking.', actions: ['drop'] },
  tinder:         { name: 'Tinder',         category: 'material', weight: 10,   stack: 20, icon: '🍂', desc: 'Dry material for fire starting.', actions: ['drop'] },
  charcoal:       { name: 'Charcoal',       category: 'material', weight: 100,  stack: 20, icon: '⬛', desc: 'Burned wood. Fuel and water filtering.', actions: ['drop'] },

  // === MEDICAL ===
  bandage:        { name: 'Bandage',        category: 'medical', weight: 30,   stack: 10, icon: '🩹', desc: 'Stops bleeding. Basic wound care.', actions: ['use', 'drop'], effects: { health: 10 }, heals: ['bleeding'] },
  splint:         { name: 'Splint',         category: 'medical', weight: 100,  stack: 5,  icon: '🦴', desc: 'Immobilizes fractures.', actions: ['use', 'drop'], heals: ['fractured'] },
  disinfectant:   { name: 'Disinfectant',   category: 'medical', weight: 200,  stack: 3,  icon: '🧴', desc: 'Cleans wounds. Prevents infection.', actions: ['use', 'drop'], heals: ['infected'] },
  painkillers:    { name: 'Painkillers',    category: 'medical', weight: 20,   stack: 10, icon: '💊', desc: 'Reduces pain. Temporary relief.', actions: ['use', 'drop'], heals: ['pain'] },
  antibiotics:    { name: 'Antibiotics',    category: 'medical', weight: 20,   stack: 5,  icon: '💊', desc: 'Fights infection and sickness.', actions: ['use', 'drop'], heals: ['sick', 'infected'] },
  vitamins:       { name: 'Vitamins',       category: 'medical', weight: 15,   stack: 10, icon: '💊', desc: 'General health supplement.', actions: ['use', 'drop'], effects: { health: 5 } },

  // === CLOTHING ===
  tshirt:         { name: 'T-Shirt',        category: 'clothing', weight: 150,  stack: 1, condition: 100, icon: '👕', desc: 'Basic cotton shirt.', actions: ['equip', 'drop'], slot: 'torso', warmth: 3, protection: 1 },
  flannel:        { name: 'Flannel Shirt',  category: 'clothing', weight: 300,  stack: 1, condition: 100, icon: '👔', desc: 'Thick flannel. Good warmth.', actions: ['equip', 'drop'], slot: 'torso', warmth: 8, protection: 2 },
  jacket:         { name: 'Jacket',         category: 'clothing', weight: 600,  stack: 1, condition: 120, icon: '🧥', desc: 'Insulated jacket.', actions: ['equip', 'drop'], slot: 'torso', warmth: 15, protection: 3 },
  fur_coat:       { name: 'Fur Coat',       category: 'clothing', weight: 1500, stack: 1, condition: 150, icon: '🧥', desc: 'Heavy fur coat. Maximum warmth.', actions: ['equip', 'drop'], slot: 'torso', warmth: 25, protection: 4 },
  jeans:          { name: 'Jeans',          category: 'clothing', weight: 400,  stack: 1, condition: 120, icon: '👖', desc: 'Durable denim pants.', actions: ['equip', 'drop'], slot: 'legs', warmth: 5, protection: 2 },
  boots:          { name: 'Hiking Boots',   category: 'clothing', weight: 800,  stack: 1, condition: 200, icon: '🥾', desc: 'Sturdy boots. Protect feet, improve terrain traversal.', actions: ['equip', 'drop'], slot: 'feet', warmth: 5, protection: 4 },
  gloves:         { name: 'Work Gloves',    category: 'clothing', weight: 100,  stack: 1, condition: 80,  icon: '🧤', desc: 'Protect hands during work.', actions: ['equip', 'drop'], slot: 'hands', warmth: 3, protection: 3 },
  beanie:         { name: 'Beanie',         category: 'clothing', weight: 60,   stack: 1, condition: 80,  icon: '🧢', desc: 'Warm knit cap.', actions: ['equip', 'drop'], slot: 'head', warmth: 8, protection: 0 },

  // === CONTAINERS ===
  backpack:       { name: 'Backpack',       category: 'container', weight: 500, stack: 1, icon: '🎒', desc: 'Increases carry capacity by 8000g.', actions: ['equip', 'drop'], slot: 'back', carryBonus: 8000 },
  duffel_bag:     { name: 'Duffel Bag',     category: 'container', weight: 300, stack: 1, icon: '👜', desc: 'Large bag. +5000g capacity.', actions: ['equip', 'drop'], slot: 'back', carryBonus: 5000 },
  fanny_pack:     { name: 'Fanny Pack',     category: 'container', weight: 100, stack: 1, icon: '👝', desc: 'Small belt pack. +2000g capacity.', actions: ['equip', 'drop'], slot: 'back', carryBonus: 2000 },

  // === MISC ===
  lighter:        { name: 'Lighter',        category: 'misc', weight: 30,  stack: 1, condition: 50,  icon: '🔥', desc: 'Disposable lighter. Start fires easily.', actions: ['drop'] },
  matches:        { name: 'Matches',        category: 'misc', weight: 15,  stack: 1, condition: 20,  icon: '🔥', desc: 'Book of matches. Limited uses.', actions: ['drop'] },
  flashlight:     { name: 'Flashlight',     category: 'misc', weight: 200, stack: 1, condition: 100, icon: '🔦', desc: 'Battery powered light.', actions: ['equip', 'drop'] },
  batteries:      { name: 'Batteries',      category: 'misc', weight: 50,  stack: 5, icon: '🔋', desc: 'AA batteries. Power flashlights and radios.', actions: ['drop'] },
  compass_item:   { name: 'Compass',        category: 'misc', weight: 50,  stack: 1, icon: '🧭', desc: 'Magnetic compass. Shows direction on HUD.', actions: ['drop'] },
  map_local:      { name: 'Local Map',      category: 'misc', weight: 20,  stack: 1, icon: '🗺', desc: 'Map of the local area. Reveals map fog.', actions: ['use', 'drop'] },
  book_foraging:  { name: 'Foraging Guide', category: 'misc', weight: 200, stack: 1, icon: '📖', desc: 'Read to gain Foraging XP.', actions: ['read', 'drop'], skillXp: { foraging: 50 } },
  book_carpentry: { name: 'Woodworking Book',category: 'misc', weight: 200, stack: 1, icon: '📖', desc: 'Read to gain Carpentry XP.', actions: ['read', 'drop'], skillXp: { carpentry: 50 } },
  book_cooking:   { name: 'Cookbook',        category: 'misc', weight: 200, stack: 1, icon: '📖', desc: 'Read to gain Cooking XP.', actions: ['read', 'drop'], skillXp: { cooking: 50 } },
  book_firstaid:  { name: 'First Aid Manual',category: 'misc', weight: 200, stack: 1, icon: '📖', desc: 'Read to gain First Aid XP.', actions: ['read', 'drop'], skillXp: { firstAid: 50 } },
  watch:          { name: 'Digital Watch',  category: 'misc', weight: 30,  stack: 1, icon: '⌚', desc: 'Shows exact time on HUD.', actions: ['equip', 'drop'] },
  rope:           { name: 'Nylon Rope',     category: 'misc', weight: 300, stack: 3, icon: '🪢', desc: 'Strong synthetic rope. Many uses.', actions: ['drop'] },
  duct_tape:      { name: 'Duct Tape',      category: 'misc', weight: 100, stack: 3, condition: 50, icon: '🔲', desc: 'Repairs almost anything.', actions: ['drop'] },
  can_opener:     { name: 'Can Opener',     category: 'misc', weight: 80,  stack: 1, condition: 200, icon: '🔧', desc: 'Opens canned food without waste.', actions: ['drop'] },
};

export default ITEMS;
