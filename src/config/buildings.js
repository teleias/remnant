// Building templates for world generation
// Each building defines room layouts, door positions, and loot container types

const BUILDINGS = {
  cabin: {
    name: 'Cabin',
    width: 6, height: 5,
    biomes: ['forest', 'dense_forest'],
    frequency: 0.3,
    rooms: [
      { name: 'main', x: 0, y: 0, w: 4, h: 5, containers: ['cabinet', 'shelf', 'crate'] },
      { name: 'bedroom', x: 4, y: 0, w: 2, h: 3, containers: ['dresser', 'nightstand'], furniture: ['bed'] },
      { name: 'storage', x: 4, y: 3, w: 2, h: 2, containers: ['crate', 'toolbox'] },
    ],
    doors: [
      { x: 2, y: 4, dir: 'S' },  // Front door
      { x: 3, y: 2, dir: 'E' },  // Interior door
    ],
  },
  house: {
    name: 'House',
    width: 8, height: 7,
    biomes: ['town'],
    frequency: 0.5,
    rooms: [
      { name: 'living', x: 0, y: 0, w: 4, h: 4, containers: ['shelf', 'cabinet'] },
      { name: 'kitchen', x: 4, y: 0, w: 4, h: 4, containers: ['fridge', 'cabinet', 'cabinet', 'counter'], furniture: ['oven', 'sink'] },
      { name: 'bedroom1', x: 0, y: 4, w: 4, h: 3, containers: ['dresser', 'nightstand', 'closet'], furniture: ['bed'] },
      { name: 'bathroom', x: 4, y: 4, w: 2, h: 3, containers: ['medicine_cabinet'], furniture: ['sink', 'toilet'] },
      { name: 'bedroom2', x: 6, y: 4, w: 2, h: 3, containers: ['dresser', 'closet'], furniture: ['bed'] },
    ],
    doors: [
      { x: 2, y: 0, dir: 'N' },
      { x: 3, y: 3, dir: 'S' },
      { x: 3, y: 4, dir: 'S' },
      { x: 5, y: 3, dir: 'S' },
    ],
  },
  gas_station: {
    name: 'Gas Station',
    width: 7, height: 5,
    biomes: ['road', 'town'],
    frequency: 0.15,
    rooms: [
      { name: 'store', x: 0, y: 0, w: 5, h: 5, containers: ['shelf', 'shelf', 'shelf', 'counter', 'cooler'] },
      { name: 'backroom', x: 5, y: 0, w: 2, h: 5, containers: ['crate', 'crate', 'toolbox'] },
    ],
    doors: [
      { x: 2, y: 4, dir: 'S' },
      { x: 4, y: 2, dir: 'E' },
    ],
  },
  ranger_station: {
    name: 'Ranger Station',
    width: 6, height: 6,
    biomes: ['forest', 'mountain'],
    frequency: 0.1,
    rooms: [
      { name: 'office', x: 0, y: 0, w: 4, h: 3, containers: ['desk', 'file_cabinet', 'shelf'] },
      { name: 'supply', x: 4, y: 0, w: 2, h: 3, containers: ['locker', 'crate', 'crate'] },
      { name: 'garage', x: 0, y: 3, w: 6, h: 3, containers: ['toolbox', 'crate', 'shelf', 'workbench'] },
    ],
    doors: [
      { x: 2, y: 0, dir: 'N' },
      { x: 3, y: 2, dir: 'S' },
      { x: 3, y: 5, dir: 'S' },
    ],
  },
  general_store: {
    name: 'General Store',
    width: 8, height: 6,
    biomes: ['town'],
    frequency: 0.2,
    rooms: [
      { name: 'floor', x: 0, y: 0, w: 8, h: 4, containers: ['shelf', 'shelf', 'shelf', 'shelf', 'shelf', 'display', 'counter'] },
      { name: 'stock', x: 0, y: 4, w: 8, h: 2, containers: ['crate', 'crate', 'crate', 'crate', 'shelf'] },
    ],
    doors: [
      { x: 4, y: 0, dir: 'N' },
      { x: 4, y: 3, dir: 'S' },
    ],
  },
  warehouse: {
    name: 'Warehouse',
    width: 10, height: 8,
    biomes: ['town', 'road'],
    frequency: 0.08,
    rooms: [
      { name: 'main', x: 0, y: 0, w: 10, h: 8, containers: ['crate', 'crate', 'crate', 'crate', 'crate', 'crate', 'pallet', 'pallet', 'shelf'] },
    ],
    doors: [
      { x: 5, y: 7, dir: 'S' },
      { x: 0, y: 4, dir: 'W' },
    ],
  },
  hunting_lodge: {
    name: 'Hunting Lodge',
    width: 7, height: 6,
    biomes: ['forest', 'dense_forest'],
    frequency: 0.05,
    rooms: [
      { name: 'main_hall', x: 0, y: 0, w: 5, h: 6, containers: ['gun_rack', 'shelf', 'cabinet', 'trophy_case'] },
      { name: 'bunk', x: 5, y: 0, w: 2, h: 3, containers: ['footlocker', 'nightstand'], furniture: ['bed', 'bed'] },
      { name: 'storage', x: 5, y: 3, w: 2, h: 3, containers: ['crate', 'toolbox', 'ammo_box'] },
    ],
    doors: [
      { x: 2, y: 5, dir: 'S' },
      { x: 4, y: 1, dir: 'E' },
    ],
  },
};

