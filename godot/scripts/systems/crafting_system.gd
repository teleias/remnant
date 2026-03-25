extends Node

signal craft_started(recipe_id: String)
signal craft_completed(recipe_id: String, output_id: String, output_qty: int)
signal craft_failed(recipe_id: String, reason: String)
signal craft_progress_updated(progress: float)

var recipe_db: Node
var item_db: Node
var inventory_system: Node
var skill_system: Node

var is_crafting: bool = false
var current_recipe: String = ""
var craft_timer: float = 0.0
var craft_duration: float = 0.0

func _ready():
	recipe_db = get_node("/root/RecipeDatabase")
	item_db = get_node("/root/ItemDatabase")

func _process(delta):
	if is_crafting:
		craft_timer += delta
		var progress = craft_timer / craft_duration
		craft_progress_updated.emit(progress)

		if craft_timer >= craft_duration:
			_complete_craft()

func initialize(inv_system: Node, skills_system: Node):
	inventory_system = inv_system
	skill_system = skills_system

func can_craft(recipe_id: String) -> Dictionary:
	var recipe = recipe_db.get_recipe(recipe_id)
	if recipe.is_empty():
		return {"can_craft": false, "reason": "Recipe not found"}

	# Check skill requirements
	if recipe.has("skill_req"):
		for skill in recipe.skill_req:
			var required_level = recipe.skill_req[skill]
			var current_level = skill_system.get_skill_level(skill)
			if current_level < required_level:
				return {"can_craft": false, "reason": "Requires " + skill + " level " + str(required_level)}

	# Check tool requirement
	if recipe.has("tool_req") and recipe.tool_req != null:
		if not inventory_system.has_item(recipe.tool_req, 1):
			var tool_data = item_db.get_item(recipe.tool_req)
			var tool_name = tool_data.get("name", recipe.tool_req)
			return {"can_craft": false, "reason": "Requires " + tool_name}

	# Check station requirement
	if recipe.has("station") and recipe.station != null:
		if not _is_near_station(recipe.station):
			return {"can_craft": false, "reason": "Requires " + recipe.station}

	# Check inputs
	for item_id in recipe.inputs:
		var required_qty = recipe.inputs[item_id]
		if not inventory_system.has_item(item_id, required_qty):
			var item_data = item_db.get_item(item_id)
			var item_name = item_data.get("name", item_id)
			var have = inventory_system.count_item(item_id)
			return {"can_craft": false, "reason": "Need " + str(required_qty) + "x " + item_name + " (have " + str(have) + ")"}

	return {"can_craft": true, "reason": ""}

func craft(recipe_id: String) -> bool:
	if is_crafting:
		craft_failed.emit(recipe_id, "Already crafting")
		return false

	var can_craft_result = can_craft(recipe_id)
	if not can_craft_result.can_craft:
		craft_failed.emit(recipe_id, can_craft_result.reason)
		return false

	var recipe = recipe_db.get_recipe(recipe_id)

	# Consume inputs
	for item_id in recipe.inputs:
		var required_qty = recipe.inputs[item_id]
		if not inventory_system.remove_item(item_id, required_qty):
			# Refund what we consumed
			_refund_inputs(recipe, item_id)
			craft_failed.emit(recipe_id, "Failed to consume inputs")
			return false

	# Degrade tool if needed
	if recipe.has("tool_req") and recipe.tool_req != null:
		var tool_slot = inventory_system.find_slot_with_item(recipe.tool_req)
		if tool_slot != -1:
			inventory_system.degrade_item(tool_slot, 2)

	# Start crafting timer
	is_crafting = true
	current_recipe = recipe_id
	craft_timer = 0.0
	craft_duration = recipe.get("craft_time", 5.0)

	craft_started.emit(recipe_id)
	return true

