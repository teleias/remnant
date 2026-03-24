extends Node

var buildings: Dictionary = {}
var vehicles: Dictionary = {}
var loot_pools: Dictionary = {}

func _ready():
	_register_loot_pools()
	_register_all_buildings()
	_register_all_vehicles()

func get_building(id: String) -> Dictionary:
	return buildings.get(id, {})

func get_vehicle(id: String) -> Dictionary:
	return vehicles.get(id, {})

func get_buildings_for_biome(biome: String) -> Array:
	var result = []
	for building_id in buildings:
		var b = buildings[building_id]
		if biome in b.biomes:
			result.append({"id": building_id, "data": b})
	return result

func get_loot_from_pool(pool_id: String, count: int = 1) -> Array:
	var pool = loot_pools.get(pool_id, [])
	if pool.is_empty():
		return []

	var result = []
	for i in range(count):
		var roll = randf()
		var cumulative = 0.0
		for entry in pool:
			cumulative += entry.weight
			if roll <= cumulative:
				var qty = randi_range(entry.min_qty, entry.max_qty)
				if qty > 0:
					result.append({"id": entry.item_id, "qty": qty})
				break
	return result

func _add_building(id: String, data: Dictionary):
	buildings[id] = data

func _add_vehicle(id: String, data: Dictionary):
	vehicles[id] = data

