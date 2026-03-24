extends Node

var recipes: Dictionary = {}

func _ready():
	_register_all_recipes()

func get_recipe(id: String) -> Dictionary:
	return recipes.get(id, {})

func get_recipes_by_category(cat: String) -> Array:
	var result = []
	for id in recipes:
		if recipes[id].category == cat:
			result.append({"id": id, "data": recipes[id]})
	return result

func get_all_craftable_recipes(inventory_system, skill_system) -> Array:
	var result = []
	for id in recipes:
		if can_craft_recipe(id, inventory_system, skill_system):
			result.append({"id": id, "data": recipes[id]})
	return result

func can_craft_recipe(recipe_id: String, inventory_system, skill_system) -> bool:
	var recipe = get_recipe(recipe_id)
	if recipe.is_empty():
		return false

	# Check skill requirements
	if recipe.has("skill_req"):
		for skill in recipe.skill_req:
			var required_level = recipe.skill_req[skill]
			var current_level = skill_system.get_skill_level(skill)
			if current_level < required_level:
				return false

	# Check tool requirement
	if recipe.has("tool_req") and recipe.tool_req != null:
		if not inventory_system.has_item(recipe.tool_req, 1):
			return false

	# Check inputs
	for item_id in recipe.inputs:
		var required_qty = recipe.inputs[item_id]
		if not inventory_system.has_item(item_id, required_qty):
			return false

	return true

func _add(id: String, data: Dictionary):
	recipes[id] = data