// Container loot table mappings (which item pools each container type draws from)
export const CONTAINER_LOOT = {
  cabinet:          { pool: 'household', slots: [3, 6] },
  shelf:            { pool: 'mixed', slots: [2, 5] },
  crate:            { pool: 'materials', slots: [3, 8] },
  toolbox:          { pool: 'tools', slots: [2, 4] },
  fridge:           { pool: 'food_perishable', slots: [3, 6] },
  counter:          { pool: 'food_packaged', slots: [2, 4] },
  cooler:           { pool: 'drinks', slots: [4, 8] },
  dresser:          { pool: 'clothing', slots: [3, 5] },
  nightstand:       { pool: 'misc_small', slots: [1, 3] },
  closet:           { pool: 'clothing', slots: [4, 8] },
  medicine_cabinet: { pool: 'medical', slots: [2, 5] },
  desk:             { pool: 'office', slots: [2, 4] },
  file_cabinet:     { pool: 'books', slots: [2, 4] },
  locker:           { pool: 'outdoor_gear', slots: [3, 6] },
  workbench:        { pool: 'tools', slots: [3, 6] },
  gun_rack:         { pool: 'weapons', slots: [1, 3] },
  trophy_case:      { pool: 'misc_valuable', slots: [1, 2] },
  ammo_box:         { pool: 'ammo', slots: [2, 4] },
  display:          { pool: 'mixed', slots: [2, 4] },
  footlocker:       { pool: 'clothing_outdoor', slots: [3, 5] },
  pallet:           { pool: 'bulk_materials', slots: [4, 10] },
};

// Loot pools — weighted item lists for each pool type
export const LOOT_POOLS = {
  household:       [{ item: 'cloth', weight: 5 }, { item: 'matches', weight: 3 }, { item: 'lighter', weight: 1 }, { item: 'duct_tape', weight: 2 }, { item: 'can_opener', weight: 2 }, { item: 'canned_soup', weight: 3 }],
  food_perishable: [{ item: 'canned_beans', weight: 4 }, { item: 'canned_soup', weight: 4 }, { item: 'canned_fruit', weight: 3 }, { item: 'water_bottle', weight: 3 }, { item: 'soda', weight: 3 }],
  food_packaged:   [{ item: 'granola_bar', weight: 5 }, { item: 'chips', weight: 4 }, { item: 'jerky', weight: 3 }, { item: 'coffee', weight: 2 }],
  drinks:          [{ item: 'water_bottle', weight: 5 }, { item: 'soda', weight: 5 }],
  tools:           [{ item: 'hammer', weight: 3 }, { item: 'saw', weight: 2 }, { item: 'shovel', weight: 2 }, { item: 'metal_knife', weight: 2 }, { item: 'metal_axe', weight: 1 }, { item: 'nails', weight: 5 }, { item: 'duct_tape', weight: 3 }],
  materials:       [{ item: 'nails', weight: 5 }, { item: 'scrap_metal', weight: 4 }, { item: 'plank', weight: 4 }, { item: 'rope', weight: 3 }, { item: 'cloth', weight: 3 }],
  clothing:        [{ item: 'tshirt', weight: 4 }, { item: 'flannel', weight: 3 }, { item: 'jeans', weight: 3 }, { item: 'jacket', weight: 1 }, { item: 'beanie', weight: 2 }],
  clothing_outdoor:[{ item: 'jacket', weight: 3 }, { item: 'boots', weight: 3 }, { item: 'gloves', weight: 3 }, { item: 'beanie', weight: 2 }, { item: 'backpack', weight: 1 }],
  medical:         [{ item: 'bandage', weight: 5 }, { item: 'painkillers', weight: 4 }, { item: 'disinfectant', weight: 2 }, { item: 'antibiotics', weight: 1 }, { item: 'vitamins', weight: 3 }],
  outdoor_gear:    [{ item: 'rope', weight: 3 }, { item: 'metal_axe', weight: 2 }, { item: 'metal_knife', weight: 2 }, { item: 'flashlight', weight: 3 }, { item: 'batteries', weight: 3 }, { item: 'compass_item', weight: 2 }, { item: 'map_local', weight: 1 }, { item: 'backpack', weight: 1 }],
  weapons:         [{ item: 'bat', weight: 3 }, { item: 'crowbar', weight: 2 }, { item: 'metal_knife', weight: 3 }, { item: 'bow', weight: 1 }, { item: 'arrow', weight: 4 }],
  books:           [{ item: 'book_foraging', weight: 2 }, { item: 'book_carpentry', weight: 2 }, { item: 'book_cooking', weight: 2 }, { item: 'book_firstaid', weight: 2 }, { item: 'map_local', weight: 3 }],
  office:          [{ item: 'matches', weight: 2 }, { item: 'duct_tape', weight: 2 }, { item: 'flashlight', weight: 2 }, { item: 'batteries', weight: 3 }],
  mixed:           [{ item: 'canned_beans', weight: 2 }, { item: 'bandage', weight: 2 }, { item: 'cloth', weight: 3 }, { item: 'nails', weight: 2 }, { item: 'matches', weight: 2 }, { item: 'granola_bar', weight: 2 }],
  misc_small:      [{ item: 'matches', weight: 3 }, { item: 'painkillers', weight: 2 }, { item: 'batteries', weight: 2 }, { item: 'watch', weight: 1 }],
  misc_valuable:   [{ item: 'lighter', weight: 2 }, { item: 'compass_item', weight: 2 }, { item: 'metal_knife', weight: 1 }],
  ammo:            [{ item: 'arrow', weight: 5 }],
  bulk_materials:  [{ item: 'plank', weight: 5 }, { item: 'nails', weight: 5 }, { item: 'scrap_metal', weight: 4 }, { item: 'wood_log', weight: 3 }, { item: 'rope', weight: 2 }],
};

export default BUILDINGS;
