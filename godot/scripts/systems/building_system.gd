extends Node

signal build_mode_toggled(enabled: bool)
signal structure_placed(structure_type: String, position: Vector2)
signal placement_valid_changed(is_valid: bool)

const TILE_SIZE = 64
const MAX_BUILD_DISTANCE = 4 * TILE_SIZE # 4 tiles

var recipe_db: Node
var item_db: Node
var inventory_system: Node

var build_mode_active: bool = false
var selected_structure: String = ""
var ghost_sprite: Sprite2D = null
var placement_valid: bool = false
var ghost_position: Vector2 = Vector2.ZERO

func _ready():
	recipe_db = get_node("/root/RecipeDatabase")
	item_db = get_node("/root/ItemDatabase")

func _process(_delta):
	if build_mode_active and ghost_sprite != null:
		_update_ghost_position()

func initialize(inv_system: Node):
	inventory_system = inv_system

# ===== BUILD MODE =====

func toggle_build_mode():
	build_mode_active = not build_mode_active

	if build_mode_active:
		# Show build menu (UI handles this)
		pass
	else:
		_clear_ghost()

	build_mode_toggled.emit(build_mode_active)

func select_structure(structure_type: String):
	selected_structure = structure_type
	_create_ghost()

func _create_ghost():
	_clear_ghost()

	# Create visual ghost
	ghost_sprite = Sprite2D.new()
	ghost_sprite.modulate = Color(0, 1, 0, 0.5) # Green semi-transparent
	ghost_sprite.z_index = 100

	# Load appropriate texture based on structure type
	var texture_path = "res://assets/structures/" + selected_structure + ".png"
	if ResourceLoader.exists(texture_path):
		ghost_sprite.texture = load(texture_path)
	else:
		# Use placeholder
		ghost_sprite.texture = PlaceholderTexture2D.new()

	get_tree().current_scene.add_child(ghost_sprite)

func _clear_ghost():
	if ghost_sprite != null:
		ghost_sprite.queue_free()
		ghost_sprite = null

func _update_ghost_position():
	var player = get_parent()
	var mouse_pos = player.get_global_mouse_position()

	# Snap to grid
	var grid_pos = _snap_to_grid(mouse_pos)
	ghost_position = grid_pos

	if ghost_sprite != null:
		ghost_sprite.global_position = grid_pos

	# Validate placement
	var is_valid = _validate_placement(grid_pos, player.global_position)

	if is_valid != placement_valid:
		placement_valid = is_valid
		placement_valid_changed.emit(is_valid)

		# Update ghost color
		if ghost_sprite != null:
			ghost_sprite.modulate = Color(0, 1, 0, 0.5) if is_valid else Color(1, 0, 0, 0.5)

# ===== PLACEMENT =====

func try_place_structure() -> bool:
	if not build_mode_active or selected_structure == "":
		return false

	var player = get_parent()

	if not placement_valid:
		return false

	# Get recipe for structure
	var recipe_id = "build_" + selected_structure
	var recipe = recipe_db.get_recipe(recipe_id)

	if recipe.is_empty():
		print("No recipe found for: ", recipe_id)
		return false

	# Check if we have materials
	for item_id in recipe.inputs:
		var required = recipe.inputs[item_id]
		if not inventory_system.has_item(item_id, required):
			print("Missing materials for ", selected_structure)
			return false

	# Consume materials
	for item_id in recipe.inputs:
		var required = recipe.inputs[item_id]
		inventory_system.remove_item(item_id, required)

	# Place structure in world
	_spawn_structure(selected_structure, ghost_position)

	# Save to GameState
	_save_structure_to_world(selected_structure, ghost_position)

	structure_placed.emit(selected_structure, ghost_position)
	return true

