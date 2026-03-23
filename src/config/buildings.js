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

  // === RESIDENTIAL ===
  trailer: {
    name: 'Trailer',
    width: 8, height: 4,
    biomes: ['town', 'road'],
    frequency: 0.3,
    rooms: [
      { name: 'living', x: 0, y: 0, w: 5, h: 4, containers: ['cabinet', 'shelf', 'counter'] },
      { name: 'bedroom', x: 5, y: 0, w: 3, h: 4, containers: ['dresser', 'nightstand'], furniture: ['bed'] },
    ],
    doors: [
      { x: 2, y: 3, dir: 'S' },
    ],
  },
  apartment: {
    name: 'Apartment',
    width: 10, height: 8,
    biomes: ['town'],
    frequency: 0.2,
    rooms: [
      { name: 'unit_a', x: 0, y: 0, w: 5, h: 4, containers: ['cabinet', 'dresser', 'closet'], furniture: ['bed'] },
      { name: 'unit_b', x: 5, y: 0, w: 5, h: 4, containers: ['cabinet', 'dresser', 'closet'], furniture: ['bed'] },
      { name: 'unit_c', x: 0, y: 4, w: 5, h: 4, containers: ['cabinet', 'dresser'], furniture: ['bed'] },
      { name: 'unit_d', x: 5, y: 4, w: 5, h: 4, containers: ['cabinet', 'dresser', 'nightstand'], furniture: ['bed'] },
    ],
    doors: [
      { x: 2, y: 0, dir: 'N' },
      { x: 7, y: 0, dir: 'N' },
      { x: 2, y: 4, dir: 'S' },
      { x: 7, y: 4, dir: 'S' },
    ],
  },

  // === COMMERCIAL ===
  pharmacy: {
    name: 'Pharmacy',
    width: 7, height: 5,
    biomes: ['town'],
    frequency: 0.15,
    rooms: [
      { name: 'store', x: 0, y: 0, w: 5, h: 5, containers: ['medicine_cabinet', 'medicine_cabinet', 'shelf', 'shelf', 'counter'] },
      { name: 'back', x: 5, y: 0, w: 2, h: 5, containers: ['crate', 'crate', 'shelf'] },
    ],
    doors: [
      { x: 2, y: 4, dir: 'S' },
      { x: 4, y: 2, dir: 'E' },
    ],
  },
  hardware_store: {
    name: 'Hardware Store',
    width: 9, height: 6,
    biomes: ['town'],
    frequency: 0.12,
    rooms: [
      { name: 'floor', x: 0, y: 0, w: 7, h: 6, containers: ['toolbox', 'toolbox', 'workbench', 'shelf', 'shelf', 'shelf', 'display'] },
      { name: 'storage', x: 7, y: 0, w: 2, h: 6, containers: ['crate', 'crate', 'crate', 'shelf'] },
    ],
    doors: [
      { x: 3, y: 5, dir: 'S' },
      { x: 6, y: 3, dir: 'E' },
    ],
  },
  grocery_store: {
    name: 'Grocery Store',
    width: 10, height: 7,
    biomes: ['town'],
    frequency: 0.15,
    rooms: [
      { name: 'floor', x: 0, y: 0, w: 7, h: 7, containers: ['shelf', 'shelf', 'shelf', 'shelf', 'shelf', 'shelf', 'counter', 'display'] },
      { name: 'cold', x: 7, y: 0, w: 3, h: 4, containers: ['fridge', 'fridge', 'cooler', 'cooler'] },
      { name: 'stock', x: 7, y: 4, w: 3, h: 3, containers: ['crate', 'crate', 'crate'] },
    ],
    doors: [
      { x: 3, y: 6, dir: 'S' },
      { x: 6, y: 2, dir: 'E' },
    ],
  },
  bar: {
    name: 'Bar',
    width: 8, height: 5,
    biomes: ['town'],
    frequency: 0.2,
    rooms: [
      { name: 'main', x: 0, y: 0, w: 5, h: 5, containers: ['counter', 'counter', 'cooler', 'cooler', 'shelf'] },
      { name: 'kitchen', x: 5, y: 0, w: 3, h: 5, containers: ['fridge', 'cabinet', 'crate'] },
    ],
    doors: [
      { x: 2, y: 4, dir: 'S' },
      { x: 4, y: 2, dir: 'E' },
    ],
  },
  diner: {
    name: 'Diner',
    width: 7, height: 5,
    biomes: ['town', 'road'],
    frequency: 0.2,
    rooms: [
      { name: 'dining', x: 0, y: 0, w: 4, h: 5, containers: ['counter', 'shelf'], furniture: ['table'] },
      { name: 'kitchen', x: 4, y: 0, w: 3, h: 5, containers: ['fridge', 'counter', 'cabinet', 'crate'] },
    ],
    doors: [
      { x: 2, y: 4, dir: 'S' },
      { x: 3, y: 2, dir: 'E' },
    ],
  },
  gun_shop: {
    name: 'Gun Shop',
    width: 6, height: 5,
    biomes: ['town'],
    frequency: 0.08,
    rooms: [
      { name: 'showroom', x: 0, y: 0, w: 4, h: 5, containers: ['gun_rack', 'gun_rack', 'display', 'ammo_box', 'counter'] },
      { name: 'back', x: 4, y: 0, w: 2, h: 5, containers: ['crate', 'locker', 'ammo_box'] },
    ],
    doors: [
      { x: 2, y: 4, dir: 'S' },
      { x: 3, y: 2, dir: 'E' },
    ],
  },
  clothing_store: {
    name: 'Clothing Store',
    width: 8, height: 6,
    biomes: ['town'],
    frequency: 0.15,
    rooms: [
      { name: 'floor', x: 0, y: 0, w: 8, h: 4, containers: ['closet', 'closet', 'closet', 'dresser', 'dresser', 'display', 'display'] },
      { name: 'fitting', x: 0, y: 4, w: 4, h: 2, containers: ['closet'] },
      { name: 'storage', x: 4, y: 4, w: 4, h: 2, containers: ['crate', 'crate'] },
    ],
    doors: [
      { x: 4, y: 0, dir: 'N' },
      { x: 3, y: 3, dir: 'S' },
    ],
  },

  // === GOVERNMENT/PUBLIC ===
  fire_station: {
    name: 'Fire Station',
    width: 10, height: 8,
    biomes: ['town'],
    frequency: 0.06,
    rooms: [
      { name: 'garage', x: 0, y: 0, w: 6, h: 8, containers: ['toolbox', 'toolbox', 'crate', 'crate', 'locker', 'locker'] },
      { name: 'office', x: 6, y: 0, w: 4, h: 4, containers: ['desk', 'file_cabinet', 'shelf', 'cabinet'] },
      { name: 'bunk', x: 6, y: 4, w: 4, h: 4, containers: ['locker', 'locker', 'nightstand', 'footlocker'], furniture: ['bed', 'bed'] },
    ],
    doors: [
      { x: 3, y: 7, dir: 'S' },
      { x: 5, y: 2, dir: 'E' },
      { x: 5, y: 6, dir: 'E' },
    ],
  },
  police_station: {
    name: 'Police Station',
    width: 10, height: 8,
    biomes: ['town'],
    frequency: 0.06,
    rooms: [
      { name: 'lobby', x: 0, y: 0, w: 5, h: 4, containers: ['desk', 'desk', 'file_cabinet', 'shelf'] },
      { name: 'armory', x: 5, y: 0, w: 5, h: 4, containers: ['gun_rack', 'gun_rack', 'ammo_box', 'ammo_box', 'locker', 'locker'] },
      { name: 'cells', x: 0, y: 4, w: 5, h: 4, containers: ['footlocker', 'footlocker'], furniture: ['bed', 'bed'] },
      { name: 'office', x: 5, y: 4, w: 5, h: 4, containers: ['desk', 'file_cabinet', 'cabinet', 'shelf'] },
    ],
    doors: [
      { x: 2, y: 0, dir: 'N' },
      { x: 4, y: 3, dir: 'S' },
      { x: 2, y: 4, dir: 'S' },
      { x: 4, y: 6, dir: 'E' },
    ],
  },
  school: {
    name: 'School',
    width: 12, height: 10,
    biomes: ['town'],
    frequency: 0.05,
    rooms: [
      { name: 'class1', x: 0, y: 0, w: 6, h: 5, containers: ['desk', 'desk', 'desk', 'shelf', 'shelf'] },
      { name: 'class2', x: 6, y: 0, w: 6, h: 5, containers: ['desk', 'desk', 'desk', 'shelf', 'shelf'] },
      { name: 'cafeteria', x: 0, y: 5, w: 6, h: 5, containers: ['counter', 'counter', 'fridge', 'crate'], furniture: ['table', 'table'] },
      { name: 'gym_storage', x: 6, y: 5, w: 6, h: 5, containers: ['locker', 'locker', 'locker', 'crate', 'crate', 'shelf'] },
    ],
    doors: [
      { x: 3, y: 0, dir: 'N' },
      { x: 9, y: 0, dir: 'N' },
      { x: 3, y: 5, dir: 'S' },
      { x: 5, y: 7, dir: 'E' },
    ],
  },
  church: {
    name: 'Church',
    width: 8, height: 10,
    biomes: ['town'],
    frequency: 0.08,
    rooms: [
      { name: 'hall', x: 0, y: 0, w: 8, h: 7, containers: ['shelf', 'cabinet'] },
      { name: 'office', x: 0, y: 7, w: 4, h: 3, containers: ['desk', 'file_cabinet', 'shelf', 'cabinet'] },
      { name: 'storage', x: 4, y: 7, w: 4, h: 3, containers: ['crate', 'crate', 'shelf'] },
    ],
    doors: [
      { x: 4, y: 0, dir: 'N' },
      { x: 3, y: 6, dir: 'S' },
    ],
  },
  hospital: {
    name: 'Hospital',
    width: 12, height: 10,
    biomes: ['town'],
    frequency: 0.04,
    rooms: [
      { name: 'er', x: 0, y: 0, w: 6, h: 5, containers: ['medicine_cabinet', 'medicine_cabinet', 'locker', 'crate'], furniture: ['bed', 'bed'] },
      { name: 'rooms', x: 6, y: 0, w: 6, h: 5, containers: ['medicine_cabinet', 'nightstand', 'nightstand', 'cabinet'], furniture: ['bed', 'bed', 'bed'] },
      { name: 'pharmacy', x: 0, y: 5, w: 6, h: 5, containers: ['medicine_cabinet', 'medicine_cabinet', 'medicine_cabinet', 'shelf', 'shelf', 'counter'] },
      { name: 'supply', x: 6, y: 5, w: 6, h: 5, containers: ['crate', 'crate', 'crate', 'locker', 'locker', 'shelf'] },
    ],
    doors: [
      { x: 3, y: 0, dir: 'N' },
      { x: 9, y: 0, dir: 'N' },
      { x: 3, y: 5, dir: 'S' },
      { x: 5, y: 7, dir: 'E' },
    ],
  },
  post_office: {
    name: 'Post Office',
    width: 7, height: 6,
    biomes: ['town'],
    frequency: 0.1,
    rooms: [
      { name: 'lobby', x: 0, y: 0, w: 4, h: 6, containers: ['counter', 'counter', 'shelf'] },
      { name: 'sorting', x: 4, y: 0, w: 3, h: 6, containers: ['shelf', 'shelf', 'crate', 'crate', 'desk'] },
    ],
    doors: [
      { x: 2, y: 5, dir: 'S' },
      { x: 3, y: 3, dir: 'E' },
    ],
  },

  // === INDUSTRIAL ===
  mechanic_shop: {
    name: 'Mechanic Shop',
    width: 8, height: 6,
    biomes: ['town', 'road'],
    frequency: 0.12,
    rooms: [
      { name: 'garage', x: 0, y: 0, w: 6, h: 6, containers: ['toolbox', 'toolbox', 'workbench', 'crate', 'crate', 'locker'] },
      { name: 'office', x: 6, y: 0, w: 2, h: 6, containers: ['desk', 'shelf', 'cabinet'] },
    ],
    doors: [
      { x: 3, y: 5, dir: 'S' },
      { x: 5, y: 3, dir: 'E' },
    ],
  },
  storage_unit: {
    name: 'Storage Unit',
    width: 10, height: 4,
    biomes: ['town', 'road'],
    frequency: 0.1,
    rooms: [
      { name: 'u1', x: 0, y: 0, w: 2, h: 4, containers: ['crate', 'shelf'] },
      { name: 'u2', x: 2, y: 0, w: 2, h: 4, containers: ['crate', 'crate'] },
      { name: 'u3', x: 4, y: 0, w: 2, h: 4, containers: ['shelf', 'shelf'] },
      { name: 'u4', x: 6, y: 0, w: 2, h: 4, containers: ['crate', 'toolbox'] },
      { name: 'u5', x: 8, y: 0, w: 2, h: 4, containers: ['crate', 'shelf'] },
    ],
    doors: [
      { x: 1, y: 3, dir: 'S' },
      { x: 3, y: 3, dir: 'S' },
      { x: 5, y: 3, dir: 'S' },
      { x: 7, y: 3, dir: 'S' },
      { x: 9, y: 3, dir: 'S' },
    ],
  },

  // === RURAL/WILDERNESS ===
  farm_house: {
    name: 'Farm House',
    width: 8, height: 7,
    biomes: ['meadow'],
    frequency: 0.15,
    rooms: [
      { name: 'kitchen', x: 0, y: 0, w: 4, h: 4, containers: ['fridge', 'counter', 'cabinet', 'cabinet'], furniture: ['sink'] },
      { name: 'living', x: 4, y: 0, w: 4, h: 4, containers: ['shelf', 'cabinet'] },
      { name: 'bedroom', x: 0, y: 4, w: 4, h: 3, containers: ['dresser', 'nightstand', 'closet'], furniture: ['bed'] },
      { name: 'bathroom', x: 4, y: 4, w: 4, h: 3, containers: ['medicine_cabinet'], furniture: ['sink', 'toilet'] },
    ],
    doors: [
      { x: 2, y: 0, dir: 'N' },
      { x: 3, y: 3, dir: 'S' },
      { x: 3, y: 4, dir: 'S' },
    ],
  },
  barn: {
    name: 'Barn',
    width: 10, height: 8,
    biomes: ['meadow'],
    frequency: 0.12,
    rooms: [
      { name: 'main', x: 0, y: 0, w: 10, h: 8, containers: ['crate', 'crate', 'crate', 'crate', 'pallet', 'pallet', 'toolbox', 'shelf', 'shelf'] },
    ],
    doors: [
      { x: 5, y: 7, dir: 'S' },
    ],
  },
  hunting_blind: {
    name: 'Hunting Blind',
    width: 3, height: 3,
    biomes: ['forest', 'dense_forest'],
    frequency: 0.08,
    rooms: [
      { name: 'hide', x: 0, y: 0, w: 3, h: 3, containers: ['ammo_box', 'shelf'] },
    ],
    doors: [
      { x: 1, y: 2, dir: 'S' },
    ],
  },

  // === VEHICLES ===
  car_sedan: {
    name: 'Sedan',
    width: 3, height: 2,
    biomes: ['road', 'town'],
    frequency: 0.25,
    isVehicle: true,
    rooms: [
      { name: 'interior', x: 0, y: 0, w: 3, h: 2, containers: ['shelf'] },
    ],
    doors: [
      { x: 1, y: 1, dir: 'S' },
    ],
  },
  car_truck: {
    name: 'Truck',
    width: 3, height: 2,
    biomes: ['road', 'town', 'meadow'],
    frequency: 0.2,
    isVehicle: true,
    rooms: [
      { name: 'interior', x: 0, y: 0, w: 3, h: 2, containers: ['crate'] },
    ],
    doors: [
      { x: 1, y: 1, dir: 'S' },
    ],
  },
  car_van: {
    name: 'Van',
    width: 3, height: 2,
    biomes: ['road', 'town'],
    frequency: 0.15,
    isVehicle: true,
    rooms: [
      { name: 'interior', x: 0, y: 0, w: 3, h: 2, containers: ['crate', 'shelf'] },
    ],
    doors: [
      { x: 1, y: 1, dir: 'S' },
    ],
  },
  car_wreck: {
    name: 'Wrecked Car',
    width: 2, height: 2,
    biomes: ['road', 'town', 'meadow', 'forest'],
    frequency: 0.3,
    isVehicle: true,
    rooms: [
      { name: 'interior', x: 0, y: 0, w: 2, h: 2, containers: ['crate'] },
    ],
    doors: [
      { x: 1, y: 1, dir: 'S' },
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