func _register_loot_pools():
	# CABINET - Kitchen/storage
	loot_pools["cabinet"] = [
		{"item_id": "canned_beans", "weight": 0.15, "min_qty": 1, "max_qty": 2},
		{"item_id": "canned_soup", "weight": 0.12, "min_qty": 1, "max_qty": 2},
		{"item_id": "canned_fruit", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "granola_bar", "weight": 0.08, "min_qty": 1, "max_qty": 3},
		{"item_id": "chips", "weight": 0.08, "min_qty": 1, "max_qty": 2},
		{"item_id": "water_bottle", "weight": 0.10, "min_qty": 1, "max_qty": 2},
		{"item_id": "soda", "weight": 0.07, "min_qty": 1, "max_qty": 3},
		{"item_id": "coffee", "weight": 0.05, "min_qty": 1, "max_qty": 2},
		{"item_id": "can_opener", "weight": 0.03, "min_qty": 1, "max_qty": 1},
		{"item_id": "matches", "weight": 0.04, "min_qty": 1, "max_qty": 1},
		{"item_id": "duct_tape", "weight": 0.03, "min_qty": 1, "max_qty": 1},
		{"item_id": "", "weight": 0.15, "min_qty": 0, "max_qty": 0} # Empty
	]

	# SHELF - General storage
	loot_pools["shelf"] = [
		{"item_id": "cloth", "weight": 0.12, "min_qty": 1, "max_qty": 3},
		{"item_id": "rope", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "duct_tape", "weight": 0.08, "min_qty": 1, "max_qty": 2},
		{"item_id": "batteries", "weight": 0.10, "min_qty": 2, "max_qty": 4},
		{"item_id": "flashlight", "weight": 0.06, "min_qty": 1, "max_qty": 1},
		{"item_id": "nails", "weight": 0.10, "min_qty": 5, "max_qty": 15},
		{"item_id": "scrap_metal", "weight": 0.08, "min_qty": 1, "max_qty": 2},
		{"item_id": "backpack", "weight": 0.04, "min_qty": 1, "max_qty": 1},
		{"item_id": "granola_bar", "weight": 0.06, "min_qty": 1, "max_qty": 2},
		{"item_id": "water_bottle", "weight": 0.06, "min_qty": 1, "max_qty": 1},
		{"item_id": "", "weight": 0.22, "min_qty": 0, "max_qty": 0}
	]

	# CRATE - Outdoor/warehouse
	loot_pools["crate"] = [
		{"item_id": "nails", "weight": 0.15, "min_qty": 10, "max_qty": 30},
		{"item_id": "scrap_metal", "weight": 0.15, "min_qty": 2, "max_qty": 5},
		{"item_id": "rope", "weight": 0.12, "min_qty": 1, "max_qty": 2},
		{"item_id": "cloth", "weight": 0.10, "min_qty": 2, "max_qty": 4},
		{"item_id": "duct_tape", "weight": 0.10, "min_qty": 1, "max_qty": 3},
		{"item_id": "plank", "weight": 0.08, "min_qty": 2, "max_qty": 5},
		{"item_id": "stick", "weight": 0.08, "min_qty": 3, "max_qty": 8},
		{"item_id": "", "weight": 0.22, "min_qty": 0, "max_qty": 0}
	]

	# WORKBENCH - Tools and hardware
	loot_pools["workbench"] = [
		{"item_id": "hammer", "weight": 0.15, "min_qty": 1, "max_qty": 1},
		{"item_id": "saw", "weight": 0.12, "min_qty": 1, "max_qty": 1},
		{"item_id": "metal_axe", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "metal_knife", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "shovel", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "nails", "weight": 0.15, "min_qty": 20, "max_qty": 50},
		{"item_id": "scrap_metal", "weight": 0.10, "min_qty": 3, "max_qty": 6},
		{"item_id": "duct_tape", "weight": 0.08, "min_qty": 1, "max_qty": 2},
		{"item_id": "rope", "weight": 0.06, "min_qty": 1, "max_qty": 1},
		{"item_id": "", "weight": 0.08, "min_qty": 0, "max_qty": 0}
	]

	# FRIDGE - Perishables
	loot_pools["fridge"] = [
		{"item_id": "water_bottle", "weight": 0.20, "min_qty": 1, "max_qty": 3},
		{"item_id": "soda", "weight": 0.15, "min_qty": 1, "max_qty": 4},
		{"item_id": "canned_beans", "weight": 0.10, "min_qty": 1, "max_qty": 2},
		{"item_id": "canned_soup", "weight": 0.10, "min_qty": 1, "max_qty": 2},
		{"item_id": "", "weight": 0.45, "min_qty": 0, "max_qty": 0} # Spoiled food
	]

	# MEDICINE_CABINET - Medical supplies
	loot_pools["medicine_cabinet"] = [
		{"item_id": "bandage", "weight": 0.18, "min_qty": 1, "max_qty": 3},
		{"item_id": "painkillers", "weight": 0.15, "min_qty": 1, "max_qty": 2},
		{"item_id": "disinfectant", "weight": 0.12, "min_qty": 1, "max_qty": 2},
		{"item_id": "antibiotics", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "vitamins", "weight": 0.10, "min_qty": 1, "max_qty": 2},
		{"item_id": "splint", "weight": 0.05, "min_qty": 1, "max_qty": 1},
		{"item_id": "", "weight": 0.32, "min_qty": 0, "max_qty": 0}
	]

	# GUN_SAFE - Weapons and ammo
	loot_pools["gun_safe"] = [
		{"item_id": "bow", "weight": 0.15, "min_qty": 1, "max_qty": 1},
		{"item_id": "arrow", "weight": 0.20, "min_qty": 5, "max_qty": 15},
		{"item_id": "crowbar", "weight": 0.12, "min_qty": 1, "max_qty": 1},
		{"item_id": "baseball_bat", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "metal_knife", "weight": 0.15, "min_qty": 1, "max_qty": 1},
		{"item_id": "flashlight", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "batteries", "weight": 0.08, "min_qty": 2, "max_qty": 6},
		{"item_id": "", "weight": 0.10, "min_qty": 0, "max_qty": 0}
	]

	# CLOSET - Clothing
	loot_pools["closet"] = [
		{"item_id": "tshirt", "weight": 0.15, "min_qty": 1, "max_qty": 2},
		{"item_id": "flannel", "weight": 0.12, "min_qty": 1, "max_qty": 1},
		{"item_id": "jacket", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "jeans", "weight": 0.12, "min_qty": 1, "max_qty": 2},
		{"item_id": "boots", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "gloves", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "beanie", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "backpack", "weight": 0.06, "min_qty": 1, "max_qty": 1},
		{"item_id": "", "weight": 0.19, "min_qty": 0, "max_qty": 0}
	]

	# DESK - Office/study
	loot_pools["desk"] = [
		{"item_id": "map_local", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "compass_item", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "watch", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "batteries", "weight": 0.12, "min_qty": 2, "max_qty": 4},
		{"item_id": "flashlight", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "matches", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "lighter", "weight": 0.06, "min_qty": 1, "max_qty": 1},
		{"item_id": "granola_bar", "weight": 0.08, "min_qty": 1, "max_qty": 2},
		{"item_id": "", "weight": 0.28, "min_qty": 0, "max_qty": 0}
	]

	# BOOKSHELF - Skills and reading
	loot_pools["bookshelf"] = [
		{"item_id": "foraging_guide", "weight": 0.15, "min_qty": 1, "max_qty": 1},
		{"item_id": "carpentry_book", "weight": 0.15, "min_qty": 1, "max_qty": 1},
		{"item_id": "cooking_book", "weight": 0.15, "min_qty": 1, "max_qty": 1},
		{"item_id": "firstaid_manual", "weight": 0.15, "min_qty": 1, "max_qty": 1},
		{"item_id": "", "weight": 0.40, "min_qty": 0, "max_qty": 0}
	]

	# GROCERY_SHELF - Food store
	loot_pools["grocery_shelf"] = [
		{"item_id": "canned_beans", "weight": 0.15, "min_qty": 2, "max_qty": 4},
		{"item_id": "canned_soup", "weight": 0.15, "min_qty": 2, "max_qty": 4},
		{"item_id": "canned_fruit", "weight": 0.12, "min_qty": 1, "max_qty": 3},
		{"item_id": "chips", "weight": 0.10, "min_qty": 1, "max_qty": 3},
		{"item_id": "granola_bar", "weight": 0.12, "min_qty": 2, "max_qty": 5},
		{"item_id": "jerky", "weight": 0.08, "min_qty": 1, "max_qty": 3},
		{"item_id": "water_bottle", "weight": 0.10, "min_qty": 2, "max_qty": 4},
		{"item_id": "soda", "weight": 0.08, "min_qty": 1, "max_qty": 3},
		{"item_id": "coffee", "weight": 0.05, "min_qty": 1, "max_qty": 2},
		{"item_id": "", "weight": 0.05, "min_qty": 0, "max_qty": 0}
	]

	# PHARMACY_SHELF - Medical store
	loot_pools["pharmacy_shelf"] = [
		{"item_id": "bandage", "weight": 0.20, "min_qty": 2, "max_qty": 5},
		{"item_id": "painkillers", "weight": 0.18, "min_qty": 2, "max_qty": 4},
		{"item_id": "disinfectant", "weight": 0.15, "min_qty": 1, "max_qty": 3},
		{"item_id": "antibiotics", "weight": 0.12, "min_qty": 1, "max_qty": 2},
		{"item_id": "vitamins", "weight": 0.15, "min_qty": 2, "max_qty": 4},
		{"item_id": "splint", "weight": 0.08, "min_qty": 1, "max_qty": 2},
		{"item_id": "", "weight": 0.12, "min_qty": 0, "max_qty": 0}
	]

	# HARDWARE_SHELF - Hardware store
	loot_pools["hardware_shelf"] = [
		{"item_id": "hammer", "weight": 0.12, "min_qty": 1, "max_qty": 2},
		{"item_id": "saw", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "metal_axe", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "shovel", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "nails", "weight": 0.15, "min_qty": 20, "max_qty": 50},
		{"item_id": "rope", "weight": 0.12, "min_qty": 1, "max_qty": 2},
		{"item_id": "duct_tape", "weight": 0.10, "min_qty": 1, "max_qty": 3},
		{"item_id": "flashlight", "weight": 0.08, "min_qty": 1, "max_qty": 2},
		{"item_id": "batteries", "weight": 0.10, "min_qty": 4, "max_qty": 10},
		{"item_id": "", "weight": 0.07, "min_qty": 0, "max_qty": 0}
	]

	# CLOTHING_RACK - Clothing store
	loot_pools["clothing_rack"] = [
		{"item_id": "tshirt", "weight": 0.15, "min_qty": 1, "max_qty": 3},
		{"item_id": "flannel", "weight": 0.12, "min_qty": 1, "max_qty": 2},
		{"item_id": "jacket", "weight": 0.12, "min_qty": 1, "max_qty": 1},
		{"item_id": "jeans", "weight": 0.15, "min_qty": 1, "max_qty": 2},
		{"item_id": "boots", "weight": 0.10, "min_qty": 1, "max_qty": 1},
		{"item_id": "gloves", "weight": 0.10, "min_qty": 1, "max_qty": 2},
		{"item_id": "beanie", "weight": 0.10, "min_qty": 1, "max_qty": 2},
		{"item_id": "backpack", "weight": 0.08, "min_qty": 1, "max_qty": 1},
		{"item_id": "duffel_bag", "weight": 0.05, "min_qty": 1, "max_qty": 1},
		{"item_id": "", "weight": 0.03, "min_qty": 0, "max_qty": 0}
	]