func _complete_craft():
	var recipe = recipe_db.get_recipe(current_recipe)
	if recipe.is_empty():
		is_crafting = false
		craft_failed.emit(current_recipe, "Recipe data lost")
		return

	var output_id = recipe.output_id
	var output_qty = recipe.get("output_qty", 1)

	# Add output to inventory
	if inventory_system.add_item(output_id, output_qty):
		# Grant skill XP
		if recipe.has("skill_grants"):
			for skill in recipe.skill_grants:
				var xp = recipe.skill_grants[skill]
				skill_system.add_xp(skill, xp)

		craft_completed.emit(current_recipe, output_id, output_qty)
	else:
		# Failed to add - inventory full or overweight
		# Drop items on ground (handled by player)
		craft_failed.emit(current_recipe, "Inventory full - items dropped")

	is_crafting = false
	current_recipe = ""

func cancel_craft():
	if not is_crafting:
		return

	# Refund all inputs
	var recipe = recipe_db.get_recipe(current_recipe)
	if not recipe.is_empty():
		_refund_inputs(recipe, "")

	is_crafting = false
	current_recipe = ""
	craft_timer = 0.0

func _refund_inputs(recipe: Dictionary, except_item: String):
	for item_id in recipe.inputs:
		if item_id == except_item:
			continue
		var qty = recipe.inputs[item_id]
		inventory_system.add_item(item_id, qty)

func _is_near_station(station_type: String) -> bool:
	var player = get_parent()
	var player_pos = player.global_position

	# Get all objects near player
	var nearby_objects = _get_nearby_objects(player_pos, station_type)

	match station_type:
		"campfire":
			return _is_object_in_range(nearby_objects, player_pos, 3.0 * 128) # 3 tiles
		"workbench":
			return _is_object_in_range(nearby_objects, player_pos, 2.0 * 128) # 2 tiles
		_:
			return false

func _get_nearby_objects(player_pos: Vector2, object_type: String) -> Array:
	# This needs to query the world for placed structures
	# For now, we'll check GameState.world_mods.placed_structures
	var nearby = []

	if not has_node("/root/GameState"):
		return nearby

	var game_state = get_node("/root/GameState")
	if not game_state.has("world_mods"):
		return nearby

	var placed_structures = game_state.world_mods.get("placed_structures", [])

	for structure in placed_structures:
		if structure.get("type", "") == object_type:
			var structure_pos = structure.get("position", Vector2.ZERO)
			nearby.append(structure_pos)

	return nearby

func _is_object_in_range(objects: Array, player_pos: Vector2, max_distance: float) -> bool:
	for obj_pos in objects:
		if player_pos.distance_to(obj_pos) <= max_distance:
			return true
	return false

func get_craft_progress() -> float:
	if not is_crafting:
		return 0.0
	return craft_timer / craft_duration

func is_currently_crafting() -> bool:
	return is_crafting

func get_current_recipe() -> String:
	return current_recipe

# ===== RECIPE QUERIES =====

func get_all_known_recipes() -> Array:
	# For now, return all recipes
	# In future, this should filter by learned recipes
	var all_recipes = []
	for recipe_id in recipe_db.recipes:
		all_recipes.append({
			"id": recipe_id,
			"data": recipe_db.get_recipe(recipe_id),
			"can_craft": can_craft(recipe_id).can_craft
		})
	return all_recipes

func get_craftable_recipes() -> Array:
	var craftable = []
	for recipe_id in recipe_db.recipes:
		if can_craft(recipe_id).can_craft:
			craftable.append({
				"id": recipe_id,
				"data": recipe_db.get_recipe(recipe_id)
			})
	return craftable

func get_recipes_by_category(category: String) -> Array:
	var recipes = recipe_db.get_recipes_by_category(category)
	var with_status = []

	for recipe_entry in recipes:
		var recipe_id = recipe_entry.id
		var can_craft_result = can_craft(recipe_id)
		with_status.append({
			"id": recipe_id,
			"data": recipe_entry.data,
			"can_craft": can_craft_result.can_craft,
			"reason": can_craft_result.reason
		})

	return with_status