func _register_all_recipes():
	# ===== BASIC =====
	_add("craft_stick", {
		"name": "Craft Stick",
		"category": "basic",
		"inputs": {},
		"output_id": "stick",
		"output_qty": 2,
		"craft_time": 2.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"survival": 1},
		"description": "Break branches into sticks."
	})

	_add("craft_fiber", {
		"name": "Gather Plant Fiber",
		"category": "basic",
		"inputs": {},
		"output_id": "fiber",
		"output_qty": 3,
		"craft_time": 3.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"foraging": 2},
		"description": "Collect fibers from plants."
	})

	_add("craft_cordage", {
		"name": "Twist Cordage",
		"category": "basic",
		"inputs": {"fiber": 3},
		"output_id": "cordage",
		"output_qty": 1,
		"craft_time": 5.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"survival": 3},
		"description": "Twist plant fibers into rope."
	})

	_add("craft_tinder", {
		"name": "Prepare Tinder",
		"category": "basic",
		"inputs": {"fiber": 2},
		"output_id": "tinder",
		"output_qty": 5,
		"craft_time": 2.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"survival": 1},
		"description": "Dry and shred material for fire starting."
	})

	_add("craft_bandage", {
		"name": "Make Bandage",
		"category": "basic",
		"inputs": {"cloth": 2},
		"output_id": "bandage",
		"output_qty": 1,
		"craft_time": 3.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"medical": 2},
		"description": "Tear cloth into sterile bandages."
	})

	_add("craft_splint", {
		"name": "Make Splint",
		"category": "basic",
		"inputs": {"stick": 2, "cloth": 1},
		"output_id": "splint",
		"output_qty": 1,
		"craft_time": 4.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"medical": 3},
		"description": "Bind sticks to immobilize fractures."
	})

	_add("craft_torch", {
		"name": "Make Torch",
		"category": "basic",
		"inputs": {"stick": 1, "cloth": 1, "fat": 1},
		"output_id": "torch",
		"output_qty": 1,
		"craft_time": 3.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"survival": 2},
		"description": "Wrap cloth around stick and soak in fat."
	})

	# ===== TOOLS =====
	_add("craft_stone_knife", {
		"name": "Stone Knife",
		"category": "tools",
		"inputs": {"flint": 1, "stick": 1, "cordage": 1},
		"output_id": "stone_knife",
		"output_qty": 1,
		"craft_time": 8.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"survival": 5},
		"description": "Lash sharp flint to a handle."
	})

	_add("craft_stone_axe", {
		"name": "Stone Axe",
		"category": "tools",
		"inputs": {"stone": 2, "stick": 1, "cordage": 1},
		"output_id": "stone_axe",
		"output_qty": 1,
		"craft_time": 10.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"survival": 8},
		"description": "Bind a heavy stone to a wooden handle."
	})

	_add("craft_stone_pickaxe", {
		"name": "Stone Pickaxe",
		"category": "tools",
		"inputs": {"stone": 2, "stick": 1, "cordage": 1},
		"output_id": "stone_pickaxe",
		"output_qty": 1,
		"craft_time": 10.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"survival": 8},
		"description": "Create a mining tool from stone and wood."
	})

	_add("craft_wooden_spear", {
		"name": "Wooden Spear",
		"category": "tools",
		"inputs": {"stick": 3, "cordage": 1},
		"output_id": "wooden_spear",
		"output_qty": 1,
		"craft_time": 6.0,
		"station": null,
		"skill_req": {},
		"tool_req": "stone_knife",
		"skill_grants": {"survival": 4},
		"description": "Sharpen and bind sticks into a spear."
	})

	_add("craft_fishing_rod", {
		"name": "Fishing Rod",
		"category": "tools",
		"inputs": {"stick": 2, "cordage": 2},
		"output_id": "fishing_rod",
		"output_qty": 1,
		"craft_time": 5.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"survival": 3},
		"description": "Attach cordage to a long stick."
	})

	_add("craft_bow", {
		"name": "Makeshift Bow",
		"category": "tools",
		"inputs": {"stick": 2, "cordage": 3},
		"output_id": "bow",
		"output_qty": 1,
		"craft_time": 12.0,
		"station": null,
		"skill_req": {"survival": 2},
		"tool_req": "stone_knife",
		"skill_grants": {"survival": 10},
		"description": "Bend wood and string it with cordage."
	})

	_add("craft_arrow", {
		"name": "Arrows",
		"category": "tools",
		"inputs": {"stick": 1, "flint": 1, "feathers": 2},
		"output_id": "arrow",
		"output_qty": 3,
		"craft_time": 8.0,
		"station": null,
		"skill_req": {"survival": 1},
		"tool_req": "stone_knife",
		"skill_grants": {"survival": 4},
		"description": "Craft arrows with stone tips and feather fletching."
	})

	# ===== CAMPFIRE =====
	_add("craft_campfire", {
		"name": "Build Campfire",
		"category": "campfire",
		"inputs": {"stick": 5, "tinder": 2, "stone": 3},
		"output_id": "campfire",
		"output_qty": 1,
		"craft_time": 8.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"survival": 5},
		"description": "Arrange stones and wood for a fire pit."
	})

	_add("cook_meat", {
		"name": "Cook Meat",
		"category": "campfire",
		"inputs": {"raw_meat": 1},
		"output_id": "cooked_meat",
		"output_qty": 1,
		"craft_time": 6.0,
		"station": "campfire",
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"cooking": 3},
		"description": "Roast raw meat over fire."
	})

	_add("cook_venison", {
		"name": "Cook Venison",
		"category": "campfire",
		"inputs": {"raw_venison": 1},
		"output_id": "cooked_venison",
		"output_qty": 1,
		"craft_time": 7.0,
		"station": "campfire",
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"cooking": 4},
		"description": "Cook venison steak over flames."
	})

	_add("cook_fish", {
		"name": "Cook Fish",
		"category": "campfire",
		"inputs": {"raw_fish": 1},
		"output_id": "cooked_fish",
		"output_qty": 1,
		"craft_time": 5.0,
		"station": "campfire",
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"cooking": 3},
		"description": "Grill fish over campfire."
	})

	_add("cook_rabbit", {
		"name": "Cook Rabbit",
		"category": "campfire",
		"inputs": {"raw_rabbit": 1},
		"output_id": "cooked_rabbit",
		"output_qty": 1,
		"craft_time": 5.0,
		"station": "campfire",
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"cooking": 3},
		"description": "Roast rabbit meat over fire."
	})

	_add("boil_water", {
		"name": "Boil Water",
		"category": "campfire",
		"inputs": {"water_dirty": 1},
		"output_id": "water_boiled",
		"output_qty": 1,
		"craft_time": 4.0,
		"station": "campfire",
		"skill_req": {},
		"tool_req": "pot",
		"skill_grants": {"cooking": 2},
		"description": "Purify water by boiling."
	})

	_add("render_fat", {
		"name": "Render Fat",
		"category": "campfire",
		"inputs": {"raw_meat": 2},
		"output_id": "fat",
		"output_qty": 1,
		"craft_time": 10.0,
		"station": "campfire",
		"skill_req": {},
		"tool_req": "pot",
		"skill_grants": {"cooking": 3},
		"description": "Melt fat from meat scraps."
	})

	# ===== BUILDING =====
	_add("craft_plank", {
		"name": "Saw Planks",
		"category": "building",
		"inputs": {"wood_log": 1},
		"output_id": "plank",
		"output_qty": 4,
		"craft_time": 8.0,
		"station": null,
		"skill_req": {},
		"tool_req": "saw",
		"skill_grants": {"carpentry": 4},
		"description": "Cut logs into usable planks."
	})

	_add("build_wall_log", {
		"name": "Log Wall",
		"category": "building",
		"inputs": {"wood_log": 3},
		"output_id": "wall_log",
		"output_qty": 1,
		"craft_time": 15.0,
		"station": null,
		"skill_req": {"carpentry": 1},
		"tool_req": "stone_axe",
		"skill_grants": {"carpentry": 8},
		"description": "Stack logs to create a wall section."
	})

	_add("build_wall_plank", {
		"name": "Plank Wall",
		"category": "building",
		"inputs": {"plank": 6, "nails": 10},
		"output_id": "wall_plank",
		"output_qty": 1,
		"craft_time": 12.0,
		"station": null,
		"skill_req": {"carpentry": 2},
		"tool_req": "hammer",
		"skill_grants": {"carpentry": 10},
		"description": "Nail planks together into a wall frame."
	})

	_add("build_door", {
		"name": "Wooden Door",
		"category": "building",
		"inputs": {"plank": 4, "nails": 6, "scrap_metal": 1},
		"output_id": "door",
		"output_qty": 1,
		"craft_time": 18.0,
		"station": "workbench",
		"skill_req": {"carpentry": 3},
		"tool_req": "hammer",
		"skill_grants": {"carpentry": 15},
		"description": "Construct a door with hinges."
	})

	_add("build_crate", {
		"name": "Storage Crate",
		"category": "building",
		"inputs": {"plank": 4, "nails": 8},
		"output_id": "crate",
		"output_qty": 1,
		"craft_time": 10.0,
		"station": null,
		"skill_req": {"carpentry": 1},
		"tool_req": "hammer",
		"skill_grants": {"carpentry": 6},
		"description": "Build a wooden storage box."
	})

	_add("build_bed", {
		"name": "Simple Bed",
		"category": "building",
		"inputs": {"plank": 8, "nails": 12, "cloth": 5},
		"output_id": "bed",
		"output_qty": 1,
		"craft_time": 20.0,
		"station": "workbench",
		"skill_req": {"carpentry": 2},
		"tool_req": "hammer",
		"skill_grants": {"carpentry": 12},
		"description": "Build a basic bed frame with mattress."
	})

	_add("build_workbench", {
		"name": "Workbench",
		"category": "building",
		"inputs": {"plank": 10, "nails": 20, "scrap_metal": 2},
		"output_id": "workbench",
		"output_qty": 1,
		"craft_time": 25.0,
		"station": null,
		"skill_req": {"carpentry": 3},
		"tool_req": "hammer",
		"skill_grants": {"carpentry": 20},
		"description": "Construct a sturdy workbench for advanced crafting."
	})

	_add("build_rain_collector", {
		"name": "Rain Collector",
		"category": "building",
		"inputs": {"plank": 6, "nails": 8, "scrap_metal": 3},
		"output_id": "rain_collector",
		"output_qty": 1,
		"craft_time": 15.0,
		"station": null,
		"skill_req": {"carpentry": 2},
		"tool_req": "hammer",
		"skill_grants": {"carpentry": 10},
		"description": "Build a container to collect rainwater."
	})

	_add("build_snare", {
		"name": "Animal Snare",
		"category": "building",
		"inputs": {"stick": 3, "cordage": 2},
		"output_id": "snare",
		"output_qty": 1,
		"craft_time": 6.0,
		"station": null,
		"skill_req": {},
		"tool_req": null,
		"skill_grants": {"trapping": 5},
		"description": "Set up a trap to catch small animals."
	})

	_add("build_shelter", {
		"name": "Lean-To Shelter",
		"category": "building",
		"inputs": {"stick": 10, "fiber": 15, "wood_log": 2},
		"output_id": "shelter",
		"output_qty": 1,
		"craft_time": 30.0,
		"station": null,
		"skill_req": {"carpentry": 1},
		"tool_req": "stone_axe",
		"skill_grants": {"carpentry": 15},
		"description": "Build a basic shelter to protect from elements."
	})

	# ===== CLOTHING =====
	_add("craft_fur_coat", {
		"name": "Fur Coat",
		"category": "clothing",
		"inputs": {"pelt_bear": 1, "cordage": 4, "leather": 2},
		"output_id": "fur_coat",
		"output_qty": 1,
		"craft_time": 40.0,
		"station": "workbench",
		"skill_req": {"survival": 3},
		"tool_req": "stone_knife",
		"skill_grants": {"survival": 25},
		"description": "Stitch pelts into a warm coat."
	})

	_add("craft_leather_gloves", {
		"name": "Leather Gloves",
		"category": "clothing",
		"inputs": {"leather": 1, "cordage": 1},
		"output_id": "gloves",
		"output_qty": 1,
		"craft_time": 15.0,
		"station": null,
		"skill_req": {},
		"tool_req": "stone_knife",
		"skill_grants": {"survival": 8},
		"description": "Cut and sew leather into gloves."
	})

	# ===== MEDICAL (duplicates from basic are intentional for category filtering) =====
	_add("craft_bandage_advanced", {
		"name": "Sterile Bandage",
		"category": "medical",
		"inputs": {"cloth": 2, "disinfectant": 1},
		"output_id": "bandage",
		"output_qty": 2,
		"craft_time": 4.0,
		"station": null,
		"skill_req": {"medical": 1},
		"tool_req": null,
		"skill_grants": {"medical": 5},
		"description": "Create sterile bandages with disinfectant."
	})

	_add("craft_herbal_remedy", {
		"name": "Herbal Remedy",
		"category": "medical",
		"inputs": {"herbs": 5, "water_boiled": 1},
		"output_id": "painkillers",
		"output_qty": 1,
		"craft_time": 10.0,
		"station": "campfire",
		"skill_req": {"medical": 2},
		"tool_req": "pot",
		"skill_grants": {"medical": 8},
		"description": "Brew medicinal herbs into pain relief."
	})