func _register_all_buildings():
	# ===== RESIDENTIAL =====
	_add_building("cabin", {
		"name": "Log Cabin",
		"width": 12,
		"height": 10,
		"biomes": ["forest", "mountain"],
		"frequency": 0.3,
		"wall_material": "log",
		"rooms": [
			{"x": 1, "y": 1, "w": 10, "h": 8, "type": "living",
			 "furniture": ["bed", "cabinet", "shelf"],
			 "containers": [
				{"type": "cabinet", "loot_pool": "cabinet"},
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "closet", "loot_pool": "closet"}
			]}
		],
		"door_positions": [{"x": 6, "y": 0}]
	})

	_add_building("house", {
		"name": "Suburban House",
		"width": 16,
		"height": 14,
		"biomes": ["plains", "forest"],
		"frequency": 0.5,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 6, "h": 6, "type": "living",
			 "furniture": ["shelf", "desk"],
			 "containers": [{"type": "shelf", "loot_pool": "shelf"}, {"type": "desk", "loot_pool": "desk"}]},
			{"x": 8, "y": 1, "w": 7, "h": 6, "type": "kitchen",
			 "furniture": ["cabinet", "fridge"],
			 "containers": [{"type": "cabinet", "loot_pool": "cabinet"}, {"type": "fridge", "loot_pool": "fridge"}]},
			{"x": 1, "y": 8, "w": 6, "h": 5, "type": "bedroom",
			 "furniture": ["bed", "closet"],
			 "containers": [{"type": "closet", "loot_pool": "closet"}]},
			{"x": 8, "y": 8, "w": 4, "h": 5, "type": "bathroom",
			 "furniture": ["medicine_cabinet"],
			 "containers": [{"type": "medicine_cabinet", "loot_pool": "medicine_cabinet"}]}
		],
		"door_positions": [{"x": 8, "y": 0}]
	})

	_add_building("trailer", {
		"name": "Mobile Home",
		"width": 14,
		"height": 6,
		"biomes": ["plains", "desert"],
		"frequency": 0.2,
		"wall_material": "metal",
		"rooms": [
			{"x": 1, "y": 1, "w": 12, "h": 4, "type": "living",
			 "furniture": ["bed", "cabinet", "shelf"],
			 "containers": [{"type": "cabinet", "loot_pool": "cabinet"}, {"type": "shelf", "loot_pool": "shelf"}]}
		],
		"door_positions": [{"x": 7, "y": 0}]
	})

	_add_building("apartment", {
		"name": "Apartment Unit",
		"width": 10,
		"height": 10,
		"biomes": ["urban"],
		"frequency": 0.6,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 8, "h": 4, "type": "living",
			 "furniture": ["shelf", "desk"],
			 "containers": [{"type": "shelf", "loot_pool": "shelf"}]},
			{"x": 1, "y": 6, "w": 4, "h": 3, "type": "bedroom",
			 "furniture": ["bed", "closet"],
			 "containers": [{"type": "closet", "loot_pool": "closet"}]},
			{"x": 6, "y": 6, "w": 3, "h": 3, "type": "kitchen",
			 "furniture": ["cabinet"],
			 "containers": [{"type": "cabinet", "loot_pool": "cabinet"}]}
		],
		"door_positions": [{"x": 5, "y": 0}]
	})

	_add_building("farm_house", {
		"name": "Farmhouse",
		"width": 18,
		"height": 16,
		"biomes": ["plains"],
		"frequency": 0.25,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 8, "h": 7, "type": "living",
			 "furniture": ["shelf", "desk", "bookshelf"],
			 "containers": [{"type": "shelf", "loot_pool": "shelf"}, {"type": "bookshelf", "loot_pool": "bookshelf"}]},
			{"x": 10, "y": 1, "w": 7, "h": 7, "type": "kitchen",
			 "furniture": ["cabinet", "fridge"],
			 "containers": [{"type": "cabinet", "loot_pool": "cabinet"}, {"type": "fridge", "loot_pool": "fridge"}]},
			{"x": 1, "y": 9, "w": 7, "h": 6, "type": "bedroom",
			 "furniture": ["bed", "closet"],
			 "containers": [{"type": "closet", "loot_pool": "closet"}]},
			{"x": 9, "y": 9, "w": 8, "h": 6, "type": "storage",
			 "furniture": ["crate", "shelf"],
			 "containers": [{"type": "crate", "loot_pool": "crate"}]}
		],
		"door_positions": [{"x": 9, "y": 0}]
	})

	# ===== COMMERCIAL =====
	_add_building("general_store", {
		"name": "General Store",
		"width": 16,
		"height": 12,
		"biomes": ["plains", "forest", "urban"],
		"frequency": 0.4,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 14, "h": 10, "type": "shop",
			 "furniture": ["shelf", "cabinet", "crate"],
			 "containers": [
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "cabinet", "loot_pool": "cabinet"},
				{"type": "crate", "loot_pool": "crate"}
			]}
		],
		"door_positions": [{"x": 8, "y": 0}]
	})

	_add_building("gas_station", {
		"name": "Gas Station",
		"width": 14,
		"height": 10,
		"biomes": ["plains", "urban"],
		"frequency": 0.35,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 12, "h": 8, "type": "shop",
			 "furniture": ["shelf", "cabinet"],
			 "containers": [
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "cabinet", "loot_pool": "cabinet"}
			]}
		],
		"door_positions": [{"x": 7, "y": 0}]
	})

	_add_building("pharmacy", {
		"name": "Pharmacy",
		"width": 14,
		"height": 12,
		"biomes": ["urban", "plains"],
		"frequency": 0.25,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 12, "h": 10, "type": "shop",
			 "furniture": ["shelf", "cabinet"],
			 "containers": [
				{"type": "shelf", "loot_pool": "pharmacy_shelf"},
				{"type": "shelf", "loot_pool": "pharmacy_shelf"},
				{"type": "shelf", "loot_pool": "pharmacy_shelf"},
				{"type": "cabinet", "loot_pool": "medicine_cabinet"}
			]}
		],
		"door_positions": [{"x": 7, "y": 0}]
	})

	_add_building("hardware_store", {
		"name": "Hardware Store",
		"width": 18,
		"height": 14,
		"biomes": ["urban", "plains"],
		"frequency": 0.3,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 16, "h": 12, "type": "shop",
			 "furniture": ["shelf", "workbench", "crate"],
			 "containers": [
				{"type": "shelf", "loot_pool": "hardware_shelf"},
				{"type": "shelf", "loot_pool": "hardware_shelf"},
				{"type": "workbench", "loot_pool": "workbench"},
				{"type": "crate", "loot_pool": "crate"}
			]}
		],
		"door_positions": [{"x": 9, "y": 0}]
	})

	_add_building("grocery_store", {
		"name": "Grocery Store",
		"width": 20,
		"height": 16,
		"biomes": ["urban", "plains"],
		"frequency": 0.35,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 18, "h": 14, "type": "shop",
			 "furniture": ["shelf", "fridge"],
			 "containers": [
				{"type": "shelf", "loot_pool": "grocery_shelf"},
				{"type": "shelf", "loot_pool": "grocery_shelf"},
				{"type": "shelf", "loot_pool": "grocery_shelf"},
				{"type": "fridge", "loot_pool": "fridge"},
				{"type": "fridge", "loot_pool": "fridge"}
			]}
		],
		"door_positions": [{"x": 10, "y": 0}]
	})

	_add_building("bar", {
		"name": "Bar & Grill",
		"width": 16,
		"height": 12,
		"biomes": ["urban", "plains"],
		"frequency": 0.25,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 14, "h": 10, "type": "bar",
			 "furniture": ["shelf", "cabinet"],
			 "containers": [
				{"type": "cabinet", "loot_pool": "cabinet"},
				{"type": "shelf", "loot_pool": "shelf"}
			]}
		],
		"door_positions": [{"x": 8, "y": 0}]
	})

	_add_building("diner", {
		"name": "Diner",
		"width": 14,
		"height": 10,
		"biomes": ["urban", "plains"],
		"frequency": 0.3,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 12, "h": 8, "type": "restaurant",
			 "furniture": ["cabinet", "fridge"],
			 "containers": [
				{"type": "cabinet", "loot_pool": "cabinet"},
				{"type": "fridge", "loot_pool": "fridge"}
			]}
		],
		"door_positions": [{"x": 7, "y": 0}]
	})

	_add_building("gun_shop", {
		"name": "Gun Shop",
		"width": 14,
		"height": 12,
		"biomes": ["urban", "plains"],
		"frequency": 0.15,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 12, "h": 10, "type": "shop",
			 "furniture": ["shelf", "gun_safe"],
			 "containers": [
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "gun_safe", "loot_pool": "gun_safe"},
				{"type": "gun_safe", "loot_pool": "gun_safe"}
			]}
		],
		"door_positions": [{"x": 7, "y": 0}]
	})

	_add_building("clothing_store", {
		"name": "Clothing Store",
		"width": 16,
		"height": 12,
		"biomes": ["urban", "plains"],
		"frequency": 0.3,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 14, "h": 10, "type": "shop",
			 "furniture": ["clothing_rack", "shelf"],
			 "containers": [
				{"type": "clothing_rack", "loot_pool": "clothing_rack"},
				{"type": "clothing_rack", "loot_pool": "clothing_rack"},
				{"type": "shelf", "loot_pool": "shelf"}
			]}
		],
		"door_positions": [{"x": 8, "y": 0}]
	})

	# ===== GOVERNMENT =====
	_add_building("fire_station", {
		"name": "Fire Station",
		"width": 20,
		"height": 16,
		"biomes": ["urban", "plains"],
		"frequency": 0.15,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 18, "h": 14, "type": "garage",
			 "furniture": ["crate", "shelf", "workbench"],
			 "containers": [
				{"type": "crate", "loot_pool": "crate"},
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "workbench", "loot_pool": "workbench"}
			]}
		],
		"door_positions": [{"x": 10, "y": 0}]
	})

	_add_building("police_station", {
		"name": "Police Station",
		"width": 18,
		"height": 14,
		"biomes": ["urban"],
		"frequency": 0.12,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 16, "h": 12, "type": "office",
			 "furniture": ["desk", "shelf", "gun_safe"],
			 "containers": [
				{"type": "desk", "loot_pool": "desk"},
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "gun_safe", "loot_pool": "gun_safe"}
			]}
		],
		"door_positions": [{"x": 9, "y": 0}]
	})

	_add_building("school", {
		"name": "School",
		"width": 24,
		"height": 20,
		"biomes": ["urban", "plains"],
		"frequency": 0.2,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 22, "h": 18, "type": "classroom",
			 "furniture": ["desk", "shelf", "bookshelf"],
			 "containers": [
				{"type": "desk", "loot_pool": "desk"},
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "bookshelf", "loot_pool": "bookshelf"}
			]}
		],
		"door_positions": [{"x": 12, "y": 0}]
	})

	_add_building("church", {
		"name": "Church",
		"width": 16,
		"height": 20,
		"biomes": ["plains", "urban"],
		"frequency": 0.2,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 14, "h": 18, "type": "worship",
			 "furniture": ["shelf", "desk"],
			 "containers": [
				{"type": "shelf", "loot_pool": "shelf"}
			]}
		],
		"door_positions": [{"x": 8, "y": 0}]
	})

	_add_building("hospital", {
		"name": "Hospital",
		"width": 28,
		"height": 24,
		"biomes": ["urban"],
		"frequency": 0.1,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 26, "h": 22, "type": "medical",
			 "furniture": ["medicine_cabinet", "shelf", "desk"],
			 "containers": [
				{"type": "medicine_cabinet", "loot_pool": "medicine_cabinet"},
				{"type": "medicine_cabinet", "loot_pool": "medicine_cabinet"},
				{"type": "shelf", "loot_pool": "pharmacy_shelf"},
				{"type": "desk", "loot_pool": "desk"}
			]}
		],
		"door_positions": [{"x": 14, "y": 0}]
	})

	_add_building("post_office", {
		"name": "Post Office",
		"width": 14,
		"height": 12,
		"biomes": ["urban", "plains"],
		"frequency": 0.2,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 12, "h": 10, "type": "office",
			 "furniture": ["desk", "shelf", "crate"],
			 "containers": [
				{"type": "desk", "loot_pool": "desk"},
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "crate", "loot_pool": "crate"}
			]}
		],
		"door_positions": [{"x": 7, "y": 0}]
	})

	# ===== INDUSTRIAL =====
	_add_building("ranger_station", {
		"name": "Ranger Station",
		"width": 14,
		"height": 12,
		"biomes": ["forest", "mountain"],
		"frequency": 0.2,
		"wall_material": "log",
		"rooms": [
			{"x": 1, "y": 1, "w": 12, "h": 10, "type": "office",
			 "furniture": ["desk", "shelf", "gun_safe"],
			 "containers": [
				{"type": "desk", "loot_pool": "desk"},
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "gun_safe", "loot_pool": "gun_safe"}
			]}
		],
		"door_positions": [{"x": 7, "y": 0}]
	})

	_add_building("mechanic_shop", {
		"name": "Mechanic Shop",
		"width": 18,
		"height": 14,
		"biomes": ["urban", "plains"],
		"frequency": 0.25,
		"wall_material": "metal",
		"rooms": [
			{"x": 1, "y": 1, "w": 16, "h": 12, "type": "garage",
			 "furniture": ["workbench", "crate", "shelf"],
			 "containers": [
				{"type": "workbench", "loot_pool": "workbench"},
				{"type": "crate", "loot_pool": "crate"},
				{"type": "shelf", "loot_pool": "shelf"}
			]}
		],
		"door_positions": [{"x": 9, "y": 0}]
	})

	_add_building("storage_unit", {
		"name": "Storage Unit",
		"width": 10,
		"height": 8,
		"biomes": ["urban", "plains"],
		"frequency": 0.4,
		"wall_material": "metal",
		"rooms": [
			{"x": 1, "y": 1, "w": 8, "h": 6, "type": "storage",
			 "furniture": ["crate", "shelf"],
			 "containers": [
				{"type": "crate", "loot_pool": "crate"},
				{"type": "shelf", "loot_pool": "shelf"}
			]}
		],
		"door_positions": [{"x": 5, "y": 0}]
	})

	# ===== WILDERNESS =====
	_add_building("barn", {
		"name": "Barn",
		"width": 20,
		"height": 16,
		"biomes": ["plains"],
		"frequency": 0.3,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 18, "h": 14, "type": "storage",
			 "furniture": ["crate", "shelf", "workbench"],
			 "containers": [
				{"type": "crate", "loot_pool": "crate"},
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "workbench", "loot_pool": "workbench"}
			]}
		],
		"door_positions": [{"x": 10, "y": 0}]
	})

	_add_building("hunting_lodge", {
		"name": "Hunting Lodge",
		"width": 16,
		"height": 12,
		"biomes": ["forest", "mountain"],
		"frequency": 0.25,
		"wall_material": "log",
		"rooms": [
			{"x": 1, "y": 1, "w": 14, "h": 10, "type": "cabin",
			 "furniture": ["bed", "shelf", "gun_safe"],
			 "containers": [
				{"type": "shelf", "loot_pool": "shelf"},
				{"type": "gun_safe", "loot_pool": "gun_safe"},
				{"type": "closet", "loot_pool": "closet"}
			]}
		],
		"door_positions": [{"x": 8, "y": 0}]
	})

	_add_building("hunting_blind", {
		"name": "Hunting Blind",
		"width": 6,
		"height": 6,
		"biomes": ["forest"],
		"frequency": 0.5,
		"wall_material": "plank",
		"rooms": [
			{"x": 1, "y": 1, "w": 4, "h": 4, "type": "shelter",
			 "furniture": [],
			 "containers": [
				{"type": "crate", "loot_pool": "crate"}
			]}
		],
		"door_positions": [{"x": 3, "y": 0}]
	})