func _spawn_structure(structure_type: String, position: Vector2):
	# Create actual structure node
	var structure = Node2D.new()
	structure.name = structure_type
	structure.global_position = position
	structure.add_to_group("structures")
	structure.add_to_group(structure_type)

	# Add sprite
	var sprite = Sprite2D.new()
	var texture_path = "res://assets/structures/" + structure_type + ".png"
	if ResourceLoader.exists(texture_path):
		sprite.texture = load(texture_path)
	else:
		sprite.texture = PlaceholderTexture2D.new()
		sprite.modulate = Color(0.6, 0.4, 0.2) # Brown placeholder

	structure.add_child(sprite)

	# Add collision if needed
	if _is_blocking_structure(structure_type):
		var static_body = StaticBody2D.new()
		var collision = CollisionShape2D.new()
		var shape = RectangleShape2D.new()
		shape.size = Vector2(TILE_SIZE, TILE_SIZE)
		collision.shape = shape
		static_body.add_child(collision)
		structure.add_child(static_body)

	# Add to scene
	get_tree().current_scene.add_child(structure)

	# Update world walkability if needed
	_update_world_walkability(position, structure_type)

func _save_structure_to_world(structure_type: String, position: Vector2):
	if not has_node("/root/GameState"):
		return

	var game_state = get_node("/root/GameState")

	if not game_state.has("world_mods"):
		game_state.set("world_mods", {})

	var world_mods = game_state.world_mods

	if not world_mods.has("placed_structures"):
		world_mods["placed_structures"] = []

	world_mods.placed_structures.append({
		"type": structure_type,
		"position": position,
		"placed_at": Time.get_unix_time_from_system()
	})

# ===== VALIDATION =====

func _validate_placement(position: Vector2, player_pos: Vector2) -> bool:
	# Check distance from player
	if position.distance_to(player_pos) > MAX_BUILD_DISTANCE:
		return false

	# Check if position is walkable (not blocked)
	if not _is_position_walkable(position):
		return false

	# Check if not overlapping other structures
	if _is_overlapping_structure(position):
		return false

	# Check if within world bounds
	if not _is_within_world_bounds(position):
		return false

	return true

func _is_position_walkable(position: Vector2) -> bool:
	# Check tilemap or world for walkability
	var world = get_tree().get_first_node_in_group("world")
	if world == null:
		return true # Default to walkable if no world

	if world.has_method("is_walkable"):
		return world.is_walkable(position)

	return true

func _is_overlapping_structure(position: Vector2) -> bool:
	var structures = get_tree().get_nodes_in_group("structures")
	for structure in structures:
		if structure.global_position.distance_to(position) < TILE_SIZE * 0.5:
			return true
	return false

func _is_within_world_bounds(position: Vector2) -> bool:
	# Get world bounds
	var world = get_tree().get_first_node_in_group("world")
	if world == null:
		return true

	if world.has("world_size"):
		var bounds = world.world_size
		if position.x < 0 or position.x > bounds.x * TILE_SIZE:
			return false
		if position.y < 0 or position.y > bounds.y * TILE_SIZE:
			return false

	return true

func _is_blocking_structure(structure_type: String) -> bool:
	# Structures that block movement
	var blocking = ["wall_log", "wall_plank", "door", "workbench", "crate"]
	return structure_type in blocking

func _update_world_walkability(position: Vector2, structure_type: String):
	if not _is_blocking_structure(structure_type):
		return

	var world = get_tree().get_first_node_in_group("world")
	if world == null:
		return

	if world.has_method("set_walkable"):
		world.set_walkable(position, false)

# ===== UTILITY =====

func _snap_to_grid(world_pos: Vector2) -> Vector2:
	var x = floor(world_pos.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2
	var y = floor(world_pos.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2
	return Vector2(x, y)

func get_buildable_structures() -> Array:
	var structures = []

	# Get all building recipes
	var building_recipes = recipe_db.get_recipes_by_category("building")

	for recipe_entry in building_recipes:
		var recipe_id = recipe_entry.id
		var recipe_data = recipe_entry.data

		# Extract structure name from recipe_id (build_wall_log -> wall_log)
		var structure_name = recipe_id.replace("build_", "")

		structures.append({
			"id": structure_name,
			"name": recipe_data.name,
			"recipe": recipe_data,
			"can_build": _can_afford_structure(recipe_data)
		})

	return structures

func _can_afford_structure(recipe: Dictionary) -> bool:
	for item_id in recipe.inputs:
		var required = recipe.inputs[item_id]
		if not inventory_system.has_item(item_id, required):
			return false
	return true

func is_build_mode_active() -> bool:
	return build_mode_active

func get_selected_structure() -> String:
	return selected_structure
