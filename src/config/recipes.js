// Crafting recipe definitions
// station: null (hands), 'campfire', 'workbench', 'sewing'
// skill: { name: minLevel } or null
// time: seconds to craft

const RECIPES = [
  // === BASIC (No station) ===
  { id: 'craft_stick',      name: 'Break Into Sticks',  output: 'stick',        qty: 3, inputs: { wood_log: 1 },                    station: null, skill: null, time: 3 },
  { id: 'craft_fiber',      name: 'Gather Fiber',       output: 'fiber',        qty: 2, inputs: {},                                  station: null, skill: null, time: 2, gather: true },
  { id: 'craft_cordage',    name: 'Braid Cordage',      output: 'cordage',      qty: 1, inputs: { fiber: 4 },                       station: null, skill: null, time: 5 },
  { id: 'craft_tinder',     name: 'Prepare Tinder',     output: 'tinder',       qty: 2, inputs: { fiber: 2, stick: 1 },             station: null, skill: null, time: 3 },
  { id: 'craft_bandage',    name: 'Make Bandage',       output: 'bandage',      qty: 2, inputs: { cloth: 2 },                       station: null, skill: { firstAid: 0 }, time: 4 },
  { id: 'craft_splint',     name: 'Make Splint',        output: 'splint',       qty: 1, inputs: { stick: 2, cloth: 2 },             station: null, skill: { firstAid: 0 }, time: 5 },
  { id: 'craft_torch',      name: 'Make Torch',         output: 'torch',        qty: 1, inputs: { stick: 1, cloth: 1, fat: 1 },     station: null, skill: null, time: 3 },

  // === TOOLS (No station) ===
  { id: 'craft_stone_knife', name: 'Stone Knife',       output: 'stone_knife',  qty: 1, inputs: { stone: 2, stick: 1 },             station: null, skill: null, time: 8 },
  { id: 'craft_stone_axe',   name: 'Stone Axe',         output: 'stone_axe',    qty: 1, inputs: { stone: 2, stick: 2, cordage: 1 }, station: null, skill: { carpentry: 0 }, time: 10 },
  { id: 'craft_stone_pick',  name: 'Stone Pickaxe',     output: 'stone_pickaxe',qty: 1, inputs: { stone: 3, stick: 2, cordage: 1 }, station: null, skill: { carpentry: 0 }, time: 10 },
  { id: 'craft_wooden_spear',name: 'Wooden Spear',      output: 'wooden_spear', qty: 1, inputs: { stick: 2, stone_knife: 0 },       station: null, skill: null, time: 6, toolRequired: 'stone_knife' },
  { id: 'craft_fishing_rod', name: 'Fishing Rod',       output: 'fishing_rod',  qty: 1, inputs: { stick: 2, cordage: 2 },           station: null, skill: { carpentry: 1 }, time: 8 },
  { id: 'craft_bow',         name: 'Bow',               output: 'bow',          qty: 1, inputs: { stick: 1, cordage: 2 },           station: null, skill: { carpentry: 2 }, time: 15 },
  { id: 'craft_arrow',       name: 'Arrows (x5)',       output: 'arrow',        qty: 5, inputs: { stick: 5, feathers: 3, flint: 2 },station: null, skill: { carpentry: 1 }, time: 10 },

  // === CAMPFIRE RECIPES ===
  { id: 'craft_campfire',    name: 'Campfire',          output: 'campfire_kit', qty: 1, inputs: { stone: 8, stick: 4, tinder: 1 },  station: null, skill: null, time: 10, placeable: true },
  { id: 'cook_meat',         name: 'Cook Meat',         output: 'cooked_meat',  qty: 1, inputs: { raw_meat: 1 },                    station: 'campfire', skill: { cooking: 0 }, time: 8 },
  { id: 'cook_venison',      name: 'Cook Venison',      output: 'cooked_venison',qty:1, inputs: { raw_venison: 1 },                 station: 'campfire', skill: { cooking: 0 }, time: 10 },
  { id: 'cook_fish',         name: 'Cook Fish',         output: 'cooked_fish',  qty: 1, inputs: { raw_fish: 1 },                    station: 'campfire', skill: { cooking: 0 }, time: 6 },
  { id: 'cook_rabbit',       name: 'Cook Rabbit',       output: 'cooked_rabbit',qty: 1, inputs: { raw_rabbit: 1 },                  station: 'campfire', skill: { cooking: 0 }, time: 6 },
  { id: 'boil_water',        name: 'Boil Water',        output: 'water_boiled', qty: 1, inputs: { water_dirty: 1 },                 station: 'campfire', skill: null, time: 12, toolRequired: 'pot' },
  { id: 'render_fat',        name: 'Render Fat',        output: 'charcoal',     qty: 2, inputs: { wood_log: 1 },                    station: 'campfire', skill: null, time: 15 },

  // === BUILDING ===
  { id: 'craft_plank',       name: 'Cut Planks',        output: 'plank',        qty: 3, inputs: { wood_log: 1 },                    station: null, skill: { carpentry: 1 }, time: 10, toolRequired: 'saw' },
  { id: 'build_wall_log',    name: 'Log Wall',          output: 'wall_log_kit', qty: 1, inputs: { wood_log: 3, cordage: 2 },        station: null, skill: { carpentry: 1 }, time: 15, placeable: true },
  { id: 'build_wall_plank',  name: 'Plank Wall',        output: 'wall_plank_kit',qty:1, inputs: { plank: 4, nails: 6 },             station: null, skill: { carpentry: 2 }, time: 12, toolRequired: 'hammer', placeable: true },
  { id: 'build_door',        name: 'Wooden Door',       output: 'door_kit',     qty: 1, inputs: { plank: 3, nails: 4 },             station: null, skill: { carpentry: 2 }, time: 15, toolRequired: 'hammer', placeable: true },
  { id: 'build_crate',       name: 'Storage Crate',     output: 'crate_kit',    qty: 1, inputs: { plank: 4, nails: 8 },             station: null, skill: { carpentry: 2 }, time: 12, toolRequired: 'hammer', placeable: true },
  { id: 'build_bed',         name: 'Bed Frame',         output: 'bed_kit',      qty: 1, inputs: { plank: 6, nails: 8, cloth: 4 },   station: null, skill: { carpentry: 3 }, time: 20, toolRequired: 'hammer', placeable: true },
  { id: 'build_workbench',   name: 'Workbench',         output: 'workbench_kit',qty: 1, inputs: { plank: 6, nails: 10, wood_log: 2},station: null, skill: { carpentry: 3 }, time: 25, toolRequired: 'hammer', placeable: true },
  { id: 'build_rain_coll',   name: 'Rain Collector',    output: 'rain_coll_kit',qty: 1, inputs: { plank: 4, nails: 6, cloth: 2 },   station: null, skill: { carpentry: 2 }, time: 15, toolRequired: 'hammer', placeable: true },
  { id: 'build_snare',       name: 'Snare Trap',        output: 'snare_kit',    qty: 1, inputs: { stick: 3, cordage: 2 },           station: null, skill: { tracking: 1 }, time: 8, placeable: true },
  { id: 'build_shelter',     name: 'Lean-To Shelter',   output: 'shelter_kit',  qty: 1, inputs: { wood_log: 4, stick: 8, cordage: 4, fiber: 6 }, station: null, skill: { carpentry: 1 }, time: 20, placeable: true },

  // === CLOTHING ===
  { id: 'craft_fur_coat',    name: 'Fur Coat',          output: 'fur_coat',     qty: 1, inputs: { pelt_wolf: 2, pelt_deer: 2, cordage: 3 }, station: 'sewing', skill: { tailoring: 3 }, time: 30 },
  { id: 'craft_gloves',      name: 'Leather Gloves',    output: 'gloves',       qty: 1, inputs: { leather: 2, cordage: 1 },         station: 'sewing', skill: { tailoring: 1 }, time: 10 },
];

export default RECIPES;