func _register_all_vehicles():
	_add_vehicle("car_sedan", {
		"name": "Sedan",
		"width": 4,
		"height": 2,
		"biomes": ["urban", "plains"],
		"frequency": 0.6,
		"containers": [
			{"type": "trunk", "loot_pool": "shelf"}
		]
	})

	_add_vehicle("car_truck", {
		"name": "Pickup Truck",
		"width": 5,
		"height": 3,
		"biomes": ["plains", "forest"],
		"frequency": 0.4,
		"containers": [
			{"type": "truck_bed", "loot_pool": "crate"}
		]
	})

	_add_vehicle("car_van", {
		"name": "Van",
		"width": 5,
		"height": 3,
		"biomes": ["urban"],
		"frequency": 0.3,
		"containers": [
			{"type": "cargo_area", "loot_pool": "crate"}
		]
	})

	_add_vehicle("car_police", {
		"name": "Police Car",
		"width": 4,
		"height": 2,
		"biomes": ["urban"],
		"frequency": 0.1,
		"containers": [
			{"type": "trunk", "loot_pool": "gun_safe"}
		]
	})

	_add_vehicle("car_ambulance", {
		"name": "Ambulance",
		"width": 5,
		"height": 3,
		"biomes": ["urban"],
		"frequency": 0.08,
		"containers": [
			{"type": "medical_bay", "loot_pool": "medicine_cabinet"}
		]
	})

	_add_vehicle("car_pickup", {
		"name": "Old Pickup",
		"width": 5,
		"height": 3,
		"biomes": ["forest", "mountain"],
		"frequency": 0.35,
		"containers": [
			{"type": "truck_bed", "loot_pool": "crate"}
		]
	})

	_add_vehicle("car_wreck", {
		"name": "Abandoned Wreck",
		"width": 4,
		"height": 2,
		"biomes": ["urban", "plains", "forest"],
		"frequency": 0.5,
		"containers": []
	})
